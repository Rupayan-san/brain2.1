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
    model: "gemini-2.0-flash"
  });
}

export function getIngestionModel() {
  return getGeminiClient().getGenerativeModel({
    model: "gemini-2.0-flash-lite"
  });
}

export function getEmbeddingModel() {
  return getGeminiClient().getGenerativeModel({
    model: "gemini-embedding-2"
  });
}
