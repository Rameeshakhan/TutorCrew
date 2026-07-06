# 🎓 TutorCrew — AI Exam Tutor & Weak Area Detector

> Multi-agent CrewAI system · ChromaDB vector memory · MCP architecture · Next.js · JWT auth

---

## 🎬 Demo Video

📽️ **[Watch the full demo](https://drive.google.com/drive/folders/1piTcNKNejtwV-u-4Ymwn5bjODo2v9RxX?usp=sharing)** — See TutorCrew in action: document upload, AI quiz generation, gap detection, and study scheduling.

---

## 🚀 Setup in 3 steps

### Step 1 — Configure environment

```bash
cp .env.example .env
```

Open `.env` and set at minimum:
```
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Everything else has working defaults for local development.

---

### Step 2 — Start the backend

```bash
cd backend
pip install -r requirements.txt
cp ../.env .env          # backend reads its own .env
uvicorn main:app --reload --port 8000
```

You'll see:
```
✅ ChromaDB ready  →  ./chroma_data
   gaps: 0 | docs: 0 | history: 0
INFO:     Uvicorn running on http://0.0.0.0:8000
```

---

### Step 3 — Start the frontend

```bash
# New terminal, from project root
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** → log in with `ahmed / tutorcrew123`

---

### Docker (one command)

```bash
cp .env.example .env          # add your ANTHROPIC_API_KEY
docker-compose up --build
# Frontend → http://localhost:3000
# API      → http://localhost:8000
# Docs     → http://localhost:8000/docs
```

---

## 🏗️ Project Structure

```
tutorcrew/
├── .env.example
├── docker-compose.yml
├── README.md
│
├── backend/
│   ├── main.py                        ← App entry point (routers only)
│   ├── requirements.txt
│   ├── Dockerfile
│   │
│   ├── core/
│   │   ├── config.py                  ← All env vars (Settings class)
│   │   └── security.py               ← JWT make/verify + FastAPI dependency
│   │
│   ├── db/
│   │   └── chroma.py                  ← ChromaDB client + 3 collections
│   │
│   ├── models/
│   │   └── schemas.py                 ← All Pydantic request/response models
│   │
│   ├── agents/                        ← One file per CrewAI agent
│   │   ├── question_generator.py      ← Agent 1: calls ChromaDB MCP for doc context
│   │   ├── evaluator.py              ← Agent 2: pure scoring, no external calls
│   │   ├── gap_detector.py           ← Agent 3: all ChromaDB via MCP
│   │   ├── scheduler.py              ← Agent 4: all Calendar via MCP
│   │   └── reporter.py               ← Agent 5: generates performance report
│   │
│   ├── services/
│   │   ├── llm.py                    ← Claude API wrapper (swap model here)
│   │   ├── document_service.py       ← pypdf extraction + ChromaDB ingestion
│   │   ├── session_store.py          ← In-memory active quiz sessions
│   │   └── mcp_client.py             ← MCP client (talks to all 3 MCP servers)
│   │
│   ├── mcp_servers/                   ← One MCP server per external service
│   │   ├── chromadb_server.py        ← Tools: upsert_gap, semantic_search, store_history, query_doc_chunks...
│   │   ├── calendar_server.py        ← Tools: create_event, list_upcoming, generate_study_plan
│   │   └── whatsapp_server.py        ← Tools: send_reminder, schedule_reminders
│   │
│   └── routers/                       ← One file per domain
│       ├── auth.py                    ← POST /api/auth/login, GET /api/auth/me
│       ├── documents.py              ← POST /api/upload, GET /api/documents
│       ├── quiz.py                   ← POST /api/generate-quiz, /api/submit-answers
│       ├── dashboard.py              ← GET /api/dashboard, /api/gaps
│       └── integrations.py           ← POST /api/explain, /api/schedule-calendar, /api/whatsapp-reminder
│
└── frontend/
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx                  ← Redirects to /login or /dashboard
    │   ├── login/page.tsx            ← JWT login screen
    │   ├── dashboard/page.tsx        ← Stats + AreaChart, RadarChart, BarChart (Recharts)
    │   ├── upload/page.tsx           ← PyMuPDF → ChromaDB ingestion UI
    │   ├── quiz/page.tsx             ← Full 3-step quiz flow with agent pipeline display
    │   ├── explain/page.tsx          ← AI explainer (ChromaDB-grounded)
    │   ├── gaps/page.tsx             ← Heatmap + Radar + semantic clusters
    │   ├── schedule/page.tsx         ← Ebbinghaus curve chart + Calendar MCP
    │   ├── integrations/page.tsx     ← Google Calendar + Twilio WhatsApp (via MCP)
    │   └── agents/page.tsx           ← Pipeline visualiser + ChromaDB collections
    ├── components/
    │   ├── Sidebar.tsx
    │   └── AppShell.tsx              ← Auth guard (redirects to /login if no token)
    ├── lib/
    │   └── api.ts                    ← All API calls (Bearer token injected)
    └── Dockerfile
```

---

## 🤖 MCP Architecture

```
Agent                  MCP Client           MCP Server             External
─────────────────────────────────────────────────────────────────────────────
QuestionGenerator  ──► call_chromadb()  ──► chromadb_server.py ──► ChromaDB
GapDetector        ──► call_chromadb()  ──► chromadb_server.py ──► ChromaDB
Scheduler          ──► call_calendar()  ──► calendar_server.py ──► Google Calendar API
quiz router        ──► call_chromadb()  ──► chromadb_server.py ──► ChromaDB
integrations       ──► call_whatsapp()  ──► whatsapp_server.py ──► Twilio
integrations       ──► call_chromadb()  ──► chromadb_server.py ──► ChromaDB
dashboard          ──► call_chromadb()  ──► chromadb_server.py ──► ChromaDB
```

Every MCP call is logged: `[MCPClient] → server:tool` and `[MCPClient] ← server:tool ok`

---

## 🗄️ ChromaDB Collections

| Collection | Written by | Read by |
|---|---|---|
| `knowledge_gaps` | Gap Detector (EMA upsert) | Dashboard, Gaps page, semantic clusters |
| `documents` | Upload endpoint (pypdf chunks) | Question Generator (cosine similarity) |
| `quiz_history` | quiz router (after submit) | Dashboard score history |

EMA formula: `new_score = old_score × 0.6 + current_score × 0.4`

---

## 🔑 Optional Integrations

### Google Calendar
1. Google Cloud Console → Enable Calendar API
2. Create OAuth 2.0 Desktop credentials → download `credentials.json`
3. Set `GOOGLE_CREDENTIALS_PATH=./google_credentials.json` in `.env`
4. First run opens browser for consent

### Twilio WhatsApp
1. [twilio.com](https://twilio.com) → Activate WhatsApp Sandbox
2. Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` in `.env`

### LangSmith
```env
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=ls__your_key
```

---

## 📋 Tech Stack

| Layer | Technology |
|---|---|
| Agents | CrewAI 1.x |
| LLM | Claude Sonnet 4.6 (Anthropic API) |
| MCP | `mcp` Python SDK — 3 servers, 1 client |
| Vector DB | ChromaDB (persistent, 3 collections) |
| Backend | FastAPI + Uvicorn |
| PDF | pypdf |
| Frontend | Next.js 16 (App Router) |
| Charts | Recharts (AreaChart, BarChart, RadarChart, LineChart) |
| Auth | JWT (HS256), single user from `.env` |
| Calendar | Google Calendar API (via MCP server) |
| Messaging | Twilio WhatsApp (via MCP server) |
| Tracing | LangSmith |
| Deploy | Docker Compose |