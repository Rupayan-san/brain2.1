import { ChromaClient } from "chromadb";

// Gemini embedding-001 produces 768-dimensional vectors.
export const CHROMA_DOCUMENT_COLLECTION = "second_brain_documents";

let chromaClient: ChromaClient | undefined;

export function getChromaClient() {
  if (!chromaClient) {
    chromaClient = createChromaClient();
  }

  return chromaClient;
}

export async function getOrCreateDocumentCollection() {
  const client = getChromaClient();
  return await client.getOrCreateCollection({
    name: CHROMA_DOCUMENT_COLLECTION
  });
}

function createChromaClient() {
  const chromaUrl = process.env.CHROMA_URL;

  if (!chromaUrl) {
    return new ChromaClient();
  }

  const parsedUrl = new URL(chromaUrl);

  return new ChromaClient({
    host: parsedUrl.hostname,
    port: Number(parsedUrl.port || (parsedUrl.protocol === "https:" ? 443 : 80)),
    ssl: parsedUrl.protocol === "https:"
  });
}
