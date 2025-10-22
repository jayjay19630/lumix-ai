import { NextRequest, NextResponse } from "next/server";
import { queryQuestions } from "@/lib/aws/dynamodb";
import { selectQuestionsWithAI as aiSelectQuestions } from "@/lib/ai-service-client";

interface WorksheetCriteria {
  title: string;
  studentId?: string;
  studentName?: string;
  topics: string[];
  difficulty: ("Easy" | "Medium" | "Hard")[];
  questionCount: number;
  includeAnswerKey: boolean;
  sections?: {
    warmup?: number;
    practice?: number;
    challenge?: number;
  };
}

// Commenting out unused interface - using Question type from dynamodb
// interface Question {
//   question_id: string;
//   text: string;
//   topic: string;
//   difficulty: "Easy" | "Medium" | "Hard";
//   explanation?: string;
//   teaching_tips?: string;
// }

export async function POST(request: NextRequest) {
  try {
    const criteria: WorksheetCriteria = await request.json();

    // Validate criteria
    if (!criteria.topics || criteria.topics.length === 0) {
      return NextResponse.json(
        { error: "At least one topic is required" },
        { status: 400 },
      );
    }

    if (!criteria.difficulty || criteria.difficulty.length === 0) {
      return NextResponse.json(
        { error: "At least one difficulty level is required" },
        { status: 400 },
      );
    }

    // Fetch all questions from DynamoDB
    const allQuestions = await queryQuestions();

    // Filter questions based on criteria
    const filteredQuestions = allQuestions.filter(
      (q) =>
        criteria.topics.includes(q.topic) &&
        criteria.difficulty.includes(q.difficulty),
    );

    if (filteredQuestions.length === 0) {
      return NextResponse.json(
        {
          error:
            "No questions found matching your criteria. Try adjusting your filters.",
        },
        { status: 404 },
      );
    }

    // Use AI Service to intelligently select questions
    const selectedIndices = await aiSelectQuestions(filteredQuestions, criteria);

    // Map indices to actual questions
    const selectedQuestions = selectedIndices
      .map((idx) => filteredQuestions[idx])
      .filter((q) => q !== undefined);

    // Format questions for PDF generation
    const formattedQuestions = selectedQuestions.map((q) => ({
      id: q.question_id,
      text: q.text,
      topic: q.topic,
      difficulty: q.difficulty,
    }));

    return NextResponse.json({
      questions: formattedQuestions,
      total: formattedQuestions.length,
    });
  } catch (error) {
    console.error("Error generating worksheet:", error);
    return NextResponse.json(
      { error: "Failed to generate worksheet" },
      { status: 500 },
    );
  }
}

/**
 * Fallback: Randomly select questions
 * Currently unused but kept for potential future use
 */
// function selectQuestionsRandomly(
//   questions: Question[],
//   count: number,
// ): Question[] {
//   const shuffled = [...questions].sort(() => Math.random() - 0.5);
//   return shuffled.slice(0, count);
// }
