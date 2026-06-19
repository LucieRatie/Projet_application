import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

# Importations LangChain (pour le chargement et découpage)
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_core.documents import Document
from bs4 import BeautifulSoup

# Importation ChromaDB Natif
import chromadb
from chromadb.utils import embedding_functions

app = FastAPI(title="Serveur RAG - Tuteur IA")

# --- CONFIGURATION CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CHARGEMENT DE LA CONFIGURATION JSON ---
CONFIG_FILE = "Config.json"
if not os.path.exists(CONFIG_FILE):
    # Création d'une config par défaut si le fichier n'existe pas
    default_config = {"SrcDataBase": "./RAG_src", "VectDataBase": "./chroma_db"}
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(default_config, f, indent=4)

with open(CONFIG_FILE, "r", encoding="utf-8") as f:
    config_data = json.load(f)

DOSSIER_SRC = config_data.get("SrcDataBase", "./RAG_src")
DOSSIER_BASE_VECTORIELLE = config_data.get("VectDataBase", "./chroma_db")

# Ensure source directory exists
if not os.path.exists(DOSSIER_SRC):
    os.makedirs(DOSSIER_SRC)

# --- INITIALISATION CHROMA NATIF ---
# Modèle par défaut de Chroma (ONNX miniLM léger)
embeddings_local = embedding_functions.DefaultEmbeddingFunction()

# Client persistant et collection
chroma_client = chromadb.PersistentClient(path=DOSSIER_BASE_VECTORIELLE)
collection = chroma_client.get_or_create_collection(
    name="ma_collection",
    embedding_function=embeddings_local
)

# Séparateur de texte partagé (Réduit pour accélérer l'IA)
text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=100)

# --- MODÈLE DE DONNÉES ---
class FileListInput(BaseModel):
    filePaths: List[str]


# --- ROUTES API ---

@app.post("/vectorize")
async def vectorize_files(data: FileListInput):
    """
    Parcourt la liste des fichiers envoyée, applique les filtres PDF/HTML/TXT,
    les découpe en morceaux et les injecte directement dans la collection Chroma native.
    """
    tous_les_chunks = []

    # Si la liste reçue est vide, on traite par défaut tout le contenu du dossier DOSSIER_SRC
    paths_to_process = data.filePaths if data.filePaths else [
        os.path.join(DOSSIER_SRC, f) for f in os.listdir(DOSSIER_SRC)
    ]

    for chemin_fichier in paths_to_process:
        if not os.path.exists(chemin_fichier) or os.path.isdir(chemin_fichier):
            continue

        nom_fichier = os.path.basename(chemin_fichier)

        # 1. Gestion des fichiers PDF
        if nom_fichier.endswith(".pdf"):
            try:
                loader = PyPDFLoader(chemin_fichier)
                docs = loader.load()
                for doc in docs:
                    doc.metadata["source"] = nom_fichier
                tous_les_chunks.extend(text_splitter.split_documents(docs))
            except Exception as e:
                print(f"[Erreur] Lecture PDF {nom_fichier} : {e}")

        # 2. Gestion des fichiers HTML (Nettoyage BeautifulSoup)
        elif nom_fichier.endswith(".htm") or nom_fichier.endswith(".html"):
            try:
                with open(chemin_fichier, "r", encoding="utf-8", errors="ignore") as f:
                    contenu_html = f.read()

                soup = BeautifulSoup(contenu_html, "html.parser")
                texte_propre = soup.get_text(separator=" ")
                titre = soup.title.string if soup.title else nom_fichier

                document_nettoye = [Document(page_content=texte_propre, metadata={"source": nom_fichier, "title": titre})]
                tous_les_chunks.extend(text_splitter.split_documents(document_nettoye))
            except Exception as e:
                print(f"[Erreur] Lecture HTML {nom_fichier} : {e}")

        # 3. Gestion Mode Texte Brut
        else:
            try:
                loader = TextLoader(chemin_fichier, autodetect_encoding=True)
                docs = loader.load()
                for doc in docs:
                    doc.metadata["source"] = nom_fichier
                tous_les_chunks.extend(text_splitter.split_documents(docs))
            except Exception as e:
                print(f"[Erreur] Lecture Texte Brut {nom_fichier} : {e}")

    if len(tous_les_chunks) == 0:
        raise HTTPException(status_code=400, detail="Aucun fragment de texte n'a pu être extrait des fichiers fournis.")

    # Préparation des structures pour Chroma natif
    textes = [doc.page_content for doc in tous_les_chunks]
    metadatas = [doc.metadata for doc in tous_les_chunks]

    # Génération d'IDs uniques basés sur le nombre d'éléments existants pour éviter les collisions
    current_count = collection.count()
    ids = [f"id_{current_count + i}" for i in range(len(tous_les_chunks))]

    # Injection directe dans Chroma
    collection.add(documents=textes, metadatas=metadatas, ids=ids)

    return {
        "status": "success",
        "message": f"{len(tous_les_chunks)} fragments indexés avec succès dans la collection."
    }


@app.get("/search")
async def search_rag(q: str, sources: Optional[str] = None):
    """
    Interroge la base de données vectorielle Chroma et retourne les 3 résultats
    les plus proches agrégés sous forme de contexte textuel.
    """
    if not q:
        raise HTTPException(status_code=400, detail="Le paramètre de recherche 'q' est manquant.")

    try:
        where_clause = None
        if sources:
            filenames = [s.strip() for s in sources.split(",") if s.strip()]
            if len(filenames) == 1:
                where_clause = {"source": filenames[0]}
            elif len(filenames) > 1:
                where_clause = {"source": {"$in": filenames}}

        # Requête native Chroma (Renvoie les k=4 meilleurs résultats pour plus de contexte)
        results = collection.query(
            query_texts=[q],
            n_results=4,
            where=where_clause
        )

        # Extraction des textes (Chroma renvoie une liste de listes [[doc1, doc2, doc3]])
        documents_trouves = results.get("documents", [[]])[0]

        if not documents_trouves:
            return {"context": ""}

        # Fusion des extraits trouvés pour former le bloc contexte destiné à l'agent
        context = "\n\n--- Nouvel extrait ---\n\n".join(documents_trouves)

        return {"context": context}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la recherche vectorielle : {str(e)}")


if __name__ == "__main__":
    import uvicorn
    print(f"Démarrage du serveur RAG sur http://localhost:8000")
    print(f"Dossier source : {DOSSIER_SRC} | Base vectorielle : {DOSSIER_BASE_VECTORIELLE}")
    uvicorn.run(app, host="0.0.0.0", port=8000)