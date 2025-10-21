import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import {
  getAllSessionSchedules,
  getSessionSchedulesByStudent,
  createSessionSchedule,
} from "@/lib/aws/dynamodb";
import type { RecurringSessionSchedule } from "@/lib/types";

/**
 * GET /api/session-schedules
 * Get all session schedules or filter by student_id
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const studentId = searchParams.get("student_id");

    let schedules: RecurringSessionSchedule[];

    if (studentId) {
      schedules = await getSessionSchedulesByStudent(studentId);
    } else {
      schedules = await getAllSessionSchedules();
    }

    return NextResponse.json({
      success: true,
      data: schedules,
    });
  } catch (error) {
    console.error("Error fetching session schedules:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch session schedules",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/session-schedules
 * Create a new session schedule
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, day_of_week, time, duration, focus_topics, is_active } =
      body;

    // Validate required fields
    if (!student_id || day_of_week === undefined || !time || !duration) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing required fields: student_id, day_of_week, time, duration",
        },
        { status: 400 },
      );
    }

    // Validate day_of_week is between 0-6
    if (day_of_week < 0 || day_of_week > 6) {
      return NextResponse.json(
        {
          success: false,
          error: "day_of_week must be between 0 (Sunday) and 6 (Saturday)",
        },
        { status: 400 },
      );
    }

    const now = new Date().toISOString();
    const schedule: RecurringSessionSchedule = {
      schedule_id: uuidv4(),
      student_id,
      day_of_week,
      time,
      duration,
      focus_topics: focus_topics || [],
      is_active: is_active !== undefined ? is_active : true,
      created_at: now,
      updated_at: now,
    };

    await createSessionSchedule(schedule);

    return NextResponse.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    console.error("Error creating session schedule:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create session schedule",
      },
      { status: 500 },
    );
  }
}
