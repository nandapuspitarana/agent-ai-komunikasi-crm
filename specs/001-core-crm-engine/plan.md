# Implementation Plan: [FEATURE]

**Branch**: `[###-feature-name]` | **Date**: [DATE] | **Spec**: [link]
**Input**: Feature specification from `/specs/[###-feature-name]/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

[Extract from feature spec: primary requirement + technical approach from research]

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript, Node.js, Next.js 15+ (App Router), Preact/Vanilla JS (Widget)
**Primary Dependencies**: Prisma ORM, Socket.io, BullMQ, Tailwind CSS, Shadcn/UI, React Flow, Google SDK
**Storage**: PostgreSQL (Primary data), Redis (Caching, State, Pub/Sub, Queue)
**Testing**: [NEEDS CLARIFICATION: Testing framework]
**Target Platform**: Web Browsers (Widget, Dashboard) & Server (Node.js)
**Project Type**: SaaS CRM Monolith (API-first with integrated frontend)
**Performance Goals**: Fast widget load via CDN, non-blocking asynchronous message queueing, real-time socket delivery
**Constraints**: Widget must use Shadow DOM isolation; Database must use Shared DB with Isolated Records (RLS)
**Scale/Scope**: Multi-tenant architecture capable of scaling horizontally with Redis for session sharing

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Platform Agnostic**: Core system is an API-first web service accessible by the widget and integrations.
- [x] **Embeddable Chat Widget**: Lightweight widget using Preact/Vanilla JS and Shadow DOM isolation.
- [x] **Visual Flow Builder**: React Flow implemented for no-code DAG logic.
- [x] **SaaS Multi-Tenancy**: Implemented via Shared Database + Isolated Records (tenant_id).
- [x] **Webhook & Sync Engine**: BullMQ for queueing external API calls (WhatsApp/Google Sheets).
- [x] **Developer Friendly**: API routes built to support future SDK extraction.
- [x] **Design Language**: Tailwind CSS and Shadcn/UI used for clean, modern interfaces.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
```text
/
├── prisma/
│   └── schema.prisma        # Database schema
├── src/
│   ├── app/                 # Next.js App Router (Pages & API Routes)
│   ├── modules/
│   │   ├── chat-engine/     # Webhook receivers, BullMQ workers, Socket.io
│   │   ├── flow-builder/    # React Flow UI & Flow execution DAG engine
│   │   └── integrations/    # WhatsApp Meta API, Google Sheets API logic
│   ├── components/          # Shadcn UI, React Flow nodes
│   └── lib/                 # Prisma client, Redis client instances
├── widget/                  # Preact/Vanilla JS standalone widget project
│   ├── src/                 # Widget source code
│   └── dist/                # Compiled widget.js for CDN
└── tests/                   # Test suite
```

**Structure Decision**: A Monolith structure separating core domain logic into `/src/modules/` and a standalone lightweight `/widget/` package to ensure the widget bundle size remains minimal.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
