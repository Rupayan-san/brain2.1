import Digest from "../models/Digest";
import DocumentModel from "../models/Document";
import { getChatModel } from "../lib/geminiClient";

export async function dailyDigest(userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return createDigest(userId, "daily", since, "Write a flowing narrative paragraph summarizing the user's day from these summaries. Start with the main theme.");
}

export async function weeklyDigest(userId: string) {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return createDigest(userId, "weekly", since, "Write a detailed flowing narrative summarizing the user's week from these summaries. Start with the main theme and include important decisions, recurring topics, and unresolved threads.");
}

async function createDigest(
  userId: string,
  type: "daily" | "weekly",
  since: Date,
  prompt: string
) {
  const documents = await DocumentModel.find({
    userId,
    createdAt: {
      $gte: since
    }
  }).sort({ createdAt: 1 });

  const sourceText = documents
    .map((document) => `- ${document.summary || document.rawContent}`)
    .join("\n");
  const model = getChatModel();
  const result = await model.generateContent(
    `${prompt}\n\nSummaries:\n${sourceText || "No documents were found for this period."}`
  );
  const narrative = result.response.text();

  return Digest.create({
    userId,
    type,
    narrative,
    sourceDocIds: documents.map((document) => document._id),
    date: new Date()
  });
}
