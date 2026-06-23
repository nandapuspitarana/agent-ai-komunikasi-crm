# Tasks: Visitor Data Collection & Lead Intelligence

**Feature**: Zero-Friction Visitor Data Collection with AI Classification  
**Branch**: `ceosuite` | **Spec Folder**: `/specs/001-core-crm-engine/`  
**Strategy**: 4-layer collection — Passive (browser) → NLP (chat) → Contextual Form (booking intent) → AI Classification

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[US]**: User story this task belongs to
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Types, defaults, and DB foundation — must be complete before any layer is implemented.

- [ ] T001 Add `visitorConfig Json @default("{}")` field to `Tenant` model in `prisma/schema.prisma`
- [ ] T002 Add `VisitorProfile` model to `prisma/schema.prisma` (fields: contactId, name, email, phone, latitude, longitude, city, country, referrerUrl, pageUrl, utmSource, utmMedium, utmCampaign, deviceType, browserName, os, leadClassification, leadScore, topicsDiscussed, lastIntent, leadFormShown, metadata Json, sessions, messageCount, lastSeenAt) with `@@unique([tenantId, contactId])`
- [ ] T003 Add `visitorProfiles VisitorProfile[]` relation to `Tenant` model in `prisma/schema.prisma`
- [ ] T004 Run `npm run db:push` to apply schema changes to PostgreSQL
- [ ] T005 [P] Create `src/lib/visitor-config.ts` — define `VisitorConfig` interface, `DEFAULT_VISITOR_CONFIG` object, and `getVisitorConfig(raw: any): VisitorConfig` merge helper
- [ ] T006 [P] Add `visitorConfig` field to `GET /api/tenant` response and `PUT /api/tenant` destructure + update data in `src/app/api/tenant/route.ts`

**Checkpoint**: DB schema ready, types defined, tenant API supports config — all layers can now be built in parallel.

---

## Phase 2: Layer 1 — Passive Browser Collection (P1)

**Goal**: Capture browser metadata and optional geolocation automatically when widget loads — zero user interaction required.

**Independent Test**: Open widget → check `crm_agent_VisitorProfile` table → row created with `deviceType`, `browserName`, `referrerUrl`, `pageUrl`. Browser geo permission → `latitude/longitude` populated.

### Implementation

- [ ] T007 [P] [US1] Create `POST /api/widget/visitor` route in `src/app/api/widget/visitor/route.ts` — upsert `VisitorProfile` by `{tenantId, contactId}`, increment `sessions` on create, add full CORS headers, check `visitorConfig.enabled` before processing
- [ ] T008 [P] [US1] Create `POST /api/widget/visitor/geo` route in `src/app/api/widget/visitor/geo/route.ts` — accept `{tenantId, contactId, latitude, longitude}`, run `prisma.visitorProfile.updateMany`, CORS headers
- [ ] T009 [US1] Update `src/app/api/widget/init/route.ts` — fetch `visitorConfig` from tenant, include `visitorCollection: { enabled, layer1_passive, layer1_geolocation, layer3_leadform, layer4_classification }` in response JSON
- [ ] T010 [US1] Add passive data collection to widget init flow — implement `getOrCreateContactId()` (UUID stored in `localStorage` key `crm_cid`), `detectDeviceType()`, `detectBrowser()`, `detectOS()` helpers in widget source
- [ ] T011 [US1] After `/api/widget/init` response, call `POST /api/widget/visitor` with metadata if `visitorCollection.layer1_passive === true` in widget source
- [ ] T012 [US1] After passive call, request geolocation via `navigator.geolocation.getCurrentPosition()` silently (empty error handler) and call `POST /api/widget/visitor/geo` if `visitorCollection.layer1_geolocation === true` in widget source
- [ ] T013 [US1] Ensure widget includes `contactId` from localStorage in every `POST /api/widget/message` request body in widget source

**Checkpoint**: Widget opens → passive data captured automatically → DB row exists with browser/device info.

---

## Phase 3: Layer 2 — NLP Extraction from Chat (P1)

**Goal**: Parse visitor-provided name, email, phone from chat messages using regex — no prompting required.

**Independent Test**: Send message `"nama saya Budi, email budi@test.com"` → `VisitorProfile` row updated with `name: "Budi"`, `email: "budi@test.com"`.

### Implementation

