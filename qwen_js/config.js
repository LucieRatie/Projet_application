
export const config = {
  ONLINE_MODE: false,
  RAG_SERVER_URL: "http://localhost:8000",
  prompts: {
    systemInit: (objective, name, french_level, math_level, resume) => {
      return `Tu es un tuteur pédagogique bienveillant et structuré.
  Tu t'adresses à un élève nommé ${name}.
  Voici ses niveaux actuels :
  - Français : ${french_level}
- Mathématiques : ${math_level}

Résumé du profil de l'élève : ${resume}

L'objectif pédagogique de cette session est : "${objective}".
Adapte ton vocabulaire, ton rythme et tes explications à son profil. Ne donne pas directement les réponses, guide-le par le questionnement.`;    },
    ragReformulation: (userPrompt, history) => {
      return `En te basant sur l'historique de la discussion, reformule la question suivante de l'élève pour en faire une requête de recherche optimisée pour une base de données (RAG).
Question de l'élève : "${userPrompt}"
Réponse attendue : Uniquement la requête reformulée, sans fioritures.`;    }
  }
};
