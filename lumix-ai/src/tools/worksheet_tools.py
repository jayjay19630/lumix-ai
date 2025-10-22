"""
Worksheet creation and PDF generation tools
"""
from typing import Dict, Any, Optional, List
from strands import tool
import uuid
from datetime import datetime, timezone
import boto3
from ..config import AWS_REGION
from ..utils.dynamodb_client import search_questions, get_student_by_id
from .question_tools import generate_questions as generate_new_questions

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
s3_client = boto3.client('s3', region_name=AWS_REGION)


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
            student_context=student_context,
            include_answer_key=include_answer_key
        )

        # Step 4: Upload to S3
        bucket_name = 'lumix-worksheets'  # Configure this
        file_key = f"worksheets/{worksheet_id}.pdf"

        try:
            s3_client.put_object(
                Bucket=bucket_name,
                Key=file_key,
                Body=pdf_content,
                ContentType='application/pdf'
            )

            # Generate presigned URL (valid for 7 days)
            file_url = s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket_name, 'Key': file_key},
                ExpiresIn=604800  # 7 days
            )
        except Exception as s3_error:
            # If S3 upload fails, still return success with local reference
            file_url = f"local://{worksheet_id}.pdf"
            print(f"S3 upload failed, using local reference: {s3_error}")

        # Step 5: Store metadata in database
        worksheets_table = dynamodb.Table('lumix-worksheets')

        worksheet_metadata = {
            'worksheet_id': worksheet_id,
            'title': title,
            'subject': subject,
            'grade_level': grade_level,
            'topic': topic,
            'difficulty_level': difficulty_level,
            'question_ids': [q.get('question_id') for q in questions],
            'question_count': len(questions),
            'student_id': student_id,
            'file_url': file_url,
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
            "preview_url": file_url,
            "metadata": {
                "title": title,
                "subject": subject,
                "grade_level": grade_level,
                "topic": topic,
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
    student_context: Optional[Dict[str, Any]] = None,
    include_answer_key: bool = True
) -> bytes:
    """
    Generate a PDF worksheet using ReportLab.

    Returns PDF content as bytes.
    """
    try:
        from reportlab.lib.pagesizes import letter
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT
        from reportlab.lib import colors
        from io import BytesIO

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)

        story = []
        styles = getSampleStyleSheet()

        # Custom styles
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#6366F1'),
            spaceAfter=12,
            alignment=TA_CENTER
        )

        header_style = ParagraphStyle(
            'CustomHeader',
            parent=styles['Normal'],
            fontSize=10,
            textColor=colors.grey,
            alignment=TA_CENTER
        )

        question_style = ParagraphStyle(
            'Question',
            parent=styles['Normal'],
            fontSize=11,
            spaceAfter=12,
            leftIndent=0
        )

        # Header
        story.append(Paragraph("Lumix ✨", header_style))
        story.append(Spacer(1, 0.1*inch))
        story.append(Paragraph(title, title_style))

        # Student info and metadata
        info_data = [
            ['Subject:', subject, 'Grade Level:', grade_level],
            ['Name:', student_context.get('name', '_' * 30) if student_context else '_' * 30,
             'Date:', '_' * 20]
        ]

        info_table = Table(info_data, colWidths=[1*inch, 2.5*inch, 1*inch, 2*inch])
        info_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('TEXTCOLOR', (0, 0), (0, -1), colors.grey),
            ('TEXTCOLOR', (2, 0), (2, -1), colors.grey),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ]))

        story.append(info_table)
        story.append(Spacer(1, 0.3*inch))

        # Instructions
        instructions = Paragraph(
            "<b>Instructions:</b> Answer all questions. Show your work where applicable.",
            styles['Normal']
        )
        story.append(instructions)
        story.append(Spacer(1, 0.2*inch))

        # Questions
        for idx, question in enumerate(questions, 1):
            q_text = question.get('text', question.get('question_text', 'Question text missing'))

            # Question number and text
            q_paragraph = Paragraph(f"<b>{idx}.</b> {q_text}", question_style)
            story.append(q_paragraph)

            # Answer space (lines for student to write)
            story.append(Spacer(1, 0.15*inch))
            for _ in range(3):  # 3 lines for answer
                story.append(Paragraph('_' * 100, styles['Normal']))
                story.append(Spacer(1, 0.1*inch))

            story.append(Spacer(1, 0.2*inch))

        # Answer key on new page
        if include_answer_key:
            story.append(PageBreak())
            story.append(Paragraph("Answer Key", title_style))
            story.append(Spacer(1, 0.2*inch))

            for idx, question in enumerate(questions, 1):
                answer = question.get('answer', 'Answer not provided')
                explanation = question.get('explanation', '')

                answer_text = f"<b>{idx}.</b> {answer}"
                if explanation:
                    answer_text += f"<br/><i>Explanation: {explanation[:200]}...</i>" if len(explanation) > 200 else f"<br/><i>Explanation: {explanation}</i>"

                story.append(Paragraph(answer_text, styles['Normal']))
                story.append(Spacer(1, 0.15*inch))

        # Build PDF
        doc.build(story)

        pdf_content = buffer.getvalue()
        buffer.close()

        return pdf_content

    except ImportError:
        # Fallback if reportlab not installed - generate simple text-based PDF placeholder
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
