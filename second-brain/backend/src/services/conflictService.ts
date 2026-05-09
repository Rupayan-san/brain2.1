import { Types } from "mongoose";
import { CHROMA_DOCUMENT_COLLECTION, getChromaClient } from "../lib/chromaClient";
import { getOpenAIClient } from "../lib/openaiClient";
import DocumentModel, { DocumentDocument } from "../models/Document";

interface ConflictResponse {
  conflict?: boolean;
  explanation?: string;
}

export async function detectConflicts(newDoc: DocumentDocument) {
  if (!newDoc.embedding || newDoc.embedding.length === 0) {
    return [];
  }

  const collection = await getChromaClient().getOrCreateCollection({
    name: CHROMA_DOCUMENT_COLLECTION,
    embeddingFunction: null
  });
  const result = await collection.query({
    queryEmbeddings: [newDoc.embedding],
    nResults: 6,
    where: {
      userId: newDoc.userId.toString()
    }
  });
  const metadataRows = result.metadatas?.[0] ?? [];
  const similarDocumentIds = metadataRows
    .map((metadata) => metadata?.documentId)
    .filter((documentId): documentId is string => {
      return typeof documentId === "string" && documentId !== newDoc._id.toString();
    })
    .slice(0, 5);
  const similarDocuments = await DocumentModel.find({
    _id: {
      $in: similarDocumentIds
    }
  });
  const conflicts = [];

  for (const existingDoc of similarDocuments) {
    const conflict = await compareDocuments(newDoc.rawContent, existingDoc.rawContent);

    if (!conflict.conflict) {
      continue;
    }

    const explanation = conflict.explanation || "Potential factual contradiction detected.";

    await flagConflict(newDoc._id, existingDoc._id, explanation);
    conflicts.push({
      documentId: existingDoc._id,
      explanation
    });
  }

  return conflicts;
}

async function compareDocuments(firstText: string, secondText: string) {
  const completion = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "Do these two texts contradict each other on any fact? Reply JSON: {conflict: boolean, explanation: string}"
      },
      {
        role: "user",
        content: `Text A:\n${firstText}\n\nText B:\n${secondText}`
      }
    ]
  });
  const rawJson = completion.choices[0]?.message.content;

  if (!rawJson) {
    return { conflict: false, explanation: "" };
  }

  return JSON.parse(rawJson) as ConflictResponse;
}

async function flagConflict(
  firstDocumentId: Types.ObjectId,
  secondDocumentId: Types.ObjectId,
  explanation: string
) {
  await DocumentModel.updateOne(
    { _id: firstDocumentId },
    {
      $set: { hasConflict: true },
      $addToSet: {
        conflictExplanations: explanation,
        conflictDocumentIds: secondDocumentId
      }
    }
  );
  await DocumentModel.updateOne(
    { _id: secondDocumentId },
    {
      $set: { hasConflict: true },
      $addToSet: {
        conflictExplanations: explanation,
        conflictDocumentIds: firstDocumentId
      }
    }
  );
}
