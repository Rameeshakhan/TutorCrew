"""
agents/scheduler.py
Agent 4 — Scheduler

Calls the Calendar MCP Server to generate a full Ebbinghaus study plan
and create Google Calendar events.

MCP flow:
    scheduler  ──►  mcp_client  ──►  calendar_server.py (MCP Server)
                                      └─► Google Calendar API
"""

from services.mcp_client import call_calendar
from core.config import settings

_PRIORITY = {0: "critical", 1: "high", 2: "medium", 3: "low", 4: "maintenance"}


def run(weak_areas: list[str], topic: str) -> list[dict]:
    """
    Build a spaced-repetition review schedule via Calendar MCP server.
    Returns list of event dicts (with calendar links if credentials set).
    """
    if not weak_areas:
        print("[Scheduler->MCP] No weak areas — skipping calendar scheduling")
        return []

    from datetime import datetime
    start_date = datetime.now().strftime("%Y-%m-%d")

    # ── MCP call: generate_study_plan creates all calendar events ─────────────
    result = call_calendar(
        "generate_study_plan",
        weak_areas=weak_areas,
        start_date=start_date,
        topic=topic,
    )

    events = result.get("events", [])
    print(f"[Scheduler->MCP] Calendar server created {len(events)} events for {len(weak_areas)} weak areas")

    # Normalise to the format the rest of the app expects
    schedule = []
    for e in events:
        schedule.append({
            "topic":        e.get("topic", ""),
            "review_date":  e.get("date", ""),
            "session":      e.get("session", 1),
            "interval_days": e.get("interval", 1),
            "type":         "spaced_repetition",
            "priority":     e.get("priority", "medium"),
            "calendar_link": e.get("html_link", ""),
            "event_id":     e.get("event_id", ""),
        })

    return schedule
