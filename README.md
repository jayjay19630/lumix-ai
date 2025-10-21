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
git clone <your-repo-url>
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

Edit `.env.local` and add your AWS configuration:

```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_here
AWS_SECRET_ACCESS_KEY=your_secret_key_here

# AWS Bedrock
AWS_BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
AWS_BEDROCK_AGENT_ID=your_agent_id  # Optional for Phase 1
AWS_BEDROCK_AGENT_ALIAS_ID=your_alias_id  # Optional for Phase 1

# DynamoDB Tables
DYNAMODB_STUDENTS_TABLE=lumix-students
DYNAMODB_QUESTIONS_TABLE=lumix-questions
DYNAMODB_LESSONS_TABLE=lumix-lesson-plans
DYNAMODB_GRADE_HISTORY_TABLE=lumix-grade-history
DYNAMODB_SESSION_SCHEDULES_TABLE=lumix-session-schedules
DYNAMODB_WORKSHEETS_TABLE=lumix-worksheets

# S3 Storage
S3_BUCKET_NAME=lumix-files

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
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

### 6. Enable Amazon Bedrock Access

1. Go to the [Amazon Bedrock Console](https://console.aws.amazon.com/bedrock)
2. Navigate to "Model access" in the left sidebar
3. Click "Manage model access"
4. Enable access to **Amazon Nova Lite** model
5. Wait for access to be granted (usually takes a few minutes)

### 7. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the application.

## Project Structure

```
lumix/
├── app/                          # Next.js app directory
│   ├── (dashboard)/             # Dashboard route group
│   │   ├── layout.tsx           # Dashboard layout with sidebar + AI
│   │   ├── page.tsx             # Dashboard home
│   │   ├── students/            # Students pages
│   │   ├── questions/           # Questions pages
│   │   └── schedule/            # Schedule pages
│   ├── api/                     # API routes
│   │   └── agent/               # AI agent endpoint
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── components/
│   ├── layout/                  # Layout components
│   │   ├── Sidebar.tsx          # Left navigation sidebar
│   │   ├── Header.tsx           # Top header
│   │   └── AIAgent.tsx          # Right AI chat sidebar
│   └── ui/                      # Reusable UI components
│       ├── Button.tsx           # Button component
│       ├── Card.tsx             # Card component
│       └── Modal.tsx            # Modal component
├── lib/
│   ├── aws/                     # AWS client configurations
│   │   ├── bedrock.ts           # Bedrock client & helpers
│   │   ├── textract.ts          # Textract OCR functions
│   │   ├── dynamodb.ts          # DynamoDB operations
│   │   └── s3.ts                # S3 file operations
│   ├── types.ts                 # TypeScript types
│   └── utils.ts                 # Helper functions
├── scripts/
│   └── create-dynamodb-tables.ts # DynamoDB setup script
└── public/                      # Static assets
```

## Troubleshooting

### Node Version Error
If you see "Node.js version required" error, upgrade Node.js:
```bash
# Using nvm
nvm install 20
nvm use 20
```

## License

This project is licensed under the MIT License.
