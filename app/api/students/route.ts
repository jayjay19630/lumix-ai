import { NextRequest, NextResponse } from "next/server";
import { getAllStudents, createStudent } from "@/lib/aws/dynamodb";
import { v4 as uuidv4 } from "uuid";
import type { Student } from "@/lib/types";

// GET /api/students - List all students
export async function GET() {
  try {
    const students = await getAllStudents();
    return NextResponse.json({
      students,
      total: students.length,
    });
  } catch (error) {
    console.error("Error fetching students:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    );
  }
}

// POST /api/students - Create a new student
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, grade, email, phone, schedule } = body;

    // Validate required fields
    if (!name || !grade) {
      return NextResponse.json(
        { error: "Name and grade are required" },
        { status: 400 }
      );
    }

    // Create new student object
    const newStudent: Student = {
      student_id: uuidv4(),
      name,
      grade,
      email: email || undefined,
      phone: phone || undefined,
      accuracy: {}, // Empty initially
      schedule: schedule || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save to DynamoDB
    const savedStudent = await createStudent(newStudent);

    return NextResponse.json(
      {
        student: savedStudent,
        message: "Student created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating student:", error);
    return NextResponse.json(
      { error: "Failed to create student" },
      { status: 500 }
    );
  }
}
