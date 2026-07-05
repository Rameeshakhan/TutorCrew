"""
routers/integrations.py
External integration endpoints — all go through MCP servers.

/api/explain           -> ChromaDB MCP (doc context) + Claude
/api/schedule-calendar -> Calendar MCP Server
/api/whatsapp-reminder -> WhatsApp MCP Server
"""

from fastapi import APIRouter, Depends

from core.security import get_current_user
from models.schemas import CalendarRequest, WhatsAppRequest, ExplainRequest
from services.llm import call_claude
from services.mcp_client import call_chromadb, call_calendar, call_whatsapp

router = APIRouter(prefix="/api", tags=["integrations"])


@router.post("/explain")
def explain(req: ExplainRequest, user: str = Depends(get_current_user)):
    """
    AI topic explainer.
    1. ChromaDB MCP: query_doc_chunks — retrieve relevant context
    2. Claude: generate explanation grounded in that context
    """
    # ── MCP call: fetch relevant doc chunks ───────────────────────────────────
    chunks_result = call_chromadb("query_doc_chunks", topic=req.topic, n_results=3)
    chunks = chunks_result.get("chunks", [])
    context = "\n".join(chunks)

    system = "You are an expert tutor. Explain clearly with examples, analogies, and key points."
    context_block = f" Use this context where relevant:\n{context[:1500]}" if context else ""
    user_msg = (
        f"Explain '{req.topic}' for a student.{context_block}\n\n"
        "Include: key concepts, a real-world analogy, common mistakes, and 2 example exam questions."
    )

    explanation = call_claude(system, user_msg, max_tokens=1500)
    return {"topic": req.topic, "explanation": explanation, "used_docs": bool(context)}


@router.post("/schedule-calendar")
def schedule_calendar(req: CalendarRequest, user: str = Depends(get_current_user)):
    """
    Generate a spaced-repetition schedule via the Calendar MCP Server.
    Creates real Google Calendar events if credentials are configured.
    """
    result = call_calendar(
        "generate_study_plan",
        weak_areas=req.weak_areas,
        start_date=req.start_date,
        topic=req.topic,
    )

    # Also expose a single deep-link for quick access
    areas_param = "+".join(req.weak_areas[:2])
    cal_url = (
        "https://calendar.google.com/calendar/render?action=TEMPLATE"
        f"&text=TutorCrew+Review&details=Spaced+repetition+for+{areas_param}"
    )

    return {
        "scheduled":     result.get("total_events", 0),
        "events":        result.get("events", [])[:8],
        "calendar_link": cal_url,
        "message":       result.get("message", ""),
        "mcp_server":    "calendar_server.py",
    }


@router.post("/whatsapp-reminder")
def whatsapp_reminder(req: WhatsAppRequest, user: str = Depends(get_current_user)):
    """
    Send a WhatsApp reminder via the WhatsApp MCP Server (Twilio).
    """
    result = call_whatsapp(
        "send_reminder",
        phone=req.phone,
        topic=req.topic,
        schedule_time=req.schedule_time,
    )
    result["mcp_server"] = "whatsapp_server.py"
    return result
