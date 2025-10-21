import { NextRequest, NextResponse } from "next/server";
import { invokeNovaModel } from "@/lib/aws/bedrock";
import type { AgentMessage, ApiResponse } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversation } = body as {
      message: string;
      conversation: AgentMessage[];
    };

    if (!message) {
      return NextResponse.json(
        {
          success: false,
          error: "Message is required",
        } as ApiResponse,
        { status: 400 },
      );
    }

    // Build context from conversation history
    const conversationContext = conversation
      .slice(-5) // Only use last 5 messages for context
      .map(
        (msg) =>
          `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`,
      )
      .join("\n");

    // Create prompt for the AI agent
    const prompt = `You are an AI teaching assistant for Lumix, a tutor management platform. You help tutors manage their students, questions, lesson plans, and schedules.

You can help with:
- Finding information about students and their performance
- Searching for questions in the question bank
- Generating lesson plans tailored to student needs
- Analyzing student weaknesses and suggesting focus areas
- Providing teaching tips and strategies

Context from previous conversation:
${conversationContext}

User's current message: ${message}

Provide a helpful, concise response. If the user asks about specific functionality that requires data from the database (like student details, question counts, etc.), acknowledge that you can help with that and provide general guidance. Be friendly and professional.`;

    // Call Amazon Bedrock Nova model
    const response = await invokeNovaModel({
      prompt,
      maxTokens: 512,
      temperature: 0.7,
    });

    return NextResponse.json({
      success: true,
      data: {
        response,
      },
    } as ApiResponse<{ response: string }>);
  } catch (error) {
    console.error("Error in agent API:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      } as ApiResponse,
      { status: 500 },
    );
  }
}
