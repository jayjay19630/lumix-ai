"""
DynamoDB client utilities for agent tools
"""
import boto3
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from ..config import AWS_REGION

dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
dynamodb_client = boto3.client('dynamodb', region_name=AWS_REGION)

# Table references
students_table = dynamodb.Table('lumix-students')
questions_table = dynamodb.Table('lumix-questions')
lesson_plans_table = dynamodb.Table('lumix-lesson-plans')
grade_history_table = dynamodb.Table('lumix-grade-history')
session_schedules_table = dynamodb.Table('lumix-session-schedules')
sessions_table = dynamodb.Table('lumix-sessions')


async def get_student_by_name(name: str) -> Optional[Dict[str, Any]]:
    """Find student by name (case-insensitive search)"""
    try:
        response = students_table.scan(
            FilterExpression='contains(#name, :name)',
            ExpressionAttributeNames={'#name': 'name'},
            ExpressionAttributeValues={':name': name}
        )
        if response['Items']:
            return response['Items'][0]
        return None
    except Exception as e:
        print(f"Error getting student by name: {e}")
        return None


async def get_student_by_id(student_id: str) -> Optional[Dict[str, Any]]:
    """Get student by ID"""
    try:
        response = students_table.get_item(Key={'student_id': student_id})
        return response.get('Item')
    except Exception as e:
        print(f"Error getting student by ID: {e}")
        return None


async def get_all_students() -> List[Dict[str, Any]]:
    """Get all students"""
    try:
        response = students_table.scan()
        return response.get('Items', [])
    except Exception as e:
        print(f"Error getting all students: {e}")
        return []


async def get_grade_history(student_id: str, limit: int = 10) -> List[Dict[str, Any]]:
    """Get student's grade history"""
    try:
        response = grade_history_table.query(
            IndexName='StudentIndex',
            KeyConditionExpression='student_id = :student_id',
            ExpressionAttributeValues={':student_id': student_id},
            ScanIndexForward=False,  # Most recent first
            Limit=limit
        )
        return response.get('Items', [])
    except Exception as e:
        print(f"Error getting grade history: {e}")
        return []


