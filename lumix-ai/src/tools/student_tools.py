"""
Student-related agent tools
"""
from typing import Dict, Any, Optional
from strands import tool
from ..utils.dynamodb_client import (
    get_student_by_name,
    get_student_by_id,
    get_all_students,
    get_grade_history as db_get_grade_history
)


@tool
async def query_students(
    student_name: Optional[str] = None,
    student_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get student profiles and performance data.

    Use this tool to:
    - Find a specific student by name or ID
    - Get all students if no parameters provided
    - Analyze student performance, accuracy by topic, and schedule

    Args:
        student_name: Student's name (partial match supported)
        student_id: Exact student ID

    Returns:
        Student profile(s) with performance data, accuracy by topic, and schedule
    """
    try:
        if student_id:
            student = await get_student_by_id(student_id)
            if student:
                return {
                    "success": True,
                    "students": [student],
                    "count": 1
                }
            return {"success": False, "error": "Student not found", "students": [], "count": 0}

        elif student_name:
            student = await get_student_by_name(student_name)
            if student:
                return {
                    "success": True,
                    "students": [student],
                    "count": 1
                }
            return {"success": False, "error": "Student not found", "students": [], "count": 0}

        else:
            students = await get_all_students()
            return {
                "success": True,
                "students": students,
                "count": len(students)
            }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "students": [],
            "count": 0
        }


@tool
async def query_grade_history(
    student_id: str,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Get student's grading history and analyze performance patterns.

    Use this tool to:
    - View past graded sessions
    - Identify performance trends over time
    - Find weak areas that need improvement
    - Analyze question types where student struggles

    Args:
        student_id: Student's ID
        limit: Maximum number of records to return (default: 10)

    Returns:
        List of graded sessions with scores, topics, and AI insights
    """
    try:
        history = await db_get_grade_history(student_id, limit)

        # Calculate trends if we have data
        if len(history) >= 2:
            recent_scores = [float(h.get('score', '0').replace('%', '')) for h in history[:5]]
            avg_recent = sum(recent_scores) / len(recent_scores) if recent_scores else 0

            older_scores = [float(h.get('score', '0').replace('%', '')) for h in history[5:]]
            avg_older = sum(older_scores) / len(older_scores) if older_scores else 0

            trend = "improving" if avg_recent > avg_older else "declining" if avg_recent < avg_older else "stable"
        else:
            trend = "insufficient_data"

        return {
            "success": True,
            "history": history,
            "count": len(history),
            "trend": trend
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "history": [],
            "count": 0
        }
