"""
core/config.py
All environment variables and app-level configuration in one place.
Change settings here — nothing else needs to know about os.getenv.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # ── LLM Provider switch ──────────────────────────────────────────────────────
    # Set to "anthropic" or "openai" in .env. Every agent calls services/llm.py,
    # which routes to whichever provider is configured here.
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "anthropic").lower()

    # ── Anthropic ─────────────────────────────────────────────────────────────
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-sonnet-4-6")

    # ── OpenAI ────────────────────────────────────────────────────────────────
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # ── Auth ──────────────────────────────────────────────────────────────────
    DEMO_USERNAME: str = os.getenv("DEMO_USERNAME", "ahmed")
    DEMO_PASSWORD: str = os.getenv("DEMO_PASSWORD", "tutorcrew123")
    DEMO_NAME: str = os.getenv("DEMO_NAME", "Ahmed Khan")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "tutorcrew-secret-change-in-prod")
    JWT_EXPIRE_HOURS: int = int(os.getenv("JWT_EXPIRE_HOURS", "24"))

    # ── ChromaDB ──────────────────────────────────────────────────────────────
    CHROMA_PERSIST_PATH: str = os.getenv("CHROMA_PERSIST_PATH", "./chroma_data")

    # ── File uploads ──────────────────────────────────────────────────────────
    UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", "./tutorcrew_uploads"))
    MAX_UPLOAD_MB: int = int(os.getenv("MAX_UPLOAD_MB", "10"))

    # ── CORS ──────────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000"
    ).split(",")

    # ── Twilio ────────────────────────────────────────────────────────────────
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_WHATSAPP_FROM: str = os.getenv("TWILIO_WHATSAPP_FROM", "whatsapp:+14155238886")

    # ── LangSmith ─────────────────────────────────────────────────────────────
    LANGCHAIN_TRACING_V2: str = os.getenv("LANGCHAIN_TRACING_V2", "false")
    LANGCHAIN_API_KEY: str = os.getenv("LANGCHAIN_API_KEY", "")
    LANGCHAIN_PROJECT: str = os.getenv("LANGCHAIN_PROJECT", "TutorCrew")

    # ── Text chunking ─────────────────────────────────────────────────────────
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50

    # ── Ebbinghaus intervals (days) ───────────────────────────────────────────
    SPACED_INTERVALS: list[int] = [1, 3, 7, 14, 30]


settings = Settings()
