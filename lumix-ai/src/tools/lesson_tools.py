"""
Lesson planning and worksheet generation tools
"""
from typing import Dict, Any, Optional, List
from strands import tool
from ..services import bedrock_service
from ..utils.dynamodb_client import get_student_by_id, get_grade_history, search_questions
import uuid
from datetime import datetime, timezone
import boto3
from ..config import AWS_REGION, AWS_BEDROCK_MODEL_ID

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)


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
async def create_lesson_plan(
    content_source_type: str,
    content_source_data: str,
    duration: int = 45,
    grade_level: Optional[str] = None,
    learning_objectives: Optional[List[str]] = None,
    include_assessment: bool = True,
    include_materials: bool = True,
    student_id: Optional[str] = None,
    worksheet_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create comprehensive lesson plans from ANY content input, not just student IDs.

    IMPORTANT: This tool is highly flexible and can create lesson plans from multiple sources:
    - student_profile: Personalized plan based on student data
    - topic: General lesson plan for a specific topic
    - standards: Aligned to curriculum standards
    - custom_prompt: Create from any text description

    Use this tool to:
    - Generate lesson plans from various content sources
    - Create structured teaching plans with timing
    - Include assessments and materials lists
    - Personalize based on student data when available

    Args:
        content_source_type: "student_profile", "topic", "standards", or "custom_prompt"
        content_source_data: The actual content (student_id, topic name, standards text, or custom prompt)
        duration: Session duration in minutes (default: 45)
        grade_level: Grade level (required for non-student plans)
        learning_objectives: Optional list of specific objectives
        include_assessment: Whether to include assessment section (default: True)
        include_materials: Whether to include materials list (default: True)
        student_id: Optional student ID for personalization
        worksheet_id: Optional worksheet to integrate

    Returns:
        Complete lesson plan with title, objectives, materials, activities, assessment, and notes
    """
    try:
        lesson_plan_id = f"lesson_{uuid.uuid4().hex[:8]}"

        # Parse content source and gather context
        context = {}
        topic = ""

        if content_source_type == "student_profile" or student_id:
            # Get student data
            sid = student_id if student_id else content_source_data
            student = await get_student_by_id(sid)

            if student:
                history = await get_grade_history(sid, limit=5)
                context = {
                    "type": "student_profile",
                    "student_name": student.get('name'),
                    "grade": student.get('grade'),
                    "accuracy": student.get('accuracy', {}),
                    "recent_performance": history[:3] if history else [],
                    "weak_areas": [
                        t for t, acc in student.get('accuracy', {}).items()
                        if acc < 0.7
                    ]
                }
                grade_level = student.get('grade')
                topic = content_source_data if content_source_type == "topic" else "Mixed Topics"

        elif content_source_type == "topic":
            topic = content_source_data
            context = {
                "type": "topic",
                "topic": topic,
                "grade_level": grade_level
            }

        elif content_source_type == "standards":
            context = {
                "type": "standards",
                "standards_text": content_source_data,
                "grade_level": grade_level
            }
            topic = "Standards-Based Lesson"

        elif content_source_type == "custom_prompt":
            context = {
                "type": "custom",
                "prompt": content_source_data,
                "grade_level": grade_level
            }
            topic = "Custom Lesson"

        # Generate comprehensive lesson plan using AI
        from ..services.bedrock_service import bedrock_client
        import json

        prompt = f"""Create a comprehensive {duration}-minute lesson plan with the following context:

Content Source: {content_source_type}
Topic/Content: {content_source_data}
Grade Level: {grade_level}
Learning Objectives: {learning_objectives if learning_objectives else 'To be determined based on content'}

Additional Context: {json.dumps(context, indent=2)}

Generate a complete lesson plan with:
1. Title
2. Learning Objectives (3-5 specific, measurable objectives)
3. Materials Needed (if include_materials: {include_materials})
4. Lesson Structure with timed activities:
   - Warm-up/Hook
   - Direct Instruction
   - Guided Practice
   - Independent Practice
   - Closure
5. Assessment Strategy (if include_assessment: {include_assessment})
6. Differentiation suggestions
7. Teaching notes and tips

Format as JSON:
{{
  "title": "...",
  "objectives": ["...", "..."],
  "materials": ["...", "..."],
  "activities": [
    {{"time": "5 min", "name": "Warm-up", "description": "...", "teacher_notes": "..."}},
    ...
  ],
  "assessment": "...",
  "differentiation": "...",
  "notes": "..."
}}"""

        response = bedrock_client.converse(
            modelId=AWS_BEDROCK_MODEL_ID,
            messages=[{
                "role": "user",
                "content": [{"text": prompt}]
            }],
            inferenceConfig={
                "maxTokens": 3000,
                "temperature": 0.7
            }
        )

        response_text = response['output']['message']['content'][0]['text']

        # Parse JSON response
        try:
            start_idx = response_text.find('{')
            end_idx = response_text.rfind('}') + 1
            if start_idx != -1 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                ai_lesson = json.loads(json_str)
            else:
                ai_lesson = json.loads(response_text)
        except json.JSONDecodeError:
            # Fallback structure
            ai_lesson = {
                "title": f"Lesson on {topic}",
                "objectives": learning_objectives or [f"Understand {topic}"],
                "materials": ["Whiteboard", "Worksheets"],
                "activities": [
                    {"time": f"{int(duration*0.15)} min", "name": "Warm-up", "description": "Review previous concepts"},
                    {"time": f"{int(duration*0.5)} min", "name": "Main Instruction", "description": "Teach new concepts"},
                    {"time": f"{int(duration*0.2)} min", "name": "Practice", "description": "Guided practice"},
                    {"time": f"{int(duration*0.15)} min", "name": "Closure", "description": "Summary and homework"}
                ],
                "assessment": "Formative assessment through questioning",
                "differentiation": "Adjust difficulty based on student needs",
                "notes": response_text[:500]
            }

        # Save to database
        lesson_plans_table = dynamodb.Table('lumix-lesson-plans')

        lesson_plan = {
            "lesson_plan_id": lesson_plan_id,
            "title": ai_lesson.get('title', f"Lesson on {topic}"),
            "topic": topic,
            "duration": duration,
            "grade_level": grade_level,
            "content_source_type": content_source_type,
            "content_source_data": content_source_data,
            "objectives": ai_lesson.get('objectives', []),
            "materials": ai_lesson.get('materials', []) if include_materials else [],
            "activities": ai_lesson.get('activities', []),
            "assessment": ai_lesson.get('assessment', '') if include_assessment else '',
            "differentiation": ai_lesson.get('differentiation', ''),
            "notes": ai_lesson.get('notes', ''),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "created_by": "lumix-ai"
        }

        # Only add student_id if provided (DynamoDB StudentIndex requires it to be non-null)
        if student_id:
            lesson_plan["student_id"] = student_id

        # Only add worksheet_id if provided
        if worksheet_id:
            lesson_plan["worksheet_id"] = worksheet_id

        try:
            lesson_plans_table.put_item(Item=lesson_plan)
        except Exception as db_error:
            print(f"Database save failed: {db_error}")

        return {
            "success": True,
            "lesson_plan_id": lesson_plan_id,
            "lesson_plan": lesson_plan,
            "message": f"Created lesson plan: {ai_lesson.get('title')}"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "lesson_plan_id": None
        }


# Maintain backward compatibility with old tool name
@tool
async def generate_lesson_plan(
    topic: str,
    duration: int,
    student_id: str,
    worksheet_id: Optional[str] = None,
    use_student_data: bool = True
) -> Dict[str, Any]:
    """
    DEPRECATED: Use create_lesson_plan instead for more flexibility.

    Generate an AI-powered lesson plan for a tutoring session.
    This is maintained for backward compatibility.
    """
    return await create_lesson_plan(
        content_source_type="student_profile" if use_student_data else "topic",
        content_source_data=student_id if use_student_data else topic,
        duration=duration,
        student_id=student_id,
        worksheet_id=worksheet_id
    )


@tool
async def create_lesson_with_worksheet(
    topic: str,
    duration: int,
    grade_level: str,
    subject: str,
    student_id: Optional[str] = None,
    difficulty_level: str = "intermediate",
    question_count: int = 8,
    content_source_type: str = "topic",
    include_answer_key: bool = True
) -> Dict[str, Any]:
    """
    Autonomously create lesson plan with attached worksheet in one action.

    IMPORTANT: This is the most powerful tool for session preparation.
    It intelligently chains multiple operations:
    1. Creates comprehensive lesson plan based on content
    2. Generates or selects appropriate questions
    3. Creates formatted worksheet PDF
    4. Links lesson plan and worksheet together
    5. Returns complete package ready for teaching

    Use this tool to:
    - Prepare complete teaching sessions with one command
    - Generate coordinated lesson plans and worksheets
    - Save time by automating the full workflow

    Args:
        topic: Main topic for the lesson and worksheet
        duration: Session duration in minutes
        grade_level: Grade level (e.g., "7", "9", "11")
        subject: Subject area (e.g., "Mathematics", "Science")
        student_id: Optional - personalize for specific student
        difficulty_level: "beginner", "intermediate", or "advanced" (default: "intermediate")
        question_count: Number of questions for worksheet (default: 8)
        content_source_type: "topic", "student_profile", "standards", or "custom_prompt" (default: "topic")
        include_answer_key: Include answer key in worksheet (default: True)

    Returns:
        Combined package with lesson_plan_id, worksheet_id, and download URLs
    """
    try:
        # Import worksheet creation tool
        from .worksheet_tools import create_worksheet

        # Step 1: Create worksheet first (so we can reference it in lesson plan)
        worksheet_title = f"{topic} Practice Worksheet"

        worksheet_result = await create_worksheet(
            title=worksheet_title,
            subject=subject,
            grade_level=grade_level,
            topic=topic,
            difficulty_level=difficulty_level,
            question_ids=None,  # Let it auto-generate or find questions
            include_answer_key=include_answer_key,
            format="pdf",
            student_id=student_id
        )

        if not worksheet_result.get('success'):
            return {
                "success": False,
                "error": f"Worksheet creation failed: {worksheet_result.get('error')}",
                "lesson_plan_id": None,
                "worksheet_id": None
            }

        worksheet_id = worksheet_result.get('worksheet_id')

        # Step 2: Create lesson plan with worksheet reference
        content_data = student_id if content_source_type == "student_profile" else topic

        lesson_result = await create_lesson_plan(
            content_source_type=content_source_type,
            content_source_data=content_data,
            duration=duration,
            grade_level=grade_level,
            learning_objectives=[
                f"Master core concepts in {topic}",
                "Apply problem-solving strategies",
                "Build confidence through practice"
            ],
            include_assessment=True,
            include_materials=True,
            student_id=student_id,
            worksheet_id=worksheet_id
        )

        if not lesson_result.get('success'):
            return {
                "success": False,
                "error": f"Lesson plan creation failed: {lesson_result.get('error')}",
                "lesson_plan_id": None,
                "worksheet_id": worksheet_id,
                "worksheet_url": worksheet_result.get('file_url')
            }

        # Step 3: Update session if student_id provided (link lesson to session)
        session_link_message = ""
        if student_id:
            session_link_message = f"\n\nReady to assign to {student_id}'s next session."

        return {
            "success": True,
            "lesson_plan_id": lesson_result.get('lesson_plan_id'),
            "worksheet_id": worksheet_id,
            "package": {
                "lesson_plan": lesson_result.get('lesson_plan'),
                "worksheet": {
                    "id": worksheet_id,
                    "url": worksheet_result.get('file_url'),
                    "question_count": worksheet_result.get('metadata', {}).get('question_count'),
                    "has_answer_key": include_answer_key
                }
            },
            "urls": {
                "worksheet_url": worksheet_result.get('file_url'),
                "lesson_plan_url": f"lesson-plans/{lesson_result.get('lesson_plan_id')}"
            },
            "message": f"Created complete teaching package for '{topic}' ({duration} min)\n"
                      f"- Lesson plan: {lesson_result.get('lesson_plan', {}).get('title')}\n"
                      f"- Worksheet: {worksheet_result.get('metadata', {}).get('question_count')} questions"
                      f"{session_link_message}"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "lesson_plan_id": None,
            "worksheet_id": None
        }
