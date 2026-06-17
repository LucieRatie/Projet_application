import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOllama } from "ai-sdk-ollama";
import dbConnect from "@/lib/db";
import { Thread } from "@/models/Thread";

export const maxDuration = 60;

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_SUMMARY_MODEL =
  process.env.OLLAMA_SUMMARY_MODEL || process.env.OLLAMA_MODEL || "llama3.2:1b";

const ollama = createOllama({
  baseURL: OLLAMA_URL,
});

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await dbConnect();
    const { id: threadId } = await params;

    const thread = await (Thread as any).findById(threadId);
    if (!thread || !thread.messages) {
      return NextResponse.json(
        { error: "Discussion introuvable" },
        { status: 404 },
      );
    }

    if (thread.status !== "completed") {
      return NextResponse.json(
        {
          error:
            "La session doit être terminée par l'élève avant de générer le rapport.",
        },
        { status: 400 },
      );
    }

    // Serve the cached report unless the thread changed since it was generated.
    if (
      thread.summary &&
      thread.summaryGeneratedAt &&
      thread.summaryGeneratedAt >= thread.updatedAt
    ) {
      return NextResponse.json({ summary: thread.summary, cached: true });
    }

    const discussionText = thread.messages
      .map((msg: any) => {
        const roleName = msg.role === "user" ? "Élève" : "Tuteur";
        return `${roleName} : ${msg.content}`;
      })
      .join("\n\n");

    if (!discussionText) {
      return NextResponse.json({
        summary: "Aucun échange à analyser trong session này.",
      });
    }

    const systemPrompt = `Tu es un professeur de mathématiques expert. Analyse la discussion suivante entre un élève (user) et un tuteur (assistant) pour rédiger un rapport court, strict et réaliste en français.
        === CONSIGNES TRÈS STRICTES ===
        - Base-toi UNIQUEMENT sur les messages réels fournis ci-dessous. 
        - Interdiction absolue d'inventer, d'imaginer ou d'halluciner des fautes de langue ou des erreurs de logique que l'élève n'a pas écrites.
        - Si l'élève n'a pas fait de faute d'orthographe ou de grammaire, écris obligatoirement "Aucune erreur détectée".
        - Si l'élève pose juste une question de définition générale (ex: "qu'est-ce qu'une fraction"), écris "Aucune erreur" dans la partie logique/maths.

        === FORMAT DU RAPPORT À RESPECTER ===
        1. Résumé (1-2 phrases max) : Thème mathématique abordé et attitude générale de l'élève.
        2. Erreurs de langue : (Note les fautes d'orthographe/syntaxe réelles. Si aucune : "Aucune erreur détectée").
        3. Erreurs de logique / maths : (Incompréhensions ou fausses pistes mathématiques de l'élève. Si aucune : "Aucune erreur").
        4. Recommandation : (Une action concrète et rapide pour le prochain enseignant).
        5. Évaluation globale : (Niveau de l'élève sur cette séance : Faible / Moyen / Bon).`;

    const { text } = await generateText({
      model: ollama(OLLAMA_SUMMARY_MODEL),
      system: systemPrompt,
      prompt: `Voici la discussion à analyser :\n\n${discussionText}`,
      temperature: 0.0,
    });

    thread.summary = text;
    thread.summaryGeneratedAt = new Date();
    await thread.save();

    return NextResponse.json({ summary: text, cached: false });
  } catch (error: any) {
    console.error("Summary Generation Error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error?.message || String(error),
      },
      { status: 500 },
    );
  }
}
