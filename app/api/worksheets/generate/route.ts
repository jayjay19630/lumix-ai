import { NextRequest, NextResponse } from "next/server";
import { queryQuestions } from "@/lib/aws/dynamodb";
import { invokeNovaModel } from "@/lib/aws/bedrock";

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

interface Question {
  question_id: string;
  text: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  explanation?: string;
  teaching_tips?: string;
}

export async function POST(request: NextRequest) {
  try {
    const criteria: WorksheetCriteria = await request.json();

    // Validate criteria
    if (!criteria.topics || criteria.topics.length === 0) {
      return NextResponse.json(
        { error: "At least one topic is required" },
        { status: 400 }
      );
    }

    if (!criteria.difficulty || criteria.difficulty.length === 0) {
      return NextResponse.json(
        { error: "At least one difficulty level is required" },
        { status: 400 }
      );
    }

    // Fetch all questions from DynamoDB
    const allQuestions = await queryQuestions();

    // Filter questions based on criteria
    let filteredQuestions = allQuestions.filter(
      (q) =>
        criteria.topics.includes(q.topic) &&
        criteria.difficulty.includes(q.difficulty)
    );

    if (filteredQuestions.length === 0) {
      return NextResponse.json(
        {
          error:
            "No questions found matching your criteria. Try adjusting your filters.",
        },
        { status: 404 }
      );
    }

    // Use AI to intelligently select questions
    const selectedQuestions = await selectQuestionsWithAI(
      filteredQuestions,
      criteria
    );

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
      { status: 500 }
    );
  }
}

/**
 * Use AI to intelligently select and order questions
 */
async function selectQuestionsWithAI(
  questions: Question[],
  criteria: WorksheetCriteria
): Promise<Question[]> {
  try {
    // If we have fewer questions than requested, return all
    if (questions.length <= criteria.questionCount) {
      return questions;
    }

    // Build a prompt for AI to select the best questions
    const questionsJson = questions.map((q, idx) => ({
      index: idx,
      topic: q.topic,
      difficulty: q.difficulty,
      preview: q.text.substring(0, 100),
    }));

    const prompt = `You are an expert math tutor creating a worksheet. Select the best ${criteria.questionCount} questions from the following list to create a well-balanced, pedagogically sound worksheet.

Criteria:
- Topics: ${criteria.topics.join(", ")}
- Difficulty levels: ${criteria.difficulty.join(", ")}
- Total questions needed: ${criteria.questionCount}
${
  criteria.sections
    ? `- Sections: Warm-up (${criteria.sections.warmup || 0}), Practice (${
        criteria.sections.practice || 0
      }), Challenge (${criteria.sections.challenge || 0})`
    : ""
}

Available Questions:
${JSON.stringify(questionsJson, null, 2)}

Select questions that:
1. Provide good topic variety
2. Have appropriate difficulty progression
3. Avoid redundancy
4. Create a balanced learning experience
${
  criteria.sections
    ? `5. Match the section requirements (easier questions for warm-up, harder for challenge)`
    : ""
}

Respond with a JSON array of the selected question indices in the order they should appear in the worksheet:
{
  "selectedIndices": [0, 5, 12, ...]
}

Only return valid JSON, no additional text.`;

    const response = await invokeNovaModel({
      prompt,
      temperature: 0.5,
      maxTokens: 2048,
    });

    const parsed = JSON.parse(response.trim());

    if (parsed.selectedIndices && Array.isArray(parsed.selectedIndices)) {
      const selected = parsed.selectedIndices
        .slice(0, criteria.questionCount)
        .map((idx: number) => questions[idx])
        .filter((q: Question | undefined) => q !== undefined);

      if (selected.length > 0) {
        return selected;
      }
    }

    // Fallback to simple random selection if AI fails
    return selectQuestionsRandomly(questions, criteria.questionCount);
  } catch (error) {
    console.error("Error selecting questions with AI:", error);
    // Fallback to random selection
    return selectQuestionsRandomly(questions, criteria.questionCount);
  }
}

/**
 * Fallback: Randomly select questions
 */
function selectQuestionsRandomly(
  questions: Question[],
  count: number
): Question[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
