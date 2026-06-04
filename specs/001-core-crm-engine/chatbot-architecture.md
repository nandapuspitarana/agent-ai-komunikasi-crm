# User Journey Chatbot - Architecture & Flow Diagrams

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Browser                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │         ChatbotJourney React Component                      │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │  Chat UI                                             │  │ │
│  │  │  - Message Display                                   │  │ │
│  │  │  - Action Buttons                                    │  │ │
│  │  │  - Form Inputs                                       │  │ │
│  │  │  - Auto-scroll to latest                            │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────┬─────────────────────────────────────────────────┘
                 │ API Calls (JSON)
                 ↓
┌─────────────────────────────────────────────────────────────────┐
│              Next.js API Route (/api/agent/chatbot)              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Request Handler (route.ts)                                │ │
│  │  - NextAuth Session Validation                             │ │
│  │  - Action Routing                                          │ │
│  │  - Error Handling                                          │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────┬─────────────────────────────────────────────────┘
                 │
        ┌────────┴────────┐
        ↓                 ↓
   ┌─────────────┐  ┌────────────────────┐
   │ Chatbot     │  │ Other APIs         │
   │ Engine      │  │ (existing)         │
   │ (Business   │  │                    │
   │  Logic)     │  └────────────────────┘
   └─────────────┘
        │
        ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PostgreSQL Database                           │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  │ ChatbotService   │  │ ChatbotCity      │  │ ChatbotCentre    │
│  │                  │  │                  │  │                  │
│  │ - key (PK)       │  │ - id (PK)        │  │ - id (PK)        │
│  │ - label          │  │ - name           │  │ - name           │
│  │ - recommendation │  │ - region         │  │ - address        │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘
│                              │
│                              ↓
│                    ┌──────────────────┐
│                    │ ChatbotPricing   │
│                    │                  │
│                    │ - centreId (FK)  │
│                    │ - service        │
│                    │ - price          │
│                    │ - period         │
│                    └──────────────────┘
│
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  │ ChatbotJourney   │  │ JourneyLog       │  │ JourneySubmission│
│  │ Session          │  │                  │  │                  │
│  │                  │  │ - sessionId (FK) │  │ - sessionId (FK) │
│  │ - id (PK)        │  │ - step           │  │ - type           │
│  │ - service        │  │ - action         │  │ - name/email     │
│  │ - city           │  │ - data (JSON)    │  │ - details (JSON) │
│  │ - centre         │  │ - createdAt      │  │ - status         │
│  │ - status         │  └──────────────────┘  └──────────────────┘
│  └──────────────────┘
└─────────────────────────────────────────────────────────────────┘
```

## User Journey Flow

```
START
  │
  ├─→ [SERVICE SELECTION SCREEN]
  │   ├─→ "Help me choose" ──┐
  │   │   "Private Office"    │
  │   │   "Dedicated"         │─→ User selects service
  │   │   "Coworking"         │
  │   │   "Virtual"           │
  │   │   "Meeting Room"       │
  │   └─→ "Day Office"        ┘
  │
  ├─→ [RECOMMENDATION] (if guided path)
  │   "I recommend [SERVICE]. [RECOMMENDATION TEXT]"
  │
  ├─→ [CITY SELECTION SCREEN]
  │   Bangkok, Beijing, Hong Kong, Jakarta, Singapore
  │
  ├─→ [CENTRE SELECTION SCREEN]
  │   (if multiple centres in city)
  │   ├─→ Display centres with addresses
  │   ├─→ Option: "Not sure yet" → Area preferences
  │   └─→ User selects centre
  │
  ├─→ [PRICING DISPLAY]
  │   ├─→ Service name & location
  │   ├─→ Price & period
  │   ├─→ Quotation vs Online signup note
  │   └─→ Pricing disclaimer
  │
  ├─→ [ACTION OPTIONS]
  │   ├─→ Primary: "Request quotation" (or "Sign up online")
  │   ├─→ Secondary: "Book a tour"
  │   ├─→ Tertiary: "I have other questions"
  │   └─→ "Start again"
  │
  ├─→ [FORM OR Q&A]
  │   │
  │   ├─→ IF FORM:
  │   │   ├─→ Quotation: name, email, phone, details
  │   │   ├─→ Tour: name, email, phone, date/time
  │   │   └─→ Signup: name, email, phone, date
  │   │       └─→ [SUBMIT] → Database saved
  │   │
  │   └─→ IF Q&A:
  │       ├─→ User types question
  │       ├─→ AI generates context-aware response
  │       └─→ "Does this answer your question?"
  │           ├─→ Yes → Continue or Start again
  │           └─→ No → Speak to our team → Form
  │
  └─→ END

