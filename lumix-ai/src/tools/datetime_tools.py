"""
Date and time tools for the AI agent
"""
from typing import Dict, Any
from strands import tool
from datetime import datetime, timezone
import calendar


@tool
async def get_current_datetime(
    timezone_name: str = "UTC",
    format_type: str = "full"
) -> Dict[str, Any]:
    """
    Get the current date and time information.

    CRITICAL: Use this tool to understand temporal context when users reference:
    - "today", "tomorrow", "this week", "next month"
    - Scheduling and calendar-related queries
    - Date-based filtering or comparisons
    - Understanding how recent something is

    This tool provides comprehensive date/time information including:
    - Current date and time
    - Day of week
    - Week number
    - Month and year
    - ISO format for database queries

    Use this tool to:
    - Determine "today's date" for scheduling
    - Calculate relative dates (e.g., "3 days from now")
    - Understand temporal context in user queries
    - Generate time-based greetings
    - Filter data by date ranges

    Args:
        timezone_name: Timezone (default: "UTC"). Common values: "UTC", "US/Eastern", "Europe/London"
        format_type: Output format - "full", "date_only", "time_only", or "timestamp"

    Returns:
        Comprehensive date/time information with multiple formats
    """
    try:
        # Get current time in UTC
        now_utc = datetime.now(timezone.utc)

        # Format based on type
        result = {
            "success": True,
            "timezone": timezone_name,
            "timestamp": now_utc.timestamp(),

            # ISO formats (best for database queries)
            "iso_datetime": now_utc.isoformat(),
            "iso_date": now_utc.date().isoformat(),
            "iso_time": now_utc.time().isoformat(),

            # Human-readable formats
            "formatted": {
                "full": now_utc.strftime("%A, %B %d, %Y at %I:%M %p %Z"),
                "date": now_utc.strftime("%B %d, %Y"),
                "date_short": now_utc.strftime("%m/%d/%Y"),
                "time_12h": now_utc.strftime("%I:%M %p"),
                "time_24h": now_utc.strftime("%H:%M"),
                "day_name": now_utc.strftime("%A"),
                "month_name": now_utc.strftime("%B")
            },

            # Components
            "components": {
                "year": now_utc.year,
                "month": now_utc.month,
                "day": now_utc.day,
                "hour": now_utc.hour,
                "minute": now_utc.minute,
                "second": now_utc.second,
                "weekday": now_utc.weekday(),  # 0=Monday, 6=Sunday
                "weekday_name": calendar.day_name[now_utc.weekday()],
                "week_number": now_utc.isocalendar()[1],
                "day_of_year": now_utc.timetuple().tm_yday
            },

            # Contextual helpers
            "context": {
                "is_weekend": now_utc.weekday() >= 5,
                "is_weekday": now_utc.weekday() < 5,
                "quarter": (now_utc.month - 1) // 3 + 1,
                "days_in_month": calendar.monthrange(now_utc.year, now_utc.month)[1],
                "is_leap_year": calendar.isleap(now_utc.year)
            }
        }

        # Simplified output based on format_type
        if format_type == "date_only":
            result["primary_output"] = result["formatted"]["date"]
        elif format_type == "time_only":
            result["primary_output"] = result["formatted"]["time_12h"]
        elif format_type == "timestamp":
            result["primary_output"] = result["timestamp"]
        else:  # full
            result["primary_output"] = result["formatted"]["full"]

        return result

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to get current date/time"
        }


@tool
async def calculate_date_offset(
    base_date: str,
    offset_days: int = 0,
    offset_weeks: int = 0,
    offset_months: int = 0
) -> Dict[str, Any]:
    """
    Calculate a date relative to a base date (e.g., "3 days from today", "2 weeks ago").

    Use this tool to:
    - Calculate future dates for scheduling
    - Determine past dates for historical queries
    - Find date ranges (e.g., "last 7 days")
    - Schedule recurring events

    Args:
        base_date: Base date in ISO format (YYYY-MM-DD) or "today" for current date
        offset_days: Number of days to add (negative for past)
        offset_weeks: Number of weeks to add (negative for past)
        offset_months: Approximate months to add (negative for past, uses 30 days per month)

    Returns:
        Calculated date with multiple format options

    Examples:
        - "3 days from today": base_date="today", offset_days=3
        - "2 weeks ago": base_date="today", offset_weeks=-2
        - "next month": base_date="today", offset_months=1
    """
    try:
        from datetime import timedelta

        # Parse base date
        if base_date.lower() == "today":
            base_dt = datetime.now(timezone.utc)
        else:
            base_dt = datetime.fromisoformat(base_date.replace('Z', '+00:00'))

        # Calculate total offset in days
        total_offset_days = offset_days + (offset_weeks * 7) + (offset_months * 30)

        # Apply offset
        result_dt = base_dt + timedelta(days=total_offset_days)

        return {
            "success": True,
            "base_date": base_dt.date().isoformat(),
            "calculated_date": result_dt.date().isoformat(),
            "offset_applied": {
                "days": offset_days,
                "weeks": offset_weeks,
                "months": offset_months,
                "total_days": total_offset_days
            },
            "formatted": {
                "full": result_dt.strftime("%A, %B %d, %Y"),
                "short": result_dt.strftime("%m/%d/%Y"),
                "day_name": result_dt.strftime("%A")
            },
            "components": {
                "year": result_dt.year,
                "month": result_dt.month,
                "day": result_dt.day,
                "weekday_name": calendar.day_name[result_dt.weekday()]
            }
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "message": "Failed to calculate date offset"
        }
