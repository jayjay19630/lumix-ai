#!/bin/bash
# Deployment script for Lumix AI Service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================"
echo "   Lumix AI Service Deployment"
echo "======================================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found!${NC}"
    echo "Please create a .env file from .env.example:"
    echo "  cp .env.example .env"
    echo "  # Edit .env with your AWS credentials"
    exit 1
fi

# Load environment variables
source .env

# Check if AWS credentials are configured
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo -e "${RED}Error: AWS credentials not set in .env${NC}"
    echo "Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
    exit 1
fi

# Check deployment method
DEPLOY_METHOD=${1:-"lambda"}
STAGE=${2:-"dev"}

case $DEPLOY_METHOD in
    lambda)
        echo "Deploying to AWS Lambda using Serverless Framework..."
        echo "Stage: $STAGE"
        echo ""

        # Check if serverless is installed
        if ! command -v serverless &> /dev/null; then
            echo -e "${YELLOW}Installing Serverless Framework...${NC}"
            npm install -g serverless
        fi

        # Install serverless plugins if needed
        if [ ! -d "node_modules" ]; then
            echo -e "${YELLOW}Installing Serverless plugins...${NC}"
            npm install --save-dev serverless-python-requirements
        fi

        # Check if S3 bucket exists
        echo "Checking S3 bucket: $S3_BUCKET_NAME"
        if aws s3 ls "s3://$S3_BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
            echo -e "${YELLOW}Creating S3 bucket...${NC}"
            aws s3 mb "s3://$S3_BUCKET_NAME" --region "$AWS_REGION"
            echo -e "${GREEN}✓ S3 bucket created${NC}"
        else
            echo -e "${GREEN}✓ S3 bucket exists${NC}"
        fi

        # Deploy
        echo ""
        echo -e "${YELLOW}Deploying Lambda functions...${NC}"
        serverless deploy --stage $STAGE

        echo ""
        echo -e "${GREEN}======================================"
        echo "   Deployment Complete!"
        echo "======================================${NC}"
        echo ""
        echo "Save the API Gateway endpoint URL above"
        echo "You'll need it for the lumix-web frontend"
        ;;

    docker)
        echo "Building Docker image for Lambda..."
        echo ""

        # Get AWS account ID
        AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
        AWS_REGION=${AWS_REGION:-"us-east-1"}

        # ECR repository name
        ECR_REPO="lumix-ai-service"
        ECR_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO"

        # Create ECR repository if it doesn't exist
        echo "Creating ECR repository if needed..."
        aws ecr describe-repositories --repository-names $ECR_REPO 2>/dev/null || \
        aws ecr create-repository --repository-name $ECR_REPO

        # Login to ECR
        echo "Logging in to ECR..."
        aws ecr get-login-password --region $AWS_REGION | \
        docker login --username AWS --password-stdin $ECR_URI

        # Build Docker image
        echo "Building Docker image..."
        docker build -t $ECR_REPO:latest .

        # Tag image
        docker tag $ECR_REPO:latest $ECR_URI:latest

        # Push to ECR
        echo "Pushing image to ECR..."
        docker push $ECR_URI:latest

        echo ""
        echo "✓ Docker image pushed to ECR: $ECR_URI:latest"
        echo ""
        echo "Next steps:"
        echo "1. Create Lambda function in AWS Console"
        echo "2. Select 'Container image' as function type"
        echo "3. Use image: $ECR_URI:latest"
        echo "4. Set memory to 1024MB, timeout to 300s"
        echo "5. Add environment variables from .env.example"
        echo "6. Add IAM permissions for Bedrock, Textract, S3"
        ;;

    local)
        echo "Starting local development server..."
        echo ""

        # Install dependencies
        if [ ! -d "venv" ]; then
            echo "Creating virtual environment..."
            python3 -m venv venv
        fi

        echo "Installing dependencies..."
        source venv/bin/activate
        pip install -r requirements.txt

        echo ""
        echo "Starting FastAPI server on http://localhost:8000"
        echo "Press Ctrl+C to stop"
        echo ""

        python -m src.main
        ;;

    *)
        echo "Unknown deployment method: $DEPLOY_METHOD"
        echo ""
        echo "Usage: ./deploy.sh [lambda|docker|local]"
        echo "  lambda - Deploy using Serverless Framework"
        echo "  docker - Build and push Docker image to ECR"
        echo "  local  - Run local development server"
        exit 1
        ;;
esac
