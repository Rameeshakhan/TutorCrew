"""
main.py — TutorCrew FastAPI entry point

What lives here: app creation, middleware, router registration.
Everything else is in:

  core/            config, security (JWT)
  db/              ChromaDB client + collections
  models/          Pydantic schemas
  agents/          One file per CrewAI agent
  services/        LLM wrapper, document ingestion, session store, MCP client
  routers/         One file per domain
  mcp_servers/     One MCP server per external service
    chromadb_server.py   — vector store tools (gaps, docs, history)
    calendar_server.py   — Google Calendar tools
    whatsapp_server.py   — Twilio WhatsApp tools
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
import db.chroma  # noqa: F401  — connects ChromaDB on startup

from routers import auth, documents, quiz, dashboard, integrations

app = FastAPI(
    title="TutorCrew API",
    version="2.0.0",
    description="CrewAI multi-agent exam tutor · ChromaDB · MCP architecture",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(quiz.router)
app.include_router(dashboard.router)
app.include_router(integrations.router)


@app.get("/api/health", tags=["system"])
def health():
    from db.chroma import gap_collection, doc_collection, history_collection
    return {
        "status": "ok",
        "chroma": {
            "gaps":      gap_collection.count(),
            "documents": doc_collection.count(),
            "history":   history_collection.count(),
        },
        "agents": [
            "QuestionGenerator",
            "Evaluator",
            "GapDetector",
            "Scheduler",
            "Reporter",
        ],
        "mcp_servers": [
            "chromadb_server.py  → tools: upsert_gap, get_gap, get_all_gaps, semantic_search, store_history, get_history, query_doc_chunks",
            "calendar_server.py  → tools: create_event, list_upcoming, generate_study_plan",
            "whatsapp_server.py  → tools: send_reminder, schedule_reminders",
        ],
    }
