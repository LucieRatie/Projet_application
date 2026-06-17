import os
from copyreg import constructor

import json
from distutils.command.config import config

from Query import search_in_database
from dotenv import load_dotenv
from langchain_core.prompts import ChatPromptTemplate

def get_model(is_online, temperature):
    if is_online:
        print("🤖 Initialisation de Gemini (Online)...")
        from langchain_google_genai import ChatGoogleGenerativeAI
        model = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            temperature=temperature,
        )
    else :
        print("🦙 Initialisation de Ollama/Llama3 (Local)...")
        from langchain_community.llms import Ollama
        model = Ollama(
            model="llama3",
            temperature=temperature,
            maxRetries=3,
            baseUrl="http://localhost:11434",
        )
    return model

def main(question_eleve):
    # 1. Charger le .env la clef api google est dessus ça évite de la mettre en publique
    load_dotenv()

    # 2. Initialisation du modèle
    with open("Config.json", "r", encoding="utf-8") as f:
        config = json.load(f)

        # Extraction des variables de configuration
    is_online = config["settings"]["online"]
    temperature = config["settings"]["temperature"]

    model = get_model(is_online, temperature)

    # 4.1 Creation du prompt pour reformulation
    prompt_config = config["prompts"]["reformulation"]
    prompt_template1 = ChatPromptTemplate.from_messages([
        ("user", prompt_config["user"]),
        ("system", prompt_config["system"]),
    ])

    # 4.2 Assemblage et initalisation du prompt
    chain1 = prompt_template1 | model


    print("question_eleve", question_eleve)
    print("Envoi de la requête à Gemini pour reformulation...\n")
    prompt = chain1.invoke({"question": question_eleve})
    print("prompt",prompt)

    # 5.1 Préparation des données pour le 2e propt
    context_db = search_in_database(prompt.content) #Query.py
    print("context_db", context_db)

    prompt_config2 = config["prompts"]["Reponse"]
    prompt_template2 = ChatPromptTemplate.from_messages([
        ("system", prompt_config2["system"]),
        ("user", prompt_config["user"])
    ])

    # 5.2 Assemblage et exécution
    chain2 = prompt_template2 | model


    print("Envoi de la demande à Gemini...\n")
    response = chain2.invoke({"documents": context_db, "question": question_eleve})

    print(response.content)

#Prochainement JS navigateur
question_eleve="Quelles sera la météo de San Francisco demain ? Quelle est la température maximale à Toulouse ? Quel temps fait-il à Paris ?";

main(question_eleve)