import { embed, embedMany } from "ai";
import { createOllama } from "ai-sdk-ollama";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const EMBEDDING_MODEL =
  process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text";

const ollama = createOllama({ baseURL: OLLAMA_URL });

const CHUNK_SIZE = 800;
const CHUNK_OVERLAP = 100;

export function chunkText(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    chunks.push(clean.slice(i, i + CHUNK_SIZE).trim());
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks.filter((c) => c.length > 0);
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const { embeddings } = await embedMany({
    model: ollama.textEmbedding(EMBEDDING_MODEL),
    values: texts,
  });
  return embeddings;
}

export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: ollama.textEmbedding(EMBEDDING_MODEL),
    value: text,
  });
  return embedding;
}
