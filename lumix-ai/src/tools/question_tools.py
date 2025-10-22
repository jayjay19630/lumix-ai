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
from ..config import AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY

dynamodb = boto3.resource(
    'dynamodb',
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)
questions_table = dynamodb.Table('lumix-questions')


@tool
async def query_question_topics() -> Dict[str, Any]:
    """
    Get a list of all unique question topics available in the database.

    CRITICAL: Always call this tool FIRST before searching for questions or generating new ones.
    This helps you understand what topics already exist and their exact names (with proper capitalization).

    Use this tool to:
    - Discover what topics are available in the question bank
    - Find the correct topic name spelling/capitalization before querying questions
    - Avoid creating duplicate topics with different cases (e.g., "fractions" vs "Fractions")

    Returns:
        Dictionary with:
        - topics: List of unique topic names with their question counts
        - total_topics: Total number of unique topics
        - example: "Fractions (12 questions)", "Exponents (8 questions)"
    """
    try:
        # Scan all questions to get unique topics
        response = questions_table.scan(
            ProjectionExpression='topic, difficulty'
        )

        items = response.get('Items', [])

        # Handle pagination if there are many questions
        while 'LastEvaluatedKey' in response:
            response = questions_table.scan(
                ProjectionExpression='topic, difficulty',
                ExclusiveStartKey=response['LastEvaluatedKey']
            )
            items.extend(response.get('Items', []))

        # Count questions per topic
        topic_counts = {}
        difficulty_breakdown = {}

        for item in items:
            topic = item.get('topic', 'Unknown')
            difficulty = item.get('difficulty', 'Medium')

            # Count total per topic
            if topic not in topic_counts:
                topic_counts[topic] = 0
                difficulty_breakdown[topic] = {'Easy': 0, 'Medium': 0, 'Hard': 0}

            topic_counts[topic] += 1
            if difficulty in difficulty_breakdown[topic]:
                difficulty_breakdown[topic][difficulty] += 1

        # Format topics with counts
        topics_list = []
        for topic, count in sorted(topic_counts.items()):
            topics_list.append({
                'topic': topic,
                'total_questions': count,
                'difficulty_breakdown': difficulty_breakdown[topic]
            })

        return {
            "success": True,
            "topics": topics_list,
            "total_topics": len(topics_list),
            "message": f"Found {len(topics_list)} unique topics in the question bank"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "topics": [],
            "total_topics": 0
        }


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

    IMPORTANT: This tool first checks if questions already exist for this topic.
    If questions exist, it returns those instead of generating duplicates.

    This tool automatically:
    - Checks for existing questions with similar topic names (case-insensitive)
    - Returns existing questions if found
    - Only generates new questions if insufficient questions exist

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
        List of questions (either existing or newly generated) with IDs, stored in database
    """
    try:
        # Validate inputs
        if question_count < 1 or question_count > 20:
            return {
                "success": False,
                "error": "question_count must be between 1 and 20",
                "questions": []
            }

        # STEP 1: Check for existing questions first (case-insensitive search)
        existing_questions = await search_questions(topic=topic, limit=50)

        # Filter by difficulty if specified
        difficulty_map = {
            "beginner": "Easy",
            "intermediate": "Medium",
            "advanced": "Hard"
        }
        internal_difficulty = difficulty_map.get(difficulty_level, "Medium")

        # Filter existing questions by difficulty
        matching_questions = [
            q for q in existing_questions
            if q.get('difficulty', '').lower() == internal_difficulty.lower()
        ]

        # If we have enough existing questions, return those instead of generating new ones
        if len(matching_questions) >= question_count:
            return {
                "success": True,
                "questions": matching_questions[:question_count],
                "count": question_count,
                "message": f"Found {question_count} existing questions on '{topic}' - no need to generate new ones",
                "source": "database",
                "metadata": {
                    "topic": topic,
                    "difficulty": difficulty_level,
                    "existing_count": len(matching_questions)
                }
            }

        # If we have some questions but not enough, adjust count
        questions_needed = question_count - len(matching_questions)

        if questions_needed > 0 and len(matching_questions) > 0:
            # We have some questions, generate only what we need
            question_count = questions_needed

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

IMPORTANT: You MUST respond with ONLY valid JSON in this exact format (no additional text before or after):

[
  {{
    "question_text": "Simplify: 2^3 × 2^5",
    "answer": "2^8 or 256",
    "explanation": "When multiplying powers with the same base, add the exponents: 2^3 × 2^5 = 2^(3+5) = 2^8 = 256",
    "teaching_tips": "Remind students that the base stays the same and only exponents are added"
  }}
]

Generate {question_count} questions following this exact JSON structure. Ensure questions are:
- Appropriate for the {difficulty_level} difficulty level
- Educationally valuable and curriculum-aligned
- Clear and unambiguous

Return ONLY the JSON array, no markdown formatting, no code blocks, no explanatory text."""

        # Use Bedrock to generate questions
        import json
        from ..aws_clients import bedrock_client
        from ..config import AWS_BEDROCK_MODEL_ID

        # Use converse API for Nova models
        response = bedrock_client.converse(
            modelId=AWS_BEDROCK_MODEL_ID,
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

        # Clean the response text (remove markdown code blocks if present)
        cleaned_text = response_text.strip()

        # Remove markdown code block markers
        if cleaned_text.startswith('```json'):
            cleaned_text = cleaned_text[7:]
        elif cleaned_text.startswith('```'):
            cleaned_text = cleaned_text[3:]

        if cleaned_text.endswith('```'):
            cleaned_text = cleaned_text[:-3]

        cleaned_text = cleaned_text.strip()

        # Try to extract JSON from the response
        try:
            # Look for JSON array in the response
            start_idx = cleaned_text.find('[')
            end_idx = cleaned_text.rfind(']') + 1
            if start_idx != -1 and end_idx > start_idx:
                json_str = cleaned_text[start_idx:end_idx]
                generated_questions = json.loads(json_str)
            else:
                generated_questions = json.loads(cleaned_text)

            # Validate that we got a list
            if not isinstance(generated_questions, list):
                raise ValueError("Response is not a JSON array")

        except (json.JSONDecodeError, ValueError) as e:
            print(f"JSON parse error: {e}")
            print(f"Response text: {response_text[:500]}")

            # Fallback: Try to create questions from the response text
            # Sometimes AI returns text even when asked for JSON
            return {
                "success": False,
                "error": f"Failed to parse AI-generated questions: {str(e)}",
                "questions": [],
                "raw_response": response_text[:1000],  # First 1000 chars for debugging
                "suggestion": "The AI did not return valid JSON. Try adjusting the prompt or check model configuration."
            }

        # STEP 2: Normalize the topic name using existing questions if available
        # This prevents creating "fractions" when "Fractions" already exists
        normalized_topic = topic
        if existing_questions and len(existing_questions) > 0:
            # Use the topic name from existing questions (preserves capitalization)
            normalized_topic = existing_questions[0].get('topic', topic)

        # STEP 3: Store newly generated questions in database
        stored_questions = []
        for q in generated_questions[:questions_needed if questions_needed > 0 else question_count]:
            question_id = f"question_{uuid.uuid4().hex[:12]}"

            item = {
                'question_id': question_id,
                'text': q.get('question_text', ''),
                'topic': normalized_topic,  # Use normalized topic name
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

        # STEP 4: Combine existing questions with newly generated ones
        all_questions = matching_questions + stored_questions
        total_count = len(all_questions)

        message_parts = []
        if len(matching_questions) > 0:
            message_parts.append(f"Found {len(matching_questions)} existing questions")
        if len(stored_questions) > 0:
            message_parts.append(f"generated {len(stored_questions)} new questions")

        return {
            "success": True,
            "questions": all_questions[:question_count if questions_needed == 0 else len(all_questions)],
            "count": total_count,
            "message": f"{' and '.join(message_parts)} on '{normalized_topic}'",
            "source": "mixed" if len(matching_questions) > 0 and len(stored_questions) > 0 else ("database" if len(stored_questions) == 0 else "generated"),
            "metadata": {
                "topic": normalized_topic,
                "difficulty": difficulty_level,
                "question_type": question_type,
                "existing_count": len(matching_questions),
                "generated_count": len(stored_questions)
            }
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "questions": [],
            "count": 0
        }
