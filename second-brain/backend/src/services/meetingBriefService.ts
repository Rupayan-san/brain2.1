import { Types } from "mongoose";
import { CHROMA_DOCUMENT_COLLECTION, getChromaClient } from "../lib/chromaClient";
import { getOpenAIClient } from "../lib/openaiClient";
import DocumentModel from "../models/Document";
import MeetingBrief from "../models/MeetingBrief";

export async function generateBrief(
  userId: string,
  meetingTitle: string,
  attendees: string[],
  meetingTime: Date
) {
  const semanticDocumentIds = await querySemanticDocumentIds(userId, meetingTitle);
  const attendeeDocuments = await findAttendeeDocuments(userId, attendees);
  const relevantDocIdSet = new Set([
    ...semanticDocumentIds,
    ...attendeeDocuments.map((document) => document._id.toString())
  ]);
  const relevantDocs = await DocumentModel.find({
    _id: {
      $in: Array.from(relevantDocIdSet)
    }
  }).limit(20);
  const context = relevantDocs
    .map((document) => `Summary: ${document.summary}\nText: ${document.rawContent}`)
    .join("\n\n");
  const completion = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "Generate a concise meeting pre-brief covering: past decisions, open action items, last conversations with attendees."
      },
      {
        role: "user",
        content: `Meeting: ${meetingTitle}\nAttendees: ${attendees.join(", ")}\nTime: ${meetingTime.toISOString()}\n\nRelevant documents:\n${context || "No relevant documents found."}`
      }
    ]
  });
  const briefContent = completion.choices[0]?.message.content ?? "";

  return MeetingBrief.create({
    userId,
    meetingTitle,
    meetingTime,
    attendees,
    relevantDocs: relevantDocs.map((document) => document._id),
    briefContent
  });
}

async function querySemanticDocumentIds(userId: string, meetingTitle: string) {
  const embeddingResponse = await getOpenAIClient().embeddings.create({
    model: "text-embedding-ada-002",
    input: meetingTitle
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
  const metadataRows = result.metadatas?.[0] ?? [];

  return metadataRows
    .map((metadata) => metadata?.documentId)
    .filter((documentId): documentId is string => {
      return typeof documentId === "string" && Types.ObjectId.isValid(documentId);
    });
}

async function findAttendeeDocuments(userId: string, attendees: string[]) {
  const attendeePatterns = attendees
    .filter(Boolean)
    .map((attendee) => new RegExp(escapeRegExp(attendee), "i"));

  if (attendeePatterns.length === 0) {
    return [];
  }

  return DocumentModel.find({
    userId,
    $or: [
      {
        rawContent: {
          $in: attendeePatterns
        }
      },
      {
        "entities.name": {
          $in: attendeePatterns
        }
      }
    ]
  }).limit(20);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
