import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
  ScanCommandInput,
  QueryCommandInput,
} from "@aws-sdk/lib-dynamodb";
import type { Student, Question, LessonPlan, Session, RecurringSessionSchedule } from "../types";

// Initialize DynamoDB Client
const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Create Document Client for easier operations
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});

// Table names from environment variables
const TABLES = {
  STUDENTS: process.env.DYNAMODB_STUDENTS_TABLE || "lumix-students",
  QUESTIONS: process.env.DYNAMODB_QUESTIONS_TABLE || "lumix-questions",
  LESSONS: process.env.DYNAMODB_LESSONS_TABLE || "lumix-lesson-plans",
  SESSIONS: process.env.DYNAMODB_SESSIONS_TABLE || "lumix-sessions",
  SESSION_SCHEDULES: process.env.DYNAMODB_SESSION_SCHEDULES_TABLE || "lumix-session-schedules",
};

// ============ Student Operations ============

export async function getStudent(studentId: string): Promise<Student | null> {
  try {
    const command = new GetCommand({
      TableName: TABLES.STUDENTS,
      Key: { student_id: studentId },
    });
    const response = await docClient.send(command);
    return (response.Item as Student) || null;
  } catch (error) {
    console.error("Error getting student:", error);
    throw error;
  }
}

export async function getAllStudents(): Promise<Student[]> {
  try {
    const command = new ScanCommand({
      TableName: TABLES.STUDENTS,
    });
    const response = await docClient.send(command);
    return (response.Items as Student[]) || [];
  } catch (error) {
    console.error("Error getting all students:", error);
    throw error;
  }
}

export async function createStudent(student: Student): Promise<Student> {
  try {
    const command = new PutCommand({
      TableName: TABLES.STUDENTS,
      Item: student,
    });
    await docClient.send(command);
    return student;
  } catch (error) {
    console.error("Error creating student:", error);
    throw error;
  }
}

export async function updateStudent(
  studentId: string,
  updates: Partial<Student>
): Promise<Student> {
  try {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (key !== "student_id") {
        updateExpressions.push(`#attr${index} = :val${index}`);
        expressionAttributeNames[`#attr${index}`] = key;
        expressionAttributeValues[`:val${index}`] = value;
      }
    });

    const command = new UpdateCommand({
      TableName: TABLES.STUDENTS,
      Key: { student_id: studentId },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    });

    const response = await docClient.send(command);
    return response.Attributes as Student;
  } catch (error) {
    console.error("Error updating student:", error);
    throw error;
  }
}

export async function deleteStudent(studentId: string): Promise<void> {
  try {
    const command = new DeleteCommand({
      TableName: TABLES.STUDENTS,
      Key: { student_id: studentId },
    });
    await docClient.send(command);
  } catch (error) {
    console.error("Error deleting student:", error);
    throw error;
  }
}

// ============ Question Operations ============

export async function getQuestion(questionId: string): Promise<Question | null> {
  try {
    const command = new GetCommand({
      TableName: TABLES.QUESTIONS,
      Key: { question_id: questionId },
    });
    const response = await docClient.send(command);
    return (response.Item as Question) || null;
  } catch (error) {
    console.error("Error getting question:", error);
    throw error;
  }
}

export async function getAllQuestions(): Promise<Question[]> {
  try {
    const command = new ScanCommand({
      TableName: TABLES.QUESTIONS,
    });
    const response = await docClient.send(command);
    return (response.Items as Question[]) || [];
  } catch (error) {
    console.error("Error getting all questions:", error);
    throw error;
  }
}

export async function getQuestionsByTopic(topic: string): Promise<Question[]> {
  try {
    const command = new ScanCommand({
      TableName: TABLES.QUESTIONS,
      FilterExpression: "topic = :topic",
      ExpressionAttributeValues: {
        ":topic": topic,
      },
    });
    const response = await docClient.send(command);
    return (response.Items as Question[]) || [];
  } catch (error) {
    console.error("Error getting questions by topic:", error);
    throw error;
  }
}

export async function createQuestion(question: Question): Promise<Question> {
  try {
    const command = new PutCommand({
      TableName: TABLES.QUESTIONS,
      Item: question,
    });
    await docClient.send(command);
    return question;
  } catch (error) {
    console.error("Error creating question:", error);
    throw error;
  }
}

export async function updateQuestion(
  questionId: string,
  updates: Partial<Question>
): Promise<Question> {
  try {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (key !== "question_id") {
        updateExpressions.push(`#attr${index} = :val${index}`);
        expressionAttributeNames[`#attr${index}`] = key;
        expressionAttributeValues[`:val${index}`] = value;
      }
    });

    const command = new UpdateCommand({
      TableName: TABLES.QUESTIONS,
      Key: { question_id: questionId },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    });

    const response = await docClient.send(command);
    return response.Attributes as Question;
  } catch (error) {
    console.error("Error updating question:", error);
    throw error;
  }
}

export async function queryQuestions(
  filters?: {
    topics?: string[];
    difficulties?: ("Easy" | "Medium" | "Hard")[];
  }
): Promise<Question[]> {
  try {
    // Use getAllQuestions and filter if needed
    const allQuestions = await getAllQuestions();

    if (!filters) {
      return allQuestions;
    }

    return allQuestions.filter((q) => {
      const topicMatch = !filters.topics || filters.topics.includes(q.topic);
      const difficultyMatch = !filters.difficulties || filters.difficulties.includes(q.difficulty);
      return topicMatch && difficultyMatch;
    });
  } catch (error) {
    console.error("Error querying questions:", error);
    throw error;
  }
}

