// config.js

export const config = {
  // TRUE : Utilise Gemini via le SDK Vercel (Nécessite une clé API dans .env)
  // FALSE : Utilise Ollama en local avec Qwen
  ONLINE_MODE: false,

  // URL de ton serveur RAG externe
  RAG_SERVER_URL: "https://ton-serveur-rag.com/api",

  // Prompts système de l'application
  prompts: {
    /**
     * Génère le prompt système initial pour configurer l'IA
     */
    systemInit: (objective, name, french_level, math_level, resume) => {
  return `Tu es un tuteur pédagogique bienveillant et structuré.
  Tu t'adresses à un élève nommé ${name}.
  Voici ses niveaux actuels :
  - Français : ${french_level}
- Mathématiques : ${math_level}

Résumé du profil de l'élève : ${resume}

L'objectif pédagogique de cette session est : "${objective}".
Adapte ton vocabulaire, ton rythme et tes explications à son profil. Ne donne pas directement les réponses, guide-le par le questionnement.`;
},

/**
 * Prompt utilisé pour reformuler la question de l'élève avant d'interroger le RAG
 */
ragReformulation: (userPrompt, history) => {
return `En te basant sur l'historique de la discussion, reformule la question suivante de l'élève pour en faire une requête de recherche optimisée pour une base de données (RAG).
Question de l'élève : "${userPrompt}"
Réponse attendue : Uniquement la requête reformulée, sans fioritures.`;
}
}
};