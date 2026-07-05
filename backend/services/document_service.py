"""
services/document_service.py
Document ingestion: PDF text extraction (pypdf) and text chunking.
Keeps all file-handling logic away from routers and agents.
"""

import json
import uuid
from pathlib import Path
from datetime import datetime

from pypdf import PdfReader

from core.config import settings
from db.chroma import doc_collection
from services.llm import call_claude, strip_json


def extract_pdf_text(path: str) -> str:
    """Extract full text from a PDF using pypdf."""
    reader = PdfReader(path)
    pages = []
    for page in reader.pages:
        page_text = page.extract_text()
        if page_text:
            pages.append(page_text)
    return "\n\n".join(pages)


def chunk_text(
    text: str,
    size: int = settings.CHUNK_SIZE,
    overlap: int = settings.CHUNK_OVERLAP,
) -> list[str]:
    """
    Split text into overlapping word-level chunks.
    Default: 500 words per chunk, 50-word overlap.
    """
    words = text.split()
    chunks, i = [], 0
    while i < len(words):
        chunks.append(" ".join(words[i : i + size]))
        i += size - overlap
    return chunks


def ingest_document(filename: str, content: bytes, suffix: str) -> dict:
    """
    Full ingestion pipeline:
      1. Save file to disk
      2. Extract text (pypdf for PDF, UTF-8 decode for text)
      3. Chunk and embed into ChromaDB doc_collection
      4. Extract topic keywords via LLM
      5. Store document metadata record in ChromaDB

    Returns a dict with doc_id, filename, topics, chunks, word_count.
    """
    doc_id = str(uuid.uuid4())[:8]
    save_path = settings.UPLOAD_DIR / f"{doc_id}{suffix}"
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

    with open(save_path, "wb") as f:
        f.write(content)

    # ── Extract text ──────────────────────────────────────────────────────────
    if suffix == ".pdf":
        text = extract_pdf_text(str(save_path))
    else:
        text = content.decode("utf-8", errors="ignore")

    # ── Chunk → ChromaDB ──────────────────────────────────────────────────────
    chunks = chunk_text(text)
    chunk_ids = [f"{doc_id}_chunk_{i}" for i in range(len(chunks))]
    metas = [
        {"doc_id": doc_id, "filename": filename, "chunk": i}
        for i in range(len(chunks))
    ]
    doc_collection.add(ids=chunk_ids, documents=chunks, metadatas=metas)
    print(f"[DocumentService] '{filename}' → {len(chunks)} chunks in ChromaDB (doc_id: {doc_id})")

    # ── Topic extraction via LLM ──────────────────────────────────────────────
    try:
        raw = call_claude(
            "Extract topic keywords from text. Always respond with valid JSON only.",
            f"Extract 5-8 short topic strings from this content. "
            f"Return ONLY this JSON object: {{\"topics\": [\"topic1\", \"topic2\", ...]}}\n\n"
            f"Content:\n{text[:2000]}",
            json_mode=True,
        )
        parsed = json.loads(strip_json(raw))
        topics: list[str] = parsed["topics"] if isinstance(parsed, dict) else parsed
    except Exception:
        topics = ["General"]

    # ── Metadata record in ChromaDB ───────────────────────────────────────────
    doc_collection.add(
        ids=[f"meta_{doc_id}"],
        documents=[f"Document: {filename}. Topics: {', '.join(topics)}."],
        metadatas=[{
            "type": "doc_meta",
            "doc_id": doc_id,
            "filename": filename,
            "topics": json.dumps(topics),
            "word_count": len(text.split()),
            "uploaded_at": datetime.now().isoformat(),
        }],
    )

    return {
        "doc_id": doc_id,
        "filename": filename,
        "topics": topics,
        "chunks": len(chunks),
        "word_count": len(text.split()),
    }


def list_documents() -> list[dict]:
    """Return all document metadata records stored in ChromaDB."""
    if doc_collection.count() == 0:
        return []
    items = doc_collection.get(include=["metadatas"], where={"type": "doc_meta"})
    return [
        {
            "doc_id": m["doc_id"],
            "filename": m["filename"],
            "topics": json.loads(m.get("topics", "[]")),
            "word_count": m.get("word_count", 0),
            "uploaded_at": m.get("uploaded_at", ""),
        }
        for m in items["metadatas"]
        if m.get("type") == "doc_meta"
    ]


def query_chunks(topic: str, doc_id: str, n: int = 5) -> str:
    """
    Semantic search: retrieve the most relevant text chunks for a topic
    from a specific document. Returns concatenated context string.
    """
    if doc_collection.count() == 0:
        return ""
    results = doc_collection.query(
        query_texts=[topic],
        n_results=min(n, doc_collection.count()),
        where={"doc_id": doc_id},
    )
    if results["documents"] and results["documents"][0]:
        print(f"[DocumentService] Retrieved {len(results['documents'][0])} chunks for '{topic}'")
        return "\n\n".join(results["documents"][0])
    return ""


def query_all_chunks(topic: str, n: int = 3) -> str:
    """Semantic search across ALL documents (used by the Explainer)."""
    if doc_collection.count() == 0:
        return ""
    results = doc_collection.query(query_texts=[topic], n_results=min(n, doc_collection.count()))
    if results["documents"] and results["documents"][0]:
        return "\n".join(results["documents"][0])
    return ""
