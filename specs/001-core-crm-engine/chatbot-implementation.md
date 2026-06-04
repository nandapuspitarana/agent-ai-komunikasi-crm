# User Journey Chatbot - Implementation Checklist

## ✅ Completed

- [x] Extended Prisma schema with chatbot models
  - ChatbotJourneySession
  - ChatbotService
  - ChatbotCity
  - ChatbotCentre
  - ChatbotPricing
  - JourneyLog
  - JourneySubmission

- [x] Created chatbot engine service
  - `src/modules/ai/chatbot-engine.ts`
  - Service, city, pricing lookups
  - Session management
  - AI Q&A logic
  - Form submission handling

- [x] Built API endpoint
  - `src/app/api/agent/chatbot/route.ts`
  - Session initialization
  - Data fetching
  - Form processing
  - Journey tracking

- [x] Created React UI component
  - `src/components/ChatbotJourney.tsx`
  - Service selection
  - City/centre selection
  - Pricing display
  - Form rendering
  - Message handling

- [x] Created seed script
  - `prisma/seed-chatbot.ts`
  - 5 services with recommendations
  - 5 cities with multiple centres
  - Location-specific pricing
  - Contact information

- [x] Updated agent page
  - `src/app/(dashboard)/agent/page-new.tsx`
  - Added chatbot toggle button
  - Responsive layout

- [x] Created comprehensive documentation
  - `CHATBOT_SETUP.md`
  - Setup instructions
  - API documentation
  - Database schema
  - Customization guide
  - Troubleshooting

## 🔧 Next Steps (Quick Start)

### 1. Run Database Migration
```bash
npx prisma migrate dev --name add_chatbot_models
```

### 2. Seed Data
```bash
npx ts-node prisma/seed-chatbot.ts
```

### 3. Update Agent Page (Choose One)
**Option A:** Replace entire page
```bash
cp src/app/\(dashboard\)/agent/page-new.tsx src/app/\(dashboard\)/agent/page.tsx
```

**Option B:** Manual merge (if you have custom content in existing page)
- Add `import ChatbotJourney from '@/components/ChatbotJourney';`
- Add state: `const [showChatbot, setShowChatbot] = useState(false);`
- Add button: `<button onClick={() => setShowChatbot(!showChatbot)}>User Journey Chatbot</button>`
- Add container: `{showChatbot && <ChatbotJourney />}`

### 4. Test
```bash
npm run dev
# Navigate to Agents page
# Click "User Journey Chatbot" button
# Test the flow
```

## 📊 Files Created/Modified

### New Files
- `src/modules/ai/chatbot-engine.ts` - Business logic (400+ lines)
- `src/app/api/agent/chatbot/route.ts` - API routes (250+ lines)
- `src/components/ChatbotJourney.tsx` - React component (500+ lines)
- `prisma/seed-chatbot.ts` - Data seeding (400+ lines)
- `src/app/(dashboard)/agent/page-new.tsx` - Updated agent page (150+ lines)
- `CHATBOT_SETUP.md` - Complete documentation

### Modified Files
- `prisma/schema.prisma` - Added 6 new models + relations

## 🎯 Key Features Implemented

1. **Service Selection**
   - Direct selection or "Help me choose" guided flow
   - Dynamic service recommendations

2. **Location Selection**
   - Multi-step: City → Centre
   - Supports multiple centres per city
   - Area-based filtering (expandable)

3. **Pricing Display**
   - Service-specific pricing by centre
   - Fallback to city-level pricing
   - Multiple pricing options support

4. **Form Handling**
   - Quotation requests
   - Tour bookings
   - Online signups
   - Form field tracking

5. **AI Chat**
   - Context-aware Q&A
   - Smart keyword matching
   - Pricing, location, terms, availability
   - Human escalation option

6. **Audit Trail**
   - Complete journey logging
   - Step-by-step tracking
   - Form submission records
   - Session history

## 🚀 Testing Checklist

### User Flow Tests
- [ ] Start chatbot and see initial greeting
- [ ] "Help me choose" path works correctly
- [ ] Direct service selection works
- [ ] Service recommendations display
- [ ] City selection shows all cities
- [ ] Centre selection filters by city
- [ ] Pricing displays correctly
- [ ] Forms can be submitted
- [ ] Q&A responds to questions
- [ ] Human escalation works

### Data Tests
- [ ] Services created in database
- [ ] Cities and centres seeded
- [ ] Pricing data populated
- [ ] Session created on init
- [ ] Journey logs recorded
- [ ] Form submissions saved

### API Tests
- [ ] `/api/agent/chatbot` POST works
- [ ] All action types respond correctly
- [ ] Error handling works
- [ ] Session isolation by tenant

## 📝 Database Queries to Verify

```sql
-- Check services
SELECT * FROM "ChatbotService" LIMIT 10;

-- Check cities and centres count
SELECT c.name as city, COUNT(ct.id) as centre_count 
FROM "ChatbotCity" c 
LEFT JOIN "ChatbotCentre" ct ON ct."cityId" = c.id 
GROUP BY c.name;

-- Check pricing data
SELECT COUNT(*) FROM "ChatbotPricing";

-- Recent sessions
SELECT * FROM "ChatbotJourneySession" ORDER BY "createdAt" DESC LIMIT 5;

-- Recent submissions
SELECT * FROM "JourneySubmission" ORDER BY "createdAt" DESC LIMIT 5;
```

## 🔗 Integration Points (Future)

### Ready for Integration
- [ ] BullMQ job queueing (form submissions)
- [ ] Email notification service
- [ ] CRM lead capture
- [ ] Analytics dashboard
- [ ] Socket.io live chat

### Dependencies Needed
- Email service (SendGrid, Nodemailer, etc.)
- Analytics service (Google Analytics, custom)
- Real-time communication (Socket.io)

## 📚 Documentation Files

1. **CHATBOT_SETUP.md** - Full setup and customization guide
2. **userjourney/UserJourney-improvements.md** - UI/UX considerations
3. **specs/001-core-crm-engine/plan.md** - Core architecture

## 💡 Customization Hooks

### Add More Services
Edit `prisma/seed-chatbot.ts` → `servicesData` array

### Add More Cities/Centres
Edit `prisma/seed-chatbot.ts` → `citiesData` array

### Customize AI Responses
Edit `src/modules/ai/chatbot-engine.ts` → `getAIResponse()` method

### Change Styling
Edit `src/components/ChatbotJourney.tsx` → Tailwind classes

### Add New Form Fields
Edit `src/components/ChatbotJourney.tsx` → `renderForm()` method

## ⚡ Performance Considerations

- Sessions are lightweight (session per user)
- Pricing data fetched on-demand
- Journey logs batched (optional optimization)
- No real-time connections (socket.io ready for future)
- Database indexes on frequently queried fields

## 🔐 Security Notes

- Session isolation by tenantId
- Form submissions require email validation (client-side, server-side in phase 2)
- No sensitive pricing data exposed in logs
- API authenticated via NextAuth session

## 🎓 Learning Resources

- POC Implementation: `userjourney/UserJourney.js` & `UserJourney.html`
- React Patterns: `src/components/ChatbotJourney.tsx`
- Database Patterns: `prisma/schema.prisma`
- API Patterns: `src/app/api/agent/chatbot/route.ts`

---

**Status**: ✅ Ready for Migration and Testing
**Date**: June 3, 2026
**Next Review**: After successful database migration and seed
