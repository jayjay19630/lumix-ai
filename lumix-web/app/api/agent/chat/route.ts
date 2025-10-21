import { NextRequest, NextResponse } from "next/server";
import { processAgentMessage } from "@/lib/agent/orchestrator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, conversation_history } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Process message with agent orchestrator
    const result = await processAgentMessage(
      message,
      conversation_history || []
    );

    return NextResponse.json({
      success: true,
      response: result.response,
      actionTraces: result.actionTraces,
    });
  } catch (error) {
    console.error("Error in agent chat:", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 }
    );
  }
}
