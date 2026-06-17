import path from "path";
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { TextLoader } from "langchain/document_loaders/fs/text";

/**
 * Historique des messages échangés au cours de la discussion (format {role, content}).
 * @type {Array<{role: string, content: string}>}
 */
const discussion_history = [];

/**
 * Documents chargés et en attente de vectorisation (placeholder en mémoire,
 * tant que la base vectorielle n'est pas branchée).
 * @type {Array<import("@langchain/core/documents").Document>}
 */
const context_documents = [];

/**
 * Vectorise et stocke une liste de fichiers dans la base de données RAG.
 *
 * @param {string[]} list_file_path - Liste des chemins d'accès aux fichiers à indexer.
 * @returns {void} Ne retourne aucune valeur.
 */
async function add_context(list_file_path) {
  for (const file_path of list_file_path) {
    const loader =
      path.extname(file_path).toLowerCase() === ".pdf"
        ? new PDFLoader(file_path)
        : new TextLoader(file_path);

    const docs = await loader.load();
    context_documents.push(...docs);
  }
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
  const system_prompt = `Tu es un tuteur de mathématiques pour ${name}.
                            Objectif de la session : ${objective}
                            Niveau de français de l'élève : ${french_level}
                            Niveau de mathématiques de l'élève : ${math_level}
                            Résumé du profil / historique de l'élève : ${resume}
                            Adapte ton vocabulaire et la complexité de tes explications à ces niveaux.`;

  discussion_history.length = 0;
  discussion_history.push({ role: "system", content: system_prompt });
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
  //repondre avec prompt + reponse RAG+ historique

  discussion_history.push({ role: "user", content: prompt });

  const response = ""; // réponse générée par Qwen

  discussion_history.push({ role: "ia", content: response });

  return response;
}

/**
 * Récupère l'historique complet des messages échangés au cours de la discussion.
 *
 * @returns {Array<{role: string, content: string}>} Liste des messages de la discussion (format standard type OpenAI/Qwen).
 */

function get_discussion() {
  return discussion_history;
}
