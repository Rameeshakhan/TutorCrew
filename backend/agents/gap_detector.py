"""
agents/gap_detector.py
Agent 3 — Gap Detector

ChromaDB interaction happens through the MCP client, not direct imports.
Every call goes:
    gap_detector  ──►  mcp_client  ──►  chromadb_server.py (MCP Server)

Tools used
----------
upsert_gap      — EMA-update or create a topic score
semantic_search — Find weak topics related to the current subject
get_all_gaps    — Read full gap map for summary building
"""

from services.mcp_client import call_chromadb


def run(topic: str, eval_result: dict, session_id: str) -> dict:
    subtopic_scores = eval_result["subtopic_scores"]

    # ── MCP call: upsert each subtopic score ──────────────────────────────────
    for subtopic, sc in subtopic_scores.items():
        new_score = round((sc["correct"] / sc["total"]) * 100, 1) if sc["total"] > 0 else 0.0
        result = call_chromadb(
            "upsert_gap",
            subtopic=subtopic,
            parent_topic=topic,
            new_score=new_score,
            session_id=session_id,
        )
        action = result.get("action", "?")
        if action == "updated":
            print(
                f"[GapDetector→MCP] Updated '{subtopic}': "
                f"{result.get('old_score')}% -> {result.get('ema_score')}% "
                f"(attempt #{result.get('attempts')})"
            )
        else:
            print(f"[GapDetector→MCP] Created '{subtopic}': {new_score}%")

    # ── MCP call: semantic search for related weak topics ─────────────────────
    search_result = call_chromadb("semantic_search", query=topic, n_results=8)
    related_weak = [
        hit["topic"]
        for hit in search_result.get("results", [])
        if float(hit.get("score", 100)) < 65 and hit.get("topic") not in subtopic_scores
    ][:3]
    if related_weak:
        print(f"[GapDetector->MCP] Semantic search -> related weak: {related_weak}")

    # ── MCP call: read full gap map ───────────────────────────────────────────
    all_gaps_result = call_chromadb("get_all_gaps")
    all_gaps = all_gaps_result.get("gaps", {})

    weak_areas   = [t for t, d in all_gaps.items() if d["status"] == "weak"]
    strong_areas = [t for t, d in all_gaps.items() if d["status"] == "strong"]
    recommendation = (
        f"Focus on: {', '.join((weak_areas + related_weak)[:3])}"
        if weak_areas or related_weak
        else "Excellent! Keep reviewing to maintain mastery."
    )

    return {
        "weak_areas":     weak_areas,
        "strong_areas":   strong_areas,
        "related_weak":   related_weak,
        "all_gaps":       all_gaps,
        "recommendation": recommendation,
    }


def get_all_gaps() -> dict:
    """Read all gap scores from ChromaDB via MCP (used by dashboard + gaps page)."""
    result = call_chromadb("get_all_gaps")
    return result.get("gaps", {})


def get_clusters(weak_topics: list[str]) -> dict:
    """Semantic clusters via MCP semantic_search (used by gaps page)."""
    clusters: dict = {}
    for wt in weak_topics[:3]:
        result = call_chromadb("semantic_search", query=wt, n_results=4)
        hits = result.get("results", [])
        clusters[wt] = [h["topic"] for h in hits if h.get("topic") != wt]
    return clusters
