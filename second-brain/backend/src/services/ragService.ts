import { Types } from "mongoose";
import { getOrCreateDocumentCollection } from "../lib/chromaClient";
import { getChatModel, getEmbeddingModel } from "../lib/geminiClient";
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
  const model = getEmbeddingModel();
  const embeddingResult = await model.embedContent(query);
  const embedding = embeddingResult.embedding.values;

  if (!embedding || embedding.length === 0) {
    return [];
  }

  const collection = await getOrCreateDocumentCollection();
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
  const model = getChatModel();
  const prompt = buildGeminiPrompt(query, chatHistory, relevantDocuments);

  await ChatMessage.create({
    userId,
    role: "user",
    content: query,
    sources: sourceIds
  });

  emitToUser(userId, "chat:stream:start", {
    sourceDocumentIds: sourceIds.map((sourceId) => sourceId.toString())
  });

  const streamResult = await model.generateContentStream(prompt);
  let assistantResponse = "";

  for await (const chunk of streamResult.stream) {
    const token = chunk.text();

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

function buildGeminiPrompt(
  query: string,
  chatHistory: ChatHistoryMessage[],
  relevantDocuments: DocumentDocument[]
): string {
  const context = relevantDocuments
    .map((document, index) =>
      [
        `Source ${index + 1}`,
        `Document ID: ${document._id.toString()}`,
        `Source type: ${document.source}`,
        `Summary: ${document.summary || "No summary available."}`,
        `Text: ${document.rawContent}`
      ].join("\n")
    )
    .join("\n\n");
  const history = chatHistory
    .slice(-10)
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.content}`)
    .join("\n");

  return [
    "You are the user's second brain assistant.",
    "Answer questions using only the provided context from their emails and Slack messages.",
    "Always cite which source you used.",
    "",
    "Retrieved context:",
    context || "No relevant context was found.",
    "",
    "Conversation history:",
    history,
    "",
    `User: ${query}`
  ].join("\n");
}
