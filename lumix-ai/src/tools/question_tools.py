"""
Question bank related agent tools
"""
from typing import Dict, Any, Optional
from strands import tool
from ..utils.dynamodb_client import search_questions


@tool
async def query_questions(
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    limit: int = 50
) -> Dict[str, Any]:
    """
    Search the question bank for math problems.

    Use this tool to:
    - Find questions by topic (e.g., "Quadratic Equations", "Algebra", "Geometry")
    - Filter by difficulty ("Easy", "Medium", "Hard")
    - Browse available questions for worksheet creation

    Args:
        topic: Topic or subject area (partial match supported)
        difficulty: Difficulty level - "Easy", "Medium", or "Hard"
        limit: Maximum number of questions to return (default: 50)

    Returns:
        List of questions with text, topic, difficulty, explanations, and teaching tips
    """
    try:
        questions = await search_questions(topic, difficulty, limit)

        return {
            "success": True,
            "questions": questions,
            "count": len(questions),
            "filters_applied": {
                "topic": topic,
                "difficulty": difficulty
            }
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "questions": [],
            "count": 0
        }
