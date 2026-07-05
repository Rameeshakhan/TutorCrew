"""
routers/auth.py
Authentication endpoints — login and /me.
Credentials are read from .env via settings (single-user demo).
"""

from fastapi import APIRouter, HTTPException, Depends

from core.config import settings
from core.security import make_token, get_current_user
from models.schemas import LoginRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login")
def login(req: LoginRequest):
    if (
        req.username.lower() != settings.DEMO_USERNAME.lower()
        or req.password != settings.DEMO_PASSWORD
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = make_token(req.username)
    return {
        "token": token,
        "user": {
            "username": settings.DEMO_USERNAME,
            "name": settings.DEMO_NAME,
            "role": "Student",
        },
    }


@router.get("/me")
def me(user: str = Depends(get_current_user)):
    return {
        "username": user,
        "name": settings.DEMO_NAME,
        "role": "Student",
    }
