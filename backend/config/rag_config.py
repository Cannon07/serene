"""
RAG configuration and initialization.
"""
import os
from typing import Optional


def get_openai_api_key() -> Optional[str]:
    """Get OpenAI API key at runtime."""
    return os.getenv("OPENAI_API_KEY")


def get_chroma_persist_dir() -> str:
    """Get ChromaDB persistence directory."""
    return os.getenv(
        "CHROMA_PERSIST_DIR",
        os.path.join(os.path.dirname(os.path.dirname(__file__)), "knowledge_base", "embeddings")
    )


def is_rag_configured() -> bool:
    """Check if RAG dependencies are properly configured."""
    return get_openai_api_key() is not None


# RAG retrieval settings
RAG_CONFIG = {
    "embedding_model": "text-embedding-3-small",
    "search_type": "mmr",
    "k": 4,
    "fetch_k": 10,
    "lambda_mult": 0.7,
}
