"""
agents/question_generator.py
Agent 1 — Question Generator

Retrieves relevant document chunks via ChromaDB MCP Server,
then calls Claude to generate MCQ questions.

MCP flow:
    question_generator  ──►  mcp_client  ──►  chromadb_server.py
                                                └─► doc_collection.query()
"""

import json
from typing import Optional

from services.llm import call_claude, strip_json
from services.mcp_client import call_chromadb


def run(
    topic: str,
    difficulty: str,
    num_questions: int,
    doc_id: Optional[str] = None,
) -> list[dict]:
    """
    Generate MCQ questions for a topic.
    If doc_id provided, queries ChromaDB via MCP for relevant context first.
    """
    context = ""
    if doc_id:
        # ── MCP call: semantic search in doc_collection ───────────────────────
        result = call_chromadb("query_doc_chunks", topic=topic, doc_id=doc_id, n_results=5)
        chunks = result.get("chunks", [])
        if chunks:
            context = "\n\n".join(chunks)
            print(f"[QuestionGenerator->MCP] Retrieved {len(chunks)} chunks for '{topic}'")

    system = (
        "You are the Question Generator Agent in TutorCrew's CrewAI pipeline. "
        "Generate precise multiple-choice questions that test genuine understanding. "
        "Always respond with valid JSON only — no markdown, no preamble."
    )

    context_block = (
        f"Use this reference material:\n{context[:3000]}"
        if context
        else "Use your general knowledge."
    )

    user = f"""Generate {num_questions} MCQ questions on: "{topic}"
Difficulty: {difficulty}
{context_block}

Return ONLY this JSON object (a "questions" key containing the array):
{{
  "questions": [
    {{
      "id": 1,
      "question": "Clear, specific question text",
      "options": {{"A": "...", "B": "...", "C": "...", "D": "..."}},
      "correct": "A",
      "explanation": "Why this is correct and others are wrong",
      "subtopic": "Specific sub-area of {topic}"
    }}
  ]
}}"""

    raw = call_claude(system, user, max_tokens=3500, json_mode=True)
    parsed = json.loads(strip_json(raw))
    # Accept either {"questions": [...]} or a bare [...] (Anthropic sometimes
    # follows the array-only instinct even when asked for an object).
    questions = parsed["questions"] if isinstance(parsed, dict) else parsed
    print(f"[QuestionGenerator] Generated {len(questions)} questions on '{topic}'")
    return questions