async def search_questions(
    topic: Optional[str] = None,
    difficulty: Optional[str] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """Search questions by topic and/or difficulty"""
    try:
        filter_expressions = []
        expression_values = {}

        if topic:
            filter_expressions.append('contains(topic, :topic)')
            expression_values[':topic'] = topic

        if difficulty:
            filter_expressions.append('difficulty = :difficulty')
            expression_values[':difficulty'] = difficulty

        params = {'Limit': limit}

        if filter_expressions:
            params['FilterExpression'] = ' AND '.join(filter_expressions)
            params['ExpressionAttributeValues'] = expression_values

        response = questions_table.scan(**params)
        return response.get('Items', [])
    except Exception as e:
        print(f"Error searching questions: {e}")
        return []


async def get_schedule(
    student_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None
) -> List[Dict[str, Any]]:
    """Get session schedules"""
    try:
        if student_id:
            response = session_schedules_table.query(
                IndexName='StudentIndex',
                KeyConditionExpression='student_id = :student_id',
                ExpressionAttributeValues={':student_id': student_id}
            )
        else:
            response = session_schedules_table.scan()

        return response.get('Items', [])
    except Exception as e:
        print(f"Error getting schedule: {e}")
        return []


async def create_session_schedule(
    student_id: str,
    day_of_week: int,
    time: str,
    duration: int,
    focus_topics: List[str]
) -> Dict[str, Any]:
    """Create a new session schedule"""
    import uuid

    try:
        schedule_id = f"schedule_{uuid.uuid4().hex[:8]}"
        item = {
            'schedule_id': schedule_id,
            'student_id': student_id,
            'day_of_week': day_of_week,
            'time': time,
            'duration': duration,
            'focus_topics': focus_topics,
            'is_active': True,
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat()
        }

        session_schedules_table.put_item(Item=item)
        return item
    except Exception as e:
        print(f"Error creating session schedule: {e}")
        raise


async def get_sessions(
    student_id: Optional[str] = None,
    date_range: Optional[Dict[str, str]] = None,
    limit: int = 50
) -> List[Dict[str, Any]]:
    """
    Get sessions from the sessions table directly.
    This is different from session_schedules which are recurring templates.
    Sessions are actual scheduled/completed tutoring sessions.

    Schema (from lumix-web):
    - session_id (PK): format "sess_YYYYMMDD_studentId"
    - student_id
    - date (GSI): YYYY-MM-DD format
    - time: HH:MM format
    - duration: minutes
    - lesson_plan_id (optional)
    - schedule_id (optional): if auto-generated from recurring schedule
    - notes (optional)
    - created_by: "auto" | "manual"

    Args:
        student_id: Filter by student ID
        date_range: Dict with 'start_date' and 'end_date' (YYYY-MM-DD format)
        limit: Maximum number of sessions to return
    """
    try:
        if student_id:
            # Query using GSI
            params = {
                'IndexName': 'StudentIndex',
                'KeyConditionExpression': 'student_id = :student_id',
                'ExpressionAttributeValues': {':student_id': student_id},
                'Limit': limit,
                'ScanIndexForward': False  # Most recent first
            }

            # Add filter expressions for date_range
            filter_expressions = []
            if date_range:
                if 'start_date' in date_range:
                    filter_expressions.append('#date >= :start_date')
                    params['ExpressionAttributeNames'] = {'#date': 'date'}
                    params['ExpressionAttributeValues'][':start_date'] = date_range['start_date']
                if 'end_date' in date_range:
                    filter_expressions.append('#date <= :end_date')
                    if '#date' not in params.get('ExpressionAttributeNames', {}):
                        params['ExpressionAttributeNames'] = {'#date': 'date'}
                    params['ExpressionAttributeValues'][':end_date'] = date_range['end_date']

            if filter_expressions:
                params['FilterExpression'] = ' AND '.join(filter_expressions)

            response = sessions_table.query(**params)
        else:
            # Scan all sessions
            params = {'Limit': limit}

            filter_expressions = []
            expression_values = {}
            expression_names = {}

            if date_range:
                if 'start_date' in date_range:
                    filter_expressions.append('#date >= :start_date')
                    expression_names['#date'] = 'date'
                    expression_values[':start_date'] = date_range['start_date']
                if 'end_date' in date_range:
                    filter_expressions.append('#date <= :end_date')
                    expression_names['#date'] = 'date'
                    expression_values[':end_date'] = date_range['end_date']

            if filter_expressions:
                params['FilterExpression'] = ' AND '.join(filter_expressions)
            if expression_values:
                params['ExpressionAttributeValues'] = expression_values
            if expression_names:
                params['ExpressionAttributeNames'] = expression_names

            response = sessions_table.scan(**params)

        return response.get('Items', [])
    except Exception as e:
        print(f"Error getting sessions: {e}")
        return []


async def create_session(
    student_id: str,
    session_date: str,
    time: str,
    duration: int,
    lesson_plan_id: Optional[str] = None,
    schedule_id: Optional[str] = None,
    notes: Optional[str] = None,
    created_by: str = "manual"
) -> Dict[str, Any]:
    """
    Create a new session (actual scheduled session, not recurring template)

    Aligns with existing schema from lumix-web/lib/types.ts

    Args:
        student_id: Student's ID
        session_date: Date in YYYY-MM-DD format
        time: Time in 24-hour format (HH:MM)
        duration: Duration in minutes
        lesson_plan_id: Optional linked lesson plan
        schedule_id: Optional - if auto-generated from recurring schedule
        notes: Optional session notes
        created_by: "auto" or "manual" (default: "manual")
    """
    try:
        # Format: sess_YYYYMMDD_studentId
        date_formatted = session_date.replace('-', '')
        session_id = f"sess_{date_formatted}_{student_id}"

        item = {
            'session_id': session_id,
            'student_id': student_id,
            'date': session_date,  # YYYY-MM-DD format
            'time': time,
            'duration': duration,
            'lesson_plan_id': lesson_plan_id,
            'schedule_id': schedule_id,
            'notes': notes,
            'created_by': created_by,
            'created_at': datetime.now(timezone.utc).isoformat()
        }

        # Remove None values
        item = {k: v for k, v in item.items() if v is not None}

        sessions_table.put_item(Item=item)
        return item
    except Exception as e:
        print(f"Error creating session: {e}")
        raise
