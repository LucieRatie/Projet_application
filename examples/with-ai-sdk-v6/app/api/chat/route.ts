import { streamText, convertToModelMessages, cosineSimilarity } from "ai";
import { createOllama } from "ai-sdk-ollama";
import dbConnect from "@/lib/db";
import { DocumentChunk } from "@/models/DocumentChunk";
import { embedQuery } from "@/lib/rag";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:1b";

const ollama = createOllama({
  baseURL: OLLAMA_URL,
});

// The client (useAssistantInstructions in student-chat.tsx) appends a
// machine-readable block after the human-readable objective so this route
// knows which session documents to search — it's stripped before the text
// ever reaches the model.
const CONTEXT_RE = /\[\[CONTEXT:({.*?})\]\]/s;
const TOP_K = 4;
// nomic-embed-text gives French text a high cosine baseline (~0.55-0.65)
// regardless of topic, so a low threshold barely filters anything — 0.65 is
// the empirical point where on-topic chunks separate from off-topic ones.
// Revisit if the embedding model changes.
const MIN_SIMILARITY = 0.65;

function parseSystemInstruction(system: string | undefined) {
  if (!system) return { objective: "", documentUrls: [] as string[] };
  const match = system.match(CONTEXT_RE);
  if (!match) return { objective: system, documentUrls: [] as string[] };
  let documentUrls: string[] = [];
  try {
    const meta = JSON.parse(match[1]!);
    if (Array.isArray(meta.documentUrls)) documentUrls = meta.documentUrls;
  } catch {
    // malformed metadata — fall back to no document context
  }
  return { objective: system.replace(match[0], "").trim(), documentUrls };
}

function extractText(msg: any): string {
  if (!msg) return "";
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p: any) => p.type === "text")
      .map((p: any) => p.text ?? "")
      .join(" ");
  }
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content.map((p: any) => p.text ?? "").join(" ");
  }
  return "";
}

const STRICT_SCOPE_HEADER =
  "RÈGLE STRICTE DE LA SESSION : cette session est limitée aux documents fournis par le professeur. " +
  "Tu dois répondre UNIQUEMENT à partir des extraits ci-dessous. Il est interdit d'utiliser tes " +
  "connaissances générales ou d'inventer une réponse qui ne s'appuie pas sur ces extraits, même si tu " +
  "connais la réponse par ailleurs.";

const NO_MATCH_INSTRUCTION =
  "RÈGLE STRICTE DE LA SESSION : cette session est limitée aux documents fournis par le professeur, et " +
  "aucun passage pertinent n'a été trouvé dans ces documents pour répondre à la question posée. Tu ne dois " +
  "PAS répondre avec tes connaissances générales, même si tu connais la réponse. Dis explicitement à " +
  "l'élève que cette question ne correspond pas aux documents fournis pour cette session, et invite-le à " +
  "reformuler en lien avec le cours ou à demander à son professeur.";

// When the active session has documents attached, the model must be confined to
// them — it must refuse rather than fall back to general knowledge, otherwise a
// student could get answers about content outside what was uploaded for this
// specific session.
async function retrieveDocumentContext(documentUrls: string[], query: string) {
  if (documentUrls.length === 0)
    return { hasDocuments: false, instruction: "" };

  await dbConnect();
  const chunks = await (DocumentChunk as any)
    .find({ documentUrl: { $in: documentUrls } })
    .lean();
  if (chunks.length === 0 || !query.trim()) {
    return { hasDocuments: true, instruction: NO_MATCH_INSTRUCTION };
  }

  const queryEmbedding = await embedQuery(query);
  const scored: { text: string; score: number }[] = chunks
    .map((c: any) => ({
      text: c.text,
      score: cosineSimilarity(queryEmbedding, c.embedding),
    }))
    .sort((a: any, b: any) => b.score - a.score)
    .filter((c: any) => c.score >= MIN_SIMILARITY)
    .slice(0, TOP_K);

  if (scored.length === 0) {
    return { hasDocuments: true, instruction: NO_MATCH_INSTRUCTION };
  }

  const excerpts = scored
    .map((c, i: number) => `[Extrait ${i + 1}] ${c.text}`)
    .join("\n\n");
  return {
    hasDocuments: true,
    instruction: `${STRICT_SCOPE_HEADER}\n\n${excerpts}`,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawMessages: any[] = body.messages ?? [];

    const { objective, documentUrls } = parseSystemInstruction(body.system);
    const lastUserMessage = [...rawMessages]
      .reverse()
      .find((m: any) => m.role === "user");

    let documentInstruction = "";
    try {
      const result = await retrieveDocumentContext(
        documentUrls,
        extractText(lastUserMessage),
      );
      documentInstruction = result.instruction;
    } catch (err) {
      console.error("RAG retrieval failed:", err);
      // If retrieval itself breaks (DB/Ollama down) we can't safely enforce the
      // strict scope rule, so fall back to refusing rather than silently
      // answering from general knowledge.
      if (documentUrls.length > 0) documentInstruction = NO_MATCH_INSTRUCTION;
    }

    const systemPrompt =
      [objective, documentInstruction].filter(Boolean).join("\n\n") ||
      undefined;

    const coreMessages = await convertToModelMessages(rawMessages);

    // Use mock model if explicitly requested in environment variables
    if (OLLAMA_URL === "mock") {
      const mockModel = {
        specificationVersion: "v2" as const,
        provider: "mock-provider",
        modelId: "mock-dram-ai",
        defaultObjectGenerationMode: undefined,
        doGenerate: async () => ({
          text: "Test",
          finishReason: "stop" as const,
          usage: { promptTokens: 0, completionTokens: 0 },
          rawCall: { rawPrompt: null, rawSettings: {} },
        }),
        doStream: async () => ({
          stream: new ReadableStream({
            start(controller) {
              const responseText =
                "Bonjour ! Je suis l'assistant pédagogique DRAM. Comment puis-je vous aider aujourd'hui ?";
              controller.enqueue({
                type: "text-delta",
                textDelta: responseText,
              });
              controller.close();
            },
          }),
          rawCall: { rawPrompt: null, rawSettings: {} },
        }),
      };

      const result = streamText({
        model: mockModel as any,
        messages: coreMessages,
      });

      return result.toUIMessageStreamResponse();
    }

    const result = streamText({
      model: ollama(OLLAMA_MODEL),
      ...(systemPrompt && { system: systemPrompt }),
      messages: coreMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error("Chat Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Error",
        details: error?.message || String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
