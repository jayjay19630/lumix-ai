import { NextRequest, NextResponse } from "next/server";
import { getStudent, updateStudent, createSession } from "@/lib/aws/dynamodb";
import { extractTextFromDocument } from "@/lib/aws/textract";
import { invokeNovaModel } from "@/lib/aws/bedrock";
import { uploadToS3 } from "@/lib/aws/s3";
import { v4 as uuidv4 } from "uuid";
import type { GradingResult, Session } from "@/lib/types";

// POST /api/students/[id]/grade - Grade a worksheet
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;

    // Get student
    const student = await getStudent(studentId);
    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("worksheet") as File;
    const lessonPlanId = formData.get("lesson_plan_id") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Worksheet file is required" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload original worksheet to S3
    const uploadKey = `worksheets/graded/${studentId}/${Date.now()}-${file.name}`;
    const worksheetUrl = await uploadToS3(buffer, uploadKey, file.type);

    // Extract text using Textract
    const textractResult = await extractTextFromDocument(buffer);

    // Use AI to grade the worksheet
    const gradingResult = await gradeWorksheetWithAI(
      textractResult.extracted_text,
      student.name
    );

    // Update student accuracy based on grading results
    const updatedAccuracy = { ...student.accuracy };

    // Calculate new accuracy for each topic
    gradingResult.question_results.forEach((result) => {
      const topic = result.topic;
      const currentAccuracy = updatedAccuracy[topic] || 0;
      const currentCount = student.accuracy[topic] ? 1 : 0; // Simplified - should track counts

      // Simple moving average (can be enhanced)
      const newAccuracy = result.is_correct ? 100 : 0;
      updatedAccuracy[topic] = Math.round(
        (currentAccuracy * currentCount + newAccuracy) / (currentCount + 1)
      );
    });

    // Update student
    await updateStudent(studentId, {
      accuracy: updatedAccuracy,
      last_session: new Date().toISOString(),
    });

    // Create session record
    const session: Session = {
      session_id: uuidv4(),
      student_id: studentId,
      lesson_plan_id: lessonPlanId || undefined,
      date: new Date().toISOString(),
      duration: 0, // Can be filled later
      topics_covered: [
        ...new Set(gradingResult.question_results.map((r) => r.topic)),
      ],
      questions_attempted: gradingResult.question_results.map(
        (r) => r.question_id
      ),
      score: gradingResult.score,
      graded_worksheet_url: worksheetUrl,
      grading_result: gradingResult, // Save full grading details
      agent_insights: gradingResult.insights,
      created_at: new Date().toISOString(),
    };

    await createSession(session);

    return NextResponse.json({
      grading_result: gradingResult,
      session,
      updated_accuracy: updatedAccuracy,
      message: "Worksheet graded successfully",
    });
  } catch (error) {
    console.error("Error grading worksheet:", error);
    return NextResponse.json(
      { error: "Failed to grade worksheet" },
      { status: 500 }
    );
  }
}

/**
 * Strip markdown code blocks from response
 */
function stripMarkdownCodeBlocks(text: string): string {
  // Remove markdown code blocks like ```json ... ```
  let cleaned = text.trim();

  // Check if text starts with ```json or ``` and ends with ```
  if (cleaned.startsWith("```")) {
    // Remove opening ```json or ```
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "");
    // Remove closing ```
    cleaned = cleaned.replace(/\n?```\s*$/, "");
  }

  return cleaned.trim();
}

/**
 * Use AI to grade worksheet from extracted text
 */
async function gradeWorksheetWithAI(
  extractedText: string,
  studentName: string
): Promise<GradingResult> {
  try {
    const prompt = `You are an expert math tutor grading a student's worksheet. The student's name is ${studentName}.

Extracted Text from Worksheet:
${extractedText}

Analyze this worksheet and provide grading results. For each question:
1. Identify the question and the student's answer
2. Determine the topic (e.g., Quadratic Equations, Trigonometry, etc.)
3. Check if the answer is correct
4. Provide brief feedback

Also identify the student's weaknesses and provide insights for improvement.

Respond with this exact JSON format:
{
  "total_questions": 10,
  "correct_answers": 7,
  "score": "7/10",
  "question_results": [
    {
      "question_id": "q1",
      "question_text": "The actual question text",
      "topic": "Quadratic Equations",
      "is_correct": true,
      "student_answer": "x = 2, 3",
      "correct_answer": "x = 2, 3",
      "feedback": "Excellent work!"
    }
  ],
  "weaknesses": ["Topic 1", "Topic 2"],
  "insights": "Overall insights and recommendations for the student..."
}

Only return valid JSON, no additional text.`;

    const response = await invokeNovaModel({
      prompt,
      temperature: 0.3,
      maxTokens: 4096,
    });

    // Strip markdown code blocks if present
    const cleanedResponse = stripMarkdownCodeBlocks(response);
    const parsed = JSON.parse(cleanedResponse);
    return parsed;
  } catch (error) {
    console.error("Error grading with AI:", error);
    // Return default grading result if AI fails
    return {
      total_questions: 0,
      correct_answers: 0,
      score: "0/0",
      question_results: [],
      weaknesses: [],
      insights: "Unable to grade worksheet automatically. Please review manually.",
    };
  }
}
