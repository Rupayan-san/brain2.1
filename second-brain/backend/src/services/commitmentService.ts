import Commitment from "../models/Commitment";
import DocumentModel from "../models/Document";
import { getIngestionModel } from "../lib/geminiClient";

interface FulfillmentResponse {
  fulfilled?: boolean;
}

export async function extractCommitments(docId: string) {
  const document = await DocumentModel.findById(docId);

  if (!document) {
    return [];
  }

  const savedCommitments = [];

  for (const commitment of document.commitments ?? []) {
    const saved = await Commitment.findOneAndUpdate(
      {
        userId: document.userId,
        documentId: document._id,
        text: commitment.text
      },
      {
        $setOnInsert: {
          userId: document.userId,
          documentId: document._id,
          text: commitment.text,
          person: commitment.person,
          dueDate: commitment.dueDate,
          fulfilled: false
        }
      },
      {
        new: true,
        setDefaultsOnInsert: true,
        upsert: true
      }
    );

    savedCommitments.push(saved);
  }

  return savedCommitments;
}

export async function checkFulfillments(userId: string) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [commitments, recentDocuments] = await Promise.all([
    Commitment.find({ userId, fulfilled: false }),
    DocumentModel.find({
      userId,
      createdAt: {
        $gte: since
      }
    }).sort({ createdAt: -1 })
  ]);
  const recentMessages = recentDocuments
    .map((document) => document.summary || document.rawContent)
    .join("\n\n");
  const fulfilledCommitments = [];

  for (const commitment of commitments) {
    const result = await checkSingleFulfillment(commitment.text, recentMessages);

    if (!result.fulfilled) {
      continue;
    }

    commitment.fulfilled = true;
    commitment.fulfilledAt = new Date();
    await commitment.save();
    fulfilledCommitments.push(commitment);
  }

  return fulfilledCommitments;
}

async function checkSingleFulfillment(commitmentText: string, recentMessages: string) {
  const model = getIngestionModel();
  const result = await model.generateContent(
    [
      "Was this commitment fulfilled based on recent messages?",
      "Reply JSON: {fulfilled: boolean}",
      "",
      `Commitment:\n${commitmentText}`,
      "",
      `Recent messages:\n${recentMessages || "No recent messages."}`
    ].join("\n")
  );
  const rawJson = result.response.text();

  if (!rawJson) {
    return { fulfilled: false };
  }

  try {
    return JSON.parse(rawJson) as FulfillmentResponse;
  } catch {
    return { fulfilled: false };
  }
}
