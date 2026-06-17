import os
from pathlib import Path
import chromadb
from chromadb.config import Settings
# pyrefly: ignore [missing-import]
from langchain_chroma import Chroma
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_ollama import OllamaEmbeddings
from dotenv import load_dotenv

load_dotenv()

DATA_DIR   = Path(__file__).parent / "data"
CHROMA_DIR = Path(__file__).parent / "chroma_db"
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
COLLECTION = "math_docs"

_embeddings    = OllamaEmbeddings(base_url=OLLAMA_URL, model="nomic-embed-text:latest")
_chroma_client = None   # singleton — 1 seule connexion SQLite = pas de file lock
_vectorstore   = None


def _get_client() -> chromadb.PersistentClient:
    """Singleton PersistentClient : une seule ouverture SQLite par processus (fix WinError 32)."""
    global _chroma_client
    if _chroma_client is None:
        CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        _chroma_client = chromadb.PersistentClient(
            path=str(CHROMA_DIR),
            settings=Settings(anonymized_telemetry=False, allow_reset=True)
        )
    return _chroma_client


def _build_vectorstore() -> Chroma:
    """Recharge les PDFs, recrée la collection ChromaDB proprement."""
    client = _get_client()

    # Supprime la collection existante (vide ou corrompue) avant de reconstruire
    try:
        client.delete_collection(COLLECTION)
    except Exception:
        pass

    loader = PyPDFDirectoryLoader(str(DATA_DIR))
    docs   = loader.load()
    if not docs:
        raise FileNotFoundError(f"[RAG] Aucun PDF trouvé dans {DATA_DIR}")

    splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
    chunks   = splitter.split_documents(docs)

    vs = Chroma.from_documents(
        documents=chunks,
        embedding=_embeddings,
        client=client,
        collection_name=COLLECTION
    )
    print(f"[RAG] ChromaDB construit — {len(chunks)} chunks depuis {len(docs)} pages PDF.")
    return vs


def _load_vectorstore() -> Chroma:
    """Charge la collection existante ou reconstruit si vide/absente (singleton)."""
    global _vectorstore
    if _vectorstore is not None:
        return _vectorstore

    client = _get_client()

    existing = [c.name for c in client.list_collections()]
    if COLLECTION in existing:
        count = client.get_collection(COLLECTION).count()
        if count > 0:
            print(f"[RAG] Collection '{COLLECTION}' chargée — {count} chunks.")
            _vectorstore = Chroma(
                client=client,
                collection_name=COLLECTION,
                embedding_function=_embeddings
            )
            return _vectorstore
        print(f"[RAG] Collection '{COLLECTION}' vide — reconstruction...")

    _vectorstore = _build_vectorstore()
    return _vectorstore


def retrieve_math_concept(query: str, k: int = 3) -> str:
    vs   = _load_vectorstore()
    docs = vs.similarity_search(query, k=k)
    return "\n\n---\n\n".join(doc.page_content for doc in docs)
