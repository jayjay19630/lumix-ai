import { NextResponse } from "next/server";
import { getAllQuestions } from "@/lib/aws/dynamodb";

export async function GET() {
  try {
    // Fetch all questions
    const questions = await getAllQuestions();

    // Extract unique topics
    const topicsSet = new Set<string>();
    questions.forEach((q) => {
      if (q.topic) {
        topicsSet.add(q.topic);
      }
    });

    // Convert to sorted array
    const topics = Array.from(topicsSet).sort();

    return NextResponse.json({
      topics,
      count: topics.length,
    });
  } catch (error) {
    console.error("Error fetching topics:", error);
    return NextResponse.json(
      { error: "Failed to fetch topics" },
      { status: 500 }
    );
  }
}
