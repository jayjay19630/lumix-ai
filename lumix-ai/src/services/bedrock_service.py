"""
Bedrock AI Generation Service
"""
import json
import re
from typing import Dict, Any, List
from ..aws_clients import bedrock_client
from .. import config


def clean_json_response(response: str) -> str:
    """Remove markdown code blocks from JSON responses"""
    cleaned = response.strip()

    # Remove ```json or ``` at start
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    elif cleaned.startswith("```"):
        cleaned = cleaned[3:]

    # Remove ``` at end
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]

    return cleaned.strip()


async def invoke_nova_model(
    prompt: str,
    max_tokens: int = 2048,
    temperature: float = 0.7,
    top_p: float = 0.9
) -> str:
    """
    Invoke Amazon Bedrock Nova model for text generation

    Args:
        prompt: The input prompt
        max_tokens: Maximum tokens to generate
        temperature: Temperature for generation
        top_p: Top-p sampling parameter

    Returns:
        Generated text response
    """
    try:
        request_body = {
            "messages": [
                {
                    "role": "user",
                    "content": [{"text": prompt}],
                }
            ],
            "inferenceConfig": {
                "max_new_tokens": max_tokens,
                "temperature": temperature,
                "top_p": top_p,
            },
        }

        response = bedrock_client.invoke_model(
            modelId=config.AWS_BEDROCK_MODEL_ID,
            contentType="application/json",
            accept="application/json",
            body=json.dumps(request_body),
        )

        response_body = json.loads(response["body"].read())

        # Extract text from Nova response
        if (
            response_body.get("output", {})
            .get("message", {})
            .get("content", [{}])[0]
            .get("text")
        ):
            return response_body["output"]["message"]["content"][0]["text"]

        raise ValueError("Unexpected response format from Bedrock Nova")

    except Exception as e:
        print(f"Error invoking Bedrock Nova model: {e}")
        raise


async def classify_question_topic(question_text: str) -> Dict[str, Any]:
    """
    Classify a math question's topic and difficulty

    Args:
        question_text: The question to classify

    Returns:
        Dict with topic, difficulty, and confidence
    """
    prompt = f"""You are a math education expert. Analyze the following math question and classify it.

Question: {question_text}

Provide your response in the following JSON format:
{{
  "topic": "the main topic (e.g., Quadratic Equations, Trigonometry, Linear Equations, Geometry, Functions)",
  "difficulty": "Easy, Medium, or Hard",
  "confidence": a number between 0 and 1 indicating your confidence
}}

Only return valid JSON, no additional text."""

    try:
        response = await invoke_nova_model(prompt, temperature=0.3)
        cleaned = clean_json_response(response)
        return json.loads(cleaned)
    except Exception as e:
        print(f"Error classifying question: {e}")
        return {
            "topic": "General Math",
            "difficulty": "Medium",
            "confidence": 0.5,
        }


async def generate_question_explanation(question_text: str) -> Dict[str, str]:
    """
    Generate explanation and teaching tips for a question

    Args:
        question_text: The question text

    Returns:
        Dict with explanation and teaching_tips
    """
    prompt = f"""You are a helpful math tutor. Provide a clear explanation and teaching tips for the following question.

Question: {question_text}

Provide your response in the following JSON format:
{{
  "explanation": "A clear, step-by-step explanation of how to solve this problem",
  "teaching_tips": "Helpful tips for teaching this concept to students"
}}

Only return valid JSON, no additional text."""

    try:
        response = await invoke_nova_model(prompt, temperature=0.7)
        cleaned = clean_json_response(response)
        return json.loads(cleaned)
    except Exception as e:
        print(f"Error generating explanation: {e}")
        return {
            "explanation": "Unable to generate explanation at this time.",
            "teaching_tips": "Review the problem with the student step by step.",
        }


async def generate_lesson_plan(
    topic: str,
    duration: int,
    student_id: str
) -> str:
    """
    Generate a lesson plan for a tutoring session

    Args:
        topic: Main topic for the lesson
        duration: Duration in minutes
        student_id: Student ID (for context)

    Returns:
        Formatted lesson plan text
    """
    prompt = f"""Create a {duration}-minute tutoring lesson plan on {topic}.

Structure the lesson into time slots with teaching bullet points.
Include: review/warmup, main teaching content, practice problems, recap.

Return the teaching notes in this format:

**Warmup (X minutes)**
- [bullet point]
- [bullet point]

**Main Teaching Content (X minutes)**
- [bullet point]
- [bullet point]

**Practice Problems (X minutes)**
- [bullet point]
- [bullet point]

**Recap (X minutes)**
- [bullet point]

Be concise and practical. Focus on clear, actionable teaching points."""

    try:
        return await invoke_nova_model(prompt, max_tokens=1000, temperature=0.7)
    except Exception as e:
        print(f"Error generating lesson plan: {e}")
        raise