// ============ Lesson Plan Operations ============

export async function getLessonPlan(lessonId: string): Promise<LessonPlan | null> {
  try {
    const command = new GetCommand({
      TableName: TABLES.LESSONS,
      Key: { lesson_id: lessonId },
    });
    const response = await docClient.send(command);
    return (response.Item as LessonPlan) || null;
  } catch (error) {
    console.error("Error getting lesson plan:", error);
    throw error;
  }
}

export async function getLessonPlansByStudent(studentId: string): Promise<LessonPlan[]> {
  try {
    const command = new ScanCommand({
      TableName: TABLES.LESSONS,
      FilterExpression: "student_id = :student_id",
      ExpressionAttributeValues: {
        ":student_id": studentId,
      },
    });
    const response = await docClient.send(command);
    return (response.Items as LessonPlan[]) || [];
  } catch (error) {
    console.error("Error getting lesson plans by student:", error);
    throw error;
  }
}

export async function createLessonPlan(lessonPlan: LessonPlan): Promise<LessonPlan> {
  try {
    const command = new PutCommand({
      TableName: TABLES.LESSONS,
      Item: lessonPlan,
    });
    await docClient.send(command);
    return lessonPlan;
  } catch (error) {
    console.error("Error creating lesson plan:", error);
    throw error;
  }
}

// ============ Session Operations ============

export async function getSession(sessionId: string): Promise<Session | null> {
  try {
    const command = new GetCommand({
      TableName: TABLES.SESSIONS,
      Key: { session_id: sessionId },
    });
    const response = await docClient.send(command);
    return (response.Item as Session) || null;
  } catch (error) {
    console.error("Error getting session:", error);
    throw error;
  }
}

export async function getSessionsByStudent(studentId: string): Promise<Session[]> {
  try {
    const command = new ScanCommand({
      TableName: TABLES.SESSIONS,
      FilterExpression: "student_id = :student_id",
      ExpressionAttributeValues: {
        ":student_id": studentId,
      },
    });
    const response = await docClient.send(command);
    return (response.Items as Session[]) || [];
  } catch (error) {
    console.error("Error getting sessions by student:", error);
    throw error;
  }
}

export async function createSession(session: Session): Promise<Session> {
  try {
    const command = new PutCommand({
      TableName: TABLES.SESSIONS,
      Item: session,
    });
    await docClient.send(command);
    return session;
  } catch (error) {
    console.error("Error creating session:", error);
    throw error;
  }
}

// ============ Session Schedule Operations ============

export async function getSessionSchedule(scheduleId: string): Promise<RecurringSessionSchedule | null> {
  try {
    const command = new GetCommand({
      TableName: TABLES.SESSION_SCHEDULES,
      Key: { schedule_id: scheduleId },
    });
    const response = await docClient.send(command);
    return (response.Item as RecurringSessionSchedule) || null;
  } catch (error) {
    console.error("Error getting session schedule:", error);
    throw error;
  }
}

export async function getSessionSchedulesByStudent(studentId: string): Promise<RecurringSessionSchedule[]> {
  try {
    const command = new QueryCommand({
      TableName: TABLES.SESSION_SCHEDULES,
      IndexName: "StudentIndex",
      KeyConditionExpression: "student_id = :student_id",
      ExpressionAttributeValues: {
        ":student_id": studentId,
      },
    });
    const response = await docClient.send(command);
    return (response.Items as RecurringSessionSchedule[]) || [];
  } catch (error) {
    console.error("Error getting session schedules by student:", error);
    throw error;
  }
}

export async function getAllSessionSchedules(): Promise<RecurringSessionSchedule[]> {
  try {
    const command = new ScanCommand({
      TableName: TABLES.SESSION_SCHEDULES,
    });
    const response = await docClient.send(command);
    return (response.Items as RecurringSessionSchedule[]) || [];
  } catch (error) {
    console.error("Error getting all session schedules:", error);
    throw error;
  }
}

export async function createSessionSchedule(schedule: RecurringSessionSchedule): Promise<RecurringSessionSchedule> {
  try {
    const command = new PutCommand({
      TableName: TABLES.SESSION_SCHEDULES,
      Item: schedule,
    });
    await docClient.send(command);
    return schedule;
  } catch (error) {
    console.error("Error creating session schedule:", error);
    throw error;
  }
}

export async function updateSessionSchedule(
  scheduleId: string,
  updates: Partial<RecurringSessionSchedule>
): Promise<RecurringSessionSchedule> {
  try {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, unknown> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      if (key !== "schedule_id") {
        updateExpressions.push(`#attr${index} = :val${index}`);
        expressionAttributeNames[`#attr${index}`] = key;
        expressionAttributeValues[`:val${index}`] = value;
      }
    });

    const command = new UpdateCommand({
      TableName: TABLES.SESSION_SCHEDULES,
      Key: { schedule_id: scheduleId },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    });

    const response = await docClient.send(command);
    return response.Attributes as RecurringSessionSchedule;
  } catch (error) {
    console.error("Error updating session schedule:", error);
    throw error;
  }
}

export async function deleteSessionSchedule(scheduleId: string): Promise<void> {
  try {
    const command = new DeleteCommand({
      TableName: TABLES.SESSION_SCHEDULES,
      Key: { schedule_id: scheduleId },
    });
    await docClient.send(command);
  } catch (error) {
    console.error("Error deleting session schedule:", error);
    throw error;
  }
}

export { docClient, dynamoClient, TABLES };
