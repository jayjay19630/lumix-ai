/**
 * Agent Orchestrator - Manages conversation flow and tool calling
 */

import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { executeAction } from "./actions";

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Define available tools for the agent
const tools = [
  {
    toolSpec: {
      name: "query_students",
      description:
        "Get student information including name, grade, performance, and accuracy by topic",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            student_name: {
              type: "string",
              description: "Student name to search for (optional)",
            },
            student_id: {
              type: "string",
              description: "Specific student ID (optional)",
            },
          },
        },
      },
    },
  },
  {
    toolSpec: {
      name: "query_grade_history",
      description:
        "Get grading history and performance analysis for a specific student",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            student_id: {
              type: "string",
              description: "Student ID to get grade history for",
            },
            limit: {
              type: "number",
              description: "Maximum number of records to return (default: all)",
            },
          },
          required: ["student_id"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "query_questions",
      description: "Search the question bank by topic and difficulty",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "Topic to filter by (e.g., Quadratic Equations, Trigonometry)",
            },
            difficulty: {
              type: "string",
              enum: ["Easy", "Medium", "Hard"],
              description: "Difficulty level",
            },
            limit: {
              type: "number",
              description: "Maximum number of questions to return",
            },
          },
        },
      },
    },
  },
  {
    toolSpec: {
      name: "get_schedule",
      description: "Get tutoring sessions within a date range or for a specific student",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            start_date: {
              type: "string",
              description: "Start date in YYYY-MM-DD format",
            },
            end_date: {
              type: "string",
              description: "End date in YYYY-MM-DD format",
            },
            student_id: {
              type: "string",
              description: "Filter by specific student ID",
            },
          },
        },
      },
    },
  },
  {
    toolSpec: {
      name: "generate_lesson_plan",
      description: "Generate an AI-powered lesson plan for a session on a specific topic",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "Session ID to create lesson plan for",
            },
            topic: {
              type: "string",
              description: "Main topic for the lesson",
            },
            use_student_data: {
              type: "boolean",
              description: "Whether to use student performance data (default: false)",
            },
          },
          required: ["session_id", "topic"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "create_session",
      description: "Create a new tutoring session",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            student_id: {
              type: "string",
              description: "Student ID",
            },
            date: {
              type: "string",
              description: "Session date in YYYY-MM-DD format",
            },
            time: {
              type: "string",
              description: "Session time in HH:MM format",
            },
            duration: {
              type: "number",
              description: "Duration in minutes",
            },
            notes: {
              type: "string",
              description: "Optional notes",
            },
          },
          required: ["student_id", "date", "time", "duration"],
        },
      },
    },
  },
  {
    toolSpec: {
      name: "query_lesson_plans",
      description: "Get lesson plans, optionally filtered by student",
      inputSchema: {
        json: {
          type: "object",
          properties: {
            student_id: {
              type: "string",
              description: "Filter by specific student ID",
            },
            limit: {
              type: "number",
              description: "Maximum number of plans to return",
            },
          },
        },
      },
    },
  },
];

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ActionTrace {
  action: string;
  parameters: Record<string, unknown>;
  result: string;
}

export async function processAgentMessage(
  userMessage: string,
  conversationHistory: Message[]
): Promise<{
  response: string;
  actionTraces: ActionTrace[];
}> {
  const actionTraces: ActionTrace[] = [];
  const modelId = process.env.AWS_BEDROCK_MODEL_ID || "amazon.nova-lite-v1:0";

  const systemPrompt = `You are Lumix Assistant ✨, an AI tutor assistant. You help tutors by:
- Analyzing student performance and identifying weak areas
- Creating tailored lesson plans and worksheets
- Managing schedules and sessions
- Researching curriculum and teaching strategies

CRITICAL RULES:
1. ALWAYS use tools to get data - NEVER respond without using tools first
2. When asked about students, ALWAYS call query_students and query_grade_history
3. When asked about schedule, ALWAYS call get_schedule
4. When asked about questions or topics, ALWAYS call query_questions
5. Only respond with text AFTER you have called the necessary tools and received results

Do NOT say you will do something - just DO IT by calling the tools.
Be concise and data-driven. Use ✨ occasionally.`;

  // Build messages for the conversation
  const messages: Array<{
    role: "user" | "assistant";
    content: Array<{ text?: string; toolUse?: unknown; toolResult?: unknown }>;
  }> = [];

  // Add conversation history
  conversationHistory.slice(-5).forEach((msg) => {
    messages.push({
      role: msg.role,
      content: [{ text: msg.content }],
    });
  });

  // Add current user message
  messages.push({
    role: "user",
    content: [{ text: userMessage }],
  });

  let continueLoop = true;
  let finalResponse = "";

  // Tool use loop (max 5 iterations to prevent infinite loops)
  for (let iteration = 0; iteration < 5 && continueLoop; iteration++) {
    try {
      const command = new ConverseCommand({
        modelId,
        messages,
        system: [{ text: systemPrompt }],
        toolConfig: {
          tools,
        },
        inferenceConfig: {
          maxTokens: 2048,
          temperature: 0.7,
        },
      });

      const response = await bedrockClient.send(command);

      // Check stop reason
      const assistantMessage = response.output?.message;

      if (response.stopReason === "tool_use" && assistantMessage) {
        // Model wants to use tools
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        messages.push(assistantMessage as any);

        // Execute tool calls
        const toolResults: Array<{
          toolUseId: string;
          content: Array<{ text: string }>;
        }> = [];

        for (const content of assistantMessage.content || []) {
          if ("toolUse" in content) {
            const toolUse = content.toolUse as {
              toolUseId: string;
              name: string;
              input: Record<string, unknown>;
            };

            try {
              // Execute the action
              const actionResult = await executeAction(toolUse.name, toolUse.input);

              // Track for display
              actionTraces.push({
                action: toolUse.name,
                parameters: toolUse.input,
                result: actionResult.summary || JSON.stringify(actionResult.result),
              });

              // Build result object
              const resultObj =
                typeof actionResult.result === "object" && actionResult.result !== null
                  ? { ...(actionResult.result as Record<string, unknown>), summary: actionResult.summary }
                  : { result: actionResult.result, summary: actionResult.summary };

              // Add tool result to conversation
              toolResults.push({
                toolUseId: toolUse.toolUseId,
                content: [
                  {
                    text: JSON.stringify(resultObj),
                  },
                ],
              });
            } catch (error) {
              console.error(`Error executing tool ${toolUse.name}:`, error);
              toolResults.push({
                toolUseId: toolUse.toolUseId,
                content: [
                  {
                    text: JSON.stringify({
                      error: `Failed to execute ${toolUse.name}`,
                    }),
                  },
                ],
              });
            }
          }
        }

        // Add tool results to messages
        if (toolResults.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          messages.push({
            role: "user",
            content: toolResults.map((tr) => ({ toolResult: tr })),
          } as any);
        }
      } else {
        // No more tool use - extract final response
        if (assistantMessage) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          messages.push(assistantMessage as any);
          const textContent = assistantMessage.content?.find((c) => "text" in c);
          finalResponse = (textContent as { text: string })?.text || "";
        }
        continueLoop = false;
      }
    } catch (error) {
      console.error("Error in agent orchestration:", error);
      finalResponse =
        "I encountered an error while processing your request. Please try again.";
      continueLoop = false;
    }
  }

  return {
    response: finalResponse,
    actionTraces,
  };
}
