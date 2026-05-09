import crypto from "node:crypto";
import { google, gmail_v1 } from "googleapis";
import { WebClient } from "@slack/web-api";
import { CHROMA_DOCUMENT_COLLECTION, getChromaClient } from "../lib/chromaClient";
import { getOpenAIClient } from "../lib/openaiClient";
import { detectConflicts } from "./conflictService";
import { extractCommitments } from "./commitmentService";
import DocumentModel from "../models/Document";
import User from "../models/User";

const ENRICHMENT_SYSTEM_PROMPT =
  "Extract from this text: a 2 sentence summary, key entities (people/dates/topics), action items as array, and any commitments made (promises with due dates). Return as JSON.";

type Source = "gmail" | "slack" | "notion" | "upload";
type EntityType = "person" | "date" | "topic" | "place";

interface EnrichmentMetadata {
  sourceId?: string;
  subject?: string;
  from?: string;
  date?: string;
  channelId?: string;
  messageTs?: string;
}

interface EnrichedPayload {
  summary?: string;
  entities?: Array<{
    name?: string;
    type?: EntityType;
  }>;
  actionItems?: string[];
  commitments?: Array<{
    text?: string;
    person?: string;
    dueDate?: string;
    fulfilled?: boolean;
  }>;
  tags?: string[];
}

export async function fetchGmailMessages(userId: string) {
  const user = await User.findById(userId);

  if (!user?.googleAccessToken) {
    return [];
  }

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: user.googleAccessToken });

  const gmail = google.gmail({ version: "v1", auth });
  const listResponse = await gmail.users.messages.list({
    userId: "me",
    maxResults: 50
  });

  const messages = listResponse.data.messages ?? [];
  const savedDocuments = [];

  for (const message of messages) {
    if (!message.id) {
      continue;
    }

    const exists = await DocumentModel.exists({
      userId,
      source: "gmail",
      sourceId: message.id
    });

    if (exists) {
      continue;
    }

    const messageResponse = await gmail.users.messages.get({
      userId: "me",
      id: message.id,
      format: "full"
    });
    const extracted = extractGmailMessage(messageResponse.data);
    const content = formatGmailContent(extracted);
    const document = await enrichDocument(content, "gmail", userId, {
      sourceId: message.id,
      subject: extracted.subject,
      from: extracted.from,
      date: extracted.date
    });

    savedDocuments.push(document);
  }

  return savedDocuments;
}

export async function fetchSlackMessages(userId: string) {
  const user = await User.findById(userId);

  if (!user?.slackAccessToken) {
    return [];
  }

  const slack = new WebClient(user.slackAccessToken);
  const conversations = await slack.users.conversations({
    types: "public_channel,im",
    limit: 200
  });
  const channels = conversations.channels ?? [];
  const savedDocuments = [];

  for (const channel of channels) {
    if (!channel.id) {
      continue;
    }

    const history = await slack.conversations.history({
      channel: channel.id,
      limit: 100
    });
    const messages = history.messages ?? [];

    for (const message of messages) {
      if (!message.ts || !message.text) {
        continue;
      }

      const sourceId = `${channel.id}:${message.ts}`;
      const exists = await DocumentModel.exists({
        userId,
        source: "slack",
        sourceId
      });

      if (exists) {
        continue;
      }

      const content = formatSlackContent({
        channelName: channel.name,
        text: message.text,
        user: message.user,
        timestamp: message.ts
      });
      const document = await enrichDocument(content, "slack", userId, {
        sourceId,
        channelId: channel.id,
        messageTs: message.ts
      });

      savedDocuments.push(document);
    }
  }

  return savedDocuments;
}

export async function enrichDocument(
  content: string,
  source: string,
  userId: string,
  metadata: EnrichmentMetadata = {}
) {
  const typedSource = assertSource(source);
  const sourceId = metadata.sourceId ?? createSourceId(content);
  const existingDocument = await DocumentModel.findOne({
    userId,
    source: typedSource,
    sourceId
  });

  if (existingDocument) {
    return existingDocument;
  }

  const enrichment = await getEnrichment(content);
  const embedding = await createEmbedding(content);
  const document = await DocumentModel.create({
    userId,
    source: typedSource,
    sourceId,
    rawContent: content,
    summary: enrichment.summary ?? "",
    entities: normalizeEntities(enrichment.entities),
    actionItems: normalizeStringArray(enrichment.actionItems),
    commitments: normalizeCommitments(enrichment.commitments),
    tags: normalizeStringArray(enrichment.tags),
    embedding
  });

  await saveEmbeddingToChroma({
    documentId: document._id.toString(),
    content,
    embedding,
    source: typedSource,
    sourceId,
    userId
  });

  await detectConflicts(document);
  await extractCommitments(document._id.toString());

  return document;
}

