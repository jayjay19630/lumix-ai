import { NextRequest, NextResponse } from "next/server";
import {
  getAllWorksheets,
  getWorksheetsByStudent,
  deleteWorksheet,
} from "@/lib/aws/dynamodb";

// GET /api/worksheets - Get all worksheets or by student
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("student_id");

    let worksheets;
    if (studentId) {
      worksheets = await getWorksheetsByStudent(studentId);
    } else {
      worksheets = await getAllWorksheets();
    }

    // Sort by created_at descending (most recent first)
    worksheets.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return NextResponse.json({
      data: worksheets,
      count: worksheets.length,
    });
  } catch (error) {
    console.error("Error fetching worksheets:", error);
    return NextResponse.json(
      { error: "Failed to fetch worksheets" },
      { status: 500 },
    );
  }
}

// DELETE /api/worksheets?id=... - Delete a worksheet
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const worksheetId = searchParams.get("id");

    if (!worksheetId) {
      return NextResponse.json(
        { error: "Worksheet ID is required" },
        { status: 400 },
      );
    }

    await deleteWorksheet(worksheetId);

    return NextResponse.json({
      message: "Worksheet deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting worksheet:", error);
    return NextResponse.json(
      { error: "Failed to delete worksheet" },
      { status: 500 },
    );
  }
}
