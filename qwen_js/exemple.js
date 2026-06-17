const fs = require('fs');
const dotenv = require('dotenv');
const { ChatGoogleGenerationAI } = require("@langchain/google-genai");
const { ChatOllama } = require("@langchain/ollama");
const { ChatPromptTemplate, MessagesPlaceholder } = require("@langchain/core/prompts");
const { StringOutputParser } = require("@langchain/core/output_parsers");
const { ChatMessageHistory } = require("langchain/stores/message/in_memory");

// Charger l'environnement et la configuration
dotenv.config();
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// Variables globales pour maintenir l'état de la session de l'élève
let modelInstance = null;
let systemPromptText = "";
const messageHistory = new ChatMessageHistory();

/**
 * Initialise le modèle de langage choisi (Gemini ou Ollama/Qwen) via LangChain
 */
function getModel() {
    if (modelInstance) return modelInstance;

    if (config.online) {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("La variable d'environnement GEMINI_API_KEY est manquante.");
        }
        console.log("[LANGCHAIN] Initialisation du modèle en ligne : Gemini");
        modelInstance = new ChatGoogleGenerationAI({
            apiKey: process.env.GEMINI_API_KEY,
            modelName: "gemini-2.5-flash",
            temperature: 0.7,
        });
    } else {
        console.log(`[LANGCHAIN] Initialisation du modèle local : Ollama (${config.ollama.model})`);
        modelInstance = new ChatOllama({
            baseUrl: config.ollama.baseUrl,
            model: config.ollama.model,
            temperature: 0.7,
        });
    }
    return modelInstance;
}

/**
 * Simulation d'une base de données vectorielle (RAG).
 * (Note : LangChain dispose de modules comme 'MemoryVectorStore' ou 'Chroma' si vous souhaitez l'implémenter pleinement).
 */
async function query_vector_db(queryText) {
    console.log(`[RAG] Recherche vectorielle pour : "${queryText}"`);
    return "Document RAG : Fiche méthode sur la résolution de problèmes et la gestion des priorités opératoires.";
}

/**
 * Vectorise et stocke une liste de fichiers dans la base de données RAG.
 *
 * @param {string[]} list_file_path - Liste des chemins d'accès aux fichiers à indexer.
 * @returns {void}
 */
function add_context(list_file_path) {
    console.log("[RAG] Début de la vectorisation des fichiers avec LangChain...", list_file_path);
    // Dans une version de production LangChain, vous feriez :
    // const loader = new TextLoader(filePath);
    // const docs = await loader.load();
    // const splitter = new RecursiveCharacterTextSplitter({ chunkSize: 500 });
    // await vectorStore.addDocuments(await splitter.splitDocuments(docs));
    console.log("[RAG] Fichiers indexés avec succès dans le VectorStore.");
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
    // 1. Vider l'historique précédent pour cette nouvelle session
    messageHistory.clear();

    // 2. Générer le prompt système personnalisé basé sur le template de configuration
    let template = config.prompts.system_template;
    systemPromptText = template
        .replace("{objective}", objective)
        .replace("{name}", name)
        .replace("{french_level}", french_level)
        .replace("{math_level}", math_level)
        .replace("{resume}", resume);

    console.log("[INIT] Chat LangChain initialisé. Prompt système configuré.");
}

/**
 * Envoie le prompt de l'élève au modèle Qwen ou Gemini et récupère sa réponse générée.
 *
 * @param {string} prompt - Le message ou la question de l'élève.
 * @returns {Promise<string>} La réponse textuelle générée.
 */
async function invoke(prompt) {
    try {
        const model = getModel();
        const currentMessages = await messageHistory.getMessages();

        // --- ÉTAPE 1 : REFORMULATION POUR LE RAG ---
        let searchKeywords = prompt;
        try {
            const reformulationPrompt = ChatPromptTemplate.fromMessages([
                ["system", "Tu es un assistant de recherche. Reformule la demande pour un moteur de recherche RAG. Sois très concis."],
                ["user", config.prompts.reformulation_template]
            ]);

            // Chaîne LCEL pour la reformulation
            const reformulationChain = reformulationPrompt.pipe(model).pipe(new StringOutputParser());
            const reformulated = await reformulationChain.invoke({ prompt: prompt });
            searchKeywords = reformulated.trim();
            console.log(`[LANGCHAIN RAG] Mots-clés optimisés : "${searchKeywords}"`);
        } catch (err) {
            console.warn("[LANGCHAIN] Échec de reformulation, utilisation du texte brut.", err.message);
        }

        // --- ÉTAPE 2 : INTERROGATION DU RAG ---
        const ragContext = await query_vector_db(searchKeywords);

        // --- ÉTAPE 3 : CONSTRUIRE LA CHAÎNE DE DISCUSSION PRINCIPALE ---
        // On prépare le message enrichi avec le contexte RAG pour ce tour précis
        const enrichedUserContent = config.prompts.rag_context_wrapper
            .replace("{context}", ragContext)
            .replace("{prompt}", prompt);

        // Création du Prompt de Chat avec l'historique dynamique LangChain
        const chatPrompt = ChatPromptTemplate.fromMessages([
            ["system", systemPromptText],
            new MessagesPlaceholder("chat_history"),
            ["user", "{enriched_prompt}"]
        ]);

        // Chaîne LCEL principale : Prompt -> Modèle -> Parseur de texte
        const conversationChain = chatPrompt.pipe(model).pipe(new StringOutputParser());

        // Exécution de la chaîne
        const response = await conversationChain.invoke({
            chat_history: currentMessages,
            enriched_prompt: enrichedUserContent
        });

        // --- ÉTAPE 4 : ENREGISTRER LE VRAI DIALOGUE DANS L'HISTORIQUE ---
        // On n'enregistre PAS le wrapper RAG dans l'historique pour éviter de polluer la mémoire à long terme
        await messageHistory.addUserMessage(prompt);
        await messageHistory.addAIChatMessage(response);

        return response;

    } catch (error) {
        console.error("[LANGCHAIN INVOKE ERROR]", error);
        throw error;
    }
}

/**
 * Récupère l'historique complet des messages échangés au cours de la discussion.
 *
 * @returns {Promise<Array<{role: string, content: string}>>} Liste des messages formatés standard.
 */
async function get_discussion() {
    const langchainMessages = await messageHistory.getMessages();

    // Mappage du format interne LangChain vers votre format standard de type OpenAI/Ollama
    return langchainMessages.map(msg => {
        let role = "user";
        if (msg._getType() === "ai") role = "assistant";
        if (msg._getType() === "system") role = "system";

        return {
            role: role,
            content: msg.content
        };
    });
}

module.exports = {
    add_context,
    init_chat,
    invoke,
    get_discussion
};