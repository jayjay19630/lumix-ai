# Lumix ✨

**AI-Powered Tutor Assistant** - Teaching brilliance, powered by AI

Lumix helps tutors manage students, grade worksheets, generate personalized lesson plans, and organize their teaching workflow using AWS AI services.

---

## 🏗️ Project Structure

This is a monorepo containing two services:

```
lumix/
├── lumix-web/          # Next.js frontend (TypeScript)
│   ├── app/            # Next.js App Router pages
│   ├── components/     # React components
│   ├── lib/            # Utilities, DB clients, AI service client
│   └── package.json
│
├── lumix-ai/           # AI Service (Python FastAPI)
│   ├── src/            # FastAPI application
│   │   ├── main.py             # Main app + Lambda handler
│   │   ├── services/           # Bedrock & Textract services
│   │   └── aws_clients.py      # AWS SDK clients
│   ├── requirements.txt
│   └── deploy.sh       # Deployment scripts
│
├── QUICKSTART.md       # Quick start guide
└── AI_SERVICE_MIGRATION.md  # Architecture details
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- AWS Account with Bedrock access
- AWS credentials configured

### 1. Start AI Service

```bash
cd lumix-ai

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your AWS credentials

# Start server
python -m src.main
```

**AI service runs on http://localhost:8000**

### 2. Start Web App

```bash
cd lumix-web

# Install dependencies
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your AWS credentials

# Add AI service URL
echo "AI_SERVICE_URL=http://localhost:8000" >> .env.local

# Start development server
npm run dev
```

**Web app runs on http://localhost:3000**

---

## 📚 Tech Stack

### Frontend (lumix-web)

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **State**: React 19
- **Database**: AWS DynamoDB
- **Storage**: AWS S3

### Backend (lumix-ai)

- **Framework**: FastAPI
- **Language**: Python 3.11
- **AI/ML**: AWS Bedrock (Amazon Nova)
- **OCR**: AWS Textract
- **Deployment**: AWS Lambda (via Mangum)
- **Container**: Docker

---

## ✨ Features

### ✅ Implemented

- **Question Bank**
  - Upload past papers (PDF/images)
  - Automatic OCR extraction (Textract)
  - AI classification by topic and difficulty (Bedrock)
  - Auto-generated explanations and teaching tips

- **Student Management**
  - Track student profiles and performance
  - Performance analytics by topic
  - Grade history tracking

- **Worksheet Generation**
  - AI-powered question selection
  - Customizable by topic, difficulty, and count
  - PDF export

- **Lesson Planning**
  - AI-generated lesson plans
  - Structured teaching notes
  - Duration-based planning

- **Grading**
  - Automatic worksheet grading (Textract + Bedrock)
  - Student answer extraction
  - Performance tracking and insights

### 🚧 Coming Soon

- Agent chat interface (Bedrock AgentCore + Strands)
- Web search integration for curriculum research
- Multi-turn agent conversations
