import {
  TextractClient,
  DetectDocumentTextCommand,
  DetectDocumentTextCommandInput,
} from "@aws-sdk/client-textract";
import type { TextractResult, ExtractedQuestion } from "../types";
import { invokeNovaModel } from "./bedrock";

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
  documentBytes: Uint8Array,
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
      (block) => block.BlockType === "LINE" && block.Text,
    );

    // Combine all text
    const extractedText = textBlocks.map((block) => block.Text).join("\n");

    // Parse questions from text using AI
    const questions = await parseQuestionsWithAI(extractedText);

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
 * Parse individual questions from extracted text using AI
 * Handles unstructured text and complex question formats
 */
async function parseQuestionsWithAI(
  text: string,
): Promise<ExtractedQuestion[]> {
  // If text is empty or too short, return empty array
  if (!text || text.trim().length < 20) {
    return [];
  }

  try {
    const prompt = `You are an expert at parsing math questions from extracted text. The text below was extracted from a PDF or image and may be unstructured, contain OCR errors, or have questions in various formats.

Your task is to:
1. Identify individual questions in the text
2. Clean up OCR errors if present
3. Preserve the original question text as accurately as possible
4. Handle both numbered (1., 2., etc.) and unnumbered questions
5. Include multi-part questions as a single question

Extracted Text:
${text}

Respond with a JSON array of questions in this exact format:
[
  {
    "text": "The complete question text, cleaned and formatted",
    "confidence": 0.95
  }
]

Guidelines:
- If questions are clearly numbered (1., 2., Q1:, etc.), split by those markers
- If text is unstructured, use context clues to identify separate questions
- Confidence should be 0.9-1.0 for clearly formatted questions, 0.7-0.9 for unstructured questions
- Exclude headers, instructions, or non-question content
- If no valid questions found, return an empty array []

Only return valid JSON, no additional text.`;

    const response = await invokeNovaModel({
      prompt,
      temperature: 0.3, // Low temperature for more consistent parsing
      maxTokens: 4096,
    });

    // Parse the AI response
    const parsed = JSON.parse(response.trim());

    // Validate the response structure
    if (Array.isArray(parsed)) {
      return parsed.filter((q: unknown): q is ExtractedQuestion => {
        const question = q as { text?: unknown; confidence?: unknown };
        return (
          question.text !== undefined &&
          typeof question.text === "string" &&
          question.text.length > 10 &&
          question.confidence !== undefined &&
          typeof question.confidence === "number"
        );
      });
    }

    console.warn("AI returned non-array response, falling back to regex");
    return fallbackParseQuestions(text);
  } catch (error) {
    console.error("Error parsing questions with AI:", error);
    // Fallback to simple regex parsing
    return fallbackParseQuestions(text);
  }
}

/**
 * Fallback question parsing using regex patterns
 * Used when AI parsing fails
 */
function fallbackParseQuestions(text: string): ExtractedQuestion[] {
  const questions: ExtractedQuestion[] = [];

  // Split by common question patterns
  const questionPattern =
    /(?:^|\n)(?:Q?\d+[\.\):]|\([a-z]\))\s*(.+?)(?=(?:^|\n)(?:Q?\d+[\.\):]|\([a-z]\))|$)/gi;
  const matches = Array.from(text.matchAll(questionPattern));

  for (const match of matches) {
    const questionText = match[1]?.trim();
    if (questionText && questionText.length > 10) {
      questions.push({
        text: questionText,
        confidence: 0.7,
      });
    }
  }

  // If no questions found, split by double newlines
  if (questions.length === 0) {
    const paragraphs = text.split(/\n\n+/);
    paragraphs.forEach((paragraph) => {
      const trimmed = paragraph.trim();
      if (trimmed.length > 20) {
        questions.push({
          text: trimmed,
          confidence: 0.5,
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
  key: string,
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
      (block) => block.BlockType === "LINE" && block.Text,
    );

    const extractedText = textBlocks.map((block) => block.Text).join("\n");
    const questions = await parseQuestionsWithAI(extractedText);

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
  documentBytes: Uint8Array,
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
