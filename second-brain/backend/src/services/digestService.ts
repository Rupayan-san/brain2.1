import Digest from "../models/Digest";
import DocumentModel from "../models/Document";
import { getOpenAIClient } from "../lib/openaiClient";

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
  const completion = await getOpenAIClient().chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: prompt
      },
      {
        role: "user",
        content: sourceText || "No documents were found for this period."
      }
    ]
  });
  const narrative = completion.choices[0]?.message.content ?? "";

  return Digest.create({
    userId,
    type,
    narrative,
    sourceDocIds: documents.map((document) => document._id),
    date: new Date()
  });
}
