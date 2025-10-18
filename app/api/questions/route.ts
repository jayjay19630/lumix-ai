import { NextRequest, NextResponse } from "next/server";
import { getAllQuestions } from "@/lib/aws/dynamodb";
import type { ApiResponse, Question } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const questions = await getAllQuestions();

    return NextResponse.json({
      success: true,
      data: {
        questions,
        count: questions.length,
      },
    } as ApiResponse<{ questions: Question[]; count: number }>);
  } catch (error) {
    console.error("Error fetching questions:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch questions",
      } as ApiResponse,
      { status: 500 }
    );
  }
}
