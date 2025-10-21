"""
Schedule and session management tools
"""
from typing import Dict, Any, Optional, List
from strands import tool
from datetime import datetime, timedelta
from ..utils.dynamodb_client import get_schedule as db_get_schedule, create_session_schedule


@tool
async def get_schedule(
    student_id: Optional[str] = None,
    days_ahead: int = 7
) -> Dict[str, Any]:
    """
    Get upcoming tutoring sessions from the schedule.

    Use this tool to:
    - View all upcoming sessions for the week
    - Check a specific student's session schedule
    - Identify sessions that need lesson plans prepared

    Args:
        student_id: Optional - filter by specific student ID
        days_ahead: Number of days to look ahead (default: 7)

    Returns:
        List of scheduled sessions with student info, time, duration, and status
    """
    try:
        schedules = await db_get_schedule(student_id=student_id)

        # Convert recurring schedules to actual session dates for the next N days
        today = datetime.now()
        upcoming_sessions = []

        for schedule in schedules:
            if not schedule.get('is_active', True):
                continue

            day_of_week = schedule.get('day_of_week')
            time_str = schedule.get('time')

            # Find the next occurrence(s) of this day in the next N days
            for i in range(days_ahead):
                date = today + timedelta(days=i)
                if date.weekday() == ((day_of_week - 1) % 7):  # Adjust for Python's Monday=0
                    upcoming_sessions.append({
                        'schedule_id': schedule.get('schedule_id'),
                        'student_id': schedule.get('student_id'),
                        'date': date.strftime('%Y-%m-%d'),
                        'day': date.strftime('%A'),
                        'time': time_str,
                        'duration': schedule.get('duration'),
                        'focus_topics': schedule.get('focus_topics', []),
                        'has_lesson_plan': False  # TODO: Check lesson_plans table
                    })

        # Sort by date and time
        upcoming_sessions.sort(key=lambda x: f"{x['date']} {x['time']}")

        return {
            "success": True,
            "sessions": upcoming_sessions,
            "count": len(upcoming_sessions),
            "days_ahead": days_ahead
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "sessions": [],
            "count": 0
        }


@tool
async def create_session(
    student_id: str,
    day_of_week: int,
    time: str,
    duration: int,
    focus_topics: List[str]
) -> Dict[str, Any]:
    """
    Create a new recurring tutoring session in the schedule.

    Use this tool to:
    - Add a new recurring session for a student
    - Set up regular weekly tutoring times

    Args:
        student_id: Student's ID
        day_of_week: Day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
        time: Session time in 24-hour format (e.g., "14:00")
        duration: Duration in minutes
        focus_topics: List of topics to focus on

    Returns:
        Created session schedule details
    """
    try:
        session = await create_session_schedule(
            student_id=student_id,
            day_of_week=day_of_week,
            time=time,
            duration=duration,
            focus_topics=focus_topics
        )

        return {
            "success": True,
            "session": session,
            "message": f"Created recurring session for {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day_of_week]}s at {time}"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "session": None
        }
