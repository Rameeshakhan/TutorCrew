"""
mcp_servers/whatsapp_server.py
MCP Server — Twilio WhatsApp

Exposes WhatsApp messaging as MCP tools. Agents call these
through the MCP client protocol instead of Twilio SDK directly.

Tools exposed
-------------
send_reminder       — Send a single WhatsApp study reminder immediately
schedule_reminders  — Queue a series of WhatsApp messages for weak areas

Setup for real WhatsApp:
  1. Sign up at twilio.com
  2. Activate the WhatsApp Sandbox (or buy a number)
  3. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in .env
  4. The recipient must opt-in to the sandbox first

Run standalone:
    python mcp_servers/whatsapp_server.py
"""

import asyncio
import json
import sys
from pathlib import Path
from datetime import datetime, timedelta

sys.path.insert(0, str(Path(__file__).parent.parent))

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from core.config import settings

server = Server("tutorcrew-whatsapp")


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="send_reminder",
            description=(
                "Send a WhatsApp study reminder to a student via Twilio. "
                "Returns the Twilio message SID and status."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "phone":   {
                        "type": "string",
                        "description": "Recipient phone number with country code, e.g. +923001234567",
                    },
                    "topic":   {"type": "string"},
                    "message": {
                        "type": "string",
                        "description": "Custom message text (optional — default template used if omitted)",
                        "default": "",
                    },
                    "session_number": {
                        "type": "integer",
                        "description": "Which spaced-repetition session this is (1, 2, 3…)",
                        "default": 1,
                    },
                },
                "required": ["phone", "topic"],
            },
        ),
        Tool(
            name="schedule_reminders",
            description=(
                "Queue a series of WhatsApp reminders for multiple weak areas "
                "following the Ebbinghaus spaced-repetition schedule. "
                "Returns a list of scheduled message stubs (real scheduling "
                "requires Twilio Messaging Services or a task queue)."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "phone":       {"type": "string"},
                    "weak_areas":  {
                        "type": "array",
                        "items": {"type": "string"},
                    },
                    "start_date":  {"type": "string", "description": "YYYY-MM-DD"},
                },
                "required": ["phone", "weak_areas", "start_date"],
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
    if name == "send_reminder":
        return await _send_reminder(args)
    elif name == "schedule_reminders":
        return await _schedule_reminders(args)
    return {"error": f"Unknown tool: {name}"}


async def _send_reminder(args: dict) -> dict:
    phone   = args["phone"]
    topic   = args["topic"]
    session = int(args.get("session_number", 1))
    custom  = args.get("message", "")

    body = custom or _build_message(topic, session)

    if settings.TWILIO_ACCOUNT_SID:
        try:
            from twilio.rest import Client
            client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
            msg = client.messages.create(
                body=body,
                from_=settings.TWILIO_WHATSAPP_FROM,
                to=f"whatsapp:{phone}",
            )
            return {
                "sent":    True,
                "sid":     msg.sid,
                "status":  msg.status,
                "to":      phone,
                "topic":   topic,
                "message": body,
            }
        except Exception as exc:
            return {"sent": False, "error": str(exc), "note": "Check Twilio credentials in .env"}
    else:
        # Stub for development
        return {
            "sent":    True,
            "sid":     f"stub_{datetime.now().strftime('%H%M%S')}",
            "status":  "queued (stub)",
            "to":      phone,
            "topic":   topic,
            "message": body,
            "note":    "Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM in .env for real delivery",
        }


async def _schedule_reminders(args: dict) -> dict:
    phone       = args["phone"]
    weak_areas  = args["weak_areas"]
    start_date  = args["start_date"]
    base        = datetime.strptime(start_date, "%Y-%m-%d")
    intervals   = settings.SPACED_INTERVALS[:4]   # [1, 3, 7, 14]

    scheduled = []
    for area in weak_areas[:5]:
        for session_idx, days in enumerate(intervals):
            send_date = base + timedelta(days=days)
            body      = _build_message(area, session_idx + 1)
            scheduled.append({
                "phone":          phone,
                "topic":          area,
                "send_date":      send_date.strftime("%Y-%m-%d"),
                "session":        session_idx + 1,
                "interval_days":  days,
                "message":        body,
            })

    # In production: submit each entry to Twilio Scheduled Messages or a Celery queue.
    # For now we return the full schedule so the caller can persist / display it.
    return {
        "scheduled_count": len(scheduled),
        "reminders":        scheduled,
        "note": (
            "Reminder schedule built. "
            "Wire a Celery/Apscheduler task to call send_reminder() at each send_date."
            if not settings.TWILIO_ACCOUNT_SID
            else "Reminders queued. Implement a scheduler to trigger send_reminder() at each send_date."
        ),
    }


def _build_message(topic: str, session: int) -> str:
    intros = [
        f"📚 Time to review *{topic}*!",
        f"🧠 Your *{topic}* session is due!",
        f"⏰ Don't forget to study *{topic}* today!",
        f"🎯 Spaced repetition time — *{topic}* is waiting!",
    ]
    intro   = intros[(session - 1) % len(intros)]
    ordinal = {1: "1st", 2: "2nd", 3: "3rd"}.get(session, f"{session}th")
    return (
        f"{intro}\n\n"
        f"This is your *{ordinal} review session* as part of your TutorCrew spaced repetition plan. "
        f"Completing this session now will help lock '{topic}' into your long-term memory.\n\n"
        f"Open TutorCrew → Quiz → '{topic}' to start. Good luck! 🚀"
    )


async def main():
    print("[WhatsApp MCP Server] Starting on stdio...", file=sys.stderr)
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
