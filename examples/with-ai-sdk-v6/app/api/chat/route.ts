import { streamText, convertToModelMessages } from "ai";
import { createOllama } from "ai-sdk-ollama";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL ||
  "fredrezones55/Qwen3.5-Uncensored-HauhauCS-Aggressive:4b";

const ollama = createOllama({
  baseURL: OLLAMA_URL,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const rawMessages: any[] = body.messages ?? [];

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
