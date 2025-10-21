# Lumix AI Service

Python-based AI service handling all AI/ML operations for Lumix tutor assistant.

## Architecture

This service separates all AI-related processing from the Next.js frontend:

- **Next.js App**: CRUD operations, data management, UI
- **AI Service (Python)**: All AI generation, OCR, grading, agent orchestration

### Why Python?

- Native AWS SDK support for Bedrock and Textract
- Better AI/ML ecosystem
- Lambda-optimized
- Ready for Bedrock AgentCore integration

## Features

### ✅ Implemented

1. **Question Processing**
   - `POST /api/questions/classify` - Classify topic and difficulty
   - `POST /api/questions/explain` - Generate explanations and teaching tips
   - `POST /api/questions/select` - AI-powered question selection

2. **Document Processing (Textract + AI)**
   - `POST /api/documents/extract` - Extract text and parse questions from upload
   - `POST /api/documents/extract-s3` - Extract from S3 document
   - `POST /api/documents/extract-answers` - Extract student answers

3. **Lesson Planning**
   - `POST /api/lessons/generate` - Generate AI-powered lesson plans

4. **Grading**
   - `POST /api/grading/grade-worksheet` - AI-based worksheet grading

5. **Agent Orchestration (Placeholder)**
   - `POST /api/agent/chat` - Chat endpoint (ready for AgentCore)

### 🚧 Coming Soon

- Bedrock AgentCore integration with Strands
- Web search capabilities
- Multi-turn conversation support

## Tech Stack

- **FastAPI**: Modern Python web framework
- **Mangum**: ASGI adapter for AWS Lambda
- **AWS SDK (boto3)**: Bedrock, Textract, S3
- **Pydantic**: Request/response validation

## Project Structure

```
ai-service/
├── src/
│   ├── main.py                     # FastAPI app + Lambda handler
│   ├── config.py                   # Configuration
│   ├── aws_clients.py              # AWS client initialization
│   └── services/
│       ├── bedrock_service.py      # Bedrock AI functions
│       └── textract_service.py     # Textract OCR + parsing
├── requirements.txt
├── Dockerfile                       # Lambda container image
├── serverless.yml                   # Serverless Framework config
├── deploy.sh                        # Deployment script
└── README.md
```

## Setup

### 1. Install Dependencies

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your AWS credentials:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
S3_BUCKET_NAME=lumix-uploads
```

### 3. Run Locally

```bash
# Option 1: Direct run
python -m src.main

# Option 2: Using deploy script
./deploy.sh local
```

API will be available at `http://localhost:8000`

View API docs at `http://localhost:8000/docs`

## Deployment

### Option 1: Serverless Framework (Recommended)

```bash
# Install Serverless
npm install -g serverless

# Deploy
./deploy.sh lambda

# Or manually:
serverless deploy
```

This creates:
- Lambda function with FastAPI
- API Gateway HTTP API
- IAM roles with proper permissions

### Option 2: Docker to Lambda

```bash
# Build and push to ECR
./deploy.sh docker

# Then create Lambda function in AWS Console using the ECR image
```

### Option 3: Manual Lambda Deployment

1. Zip the application:
```bash
cd src
zip -r ../function.zip .
cd ..
pip install -r requirements.txt -t package/
cd package
zip -r ../function.zip .
cd ..
```

2. Upload to Lambda via AWS Console

3. Set handler to: `src.main.handler`

4. Configure environment variables

5. Add IAM permissions:
   - `bedrock:InvokeModel`
   - `textract:DetectDocumentText`
   - `s3:GetObject`, `s3:PutObject`

## Environment Variables

Required for Lambda:

```
AWS_BEDROCK_MODEL_ID=amazon.nova-lite-v1:0
S3_BUCKET_NAME=lumix-uploads
```

AWS credentials are provided automatically by Lambda execution role.

## API Endpoints

### Health Check

```bash
GET /
GET /health
```

### Question Processing

```bash
# Classify question
POST /api/questions/classify
{
  "question_text": "Solve x^2 - 5x + 6 = 0"
}

# Generate explanation
POST /api/questions/explain
{
  "question_text": "Solve x^2 - 5x + 6 = 0"
}

# Select questions for worksheet
POST /api/questions/select
{
  "questions": [...],
  "criteria": {
    "topics": ["Quadratic Equations"],
    "difficulty": ["Medium"],
    "questionCount": 10
  }
}
```

### Document Processing

```bash
# Extract from upload
POST /api/documents/extract
Content-Type: multipart/form-data
file: <PDF or image file>

# Extract from S3
POST /api/documents/extract-s3
{
  "bucket": "lumix-uploads",
  "key": "documents/test.pdf"
}
```

### Lesson Plans

```bash
POST /api/lessons/generate
{
  "topic": "Quadratic Equations",
  "duration": 60,
  "student_id": "student_123"
}
```

### Grading

```bash
POST /api/grading/grade-worksheet
{
  "extracted_text": "Q1. x = 2, 3\nQ2. ...",
  "student_name": "Alice"
}
```

### Agent Chat (Placeholder)

```bash
POST /api/agent/chat
{
  "message": "How is Alice doing?",
  "conversation_id": "session_123"
}
```

## Integration with Next.js

Update Next.js API routes to call the AI service:

```typescript
// app/api/questions/process/route.ts
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  // Get file from request
  const formData = await request.formData();
  const file = formData.get('file');

  // Call AI service
  const aiFormData = new FormData();
  aiFormData.append('file', file);

  const response = await fetch(`${AI_SERVICE_URL}/api/documents/extract`, {
    method: 'POST',
    body: aiFormData,
  });

  const result = await response.json();

  // Process result and save to DynamoDB
  // ...
}
```

## Testing

```bash
# Test health check
curl http://localhost:8000/health

# Test question classification
curl -X POST http://localhost:8000/api/questions/classify \
  -H "Content-Type: application/json" \
  -d '{"question_text": "Solve x^2 - 5x + 6 = 0"}'

# Test document extraction
curl -X POST http://localhost:8000/api/documents/extract \
  -F "file=@test.pdf"
```

## Future: Bedrock AgentCore Integration

Placeholder at `/api/agent/chat` will be replaced with:

```python
from bedrock_agentcore.runtime import BedrockAgentCoreApp
from strands import Agent

# Initialize agent with tools
agent = Agent(tools=[...])

app = BedrockAgentCoreApp()

@app.entrypoint
def agent_invocation(payload, context):
    result = agent(payload.get("message"))
    return {"result": result.message}
```

## Monitoring

Lambda CloudWatch logs:
```bash
# View logs
serverless logs -f api

# Tail logs
serverless logs -f api --tail
```

## Troubleshooting

### Import Errors in Lambda

Make sure all dependencies are in the Lambda layer or deployment package.

### Timeout Errors

Increase Lambda timeout in `serverless.yml`:
```yaml
timeout: 600  # 10 minutes
```

### Memory Errors

Increase Lambda memory:
```yaml
memorySize: 2048
```

### Bedrock Access Denied

Ensure IAM role has `bedrock:InvokeModel` permission.

## Cost Optimization

- Use Lambda with ARM architecture for 20% cost savings
- Set appropriate memory (1024MB recommended)
- Use Lambda reserved concurrency for predictable costs
- Cache AI responses for common queries

## Security

- API Gateway with API keys
- VPC integration for private resources
- Secrets Manager for sensitive credentials
- CORS configuration for frontend URL only

## License

MIT
