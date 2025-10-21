# Lumix ✨

> Teaching brilliance, powered by AI

An AI-powered tutor assistant web application built with Next.js 15, helping tutors manage questions, grade student work, and generate personalized lesson plans using AWS AI services.

## Features

- Question bank with OCR processing and AI classification
- Auto-grading and student performance tracking
- AI-powered lesson plan generation
- Full AI agent orchestration with action groups

## Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AWS Services**:
  - Amazon Bedrock (Nova model for LLM reasoning)
  - Amazon Bedrock AgentCore (for orchestration)
  - AWS Textract (OCR for document processing)
  - Amazon DynamoDB (database)
  - Amazon S3 (file storage)
  - AWS SDK for JavaScript v3
- **UI Components**: Custom components built with Tailwind CSS and lucide-react icons

## Prerequisites

- **Node.js**: Version 18.18.0 or higher (20.0.0+ recommended)
- **npm**: Version 8 or higher
- **AWS Account**: With access to Bedrock, DynamoDB, S3, and Textract
- **AWS Credentials**: Access key ID and secret access key

## Getting Started

### 1. Clone the Repository

```bash
git clone git@github.com:jayjay19630/lumix-ai.git
cd lumix
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment file and configure it with your AWS credentials:

```bash
cp .env.local.example .env.local
```

### 4. Create DynamoDB Tables

Run the table creation script to set up your database:

```bash
npx tsx scripts/create-dynamodb-tables.ts
```

This will create the following tables:

- `lumix-students`: Student profiles and performance data
- `lumix-questions`: Question bank with metadata
- `lumix-lesson-plans`: Generated lesson plans
- `lumix-sessions`: Teaching session records

### 5. Create S3 Bucket

Create an S3 bucket for file storage:

```bash
aws s3 mb s3://lumix-files --region us-east-1
```

Or create it via the AWS Console at https://console.aws.amazon.com/s3

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Troubleshooting

### Node Version Error

If you see "Node.js version required" error, upgrade Node.js:

```bash
# Using nvm
nvm install 20
nvm use 20
```
