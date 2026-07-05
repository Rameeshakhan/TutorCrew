"""
services/session_store.py
In-memory store for active (in-progress) quiz sessions.
Sessions live only during the server process — completed sessions
are persisted to ChromaDB history_collection by the quiz service.
"""

from typing import Optional

# {session_id: {topic, questions, created_at, status, user, ...}}
_store: dict = {}


def create(session_id: str, topic: str, questions: list, user: str) -> None:
    _store[session_id] = {
        "topic": topic,
        "questions": questions,
        "user": user,
        "status": "active",
    }


def get(session_id: str) -> Optional[dict]:
    return _store.get(session_id)


def update(session_id: str, **kwargs) -> None:
    if session_id in _store:
        _store[session_id].update(kwargs)


def all_sessions() -> dict:
    return _store
