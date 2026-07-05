"""
mcp_servers/calendar_server.py
MCP Server — Google Calendar

Exposes calendar operations as MCP tools. The Scheduler Agent
calls these through the MCP client instead of using REST directly.

Tools exposed
-------------
create_event        — Create a Google Calendar event
list_upcoming       — List upcoming study events created by TutorCrew
generate_study_plan — Build a full Ebbinghaus spaced-repetition schedule
                      and batch-create all calendar events

Setup for real Google Calendar:
  1. Enable Google Calendar API in Google Cloud Console
  2. Download OAuth credentials → backend/google_credentials.json
  3. Set GOOGLE_CREDENTIALS_PATH and GOOGLE_CALENDAR_ID in .env
  4. First run will open a browser for OAuth consent

Without credentials the server returns stub responses so the
rest of the system still works during development.

Run standalone:
    python mcp_servers/calendar_server.py
"""

import asyncio
import json
import sys
import os
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

from core.config import settings

server = Server("tutorcrew-calendar")

# ── Ebbinghaus intervals ──────────────────────────────────────────────────────
INTERVALS = settings.SPACED_INTERVALS          # [1, 3, 7, 14, 30]
PRIORITY  = {0: "critical", 1: "high", 2: "medium", 3: "low"}


@server.list_tools()
async def list_tools() -> list[Tool]:
    return [
        Tool(
            name="create_event",
            description=(
                "Create a single study session event in Google Calendar. "
                "Returns the event ID and a calendar deep-link."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "title":       {"type": "string"},
                    "topic":       {"type": "string"},
                    "date":        {"type": "string", "description": "YYYY-MM-DD"},
                    "time":        {"type": "string", "description": "HH:MM (24h)", "default": "09:00"},
                    "duration_min":{"type": "integer", "default": 30},
                    "description": {"type": "string", "default": ""},
                },
                "required": ["title", "topic", "date"],
            },
        ),
        Tool(
            name="list_upcoming",
            description="List upcoming TutorCrew study events from Google Calendar.",
            inputSchema={
                "type": "object",
                "properties": {
                    "days_ahead": {"type": "integer", "default": 30},
                    "max_results": {"type": "integer", "default": 20},
                },
            },
        ),
        Tool(
            name="generate_study_plan",
            description=(
                "Generate a complete Ebbinghaus spaced-repetition study plan "
                "and create all events in Google Calendar. "
                "Intervals: 1 → 3 → 7 → 14 → 30 days."
            ),
            inputSchema={
                "type": "object",
                "properties": {
                    "weak_areas":  {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Topics to schedule for review",
                    },
                    "start_date":  {"type": "string", "description": "YYYY-MM-DD"},
                    "topic":       {"type": "string", "description": "Parent quiz topic"},
                },
                "required": ["weak_areas", "start_date"],
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
    service = _get_google_service()

    if name == "create_event":
        return await _create_event(service, args)
    elif name == "list_upcoming":
        return await _list_upcoming(service, args)
    elif name == "generate_study_plan":
        return await _generate_study_plan(service, args)
    return {"error": f"Unknown tool: {name}"}


async def _create_event(service, args: dict) -> dict:
    date     = args["date"]
    time_str = args.get("time", "09:00")
    dur_min  = int(args.get("duration_min", 30))
    title    = args["title"]
    topic    = args["topic"]
    desc     = args.get("description", f"TutorCrew spaced repetition review: {topic}")

    start_dt = datetime.strptime(f"{date} {time_str}", "%Y-%m-%d %H:%M")
    end_dt   = start_dt + timedelta(minutes=dur_min)

    # ── Build Google Calendar event body ──────────────────────────────────────
    event_body = {
        "summary": title,
        "description": desc,
        "start": {"dateTime": start_dt.isoformat(), "timeZone": "UTC"},
        "end":   {"dateTime": end_dt.isoformat(),   "timeZone": "UTC"},
        "colorId": "9",   # blueberry
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup",  "minutes": 30},
                {"method": "email",  "minutes": 60},
            ],
        },
        "extendedProperties": {
            "private": {"source": "TutorCrew", "topic": topic}
        },
    }

    if service:
        # Real Google Calendar API call
        cal_id = os.getenv("GOOGLE_CALENDAR_ID", "primary")
        event  = service.events().insert(calendarId=cal_id, body=event_body).execute()
        return {
            "created": True,
            "event_id":   event.get("id"),
            "html_link":  event.get("htmlLink"),
            "title":      title,
            "date":       date,
            "topic":      topic,
        }
    else:
        # Stub (no credentials configured)
        stub_link = (
            "https://calendar.google.com/calendar/render?action=TEMPLATE"
            f"&text={title.replace(' ', '+')}"
            f"&dates={start_dt.strftime('%Y%m%dT%H%M%SZ')}/{end_dt.strftime('%Y%m%dT%H%M%SZ')}"
            f"&details={desc.replace(' ', '+')}"
        )
        return {
            "created": True,
            "event_id":  f"stub_{date}_{topic[:8]}",
            "html_link": stub_link,
            "title":     title,
            "date":      date,
            "topic":     topic,
            "note":      "Stub — add GOOGLE_CREDENTIALS_PATH to .env for real events",
        }


