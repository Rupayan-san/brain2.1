import { Types } from "mongoose";
import { getOrCreateDocumentCollection } from "../lib/chromaClient";
import { getChatModel, getEmbeddingModel } from "../lib/geminiClient";
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
  const model = getChatModel();
  const result = await model.generateContent(
    [
      "Generate a concise meeting pre-brief covering: past decisions, open action items, last conversations with attendees.",
      "",
      `Meeting: ${meetingTitle}`,
      `Attendees: ${attendees.join(", ")}`,
      `Time: ${meetingTime.toISOString()}`,
      "",
      `Relevant documents:\n${context || "No relevant documents found."}`
    ].join("\n")
  );
  const briefContent = result.response.text();

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
  const embeddingModel = getEmbeddingModel();
  const embeddingResponse = await embeddingModel.embedContent(meetingTitle);
  const embedding = embeddingResponse.embedding.values;

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
