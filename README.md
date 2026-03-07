#JanSaathi AI
AI-Powered Multilingual Government Scheme Assistant

JanSaathi AI is an intelligent platform that helps citizens discover, understand, and apply for government schemes easily. Millions of eligible citizens miss benefits due to language barriers, fragmented information across portals, and complex eligibility requirements.

JanSaathi AI addresses this problem by using AI-powered eligibility matching, multilingual voice assistance, document verification, and fraud detection to guide users from scheme discovery to application completion.

The platform is built using AWS AI and serverless technologies and deployed using AWS Amplify.

🚀 Key Features
🔎 AI-Powered Eligibility Matching

Users create a simple profile including age, income, occupation, education, and state.
The system analyzes this profile and calculates an Eligibility Score (0–100%) for available government schemes.

Users receive:

Personalized scheme recommendations

Ranked results based on eligibility

Clear explanations of why they qualify

🎙 Multilingual Voice Assistant

JanSaathi supports voice interaction in 22 Indian languages, enabling access for users with limited digital literacy.

Capabilities include:

Speech-to-text query processing

AI-generated voice responses

Dialect recognition

Voice commands such as
“Find schemes for me” or “Check my eligibility”

🧠 Knowledge Graph Recommendation Engine

A Knowledge Graph maps relationships between schemes, eligibility criteria, and required documents.

This allows the platform to:

Discover related schemes automatically

Identify overlapping eligibility opportunities

Warn users about conflicting or duplicate applications

🧾 Document Readiness Checker

Users can upload documents such as:

Aadhaar Card

PAN Card

Income Certificate

Caste Certificate

Using OCR-based verification, the system extracts and validates information, checks document validity, and alerts users about missing or expired documents.

⏰ Smart Deadline Alerts

JanSaathi predicts scheme application windows using historical data and sends reminders via:

SMS

WhatsApp

Users receive alerts 30, 15, 7, and 2 days before deadlines, ensuring they do not miss opportunities.

🔍 Fraud and Scam Detection

The system cross-verifies schemes with official government databases to protect users from scams.

It can:

Validate official scheme URLs

Detect suspicious scheme patterns

Warn users about unverified schemes

📖 Simple Language Converter

Government portals often contain complex bureaucratic terminology.

JanSaathi automatically converts these descriptions into simple explanations at a basic reading level, making scheme details easier to understand.

☁️ AWS Architecture

JanSaathi AI is built using scalable AWS cloud services and AI tools.

Core AWS Services Used

Amazon Bedrock
Used for natural language understanding, conversational AI responses, and simplifying complex scheme descriptions.

Amazon Transcribe
Handles speech-to-text conversion for multilingual voice queries.

Amazon Polly
Generates natural voice responses in regional languages.

Amazon Textract
Extracts and validates data from uploaded government documents.

Amazon DynamoDB
Stores user profiles, scheme information, and eligibility results.

Amazon Neptune
Manages the Knowledge Graph that connects schemes, eligibility rules, and documents.

AWS Lambda
Implements serverless backend functions for eligibility matching, query processing, fraud detection, and document verification.

Amazon API Gateway
Provides secure APIs connecting the frontend with backend services.

AWS Amplify
Hosts and deploys the frontend application with continuous integration and fast global delivery.

🏗 System Architecture
User (Web / Mobile)
        │
        ▼
AWS Amplify (Frontend Hosting)
        │
        ▼
API Gateway
        │
        ▼
AWS Lambda Backend
        │
 ┌───────────────┬───────────────┬───────────────┐
 │               │               │
Amazon Bedrock  Amazon Textract  Amazon Transcribe
 │               │               │
Amazon Polly     DynamoDB        Neptune
🎯 Impact

JanSaathi AI aims to improve access to government welfare programs by:

Helping citizens discover schemes they are eligible for

Reducing information barriers and digital literacy challenges

Preventing fraudulent scheme scams

Increasing the reach and effectiveness of government welfare initiatives

The platform is especially beneficial for students, farmers, job seekers, women, and rural citizens.
