"""
Question bank related agent tools
"""
from typing import Dict, Any, Optional, List
from strands import tool
from ..utils.dynamodb_client import search_questions
from ..services import bedrock_service
import uuid
from datetime import datetime, timezone
import boto3
from ..config import AWS_REGION

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
questions_table = dynamodb.Table('lumix-questions')


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


@tool
async def generate_questions(
    topic: str,
    difficulty_level: str = "intermediate",
    question_count: int = 5,
    question_type: str = "mixed",
    subject_area: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generate new questions using AI when no suitable questions exist in the database.

    IMPORTANT: Use this tool when query_questions returns insufficient results.
    This tool autonomously creates pedagogically sound questions and stores them in the database.

    Use this tool to:
    - Generate questions for topics with no existing questions
    - Create questions at specific difficulty levels
    - Produce diverse question types (multiple choice, short answer, essay)

    Args:
        topic: Topic for the questions (e.g., "Quadratic Equations", "Photosynthesis")
        difficulty_level: "beginner", "intermediate", or "advanced" (default: "intermediate")
        question_count: Number of questions to generate (1-20, default: 5)
        question_type: "multiple_choice", "short_answer", "essay", or "mixed" (default: "mixed")
        subject_area: Optional subject context (e.g., "Mathematics", "Science", "History")

    Returns:
        List of generated questions with IDs, stored in database
    """
    try:
        # Validate inputs
        if question_count < 1 or question_count > 20:
            return {
                "success": False,
                "error": "question_count must be between 1 and 20",
                "questions": []
            }

        # Map difficulty to internal format
        difficulty_map = {
            "beginner": "Easy",
            "intermediate": "Medium",
            "advanced": "Hard"
        }
        internal_difficulty = difficulty_map.get(difficulty_level, "Medium")

        # Create AI prompt for question generation
        prompt = f"""Generate {question_count} pedagogically sound {difficulty_level}-level questions on the topic: {topic}.

Subject Area: {subject_area or 'General'}
Question Type: {question_type}
Difficulty: {difficulty_level}

For each question, provide:
1. The question text (clear and well-formatted)
2. The correct answer or solution
3. A detailed explanation of the solution
4. Teaching tips for tutors

Format your response as a JSON array with this structure:
[
  {{
    "question_text": "...",
    "answer": "...",
    "explanation": "...",
    "teaching_tips": "..."
  }}
]

Ensure questions are:
- Appropriate for the difficulty level
- Educationally valuable
- Clear and unambiguous
- Aligned with standard curricula when applicable"""

        # Use Bedrock to generate questions
        import json
        from ..services.bedrock_service import bedrock_client

        response = bedrock_client.converse(
            modelId="us.amazon.nova-lite-v1:0",
            messages=[{
                "role": "user",
                "content": [{"text": prompt}]
            }],
            inferenceConfig={
                "maxTokens": 4000,
                "temperature": 0.7
            }
        )

        response_text = response['output']['message']['content'][0]['text']

        # Try to extract JSON from the response
        try:
            # Look for JSON array in the response
            start_idx = response_text.find('[')
            end_idx = response_text.rfind(']') + 1
            if start_idx != -1 and end_idx > start_idx:
                json_str = response_text[start_idx:end_idx]
                generated_questions = json.loads(json_str)
            else:
                generated_questions = json.loads(response_text)
        except json.JSONDecodeError:
            return {
                "success": False,
                "error": "Failed to parse AI-generated questions",
                "questions": [],
                "raw_response": response_text
            }

        # Store questions in database
        stored_questions = []
        for q in generated_questions[:question_count]:
            question_id = f"question_{uuid.uuid4().hex[:12]}"

            item = {
                'question_id': question_id,
                'text': q.get('question_text', ''),
                'topic': topic,
                'difficulty': internal_difficulty,
                'source': 'AI Generated',
                'explanation': q.get('explanation', ''),
                'teaching_tips': q.get('teaching_tips', ''),
                'answer': q.get('answer', ''),
                'times_used': 0,
                'success_rate': 0,
                'subject_area': subject_area or 'General',
                'question_type': question_type,
                'created_at': datetime.now(timezone.utc).isoformat(),
                'generated_by': 'lumix-ai'
            }

            questions_table.put_item(Item=item)
            stored_questions.append(item)

        return {
            "success": True,
            "questions": stored_questions,
            "count": len(stored_questions),
            "message": f"Generated and stored {len(stored_questions)} questions on {topic}",
            "metadata": {
                "topic": topic,
                "difficulty": difficulty_level,
                "question_type": question_type
            }
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "questions": [],
            "count": 0
        }
