import { NextRequest, NextResponse } from "next/server";
import {
  getAllSessions,
  getSessionsByDateRange,
  getSessionsByStudent,
  createSession,
  deleteSession,
} from "@/lib/aws/dynamodb";
import { generateSessionsFromSchedules } from "@/lib/sessions/generator";
import { v4 as uuidv4 } from "uuid";
import type { Session } from "@/lib/types";

// GET /api/sessions - Get sessions with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const generate = searchParams.get("generate"); // Flag to auto-generate sessions

    // Auto-generate sessions if requested
    if (generate === "true" && startDate && endDate) {
      await generateSessionsFromSchedules(startDate, endDate);
    }

    let sessions: Session[];

    if (studentId) {
      sessions = await getSessionsByStudent(studentId);
    } else if (startDate && endDate) {
      sessions = await getSessionsByDateRange(startDate, endDate);
    } else {
      sessions = await getAllSessions();
    }

    // Sort by date and time
    sessions.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    return NextResponse.json({
      data: sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 },
    );
  }
}

// POST /api/sessions - Create a new session manually
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { student_id, date, time, duration, notes } = body;

    // Validate required fields
    if (!student_id || !date || !time || !duration) {
      return NextResponse.json(
        { error: "Missing required fields: student_id, date, time, duration" },
        { status: 400 },
      );
    }

    // Generate session ID
    const dateStr = date.replace(/-/g, "");
    const sessionId = `sess_${dateStr}_${student_id}_${uuidv4().substring(0, 8)}`;

    const session: Session = {
      session_id: sessionId,
      student_id,
      date,
      time,
      duration: parseInt(duration),
      notes,
      created_by: "manual",
      created_at: new Date().toISOString(),
    };

    const createdSession = await createSession(session);

    return NextResponse.json({
      session: createdSession,
      message: "Session created successfully",
    });
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 },
    );
  }
}

// DELETE /api/sessions?id=... - Delete a session
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id");

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 },
      );
    }

    await deleteSession(sessionId);

    return NextResponse.json({
      message: "Session deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 },
    );
  }
}
