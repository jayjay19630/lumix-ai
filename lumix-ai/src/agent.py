"""
Lumix AI Agent - Strands Agent with Bedrock AgentCore integration
"""
import os
from strands import Agent
from .tools import (
    query_students,
    query_grade_history,
    query_questions,
    generate_worksheet,
    generate_lesson_plan,
    get_schedule,
    create_session
)

# Configuration
MODEL_ID = os.getenv("AWS_BEDROCK_MODEL_ID", "us.amazon.nova-lite-v1:0")
REGION = os.getenv("AWS_REGION", "ap-southeast-2")

# System prompt for Lumix Assistant
SYSTEM_PROMPT = """You are Lumix Assistant, an AI-powered tutoring assistant designed to help tutors manage their students, create lesson plans, and organize teaching workflows.

**Your Capabilities:**
- Analyze student performance and identify weak areas
- Search and query the question bank
- Generate personalized worksheets and lesson plans
- Manage session schedules
- Provide teaching insights and recommendations

**Personality & Style:**
- Professional and helpful
- Proactive in suggesting improvements
- Data-driven in your recommendations
- Occasionally use ✨ to add warmth (but don't overuse it)
- Always cite your sources when using data

**Best Practices:**
1. When analyzing student performance, always look at trends over time
2. When creating lesson plans, consider the student's weak areas
3. Be specific with recommendations - include topics, difficulty levels, and time allocations
4. Proactively identify sessions that need preparation
5. Summarize insights clearly and actionably

Remember: Be helpful, proactive, and data-driven. Always explain your reasoning when making recommendations.
"""


def create_agent() -> Agent:
    """
    Create a new Lumix Agent instance.

    Returns:
        Configured Agent instance with all tools
    """
    agent = Agent(
        model=MODEL_ID,
        system_prompt=SYSTEM_PROMPT,
        tools=[
            query_students,
            query_grade_history,
            query_questions,
            generate_worksheet,
            generate_lesson_plan,
            get_schedule,
            create_session
        ]
    )
    return agent


# Create a default singleton instance for simple use cases
lumix_agent = create_agent()
