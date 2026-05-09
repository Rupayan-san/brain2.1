import { GoogleGenerativeAI } from "@google/generative-ai";

let geminiClient: GoogleGenerativeAI | undefined;

export function getGeminiClient() {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    geminiClient = new GoogleGenerativeAI(apiKey);
  }

  return geminiClient;
}

export function getChatModel() {
  return getGeminiClient().getGenerativeModel({
    model: "gemini-1.5-flash"
  });
}

export function getEmbeddingModel() {
  return getGeminiClient().getGenerativeModel({
    model: "embedding-001"
  });
}
