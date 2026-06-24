import { streamText, convertToModelMessages } from "ai";
import { createOllama } from "ai-sdk-ollama";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:1b";

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

    const aiDocuments = body.aiDocuments || [];
    let docContext = "";
    if (aiDocuments.length > 0) {
      docContext = "DOCUMENTS DE COURS FOURNIS :\n";
      aiDocuments.forEach((doc: any) => {
        if (doc.content) {
          docContext += `\n--- Document: ${doc.name} ---\n${doc.content}\n--------------------\n`;
        }
      });
    }

    const systemPrompt = `Tu es un professeur chargé de répondre à la question d'un élève.
    
CONSIGNES STRICTES :
1. Tu DOIS IMPÉRATIVEMENT refuser de répondre si la question n'est pas liée au contexte des documents ou au sujet de la session d'étude. Dis simplement que tu ne peux répondre qu'aux questions liées au cours.
2. Sois très concis et direct. Ne t'éparpille pas dans des explications inutiles ou du bavardage.
3. Utilise uniquement les informations présentes dans le contexte fourni. Si tu n'as pas la réponse, dis-le clairement (ne devine pas, n'invente rien).
4. Rappelle-toi de l'historique de la conversation pour comprendre le contexte des questions.
5. Utilise les documents de cours fournis pour créer des exercices pour l'élève ou lui poser des questions supplémentaires s'il te le demande pour mieux comprendre. Base tes exercices UNIQUEMENT sur ces documents.

${docContext}`;

    const result = streamText({
      model: ollama(OLLAMA_MODEL),
      messages: coreMessages,
      system: systemPrompt,
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
