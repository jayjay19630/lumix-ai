import { NextRequest, NextResponse } from "next/server";
import { getSession, updateSession } from "@/lib/aws/dynamodb";
import { createLessonPlan } from "@/lib/aws/dynamodb";
import { generateLessonPlan as aiGenerateLessonPlan } from "@/lib/ai-service-client";
import type { LessonPlan } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, topic } = body;

    // Validate required fields
    if (!session_id || !topic) {
      return NextResponse.json(
        { error: "session_id and topic are required" },
        { status: 400 },
      );
    }

    // Get session data
    const session = await getSession(session_id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Call AI Service to generate lesson plan
    const aiResult = await aiGenerateLessonPlan(
      topic,
      session.duration,
      session.student_id,
    );

    // Create lesson plan record
    const lessonPlanId = `lp_${Date.now()}_${session.student_id}`;
    const lessonPlan: LessonPlan = {
      lesson_plan_id: lessonPlanId,
      session_id: session.session_id,
      student_id: session.student_id,
      date: session.date,
      duration: session.duration,
      created_by: "ai",
      generation_mode: "ai-service",
      focus_topics: [topic],
      teaching_notes: aiResult.teaching_notes,
      ai_reasoning: aiResult.ai_reasoning,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save lesson plan
    await createLessonPlan(lessonPlan);

    // Update session with lesson_plan_id
    await updateSession(session.session_id, {
      lesson_plan_id: lessonPlanId,
    });

    return NextResponse.json({
      success: true,
      data: lessonPlan,
    });
  } catch (error) {
    console.error("Error generating lesson plan:", error);
    return NextResponse.json(
      { error: "Failed to generate lesson plan" },
      { status: 500 },
    );
  }
}