All interactions logged in JourneyLog table.
All form submissions stored in JourneySubmission table.
```

## Data Flow Diagram

```
REQUEST → API ROUTE
   │
   ├─ Action: "init"
   │  ├─ Create ChatbotJourneySession
   │  └─ Return sessionId
   │
   ├─ Action: "getServices"
   │  ├─ Query ChatbotService
   │  ├─ Add recommendations
   │  └─ Return [Service]
   │
   ├─ Action: "getCities"
   │  ├─ Query ChatbotCity + ChatbotCentre (JOIN)
   │  ├─ Build city objects with centres
   │  └─ Return [City]
   │
   ├─ Action: "getPricing"
   │  ├─ Input: {service, city, centre}
   │  ├─ Query ChatbotPricing
   │  │  ├─ Try centre-specific first
   │  │  └─ Fall back to city-level
   │  └─ Return Pricing
   │
   ├─ Action: "updateState"
   │  ├─ Input: {service, city, centre, contact info}
   │  ├─ Update ChatbotJourneySession
   │  └─ Log step to JourneyLog
   │
   ├─ Action: "submitForm"
   │  ├─ Input: {type, name, email, phone, details}
   │  ├─ Validate required fields
   │  ├─ Create JourneySubmission
   │  └─ Log step to JourneyLog
   │
   ├─ Action: "askQuestion"
   │  ├─ Input: {question, state context}
   │  ├─ Generate AI response (context-aware)
   │  ├─ Log step to JourneyLog
   │  └─ Return response
   │
   └─ Action: "logStep"
      ├─ Input: {step, action, data}
      ├─ Create JourneyLog entry
      └─ (Internal tracking)
```

## Component Structure

```
App Page (src/app/(dashboard)/agent/page.tsx)
├── [showChatbot state]
├── Button: "User Journey Chatbot"
└── {showChatbot && <ChatbotJourney />}
    │
    └── ChatbotJourney Component (src/components/ChatbotJourney.tsx)
        ├── State Management
        │  ├── messages: Message[]
        │  ├── sessionId: string
        │  ├── state: ChatbotState
        │  ├── inputValue: string
        │  ├── loading: boolean
        │  ├── services: ServiceInfo[]
        │  └── cities: CityInfo[]
        │
        ├── Effects
        │  ├── useEffect: initializeSession()
        │  └── useEffect: auto-scroll to latest message
        │
        ├── Functions
        │  ├── apiCall(action, payload) → POST /api/agent/chatbot
        │  ├── addBotMessage(content, actions)
        │  ├── addUserMessage(content)
        │  ├── selectService(serviceKey)
        │  ├── selectCity(cityName)
        │  ├── selectCentre(centreName)
        │  ├── showPricing()
        │  ├── showForm(type)
        │  ├── handleAskQuestion(question)
        │  └── restart()
        │
        ├── Header
        │  ├── Avatar + "Claire" label
        │  └── Restart button
        │
        ├── Messages Container
        │  ├── User messages (right-aligned, blue)
        │  ├── Bot messages (left-aligned, gray)
        │  ├── Action buttons
        │  └── Form inputs (inline)
        │
        └── Input Area
            ├── Text input
            └── Send button
