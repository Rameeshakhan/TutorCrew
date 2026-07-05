"""
agents/reporter.py
Agent 5 — Reporter

Responsibilities
----------------
- Synthesise evaluation results, gap analysis, and schedule into a
  concise, encouraging performance report
- The report is shown to the student on the results screen

ChromaDB interaction: NONE (reads from gap_detector output dict)
"""

from services.llm import call_claude


def run(
    topic: str,
    eval_result: dict,
    gap_result: dict,
    schedule: list[dict],
) -> str:
    """
    Generate a student-facing performance report.

    Returns plain text (no markdown) under 200 words.
    """
    system = (
        "You are the Reporter Agent in TutorCrew's CrewAI pipeline. "
        "Write concise, encouraging, specific study feedback in plain text."
    )

    next_review = schedule[0]["review_date"] if schedule else "TBD"

    user = f"""Write a 3-paragraph performance report for:

Topic: "{topic}"
Score: {eval_result['score']}% ({eval_result['correct']}/{eval_result['total']})
Weak areas: {gap_result['weak_areas']}
Strong areas: {gap_result['strong_areas']}
Semantically related weak areas: {gap_result.get('related_weak', [])}
Next scheduled review: {next_review}

Rules:
- Be encouraging but honest
- Mention at least one specific weak area if present
- End with a concrete action for the student
- Max 180 words, plain text, no markdown, no bullet points"""

    report = call_claude(system, user, max_tokens=400)
    print(f"[Reporter] Report generated ({len(report.split())} words)")
    return report