- [ ] T014 [P] [US2] Create `src/lib/visitor-extractor.ts` — implement `extractVisitorData(message: string, config: VisitorConfig): ExtractedVisitorData` using:
  - `EMAIL_REGEX`: `/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/`
  - `PHONE_REGEX`: `/(?:(?:\+62|62|0)(?:8[1-9][0-9]{6,10}))/`
  - `NAME_PATTERNS`: array of regex for `"nama saya X"`, `"saya X"`, `"panggil saya X"`, `"my name is X"`, `"i'm X"`
  - Loop over `config.customNlpPatterns` (from tenant config) with try/catch
  - Return early if `config.layer2_nlp === false`
- [ ] T015 [P] [US2] Create `src/lib/visitor-service.ts` — implement `upsertVisitorProfile()`, `updateVisitorFromExtraction()`, `updateVisitorClassification()`, `shouldTriggerLeadForm()` helper functions using Prisma
- [ ] T016 [US2] In `src/app/api/widget/message/route.ts` — after saving user message: call `extractVisitorData(message, visitorCfg)`, if result has keys then call `updateVisitorFromExtraction()`, also increment `messageCount` and update `lastSeenAt` on VisitorProfile

**Checkpoint**: User mentions email in chat → email field populated in VisitorProfile without any prompting.

---

## Phase 4: Layer 4 — AI Conversation Classification (P1)

**Goal**: AI silently classifies each conversation turn (cold/warm/hot_lead/booking/support) and updates lead score automatically.

**Independent Test**: Send a message expressing purchase interest → `VisitorProfile.leadClassification` = `"hot_lead"`, `leadScore` incremented by configured weight.

### Implementation

- [ ] T017 [P] [US3] Update `src/lib/ai-rules.ts` — add `enableClassification?: boolean` param to `buildSystemPrompt()` options, append classification instruction block when enabled:
  ```
  At the END of every response, add exactly one tag (hidden from user):
  [CLASS:cold] | [CLASS:warm] | [CLASS:hot_lead] | [CLASS:booking] | [CLASS:support]
  ```
- [ ] T018 [P] [US3] Add `parseClassificationTag(reply: string): { cleanReply: string; classification: LeadClassification | null }` function and `type LeadClassification` export to `src/lib/ai-rules.ts`
- [ ] T019 [US3] Update `updateVisitorClassification()` in `src/lib/visitor-service.ts` — apply `scoreWeights[classification]` delta from config, cap `leadScore` at 100, update `lastIntent`, append unique topic to `topicsDiscussed` array
- [ ] T020 [US3] In `src/app/api/widget/message/route.ts` — after getting `aiReplyRaw` and before returning: run `parseClassificationTag()`, then `parseAIResponseForHandoff()`, call `updateVisitorClassification()` if `visitorCfg.layer4_classification === true`, pass `enableClassification: visitorCfg.layer4_classification` to `buildSystemPrompt()`

**Checkpoint**: Every bot reply silently classifies the conversation → lead scores accumulate over time.

---

## Phase 5: Layer 3 — Contextual Inline Lead Form (P2)

**Goal**: When AI classifies `[CLASS:booking]` (configurable), inject a non-blocking inline form in the chat widget — one time per session, skippable.

**Independent Test**: Trigger a booking-intent message → widget renders inline form inside chat bubble → submit → VisitorProfile updated with name/email → form does not reappear.

### Implementation

- [ ] T021 [P] [US4] Implement `shouldTriggerLeadForm()` in `src/lib/visitor-service.ts` — return `true` only if: `config.layer3_leadform === true` AND `classification === config.leadFormTrigger` AND `VisitorProfile.leadFormShown === false`
- [ ] T022 [US4] In `src/app/api/widget/message/route.ts` — call `shouldTriggerLeadForm()` after classification update, if `true`: set `leadFormShown = true` in DB, add to response: `triggerLeadForm: true, leadFormConfig: { fields, title, skippable }`; else `triggerLeadForm: false`
- [ ] T023 [US4] Build `InlineLeadForm` component in widget source — render conditionally when `response.triggerLeadForm === true`, display fields from `leadFormConfig.fields` (name/email/phone), use `leadFormConfig.title` as heading, show "Nanti saja" skip button only if `leadFormConfig.skippable === true`
- [ ] T024 [US4] On lead form submit in widget: call `POST /api/widget/visitor` with `{tenantId, contactId, name, email, phone}`, then continue chat as normal
- [ ] T025 [US4] On lead form skip in widget: continue chat without sending data, do not re-show form (server already set `leadFormShown = true`)

