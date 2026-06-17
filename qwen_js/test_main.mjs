import { add_context, init_chat, invoke, get_discussion } from "./main.mjs";

async function run() {
  console.log("=== Début du test avec documents RAG ===");

  // 1. Déclencher le serveur Python pour lire et vectoriser les fichiers PDF dans RAG_src
  console.log("1. Demande au serveur Python de lire les fichiers PDF...");
  await add_context([]);

  // 2. Initialiser le chat avec l'IA
  console.log("2. Initialisation des informations de l'étudiant...");
  init_chat(
    "Vérifier la capacité de compréhension des documents RAG",
    "Luc",
    "C1",
    "Avancé",
    "Veut poser des questions sur le document.",
  );

  // 3. Envoyer la question demandant un résumé du document
  const question = "Peux-tu m'expliquer le concept des documents fournis ?";
  console.log(`3. Envoi de la question : '${question}'`);

  const result = await invoke(question);

  // Afficher le résultat du streaming
  let fullResponse = "";
  process.stdout.write(">> Réponse de l'IA : \n");
  for await (const chunk of result.textStream) {
    process.stdout.write(chunk);
    fullResponse += chunk;
  }

  console.log("\n\n=== Historique de la discussion ===");
  console.log(get_discussion());
}

run().catch(console.error);
