# Feature Specification: Core CRM Engine

**Feature Branch**: `001-core-crm-engine`  
**Created**: 2026-04-30
**Status**: Draft  
**Input**: User description: "Bantu saya merancang struktur folder dan skema database awal..."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Embed Chat Widget (Priority: P1)

As a website owner, I want to embed a chat widget on my site without breaking my existing CSS, so that visitors can communicate with my business seamlessly.

**Why this priority**: Without a functional, conflict-free widget, the CRM cannot capture leads from custom websites.

**Independent Test**: Can be fully tested by embedding the generated JS snippet into a standard WordPress/Shopify site and verifying visual integrity and message delivery.

**Acceptance Scenarios**:

1. **Given** a web page with complex custom CSS, **When** the widget script is loaded, **Then** the chat UI renders correctly inside a Shadow DOM without affecting or being affected by the host CSS.

---

### User Story 2 - Visual Flow Builder (Priority: P1)

As a tenant administrator, I want to build conversation logic using a visual drag-and-drop interface, so that I can automate customer interactions without writing code.

**Why this priority**: The core value proposition of the SaaS CRM is the Kommunicate-style no-code builder.

**Independent Test**: Can be fully tested by creating a multi-node flow with conditions and verifying the JSON representation is saved.

**Acceptance Scenarios**:

1. **Given** the flow builder interface, **When** a user connects a condition node to an action node, **Then** the system visually links them and updates the underlying configuration.

---

### User Story 3 - Automated Google Sheets Sync (Priority: P2)

As a flow builder, I want to add a Google Sheets node mid-conversation, so that user inputs can be automatically logged to my external database.

**Why this priority**: Two-way integration is a major pillar of the product.

**Independent Test**: Can be tested by simulating a user chat that reaches the Google Sheets node and verifying the data appears in the sheet.

**Acceptance Scenarios**:

1. **Given** an active chat session reaching an integration node, **When** the node executes, **Then** the data is securely transmitted and logged to the configured Google Sheet.

---

### User Story 4 - Fallback & Reliability (Priority: P2)

As a business owner, I want the chat flow to gracefully degrade or handoff to a human agent if an external API fails, so that my customers never experience a broken bot.

**Why this priority**: Reliability is a core principle (Fail-Safe mechanism).

**Independent Test**: Can be tested by simulating a third-party API timeout and verifying the bot responds with the fallback message or alerts a human.

**Acceptance Scenarios**:

1. **Given** an active flow waiting on a Google Sheets response, **When** the request times out, **Then** the system immediately routes the chat to the fallback node (e.g., human handoff).

### Edge Cases

- What happens when a tenant's subscription limit is reached during an active flow?
- How does system handle concurrent webhooks from WhatsApp during traffic spikes?
- What happens if the host website's Content Security Policy (CSP) blocks the widget script?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a lightweight, embeddable JS snippet that renders a chat widget.
- **FR-002**: System MUST isolate the chat widget's styling using Shadow DOM.
- **FR-003**: System MUST provide a WYSIWYG Flow Builder capable of creating conditional logic, API hooks, and human handoffs.
- **FR-004**: System MUST execute visual flows dynamically, storing the logic structure centrally.
- **FR-005**: System MUST securely manage and encrypt (e.g., AES-256) third-party API keys for integrations.
- **FR-006**: System MUST automatically trigger a defined fallback response if an external integration node fails or times out.
- **FR-007**: System MUST enforce strict data isolation between tenants across all data entities.

### Non-Functional Requirements (Constitution Compliance)

- **NFR-001** (Architecture): MUST be an API-First Web Service, platform agnostic.
- **NFR-002** (Widget): MUST implement an embeddable chat widget using Shadow DOM for CSS isolation.
- **NFR-003** (Developer Experience): MUST provide a Javascript SDK and complete API Documentation.
- **NFR-004** (Real-Time): MUST include a Webhook & Sync Engine for real-time data synchronization with third parties.
- **NFR-005** (Multi-Tenancy): MUST support automatic scaling and handle thousands of tenants with strict access controls.
- **NFR-006** (Design): MUST feature a Modern, Clean, and "Invisible" UI that blends with host sites.

### Key Entities *(include if feature involves data)*

- **Tenant**: Represents a SaaS account, including subscription details and global configurations.
- **Flow**: Represents the automated conversation logic, stored securely.
- **Message**: An individual communication event (inbound or outbound) in a session.
- **Integration**: Secure storage for external service connections and credentials.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Widget script loads and renders the UI in under 1 second without any CSS conflicts on tested host sites.
- **SC-002**: Non-technical users can build and deploy a basic Lead Gen flow with external integration in under 5 minutes.
- **SC-003**: System processes external integration fallbacks within 3 seconds of a timeout event, achieving 100% graceful degradation.
- **SC-004**: System handles concurrent chat sessions for 10,000 tenants without cross-tenant data spillage.

## Assumptions

- External APIs (WhatsApp, Google Sheets) have standard rate limits which the system must respect.
- Users have modern browsers that support Shadow DOM.
- The web service will be deployed on infrastructure capable of automatic horizontal scaling.
