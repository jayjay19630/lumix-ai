"""
Textract OCR Service
"""
import json
from typing import Dict, Any, List
from ..aws_clients import textract_client
from .bedrock_service import invoke_nova_model


async def extract_text_from_document(document_bytes: bytes) -> Dict[str, Any]:
    """
    Extract text from a document using AWS Textract

    Args:
        document_bytes: The document content as bytes

    Returns:
        Dict with extracted_text and parsed questions
    """
    try:
        response = textract_client.detect_document_text(
            Document={"Bytes": document_bytes}
        )

        # Extract text blocks
        blocks = response.get("Blocks", [])
        text_blocks = [
            block["Text"]
            for block in blocks
            if block.get("BlockType") == "LINE" and block.get("Text")
        ]

        extracted_text = "\n".join(text_blocks)

        # Parse questions using AI
        questions = await parse_questions_with_ai(extracted_text)

        return {
            "extracted_text": extracted_text,
            "questions": questions,
        }

    except Exception as e:
        print(f"Error extracting text from document: {e}")
        raise


async def extract_text_from_s3(bucket: str, key: str) -> Dict[str, Any]:
    """
    Extract text from a document stored in S3

    Args:
        bucket: S3 bucket name
        key: S3 object key

    Returns:
        Dict with extracted_text and parsed questions
    """
    try:
        response = textract_client.detect_document_text(
            Document={"S3Object": {"Bucket": bucket, "Name": key}}
        )

        blocks = response.get("Blocks", [])
        text_blocks = [
            block["Text"]
            for block in blocks
            if block.get("BlockType") == "LINE" and block.get("Text")
        ]

        extracted_text = "\n".join(text_blocks)
        questions = await parse_questions_with_ai(extracted_text)

        return {
            "extracted_text": extracted_text,
            "questions": questions,
        }

    except Exception as e:
        print(f"Error extracting text from S3: {e}")
        raise


async def parse_questions_with_ai(text: str) -> List[Dict[str, Any]]:
    """
    Parse individual questions from extracted text using AI

    Args:
        text: The extracted text

    Returns:
        List of parsed questions with text and confidence
    """
    if not text or len(text.strip()) < 20:
        return []

    prompt = f"""You are an expert at parsing math questions from extracted text. The text below was extracted from a PDF or image and may be unstructured, contain OCR errors, or have questions in various formats.

Your task is to:
1. Identify individual questions in the text
2. Clean up OCR errors if present
3. Preserve the original question text as accurately as possible
4. Handle both numbered (1., 2., etc.) and unnumbered questions
5. Include multi-part questions as a single question

Extracted Text:
{text}

Respond with a JSON array of questions in this exact format:
[
  {{
    "text": "The complete question text, cleaned and formatted",
    "confidence": 0.95
  }}
]

Guidelines:
- If questions are clearly numbered (1., 2., Q1:, etc.), split by those markers
- If text is unstructured, use context clues to identify separate questions
- Confidence should be 0.9-1.0 for clearly formatted questions, 0.7-0.9 for unstructured questions
- Exclude headers, instructions, or non-question content
- If no valid questions found, return an empty array []

Only return valid JSON, no additional text."""

    try:
        response = await invoke_nova_model(prompt, temperature=0.3, max_tokens=4096)
        parsed = json.loads(response.strip())

        if isinstance(parsed, list):
            # Filter valid questions
            return [
                q for q in parsed
                if isinstance(q, dict)
                and "text" in q
                and isinstance(q["text"], str)
                and len(q["text"]) > 10
                and "confidence" in q
                and isinstance(q["confidence"], (int, float))
            ]

        return fallback_parse_questions(text)

    except Exception as e:
        print(f"Error parsing questions with AI: {e}")
        return fallback_parse_questions(text)


def fallback_parse_questions(text: str) -> List[Dict[str, Any]]:
    """
    Fallback question parsing using regex patterns

    Args:
        text: The text to parse

    Returns:
        List of parsed questions
    """
    import re

    questions = []

    # Split by common question patterns
    pattern = r"(?:^|\n)(?:Q?\d+[\.\):]|\([a-z]\))\s*(.+?)(?=(?:^|\n)(?:Q?\d+[\.\):]|\([a-z]\))|$)"
    matches = re.finditer(pattern, text, re.IGNORECASE | re.MULTILINE | re.DOTALL)

    for match in matches:
        question_text = match.group(1).strip()
        if question_text and len(question_text) > 10:
            questions.append({"text": question_text, "confidence": 0.7})

    # If no questions found, split by double newlines
    if not questions:
        paragraphs = text.split("\n\n")
        for paragraph in paragraphs:
            trimmed = paragraph.strip()
            if len(trimmed) > 20:
                questions.append({"text": trimmed, "confidence": 0.5})

    return questions


async def extract_answers_from_worksheet(document_bytes: bytes) -> Dict[str, Any]:
    """
    Extract student answers from a graded worksheet

    Args:
        document_bytes: The worksheet content as bytes

    Returns:
        Dict with answers list and raw text
    """
    try:
        result = await extract_text_from_document(document_bytes)

        # Simple answer extraction using regex
        import re
        answer_pattern = r"(?:Answer|Ans)[:\s]+(.+?)(?=\n|$)"
        matches = re.finditer(answer_pattern, result["extracted_text"], re.IGNORECASE)

        answers = [match.group(1).strip() for match in matches if match.group(1)]

        return {
            "answers": answers,
            "raw_text": result["extracted_text"],
        }

    except Exception as e:
        print(f"Error extracting answers: {e}")
        raise
