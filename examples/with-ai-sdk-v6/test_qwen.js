// test.js
import { init_chat, invoke, get_discussion } from '../../qwen_js/main.js';
import { config } from '../../qwen_js/config.js';

async function runTest() {
    console.log(`=== Démarrage du test (Mode En ligne: ${config.ONLINE_MODE}) ===\n`);

    // 1. Initialisation du chat avec un profil d'élève
    init_chat(
        "Comprendre le théorème de Pythagore", // Objectif
        "Lucas",                               // Nom
        "A2",                                  // Niveau Français
        "Collège (4ème)",                      // Niveau Math
        "Lucas est motivé mais bloque sur la géométrie." // Résumé Llama
    );

    console.log("\nEnvoi du message : 'Bonjour, je n'arrive pas à comprendre à quoi sert Pythagore...'");

    try {
        // 2. Appel de la fonction invoke (qui renvoie le stream de Vercel AI SDK)
        const result = await invoke("Bonjour, je n'arrive pas à comprendre à quoi sert Pythagore...");

        console.log("\nRéponse de l'IA (Streaming) : ");
        process.stdout.write("> ");

        // 3. Lecture du flux de texte en temps réel dans la console
        for await (const textPart of result.textStream) {
            process.stdout.write(textPart);
        }

        console.log("\n\n=========================================");
        // 4. Vérification que l'historique s'est bien mis à jour
        console.log("Historique de la discussion stocké :");
        print(get_discussion());

    } catch (error) {
        console.error("❌ Une erreur est survenue durant le test :", error);
    }
}

runTest();