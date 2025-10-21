"""
Lesson planning and worksheet generation tools
"""
from typing import Dict, Any, Optional
from strands import tool
from ..services import bedrock_service
from ..utils.dynamodb_client import get_student_by_id, get_grade_history, search_questions
import uuid


@tool
async def generate_worksheet(
    topic: str,
    difficulty: str = "Medium",
    count: int = 8,
    student_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a custom worksheet with AI-selected questions.

    Use this tool to:
    - Generate practice worksheets for specific topics
    - Create worksheets tailored to student's level
    - Select appropriate difficulty and number of questions

    Args:
        topic: Topic for the worksheet (e.g., "Quadratic Equations")
        difficulty: Difficulty level - "Easy", "Medium", or "Hard" (default: "Medium")
        count: Number of questions to include (default: 8)
        student_id: Optional - personalize based on student's weak areas

    Returns:
        Worksheet with selected questions and worksheet ID
    """
    try:
        # Get questions from the bank
        questions = await search_questions(topic=topic, difficulty=difficulty, limit=count * 3)

        if len(questions) < count:
            return {
                "success": False,
                "error": f"Not enough questions found. Only {len(questions)} available, need {count}",
                "worksheet_id": None
            }

        # If student_id provided, consider their weak areas
        student_context = None
        if student_id:
            student = await get_student_by_id(student_id)
            if student:
                student_context = {
                    "accuracy": student.get('accuracy', {}),
                    "weak_topics": [t for t, acc in student.get('accuracy', {}).items() if acc < 0.7]
                }

        # Use AI to select the best questions
        criteria = {
            "count": count,
            "topic": topic,
            "difficulty": difficulty,
            "student_context": student_context
        }

        selected_indices = await bedrock_service.select_questions_with_ai(questions, criteria)
        selected_questions = [questions[i] for i in selected_indices if i < len(questions)]

        worksheet_id = f"worksheet_{uuid.uuid4().hex[:8]}"

        return {
            "success": True,
            "worksheet_id": worksheet_id,
            "questions": selected_questions,
            "count": len(selected_questions),
            "topic": topic,
            "difficulty": difficulty,
            "personalized": student_id is not None
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "worksheet_id": None
        }


@tool
async def generate_lesson_plan(
    topic: str,
    duration: int,
    student_id: str,
    worksheet_id: Optional[str] = None,
    use_student_data: bool = True
) -> Dict[str, Any]:
    """
    Generate an AI-powered lesson plan for a tutoring session.

    Use this tool to:
    - Create structured lesson plans based on student performance
    - Generate teaching notes and objectives
    - Plan session structure (warm-up, practice, challenge, homework)

    Args:
        topic: Main topic for the lesson
        duration: Session duration in minutes
        student_id: Student's ID (required for personalization)
        worksheet_id: Optional - ID of worksheet to use in the lesson
        use_student_data: Whether to analyze student's past performance (default: True)

    Returns:
        Complete lesson plan with objectives, structure, teaching notes, and AI reasoning
    """
    try:
        # Get student data
        student = await get_student_by_id(student_id)
        if not student:
            return {
                "success": False,
                "error": "Student not found",
                "lesson_plan_id": None
            }

        student_context = {}
        if use_student_data:
            # Get recent grade history
            history = await get_grade_history(student_id, limit=5)

            student_context = {
                "name": student.get('name'),
                "grade": student.get('grade'),
                "accuracy": student.get('accuracy', {}),
                "recent_performance": history[:3] if history else [],
                "weak_areas": [
                    topic for topic, acc in student.get('accuracy', {}).items()
                    if acc < 0.7
                ]
            }

        # Generate lesson plan using Bedrock
        teaching_notes = await bedrock_service.generate_lesson_plan(
            topic=topic,
            duration=duration,
            student_id=student_id
        )

        lesson_plan_id = f"lesson_{uuid.uuid4().hex[:8]}"

        # Structure the lesson plan
        lesson_plan = {
            "lesson_plan_id": lesson_plan_id,
            "student_id": student_id,
            "topic": topic,
            "duration": duration,
            "worksheet_id": worksheet_id,
            "teaching_notes": teaching_notes,
            "student_context": student_context,
            "objectives": [
                f"Review and strengthen understanding of {topic}",
                "Address identified weak areas" if student_context.get('weak_areas') else "Build solid foundation",
                "Practice problem-solving strategies"
            ],
            "structure": {
                "warmup": f"{int(duration * 0.15)} minutes - Review fundamentals",
                "main_practice": f"{int(duration * 0.5)} minutes - Guided problem solving",
                "challenge": f"{int(duration * 0.2)} minutes - Advanced problems",
                "homework": f"{int(duration * 0.15)} minutes - Assign practice"
            }
        }

        return {
            "success": True,
            "lesson_plan_id": lesson_plan_id,
            "lesson_plan": lesson_plan,
            "personalized": use_student_data,
            "message": f"Generated {duration}-minute lesson plan for {student.get('name')} on {topic}"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "lesson_plan_id": None
        }
