"""
AWS Client Initialization
"""
import boto3
from . import config

# Initialize AWS clients
def get_bedrock_runtime_client():
    """Get Bedrock Runtime client"""
    return boto3.client(
        "bedrock-runtime",
        region_name=config.AWS_REGION,
        aws_access_key_id=config.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
    )

def get_textract_client():
    """Get Textract client"""
    return boto3.client(
        "textract",
        region_name=config.AWS_REGION,
        aws_access_key_id=config.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
    )

def get_s3_client():
    """Get S3 client"""
    return boto3.client(
        "s3",
        region_name=config.AWS_REGION,
        aws_access_key_id=config.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=config.AWS_SECRET_ACCESS_KEY,
    )

# Singleton instances
bedrock_client = get_bedrock_runtime_client()
textract_client = get_textract_client()
s3_client = get_s3_client()
