import os
from Query import search_in_database
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
#"Tu dois reformuler {question} pour faire la requête que j'enverrai immédiatement pour interroger la base de donnée"


# 1. Charger le .env que l'on vient de créer de force
load_dotenv()
# 2. Initialiser le modèle
model = ChatGoogleGenerativeAI(model="gemini-2.5-flash", temperature=0.3)

# 3. Les données à consulter (RAG)
def get_prompt_eleve():
    return "Quelles sera la météo de San Francisco demain ? Quelle est la température maximale à Toulouse ? Quel temps fait-il à Paris ?"


# 4. Orchestration
question_eleve = get_prompt_eleve() #Prochainement JS navigateur

prompt_template1 = ChatPromptTemplate.from_messages([
    ("user", "{question}"),
    ("system", "Reformule la question de l'utilisateur pour faire une requete RAG, ta reponse servira de prompt pour la requete RAG ne raconte pas ta vie")
])

# 5. Assemblage et exécution
chain1 = prompt_template1 | model

print("question_eleve",question_eleve)
print("Envoi de la requête à Gemini pour reformulation...\n")
prompt = chain1.invoke({"question": question_eleve})
print("prompt",prompt)

context_db = search_in_database(prompt.content) #Query.py
print("context_db",context_db)

prompt_template2 = ChatPromptTemplate.from_messages([
    ("system", "Tu es un météorologue. Réponds à la question en t'appuyant uniquement sur les documents suivants :\n\n{documents}"),
    ("user", "{question}")
])

# 5. Assemblage et exécution
chain2 = prompt_template2 | model

print("Envoi de la demande à Gemini...\n")
response = chain2.invoke({"documents": context_db, "question": question_eleve})

print(response.content)