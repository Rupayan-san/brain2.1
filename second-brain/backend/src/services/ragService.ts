import type { ChatCompletionMessageParam } from "openai/resources/chat/completions/completions";
import { Types } from "mongoose";
import { CHROMA_DOCUMENT_COLLECTION, getChromaClient } from "../lib/chromaClient";
import { getOpenAIClient } from "../lib/openaiClient";
import { emitToUser } from "../lib/socket";
import ChatMessage from "../models/ChatMessage";
import DocumentModel, { DocumentDocument } from "../models/Document";

export interface ChatHistoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface RagChatOptions {
  onToken?: (token: string) => void;
}

export async function semanticSearch(query: string, userId: string) {
  const embeddingResponse = await getOpenAIClient().embeddings.create({
    model: "text-embedding-ada-002",
    input: query
  });
  const embedding = embeddingResponse.data[0]?.embedding;

  if (!embedding) {
    return [];
  }

  const collection = await getChromaClient().getOrCreateCollection({
    name: CHROMA_DOCUMENT_COLLECTION,
    embeddingFunction: null
  });
  const result = await collection.query({
    queryEmbeddings: [embedding],
    nResults: 10,
    where: {
      userId
    }
  });
  const documentIds = (result.metadatas?.[0] ?? [])
    .map((metadata) => metadata?.documentId)
    .filter((documentId): documentId is string => {
      return typeof documentId === "string" && Types.ObjectId.isValid(documentId);
    });

  if (documentIds.length === 0) {
    return [];
  }

  const documents = await DocumentModel.find({
    _id: {
      $in: documentIds
    },
    userId
  });
  const documentsById = new Map(documents.map((document) => [document._id.toString(), document]));

  return documentIds
    .map((documentId) => documentsById.get(documentId))
    .filter((document): document is DocumentDocument => Boolean(document));
}

export async function ragChat(
  query: string,
  userId: string,
  chatHistory: ChatHistoryMessage[],
  options: RagChatOptions = {}
) {
  const relevantDocuments = await semanticSearch(query, userId);
  const sourceIds = relevantDocuments.map((document) => document._id);
  const messages = buildMessages(query, chatHistory, relevantDocuments);

  await ChatMessage.create({
    userId,
    role: "user",
    content: query,
    sources: sourceIds
  });

  const stream = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    stream: true
  });
  let assistantResponse = "";

  emitToUser(userId, "chat:stream:start", {
    sourceDocumentIds: sourceIds.map((sourceId) => sourceId.toString())
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;

    if (!token) {
      continue;
    }

    assistantResponse += token;
    options.onToken?.(token);
    emitToUser(userId, "chat:token", { token });
  }

  const assistantMessage = await ChatMessage.create({
    userId,
    role: "assistant",
    content: assistantResponse,
    sources: sourceIds
  });

  emitToUser(userId, "chat:stream:end", {
    messageId: assistantMessage._id.toString(),
    sourceDocumentIds: sourceIds.map((sourceId) => sourceId.toString())
  });

  return {
    content: assistantResponse,
    sources: relevantDocuments,
    message: assistantMessage
  };
}

function buildMessages(
  query: string,
  chatHistory: ChatHistoryMessage[],
  relevantDocuments: DocumentDocument[]
): ChatCompletionMessageParam[] {
  const recentHistory = chatHistory.slice(-10);
  const context = relevantDocuments
    .map((document, index) => {
      return [
        `Source ${index + 1}`,
        `Document ID: ${document._id.toString()}`,
        `Source type: ${document.source}`,
        `Summary: ${document.summary || "No summary available."}`,
        `Text: ${document.rawContent}`
      ].join("\n");
    })
    .join("\n\n");

  return [
    {
      role: "system",
      content:
        "You are the user's second brain assistant. Answer questions using only the provided context from their emails and Slack messages. Always cite which source you used."
    },
    ...recentHistory.map((message) => ({
      role: message.role,
      content: message.content
    })),
    {
      role: "system",
      content: `Retrieved context chunks:\n${context || "No relevant context was found."}`
    },
    {
      role: "user",
      content: query
    }
  ];
}
