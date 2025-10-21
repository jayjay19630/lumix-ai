import { NextRequest, NextResponse } from "next/server";
import { getFileFromS3 } from "@/lib/aws/s3";
import { extractTextFromDocument } from "@/lib/aws/textract";
import {
  classifyQuestionTopic,
  generateQuestionExplanation,
} from "@/lib/aws/bedrock";
import { createQuestion } from "@/lib/aws/dynamodb";
import type { ApiResponse, Question } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileUrl, fileName } = body as {
      fileUrl: string;
      fileName: string;
    };

    if (!fileUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "File URL is required",
        } as ApiResponse,
        { status: 400 },
      );
    }

    // Extract S3 key from URL
    const urlParts = fileUrl.split("/");
    const s3Key = urlParts.slice(3).join("/"); // Remove https://bucket-name.s3.region.amazonaws.com/

    // Step 1: Get file from S3
    const fileBuffer = await getFileFromS3(s3Key);

    // Step 2: Extract text using Textract
    const textractResult = await extractTextFromDocument(
      new Uint8Array(fileBuffer),
    );

    console.log(
      `Extracted ${textractResult.questions.length} questions from document`,
    );

    // Step 3: Process each question with AI
    const processedQuestions: Question[] = [];

    for (const extractedQ of textractResult.questions) {
      try {
        // Classify topic and difficulty
        const classification = await classifyQuestionTopic(extractedQ.text);

        // Generate explanation and teaching tips
        const explanation = await generateQuestionExplanation(extractedQ.text);

        // Create question object
        const question: Question = {
          question_id: uuidv4(),
          text: extractedQ.text,
          topic: classification.topic,
          difficulty: classification.difficulty,
          source: fileName,
          explanation: explanation.explanation,
          teaching_tips: explanation.teaching_tips,
          times_used: 0,
          success_rate: 0,
          created_at: new Date().toISOString(),
        };

        // Save to DynamoDB
        await createQuestion(question);
        processedQuestions.push(question);

        console.log(
          `Processed question: ${question.topic} (${question.difficulty})`,
        );
      } catch (error) {
        console.error("Error processing individual question:", error);
        // Continue with next question even if one fails
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        questionCount: processedQuestions.length,
        questions: processedQuestions,
        extractedText: textractResult.extracted_text,
      },
    } as ApiResponse<{
      questionCount: number;
      questions: Question[];
      extractedText: string;
    }>);
  } catch (error) {
    console.error("Document processing error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process document",
      } as ApiResponse,
      { status: 500 },
    );
  }
}
