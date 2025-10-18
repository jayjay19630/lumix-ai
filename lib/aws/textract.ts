import {
  TextractClient,
  DetectDocumentTextCommand,
  DetectDocumentTextCommandInput,
  Block,
} from "@aws-sdk/client-textract";
import type { TextractResult, ExtractedQuestion } from "../types";

// Initialize Textract Client
const textractClient = new TextractClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

/**
 * Extract text from document using AWS Textract
 */
export async function extractTextFromDocument(
  documentBytes: Uint8Array
): Promise<TextractResult> {
  try {
    const input: DetectDocumentTextCommandInput = {
      Document: {
        Bytes: documentBytes,
      },
    };

    const command = new DetectDocumentTextCommand(input);
    const response = await textractClient.send(command);

    // Extract all text blocks
    const blocks = response.Blocks || [];
    const textBlocks = blocks.filter(
      (block) => block.BlockType === "LINE" && block.Text
    );

    // Combine all text
    const extractedText = textBlocks.map((block) => block.Text).join("\n");

    // Parse questions from text
    const questions = parseQuestionsFromText(extractedText, blocks);

    return {
      extracted_text: extractedText,
      questions,
    };
  } catch (error) {
    console.error("Error extracting text from document:", error);
    throw error;
  }
}

/**
 * Parse individual questions from extracted text
 * This is a simple implementation - can be enhanced with more sophisticated logic
 */
function parseQuestionsFromText(
  text: string,
  blocks: Block[]
): ExtractedQuestion[] {
  const questions: ExtractedQuestion[] = [];

  // Split by common question patterns (e.g., "1.", "Q1:", etc.)
  const questionPattern = /(?:^|\n)(?:Q?\d+[\.\):]|\([a-z]\))\s*(.+?)(?=(?:^|\n)(?:Q?\d+[\.\):]|\([a-z]\))|$)/gis;

  const matches = text.matchAll(questionPattern);

  for (const match of matches) {
    const questionText = match[1]?.trim();
    if (questionText && questionText.length > 10) {
      // Filter out very short matches
      questions.push({
        text: questionText,
        confidence: 0.9, // Default confidence
      });
    }
  }

  // If no questions found with pattern, try to split by double newlines
  if (questions.length === 0) {
    const paragraphs = text.split(/\n\n+/);
    paragraphs.forEach((paragraph) => {
      const trimmed = paragraph.trim();
      if (trimmed.length > 20) {
        questions.push({
          text: trimmed,
          confidence: 0.7,
        });
      }
    });
  }

  return questions;
}

/**
 * Extract text from S3 document
 */
export async function extractTextFromS3Document(
  bucket: string,
  key: string
): Promise<TextractResult> {
  try {
    const input: DetectDocumentTextCommandInput = {
      Document: {
        S3Object: {
          Bucket: bucket,
          Name: key,
        },
      },
    };

    const command = new DetectDocumentTextCommand(input);
    const response = await textractClient.send(command);

    const blocks = response.Blocks || [];
    const textBlocks = blocks.filter(
      (block) => block.BlockType === "LINE" && block.Text
    );

    const extractedText = textBlocks.map((block) => block.Text).join("\n");
    const questions = parseQuestionsFromText(extractedText, blocks);

    return {
      extracted_text: extractedText,
      questions,
    };
  } catch (error) {
    console.error("Error extracting text from S3 document:", error);
    throw error;
  }
}

/**
 * Extract answers from graded worksheet
 */
export async function extractAnswersFromWorksheet(
  documentBytes: Uint8Array
): Promise<{ answers: string[]; rawText: string }> {
  try {
    const result = await extractTextFromDocument(documentBytes);

    // Simple answer extraction - can be enhanced
    const answerPattern = /(?:Answer|Ans)[:\s]+(.+?)(?=\n|$)/gi;
    const matches = result.extracted_text.matchAll(answerPattern);

    const answers: string[] = [];
    for (const match of matches) {
      if (match[1]) {
        answers.push(match[1].trim());
      }
    }

    return {
      answers,
      rawText: result.extracted_text,
    };
  } catch (error) {
    console.error("Error extracting answers from worksheet:", error);
    throw error;
  }
}

export { textractClient };
