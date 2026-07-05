"""
agents/evaluator.py
Agent 2 — Evaluator

Responsibilities
----------------
- Compare submitted answers against correct answers
- Compute overall score and per-subtopic accuracy breakdown
- Build per-question result objects (is_correct, explanation, etc.)

ChromaDB interaction: NONE — pure computation
"""


def run(questions: list[dict], answers: dict) -> dict:
    """
    Score a completed quiz session.

    Parameters
    ----------
    questions : List of question dicts from the Question Generator.
    answers   : {str(question_index): "A"/"B"/"C"/"D"}

    Returns
    -------
    dict with keys: score, correct, total, results, subtopic_scores
    """
    correct_count = 0
    results = []
    subtopic_scores: dict[str, dict] = {}

    for i, q in enumerate(questions):
        user_ans = answers.get(str(i), "").upper()
        is_correct = user_ans == q["correct"].upper()
        if is_correct:
            correct_count += 1

        sub = q.get("subtopic", "General")
        subtopic_scores.setdefault(sub, {"correct": 0, "total": 0})
        subtopic_scores[sub]["total"] += 1
        if is_correct:
            subtopic_scores[sub]["correct"] += 1

        results.append({
            "question": q["question"],
            "your_answer": user_ans,
            "correct_answer": q["correct"],
            "correct_option_text": q["options"].get(q["correct"], ""),
            "is_correct": is_correct,
            "explanation": q["explanation"],
            "subtopic": sub,
            "options": q["options"],
        })

    score_pct = round(correct_count / len(questions) * 100) if questions else 0
    print(f"[Evaluator] Score: {score_pct}% ({correct_count}/{len(questions)})")

    return {
        "score": score_pct,
        "correct": correct_count,
        "total": len(questions),
        "results": results,
        "subtopic_scores": subtopic_scores,
    }
