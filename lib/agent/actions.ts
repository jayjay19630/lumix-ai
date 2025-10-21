/**
 * Agent Action Groups - Functions the Bedrock Agent can call
 */

import {
  getAllStudents,
  getStudent,
  getGradeHistoryByStudent,
  getAllSessions,
  getSessionsByDateRange,
  getAllQuestions,
  getAllLessonPlans,
  getLessonPlansByStudent,
  createLessonPlan,
  createSession,
} from "@/lib/aws/dynamodb";
import type { Student, GradeHistory, Session, Question, LessonPlan } from "@/lib/types";

// ============ Action Group: query_students ============

export async function queryStudents(params?: {
  student_name?: string;
  student_id?: string;
}): Promise<{ students: Student[]; summary: string }> {
  try {
    let students: Student[];

    if (params?.student_id) {
      const student = await getStudent(params.student_id);
      students = student ? [student] : [];
    } else if (params?.student_name) {
      const allStudents = await getAllStudents();
      students = allStudents.filter((s) =>
        s.name.toLowerCase().includes(params.student_name!.toLowerCase())
      );
    } else {
      students = await getAllStudents();
    }

    const summary = `Found ${students.length} student(s). ${
      students.length > 0
        ? students.map((s) => `${s.name} (${s.grade})`).join(", ")
        : "No students found"
    }`;

    return { students, summary };
  } catch (error) {
    console.error("Error in queryStudents:", error);
    throw error;
  }
}

// ============ Action Group: query_grade_history ============

export async function queryGradeHistory(params: {
  student_id: string;
  limit?: number;
}): Promise<{ grade_history: GradeHistory[]; analysis: string }> {
  try {
    const history = await getGradeHistoryByStudent(params.student_id);
    const sorted = history.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const limited = params.limit ? sorted.slice(0, params.limit) : sorted;

    // Calculate performance metrics
    const scores = limited
      .filter((h) => h.score)
      .map((h) => {
        const [correct, total] = h.score!.split("/").map(Number);
        return (correct / total) * 100;
      });

    const avgScore =
      scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

    // Analyze topics
    const topicPerformance: Record<string, number[]> = {};
    limited.forEach((h) => {
      h.topics_covered.forEach((topic) => {
        if (!topicPerformance[topic]) topicPerformance[topic] = [];
        if (h.score) {
          const [correct, total] = h.score.split("/").map(Number);
          topicPerformance[topic].push((correct / total) * 100);
        }
      });
    });

    const weakTopics = Object.entries(topicPerformance)
      .map(([topic, scores]) => ({
        topic,
        avg: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .filter((t) => t.avg < 70)
      .sort((a, b) => a.avg - b.avg);

    const analysis = `Analyzed ${limited.length} recent sessions. Average score: ${avgScore.toFixed(
      1
    )}%. ${
      weakTopics.length > 0
        ? `Weak areas: ${weakTopics.map((t) => `${t.topic} (${t.avg.toFixed(1)}%)`).join(", ")}`
        : "No significant weak areas identified"
    }`;

    return { grade_history: limited, analysis };
  } catch (error) {
    console.error("Error in queryGradeHistory:", error);
    throw error;
  }
}

// ============ Action Group: query_questions ============

export async function queryQuestions(params?: {
  topic?: string;
  difficulty?: "Easy" | "Medium" | "Hard";
  limit?: number;
}): Promise<{ questions: Question[]; summary: string }> {
  try {
    let questions = await getAllQuestions();

    if (params?.topic) {
      questions = questions.filter((q) =>
        q.topic.toLowerCase().includes(params.topic!.toLowerCase())
      );
    }

    if (params?.difficulty) {
      questions = questions.filter((q) => q.difficulty === params.difficulty);
    }

    if (params?.limit) {
      questions = questions.slice(0, params.limit);
    }

    const summary = `Found ${questions.length} question(s)${
      params?.topic ? ` on ${params.topic}` : ""
    }${params?.difficulty ? ` (${params.difficulty})` : ""}`;

    return { questions, summary };
  } catch (error) {
    console.error("Error in queryQuestions:", error);
    throw error;
  }
}

// ============ Action Group: get_schedule ============

export async function getSchedule(params?: {
  start_date?: string;
  end_date?: string;
  student_id?: string;
}): Promise<{ sessions: Session[]; summary: string }> {
  try {
    let sessions: Session[];

    if (params?.start_date && params?.end_date) {
      sessions = await getSessionsByDateRange(params.start_date, params.end_date);
    } else {
      sessions = await getAllSessions();
    }

    if (params?.student_id) {
      sessions = sessions.filter((s) => s.student_id === params.student_id);
    }

    // Sort by date and time
    sessions.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });

    const withPlans = sessions.filter((s) => s.lesson_plan_id).length;
    const withoutPlans = sessions.length - withPlans;

    const summary = `Found ${sessions.length} session(s). ${withPlans} with lesson plans, ${withoutPlans} need preparation.`;

    return { sessions, summary };
  } catch (error) {
    console.error("Error in getSchedule:", error);
    throw error;
  }
}

// ============ Action Group: generate_lesson_plan ============

export async function generateLessonPlanAction(params: {
  session_id: string;
  topic: string;
  use_student_data?: boolean;
}): Promise<{ lesson_plan: LessonPlan; message: string }> {
  try {
    // Call the existing generation API
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/lessons/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: params.session_id,
        topic: params.topic,
        use_student_data: params.use_student_data || false,
      }),
    });

    if (!response.ok) throw new Error("Failed to generate lesson plan");

    const data = await response.json();
    const lessonPlan = data.data;

    const message = `✨ Generated lesson plan for session ${params.session_id} on ${params.topic}.`;

    return { lesson_plan: lessonPlan, message };
  } catch (error) {
    console.error("Error in generateLessonPlanAction:", error);
    throw error;
  }
}

