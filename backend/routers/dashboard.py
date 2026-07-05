"""
routers/dashboard.py
Dashboard and knowledge-gap endpoints.
All ChromaDB reads go through the MCP client.
"""

from fastapi import APIRouter, Depends

from core.security import get_current_user
from services.mcp_client import call_chromadb
from agents.gap_detector import get_all_gaps, get_clusters
from db.chroma import doc_collection   # doc count only — no gap/history reads

router = APIRouter(prefix="/api", tags=["dashboard"])


@router.get("/dashboard")
def dashboard(user: str = Depends(get_current_user)):
    # ── MCP call: quiz history from ChromaDB ──────────────────────────────────
    hist_result = call_chromadb("get_history")
    history = hist_result.get("history", [])

    total_quizzes = len(history)
    avg_score = (
        round(sum(h["score"] for h in history) / total_quizzes, 1)
        if total_quizzes else 0
    )

    topic_scores: dict = {}
    for h in history:
        topic_scores.setdefault(h["topic"], []).append(h["score"])
    topic_averages = {t: round(sum(v) / len(v), 1) for t, v in topic_scores.items()}

    # ── Doc count (direct read — doc_collection is not a gap/history store) ───
    doc_count = 0
    if doc_collection.count() > 0:
        metas = doc_collection.get(include=["metadatas"], where={"type": "doc_meta"})
        doc_count = len(metas["metadatas"])

    # ── MCP call: gap stats ───────────────────────────────────────────────────
    gaps_result = call_chromadb("get_all_gaps")
    all_gaps    = gaps_result.get("gaps", {})

    from db.chroma import gap_collection, history_collection
    chroma_stats = {
        "gap_vectors":  gap_collection.count(),
        "doc_chunks":   doc_collection.count(),
        "quiz_history": history_collection.count(),
    }

    return {
        "total_quizzes":      total_quizzes,
        "average_score":      avg_score,
        "documents_uploaded": doc_count,
        "topics_studied":     len(topic_scores),
        "gap_analysis":       all_gaps,
        "score_history":      history,
        "topic_averages":     topic_averages,
        "chroma_stats":       chroma_stats,
    }


@router.get("/gaps")
def get_gaps(user: str = Depends(get_current_user)):
    all_gaps    = get_all_gaps()
    weak_topics = [t for t, d in all_gaps.items() if d["status"] == "weak"]
    clusters    = get_clusters(weak_topics)
    return {"gaps": all_gaps, "clusters": clusters}
