import { NextRequest, NextResponse } from "next/server";
import {
  getStudent,
  updateStudent,
  createGradeHistory,
} from "@/lib/aws/dynamodb";
import { extractDocumentText, gradeWorksheet as aiGradeWorksheet } from "@/lib/ai-service-client";
import { uploadToS3 } from "@/lib/aws/s3";
import { v4 as uuidv4 } from "uuid";
import type { GradeHistory } from "@/lib/types";

// POST /api/students/[id]/grade - Grade a worksheet
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: studentId } = await params;

    // Get student
    const student = await getStudent(studentId);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get("worksheet") as File;
    const lessonPlanId = formData.get("lesson_plan_id") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Worksheet file is required" },
        { status: 400 },
      );
    }

    // Upload original worksheet to S3
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    const uploadKey = `worksheets/graded/${studentId}/${Date.now()}-${file.name}`;
    const worksheetUrl = await uploadToS3(buffer, uploadKey, file.type);

    // Extract text using AI Service (Textract + AI parsing)
    const textractResult = await extractDocumentText(file);

    // Grade the worksheet using AI Service
    const gradingResult = await aiGradeWorksheet(
      textractResult.extracted_text,
      student.name,
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
        (currentAccuracy * currentCount + newAccuracy) / (currentCount + 1),
      );
    });

    // Update student
    await updateStudent(studentId, {
      accuracy: updatedAccuracy,
      last_session: new Date().toISOString(),
    });

    // Create grade history record
    const gradeHistory: GradeHistory = {
      grade_history_id: uuidv4(),
      student_id: studentId,
      lesson_plan_id: lessonPlanId || undefined,
      date: new Date().toISOString(),
      duration: 0, // Can be filled later
      topics_covered: [
        ...new Set(gradingResult.question_results.map((r) => r.topic)),
      ],
      questions_attempted: gradingResult.question_results.map(
        (r) => r.question_id,
      ),
      score: gradingResult.score,
      graded_worksheet_url: worksheetUrl,
      grading_result: gradingResult, // Save full grading details
      agent_insights: gradingResult.insights,
      created_at: new Date().toISOString(),
    };

    await createGradeHistory(gradeHistory);

    return NextResponse.json({
      grading_result: gradingResult,
      gradeHistory,
      updated_accuracy: updatedAccuracy,
      message: "Worksheet graded successfully",
    });
  } catch (error) {
    console.error("Error grading worksheet:", error);
    return NextResponse.json(
      { error: "Failed to grade worksheet" },
      { status: 500 },
    );
  }
}

// AI grading logic moved to AI Service (Python FastAPI)
