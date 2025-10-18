// Student Types
export interface Student {
  student_id: string;
  name: string;
  grade: string;
  email?: string;
  phone?: string;
  accuracy: Record<string, number>; // { "topic": accuracy_percentage }
  schedule: SessionSchedule[];
  last_session?: string; // ISO date
  next_session?: string; // ISO date
  created_at: string;
  updated_at: string;
}

export interface SessionSchedule {
  day: string; // e.g., "Monday"
  time: string; // e.g., "14:00"
  duration: number; // minutes
  focus_topics: string[];
}

// Question Types
export type QuestionDifficulty = "Easy" | "Medium" | "Hard";

export interface Question {
  question_id: string;
  text: string;
  topic: string;
  difficulty: QuestionDifficulty;
  source: string; // e.g., "2023 Midterm Exam"
  explanation?: string;
  teaching_tips?: string;
  times_used: number;
  success_rate: number; // percentage
  image_url?: string; // S3 URL
  created_at: string;
}

// Lesson Plan Types
export type LessonStatus = "draft" | "generated" | "completed";

export interface LessonStructure {
  warmup: {
    duration: number; // minutes
    questions: string[]; // question_ids
    description?: string;
  };
  main_practice: {
    duration: number;
    questions: string[];
    description?: string;
  };
  challenge: {
    duration: number;
    questions: string[];
    description?: string;
  };
  homework: {
    questions: string[];
    description?: string;
  };
}

export interface LessonPlan {
  lesson_id: string;
  student_id: string;
  date: string; // ISO date
  scheduled_time: string;
  duration: number; // minutes
  status: LessonStatus;
  objectives: string[];
  structure: LessonStructure;
  agent_reasoning?: string;
  worksheet_url?: string; // S3 URL
  created_at: string;
}

// Session Types
export interface Session {
  session_id: string;
  student_id: string;
  lesson_plan_id?: string;
  date: string;
  duration: number;
  topics_covered: string[];
  questions_attempted: string[]; // question_ids
  score?: string; // e.g., "8/10"
  graded_worksheet_url?: string; // S3 URL
  tutor_notes?: string;
  agent_insights?: string;
  created_at: string;
}

// AI Agent Types
export interface AgentMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface AgentConversation {
  messages: AgentMessage[];
  session_id?: string;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Dashboard Stats Types
export interface DashboardStats {
  total_students: number;
  total_questions: number;
  upcoming_sessions: number;
  recent_sessions: number;
  avg_student_performance: number;
}

// Grading Types
export interface GradingResult {
  total_questions: number;
  correct_answers: number;
  score: string;
  question_results: QuestionResult[];
  weaknesses: string[];
  insights: string;
}

export interface QuestionResult {
  question_id: string;
  question_text: string;
  topic: string;
  is_correct: boolean;
  student_answer?: string;
  correct_answer?: string;
  feedback?: string;
}

// File Upload Types
export interface UploadedFile {
  file_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  uploaded_at: string;
}

// Textract Processing Types
export interface TextractResult {
  extracted_text: string;
  questions: ExtractedQuestion[];
}

export interface ExtractedQuestion {
  text: string;
  page_number?: number;
  confidence?: number;
}
