import chromadb
from chromadb.utils import embedding_functions

# Écrire question ici !
#ma_question = "Explique moi ce qu'est un carré et comment on le dessine ?"

def search_in_database(ma_question: str):
    # --- CONFIGURATION ---
    # On pointe vers le dossier créé par le premier script
    DOSSIER_BASE_VECTORIELLE = "./test_base"
    # 1. On initialise EXACTEMENT le même moteur de calcul que pour l'ingestion
    embeddings_local = embedding_functions.DefaultEmbeddingFunction()

    # 2. On se connecte au dossier de la base (Temps d'exécution : quasi instantané)
    client = chromadb.PersistentClient(path=DOSSIER_BASE_VECTORIELLE)

    # 3. On récupère la collection existante
    collection = client.get_collection(
        name="ma_collection",
        embedding_function=embeddings_local
    )

    # --- RECHERCHE ---
    print(f"Recherche dans la base vectorisée pour : '{ma_question}'...\n")

    # On demande à Chroma de nous sortir les 2 morceaux de PDF les plus proches
    resultats = collection.query(
        query_texts=[ma_question],
        n_results=10
    )

    # 4. AFFICHAGE DES RÉSULTATS
    # On extrait les données reçues
    documents = resultats['documents'][0]
    metadatas = resultats['metadatas'][0]
    distances = resultats['distances'][0]
    return "".join(documents)
    """
    if len(documents) == 0:
        return ""
    else:
        for i in range(len(documents)):
            source = metadatas[i].get('source', 'Inconnue')
            page = metadatas[i].get('page', 0) + 1  # +1 car Python commence à 0
            return documents, source, page


if len(documents) == 0:
    print("Aucun document correspondant trouvé dans la base.")
else:
    for i in range(len(documents)):
        print(f"=== RÉSULTAT {i + 1} (Score de distance : {distances[i]:.4f}) ===")
        # On affiche la source (nom du fichier et page)
        source = metadatas[i].get('source', 'Inconnue')
        page = metadatas[i].get('page', 0) + 1  # +1 car Python commence à 0

        print(f"Source : {source} - Page {page}")
        print(f"Texte trouvé :\n\"{documents[i].strip()}\"\n")
        print("-" * 50)"""