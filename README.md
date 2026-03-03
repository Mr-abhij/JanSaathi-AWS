# JanSaathi - AI-Powered Project Assistant

## Project Overview
JanSaathi is an intelligent project management assistant that leverages AWS Generative AI services to automate content generation, summarization, and project documentation tasks.

## Why AI is Required
- **Time Savings**: Automates repetitive content creation and summarization tasks
- **Consistency**: Ensures uniform tone and style in generated documents
- **Efficiency**: Quickly distills large amounts of information into actionable insights

## AWS Architecture
- **Frontend**: AWS Amplify (React)
- **Backend**: AWS Lambda + Amazon API Gateway
- **AI Services**: Amazon Bedrock for foundation models
- **Database**: Amazon DynamoDB
- **Storage**: Amazon S3
- **Authentication**: Amazon Cognito

## Project Stages

### Stage 1: Core Infrastructure ✅
- [x] Project setup and repository structure
- [x] AWS SAM template for serverless deployment
- [x] Basic Lambda functions and API endpoints
- [x] DynamoDB table setup
- [x] CI/CD pipeline configuration

### Stage 2: AI Integration
- [ ] Amazon Bedrock integration
- [ ] Text generation workflows
- [ ] Document summarization features
- [ ] RAG implementation

### Stage 3: Frontend Development
- [ ] React application setup
- [ ] User authentication
- [ ] API integration
- [ ] UI/UX implementation

### Stage 4: Production Ready
- [ ] Testing and optimization
- [ ] Documentation
- [ ] Demo video
- [ ] Final deployment

## Getting Started

### Prerequisites
- AWS CLI configured
- AWS SAM CLI installed
- Node.js 18+
- AWS CDK (optional)

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd JanSaathi

# Install dependencies
npm install

# Deploy to AWS
sam deploy --guided
```

## Features
- 🤖 AI-powered content generation
- 📝 Document summarization
- 📊 Project status reports
- 🔐 Secure authentication
- 📱 Responsive web interface

## Technologies Used
- **Frontend**: React, Tailwind CSS, AWS Amplify
- **Backend**: Node.js, AWS Lambda, API Gateway
- **AI/ML**: Amazon Bedrock, Claude 3.5 Sonnet
- **Database**: Amazon DynamoDB
- **DevOps**: AWS SAM, GitHub Actions
