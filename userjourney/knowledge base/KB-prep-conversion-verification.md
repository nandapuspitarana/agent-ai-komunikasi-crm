# Conversion Verification

## Naming Convention
- Use `L1-` and `L2-` prefixes only for markdown files intended for AI chatbot training/retrieval.
- Layer 1 is the industry FAQ and conversational foundation.
- Layer 1 teaches the chatbot common user questions, intent classification, answer structure, conversation flow, terminology, upsell opportunities and clarification logic.
- Layer 1 is suitable for general questions such as hot desk definitions, coworking versus serviced office, hourly bookings and virtual office explanations.
- Layer 2 is the CEO SUITE actual source of truth.
- Layer 2 contains CEO SUITE-specific facts and operating rules, including products, centres, regions with active CEO SUITE locations, commercial rules, services and policies.
- Layer 1 files use `L1-<category>-<topic>.md`.
- Layer 2 files use `L2-<category>-<topic>.md`.
- Region files must not be created for markets where CEO SUITE has no active location.
- Current Layer 1 category examples used: `faq`, `playbook`, `workflow`.
- Current Layer 2 category examples used: `product`, `services`, `region`, `centre`, `commercial`, `policy`.

## DOCX Conversion Checks
Paragraph checks use normalized word-token text, so equivalent citation marker formats, inline code, emphasis, punctuation and table-cell formatting do not create false failures.

| Source DOCX | Markdown File | Paragraphs Checked | Matched | Status |
|---|---|---:|---:|---|
| KB - FAQ.docx | L1-faq-common-visitor-questions.md | 80 | 80 | OK |
| KB - L2 Coworking Product Overview.docx | L2-product-coworking.md | 80 | 80 | OK |
| KB - L2 Dedicated Workstation.docx | L2-product-dedicated-workstation.md | 80 | 80 | OK |
| KB - L2 Meeting Room Product Guide.docx | L2-product-meeting-room.md | 80 | 80 | OK |
| KB - L2 Serviced Office Product Overview.docx | L2-product-serviced-office.md | 80 | 80 | OK |
| KB - L2 Virtual Office Product Overview.docx | L2-product-virtual-office.md | 80 | 80 | OK |
| KB - L2 Services Company Incorporation.docx | L2-services-company-incorporation.md | 80 | 80 | OK |
| KB - L2 Location Singapore Centennial Tower.docx | L2-centre-singapore-centennial-tower.md | 80 | 80 | OK |
| KB - L2 Locations Jakarta IDX Centre.docx | L2-centre-jakarta-idx.md | 80 | 80 | OK |
| KB - Locations Jakarta AXA Tower.docx | L2-centre-jakarta-axa-tower.md | 45 | 45 | OK |
| KB - Locations Jakarta One Pacific Place.docx | L2-centre-jakarta-one-pacific-place.md | 46 | 46 | OK |
| KB - Locations Jakarta Sahid Sudirman Center.docx | L2-centre-jakarta-sahid-sudirman-center.md | 44 | 44 | OK |
| KB - To Do List.docx | KB-prep-to-do-list.md | 80 | 80 | OK |

## Result
- Markdown files after normalization: 66
- Non-convention markdown filenames remaining: 0
- DOCX originals were left intact as source files.
- Old plain-name markdown duplicates were removed after canonical files were written.
