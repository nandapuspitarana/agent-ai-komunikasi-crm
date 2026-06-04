# User Journey Chatbot Integration Guide

## Overview

The User Journey Chatbot is a conversational sales funnel that guides users through a structured journey to select services, locations, and submit inquiries. It's built on the CEO SUITE chatbot POC (UserJourney.js/html) and integrated into your Next.js CRM system.

## Features

✓ **Guided Service Selection** - "Help me choose" flow with personalized recommendations
✓ **Multi-step Journey** - Service → City → Centre → Pricing → Form submission
✓ **Dynamic Pricing** - City and centre-specific pricing with multiple options
✓ **Smart Recommendations** - Context-aware suggestions based on user choices
✓ **AI Q&A** - Answer common questions about pricing, locations, terms, and availability
✓ **Multiple Form Types** - Quotation requests, tour bookings, online signups
✓ **Human Escalation** - Seamless handoff to human agents
✓ **Journey Tracking** - Complete audit logs of user interactions

## Architecture

```
Frontend (React)
├── ChatbotJourney.tsx      [UI Component]
└── /api/agent/chatbot      [API Endpoint]
    │
Backend (Next.js)
├── chatbot-engine.ts        [Business Logic]
├── Prisma Models
│   ├── ChatbotJourneySession
│   ├── ChatbotService
│   ├── ChatbotCity
│   ├── ChatbotCentre
│   ├── ChatbotPricing
│   ├── JourneyLog
│   └── JourneySubmission
└── PostgreSQL Database
```

## Setup Instructions

### 1. Update Database Schema

```bash
# Apply Prisma migrations
npx prisma migrate dev --name add_chatbot_models
```

### 2. Seed Chatbot Data

```bash
# Run the seed script to populate cities, centres, services, and pricing
npx ts-node prisma/seed-chatbot.ts
```

This will create:
- 5 services (Private Office, Dedicated, Coworking, Virtual, Meeting Room, Day Office)
- 5 cities (Bangkok, Beijing, Hong Kong, Jakarta, Singapore)
- Multiple centres per city with location-specific pricing

### 3. Update Agent Page

Replace the existing agent page to include the chatbot:

```bash
# Backup the old page
cp src/app/\(dashboard\)/agent/page.tsx src/app/\(dashboard\)/agent/page.tsx.backup

# Use the new page with chatbot
cp src/app/\(dashboard\)/agent/page-new.tsx src/app/\(dashboard\)/agent/page.tsx
```

Or manually add the chatbot button to your existing page:

```tsx
import ChatbotJourney from '@/components/ChatbotJourney';

const [showChatbot, setShowChatbot] = useState(false);

// In your JSX:
<button onClick={() => setShowChatbot(!showChatbot)}>
  User Journey Chatbot
</button>

{showChatbot && (
  <div className="h-96">
    <ChatbotJourney />
  </div>
)}
```

### 4. Environment Variables

No additional environment variables needed. The chatbot uses the existing database connection.

### 5. Run the Application

```bash
npm run dev
```

Navigate to the Agents page and click "User Journey Chatbot" to test the chatbot.

## API Endpoints

All endpoints are POST requests to `/api/agent/chatbot`

### 1. Initialize Session
```json
{
  "action": "init",
  "sessionId": "session_xxx"
}
```

### 2. Get Services
```json
{
  "action": "getServices"
}
```

### 3. Get Cities
```json
{
  "action": "getCities"
}
```

### 4. Get Pricing
```json
{
  "action": "getPricing",
  "state": {
    "service": "office",
    "city": "Bangkok",
    "centre": "Athenee Tower"
  }
}
```

### 5. Update Session State
```json
{
  "action": "updateState",
  "state": {
    "service": "office",
    "city": "Bangkok",
    "centre": "Athenee Tower",
    "contactName": "John Doe",
    "contactEmail": "john@example.com",
    "contactPhone": "+66..."
  }
}
```

### 6. Submit Form
```json
{
  "action": "submitForm",
  "formData": {
    "type": "quotation",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+66...",
    "details": {
      "teamSize": "5",
      "moveInDate": "2026-07-01",
      "requirements": "..."
    }
  }
}
```

### 7. Ask Question
```json
{
  "action": "askQuestion",
  "question": "What's the price for coworking in Bangkok?"
}
```

### 8. Log Journey Step
```json
{
  "action": "logStep",
  "step": "service",
  "stepAction": "user_choice",
  "data": { "service": "office" }
}
```

## Database Schema

