import json from 'from-data';
import { search_in_database } from './searchData.js';
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { OllamaLLM } from "@langchain/ollama";
import dotenv from "dotenv";

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

