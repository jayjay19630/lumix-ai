"""
Configuration for AI Service
"""
import os
from dotenv import load_dotenv

load_dotenv()

# AWS Configuration
AWS_REGION = os.getenv("AWS_REGION", "ap-southeast-2")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_BEDROCK_MODEL_ID = os.getenv("AWS_BEDROCK_MODEL_ID", "amazon.nova-lite-v1:0")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "lumix-files")

# Service Configuration
SERVICE_NAME = "lumix-ai-service"
VERSION = "1.0.0"
