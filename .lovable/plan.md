

# JanSaathi AI – Government Scheme Assistant

A mobile-first, multilingual AI chatbot that helps Indian citizens discover government schemes they're eligible for, with real document verification.

---

## 1. Landing Page & Language Selection
- Clean hero section with the JanSaathi AI branding (Indian tricolor-inspired blue/green/white palette)
- Prominent language selector: **English**, **Hindi**, **Kannada**
- "Start Chat" button leading to the conversational interface
- Brief tagline explaining the app's purpose in simple language

## 2. AI-Powered Conversational Chat
- WhatsApp-style chat interface (mobile-first, bubbles, timestamps)
- AI assistant powered by **Lovable AI** (via edge function) that:
  - Greets the user in their selected language
  - Asks step-by-step questions: Age → State → Occupation → Income Range → Category
  - Remembers all responses in conversation context
  - Responds in the user's chosen language at a 5th-grade reading level
- Typing indicator while AI responds
- Streaming responses for real-time feel

## 3. Scheme Recommendation Cards
- After collecting user details, the AI recommends **Top 3 matching schemes**
- Each scheme displayed as a card with:
  - Scheme name & brief description
  - **Match percentage** (e.g., "92% Match")
  - "You qualify because..." explanation
  - ✅ **Green "Verified Government Scheme" badge**
  - "View Official Link" button (links to mock/real scheme URLs)
- Data sourced from a curated **mock dataset** of ~15-20 popular Indian government schemes with eligibility criteria

## 4. Document Readiness Checker
- Accessible via a button/tab in the chat or as a separate section
- User uploads a document image (Aadhaar, Income Certificate, etc.)
- Image sent to an **edge function** that uses **Lovable AI's vision model** (Gemini) to:
  - Identify document type
  - Extract key fields: Name, Document Number, Expiry/Issue Date
  - Determine validity/expiry status
- Results displayed as a clean card showing extracted fields
- Warning banners for issues (e.g., "⚠️ Your income certificate has expired. Please renew before applying.")

## 5. Design & UX
- **Color palette**: Government-friendly blues (#1a5276), greens (#27ae60), white backgrounds
- **Mobile-first** responsive layout optimized for smaller screens
- Icons from Lucide for language, documents, alerts, verification badges
- Large touch targets and simple navigation for low-literacy users
- Minimal text, maximum clarity

## 6. Backend (Lovable Cloud)
- **Edge function for chat**: Handles AI conversation with system prompt containing scheme database and eligibility logic, streams responses
- **Edge function for document OCR**: Accepts image upload, uses Gemini vision model to extract document fields and return structured data
- Mock scheme data embedded in the system prompt for the AI to reason over