**Checkpoint**: Booking-intent conversation → inline form appears once → user fills or skips → chat continues uninterrupted.

---

## Phase 6: Dashboard Settings — Visitor Config Panel (P2)

**Goal**: Tenant admin can toggle every collection layer ON/OFF and tune parameters from the existing Settings page without touching code.

**Independent Test**: Open `/settings` → "Pengunjung" tab visible → toggle Layer 2 NLP off → save → send chat message with email → VisitorProfile email field NOT updated.

### Implementation

- [ ] T026 [P] [US5] Create `src/components/settings/VisitorConfigPanel.tsx` — render 4 collapsible sections (Master Switch, Layer 1, Layer 2, Layer 3+4), use toggle switches for boolean fields, number inputs for score weights and thresholds, dropdown for `leadFormTrigger`, checkbox group for `leadFormFields`, tag-input for `customNlpPatterns`
- [ ] T027 [US5] Add `'visitors-config'` to `TabType` union in `src/app/[lang]/(dashboard)/settings/page.tsx`
- [ ] T028 [US5] Add "Pengunjung" tab button with `UserSearch` icon from lucide-react to the tabs array in `src/app/[lang]/(dashboard)/settings/page.tsx`
- [ ] T029 [US5] Add `visitorConfig` state initialized from `tenant.visitorConfig` merged with `DEFAULT_VISITOR_CONFIG`, add `<VisitorConfigPanel>` render in the `visitors-config` tab content in `src/app/[lang]/(dashboard)/settings/page.tsx`
- [ ] T030 [US5] Update `handleTenantSave()` in `src/app/[lang]/(dashboard)/settings/page.tsx` — include `visitorConfig` in the PUT body sent to `/api/tenant`

**Checkpoint**: Settings tab "Pengunjung" renders, toggles work, save persists config, behavior changes immediately.

---

## Phase 7: Dashboard Visitors Page (P2)

**Goal**: Agents can see all visitors with lead scores, classifications, and drill into individual profiles.

**Independent Test**: Open `/visitors` → table shows rows with lead score badges → click row → drawer opens with profile details, location link, and session history.

### Implementation

- [ ] T031 [P] [US6] Create `GET /api/visitors` route in `src/app/api/visitors/route.ts` — auth required (NextAuth session), filter by `tenantId`, support `page`, `limit`, `search` (name/email), `classification`, `minScore` query params, return `{ data, total, page, limit, stats: { total, hot_leads, booking_ready, avg_score } }`
- [ ] T032 [P] [US6] Create `GET /api/visitors/[id]` route in `src/app/api/visitors/[id]/route.ts` — return visitor profile + related `ChatSession[]` (joined by `contactId + tenantId`) + `messageCount`
- [ ] T033 [P] [US6] Create `src/components/visitors/ClassificationBadge.tsx` — color-coded badge: 🔴 hot_lead (red), 🟡 warm (amber), 🟢 cold (green), 🔵 support (blue), 🟣 booking (purple)
- [ ] T034 [P] [US6] Create `src/components/visitors/LeadScoreBadge.tsx` — show score number + horizontal progress bar (0-100), color shifts green→amber→red based on score
- [ ] T035 [P] [US6] Create `src/components/visitors/VisitorStatsCards.tsx` — 4 stat cards: Total Visitor, Hot Leads, Booking Ready, Avg Score; accept `stats` prop from API response
- [ ] T036 [US6] Create `src/components/visitors/VisitorTable.tsx` — columns: Score, Visitor (name or "Anonim"), Email, Classification, Device, Source (referrer/UTM), Sessions, Last Seen, Action button; use `ClassificationBadge` and `LeadScoreBadge` components
- [ ] T037 [US6] Create `src/components/visitors/VisitorDetailDrawer.tsx` — sections: Header (name, score bar, badge), Profile (email, phone, device, OS, browser), Traffic Source (referrer, pageUrl, UTM badges), Location (Google Maps link `https://maps.google.com/?q={lat},{lng}` or text if no coords), Topics (chip tags from `topicsDiscussed[]`), Metadata (JSON array rendered as key-value table), Session History (list with status badge, date, message count, link to inbox)
- [ ] T038 [US6] Create `src/app/[lang]/(dashboard)/visitors/page.tsx` — fetch `GET /api/visitors`, render `<VisitorStatsCards>`, filter/search bar (classification dropdown + text search), `<VisitorTable>` with row click → `<VisitorDetailDrawer>`
- [ ] T039 [US6] Add "Pengunjung" nav item with `UserSearch` icon to the dashboard sidebar navigation component, include hot_lead count badge, mark active for `/visitors` route

