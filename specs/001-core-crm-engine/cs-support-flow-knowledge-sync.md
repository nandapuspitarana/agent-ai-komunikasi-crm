# CS Support Flow & Knowledge Base Sync

**Status**: Implemented. The container start-up sync has been exercised only in `--dry-run` (see [Open items](#open-items)).
**Scope**: how the Customer Service & Support flow is generated from the knowledge base, how it reaches the
database on `docker compose up --build`, and how the widget/SDK language is resolved.

## 1. Sources of truth

| Data | Source | Notes |
|---|---|---|
| Centre details (address, phone, fax, email, website, map link, hours, convenience, amenities, description) | `userjourney/knowledge base/KB - List of Centres.json` | Single source of truth. Edit this file, nothing else, to change a centre. |
| Per-centre guardrail documents | `userjourney/knowledge base/L2-centre-*.md` | Must quote the same phone and email as the JSON (enforced by test). |
| Other KB documents (FAQ, playbooks, policies, regions, ...) | `userjourney/knowledge base/*.md` | Registered as RAG documents. |
| CS flow | `userjourney/UserJourney-CS-Support.json` | **Generated** by `userjourney/build_cs_support.js`; do not edit by hand. |

Not used: `KB - List of Centres.xlsx` (superseded by the JSON), `md_locations/` (legacy copies, excluded from the
image through `.dockerignore`).

WhatsApp numbers are not part of any bot answer or indexed document.

## 2. Flow generation (`userjourney/build_cs_support.js`)

The flow is deliberately small (since 2026-11-24): **Start -> city -> centre card**, and the centre card is the end of
the journey. Earlier versions had 230 intents (FAQ, facilities, billing, one card per product per centre, front
desk cards); 129 of them were unreachable, 176 buttons pointed at intents that did not exist, and "Start again" /
menu buttons sent visitors in circles. Questions outside centre locations are now answered by the AI from the
knowledge base.

1. Loads `KB - List of Centres.json` and maps each centre to its bot name through a brand code
   (`AXA`, `OPP`, `IDX`, ...).
2. Fills each centre's address, phone, fax, email, website, map link, hours, convenience, amenities and
   description from the JSON.
   - Markdown links inside KB addresses are reduced to their text.
   - A map link that is empty or truncated (`...`) is **not** shown.
   - Hours are shown as `Monday - Friday, 8:30 AM – 5:30 PM` from `opening_time` / `closing_time`.
3. Builds 38 location intents: the start menu (FAQ button first, then 12 city buttons), one list per city (one
   button per centre) and one card per centre (`responseType: card`, no buttons).
4. Builds the FAQ menu from `L1-faq-ceosuite-official-website.md` (the official ceosuite.com FAQ, 19 questions):
   **Start -> FAQ -> topic -> answer card**. One topic per `## n.` section of the file (labels in
   `faqTopicLabels`, in file order), one button per `### Qn:` question, and an answer card that shows the official
   answer word for word (markdown lists and links rendered as HTML) and ends the journey. 26 intents, 64 in all.
   `L1-faq-common-visitor-questions.md` is not used here: it is operator-neutral research that quotes other
   operators, so it stays RAG-only.
5. Adds training phrases (English and Indonesian) so free text reaches the right intent (section 3).
6. Stops with an error when a phrase belongs to two intents, a button points at an intent that does not exist, or a
   button label or target contains `,` or `|`: the widget splits options on `,` (`src/lib/quick-replies.ts`), so
   commas are removed from FAQ question buttons ("What is a co-working space or shared office?"). The card title
   keeps the original question.

### Intent naming

| Name | Meaning |
|---|---|
| `Start / Main Menu` | Greeting, the FAQ button and the 12 city buttons |
| `City Directory: <city>` | Short sentence and one button per centre of that city |
| `Centre: <centre>` | Centre card with every KB field; end of the journey |
| `FAQ` | One button per FAQ topic |
| `FAQ: <topic>` | One button per question of that topic |
| `FAQ: <question>` | Answer card (official text); end of the journey |

Centre names are the ones `src/lib/centres-directory.ts` uses (`Manara Maxis 36` is labelled `Menara Maxis 36` on
buttons and cards), so the visitor's centre is remembered from `metadata.centre` and the handoff buttons line up.

Every intent carries `metadata.fixedReply: true`. The widget (`src/app/api/widget/message/route.ts`) then answers
with the intent text exactly as written, also when the visitor types the phrase instead of tapping the button,
and never sends it to the AI. Before this, a typed city ("saigon") went to the AI for a paraphrase, and the AI
replaced the city text with "I could not find that in my documents" while the buttons were right.

## 3. Question coverage

| User asks | Reaches |
|---|---|
| "address / alamat / link lokasi / google maps / email / phone / jam buka / convenience / amenities / fasilitas / front desk / resepsionis" + centre name, nickname or brand code | that centre's card (`Centre: ...`) |
| bare centre name, centre/center spelling, nicknames ("menara maxis 36", "indonesia stock exchange", "lotte center", "k11 atelier") | that centre's card |
| "centre jakarta", "kantor di jakarta", "lokasi jakarta", "email jakarta", bare city name, aliases ("hcmc", "saigon", "makati", "korea") | `City Directory: <city>` |
| greetings, "start again", "our centres", "locations", and "link lokasi", "email", "alamat", "nomor telepon", "jam buka" without a centre | `Start / Main Menu` (city buttons) |
| "faq", "faqs", "frequently asked questions", "pertanyaan umum", "tanya jawab" | `FAQ` (topic buttons) |
| an FAQ question typed exactly as written (case and the final "?" do not matter) | that question's answer card |
| anything else (services, prices, Wi-Fi, billing, ...) | the AI, using the knowledge base; with the tenant's AI off, the default reply in the flow language ("Sorry, I didn’t understand your message…" for `en`) and a handoff |

Brand codes are only used inside a question ("email AXA"), never alone: with the AI off the widget also matches
phrases contained in a message, and "sun" or "opp" would hit ordinary words. For the same reason there are no
2-letter aliases ("kl", "hk").

## 4. De-duplication rules

- Every centre and every city exists exactly once; names, phrases and answers are unique (enforced by the build
  script and by `TEST-CS-05` / `TEST-KB-10`).
- Every intent except the start menu is reached by exactly one button, so the flow is a tree and cannot loop
  (`TEST-CS-03`).
- Handoff replies (`src/lib/centres-directory.ts`) only offer buttons that open intents of this flow: none after a
  centre hotline, one per centre after a city hotline, one per city otherwise (`TEST-DH-17`).
- The WordPress export (`ceosuite.WordPress.*-location.xml`) is indexed with: drafts dropped, one chunk per
  published slug, and every centre covered by the centres JSON skipped (including legacy slugs listed in
  `LEGACY_XML_SLUGS` in `scripts/lib/kb-lib.js`).

## 5. Container start-up sync

`Dockerfile` runs `node userjourney/build_cs_support.js` in the build stage, copies the flow JSON, the
knowledge base folder and `scripts/docker` + `scripts/lib` into the runner image, and the container command is:

```
prisma db push  ->  node scripts/docker/sync-knowledge.js (failure never blocks)  ->  npm run start
```

Admin workflow: update `KB - List of Centres.json` (and documents), run `docker compose up -d --build`.

### What `sync-knowledge.js` does (idempotent)

1. **Flow**: finds the flow by name (`CEO SUITE Customer Service & Support Flow`, with or without
   ` (Imported)`) for each target tenant. Creates it, or replaces its intents when the SHA-256 of
   `UserJourney-CS-Support.json` differs from `flow.metadata.sourceHash`. Admin edits therefore survive restarts
   until an image carries new content.
2. **Active flow**: activated on first creation (`KB_ACTIVATE_FLOW=true`), on every start with `force`, never with
   `false`. A tenant without an active flow gets this one.
3. **Language**: when the flow is the tenant's active flow, `tenant.visitorConfig.language` is set to the flow's
   language (`en`) unless `KB_ALIGN_LANGUAGE=false`.
4. **Knowledge documents**: when the hash of the knowledge base folder differs from `flow.metadata.kbHash`,
   the flow's documents are replaced in `crm_agent_KnowledgeDocument`, `public.crm_documents`,
   `public.crm_document_chunks` and `public.documents` (chunks are stored without embeddings, as
   `scripts/database/register_all_knowledge_base.js` does). **Run `scripts/maintenance/embed_missing_chunks.py`
   after every sync that reloads the knowledge base** (see Operations): RAG search skips chunks without an
   embedding, so until then the AI answers "I don't have enough information" to every knowledge base question.
   - The centres JSON becomes one chunk per centre with every field.
   - `KB - Pricing Table.xlsx` cannot be parsed here; its existing chunks are reused from the database.
   - A warning is logged when a second flow with the same name exists for the tenant.

### Environment variables

| Variable | Default | Meaning |
|---|---|---|
| `KB_SYNC` | `true` | `false` skips the whole sync |
| `KB_TENANT_ID` | empty | `<id>`, `<id>,<id>` or `all`. Empty: tenants that already own the flow, else the only tenant. **Required when several tenants exist and none owns the flow** (otherwise nothing is loaded and a warning lists the tenants) |
| `KB_ACTIVATE_FLOW` | `true` | `true` on first creation, `force` every start, `false` never |
| `KB_ALIGN_LANGUAGE` | `true` | Tenant language follows the active flow's language |

### Operations

```
# list tenants (id, language, active flow)
docker compose exec web node scripts/docker/sync-knowledge.js --list-tenants
# plan without touching the database
node scripts/docker/sync-knowledge.js --dry-run
# what happened at start
docker compose logs web | grep sync-knowledge
# after "knowledge base synced": embed the new chunks, inside the AI proxy (its model, key and DB connection)
docker cp scripts/maintenance/embed_missing_chunks.py ai-agent-proxy:/tmp/
docker exec ai-agent-proxy python /tmp/embed_missing_chunks.py --flow-id <flow id> --dry-run
docker exec ai-agent-proxy python /tmp/embed_missing_chunks.py --flow-id <flow id>
```

A healthy start logs the flow action, `knowledge base synced: N documents, M chunks` and
`result: activeFlow="..." language=en` per tenant. The flow id is in the `updated with N intents (<flow id>)`
line. On server 242 (2026-11-24) the CS flow is `601a23c2-136a-4e8c-9c55-5560d4e36384`; its 1172 chunks
took about a minute to embed.

## 6. Language resolution

Server text (report summary, bot confirmation, widget config) resolves the language in this order:

| Endpoint | Order |
|---|---|
| `POST /api/widget/init`, `GET /api/widget/config`, `POST /api/widget/message` | `tenant.visitorConfig.language` > active flow `config.language` > `en` |
| `POST /api/widget/contact-submit` | `tenant.visitorConfig.language` > active flow `config.language` > request `language` > `en` |

The request language is only a last resort so a client holding an old config cannot flip the language of what is
stored in the chat. The Flutter SDK and web widget show a locally built summary first and then replace it with
the server's `userMessage`.

If an Indonesian summary (`[Laporan Masalah ke Perusahaan]`) still appears, the tenant's own setting is `id`
(Settings > Tenant Primary Language) or the sync did not run for that tenant (check `KB_TENANT_ID`).

## 7. Tests

| File | Covers |
|---|---|
| `tests/api/flow-cs-support.test.ts` (`TEST-CS-01`..`23`) | Flow shape (start -> city -> card and start -> FAQ -> topic -> answer, FAQ button first, no loops, no back buttons, no duplicates, no dead buttons, no `,` or `|` in buttons), centre cards against the KB (address, phone, hours, map link, email, convenience, amenities, description), FAQ topics and answers against the official FAQ file word for word, typed FAQ questions, free-text questions per centre and per city (AI on and off), centre-less questions, no WhatsApp |
| `tests/api/dynamic-handoff.test.ts` (`TEST-DH-01`..`17`) | Centre lookup, handoff replies per centre / city, handoff buttons open intents of the CS flow |
| `tests/api/kb-consistency.test.ts` (`TEST-KB-10`..`15`) | No duplicated names/phrases, centre vs city routing, WordPress export de-duplication, L2 documents match the JSON, no WhatsApp in documents |
| `tests/api/sync-knowledge.test.ts` (`TEST-KB-01`..`05`) | Centres JSON chunks, superseded sources, dry-run plan, Dockerfile/compose wiring |
| `tests/api/widget-contact-submit.test.ts` | Report summary language resolution |
| `tests/api/widget-message.test.ts` (`TEST-AI-F05`, `F06`) | `fixedReply` intents skip the AI when typed; the AI-off default reply follows the flow language |

Run everything with `npx vitest run`. On Windows, run it from a path with an upper-case drive letter (`C:\...`):
from `c:\...` vitest loads itself twice and every file fails with "Vitest failed to find the current suite".

## Open items

- `docker compose build` and the database part of `sync-knowledge.js` have not been run end to end. The Docker
  engine stopped responding during the first image build, and the sync was not pointed at the shared database.
  Run it against staging first.
- Vietcombank Tower's `location_url` is truncated in the KB, and Ping An and Sunshine Financial Center have no
  `location_url`; their cards show no map link until the KB is completed.
- The sync stores chunks without embeddings; `embed_missing_chunks.py` fills them in by hand afterwards. Doing
  it in the sync itself needs the proxy (it holds the embedding key), e.g. an ingest call per document.
- RAG isolation: without the AI proxy's migration `002_rag_isolation.sql` the proxy searches the chunks of every
  flow and tenant ("DB not migrated yet — falling back to UNSCOPED search"), so documents of deleted flows leak
  into answers. After the migration it searches only rows whose `flow_id`/`tenant_id` columns match; run
  `scripts/database/sql/004_rag_isolation_backfill.sql` once to fill those columns for older rows. The sync
  writes them itself when the columns exist (`TEST-KB-03b`). Applied on server 242 on 2026-11-24.
- Centre manager names stay only in `KB - List of Centres.json` (`centre_manager`) and are never indexed: the centre cards and the centres chunks leave them out, and the meeting room guides no longer list them (2026-11-24). `TEST-KB-03c` fails if a document the sync loads names one.
