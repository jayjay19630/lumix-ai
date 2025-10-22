"""
Lumix AI Agent - Strands Agent with Bedrock AgentCore integration
"""
from strands import Agent
from . import config
from .tools import (
    # Student tools
    query_students,
    query_grade_history,
    # Question tools
    query_questions,
    generate_questions,
    # Lesson planning tools
    generate_lesson_plan,
    create_lesson_plan,
    create_lesson_with_worksheet,
    # Worksheet tools
    generate_worksheet,
    create_worksheet,
    # Schedule and session tools
    get_schedule,
    get_sessions,
    create_session,
    # Web search
    web_search
)

# Configuration
MODEL_ID = config.AWS_BEDROCK_MODEL_ID
REGION = config.AWS_REGION

# Enhanced system prompt for Lumix Assistant
SYSTEM_PROMPT = """You are Lumix Assistant, an AI tutor assistant helping teachers manage students and create learning materials.

**Your Capabilities:**

1. **Student Analysis** - Query student profiles and grade history to identify weak areas
2. **Question & Worksheet Generation** - Search questions and create custom worksheets with PDFs
3. **Lesson Planning** - Create lesson plans with objectives, activities, and materials

**Important: Always Ask Before Acting**

Get user confirmation before:
- Generating questions
- Creating worksheets
- Creating lesson plans
- Creating sessions

**Example Workflow:**

User: "How is student Jo An doing?"
You:
1. Call `query_students` to find the student
2. Call `query_grade_history` to analyze performance
3. Present findings clearly
4. ASK: "Would you like me to create a practice worksheet for [weak topics]?"
5. Only proceed if confirmed

**Tools:**
- `query_students` / `query_grade_history` - student analysis
- `query_questions` - search existing questions
- `generate_questions` - create new questions (after confirmation)
- `create_worksheet` - generate PDF worksheets (after confirmation)
- `create_lesson_plan` - lesson planning (after confirmation)
- `get_sessions` - view scheduled/completed sessions
- `web_search` - find teaching resources

**Communication:**
- Professional and helpful
- Data-driven with clear explanations
- Use ✨ sparingly for warmth
- Never show internal thinking or processing steps
- Always ask before taking actions

Remember: Query data first, present findings, then ask for confirmation before creating content.
"""


def create_agent() -> Agent:
    """
    Create a new Lumix Agent instance with all enhanced tools.

    Returns:
        Configured Agent instance with all tools
    """
    agent = Agent(
        model=MODEL_ID,
        system_prompt=SYSTEM_PROMPT,
        tools=[
            # Student analysis tools
            query_students,
            query_grade_history,

            # Question management tools
            query_questions,
            generate_questions,  # NEW: Autonomous question generation

            # Lesson planning tools (new + legacy)
            create_lesson_plan,  # NEW: Flexible lesson planning
            create_lesson_with_worksheet,  # NEW: Integrated workflow
            generate_lesson_plan,  # Legacy - kept for compatibility

            # Worksheet tools
            create_worksheet,  # NEW: Complete worksheet generation with PDF
            generate_worksheet,  # Legacy - kept for compatibility

            # Session management tools
            get_sessions,  # NEW: Query actual sessions (FIXED)
            get_schedule,  # Legacy: Recurring schedule templates
            create_session,

            # Web search tool
            web_search  # NEW: Educational web search
        ]
    )
    return agent


# Create a default singleton instance for simple use cases
lumix_agent = create_agent()
