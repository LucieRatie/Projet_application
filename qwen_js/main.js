import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { OllamaLLM } from "@langchain/ollama";
import dotenv from "dotenv";

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
    //repondre avec prompt + reponse RAG+ historique
}

/**
 * Récupère l'historique complet des messages échangés au cours de la discussion.
 *
 * @returns {Array<{role: string, content: string}>} Liste des messages de la discussion (format standard type OpenAI/Qwen).
 */
function get_discussion() {
    // retourner l'ensemble [{role:"user",content:"je ne comprend pas..."}]
}

//Initialisation dotenv
dotenv.config();

export function getModel(isOnline, temperature) {
    let model;
    if (is_online) {
        console.log("🤖 Initialisation de Gemini (Online)...")
        model = new ChatGoogleGenerativeAI({
            modelName: "gemini-2.5-flash",
            temperature: temperature,
        });
    }
    else {
        console.log("🦙 Initialisation de Ollama/Llama3 (Local)...")
        model = new OllamaLLM({
            modelName:"qwen-no-think",
            temperature: temperature,
            maxRetries:3,
            baseUrl:"http://localhost:11434"
        });
    }
    return model;
}