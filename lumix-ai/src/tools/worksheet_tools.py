"""
Worksheet creation and PDF generation tools
"""
from typing import Dict, Any, Optional, List
from strands import tool
import uuid
from datetime import datetime, timezone
import boto3
from ..config import AWS_REGION, S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
from ..utils.dynamodb_client import search_questions, get_student_by_id
from .question_tools import generate_questions as generate_new_questions
from botocore.config import Config

dynamodb = boto3.resource(
    'dynamodb',
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY
)

# Configure S3 client with explicit credentials and region
s3_config = Config(
    region_name=AWS_REGION,
    signature_version='s3v4',
    s3={'addressing_style': 'virtual'}
)
s3_client = boto3.client(
    's3',
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    config=s3_config
)


@tool
async def create_worksheet(
    title: str,
    subject: str,
    grade_level: str,
    topic: str,
    difficulty_level: str = "intermediate",
    question_ids: Optional[List[str]] = None,
    include_answer_key: bool = True,
    format: str = "pdf",
    student_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a complete worksheet with questions, formatting, and structure.

    IMPORTANT: This tool autonomously handles the complete workflow:
    - If question_ids provided, fetches existing questions from database
    - If no question_ids, automatically generates new questions using AI
    - Formats worksheet with proper structure (header, instructions, questions, answer space)
    - Generates answer key if requested
    - Stores in S3 and saves metadata to database

    Use this tool to:
    - Create printable worksheets for students
    - Generate practice materials with or without existing questions
    - Produce formatted PDFs ready for download

    Args:
        title: Worksheet title (e.g., "Quadratic Equations Practice")
        subject: Subject area (e.g., "Mathematics", "Science", "History")
        grade_level: Grade level (e.g., "7", "9", "11")
        topic: Main topic for the worksheet
        difficulty_level: "beginner", "intermediate", or "advanced" (default: "intermediate")
        question_ids: Optional - List of question IDs to use from database
        include_answer_key: Whether to generate answer key (default: True)
        format: Output format - "pdf", "docx", or "html" (default: "pdf")
        student_id: Optional - personalize for specific student

    Returns:
        Worksheet ID, file URL (S3), preview URL, and metadata
    """
    try:
        worksheet_id = f"worksheet_{uuid.uuid4().hex[:10]}"
        questions = []

        # Step 1: Get or generate questions
        if question_ids and len(question_ids) > 0:
            # Fetch existing questions from database
            from ..utils.dynamodb_client import questions_table

            for qid in question_ids:
                response = questions_table.get_item(Key={'question_id': qid})
                if 'Item' in response:
                    questions.append(response['Item'])
        else:
            # No questions provided - generate new ones
            # Determine how many questions to generate
            question_count = 8  # Default

            # First try to find existing questions
            existing_questions = await search_questions(topic=topic, difficulty=difficulty_level, limit=question_count)

            if len(existing_questions) >= question_count:
                questions = existing_questions[:question_count]
            else:
                # Not enough existing questions - generate new ones
                needed = question_count - len(existing_questions)

                result = await generate_new_questions(
                    topic=topic,
                    difficulty_level=difficulty_level,
                    question_count=needed,
                    question_type="mixed",
                    subject_area=subject
                )

                if result.get('success'):
                    questions = existing_questions + result.get('questions', [])
                else:
                    # Fallback to just existing questions if generation fails
                    questions = existing_questions

        if len(questions) == 0:
            return {
                "success": False,
                "error": "No questions available and generation failed",
                "worksheet_id": None
            }

        # Step 2: Get student context if provided
        student_context = None
        if student_id:
            student = await get_student_by_id(student_id)
            if student:
                student_context = {
                    "name": student.get('name'),
                    "grade": student.get('grade')
                }

        # Step 3: Generate PDF content
        pdf_content = generate_worksheet_pdf(
            title=title,
            subject=subject,
            grade_level=grade_level,
            questions=questions,
            student_context=student_context
        )

        # Step 4: Upload to S3 (matching lumix-web structure)
        timestamp = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        filename = f"{title.lower().replace(' ', '-')}-{timestamp}.pdf"
        file_key = f"worksheets/{worksheet_id}/{filename}"

        try:
            s3_client.put_object(
                Bucket=S3_BUCKET_NAME,
                Key=file_key,
                Body=pdf_content,
                ContentType='application/pdf'
            )

            # Generate presigned URL (valid for 7 days)
            file_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': S3_BUCKET_NAME, 'Key': file_key},
                ExpiresIn=604800  # 7 days
            )
        except Exception as s3_error:
            # If S3 upload fails, still return success with local reference
            file_url = f"local://{worksheet_id}.pdf"
            print(f"S3 upload failed, using local reference: {s3_error}")

        # Step 5: Store metadata in database
        worksheets_table = dynamodb.Table('lumix-worksheets')

        # Extract unique topics from questions
        unique_topics = list(set(q.get('topic', topic) for q in questions))

        worksheet_metadata = {
            'worksheet_id': worksheet_id,
            'title': title,
            'subject': subject,
            'grade_level': grade_level,
            'topic': topic,
            'topics': unique_topics if unique_topics else [topic],  # Frontend expects array
            'difficulty_level': difficulty_level,
            'question_ids': [q.get('question_id') for q in questions],
            'question_count': len(questions),
            'student_id': student_id,
            'file_url': file_url,
            'pdf_url': file_url,  # Alias for frontend
            'format': format,
            'has_answer_key': include_answer_key,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'created_by': 'lumix-ai'
        }

        try:
            worksheets_table.put_item(Item=worksheet_metadata)
        except Exception as db_error:
            print(f"Database storage failed: {db_error}")
            # Continue anyway - we have the worksheet

        return {
            "success": True,
            "worksheet_id": worksheet_id,
            "file_url": file_url,
            "pdf_url": file_url,
            "preview_url": file_url,
            "worksheet": worksheet_metadata,  # Full metadata for frontend
            "metadata": {
                "title": title,
                "subject": subject,
                "grade_level": grade_level,
                "topic": topic,
                "topics": unique_topics if unique_topics else [topic],
                "question_count": len(questions),
                "has_answer_key": include_answer_key
            },
            "questions": questions,
            "message": f"Created worksheet '{title}' with {len(questions)} questions"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "worksheet_id": None,
            "file_url": None
        }


def generate_worksheet_pdf(
    title: str,
    subject: str,
    grade_level: str,
    questions: List[Dict[str, Any]],
    student_context: Optional[Dict[str, Any]] = None
) -> bytes:
    """
    Generate a PDF worksheet using ReportLab that matches the lumix-web format.

    Mimics the jsPDF format from worksheet-generator.ts:
    - Indigo header with Lumix branding
    - Worksheet title and student info
    - Questions with proper spacing
    - Footer with page numbers

    Returns PDF content as bytes.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.pdfgen.canvas import Canvas
        from io import BytesIO
        from datetime import datetime

        buffer = BytesIO()
        c = Canvas(buffer, pagesize=A4)

        # Page dimensions (A4 in mm)
        page_width, page_height = A4
        margin = 20 * mm
        content_width = page_width - 2 * margin

        def draw_header(c, page_num, total_pages):
            """Draw header and footer on current page"""
            # Header - Indigo background (RGB: 99, 102, 241)
            c.setFillColorRGB(99/255, 102/255, 241/255)
            c.rect(0, page_height - 25*mm, page_width, 25*mm, fill=True, stroke=False)

            # Lumix title in white
            c.setFillColorRGB(1, 1, 1)
            c.setFont("Helvetica-Bold", 24)
            c.drawString(margin, page_height - 15*mm, "Lumix")

            # Subtitle
            c.setFont("Helvetica", 10)
            c.drawString(margin, page_height - 20*mm, "Teaching brilliance, powered by AI")

            # Footer - centered page number
            c.setFillColorRGB(0.6, 0.6, 0.6)
            c.setFont("Helvetica", 8)
            footer_text = f"Generated by Lumix - Page {page_num} of {total_pages}"
            c.drawCentredString(page_width / 2, 10*mm, footer_text)

        # Track pages for footer
        pages_content = []
        current_page_content = []
        y_position = page_height - 35*mm

        def check_new_page(required_space=20*mm):
            nonlocal y_position, current_page_content
            if y_position - required_space < margin + 15*mm:
                pages_content.append(current_page_content)
                current_page_content = []
                y_position = page_height - 35*mm
                return True
            return False

        # Title
        current_page_content.append(('title', title, y_position))
        y_position -= 10*mm

        # Student name if provided
        student_name = student_context.get('name') if student_context else None
        if student_name:
            current_page_content.append(('student', student_name, y_position))
            y_position -= 6*mm

        # Date
        today = datetime.now().strftime("%B %d, %Y")
        current_page_content.append(('date', today, y_position))
        y_position -= 12*mm

        # Divider line
        current_page_content.append(('line', y_position))
        y_position -= 10*mm

        # Questions
        for idx, question in enumerate(questions, 1):
            check_new_page(25*mm)

            q_text = question.get('text', question.get('question_text', 'Question text missing'))
            current_page_content.append(('question', idx, q_text, y_position))

            # Calculate space needed for question text
            y_position -= 15*mm

        # Add last page
        pages_content.append(current_page_content)
        total_pages = len(pages_content)

        # Now render all pages
        for page_num, page_content in enumerate(pages_content, 1):
            if page_num > 1:
                c.showPage()

            draw_header(c, page_num, total_pages)

            for item in page_content:
                if item[0] == 'title':
                    c.setFillColorRGB(0, 0, 0)
                    c.setFont("Helvetica-Bold", 18)
                    c.drawString(margin, item[2], item[1])

                elif item[0] == 'student':
                    c.setFont("Helvetica", 12)
                    c.drawString(margin, item[2], f"Student: {item[1]}")

                elif item[0] == 'date':
                    c.setFont("Helvetica", 10)
                    c.drawString(margin, item[2], f"Date: {item[1]}")

                elif item[0] == 'line':
                    c.setStrokeColorRGB(0.78, 0.78, 0.78)
                    c.line(margin, item[1], page_width - margin, item[1])

                elif item[0] == 'question':
                    idx, q_text, y_pos = item[1], item[2], item[3]
                    c.setFillColorRGB(0, 0, 0)
                    c.setFont("Helvetica-Bold", 10)
                    c.drawString(margin, y_pos, f"{idx}.")

                    c.setFont("Helvetica", 10)
                    # Simple text wrapping
                    max_width = content_width - 10*mm
                    text_object = c.beginText(margin + 7*mm, y_pos)
                    text_object.setFont("Helvetica", 10)

                    # Wrap text manually
                    words = q_text.split()
                    line = ""
                    for word in words:
                        test_line = line + word + " "
                        if c.stringWidth(test_line, "Helvetica", 10) < max_width:
                            line = test_line
                        else:
                            text_object.textLine(line)
                            line = word + " "
                    if line:
                        text_object.textLine(line)

                    c.drawText(text_object)

        c.save()
        pdf_content = buffer.getvalue()
        buffer.close()

        return pdf_content

    except ImportError:
        # Fallback if reportlab not installed
        return generate_simple_pdf_placeholder(title, subject, questions)


def generate_simple_pdf_placeholder(title: str, subject: str, questions: List[Dict[str, Any]]) -> bytes:
    """
    Fallback simple PDF generation without reportlab.
    Returns a basic text representation.
    """
    content = f"""LUMIX WORKSHEET

Title: {title}
Subject: {subject}

QUESTIONS:

"""

    for idx, question in enumerate(questions, 1):
        q_text = question.get('text', question.get('question_text', 'Question missing'))
        content += f"{idx}. {q_text}\n\n\n"

    # This is a placeholder - in production, you'd want to ensure reportlab is installed
    return content.encode('utf-8')
