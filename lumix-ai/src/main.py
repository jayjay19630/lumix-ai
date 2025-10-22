"""
Lumix AI Service - FastAPI Application
Handles all AI-related processing: Bedrock generation, Textract OCR, grading, etc.
"""

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from mangum import Mangum
from .agent import lumix_agent
import uvicorn

from .services import bedrock_service, textract_service
from . import config

# Initialize FastAPI app
app = FastAPI(
    title="Lumix AI Service",
    description="AI-powered tutoring assistant backend",
    version=config.VERSION,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure based on your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ===== REQUEST/RESPONSE MODELS =====


class ClassifyQuestionRequest(BaseModel):
    question_text: str


class GenerateExplanationRequest(BaseModel):
    question_text: str


class GenerateLessonPlanRequest(BaseModel):
    topic: str
    duration: int
    student_id: str


class SelectQuestionsRequest(BaseModel):
    questions: List[Dict[str, Any]]
    criteria: Dict[str, Any]


class GradeWorksheetRequest(BaseModel):
    extracted_text: str
    student_name: str


class ProcessDocumentS3Request(BaseModel):
    bucket: str
    key: str


# ===== HEALTH CHECK =====


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": config.SERVICE_NAME,
        "version": config.VERSION,
        "status": "healthy",
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "service": config.SERVICE_NAME,
        "version": config.VERSION,
        "aws_region": config.AWS_REGION,
    }


# ===== QUESTION PROCESSING =====


@app.post("/api/questions/classify")
async def classify_question(request: ClassifyQuestionRequest):
    """
    Classify a math question's topic and difficulty

    Lambda Function Name: lumix-classify-question
    """
    try:
        result = await bedrock_service.classify_question_topic(request.question_text)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/questions/explain")
async def generate_explanation(request: GenerateExplanationRequest):
    """
    Generate explanation and teaching tips for a question

    Lambda Function Name: lumix-generate-explanation
    """
    try:
        result = await bedrock_service.generate_question_explanation(
            request.question_text
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/questions/select")
async def select_questions(request: SelectQuestionsRequest):
    """
    Intelligently select questions for a worksheet using AI

    Lambda Function Name: lumix-select-questions
    """
    try:
        indices = await bedrock_service.select_questions_with_ai(
            request.questions, request.criteria
        )
        return {"success": True, "data": {"selectedIndices": indices}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== DOCUMENT PROCESSING (TEXTRACT + AI) =====


@app.post("/api/documents/extract")
async def extract_document_text(file: UploadFile = File(...)):
    """
    Extract text and parse questions from uploaded document

    Lambda Function Name: lumix-extract-document
    """
    try:
        contents = await file.read()
        result = await textract_service.extract_text_from_document(contents)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/documents/extract-s3")
async def extract_document_from_s3(request: ProcessDocumentS3Request):
    """
    Extract text and parse questions from S3 document

    Lambda Function Name: lumix-extract-document-s3
    """
    try:
        result = await textract_service.extract_text_from_s3(
            request.bucket, request.key
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/documents/extract-answers")
async def extract_answers(file: UploadFile = File(...)):
    """
    Extract student answers from a graded worksheet

    Lambda Function Name: lumix-extract-answers
    """
    try:
        contents = await file.read()
        result = await textract_service.extract_answers_from_worksheet(contents)
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== LESSON PLAN GENERATION =====


@app.post("/api/lessons/generate")
async def generate_lesson_plan(request: GenerateLessonPlanRequest):
    """
    Generate AI-powered lesson plan

    Lambda Function Name: lumix-generate-lesson-plan
    """
    try:
        teaching_notes = await bedrock_service.generate_lesson_plan(
            request.topic, request.duration, request.student_id
        )
        return {
            "success": True,
            "data": {
                "teaching_notes": teaching_notes,
                "ai_reasoning": f"Generated {request.duration}-minute lesson plan on {request.topic}",
            },
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== GRADING =====


@app.post("/api/grading/grade-worksheet")
async def grade_worksheet(request: GradeWorksheetRequest):
    """
    Grade a worksheet using AI analysis

    Lambda Function Name: lumix-grade-worksheet
    """
    try:
        result = await bedrock_service.grade_worksheet_with_ai(
            request.extracted_text, request.student_name
        )
        return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ===== AGENT ORCHESTRATION WITH STRANDS =====


class AgentChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None


@app.post("/api/agent/chat")
async def agent_chat(request: AgentChatRequest):
    """
    Agent chat endpoint - Bedrock AgentCore integration with Strands

    Lambda Function Name: lumix-agent-chat

    Uses Strands Agent SDK with Bedrock Nova model for intelligent orchestration
    """
    try:
        # Invoke the Lumix agent
        result = lumix_agent(request.message)

        # Extract action traces and tool results from the agent's execution
        action_traces = []
        worksheets = []  # Collect any worksheets created

        # Strands Agent SDK stores execution info differently
        # Check for tool_results attribute which contains actual tool outputs
        if hasattr(result, "tool_results") and result.tool_results:
            for tool_result in result.tool_results:
                trace_item = {
                    "tool": tool_result.get("name", "unknown"),
                    "input": tool_result.get("input", {}),
                    "output": tool_result.get("output", None),
                }
                action_traces.append(trace_item)

                # Extract worksheet data if this was a worksheet creation tool
                if tool_result.get("name") in ["create_worksheet", "create_lesson_with_worksheet"]:
                    output = tool_result.get("output", {})
                    if isinstance(output, dict) and output.get("success"):
                        worksheet_data = output.get("worksheet")
                        if worksheet_data:
                            worksheets.append(worksheet_data)

        # Fallback: Check tool_calls if tool_results not available
        elif hasattr(result, "tool_calls") and result.tool_calls:
            for tool_call in result.tool_calls:
                action_traces.append(
                    {
                        "tool": (
                            tool_call.name if hasattr(tool_call, "name") else "unknown"
                        ),
                        "input": (
                            tool_call.arguments
                            if hasattr(tool_call, "arguments")
                            else {}
                        ),
                        "output": None,  # Will be filled by tool execution
                    }
                )

        # Extract response text from the agent result
        response_text = ""
        if hasattr(result, 'message'):
            # Handle message dict with content array (Strands format)
            if isinstance(result.message, dict):
                content = result.message.get('content', [])
                if content and isinstance(content, list) and len(content) > 0:
                    response_text = content[0].get('text', str(result.message))
                else:
                    response_text = str(result.message)
            else:
                response_text = str(result.message)
        else:
            response_text = str(result)

        return {
            "success": True,
            "data": {
                "response": response_text,
                "conversation_id": request.conversation_id or "new-session",
                "action_traces": action_traces,
                "worksheets": worksheets,  # Return any created worksheets
                "sources": [],  # Can be populated from tool results
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Agent processing failed: {str(e)}"
        )


# ===== LAMBDA HANDLER =====

# Create Lambda handler using Mangum
handler = Mangum(app, lifespan="off")


# For local development
if __name__ == "__main__":

    uvicorn.run(app, host="0.0.0.0", port=8000)
