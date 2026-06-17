import os
from email.headerregistry import UnstructuredHeader

from langchain_community.document_loaders import PyPDFLoader, BSHTMLLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
# Changement d'import ici pour utiliser le moteur par défaut de Chroma
from chromadb.utils import embedding_functions

# --- CONFIGURATION ---
with open("Config.json", "r", encoding="utf-8") as f:
    config = json.load(f)

    # Extraction des variables de configuration
DOSSIER_SRC = config["SrcDataBase"]

# 2. C'est ICI que votre base de données vectorisée va être créée !
# Ce dossier va apparaître magiquement sur votre ordinateur.
DOSSIER_BASE_VECTORIELLE = config["VectDataBase"]

print("1. Initialisation du modèle d'embeddings interne de Chroma...")
# On utilise le modèle par défaut qui s'installe sans l'infrastructure HuggingFace
embeddings_local = embedding_functions.DefaultEmbeddingFunction()

# Liste pour accumuler tous les morceaux de texte
tous_les_chunks = []
text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)

print("2. Lecture et découpage des fichiers PDF...")
if not os.path.exists(DOSSIER_SRC):
    os.makedirs(DOSSIER_SRC)
    print(f"Le dossier '{DOSSIER_SRC}' a été créé. Pensez à y mettre vos PDF !")

for nom_fichier in os.listdir(DOSSIER_SRC):
    chemin_fichier = os.path.join(DOSSIER_SRC, nom_fichier)
    # On ignore les dossiers, on ne traite que les fichiers
    if os.path.isdir(chemin_fichier):
        continue

    if nom_fichier.endswith(".pdf"):
        print(f" -> Traitement de : {nom_fichier}")
        loader = PyPDFLoader(chemin_fichier)
        tous_les_chunks.extend(text_splitter.split_documents(loader.load()))

    elif nom_fichier.endswith(".htm") or nom_fichier.endswith(".html"):
        print(f" -> Traitement HTML : {nom_fichier}")
        try:
            from langchain_core.documents import Document
            from bs4 import BeautifulSoup
            # 1. On ouvre et on lit le fichier nous-mêmes en forçant l'UTF-8
            with open(chemin_fichier, "r", encoding="utf-8", errors="ignore") as f:
                contenu_html = f.read()
            # 2. On utilise BeautifulSoup pour nettoyer le HTML et extraire le texte propre
            soup = BeautifulSoup(contenu_html, "html.parser")
            texte_propre = soup.get_text(separator=" ")
            # 3. On extrait le titre de la page pour les métadonnées (comme le faisait BSHTMLLoader)
            titre = soup.title.string if soup.title else nom_fichier
            # 4. On encapsule le tout dans un objet Document standard de LangChain
            document_nettoye = [Document(page_content=texte_propre, metadata={"source": nom_fichier, "title": titre})]
            # 5. On découpe et on ajoute aux chunks
            tous_les_chunks.extend(text_splitter.split_documents(document_nettoye))
        except Exception as e:
            print(f"    [Erreur] Impossible de lire le HTML {nom_fichier} : {e}")
    else :
        print(f" -> Traitement (Mode Texte Brut) : {nom_fichier}")
        try:
            # TextLoader va forcer la lecture du fichier comme s'il s'agissait d'un .txt
            # autodetect_encoding=True évite les plantages avec les accents (UTF-8, Windows-1252...)
            loader = TextLoader(chemin_fichier, autodetect_encoding=True)
            tous_les_chunks.extend(text_splitter.split_documents(loader.load()))
        except Exception as e:
            print(f"    [Erreur] Impossible de lire le fichier {nom_fichier} en mode texte : {e}")


if len(tous_les_chunks) == 0:
    print("Attention : Aucun morceau de texte trouvé. Votre dossier 'RAG_src' est-il vide ?")
else:
    print(f"\n3. Création de la base vectorisée avec {len(tous_les_chunks)} morceaux...")

    # Extraction des textes et métadonnées bruts pour Chroma natif
    textes = [doc.page_content for doc in tous_les_chunks]
    metadatas = [doc.metadata for doc in tous_les_chunks]
    ids = [f"id_{i}" for i in range(len(tous_les_chunks))]

    # Utilisation directe du client persistant de Chroma
    import chromadb

    client = chromadb.PersistentClient(path=DOSSIER_BASE_VECTORIELLE)
    collection = client.get_or_create_collection(
        name="ma_collection",
        embedding_function=embeddings_local
    )

    # Injection des données
    collection.add(documents=textes, metadatas=metadatas, ids=ids)

    print(f"\n[SUCCÈS] Votre dossier de base vectorisée a été créé : '{DOSSIER_BASE_VECTORIELLE}' !")