async function getEnrichment(content: string) {
  const completion = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: ENRICHMENT_SYSTEM_PROMPT
      },
      {
        role: "user",
        content
      }
    ]
  });
  const rawJson = completion.choices[0]?.message.content;

  if (!rawJson) {
    return {};
  }

  return JSON.parse(rawJson) as EnrichedPayload;
}

async function createEmbedding(content: string) {
  const response = await getOpenAIClient().embeddings.create({
    model: "text-embedding-ada-002",
    input: content
  });

  return response.data[0]?.embedding ?? [];
}

async function saveEmbeddingToChroma({
  documentId,
  content,
  embedding,
  source,
  sourceId,
  userId
}: {
  documentId: string;
  content: string;
  embedding: number[];
  source: Source;
  sourceId: string;
  userId: string;
}) {
  if (embedding.length === 0) {
    return;
  }

  const collection = await getChromaClient().getOrCreateCollection({
    name: CHROMA_DOCUMENT_COLLECTION,
    embeddingFunction: null
  });

  await collection.add({
    ids: [documentId],
    embeddings: [embedding],
    documents: [content],
    metadatas: [
      {
        documentId,
        source,
        sourceId,
        userId
      }
    ]
  });
}

function extractGmailMessage(message: gmail_v1.Schema$Message) {
  const headers = message.payload?.headers ?? [];

  return {
    subject: getHeader(headers, "subject"),
    from: getHeader(headers, "from"),
    date: getHeader(headers, "date"),
    body: extractBody(message.payload)
  };
}

function extractBody(payload: gmail_v1.Schema$MessagePart | undefined): string {
  if (!payload) {
    return "";
  }

  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  for (const part of payload.parts ?? []) {
    const body = extractBody(part);

    if (body) {
      return body;
    }
  }

  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
  }

  return "";
}

function decodeBase64Url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(base64, "base64").toString("utf8");
}

function getHeader(headers: gmail_v1.Schema$MessagePartHeader[], name: string) {
  return headers.find((header) => header.name?.toLowerCase() === name)?.value ?? "";
}

function formatGmailContent({
  subject,
  from,
  date,
  body
}: {
  subject: string;
  from: string;
  date: string;
  body: string;
}) {
  return [`Subject: ${subject}`, `From: ${from}`, `Date: ${date}`, "", body].join("\n");
}

function formatSlackContent({
  channelName,
  text,
  user,
  timestamp
}: {
  channelName?: string;
  text: string;
  user?: string;
  timestamp: string;
}) {
  return [
    `Channel: ${channelName ?? "direct-message"}`,
    `User: ${user ?? "unknown"}`,
    `Timestamp: ${timestamp}`,
    "",
    text
  ].join("\n");
}

function assertSource(source: string): Source {
  if (source === "gmail" || source === "slack" || source === "notion" || source === "upload") {
    return source;
  }

  throw new Error(`Unsupported document source: ${source}`);
}

function normalizeEntities(entities: EnrichedPayload["entities"]) {
  return (entities ?? [])
    .filter((entity) => entity.name && entity.type)
    .map((entity) => ({
      name: entity.name as string,
      type: entity.type as EntityType
    }));
}

function normalizeCommitments(commitments: EnrichedPayload["commitments"]) {
  return (commitments ?? [])
    .filter((commitment) => commitment.text)
    .map((commitment) => ({
      text: commitment.text as string,
      person: commitment.person,
      dueDate: commitment.dueDate ? new Date(commitment.dueDate) : undefined,
      fulfilled: commitment.fulfilled ?? false
    }));
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

function createSourceId(content: string) {
  return crypto.createHash("sha256").update(content).digest("hex");
}
