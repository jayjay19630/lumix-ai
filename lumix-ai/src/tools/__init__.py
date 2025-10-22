"""
Agent tools for Lumix AI Assistant
"""
from .student_tools import query_students, query_grade_history
from .question_tools import query_question_topics, query_questions, generate_questions
from .lesson_tools import (
    generate_lesson_plan,
    generate_worksheet,
    create_lesson_plan,
    create_lesson_with_worksheet
)
from .schedule_tools import get_schedule, create_session, get_sessions
from .worksheet_tools import create_worksheet
from .web_search_tool import web_search
from .datetime_tools import get_current_datetime, calculate_date_offset

__all__ = [
    # Student tools
    'query_students',
    'query_grade_history',

    # Question tools
    'query_question_topics',
    'query_questions',
    'generate_questions',

    # Lesson planning tools
    'generate_lesson_plan',  # Deprecated - kept for compatibility
    'create_lesson_plan',
    'create_lesson_with_worksheet',

    # Worksheet tools
    'generate_worksheet',  # Deprecated - kept for compatibility
    'create_worksheet',

    # Schedule and session tools
    'get_schedule',
    'get_sessions',
    'create_session',

    # Web search
    'web_search',

    # Date/Time tools
    'get_current_datetime',
    'calculate_date_offset',
]
