# Lumix ✨

> Teaching brilliance, powered by AI

An AI-powered tutor assistant web application built with Next.js 15, helping tutors manage questions, grade student work, and generate personalized lesson plans using AWS AI services.

## Features

### Phase 1 (Current) ✅
- **Dashboard Layout**: Sidebar navigation, header, and AI agent chat interface
- **Students Management**: View student profiles and performance metrics
- **Question Bank**: Browse and organize teaching questions
- **Schedule View**: Manage teaching sessions and appointments
- **AI Assistant**: Chat interface for tutor support (powered by Amazon Bedrock Nova)

### Upcoming Phases
- **Phase 2**: Question bank with OCR processing and AI classification
- **Phase 3**: Auto-grading and student performance tracking
- **Phase 4**: AI-powered lesson plan generation
- **Phase 5**: Full AI agent orchestration with action groups

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
DYNAMODB_SESSIONS_TABLE=lumix-sessions

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

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npx tsx scripts/create-dynamodb-tables.ts` - Create DynamoDB tables

## Features Overview

### Dashboard
- Quick stats overview (students, questions, sessions)
- Recent activity feed
- Quick action cards

### Students Page
- Student cards with performance metrics
- Topic-wise accuracy display
- Progress indicators
- Next session information

### Questions Page
- Question bank browser
- Filter by topic and difficulty
- Search functionality
- Question metadata (usage stats, success rate)

### Schedule Page
- Calendar view of teaching sessions
- Sessions grouped by date
- Session details with topics
- Summary cards (today, this week, teaching hours)

### AI Assistant
- Real-time chat interface
- Powered by Amazon Bedrock Nova
- Context-aware responses
- Teaching guidance and support

## AWS Services Setup

### Amazon Bedrock
Required for AI features. Ensure you have:
1. Model access enabled for Amazon Nova Lite
2. Appropriate IAM permissions for Bedrock API calls

### DynamoDB
Tables are automatically created via the setup script. Each table uses on-demand billing mode.

### S3
Used for storing:
- Uploaded question papers
- Generated worksheets
- Graded work samples
- Question images

### Textract (Phase 2)
Will be used for OCR processing of uploaded documents.

## Development Notes

- The app uses Next.js 15's App Router with React Server Components
- Tailwind CSS v4 is configured for styling
- AWS SDK v3 is used for all AWS integrations
- Type-safe with TypeScript throughout

## Troubleshooting

### Node Version Error
If you see "Node.js version required" error, upgrade Node.js:
```bash
# Using nvm
nvm install 20
nvm use 20

# Or download from https://nodejs.org
```

### AWS Credentials Error
Ensure your AWS credentials are correct in `.env.local` and have the necessary permissions.

### Bedrock Access Error
Make sure you've requested and been granted access to the Amazon Nova models in the Bedrock console.

### DynamoDB Table Creation Fails
Check that your AWS credentials have `dynamodb:CreateTable` permissions.

## Next Steps

After completing Phase 1 setup, you can proceed with:

1. **Phase 2**: Implement question upload and OCR processing
2. **Phase 3**: Add auto-grading functionality
3. **Phase 4**: Implement lesson plan generation
4. **Phase 5**: Set up Bedrock Agent with action groups

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please file an issue in the GitHub repository.

---

Built with ✨ by Lumix
