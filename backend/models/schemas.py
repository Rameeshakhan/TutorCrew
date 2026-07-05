"""
models/schemas.py
All Pydantic request and response models.
Add new schemas here — never inline them in routers.
"""

from typing import Optional
from pydantic import BaseModel, Field


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: dict


# ── Quiz ──────────────────────────────────────────────────────────────────────

class TopicRequest(BaseModel):
    topic: str
    difficulty: str = Field(default="mixed", pattern="^(easy|mixed|hard)$")
    num_questions: int = Field(default=5, ge=1, le=20)
    doc_id: Optional[str] = None


class AnswerSubmit(BaseModel):
    session_id: str
    answers: dict   # {"0": "A", "1": "C", ...}


# ── Integrations ──────────────────────────────────────────────────────────────

class CalendarRequest(BaseModel):
    topic: str
    weak_areas: list[str]
    start_date: str   # YYYY-MM-DD


class WhatsAppRequest(BaseModel):
    phone: str
    topic: str
    schedule_time: str


# ── Explain ───────────────────────────────────────────────────────────────────

class ExplainRequest(BaseModel):
    topic: str
