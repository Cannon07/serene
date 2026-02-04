"""
RAG service for knowledge base retrieval using ChromaDB and OpenAI embeddings.
"""
import os
from typing import Optional

from langchain_core.documents import Document
from langchain_openai import OpenAIEmbeddings
from langchain_chroma import Chroma
from opik import track

from config.rag_config import (
    get_openai_api_key,
    get_chroma_persist_dir,
    is_rag_configured,
    RAG_CONFIG,
)
from knowledge_base.loader import load_documents


class RAGServiceError(Exception):
    """Raised when RAG service encounters an error."""
    pass


class RAGService:
    """Singleton service for RAG operations."""

    _instance: Optional["RAGService"] = None

    def __init__(self):
        self._initialized = False
        self._vector_store: Optional[Chroma] = None
        self._embeddings: Optional[OpenAIEmbeddings] = None

    @classmethod
    def get_instance(cls) -> "RAGService":
        """Get singleton instance of RAG service."""
        if cls._instance is None:
            cls._instance = RAGService()
        return cls._instance

    async def initialize(self, force_reload: bool = False) -> bool:
        """
        Initialize the RAG service with knowledge base documents.

        Args:
            force_reload: If True, reload documents even if already initialized

        Returns:
            True if initialization successful, False otherwise
        """
        if self._initialized and not force_reload:
            return True

        if not is_rag_configured():
            print("Warning: OPENAI_API_KEY not set. RAG service disabled.")
            return False

        try:
            # Initialize embeddings
            self._embeddings = OpenAIEmbeddings(
                model=RAG_CONFIG["embedding_model"],
                openai_api_key=get_openai_api_key(),
            )

            # Load documents from knowledge base
            documents = load_documents()

            if not documents:
                print("Warning: No documents found in knowledge base.")
                return False

            # Create or load vector store
            persist_dir = get_chroma_persist_dir()
            os.makedirs(persist_dir, exist_ok=True)

            self._vector_store = Chroma.from_documents(
                documents=documents,
                embedding=self._embeddings,
                persist_directory=persist_dir,
                collection_name="serene_knowledge_base",
            )

            self._initialized = True
            print(f"RAG service initialized with {len(documents)} documents")
            return True

        except Exception as e:
            error_msg = str(e)
            if "insufficient_quota" in error_msg or "429" in error_msg:
                print("Warning: OpenAI API quota exceeded. Please check your billing at https://platform.openai.com/account/billing")
                print("RAG service disabled - Calm Agent will use fallback responses.")
            else:
                print(f"Error initializing RAG service: {e}")
            return False

    @track(name="RAGService.retrieve")
    async def retrieve(
        self,
        query: str,
        k: int = None,
        filter_metadata: Optional[dict] = None,
    ) -> list[Document]:
        """
        Retrieve relevant documents using MMR search.

        Args:
            query: Search query
            k: Number of documents to return (default from config)
            filter_metadata: Optional metadata filter dict

        Returns:
            List of relevant Document objects
        """
        if not self._initialized or self._vector_store is None:
            # Try to initialize if not already done
            await self.initialize()
            if not self._initialized:
                return []

        k = k or RAG_CONFIG["k"]

        try:
            # Use MMR for diversity in results
            results = self._vector_store.max_marginal_relevance_search(
                query=query,
                k=k,
                fetch_k=RAG_CONFIG["fetch_k"],
                lambda_mult=RAG_CONFIG["lambda_mult"],
                filter=filter_metadata,
            )
            return results

        except Exception as e:
            print(f"Error during RAG retrieval: {e}")
            return []

    @track(name="RAGService.similarity_search")
    async def similarity_search(
        self,
        query: str,
        k: int = None,
        filter_metadata: Optional[dict] = None,
    ) -> list[Document]:
        """
        Retrieve documents using pure similarity search.

        Args:
            query: Search query
            k: Number of documents to return
            filter_metadata: Optional metadata filter dict

        Returns:
            List of relevant Document objects
        """
        if not self._initialized or self._vector_store is None:
            await self.initialize()
            if not self._initialized:
                return []

        k = k or RAG_CONFIG["k"]

        try:
            results = self._vector_store.similarity_search(
                query=query,
                k=k,
                filter=filter_metadata,
            )
            return results

        except Exception as e:
            print(f"Error during similarity search: {e}")
            return []

    def is_initialized(self) -> bool:
        """Check if service is initialized."""
        return self._initialized
