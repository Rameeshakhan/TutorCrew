"""
core/security.py
JWT token generation and verification.
Single-user auth — credentials come from .env via settings.
"""

import json
import time
import hmac
import hashlib
import base64

from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from core.config import settings

_security = HTTPBearer()


def make_token(username: str) -> str:
    """Create a signed JWT-like token for the given username."""
    payload = json.dumps({
        "sub": username,
        "exp": time.time() + settings.JWT_EXPIRE_HOURS * 3600
    })
    sig = hmac.new(
        settings.JWT_SECRET.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return base64.b64encode(f"{payload}|{sig}".encode()).decode()


def verify_token(token: str) -> str:
    """Verify token signature and expiry. Returns username or raises 401."""
    try:
        decoded = base64.b64decode(token.encode()).decode()
        payload_str, sig = decoded.rsplit("|", 1)
        expected = hmac.new(
            settings.JWT_SECRET.encode(),
            payload_str.encode(),
            hashlib.sha256
        ).hexdigest()
        if not hmac.compare_digest(sig, expected):
            raise ValueError("bad sig")
        payload = json.loads(payload_str)
        if payload["exp"] < time.time():
            raise ValueError("expired")
        return payload["sub"]
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_security),
) -> str:
    """FastAPI dependency — inject into any protected route."""
    return verify_token(creds.credentials)
