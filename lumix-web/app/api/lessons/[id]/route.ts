import { NextRequest, NextResponse } from "next/server";
import {
  getLessonPlan,
  updateLessonPlan,
  deleteLessonPlan,
} from "@/lib/aws/dynamodb";

// GET /api/lessons/[id] - Get a specific lesson plan
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const lessonPlan = await getLessonPlan(params.id);

    if (!lessonPlan) {
      return NextResponse.json(
        { error: "Lesson plan not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: lessonPlan,
    });
  } catch (error) {
    console.error("Error fetching lesson plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch lesson plan" },
      { status: 500 },
    );
  }
}

// PUT /api/lessons/[id] - Update a lesson plan
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const body = await request.json();
    const { focus_topics, worksheet_id, teaching_notes } = body;

    // Validate at least one field to update
    if (!focus_topics && !worksheet_id && !teaching_notes) {
      return NextResponse.json(
        { error: "At least one field must be provided for update" },
        { status: 400 },
      );
    }

    // Build updates object
    const updates: Record<string, unknown> = {};
    if (focus_topics !== undefined) updates.focus_topics = focus_topics;
    if (worksheet_id !== undefined) updates.worksheet_id = worksheet_id;
    if (teaching_notes !== undefined) updates.teaching_notes = teaching_notes;

    const updatedLessonPlan = await updateLessonPlan(params.id, updates);

    return NextResponse.json({
      success: true,
      data: updatedLessonPlan,
    });
  } catch (error) {
    console.error("Error updating lesson plan:", error);
    return NextResponse.json(
      { error: "Failed to update lesson plan" },
      { status: 500 },
    );
  }
}

// DELETE /api/lessons/[id] - Delete a lesson plan
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await deleteLessonPlan(params.id);

    return NextResponse.json({
      success: true,
      message: "Lesson plan deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting lesson plan:", error);
    return NextResponse.json(
      { error: "Failed to delete lesson plan" },
      { status: 500 },
    );
  }
}
