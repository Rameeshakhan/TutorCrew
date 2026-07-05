"""
db/chroma.py
ChromaDB client initialisation and the three persistent collections.

Collections
-----------
gap_collection     — knowledge gap scores (EMA, per-topic)
doc_collection     — embedded text chunks from uploaded documents
history_collection — quiz session records (score, topic, date)

Import `gap_collection`, `doc_collection`, `history_collection` anywhere
you need to read/write vectors. The client is a singleton — Python's module
system ensures it is only initialised once.
"""

import chromadb
from core.config import settings

# ── Client (persistent, survives restarts) ────────────────────────────────────
client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_PATH)

# ── Collections ───────────────────────────────────────────────────────────────
gap_collection = client.get_or_create_collection(
    name="knowledge_gaps",
    metadata={"hnsw:space": "cosine"},
)

doc_collection = client.get_or_create_collection(
    name="documents",
    metadata={"hnsw:space": "cosine"},
)

history_collection = client.get_or_create_collection(
    name="quiz_history",
    metadata={"hnsw:space": "cosine"},
)

print(f"✅ ChromaDB ready  →  {settings.CHROMA_PERSIST_PATH}")
print(
    f"   gaps: {gap_collection.count()} | "
    f"docs: {doc_collection.count()} | "
    f"history: {history_collection.count()}"
)
