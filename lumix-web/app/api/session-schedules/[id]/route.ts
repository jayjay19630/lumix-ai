import { NextRequest, NextResponse } from "next/server";
import {
  getSessionSchedule,
  updateSessionSchedule,
  deleteSessionSchedule,
} from "@/lib/aws/dynamodb";
import type { RecurringSessionSchedule } from "@/lib/types";

/**
 * GET /api/session-schedules/[id]
 * Get a specific session schedule by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const schedule = await getSessionSchedule(id);

    if (!schedule) {
      return NextResponse.json(
        {
          success: false,
          error: "Session schedule not found",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error("Error fetching session schedule:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch session schedule",
      },
      { status: 500 },
    );
  }
}

/**
 * PATCH /api/session-schedules/[id]
 * Update a session schedule
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates: Partial<RecurringSessionSchedule> = {};

    // Only include fields that are provided
    if (body.day_of_week !== undefined) {
      if (body.day_of_week < 0 || body.day_of_week > 6) {
        return NextResponse.json(
          {
            success: false,
            error: "day_of_week must be between 0 (Sunday) and 6 (Saturday)",
          },
          { status: 400 },
        );
      }
      updates.day_of_week = body.day_of_week;
    }
    if (body.time) updates.time = body.time;
    if (body.duration) updates.duration = body.duration;
    if (body.focus_topics) updates.focus_topics = body.focus_topics;
    if (body.is_active !== undefined) updates.is_active = body.is_active;

    updates.updated_at = new Date().toISOString();

    const updatedSchedule = await updateSessionSchedule(id, updates);

    return NextResponse.json({
      success: true,
      data: updatedSchedule,
    });
  } catch (error) {
    console.error("Error updating session schedule:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update session schedule",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/session-schedules/[id]
 * Delete a session schedule
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await deleteSessionSchedule(id);

    return NextResponse.json({
      success: true,
      message: "Session schedule deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting session schedule:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete session schedule",
      },
      { status: 500 },
    );
  }
}