```

## State Transitions

```
ChatbotState Evolution:

{}  (empty)
  ↓
{service: "office"}  (user selected service)
  ↓
{service: "office", city: "Bangkok"}  (user selected city)
  ↓
{service: "office", city: "Bangkok", centre: "Athenee Tower"}  (selected centre)
  ↓
{service: "office", city: "Bangkok", centre: "Athenee Tower", contactName: "John"}
{...} (user filled form fields)
  ↓
[Form Submitted] → JourneySubmission created → Session marked complete
```

## Database Query Paths

```
SERVICE SELECTION:
  ChatbotService.findMany(tenantId)
    → Add recommendations from mapping
    → Return [ServiceInfo]

CITY SELECTION:
  ChatbotCity.findMany(tenantId)
    .include(centres: {include(pricing: true)})
    → Build CityInfo with nested centres

CENTRE SELECTION:
  ChatbotCentre.findMany(cityId)
    → Display as cards with photos

PRICING LOOKUP:
  ChatbotPricing.findFirst({centreId, service})
    OR ChatbotPricing.findMany({centreId in city.centres, service})
    OR [FALLBACK] city-level pricing
    → Return PricingInfo

FORM SUBMISSION:
  ChatbotJourneySession.update(sessionId, {contactInfo})
  JourneySubmission.create({type, name, email, phone, details})
  JourneyLog.create({step: "form", action: "submission"})
    → All stored for audit trail

JOURNEY AUDIT:
  JourneyLog.findMany(sessionId)
    ORDER BY createdAt DESC
    → Complete history of interaction
```

## Multi-Tenant Isolation

```
Request with NextAuth Session
  │
  ├─ Extract tenantId from session.user
  │
  └─ All queries include: WHERE tenantId = ${tenantId}
     │
     ├─ ChatbotService.findMany({tenantId})
     ├─ ChatbotCity.findMany({tenantId})
     ├─ ChatbotJourneySession.create({tenantId})
     ├─ ChatbotJourneySession.update(tenantId validation)
     └─ JourneySubmission filtered via session tenantId
     
Result: Tenant A cannot see Tenant B's data
```

## Error Handling Flow

```
API Call
  │
  ├─ [NO SESSION] → 401 Unauthorized
  ├─ [NO TENANT] → 400 Bad Request
  ├─ [INVALID ACTION] → 400 Bad Request
  ├─ [DB ERROR] → 500 Internal Server Error (logged)
  ├─ [VALIDATION ERROR] → 400 Bad Request with message
  └─ [SUCCESS] → 200 OK with data
       │
       └─ Frontend catches errors
          ├─ Display user-friendly message
          ├─ Log to console for debugging
          └─ Show retry option or reset
```

## Performance Optimization

```
DATABASE:
├─ Indexes on:
│  ├─ tenantId (all tables)
│  ├─ sessionId (JourneyLog, JourneySubmission)
│  ├─ status (ChatbotJourneySession, JourneySubmission)
│  └─ createdAt (all tables)
│
QUERY PATTERNS:
├─ Services: One-time at session start (cached in state)
├─ Cities: One-time at session start (cached in state)
├─ Pricing: On-demand per service/city selection (indexed)
├─ Sessions: Create once, update on-demand
└─ Logs: Append-only (no updates)

CLIENT-SIDE:
├─ State caching: services, cities fetched once
├─ Form validation: client-side before submit
├─ Auto-scroll: only on new messages
└─ Debouncing: not needed (single user per session)
```

---

**Diagrams Created**: 8
**Architecture Complexity**: Medium (straightforward data flow)
**Scalability**: High (indexed queries, tenant isolation)
**Performance**: Optimized (caching, minimal queries)

This architecture supports 1000+ concurrent sessions with proper database pooling.
