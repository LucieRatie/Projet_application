import { config } from "./config.mjs";
import { generateText, streamText } from "ai";
import { google } from "@ai-sdk/google";
import { createOllama } from "ollama-ai-provider";

// Initialisation du provider Ollama local
const ollama = createOllama({
  baseURL: "http://localhost:11434/api",
});

// Variable globale (ou d'état) pour stocker le prompt système configuré par init_chat
let currentSystemPrompt = "";
// Variable globale pour stocker l'historique local si non géré par le useChat du client
let conversationHistory = [];

/** * Vectorise et stocke une liste de fichiers dans la base de données RAG.
 */
export async function add_context(list_file_path) {
  try {
    const response = await fetch(`${config.RAG_SERVER_URL}/vectorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filePaths: list_file_path }),
    });
    if (!response.ok) throw new Error("Erreur lors de la vectorisation");
    console.log("Fichiers vectorisés avec succès dans le RAG.");
  } catch (error) {
    console.error("Erreur add_context:", error);
  }
}

/** * Configure et prépare l'IA avant de démarrer l'échange.
 */
export function init_chat(objective, name, french_level, math_level, resume) {
  // Génération du prompt système à partir de la configuration
  currentSystemPrompt = config.prompts.systemInit(
    objective,
    name,
    french_level,
    math_level,
    resume,
  );
  // Réinitialisation de l'historique pour une nouvelle session
  conversationHistory = [{ role: "system", content: currentSystemPrompt }];
  console.log("Chat initialisé avec succès.");
}

/** * Envoie le prompt, interroge le RAG et retourne le flux de streaming (streamText)
 */
export async function invoke(userPrompt) {
  // 1. Sélection du modèle selon le mode choisi dans la config
  const model = config.ONLINE_MODE
    ? google("gemini-1.5-pro") // Utilise automatiquement process.env.GOOGLE_GENERATIVE_AI_API_KEY
    : ollama("qwen3.5:9b"); // Modèle local Ollama

  // 2. Reformulation du prompt & interrogation du RAG
  let ragContext = "";
  try {
    const reformulationPrompt = config.prompts.ragReformulation(
      userPrompt,
      conversationHistory,
    );
    const { text: optimizedQuery } = await generateText({
      model: model,
      prompt: reformulationPrompt,
    });

    // Requête au serveur RAG pour obtenir du contexte
    const ragResponse = await fetch(
      `${config.RAG_SERVER_URL}/search?q=${encodeURIComponent(optimizedQuery)}`,
    );
    if (ragResponse.ok) {
      const data = await ragResponse.json();
      ragContext = data.context; // On suppose que le serveur renvoie { context: "..." }
    }
  } catch (e) {
    console.warn(
      "Impossible de joindre le RAG, continuation sans contexte.",
      e,
    );
  }

  // 3. Construction des messages pour le modèle
  // On ajoute le message de l'utilisateur enrichi avec le contexte du RAG
  const augmentedPrompt = ragContext
    ? `[Contexte issu de la base de connaissances : ${ragContext}]\n\nQuestion de l'élève : ${userPrompt}`
    : userPrompt;

  // On met à jour l'historique local avant l'envoi
  conversationHistory.push({ role: "user", content: userPrompt });

  const messagesToSend = [...conversationHistory];
  messagesToSend[messagesToSend.length - 1] = {
    role: "user",
    content: augmentedPrompt,
  };

  // 4. Appel en mode Streaming natif du Vercel AI SDK
  const result = await streamText({
    model: model,
    system: currentSystemPrompt,
    messages: messagesToSend.filter((msg) => msg.role !== "system"),
    onFinish({ text }) {
      // Une fois le stream terminé, on stocke la réponse finale dans notre historique local
      conversationHistory.push({ role: "assistant", content: text });
    },
  });

  // Retourne l'objet de stream complet (utilisable avec toUIMessageStreamResponse() dans Next.js)
  return result;
}

/** * Récupère l'historique complet des messages échangés.
 */
export function get_discussion() {
  // Filtre pour ne retourner que les messages échangés (User & Assistant) au format standard
  return conversationHistory.filter((msg) => msg.role !== "system");
}
