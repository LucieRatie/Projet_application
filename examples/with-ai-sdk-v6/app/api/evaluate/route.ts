import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createOllama } from "ai-sdk-ollama";
import dbConnect from "../../../lib/db";
import { Thread } from "../../../models/Thread";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2:1b";

const ollama = createOllama({
  baseURL: OLLAMA_URL,
});

export async function POST(req: Request) {
  try {
    const { studentId } = await req.json();

    if (!studentId) {
      return NextResponse.json(
        { error: "studentId est requis" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Récupérer toutes les conversations de cet élève
    const threads = await Thread.find({ studentId }).sort({ updatedAt: 1 });

    if (!threads || threads.length === 0) {
      return NextResponse.json({
        evaluation: "Aucun historique de conversation trouvé pour cet élève.",
      });
    }

    // Construire le contexte de la conversation
    let conversationHistory = "";
    threads.forEach((thread: any, index: number) => {
      conversationHistory += `\n--- Session ${index + 1} ---\n`;
      thread.messages.forEach((msg: any) => {
        const role = msg.role === "user" ? "Élève" : "Professeur IA";
        conversationHistory += `${role}: ${msg.content}\n`;
      });
    });

    if (!conversationHistory.trim()) {
      return NextResponse.json({
        evaluation: "Les conversations de cet élève sont vides.",
      });
    }

    // Si on utilise un mock
    if (OLLAMA_URL === "mock") {
      return NextResponse.json({
        evaluation:
          "Bilan (Mock) : L'élève participe activement mais rencontre quelques difficultés sur les concepts abordés. Des exercices de renforcement seraient utiles.",
      });
    }

    const systemPrompt = `Tu es un expert pédagogique. Voici l'historique complet des conversations entre un élève et son professeur IA.
    
Ta mission :
1. Rédige un bilan clair et très concis (environ 3 à 5 lignes maximum) évaluant les compétences de l'élève.
2. Identifie ses points forts et ses principales lacunes.
3. Formule le texte directement pour qu'il soit lu par un professeur (ex: "L'élève démontre une bonne compréhension de...").
Ne dis pas "Voici le bilan", donne directement l'évaluation.`;

    const { text } = await generateText({
      model: ollama(OLLAMA_MODEL),
      system: systemPrompt,
      prompt: `Historique des conversations :\n${conversationHistory}`,
    });

    return NextResponse.json({ evaluation: text });
  } catch (error: any) {
    console.error("Evaluation Error:", error);
    return NextResponse.json(
      { error: "Internal Error", details: error?.message || String(error) },
      { status: 500 },
    );
  }
}
