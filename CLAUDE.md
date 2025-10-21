I'm building Lumix - an AI-powered tutor assistant web application using Next.js 15 (App Router). This app helps tutors manage questions, grade student work, and generate personalized lesson plans using AWS AI services.

TECH STACK:
- Frontend: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- Backend: Next.js API Routes
- AWS Services: 
  - Amazon Bedrock (Nova model for LLM reasoning)
  - Amazon Bedrock AgentCore (for orchestration)
  - AWS Textract (OCR for document processing)
  - Amazon DynamoDB (database)
  - Amazon S3 (file storage)
  - AWS Lambda (serverless functions - if needed)
  - AWS SDK for JavaScript v3
- Authentication: AWS Cognito (or NextAuth.js for now)

PROJECT STRUCTURE:
```
lumix/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Dashboard layout with sidebar + AI agent
│   │   ├── page.tsx                # Dashboard home
│   │   ├── students/
│   │   │   ├── page.tsx            # Students list
│   │   │   └── [id]/page.tsx       # Student detail
│   │   ├── questions/
│   │   │   ├── page.tsx            # Question bank
│   │   │   └── [id]/page.tsx       # Question detail
│   │   └── schedule/
│   │       └── page.tsx            # Calendar view
│   ├── api/
│   │   ├── agent/
│   │   │   └── route.ts            # AI agent chat endpoint
│   │   ├── students/
│   │   │   ├── route.ts            # List/create students
│   │   │   └── [id]/route.ts       # Get/update/delete student
│   │   ├── questions/
│   │   │   ├── route.ts            # List/create questions
│   │   │   ├── upload/route.ts     # Upload & process papers
│   │   │   └── [id]/route.ts       # Get/update/delete question
│   │   ├── grading/
│   │   │   └── route.ts            # Auto-grade worksheet
│   │   ├── lessons/
│   │   │   ├── generate/route.ts   # Generate lesson plan
│   │   │   └── [id]/route.ts       # Get/update lesson
│   │   └── schedule/
│   │       └── route.ts            # Get schedule
│   ├── layout.tsx                  # Root layout
│   └── page.tsx                    # Landing page
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx             # Left navigation
│   │   ├── AIAgent.tsx             # Right AI chat sidebar
│   │   └── Header.tsx              # Top header
│   ├── students/
│   │   ├── StudentCard.tsx
│   │   ├── StudentDetail.tsx
│   │   └── PerformanceChart.tsx
│   ├── questions/
│   │   ├── QuestionCard.tsx
│   │   ├── QuestionDetail.tsx
│   │   └── UploadModal.tsx
│   ├── schedule/
│   │   ├── Calendar.tsx
│   │   ├── LessonPlanModal.tsx
│   │   └── SessionCard.tsx
│   └── ui/                         # Reusable UI components
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       └── ...
├── lib/
│   ├── aws/
│   │   ├── bedrock.ts              # Bedrock client & agent setup
│   │   ├── textract.ts             # Textract OCR functions
│   │   ├── dynamodb.ts             # DynamoDB operations
│   │   └── s3.ts                   # S3 file operations
│   ├── types.ts                    # TypeScript types
│   └── utils.ts                    # Helper functions
├── public/
│   └── images/
└── .env.local                      # AWS credentials & config
```

DATABASE SCHEMA (DynamoDB Tables):

1. students
   - PK: student_id (string)
   - name, grade, email, phone
   - accuracy (map): { "topic": number }
   - schedule (list): [{ day, time, duration, focus_topics }]
   - last_session, next_session
   - created_at, updated_at

2. questions
   - PK: question_id (string)
   - text (string)
   - topic (string)
   - difficulty (string): "Easy" | "Medium" | "Hard"
   - source (string)
   - explanation (string) - AI generated
   - teaching_tips (string)
   - times_used (number)
   - success_rate (number)
   - image_url (string) - S3 URL if question has image
   - created_at

3. lesson_plans
   - PK: lesson_id (string)
   - student_id (string) - GSI
   - date (string) - ISO date
   - scheduled_time (string)
   - duration (number)
   - status: "draft" | "generated" | "completed"
   - objectives (list)
   - structure (map): { warmup, main_practice, challenge, homework }
   - agent_reasoning (string)
   - worksheet_url (string) - S3 URL
   - created_at

4. grade_history
   - PK: grade_history_id (string)
   - student_id (string) - GSI
   - lesson_plan_id (string)
   - date (string)
   - duration (number)
   - topics_covered (list)
   - questions_attempted (list)
   - score (string)
   - graded_worksheet_url (string)
   - grading_result (map) - Detailed grading results
   - tutor_notes (string)
   - agent_insights (string)
   - created_at

5. session_schedules (Recurring session schedules - separate from grading)
   - PK: schedule_id (string)
   - student_id (string) - GSI
   - day_of_week (number) - 0 = Sunday, 1 = Monday, ..., 6 = Saturday
   - time (string) - e.g., "14:00" (24-hour format)
   - duration (number) - minutes
   - focus_topics (list)
   - is_active (boolean)
   - created_at, updated_at

KEY FEATURES TO IMPLEMENT:

PHASE 1 - Core Structure:
1. Set up Next.js app with TypeScript and Tailwind
2. Create layout with:
   - Left sidebar navigation (Dashboard, Students, Questions, Schedule)
   - Right sidebar AI agent chat (fixed, always visible)
   - Main content area
3. Implement basic routing for all pages
4. Set up AWS SDK v3 clients (Bedrock, Textract, DynamoDB, S3)
5. Create DynamoDB tables (use AWS SDK, not CloudFormation yet)
6. Set up environment variables for AWS credentials

