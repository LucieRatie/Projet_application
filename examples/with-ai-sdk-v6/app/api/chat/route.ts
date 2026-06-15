import { streamText, convertToModelMessages } from "ai";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    // AI SDK v6 sends { messages: UIMessage[] }
    // convertToModelMessages converts UIMessage[] → CoreMessage[]
    const rawMessages: any[] = body.messages ?? [];

    const coreMessages = await convertToModelMessages(rawMessages);

    // Mock Model compatible with AI SDK v2 (spec)
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
            controller.enqueue({ type: "text-delta", textDelta: responseText });
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
  } catch (error) {
    console.error("Chat Error:", error);
    return new Response(JSON.stringify({ error: "Internal Error" }), {
      status: 500,
    });
  }
}
