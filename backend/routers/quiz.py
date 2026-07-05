"""
routers/quiz.py
Quiz generation and answer submission.

Pipeline
--------
generate-quiz  -> QuestionGenerator (reads doc chunks via ChromaDB MCP)
submit-answers -> Evaluator
               -> GapDetector   (reads/writes ChromaDB via MCP)
               -> Scheduler     (creates Calendar events via MCP)
               -> Reporter
               -> store history  (writes to ChromaDB via MCP)
"""

import uuid
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends

from core.security import get_current_user
from models.schemas import TopicRequest, AnswerSubmit
from services import session_store
from services.mcp_client import call_chromadb
import agents.question_generator as question_generator
import agents.evaluator as evaluator
import agents.gap_detector as gap_detector
import agents.scheduler as scheduler
import agents.reporter as reporter

router = APIRouter(prefix="/api", tags=["quiz"])


@router.post("/generate-quiz")
def generate_quiz(req: TopicRequest, user: str = Depends(get_current_user)):
    """Agent 1: Question Generator — queries ChromaDB doc chunks via MCP."""
    questions = question_generator.run(
        topic=req.topic,
        difficulty=req.difficulty,
        num_questions=req.num_questions,
        doc_id=req.doc_id,
    )
    session_id = str(uuid.uuid4())[:12]
    session_store.create(session_id, req.topic, questions, user)
    return {
        "session_id": session_id,
        "topic": req.topic,
        "questions": questions,
        "total": len(questions),
    }


@router.post("/submit-answers")
def submit_answers(req: AnswerSubmit, user: str = Depends(get_current_user)):
    """
    Full CrewAI pipeline:
    Evaluator -> GapDetector (ChromaDB MCP) -> Scheduler (Calendar MCP) -> Reporter
    """
    session = session_store.get(req.session_id)
    if not session:
        raise HTTPException(404, "Session not found")

    topic     = session["topic"]
    questions = session["questions"]

    eval_result = evaluator.run(questions, req.answers)
    gap_result  = gap_detector.run(topic, eval_result, req.session_id)
    schedule    = scheduler.run(gap_result["weak_areas"], topic)
    report      = reporter.run(topic, eval_result, gap_result, schedule)

    # ── MCP call: persist quiz history to ChromaDB ─────────────────────────
    call_chromadb(
        "store_history",
        session_id=req.session_id,
        topic=topic,
        score=eval_result["score"],
        correct=eval_result["correct"],
        total=eval_result["total"],
    )

    session_store.update(
        req.session_id,
        status="completed",
        eval=eval_result,
        gaps=gap_result,
        schedule=schedule,
        report=report,
    )

    return {
        "session_id":    req.session_id,
        "topic":         topic,
        "evaluation":    eval_result,
        "gap_analysis":  gap_result,
        "study_schedule": schedule[:8],
        "report":        report,
    }
