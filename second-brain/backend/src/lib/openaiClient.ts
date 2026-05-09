import OpenAI from "openai";

let openAIClient: OpenAI | undefined;

export function getOpenAIClient() {
  if (!openAIClient) {
    openAIClient = new OpenAI({
      apiKey: getRequiredEnv("OPENAI_API_KEY")
    });
  }

  return openAIClient;
}

export function getRequiredEnv(key: string) {
  const value = process.env[key];

  if (!value) {
    throw new Error(`${key} is not configured`);
  }

  return value;
}
