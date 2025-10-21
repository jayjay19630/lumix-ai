#!/bin/bash
# Deployment script for Lumix AI Service

set -e

echo "===== Lumix AI Service Deployment ====="
echo ""

# Check if AWS credentials are configured
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "Error: AWS credentials not set"
    echo "Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
    exit 1
fi

# Check deployment method
DEPLOY_METHOD=${1:-"lambda"}

case $DEPLOY_METHOD in
    lambda)
        echo "Deploying to AWS Lambda using Serverless Framework..."
        echo ""

        # Install dependencies
        if [ ! -d "node_modules" ]; then
            echo "Installing Serverless Framework..."
            npm install -g serverless
            npm install --save-dev serverless-python-requirements
        fi

        # Deploy
        echo "Deploying Lambda functions..."
        serverless deploy

        echo ""
        echo "✓ Lambda deployment complete!"
        echo "API endpoint will be shown above"
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
