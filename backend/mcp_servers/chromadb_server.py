"""
mcp_servers/chromadb_server.py
MCP Server — ChromaDB Vector Store

Exposes the three ChromaDB collections as MCP tools so that
CrewAI agents call them through the Model Context Protocol
instead of importing ChromaDB directly.

Tools exposed
-------------
upsert_gap        — Insert or EMA-update a topic score in gap_collection
get_gap           — Read one topic's score from gap_collection
get_all_gaps      — Dump all gap vectors
semantic_search   — Cosine similarity search in gap_collection
store_history     — Append a quiz session record to history_collection
get_history       — Retrieve all quiz history records
query_doc_chunks  — Semantic search in doc_collection (for QGen context)

Run standalone:
    python mcp_servers/chromadb_server.py
"""

import asyncio
import json
import sys
import os
from datetime import datetime
from pathlib import Path

# Allow imports from backend root
sys.path.insert(0, str(Path(__file__).parent.parent))

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from core.config import settings
import chromadb

# ── ChromaDB (own client — servers run as separate processes) ─────────────────
_client = chromadb.PersistentClient(path=settings.CHROMA_PERSIST_PATH)
_gaps = _client.get_or_create_collection("knowledge_gaps", metadata={"hnsw:space": "cosine"})
_docs = _client.get_or_create_collection("documents",       metadata={"hnsw:space": "cosine"})
_hist = _client.get_or_create_collection("quiz_history",    metadata={"hnsw:space": "cosine"})

# ── MCP Server ────────────────────────────────────────────────────────────────
server = Server("tutorcrew-chromadb")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="upsert_gap",
            description=(
                "Insert or EMA-update a knowledge gap score for a topic. "
                "EMA formula: new = old×0.6 + current×0.4. "
                "Creates the record if it does not exist yet."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "subtopic":      {"type": "string"},
                    "parent_topic":  {"type": "string"},
                    "new_score":     {"type": "number", "minimum": 0, "maximum": 100},
                    "session_id":    {"type": "string"},
                },
                "required": ["subtopic", "parent_topic", "new_score", "session_id"],
            },
        ),
        Tool(
            name="get_gap",
            description="Read the current EMA score and metadata for one topic.",
            inputSchema={
                "type": "object",
                "properties": {"topic": {"type": "string"}},
                "required": ["topic"],
            },
        ),
        Tool(
            name="get_all_gaps",
            description="Return all topic scores from the knowledge_gaps collection.",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="semantic_search",
            description=(
                "Cosine similarity search in the knowledge_gaps collection. "
                "Used to find weak topics semantically related to a given query."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "query":    {"type": "string"},
                    "n_results": {"type": "integer", "default": 6},
                },
                "required": ["query"],
            },
        ),
        Tool(
            name="store_history",
            description="Persist a completed quiz session to the quiz_history collection.",
            inputSchema={
                "type": "object",
                "properties": {
                    "session_id": {"type": "string"},
                    "topic":      {"type": "string"},
                    "score":      {"type": "number"},
                    "correct":    {"type": "integer"},
                    "total":      {"type": "integer"},
                },
                "required": ["session_id", "topic", "score", "correct", "total"],
            },
        ),
        Tool(
            name="get_history",
            description="Retrieve all quiz history records from the quiz_history collection.",
            inputSchema={"type": "object", "properties": {}},
        ),
        Tool(
            name="query_doc_chunks",
            description=(
                "Semantic search in the documents collection. "
                "Returns the most relevant text chunks for a given topic and document."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "topic":     {"type": "string"},
                    "doc_id":    {"type": "string", "default": ""},
                    "n_results": {"type": "integer", "default": 5},
                },
                "required": ["topic"],
            },
        ),
    ]


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    try:
        result = await _dispatch(name, arguments)
    except Exception as exc:
        result = {"error": str(exc)}
    return [TextContent(type="text", text=json.dumps(result))]