PHASE 2 - Question Bank (Tool 1):
1. Question list page with search, filter by topic/difficulty
2. Upload modal for past papers (PDF/images)
3. API endpoint to:
   - Upload file to S3
   - Process with Textract OCR
   - Use Bedrock Nova to classify questions by topic
   - Use Bedrock Nova to generate explanations
   - Store in DynamoDB
4. Question detail modal showing explanation, teaching tips
5. Generate variant questions using Bedrock Nova

PHASE 3 - Students & Grading (Tool 2):
1. Students list page showing all students with performance overview
2. Student detail page showing:
   - Profile information
   - Performance by topic (chart)
   - Grade history (past graded worksheets)
   - Schedule (recurring session schedules)
3. Upload graded worksheet functionality
4. API endpoint to:
   - Extract answers using Textract
   - Use Bedrock Nova to grade and analyze
   - Update student accuracy in DynamoDB
   - Generate insights
5. Display grading results and auto-update student weaknesses

PHASE 4 - Schedule & Lesson Plans (Tool 3):
1. Calendar view showing upcoming sessions based on student session schedules
2. Click upcoming session to open lesson plan modal
3. API endpoint to generate lesson plan:
   - Use Bedrock Agent to orchestrate
   - Query student profile from DynamoDB
   - Query recent grade history to understand student performance
   - Use Nova reasoning to:
     * Analyze student weaknesses
     * Select appropriate questions from bank to create worksheet
     * Structure lesson content to teach
   - Generate PDF worksheet (use a library like pdfkit or jsPDF)
   - Store in S3
   - Save lesson plan to DynamoDB
4. Display generated lesson plan with full structure
5. Download worksheet PDF

PHASE 5 - AI Agent Chat:
1. Chat interface in right sidebar
2. API endpoint for agent conversations
3. Use Bedrock Agent with action groups:
   - query_students
   - query_questions
   - generate_lesson_plan
   - grade_worksheet
   - get_schedule
4. Agent can navigate user to appropriate page
5. Agent provides insights and suggestions

BRANDING:
- App name: Lumix ✨
- Tagline: "Teaching brilliance, powered by AI"
- Primary color: #6366F1 (Indigo)
- Secondary color: #F59E0B (Amber)
- Use ✨ sparkle emoji as quick icon
- Professional, modern, clean design

UI DESIGN PRINCIPLES:
- Use Tailwind CSS for all styling
- Mobile-responsive (though focus on desktop for demo)
- Clean, spacious layout with good whitespace
- Cards for content display
- Modals for detail views
- Loading states for async operations
- Error handling with toast notifications
- Accessibility: proper ARIA labels, keyboard navigation

IMPORTANT AWS INTEGRATION NOTES:
1. Use AWS SDK v3 (modular imports)
2. For Bedrock Agent, use @aws-sdk/client-bedrock-agent-runtime
3. For Bedrock LLM calls, use @aws-sdk/client-bedrock-runtime with Nova model
4. Textract: Use @aws-sdk/client-textract with DetectDocumentText
5. DynamoDB: Use @aws-sdk/client-dynamodb with DynamoDB Document Client
6. S3: Use @aws-sdk/client-s3 with presigned URLs for uploads
7. All AWS clients should be instantiated with proper credentials from env vars
8. Implement retry logic and error handling for AWS calls

DEMO DATA:
Pre-populate with sample data for demo:
- 3 students (Alice, Bob, Charlie) with realistic performance data
- 50 questions across 5 topics (Quadratic Equations, Trigonometry, Linear Equations, Geometry, Functions)
- 2-3 past sessions per student
- 1-2 upcoming sessions in schedule

ENVIRONMENT VARIABLES NEEDED:
```
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
AWS_BEDROCK_AGENT_ID=your_agent_id
AWS_BEDROCK_AGENT_ALIAS_ID=your_alias_id
DYNAMODB_STUDENTS_TABLE=lumix-students
DYNAMODB_QUESTIONS_TABLE=lumix-questions
DYNAMODB_LESSONS_TABLE=lumix-lesson-plans
DYNAMODB_GRADE_HISTORY_TABLE=lumix-grade-history
DYNAMODB_SESSION_SCHEDULES_TABLE=lumix-session-schedules
S3_BUCKET_NAME=lumix-files
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

```

---

## 📋 **Additional Prompts for Specific Features**

### **For AWS Bedrock Agent Setup:**
```
Create an AWS Bedrock Agent configuration for Lumix with these action groups:

1. query_students - Get student information and performance
2. query_questions - Search question bank
3. generate_lesson_plan - Create personalized lesson plans
4. grade_worksheet - Analyze and grade student work
5. get_insights - Provide teaching insights

Use Amazon Bedrock Nova Lite model (amazon.nova-lite-v1:0) for reasoning.
Include proper IAM policies and Lambda function code if needed.
Provide both AWS Console setup instructions AND AWS SDK code.
```

### **For PDF Generation:**
```
Implement worksheet PDF generation for Lumix lesson plans:
- Use jsPDF or pdfkit
- Include: Header with Lumix branding, student name, date, lesson objectives
- Format questions with proper spacing
- Include sections: Warm-up, Main Practice, Challenge, Homework
- Professional layout suitable for printing
- Save to S3 and return presigned URL
```

### **For Textract OCR Processing:**
```
Implement document processing pipeline:
1. Accept PDF/image upload
2. Upload to S3
3. Use AWS Textract DetectDocumentText API
4. Parse extracted text to identify individual questions
5. Use Bedrock Nova to classify each question by topic
6. Generate explanations for each question
7. Store structured data in DynamoDB
8. Handle errors gracefully

Include progress tracking for multi-question documents.