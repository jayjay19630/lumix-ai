import { NextRequest, NextResponse } from "next/server";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { getSession, updateSession } from "@/lib/aws/dynamodb";
import { createLessonPlan } from "@/lib/aws/dynamodb";
import type { LessonPlan } from "@/lib/types";

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { session_id, topic, use_student_data, search_web } = body;

    // Validate required fields
    if (!session_id || !topic) {
      return NextResponse.json(
        { error: "session_id and topic are required" },
        { status: 400 },
      );
    }

    // Get session data
    const session = await getSession(session_id);
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Simple AI generation for now
    const teachingNotes = await generateSimpleLessonPlan(
      topic,
      session.duration,
      session.student_id,
    );

    // Create lesson plan record
    const lessonPlanId = `lp_${Date.now()}_${session.student_id}`;
    const lessonPlan: LessonPlan = {
      lesson_plan_id: lessonPlanId,
      session_id: session.session_id,
      student_id: session.student_id,
      date: session.date,
      duration: session.duration,
      created_by: "ai",
      generation_mode: "simple",
      focus_topics: [topic],
      teaching_notes: teachingNotes,
      ai_reasoning: `Generated simple lesson plan for ${session.duration}-minute session on ${topic}.`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Save lesson plan
    await createLessonPlan(lessonPlan);

    // Update session with lesson_plan_id
    await updateSession(session.session_id, {
      lesson_plan_id: lessonPlanId,
    });

    return NextResponse.json({
      success: true,
      data: lessonPlan,
    });
  } catch (error) {
    console.error("Error generating lesson plan:", error);
    return NextResponse.json(
      { error: "Failed to generate lesson plan" },
      { status: 500 },
    );
  }
}

async function generateSimpleLessonPlan(
  topic: string,
  duration: number,
  studentId: string,
): Promise<string> {
  try {
    const prompt = `Create a ${duration}-minute tutoring lesson plan on ${topic}.

Structure the lesson into time slots with teaching bullet points.
Include: review/warmup, main teaching content, practice problems, recap.

Return the teaching notes in this format:

**Warmup (X minutes)**
- [bullet point]
- [bullet point]

**Main Teaching Content (X minutes)**
- [bullet point]
- [bullet point]

**Practice Problems (X minutes)**
- [bullet point]
- [bullet point]

**Recap (X minutes)**
- [bullet point]

Be concise and practical. Focus on clear, actionable teaching points.`;

    const modelId = process.env.AWS_BEDROCK_MODEL_ID || "amazon.nova-lite-v1:0";

    const command = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        inferenceConfig: {
          max_new_tokens: 1000,
          temperature: 0.7,
        },
      }),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract teaching notes from response
    const teachingNotes =
      responseBody.output?.message?.content?.[0]?.text ||
      responseBody.completion ||
      "Failed to generate lesson plan content.";

    return teachingNotes;
  } catch (error) {
    console.error("Error calling Bedrock:", error);
    throw new Error("Failed to generate lesson plan with AI");
  }
}
