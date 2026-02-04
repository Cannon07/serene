"""
Load and parse knowledge base markdown documents with YAML frontmatter.
"""
import os
from pathlib import Path
from typing import Optional

import frontmatter
from langchain_core.documents import Document


def load_documents(base_path: Optional[str] = None) -> list[Document]:
    """
    Load all markdown documents from knowledge base.

    Args:
        base_path: Path to documents directory. Defaults to ./documents relative to this file.

    Returns:
        List of LangChain Document objects with metadata
    """
    if base_path is None:
        base_path = os.path.join(os.path.dirname(__file__), "documents")

    documents = []
    base = Path(base_path)

    if not base.exists():
        print(f"Warning: Knowledge base path does not exist: {base_path}")
        return documents

    # Recursively find all markdown files
    for md_file in base.rglob("*.md"):
        try:
            doc = _parse_markdown_with_frontmatter(md_file)
            if doc:
                documents.append(doc)
        except Exception as e:
            print(f"Warning: Failed to parse {md_file}: {e}")

    print(f"Loaded {len(documents)} documents from knowledge base")
    return documents


def _parse_markdown_with_frontmatter(file_path: Path) -> Optional[Document]:
    """
    Parse markdown file with YAML frontmatter.

    Args:
        file_path: Path to markdown file

    Returns:
        LangChain Document with content and metadata, or None if parsing fails
    """
    with open(file_path, "r", encoding="utf-8") as f:
        post = frontmatter.load(f)

    # Extract metadata from frontmatter
    metadata = dict(post.metadata)

    # Add file info to metadata
    metadata["source"] = str(file_path)
    metadata["filename"] = file_path.name

    # Ensure required fields have defaults
    if "id" not in metadata:
        metadata["id"] = file_path.stem
    if "category" not in metadata:
        # Infer category from parent directory
        metadata["category"] = file_path.parent.name
    if "title" not in metadata:
        metadata["title"] = file_path.stem.replace("_", " ").title()

    # Convert list fields to comma-separated strings (ChromaDB doesn't support lists)
    for field in ["tags", "effectiveness_for", "stress_levels"]:
        if field in metadata:
            value = metadata[field]
            if isinstance(value, list):
                metadata[field] = ",".join(str(v) for v in value)
            else:
                metadata[field] = str(value)

    # Content is everything after frontmatter
    content = post.content.strip()

    if not content:
        return None

    return Document(page_content=content, metadata=metadata)


def get_documents_by_category(
    documents: list[Document],
    category: str
) -> list[Document]:
    """Filter documents by category."""
    return [doc for doc in documents if doc.metadata.get("category") == category]


def get_documents_by_effectiveness(
    documents: list[Document],
    preference: str
) -> list[Document]:
    """Filter documents by effectiveness for a calming preference."""
    return [
        doc for doc in documents
        if preference in doc.metadata.get("effectiveness_for", [])
    ]