// ============ Action Group: create_session ============

export async function createSessionAction(params: {
  student_id: string;
  date: string;
  time: string;
  duration: number;
  notes?: string;
}): Promise<{ session: Session; message: string }> {
  try {
    const sessionId = `sess_${params.date.replace(/-/g, "")}_${params.student_id}`;

    const session: Session = {
      session_id: sessionId,
      student_id: params.student_id,
      date: params.date,
      time: params.time,
      duration: params.duration,
      notes: params.notes,
      created_by: "manual",
      created_at: new Date().toISOString(),
    };

    await createSession(session);

    const message = `✓ Created session for ${params.date} at ${params.time} (${params.duration} minutes)`;

    return { session, message };
  } catch (error) {
    console.error("Error in createSessionAction:", error);
    throw error;
  }
}

// ============ Action Group: query_lesson_plans ============

export async function queryLessonPlans(params?: {
  student_id?: string;
  limit?: number;
}): Promise<{ lesson_plans: LessonPlan[]; summary: string }> {
  try {
    let lessonPlans: LessonPlan[];

    if (params?.student_id) {
      lessonPlans = await getLessonPlansByStudent(params.student_id);
    } else {
      lessonPlans = await getAllLessonPlans();
    }

    lessonPlans.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    if (params?.limit) {
      lessonPlans = lessonPlans.slice(0, params.limit);
    }

    const aiGenerated = lessonPlans.filter((lp) => lp.created_by === "ai").length;
    const manual = lessonPlans.length - aiGenerated;

    const summary = `Found ${lessonPlans.length} lesson plan(s). ${aiGenerated} AI-generated, ${manual} manual.`;

    return { lesson_plans: lessonPlans, summary };
  } catch (error) {
    console.error("Error in queryLessonPlans:", error);
    throw error;
  }
}

// ============ Action Router ============

export async function executeAction(
  actionName: string,
  parameters: Record<string, unknown>
): Promise<{ result: unknown; summary: string }> {
  switch (actionName) {
    case "query_students":
      return await queryStudents(parameters as Parameters<typeof queryStudents>[0]);

    case "query_grade_history":
      return await queryGradeHistory(
        parameters as Parameters<typeof queryGradeHistory>[0]
      );

    case "query_questions":
      return await queryQuestions(parameters as Parameters<typeof queryQuestions>[0]);

    case "get_schedule":
      return await getSchedule(parameters as Parameters<typeof getSchedule>[0]);

    case "generate_lesson_plan":
      return await generateLessonPlanAction(
        parameters as Parameters<typeof generateLessonPlanAction>[0]
      );

    case "create_session":
      return await createSessionAction(
        parameters as Parameters<typeof createSessionAction>[0]
      );

    case "query_lesson_plans":
      return await queryLessonPlans(
        parameters as Parameters<typeof queryLessonPlans>[0]
      );

    default:
      throw new Error(`Unknown action: ${actionName}`);
  }
}
