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
