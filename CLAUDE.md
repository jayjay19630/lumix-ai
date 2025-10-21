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
     - Analyze student weaknesses
     - Select appropriate questions from bank to create worksheet
     - Structure lesson content to teach
   - Generate PDF worksheet (use a library like pdfkit or jsPDF)
   - Store in S3
   - Save lesson plan to DynamoDB
4. Display generated lesson plan with full structure
5. Download worksheet PDF

PHASE 5 - AI Agent Chat with Web Search:

1. UI LAYOUT:
   - Dashboard: Full ChatGPT-like interface (center screen)
   - Other pages: Fixed right sidebar (350px, collapsible)
   - Show agent "thinking" with action traces
   - Display web search queries and sources when used

2. BEDROCK AGENT ACTION GROUPS:
   
   Core Actions:
   - query_students - Get student profiles/performance
   - query_grade_history - Get graded sessions, analyze patterns
   - query_questions - Search question bank
   - generate_worksheet - Create worksheets with questions
   - generate_lesson_plan - Create lesson plans (with student data)
   - get_schedule - Get upcoming sessions
   - create_session - Add one-off sessions
   - web_search - Search web for teaching resources, syllabus info, strategies

4. API ENDPOINTS:
   
   POST /api/agent/chat
   - Accept: message, conversation_id, page_context
   - Bedrock Agent orchestrates actions + web search
   - Return: response, action_trace, sources, conversation_id
   
5. AGENT SYSTEM PROMPT:
   
   "You are Lumix Assistant with web search. Help tutors by:
   - Analyzing student performance
   - Creating lesson plans and worksheets
   - Researching curriculum and teaching strategies
   
   Use web search for:
   - Syllabus information (IGCSE, IB, etc.)
   - Teaching resources and tools
   - Current exam formats
   - Educational best practices
   
   Always cite sources. Be proactive. Use ✨ occasionally."

6. KEY WORKFLOWS

   Workflow 1: Performance Analysis
   User: "How is Alice doing?"
   Agent:
   - Calls query_students(student_name="Alice")
   - Calls query_grade_history(student_id="alice_001", limit=5)
   - Responds: "Alice is performing at 68% overall. Her weak area is 
     Quadratic Equations (55% accuracy). In the last 5 sessions, she's 
     improved from 62% to 75%. I recommend focusing next lesson on 
     double-root problems. Would you like me to generate a lesson plan?"

   Workflow 2: Schedule Overview
   User: "What sessions do I have this week?"
   Agent:
   - Calls get_schedule(start_date="2024-10-21", end_date="2024-10-27")
   - Responds: "You have 8 sessions this week:
     
     Needs Attention:
     • Mon 3pm - Alice (no lesson plan yet) ⚠️
     • Thu 4pm - Bob (no lesson plan yet) ⚠️
     
     Ready:
     • Mon 5pm - Alice ✓
     • Wed 2pm - Charlie ✓
     • Fri 3pm - Alice ✓
     
     Would you like me to generate the missing lesson plans?"
   
   Workflow 3: Proactive Lesson Planning
   User: "Create lesson plan for Alice's Monday session on quadratic equations based on her weaknesses"
   Agent:
   - Calls get_schedule(student_id="alice_001", date="next Monday")
   - Calls query_grade_history(student_id="alice_001")
   - Calls generate_worksheet(topic="Quadratic Equations", difficulty="medium", count=8)
   - Calls generate_lesson_plan(session_id="sess_xxx", topic="Quadratic Equations", worksheet_id="ws_xxx", use_student_data=true)
   - Responds: "✓ Created lesson plan for Alice's Monday session (Oct 28, 3pm).
     Focus: Quadratic Equations with emphasis on double roots.
     Attached 8-question worksheet (medium difficulty).
     [View Lesson Plan] [View Worksheet]"

   Example 4: Combined Workflow
   User: "Prepare Alice's session on functions based on IGCSE syllabus"
   Agent:
   - web_search("IGCSE functions syllabus requirements")
   - query_grade_history(Alice)
   - query_questions(functions, IGCSE-aligned)
   - generate_worksheet + generate_lesson_plan
   - Returns complete session prep with syllabus alignment

7. UI COMPONENTS:
   - AgentChat.tsx - Main chat interface
   - AgentSidebar.tsx - Compact sidebar
   - MessageBubble.tsx - With source citations
   - ActionTrace.tsx - Show web searches + actions
   - SourceCard.tsx - Display web sources
   - ThinkingIndicator.tsx - "Searching web..."

8. IMPLEMENTATION:
   1. Configure Bedrock Agent with web search enabled
   2. Create action group Lambda functions
   3. Build /api/agent/chat endpoint
   4. Implement chat UI (dashboard + sidebar)
   5. Add web search action (if custom)
   6. Test workflows with web search
   7. Add source citation display
   8. Polish with action traces

TECHNICAL NOTES:
- Use @aws-sdk/client-bedrock-agent-runtime
- Enable streaming responses
- Cache web search results (5min TTL)
- Log all actions for debugging
- Rate limit agent calls
- Show "Searching web..." in UI
- Display sources as clickable links

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

## 📋 **Additional Prompts for Specific Features**

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
