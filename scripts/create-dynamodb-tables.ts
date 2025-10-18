/**
 * Script to create DynamoDB tables for Lumix
 * Run with: npx tsx scripts/create-dynamodb-tables.ts
 */

import {
  DynamoDBClient,
  CreateTableCommand,
  CreateTableCommandInput,
  DescribeTableCommand,
  ResourceInUseException,
} from "@aws-sdk/client-dynamodb";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: ".env.local" });

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

async function createTable(params: CreateTableCommandInput): Promise<void> {
  try {
    console.log(`Creating table: ${params.TableName}...`);
    const command = new CreateTableCommand(params);
    await client.send(command);
    console.log(`✓ Table ${params.TableName} created successfully`);

    // Wait for table to be active
    await waitForTableActive(params.TableName!);
  } catch (error) {
    if (error instanceof ResourceInUseException) {
      console.log(`✓ Table ${params.TableName} already exists`);
    } else {
      console.error(`✗ Error creating table ${params.TableName}:`, error);
      throw error;
    }
  }
}

async function waitForTableActive(tableName: string): Promise<void> {
  console.log(`Waiting for table ${tableName} to be active...`);

  let isActive = false;
  let attempts = 0;
  const maxAttempts = 30;

  while (!isActive && attempts < maxAttempts) {
    try {
      const command = new DescribeTableCommand({ TableName: tableName });
      const response = await client.send(command);

      if (response.Table?.TableStatus === "ACTIVE") {
        isActive = true;
        console.log(`✓ Table ${tableName} is now active`);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        attempts++;
      }
    } catch (error) {
      console.error(`Error checking table status:`, error);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;
    }
  }

  if (!isActive) {
    throw new Error(`Table ${tableName} did not become active in time`);
  }
}

async function createAllTables(): Promise<void> {
  console.log("Starting DynamoDB table creation...\n");

  // Students Table
  await createTable({
    TableName: process.env.DYNAMODB_STUDENTS_TABLE || "lumix-students",
    KeySchema: [{ AttributeName: "student_id", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "student_id", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  });

  // Questions Table
  await createTable({
    TableName: process.env.DYNAMODB_QUESTIONS_TABLE || "lumix-questions",
    KeySchema: [{ AttributeName: "question_id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "question_id", AttributeType: "S" },
      { AttributeName: "topic", AttributeType: "S" },
    ],
    BillingMode: "PAY_PER_REQUEST",
    GlobalSecondaryIndexes: [
      {
        IndexName: "TopicIndex",
        KeySchema: [{ AttributeName: "topic", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  });

  // Lesson Plans Table
  await createTable({
    TableName: process.env.DYNAMODB_LESSONS_TABLE || "lumix-lesson-plans",
    KeySchema: [{ AttributeName: "lesson_id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "lesson_id", AttributeType: "S" },
      { AttributeName: "student_id", AttributeType: "S" },
    ],
    BillingMode: "PAY_PER_REQUEST",
    GlobalSecondaryIndexes: [
      {
        IndexName: "StudentIndex",
        KeySchema: [{ AttributeName: "student_id", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  });

  // Sessions Table
  await createTable({
    TableName: process.env.DYNAMODB_SESSIONS_TABLE || "lumix-sessions",
    KeySchema: [{ AttributeName: "session_id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "session_id", AttributeType: "S" },
      { AttributeName: "student_id", AttributeType: "S" },
    ],
    BillingMode: "PAY_PER_REQUEST",
    GlobalSecondaryIndexes: [
      {
        IndexName: "StudentIndex",
        KeySchema: [{ AttributeName: "student_id", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  });

  console.log("\n✓ All tables created successfully!");
}

// Run the script
createAllTables().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
