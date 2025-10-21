import { NextRequest, NextResponse } from "next/server";
import {
  getAllLessonPlans,
  getLessonPlansByStudent,
  createLessonPlan,
  updateSession,
} from "@/lib/aws/dynamodb";
import type { LessonPlan } from "@/lib/types";

// GET /api/lessons - Get all lesson plans or filter by student
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");

    let lessonPlans: LessonPlan[];

    if (studentId) {
      lessonPlans = await getLessonPlansByStudent(studentId);
    } else {
      lessonPlans = await getAllLessonPlans();
    }

    return NextResponse.json({
      success: true,
      data: lessonPlans,
    });
  } catch (error) {
    console.error("Error fetching lesson plans:", error);
    return NextResponse.json(
      { error: "Failed to fetch lesson plans" },
      { status: 500 }
    );
  }
}

// POST /api/lessons - Create a new manual lesson plan
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      session_id,
      student_id,
      date,
      duration,
      focus_topics,
      worksheet_id,
      teaching_notes,
    } = body;

    // Validate required fields
    if (!session_id || !student_id || !date || !duration || !teaching_notes) {
      return NextResponse.json(
        {
          error:
            "session_id, student_id, date, duration, and teaching_notes are required",
        },
        { status: 400 }
      );
    }

    // Create lesson plan
    const lessonPlanId = `lp_${Date.now()}_${student_id}`;
    const lessonPlan: LessonPlan = {
      lesson_plan_id: lessonPlanId,
      session_id,
      student_id,
      date,
      duration,
      created_by: "manual",
      focus_topics: focus_topics || [],
      worksheet_id: worksheet_id || undefined,
      teaching_notes,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await createLessonPlan(lessonPlan);

    // Update session with lesson_plan_id
    await updateSession(session_id, {
      lesson_plan_id: lessonPlanId,
    });

    return NextResponse.json({
      success: true,
      data: lessonPlan,
    });
  } catch (error) {
    console.error("Error creating lesson plan:", error);
    return NextResponse.json(
      { error: "Failed to create lesson plan" },
      { status: 500 }
    );
  }
}
