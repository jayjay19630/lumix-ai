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
async def create_lesson_plan(
    content_source_type: str,
    content_source_data: str,
    duration: int = 45,
    session_id: Optional[str] = None,
    grade_level: Optional[str] = None,
    learning_objectives: Optional[List[str]] = None,
    include_assessment: bool = True,
    include_materials: bool = True,
    student_id: Optional[str] = None,
    worksheet_id: Optional[str] = None,
    session_date: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create comprehensive lesson plans from ANY content input, not just student IDs.

    IMPORTANT: This tool is highly flexible and can create lesson plans from multiple sources:
    - student_profile: Personalized plan based on student data
    - topic: General lesson plan for a specific topic
    - standards: Aligned to curriculum standards
    - custom_prompt: Create from any text description

    CRITICAL: When creating a lesson plan for a session, you MUST provide the session_id to link them together.

    Use this tool to:
    - Generate lesson plans from various content sources
    - Create structured teaching plans with timing
    - Include assessments and materials lists
    - Personalize based on student data when available
    - Link lesson plans to specific tutoring sessions

    Args:
        content_source_type: "student_profile", "topic", "standards", or "custom_prompt"
        content_source_data: The actual content (student_id, topic name, standards text, or custom prompt)
        duration: Session duration in minutes (default: 45)
        session_id: CRITICAL - Session ID to link this lesson plan to (e.g., "sess_20250122_studentid")
        grade_level: Grade level (required for non-student plans)
        learning_objectives: Optional list of specific objectives
        include_assessment: Whether to include assessment section (default: True)
        include_materials: Whether to include materials list (default: True)
        student_id: Optional student ID for personalization
        worksheet_id: Optional worksheet to integrate
        session_date: Optional session date (YYYY-MM-DD format) for context

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

        # Format teaching notes from AI lesson structure
        teaching_notes_parts = []

        # Add title if available
        if ai_lesson.get('title'):
            teaching_notes_parts.append(f"# {ai_lesson.get('title')}\n")

        # Add objectives
        if ai_lesson.get('objectives'):
            teaching_notes_parts.append("## Learning Objectives")
            for obj in ai_lesson.get('objectives', []):
                teaching_notes_parts.append(f"- {obj}")
            teaching_notes_parts.append("")

        # Add activities with timing
        if ai_lesson.get('activities'):
            teaching_notes_parts.append("## Lesson Activities")
            for activity in ai_lesson.get('activities', []):
                time_str = activity.get('time', '')
                name = activity.get('name', '')
                desc = activity.get('description', '')
                teaching_notes_parts.append(f"**{name}** ({time_str})")
                teaching_notes_parts.append(desc)
                if activity.get('teacher_notes'):
                    teaching_notes_parts.append(f"*Note: {activity.get('teacher_notes')}*")
                teaching_notes_parts.append("")

        # Add materials
        if include_materials and ai_lesson.get('materials'):
            teaching_notes_parts.append("## Materials Needed")
            for material in ai_lesson.get('materials', []):
                teaching_notes_parts.append(f"- {material}")
            teaching_notes_parts.append("")

        # Add assessment
        if include_assessment and ai_lesson.get('assessment'):
            teaching_notes_parts.append("## Assessment")
            teaching_notes_parts.append(ai_lesson.get('assessment'))
            teaching_notes_parts.append("")

        # Add differentiation
        if ai_lesson.get('differentiation'):
            teaching_notes_parts.append("## Differentiation")
            teaching_notes_parts.append(ai_lesson.get('differentiation'))
            teaching_notes_parts.append("")

        # Add general notes if present
        if ai_lesson.get('notes'):
            teaching_notes_parts.append("## Additional Notes")
            teaching_notes_parts.append(ai_lesson.get('notes'))

        teaching_notes = "\n".join(teaching_notes_parts)

        # Create lesson plan matching lumix-web schema
        lesson_plan = {
            "lesson_plan_id": lesson_plan_id,
            "duration": duration,
            "created_by": "ai",  # Match frontend expectation
            "teaching_notes": teaching_notes,  # Primary field expected by frontend
            "focus_topics": [topic] if isinstance(topic, str) else topic,  # Ensure it's an array
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),

            # Extended AI fields (optional, for richer display)
            "objectives": ai_lesson.get('objectives', []),
            "materials": ai_lesson.get('materials', []) if include_materials else [],
            "activities": ai_lesson.get('activities', []),
            "assessment": ai_lesson.get('assessment', '') if include_assessment else '',
            "differentiation": ai_lesson.get('differentiation', ''),
            "notes": ai_lesson.get('notes', ''),

            # Legacy fields for compatibility
            "title": ai_lesson.get('title', f"Lesson on {topic}"),
            "topic": topic,
            "grade_level": grade_level,
            "content_source_type": content_source_type,
            "content_source_data": content_source_data
        }

        # CRITICAL: Add session_id if provided (links lesson plan to session)
        if session_id:
            lesson_plan["session_id"] = session_id

        # Add session date if provided
        if session_date:
            lesson_plan["date"] = session_date

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

        # CRITICAL: Update the session to link it with this lesson plan
        if session_id:
            try:
                sessions_table = dynamodb.Table('lumix-sessions')
                sessions_table.update_item(
                    Key={'session_id': session_id},
                    UpdateExpression='SET lesson_plan_id = :lpid, updated_at = :updated',
                    ExpressionAttributeValues={
                        ':lpid': lesson_plan_id,
                        ':updated': datetime.now(timezone.utc).isoformat()
                    }
                )
                print(f"Successfully linked lesson plan {lesson_plan_id} to session {session_id}")
            except Exception as session_update_error:
                print(f"Failed to update session: {session_update_error}")
                # Don't fail the whole operation if session update fails

        return {
            "success": True,
            "lesson_plan_id": lesson_plan_id,
            "lesson_plan": lesson_plan,
            "session_id": session_id,
            "message": f"Created lesson plan: {ai_lesson.get('title')}" + (f" and linked to session {session_id}" if session_id else "")
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "lesson_plan_id": None
        }
