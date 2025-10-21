import { NextRequest, NextResponse } from "next/server";
import {
  extractDocumentFromS3,
  classifyQuestion,
  generateQuestionExplanation,
} from "@/lib/ai-service-client";
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

    // Extract S3 bucket and key from URL
    let bucket: string;
    let s3Key: string;
    try {
      const url = new URL(fileUrl);
      // Extract bucket from hostname (e.g., bucket-name.s3.region.amazonaws.com)
      bucket = url.hostname.split(".")[0];
      // Remove leading slash
      s3Key = url.pathname.substring(1);
    } catch {
      // Fallback: use environment variable for bucket
      bucket = process.env.S3_BUCKET_NAME || "lumix-uploads";
      s3Key = fileUrl;
    }

    // Call AI Service to extract text and parse questions using Textract + AI
    const textractResult = await extractDocumentFromS3(bucket, s3Key);

    console.log(
      `Extracted ${textractResult.questions.length} questions from document`,
    );

    // Process each question with AI Service
    const processedQuestions: Question[] = [];

    for (const extractedQ of textractResult.questions) {
      try {
        // Classify topic and difficulty using AI Service
        const classification = await classifyQuestion(extractedQ.text);

        // Generate explanation and teaching tips using AI Service
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
