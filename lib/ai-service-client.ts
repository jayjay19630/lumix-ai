/**
 * Client for Lumix AI Service (Python FastAPI)
 * Handles all AI-related operations: Bedrock, Textract, grading, etc.
 */

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || process.env.NEXT_PUBLIC_AI_SERVICE_URL || "http://localhost:8000";

interface AIServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Classify a question's topic and difficulty using AI
 */
export async function classifyQuestion(questionText: string): Promise<{
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  confidence: number;
}> {
  const response = await fetch(`${AI_SERVICE_URL}/api/questions/classify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question_text: questionText }),
  });

  if (!response.ok) {
    throw new Error(`AI Service error: ${response.statusText}`);
  }

  const result: AIServiceResponse<{
    topic: string;
    difficulty: "Easy" | "Medium" | "Hard";
    confidence: number;
  }> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to classify question");
  }

  return result.data;
}

/**
 * Generate explanation and teaching tips for a question using AI
 */
export async function generateQuestionExplanation(questionText: string): Promise<{
  explanation: string;
  teaching_tips: string;
}> {
  const response = await fetch(`${AI_SERVICE_URL}/api/questions/explain`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question_text: questionText }),
  });

  if (!response.ok) {
    throw new Error(`AI Service error: ${response.statusText}`);
  }

  const result: AIServiceResponse<{
    explanation: string;
    teaching_tips: string;
  }> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to generate explanation");
  }

  return result.data;
}

/**
 * Select questions intelligently using AI
 */
export async function selectQuestionsWithAI(
  questions: Array<{ text: string; topic: string; difficulty: string }>,
  criteria: {
    topics: string[];
    difficulty: string[];
    questionCount: number;
    sections?: {
      warmup?: number;
      practice?: number;
      challenge?: number;
    };
  },
): Promise<number[]> {
  const response = await fetch(`${AI_SERVICE_URL}/api/questions/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions, criteria }),
  });

  if (!response.ok) {
    throw new Error(`AI Service error: ${response.statusText}`);
  }

  const result: AIServiceResponse<{ selectedIndices: number[] }> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to select questions");
  }

  return result.data.selectedIndices;
}

/**
 * Extract text and parse questions from a document using Textract + AI
 */
export async function extractDocumentText(file: File): Promise<{
  extracted_text: string;
  questions: Array<{ text: string; confidence: number }>;
}> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${AI_SERVICE_URL}/api/documents/extract`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`AI Service error: ${response.statusText}`);
  }

  const result: AIServiceResponse<{
    extracted_text: string;
    questions: Array<{ text: string; confidence: number }>;
  }> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to extract document text");
  }

  return result.data;
}

/**
 * Extract text from S3 document using Textract + AI
 */
export async function extractDocumentFromS3(
  bucket: string,
  key: string,
): Promise<{
  extracted_text: string;
  questions: Array<{ text: string; confidence: number }>;
}> {
  const response = await fetch(`${AI_SERVICE_URL}/api/documents/extract-s3`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, key }),
  });

  if (!response.ok) {
    throw new Error(`AI Service error: ${response.statusText}`);
  }

  const result: AIServiceResponse<{
    extracted_text: string;
    questions: Array<{ text: string; confidence: number }>;
  }> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to extract S3 document");
  }

  return result.data;
}

/**
 * Generate a lesson plan using AI
 */
export async function generateLessonPlan(
  topic: string,
  duration: number,
  studentId: string,
): Promise<{
  teaching_notes: string;
  ai_reasoning: string;
}> {
  const response = await fetch(`${AI_SERVICE_URL}/api/lessons/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic,
      duration,
      student_id: studentId,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI Service error: ${response.statusText}`);
  }

  const result: AIServiceResponse<{
    teaching_notes: string;
    ai_reasoning: string;
  }> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to generate lesson plan");
  }

  return result.data;
}

/**
 * Grade a worksheet using AI
 */
export async function gradeWorksheet(
  extractedText: string,
  studentName: string,
): Promise<{
  total_questions: number;
  correct_answers: number;
  score: string;
  question_results: Array<{
    question_id: string;
    question_text: string;
    topic: string;
    is_correct: boolean;
    student_answer: string;
    correct_answer: string;
    feedback: string;
  }>;
  weaknesses: string[];
  insights: string;
}> {
  const response = await fetch(`${AI_SERVICE_URL}/api/grading/grade-worksheet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      extracted_text: extractedText,
      student_name: studentName,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI Service error: ${response.statusText}`);
  }

  const result: AIServiceResponse<{
    total_questions: number;
    correct_answers: number;
    score: string;
    question_results: Array<{
      question_id: string;
      question_text: string;
      topic: string;
      is_correct: boolean;
      student_answer: string;
      correct_answer: string;
      feedback: string;
    }>;
    weaknesses: string[];
    insights: string;
  }> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to grade worksheet");
  }

  return result.data;
}

/**
 * Agent chat (placeholder for AgentCore integration)
 */
export async function chatWithAgent(
  message: string,
  conversationId?: string,
  context?: Record<string, unknown>,
): Promise<{
  response: string;
  conversation_id: string;
  action_traces: Array<{ action: string; parameters: Record<string, unknown>; result: string }>;
}> {
  const response = await fetch(`${AI_SERVICE_URL}/api/agent/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      conversation_id: conversationId,
      context,
    }),
  });

  if (!response.ok) {
    throw new Error(`AI Service error: ${response.statusText}`);
  }

  const result: AIServiceResponse<{
    response: string;
    conversation_id: string;
    action_traces: Array<{ action: string; parameters: Record<string, unknown>; result: string }>;
  }> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to chat with agent");
  }

  return result.data;
}