async def _list_upcoming(service, args: dict) -> dict:
    days_ahead  = int(args.get("days_ahead", 30))
    max_results = int(args.get("max_results", 20))

    if service:
        cal_id = os.getenv("GOOGLE_CALENDAR_ID", "primary")
        now    = datetime.utcnow().isoformat() + "Z"
        until  = (datetime.utcnow() + timedelta(days=days_ahead)).isoformat() + "Z"
        events_result = service.events().list(
            calendarId=cal_id, timeMin=now, timeMax=until,
            maxResults=max_results, singleEvents=True,
            orderBy="startTime",
            privateExtendedProperty="source=TutorCrew",
        ).execute()
        items = events_result.get("items", [])
        return {
            "events": [
                {
                    "id":    e.get("id"),
                    "title": e.get("summary"),
                    "date":  e["start"].get("dateTime", e["start"].get("date")),
                    "link":  e.get("htmlLink"),
                }
                for e in items
            ],
            "count": len(items),
        }
    else:
        return {
            "events": [],
            "note": "Stub — add GOOGLE_CREDENTIALS_PATH to .env for real event listing",
        }


async def _generate_study_plan(service, args: dict) -> dict:
    weak_areas = args["weak_areas"]
    start_date = args["start_date"]
    topic      = args.get("topic", "Study")
    base       = datetime.strptime(start_date, "%Y-%m-%d")

    events_created = []
    for area_idx, area in enumerate(weak_areas[:5]):
        for session_idx, days in enumerate(INTERVALS[:4]):
            review_date = base + timedelta(days=days + area_idx)
            event_args = {
                "title":        f"TutorCrew: Review {area}",
                "topic":        area,
                "date":         review_date.strftime("%Y-%m-%d"),
                "time":         "09:00",
                "duration_min": 30,
                "description":  (
                    f"Spaced repetition session {session_idx + 1} for '{area}' "
                    f"(from quiz on '{topic}'). "
                    f"Ebbinghaus interval: {days} day{'s' if days > 1 else ''}."
                ),
            }
            result = await _create_event(service, event_args)
            result["session"]  = session_idx + 1
            result["interval"] = days
            result["priority"] = PRIORITY.get(session_idx, "low")
            events_created.append(result)

    return {
        "total_events": len(events_created),
        "weak_areas":   weak_areas,
        "events":       events_created,
        "message": (
            f"{len(events_created)} study sessions scheduled using Ebbinghaus intervals "
            f"(1→3→7→14 days) for {len(weak_areas)} weak area(s)."
        ),
    }


def _get_google_service():
    """
    Return an authenticated Google Calendar service, or None if credentials
    are not configured (development / demo mode).
    """
    creds_path = os.getenv("GOOGLE_CREDENTIALS_PATH", "")
    if not creds_path or not Path(creds_path).exists():
        return None
    try:
        from google.oauth2.credentials import Credentials
        from google.auth.transport.requests import Request
        from google_auth_oauthlib.flow import InstalledAppFlow
        from googleapiclient.discovery import build

        SCOPES    = ["https://www.googleapis.com/auth/calendar"]
        token_path = Path(creds_path).parent / "token.json"
        creds     = None

        if token_path.exists():
            creds = Credentials.from_authorized_user_file(str(token_path), SCOPES)
        if not creds or not creds.valid:
            if creds and creds.expired and creds.refresh_token:
                creds.refresh(Request())
            else:
                flow  = InstalledAppFlow.from_client_secrets_file(creds_path, SCOPES)
                creds = flow.run_local_server(port=0)
            token_path.write_text(creds.to_json())

        return build("calendar", "v3", credentials=creds)
    except Exception as exc:
        print(f"[CalendarMCP] Could not initialise Google service: {exc}", file=sys.stderr)
        return None


async def main():
    print("[Calendar MCP Server] Starting on stdio...", file=sys.stderr)
    async with stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream, server.create_initialization_options())


if __name__ == "__main__":
    asyncio.run(main())
