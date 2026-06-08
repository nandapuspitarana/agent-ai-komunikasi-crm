# Tasks: Core CRM Engine

**Input**: Design documents from `/specs/001-core-crm-engine/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Initialize Next.js 15 (App Router) project with TypeScript and Tailwind CSS in `src/`
- [x] T002 [P] Create `docker-compose.yml` for PostgreSQL and Redis
- [x] T003 Setup Prisma ORM and define schema in `prisma/schema.prisma` (Tenants, Agents, Flows, Sessions, Integrations)
- [x] T004 [P] Initialize standalone widget project in `widget/` using Vanilla JS/Preact

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Implement Multi-tenant Authentication middleware separating access by `tenant_id` in `src/middleware.ts`
- [x] T006 [P] Create global API wrapper for encrypting/decrypting third-party API Keys (AES-256) in `src/lib/encryption.ts`
- [x] T007 [P] Setup Socket.io WebSocket server for real-time messaging in `src/lib/socket.ts`
- [x] T008 Implement Persistent Session logic using Redis in `src/lib/redis-session.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

## Phase 3: User Story 1 - Embed Chat Widget (Priority: P1) 🎯 MVP

**Goal**: Load chat widget on external websites via Shadow DOM without CSS conflicts.

**Independent Test**: Can be tested by embedding the script into a plain HTML file and verifying styles are isolated.

### Implementation for User Story 1

- [x] T009 [P] [US1] Create core `widget.js` script injecting Shadow DOM in `widget/src/index.js`
- [x] T010 [P] [US1] Implement Tenancy Handshake endpoint `/api/widget/init` in `src/app/api/widget/init/route.ts`
- [x] T011 [US1] Build Omni-Inbox UI Dashboard for Agents to receive widget messages in `src/app/(dashboard)/inbox/page.tsx`
- [x] T012 [US1] Integrate Socket.io client in widget to send/receive messages to Omni-Inbox in `widget/src/socket.js`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

## Phase 4: User Story 2 - Visual Flow Builder (Priority: P1)

**Goal**: Tenant administrators can build flow logic using a drag-and-drop React Flow interface.

**Independent Test**: Can be tested by creating a multi-node flow and verifying the JSON output is saved.

### Implementation for User Story 2

- [x] T013 [P] [US2] Integrate React Flow into Admin Dashboard in `src/app/(dashboard)/flow-builder/page.tsx`
- [x] T014 [US2] Create Node Architecture (Message, Input, Condition) components in `src/components/flow-nodes/`
- [x] T015 [US2] Implement Flow Interpreter backend engine to read JSON flows in `src/modules/flow-builder/interpreter.ts`
- [x] T016 [US2] Build Variable System saving user context to Redis in `src/modules/flow-builder/variables.ts`

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

## Phase 5: User Story 3 - Automated Google Sheets & Omnichannel (Priority: P2)

**Goal**: Sync data to Google Sheets mid-flow and handle WhatsApp incoming messages.

**Independent Test**: Can be tested by triggering a webhook and checking if Google Sheets receives the parsed data.

### Implementation for User Story 3

- [x] T017 [P] [US3] Implement Google Sheets OAuth2 and append/read logic in `src/modules/integrations/google-sheets.ts`
- [x] T018 [P] [US3] Create WhatsApp Cloud API webhook handler in `src/app/api/webhooks/whatsapp/route.ts`
- [x] T019 [US3] Build Message Router directing WhatsApp payload to Flow Engine in `src/modules/chat-engine/router.ts`
- [x] T020 [US3] Add Integration Node to React Flow Builder in `src/components/flow-nodes/IntegrationNode.tsx`
- [x] T021 [US3] Implement Usage Tracking middleware for SaaS limits in `src/middleware/usage.ts`

**Checkpoint**: All user stories should now be independently functional

## Phase 6: User Story 4 - Fallback & Reliability (Priority: P2)

**Goal**: Automatically route to a human agent if an API times out.

**Independent Test**: Can be tested by simulating a timeout and verifying the status updates to human handoff.

### Implementation for User Story 4

- [x] T022 [P] [US4] Implement Fallback Logic executing on timeout to route to Human Agent in `src/modules/flow-builder/fallback.ts`
- [x] T023 [P] [US4] Create Canned Responses feature in Omni-Inbox UI in `src/components/inbox/CannedResponses.tsx`
- [x] T024 [US4] Build Tenant Settings UI for widget branding customization in `src/app/(dashboard)/settings/page.tsx`

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T025 [P] Optimization: Minify `widget.js` and configure build pipeline for CDN distribution in `widget/webpack.config.js`
- [x] T026 [P] Documentation: Create Copy-Paste Snippet installation guide in `docs/installation.md`
- [x] T027 Final Security Audit: Run integration validation on auth and API modules → `docs/SECURITY_AUDIT.md`

## Phase 8: AI Agent Integration & UI Polish (Priority: P1)

**Purpose**: Connect Python AI Agent Proxy, fix UI constraints, and ensure robust inbox operations.

- [x] T028 [P] Remove Flow Test Panel to prevent Redis errors in dev environments without Redis.
- [x] T029 [P] Fix Agent Builder UI: Expand React Flow canvas to full width (`w-full` instead of `max-w-5xl`).
- [x] T030 [P] Verify Inbox visibility: `GET /api/chat/sessions` correctly returns active sessions for `SUPER_ADMIN` role (empty `whereClause` = no filter).
- [x] T031 [P] Integrate Python AI Agent Proxy: `src/lib/ai-agent.ts` calls `AGENT_PROXY_URL/api/v1/chat` with 15s timeout and graceful offline fallback. `.env` updated to separate `LOCAL_LLM_URL` (GPU engine) from `AGENT_PROXY_URL` (proxy).
- [x] T032 [P] Clean up debug logs in `src/app/api/chat/sessions/route.ts` and `src/lib/socket.ts`.

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - US1 and US2 can proceed in parallel
  - US3 depends on US2 (Flow Builder must exist to add integrations)
  - US4 depends on US3 (Fallback relies on integration triggers)

### Parallel Example: User Story 1

```bash
# Launch all widget and endpoint scaffolding together:
Task: "Create core widget.js script injecting Shadow DOM in widget/src/index.js"
Task: "Implement Tenancy Handshake endpoint /api/widget/init in src/app/api/widget/init/route.ts"
```

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready
