# Phase 0: Research & Technical Decisions

## Testing Framework
**Decision**: Use Vitest for unit testing and Playwright for End-to-End (E2E) testing.
**Rationale**: Vitest provides extremely fast test execution and integrates perfectly with TypeScript/modern bundlers. Playwright is chosen over Cypress because it excels at testing Shadow DOM environments, which is critical for validating the isolated embeddable widget on host sites.
**Alternatives considered**: Jest (slower, harder ESM configuration), Cypress (lacks deep/easy Shadow DOM support).

## Infrastructure & Queue Management
**Decision**: Upstash Serverless Redis for BullMQ Queue and Socket.io state sharing.
**Rationale**: The SaaS CRM requires heavy background processing (Flow Execution, WhatsApp Webhooks, Google Sheets sync) without blocking the main Next.js API threads. Upstash provides a zero-ops, highly scalable Redis instance that perfectly matches the Next.js serverless/edge deployment model.
**Alternatives considered**: Self-hosted Redis on EC2 (higher maintenance overhead).
