# JanSaathi AI — AWS Architecture Documentation

## Why AI is Required

JanSaathi AI uses **conversational AI** to bridge the digital divide for Indian citizens seeking government welfare schemes. AI is critical because:

1. **Natural Language Understanding** — Citizens can describe their situation in Hindi, English, or Kannada instead of navigating complex eligibility forms
2. **Intelligent Matching** — AI analyzes user profiles against 20+ government schemes to find personalized matches with confidence scores
3. **Fraud Detection** — AI identifies suspicious scheme names, URLs, and fee requests, protecting vulnerable users from scams
4. **Document Verification** — Vision AI (OCR) validates uploaded documents (Aadhaar, income certificates) for completeness

## AWS Services Used

### Amazon Bedrock (Foundation Models)
- **Model**: `us.anthropic.claude-3-5-haiku-20241022-v1:0` (Claude 3.5 Haiku)
- **Use Cases**:
  - Conversational chat for scheme discovery (streaming via Converse Stream API)
  - Profile-based scheme matching (non-streaming via Converse API)
  - Document OCR analysis
- **Why Bedrock**: Managed service with no infrastructure to provision, pay-per-token pricing, built-in safety guardrails, and access to best-in-class foundation models

### Architecture Mapping (Current → Production AWS)

| Component | Current (Prototype) | AWS Production |
|-----------|-------------------|----------------|
| **Frontend Hosting** | Lovable Preview | **AWS Amplify** (CI/CD, CDN, custom domain) |
| **Authentication** | Lovable Cloud Auth | **Amazon Cognito** (user pools, MFA, social login) |
| **Database** | Lovable Cloud DB | **Amazon DynamoDB** (profiles, notifications, saved schemes) |
| **API Layer** | Edge Functions | **AWS Lambda + API Gateway** (REST/WebSocket APIs) |
| **AI/ML** | Amazon Bedrock | **Amazon Bedrock** (already integrated) |
| **File Storage** | Cloud Storage | **Amazon S3** (document uploads with presigned URLs) |
| **Document OCR** | Bedrock Vision | **Amazon Textract** (specialized document extraction) |
| **Notifications** | Realtime DB | **Amazon SNS + EventBridge** (push notifications, email) |
| **Monitoring** | Console logs | **Amazon CloudWatch** (metrics, alarms, dashboards) |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    USER (Browser/Mobile)                  │
│              React + Tailwind + TypeScript                │
└─────────────────────┬───────────────────────────────────┘
                      │ HTTPS
                      ▼
┌─────────────────────────────────────────────────────────┐
│              AWS Amplify (Static Hosting + CDN)           │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              Amazon API Gateway (REST API)                │
│         /chat  /match-schemes  /document-ocr              │
└────┬────────────────┬──────────────────┬────────────────┘
     │                │                  │
     ▼                ▼                  ▼
┌─────────┐   ┌──────────────┐   ┌──────────────┐
│ Lambda  │   │   Lambda     │   │   Lambda     │
│ (Chat)  │   │ (Matching)   │   │ (Doc OCR)    │
└────┬────┘   └──────┬───────┘   └──────┬───────┘
     │               │                  │
     ▼               ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│              Amazon Bedrock (Claude 3.5 Haiku)            │
│   • Converse Stream API (chat)                            │
│   • Converse API (scheme matching, document analysis)     │
└─────────────────────────────────────────────────────────┘
     │               │
     ▼               ▼
┌──────────┐   ┌──────────────┐
│ Cognito  │   │  DynamoDB    │
│ (Auth)   │   │ (Data Store) │
└──────────┘   └──────────────┘
                      │
               ┌──────┴──────┐
               │    S3       │
               │ (Documents) │
               └─────────────┘
```

## Value of the AI Layer

1. **Accessibility** — 500M+ Indians lack digital literacy; conversational AI makes government schemes accessible in local languages
2. **Personalization** — AI matches schemes based on individual profiles instead of one-size-fits-all lists
3. **Trust & Safety** — Real-time fraud detection prevents citizens from falling for fake scheme scams
4. **Scalability** — Bedrock's serverless architecture handles millions of concurrent users without provisioning
5. **Cost Efficiency** — Pay-per-token pricing with Claude 3.5 Haiku keeps costs low (~$0.001/query)

## Technical Implementation Details

### Bedrock Integration (AWS Signature V4)
The edge functions authenticate with Bedrock using **AWS Signature V4** signing:
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` are stored as secure secrets
- Each request is signed with HMAC-SHA256 per AWS specifications
- Streaming responses use the Converse Stream API, converted to SSE for browser consumption

### Data Flow
1. User sends message → Edge Function receives it
2. Edge Function signs request with AWS SigV4 → Calls Bedrock Converse API
3. Bedrock streams tokens → Edge Function converts to SSE → Browser renders in real-time
4. For scheme matching: Bedrock returns JSON → Edge Function creates database notifications