async def _dispatch(name: str, args: dict) -> dict:
    # ── upsert_gap ─────────────────────────────────────────────────────────────
    if name == "upsert_gap":
        subtopic     = args["subtopic"]
        parent_topic = args["parent_topic"]
        new_score    = float(args["new_score"])
        session_id   = args["session_id"]

        existing = _gaps.get(ids=[subtopic])
        if existing["ids"]:
            old_meta  = existing["metadatas"][0]
            old_score = float(old_meta.get("score", new_score))
            ema_score = round(old_score * 0.6 + new_score * 0.4, 1)
            attempts  = int(old_meta.get("attempts", 0)) + 1
            _gaps.update(
                ids=[subtopic],
                documents=[f"Topic: {subtopic}. Score: {ema_score}%. Attempts: {attempts}."],
                metadatas=[{
                    "topic": subtopic, "parent_topic": parent_topic,
                    "score": ema_score, "attempts": attempts,
                    "status": _status(ema_score),
                    "last_seen": datetime.now().isoformat(),
                    "last_session": session_id,
                }],
            )
            return {"action": "updated", "topic": subtopic, "old_score": old_score,
                    "ema_score": ema_score, "attempts": attempts}
        else:
            _gaps.add(
                ids=[subtopic],
                documents=[f"Topic: {subtopic}. Score: {new_score}%. Attempts: 1."],
                metadatas=[{
                    "topic": subtopic, "parent_topic": parent_topic,
                    "score": new_score, "attempts": 1,
                    "status": _status(new_score),
                    "last_seen": datetime.now().isoformat(),
                    "last_session": session_id,
                }],
            )
            return {"action": "created", "topic": subtopic, "score": new_score}

    # ── get_gap ────────────────────────────────────────────────────────────────
    elif name == "get_gap":
        result = _gaps.get(ids=[args["topic"]])
        if result["ids"]:
            return {"found": True, "metadata": result["metadatas"][0]}
        return {"found": False}

    # ── get_all_gaps ───────────────────────────────────────────────────────────
    elif name == "get_all_gaps":
        if _gaps.count() == 0:
            return {"gaps": {}}
        items = _gaps.get(include=["metadatas"])
        gaps = {
            m["topic"]: {
                "score": float(m.get("score", 0)),
                "attempts": int(m.get("attempts", 0)),
                "status": m.get("status", "unknown"),
                "last_seen": m.get("last_seen", ""),
                "parent_topic": m.get("parent_topic", ""),
            }
            for m in items["metadatas"]
        }
        return {"gaps": gaps}

    # ── semantic_search ────────────────────────────────────────────────────────
    elif name == "semantic_search":
        if _gaps.count() == 0:
            return {"results": []}
        n = min(int(args.get("n_results", 6)), _gaps.count())
        results = _gaps.query(query_texts=[args["query"]], n_results=n)
        hits = []
        if results["metadatas"] and results["metadatas"][0]:
            for meta, dist in zip(results["metadatas"][0], results["distances"][0]):
                hits.append({**meta, "distance": round(dist, 4)})
        return {"results": hits}

    # ── store_history ──────────────────────────────────────────────────────────
    elif name == "store_history":
        _hist.add(
            ids=[args["session_id"]],
            documents=[f"Quiz on {args['topic']}. Score: {args['score']}%."],
            metadatas=[{
                "session_id": args["session_id"],
                "topic":      args["topic"],
                "score":      float(args["score"]),
                "correct":    int(args["correct"]),
                "total":      int(args["total"]),
                "date":       datetime.now().strftime("%Y-%m-%d"),
                "timestamp":  datetime.now().isoformat(),
            }],
        )
        return {"stored": True, "session_id": args["session_id"]}

    # ── get_history ────────────────────────────────────────────────────────────
    elif name == "get_history":
        if _hist.count() == 0:
            return {"history": []}
        items = _hist.get(include=["metadatas"])
        history = [
            {
                "session_id": m["session_id"], "topic": m["topic"],
                "score": float(m["score"]), "correct": int(m["correct"]),
                "total": int(m["total"]), "date": m["date"],
            }
            for m in items["metadatas"]
        ]
        history.sort(key=lambda x: x["date"])
        return {"history": history}

    # ── query_doc_chunks ───────────────────────────────────────────────────────
    elif name == "query_doc_chunks":
        if _docs.count() == 0:
            return {"chunks": []}
        n = min(int(args.get("n_results", 5)), _docs.count())
        where = {"doc_id": args["doc_id"]} if args.get("doc_id") else None
        kwargs = {"query_texts": [args["topic"]], "n_results": n}
        if where:
            kwargs["where"] = where
        results = _docs.query(**kwargs)
        chunks = results["documents"][0] if results["documents"] else []
        return {"chunks": chunks, "count": len(chunks)}

    return {"error": f"Unknown tool: {name}"}


def _status(score: float) -> str:
    if score < 55:  return "weak"
    if score < 75:  return "average"
    return "strong"


async def main():
    print("[ChromaDB MCP Server] Starting on stdio...", file=sys.stderr)
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