async def select_questions_with_ai(
    questions: List[Dict[str, Any]],
    criteria: Dict[str, Any]
) -> List[int]:
    """
    Use AI to intelligently select and order questions for a worksheet

    Args:
        questions: List of available questions with metadata
        criteria: Selection criteria (topics, difficulty, count, sections)

    Returns:
        List of selected question indices
    """
    question_count = criteria.get("questionCount", 10)

    # If we have fewer questions than requested, return all indices
    if len(questions) <= question_count:
        return list(range(len(questions)))

    # Build simplified question metadata for AI
    questions_metadata = [
        {
            "index": idx,
            "topic": q.get("topic"),
            "difficulty": q.get("difficulty"),
            "preview": q.get("text", "")[:100],
        }
        for idx, q in enumerate(questions)
    ]

    sections_info = ""
    if criteria.get("sections"):
        sections = criteria["sections"]
        sections_info = f"""- Sections: Warm-up ({sections.get('warmup', 0)}), Practice ({sections.get('practice', 0)}), Challenge ({sections.get('challenge', 0)})"""

    prompt = f"""You are an expert math tutor creating a worksheet. Select the best {question_count} questions from the following list to create a well-balanced, pedagogically sound worksheet.

Criteria:
- Topics: {", ".join(criteria.get("topics", []))}
- Difficulty levels: {", ".join(criteria.get("difficulty", []))}
- Total questions needed: {question_count}
{sections_info}

Available Questions:
{json.dumps(questions_metadata, indent=2)}

Select questions that:
1. Provide good topic variety
2. Have appropriate difficulty progression
3. Avoid redundancy
4. Create a balanced learning experience
{f"5. Match the section requirements (easier questions for warm-up, harder for challenge)" if sections_info else ""}

Respond with a JSON array of the selected question indices in the order they should appear in the worksheet:
{{
  "selectedIndices": [0, 5, 12, ...]
}}

Only return valid JSON, no additional text."""

    try:
        response = await invoke_nova_model(prompt, temperature=0.5, max_tokens=2048)
        cleaned = clean_json_response(response)
        parsed = json.loads(cleaned)

        if "selectedIndices" in parsed and isinstance(parsed["selectedIndices"], list):
            return parsed["selectedIndices"][:question_count]

        # Fallback to sequential selection
        return list(range(min(question_count, len(questions))))

    except Exception as e:
        print(f"Error selecting questions with AI: {e}")
        # Fallback to sequential selection
        return list(range(min(question_count, len(questions))))


async def grade_worksheet_with_ai(
    extracted_text: str,
    student_name: str
) -> Dict[str, Any]:
    """
    Grade a worksheet using AI analysis

    Args:
        extracted_text: Text extracted from the worksheet
        student_name: Name of the student

    Returns:
        Grading results with scores, feedback, and insights
    """
    prompt = f"""You are an expert math tutor grading a student's worksheet. The student's name is {student_name}.

Extracted Text from Worksheet:
{extracted_text}

Analyze this worksheet and provide grading results. For each question:
1. Identify the question and the student's answer
2. Determine the topic (e.g., Quadratic Equations, Trigonometry, etc.)
3. Check if the answer is correct
4. Provide brief feedback

Also identify the student's weaknesses and provide insights for improvement.

Respond with this exact JSON format:
{{
  "total_questions": 10,
  "correct_answers": 7,
  "score": "7/10",
  "question_results": [
    {{
      "question_id": "q1",
      "question_text": "The actual question text",
      "topic": "Quadratic Equations",
      "is_correct": true,
      "student_answer": "x = 2, 3",
      "correct_answer": "x = 2, 3",
      "feedback": "Excellent work!"
    }}
  ],
  "weaknesses": ["Topic 1", "Topic 2"],
  "insights": "Overall insights and recommendations for the student..."
}}

Only return valid JSON, no additional text."""

    try:
        response = await invoke_nova_model(prompt, temperature=0.3, max_tokens=4096)
        cleaned = clean_json_response(response)
        return json.loads(cleaned)
    except Exception as e:
        print(f"Error grading with AI: {e}")
        return {
            "total_questions": 0,
            "correct_answers": 0,
            "score": "0/0",
            "question_results": [],
            "weaknesses": [],
            "insights": "Unable to grade worksheet automatically. Please review manually.",
        }
