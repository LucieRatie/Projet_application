/**
 * Vectorise et stocke une liste de fichiers dans la base de données RAG.
 *
 * @param {string[]} list_file_path - Liste des chemins d'accès aux fichiers à indexer.
 * @returns {void} Ne retourne aucune valeur.
 */
function add_context(list_file_path) {
    // Vectoriser les fichiers
}

/**
 * Configure et prépare l'IA (système, contexte et variables) avant de démarrer l'échange avec l'élève.
 *
 * @param {string} objective - L'objectif pédagogique de la session.
 * @param {string} name - Le nom de l'élève.
 * @param {string} french_level - Le niveau de l'élève en français.
 * @param {string} math_level - Le niveau de l'élève en mathématiques.
 * @param {string} resume - Le résumé du profil ou de l'historique généré par Llama.
 * @returns {void} Ne retourne aucune valeur.
 */
function init_chat(objective, name, french_level, math_level, resume) {
    // Il faut faire un prompt system avec tous les elements
}

/**
 * Envoie le prompt de l'élève au modèle Qwen et récupère sa réponse générée.
 *
 * @param {string} prompt - Le message ou la question de l'élève.
 * @returns {string} La réponse textuelle générée par le modèle Qwen.
 */
function invoke(prompt) {
    //reformuler le prompt
    //interroger le rag
    //repondre avec prompt + reponse RAG
}

/**
 * Récupère l'historique complet des messages échangés au cours de la discussion.
 *
 * @returns {Array<{role: string, content: string}>} Liste des messages de la discussion (format standard type OpenAI/Qwen).
 */
function get_discussion() {
    // retourner l'ensemble [{role:"user",content:"je ne comprend pas..."}]
}