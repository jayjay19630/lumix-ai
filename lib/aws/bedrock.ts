import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
} from "@aws-sdk/client-bedrock-runtime";
import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
  InvokeAgentCommandInput,
} from "@aws-sdk/client-bedrock-agent-runtime";

// Initialize Bedrock Runtime Client
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Initialize Bedrock Agent Runtime Client
const bedrockAgentClient = new BedrockAgentRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export interface BedrockModelParams {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

/**
 * Invoke Amazon Bedrock Nova model for text generation
 */
export async function invokeNovaModel({
  prompt,
  maxTokens = 2048,
  temperature = 0.7,
  topP = 0.9,
}: BedrockModelParams): Promise<string> {
  try {
    const modelId = process.env.AWS_BEDROCK_MODEL_ID || "amazon.nova-lite-v1:0";

    const requestBody = {
      messages: [
        {
          role: "user",
          content: [{ text: prompt }],
        },
      ],
      inferenceConfig: {
        max_new_tokens: maxTokens,
        temperature,
        top_p: topP,
      },
    };

    const input: InvokeModelCommandInput = {
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(requestBody),
    };

    const command = new InvokeModelCommand(input);
    const response = await bedrockClient.send(command);

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    // Extract text from Nova response
    if (responseBody.output?.message?.content?.[0]?.text) {
      return responseBody.output.message.content[0].text;
    }

    throw new Error("Unexpected response format from Bedrock Nova");
  } catch (error) {
    console.error("Error invoking Bedrock Nova model:", error);
    throw error;
  }
}

/**
 * Invoke Bedrock Agent for orchestrated tasks
 */
export async function invokeBedrockAgent(
  prompt: string,
  sessionId: string
): Promise<string> {
  try {
    const agentId = process.env.AWS_BEDROCK_AGENT_ID;
    const agentAliasId = process.env.AWS_BEDROCK_AGENT_ALIAS_ID;

    if (!agentId || !agentAliasId) {
      throw new Error("Bedrock Agent ID or Alias ID not configured");
    }

    const input: InvokeAgentCommandInput = {
      agentId,
      agentAliasId,
      sessionId,
      inputText: prompt,
    };

    const command = new InvokeAgentCommand(input);
    const response = await bedrockAgentClient.send(command);

    // Process the streaming response
    let fullResponse = "";

    if (response.completion) {
      for await (const event of response.completion) {
        if (event.chunk?.bytes) {
          const text = new TextDecoder().decode(event.chunk.bytes);
          fullResponse += text;
        }
      }
    }

    return fullResponse;
  } catch (error) {
    console.error("Error invoking Bedrock Agent:", error);
    throw error;
  }
}

/**
 * Classify question topic using Bedrock Nova
 */
export async function classifyQuestionTopic(questionText: string): Promise<{
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  confidence: number;
}> {
  const prompt = `You are a math education expert. Analyze the following math question and classify it.

Question: ${questionText}

Provide your response in the following JSON format:
{
  "topic": "the main topic (e.g., Quadratic Equations, Trigonometry, Linear Equations, Geometry, Functions)",
  "difficulty": "Easy, Medium, or Hard",
  "confidence": a number between 0 and 1 indicating your confidence
}

Only return valid JSON, no additional text.`;

  try {
    const response = await invokeNovaModel({ prompt, temperature: 0.3 });
    return JSON.parse(response);
  } catch (error) {
    console.error("Error classifying question:", error);
    // Return default classification
    return {
      topic: "General Math",
      difficulty: "Medium",
      confidence: 0.5,
    };
  }
}

/**
 * Generate explanation for a question using Bedrock Nova
 */
export async function generateQuestionExplanation(questionText: string): Promise<{
  explanation: string;
  teaching_tips: string;
}> {
  const prompt = `You are a helpful math tutor. Provide a clear explanation and teaching tips for the following question.

Question: ${questionText}

Provide your response in the following JSON format:
{
  "explanation": "A clear, step-by-step explanation of how to solve this problem",
  "teaching_tips": "Helpful tips for teaching this concept to students"
}

Only return valid JSON, no additional text.`;

  try {
    const response = await invokeNovaModel({ prompt, temperature: 0.7 });
    return JSON.parse(response);
  } catch (error) {
    console.error("Error generating explanation:", error);
    return {
      explanation: "Unable to generate explanation at this time.",
      teaching_tips: "Review the problem with the student step by step.",
    };
  }
}

export { bedrockClient, bedrockAgentClient };
