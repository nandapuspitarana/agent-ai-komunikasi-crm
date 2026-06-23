# Knowledge Base - To Do List

## Layer 1 — Industry FAQ

Use this to teach the LLM:

- what users commonly ask

- how to classify intent

- how to structure answers

- conversation flow

- terminology

- upsell opportunities

- clarification logic

Use it for:

- RAG knowledge base

- intent classification

- FAQ training

- conversation design

- chatbot prompt engineering

Good for:

- What is a hot desk?

- Difference between coworking and serviced office?

- Can I book by the hour?

- What is a virtual office?

Files:

- KB - FAQ.docx

Status:

- ☑ FAQ knowledge base created

- ☐ Continue expanding FAQs

- ☐ Add country-specific FAQs

- ☐ Add centre-specific FAQs

## Layer 2 — CEO SUITE Actual Source of Truth

This becomes the REAL source of truth.

## 1. Structured Product Docs

One document per product.

Status:

- ☑ serviced-office.md

- ☑ virtual-office.md

- ☑ coworking.md

- ☑ dedicated-workstation.md

- ☑ meeting-room.md

Purpose:

- product definitions

- inclusions

- exclusions

- eligibility

- FAQs

- AI recommendation logic

- escalation rules

## 2. Business Support Services

Status:

- ☑ company-incorporation.md

Future (optional):

- company-secretarial.md

- accounting-bookkeeping.md

- payroll-services.md

- visa-immigration.md

- telephone-answering.md

Decision:

Start with company-incorporation.md only.

Additional service files will only be created when required.

## 3. Country Knowledge Files

Purpose:

Country-specific information that should not be duplicated across centre files.

Include:

- business environment

- company incorporation overview

- language

- currency

- public holidays

- payment methods

- business culture

- compliance considerations

- visa overview

- common FAQs

Status:

- ☑ indonesia.md

Pending:

- singapore.md

- malaysia.md

- hongkong.md

- philippines.md

- south-korea.md

- taiwan.md

- thailand.md

- vietnam.md

- china.md

## 4. Centre Knowledge Files

One document per centre.

Purpose:

- building profile

- address

- nearby transport

- nearby amenities

- nearby landmarks

- workspace availability

- meeting room facilities

- parking

- visitor experience

- centre positioning

- best-fit customer profile

- AI recommendation rules

## Singapore

- Centennial Tower

## Indonesia

- ☑ Jakarta IDX

- ☑ Jakarta One Pacific Place

- ☑ Jakarta Sahid Sudirman Center

- ☑ Jakarta AXA Tower

## Hong Kong

- One Island East

- Additional centres

## China

- Shanghai HKN

- Shanghai SWF

- Beijing centres

## South Korea

- Seoul centres

## Philippines

- Manila centres

## Taiwan

- Taipei centres

## Thailand

- Bangkok centres

## Vietnam

- Ho Chi Minh City centres

## Malaysia

- Kuala Lumpur centres

## 5. Commercial Rules

Create structured knowledge for:

- deposits

- billing cycles

- cancellation notice

- promotions

- package rules

- eligibility

- upgrade rules

- downgrade rules

- refund policies

Status:

- Not started

## 6. Operational Workflows

Create documentation for:

- booking flow

- tour request flow

- quotation flow

- sign-up flow

- payment flow

- approval flow

Status:

- Not started

## 7. Policies & SOP

Internal operational truth.

Files to create:

- cancellation policy

- visitor policy

- after-hours access policy

- mail handling policy

- company registration policy

- IT/network policy

- printing policy

- access card policy

- guest access policy

Status:

- Not started

## 8. AI Conversation Playbooks

Very important.

Create playbooks for:

- lead qualification flow

- upsell flow

- escalation flow

- unavailable room handling

- no availability handling

- competitor comparison handling

- objection handling

- angry customer handling

- complaint handling

Status:

- Not started

## RAG Retrieval Hierarchy

## Level 1

FAQ Knowledge

Examples:

- What is a Virtual Office?

- What is a Hot Desk?

- Can I book by the hour?

## Level 2

Product Knowledge

Examples:

- Difference between Serviced Office and Coworking

- What is included in a Dedicated Workstation?

## Level 3

Country Knowledge

Examples:

- Can foreigners register a company in Indonesia?

- What language is used in Taiwan?

- What currency is used in Thailand?

## Level 4

Centre Knowledge

Examples:

- Tell me about Jakarta IDX

- Compare AXA Tower vs One Pacific Place

- Which Jakarta centre is best for finance companies?

## Level 5

Policies & SOP

Examples:

- visitor policy

- cancellation policy

- mail handling policy

## Level 6

Live Data

Examples:

- current pricing

- availability

- promotions

- office inventory

- meeting room availability

## What We Should NOT Do

Do not:

- fine-tune directly on raw website HTML

- dump brochures blindly

- use old PDFs without review

- feed contradictory documents

- let AI infer policies

Especially for:

- pricing

- legal matters

- billing

- availability

- company registration

- contract terms

These should come from structured live data or controlled documentation.

## Architecture

Public FAQ dataset

Product knowledge

Country knowledge

Centre knowledge

Live pricing/API

Operational SOP docs

Escalation workflows

CRM integration

## Negative Examples

Include “what NOT to say”.

Examples:

- Never guarantee immediate availability.

- Never guarantee company registration approval.

- Never guarantee visa approval.

- Never guarantee government approval.

- Never confirm 24/7 access unless centre-specific information confirms it.

- Never provide legal advice.

- Never provide tax advice.

- Never promise exact pricing without checking live data.

## Immediate Next Actions

## Phase 1 - Foundation

- ☑ Create FAQ knowledge base

- ☑ Create product knowledge files

- ☑ Create company-incorporation.md

- ☑ Create first Jakarta centre files

## Phase 2 - Country Knowledge

- ☑ indonesia.md

- ☐ singapore.md

- ☐ malaysia.md

- ☐ hongkong.md

- ☐ philippines.md

- ☐ south-korea.md

- ☐ taiwan.md

- ☐ thailand.md

- ☐ vietnam.md

- ☐ china.md

## Phase 3 - Centre Knowledge

- Complete all Singapore centres

- Complete all Indonesia centres

- Complete all Hong Kong centres

- Complete all China centres

- Complete all South Korea centres

- Complete all Philippines centres

- Complete all Taiwan centres

- Complete all Thailand centres

- Complete all Vietnam centres

- Complete all Malaysia centres

## Phase 4 - Operations

- Policies & SOP

- Escalation playbooks

- Lead qualification playbooks

- Quotation workflow knowledge

## Phase 5 - Integrations

- Live pricing API

- Availability API

- CRM lead creation

- Meeting room booking integration

- Tour booking integration

- Quotation generation integration

## Current Progress

Completed:

- FAQ framework

- Product knowledge framework

- Company incorporation knowledge

- Indonesia country knowledge

- Jakarta IDX

- Jakarta One Pacific Place

- Jakarta Sahid Sudirman Center

- Jakarta AXA Tower

Next Recommended Task:

Create:

- singapore.md

- hongkong.md

- china.md

Then complete all centre knowledge files.
