"""
routers/documents.py
Document upload and listing endpoints.
Heavy lifting is in services/document_service.py.
"""

from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Depends

from core.security import get_current_user
from services import document_service

router = APIRouter(prefix="/api", tags=["documents"])

ALLOWED_SUFFIXES = {".pdf", ".txt", ".md"}


@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    user: str = Depends(get_current_user),
):
    suffix = Path(file.filename or "").suffix.lower()
    content = await file.read()
    return document_service.ingest_document(file.filename or "upload", content, suffix)


@router.get("/documents")
def list_documents(user: str = Depends(get_current_user)):
    return document_service.list_documents()
