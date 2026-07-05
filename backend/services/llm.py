"""
services/llm.py
LLM provider router — Anthropic or OpenAI, switchable via .env.

All 5 agents call `call_claude()` (kept as the function name for
backward compatibility — it routes to whichever provider is set
in LLM_PROVIDER). Agents never know or care which provider is active.

Switch providers in .env:
    LLM_PROVIDER=anthropic   (default, uses ANTHROPIC_API_KEY + CLAUDE_MODEL)
    LLM_PROVIDER=openai      (uses OPENAI_API_KEY + OPENAI_MODEL)

Adding a third provider later: add one `_call_<provider>()` function
below and one branch in `call_claude()`. Nothing else in the codebase
needs to change.
"""

import json
import urllib.request

from fastapi import HTTPException
from core.config import settings


def call_claude(system: str, user: str, max_tokens: int = 2000, json_mode: bool = False) -> str:
    """
    Provider-agnostic entry point used by every agent.
    Routes to Anthropic or OpenAI based on settings.LLM_PROVIDER.

    json_mode : when True and provider is OpenAI, uses native JSON mode
                (response_format={"type": "json_object"}) for reliable
                structured output. Anthropic is prompted for JSON via the
                system/user prompt as usual (no native JSON mode needed).
    """
    provider = settings.LLM_PROVIDER

    if provider == "openai":
        return _call_openai(system, user, max_tokens, json_mode)
    elif provider == "anthropic":
        return _call_anthropic(system, user, max_tokens)
    else:
        raise HTTPException(
            500,
            f"Unknown LLM_PROVIDER '{provider}' in .env — use 'anthropic' or 'openai'",
        )


# ── Anthropic ──────────────────────────────────────────────────────────────────

def _call_anthropic(system: str, user: str, max_tokens: int) -> str:
    if not settings.ANTHROPIC_API_KEY:
        raise HTTPException(500, "ANTHROPIC_API_KEY is not set in .env")

    payload = json.dumps({
        "model": settings.CLAUDE_MODEL,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }).encode()

    request = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "x-api-key": settings.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
    )

    with urllib.request.urlopen(request, timeout=90) as resp:
        data = json.loads(resp.read())

    return data["content"][0]["text"]


# ── OpenAI ─────────────────────────────────────────────────────────────────────

def _call_openai(system: str, user: str, max_tokens: int, json_mode: bool = False) -> str:
    if not settings.OPENAI_API_KEY:
        raise HTTPException(500, "OPENAI_API_KEY is not set in .env")

    body: dict = {
        "model": settings.OPENAI_MODEL,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    }
    if json_mode:
        # Native JSON mode — guarantees valid JSON output, no markdown fences
        body["response_format"] = {"type": "json_object"}

    payload = json.dumps(body).encode()

    request = urllib.request.Request(
        "https://api.openai.com/v1/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "content-type": "application/json",
        },
    )

    with urllib.request.urlopen(request, timeout=90) as resp:
        data = json.loads(resp.read())

    return data["choices"][0]["message"]["content"]


def strip_json(raw: str) -> str:
    """Strip markdown fences that the model sometimes wraps JSON in."""
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1]
    if raw.endswith("```"):
        raw = raw.rsplit("```", 1)[0]
    return raw.strip()