**Checkpoint**: `/visitors` page shows table → filter works → drawer opens with full profile and session history.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Tie all layers together, guard-rails, and data hygiene.

- [ ] T040 [P] Add `visitorConfig.enabled` master guard in `POST /api/widget/visitor` route — return `204 No Content` immediately if disabled, avoiding unnecessary DB queries
- [ ] T041 [P] Wrap all visitor DB operations in `src/app/api/widget/message/route.ts` in try/catch — log errors but never let visitor tracking failure break the main chat response
- [ ] T042 Add `contactId` to `POST /api/widget/message` request body validation — fallback to `chatSession.contactId` if not provided
- [ ] T043 [P] Validate `visitorConfig.retentionDays` field is respected — add a note/TODO in `visitor-service.ts` for future cleanup cron job (data deletion after N days)
- [ ] T044 [P] Update `AGENTS.md` with new API endpoints: `POST /api/widget/visitor`, `POST /api/widget/visitor/geo`, `GET /api/visitors`, `GET /api/visitors/[id]`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Layer 1)**: Depends on T001–T006 (Setup complete)
- **Phase 3 (Layer 2)**: Depends on T001–T006 (Setup) + T007 (`POST /api/widget/visitor` exists)
- **Phase 4 (Layer 4)**: Depends on T001–T006 (Setup) + T015 (`visitor-service.ts` exists)
- **Phase 5 (Layer 3)**: Depends on Phase 4 complete (classification must work to trigger form)
- **Phase 6 (Settings UI)**: Depends on T005 (`visitor-config.ts` types) + T006 (tenant API)
- **Phase 7 (Visitors Page)**: Depends on Phase 1 (DB) + T031–T032 (API routes)
- **Phase 8 (Polish)**: Depends on all phases complete

### Parallel Opportunities

```bash
# After Phase 1 complete, these can all run in parallel:
T007  → POST /api/widget/visitor
T008  → POST /api/widget/visitor/geo
T009  → Widget init update
T014  → visitor-extractor.ts
T015  → visitor-service.ts
T017  → ai-rules.ts classification prompt
T018  → parseClassificationTag function
T026  → VisitorConfigPanel component
T031  → GET /api/visitors
T032  → GET /api/visitors/[id]
T033-T035 → Badge + stats card components
```

---

## Parallel Example: Phase 2 + 3 + 4 Together (after Phase 1)

```
Developer A:  T007 → T008 → T009 → T010 → T011 → T012 → T013  (Layer 1 complete)
Developer B:  T014 → T015 → T016                                (Layer 2 complete)
Developer C:  T017 → T018 → T019 → T020                        (Layer 4 complete)
```

---

## Implementation Strategy

### MVP First (Layers 1 + 2 only)

1. Complete Phase 1 (Setup) — T001–T006
2. Complete Phase 2 (Layer 1 passive) — T007–T013
3. Complete Phase 3 (Layer 2 NLP) — T014–T016
4. **STOP & VALIDATE**: Widget sends metadata → DB has rows → NLP extracts from chat
5. Visitors data accumulates silently — no user impact

### Full Feature

1. MVP above
2. Phase 4 (Layer 4 classification + scoring) — T017–T020
3. Phase 6 (Settings panel) — T026–T030
4. Phase 5 (Lead form) — T021–T025
5. Phase 7 (Visitors dashboard page) — T031–T039
6. Phase 8 (Polish) — T040–T044

---

## Notes

- ALL visitor tracking must be completely non-blocking — wrap in try/catch, never break chat flow
- `contactId` in widget = UUID stored in `localStorage` key `crm_cid` — must be consistent across sessions
- `visitorConfig.enabled === false` = short-circuit return at API level, zero overhead
- NLP extraction only updates fields that are `null`/empty — never overwrites existing verified data
- `leadFormShown` flag prevents form from appearing more than once per visitor (not per session)
- Lead score is capped at 100 in application code before DB write
