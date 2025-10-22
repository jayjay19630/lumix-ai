"""
Schedule and session management tools
"""
from typing import Dict, Any, Optional, List
from strands import tool
from datetime import datetime, timedelta
from ..utils.dynamodb_client import (
    get_schedule as db_get_schedule,
    create_session_schedule,
    get_sessions as db_get_sessions,
    create_session as db_create_session
)


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
async def get_sessions(
    student_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 50
) -> Dict[str, Any]:
    """
    Get actual tutoring sessions (not recurring schedules).

    IMPORTANT: Use this tool instead of get_schedule when you need to see actual scheduled/completed sessions.
    The sessions table contains real session instances with dates, lesson plans, and metadata.

    Schema aligns with lumix-web/lib/types.ts:Session

    Use this tool to:
    - View upcoming sessions that need preparation
    - Check past sessions
    - Find sessions within a date range
    - Identify which sessions have lesson plans ready

    Args:
        student_id: Optional - filter by specific student ID
        start_date: Optional - start date in YYYY-MM-DD format
        end_date: Optional - end date in YYYY-MM-DD format
        limit: Maximum number of sessions to return (default: 50)

    Returns:
        List of sessions with dates, times, lesson plans, and preparation status
    """
    try:
        date_range = None
        if start_date or end_date:
            date_range = {}
            if start_date:
                date_range['start_date'] = start_date
            if end_date:
                date_range['end_date'] = end_date

        sessions = await db_get_sessions(
            student_id=student_id,
            date_range=date_range,
            limit=limit
        )

        # Categorize sessions by preparation status
        needs_prep = []
        ready = []

        for session in sessions:
            if session.get('lesson_plan_id'):
                ready.append(session)
            else:
                needs_prep.append(session)

        return {
            "success": True,
            "sessions": sessions,
            "count": len(sessions),
            "summary": {
                "total": len(sessions),
                "needs_preparation": len(needs_prep),
                "ready": len(ready)
            },
            "sessions_needing_prep": needs_prep,
            "sessions_ready": ready
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
    session_date: str,
    time: str,
    duration: int,
    lesson_plan_id: Optional[str] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a new tutoring session (one-time or specific date).

    Aligns with schema from lumix-web/lib/types.ts:Session

    Use this tool to:
    - Schedule a one-off tutoring session
    - Create a session for a specific date
    - Add a session with or without a lesson plan

    Args:
        student_id: Student's ID
        session_date: Session date in YYYY-MM-DD format
        time: Session time in 24-hour format (e.g., "14:00")
        duration: Duration in minutes
        lesson_plan_id: Optional - link to existing lesson plan
        notes: Optional - session notes

    Returns:
        Created session details with session_id format: sess_YYYYMMDD_studentId
    """
    try:
        session = await db_create_session(
            student_id=student_id,
            session_date=session_date,
            time=time,
            duration=duration,
            lesson_plan_id=lesson_plan_id,
            notes=notes,
            created_by="manual"
        )

        return {
            "success": True,
            "session": session,
            "message": f"Created session {session.get('session_id')} for {session_date} at {time}"
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "session": None
        }