### ChatbotJourneySession
```prisma
id              String    @id @default(uuid())
tenantId        String
contactName     String?
contactEmail    String?
contactPhone    String?
service         String?   // office, dedicated, coworking, virtual, meeting, dayOffice
city            String?
centre          String?
package         String?   // For virtual office packages
status          String    // active, completed, abandoned
createdAt       DateTime
updatedAt       DateTime
journeyLogs     JourneyLog[]
submissions     JourneySubmission[]
```

### ChatbotService
Services available (office, dedicated, coworking, virtual, meeting, dayOffice) with descriptions and recommendations.

### ChatbotCity & ChatbotCentre
City and centre information with addresses, photos, and contact details.

### ChatbotPricing
Pricing information per service per centre.

### JourneyLog
Complete audit trail of user interactions with timestamps.

### JourneySubmission
Form submissions (quotations, tour requests, signups) with contact details and submission status.

## Customization

### Add More Cities/Centres

Edit `prisma/seed-chatbot.ts`:

```typescript
const citiesData = [
  {
    city: 'Your City',
    region: 'Your Region',
    centres: [
      {
        name: 'Centre Name',
        address: '...',
        photo: '...',
        contacts: [...],
        pricing: {
          coworking: { price: '...', period: '...' },
          // Add other services
        },
      },
    ],
  },
  // Add more cities
];
```

Then re-run the seed:
```bash
npx ts-node prisma/seed-chatbot.ts
```

### Customize Service Recommendations

Edit `src/modules/ai/chatbot-engine.ts`:

```typescript
const serviceRecommendations: Record<string, string> = {
  office: 'Your custom recommendation',
  // Update other services
};
```

### Modify AI Responses

The `getAIResponse()` method in `chatbot-engine.ts` handles Q&A. Update the logic to match your business needs:

```typescript
if (text.includes('custom keyword')) {
  return 'Your custom response';
}
```

### Style Customization

The chatbot uses Tailwind CSS classes. Edit `src/components/ChatbotJourney.tsx` to change:
- Colors (blue-600, slate-50, etc.)
- Sizing (px-4, h-96, etc.)
- Layout and spacing

## Testing

### Manual Testing

1. Open the Agents page
2. Click "User Journey Chatbot"
3. Test the flow:
   - Select a service
   - Choose "Help me choose"
   - Select a city
   - Choose a centre
   - View pricing
   - Submit a form

### Database Verification

```bash
# Check sessions created
SELECT * FROM "ChatbotJourneySession" LIMIT 10;

# Check journey logs
SELECT * FROM "JourneyLog" ORDER BY "createdAt" DESC LIMIT 20;

# Check submissions
SELECT * FROM "JourneySubmission";
```

## Troubleshooting

### Chatbot not loading

1. Check that migrations were applied: `npx prisma migrate status`
2. Verify seed data exists: `npx ts-node prisma/seed-chatbot.ts`
3. Check browser console for errors
4. Verify API endpoint is accessible: POST `/api/agent/chatbot`

### No cities showing

1. Verify seed data was created: `SELECT COUNT(*) FROM "ChatbotCity";`
2. Check that cities belong to correct tenant
3. Run seed again: `npx ts-node prisma/seed-chatbot.ts`

### Pricing not displaying

1. Check that ChatbotPricing records exist
2. Verify service key matches exactly (case-sensitive)
3. Verify centre/city name matches exactly

### Forms not submitting

1. Check that all required fields are filled
2. Verify email format is valid
3. Check server logs for submission errors
4. Verify JourneySubmission table has correct schema

## Next Steps

### Phase 2 Features (Optional)

- [ ] Connect form submissions to BullMQ queue for email notifications
- [ ] Integrate with CRM webhook system for lead capture
- [ ] Add analytics dashboard (popular services, conversion rates, etc.)
- [ ] Implement real-time human agent availability check
- [ ] Add multi-language support
- [ ] Mobile optimization and PWA support
- [ ] Advanced filtering by location preferences
- [ ] Sentiment analysis for chat interactions

### Integration Points

- **BullMQ**: Queue form submissions for background processing
- **Email Service**: Send confirmation emails after form submission
- **CRM System**: Log submissions as leads/opportunities
- **Analytics**: Track user journey conversions
- **Socket.io**: Real-time chat with human agents

## Support & Questions

Refer to:
- `userjourney/UserJourney-improvements.md` - UI/UX design notes
- `specs/001-core-crm-engine/` - Core CRM specifications
- Prisma documentation: https://www.prisma.io/docs/
- Next.js documentation: https://nextjs.org/docs/
