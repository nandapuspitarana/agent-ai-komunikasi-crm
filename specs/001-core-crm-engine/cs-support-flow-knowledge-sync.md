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
| Base journey (menus, city lists, service cards) | `userjourney/UserJourney-Agent.json` | Input of the build script. |
| CS flow | `userjourney/UserJourney-CS-Support.json` | **Generated** by `userjourney/build_cs_support.js`; do not edit by hand. |

Not used: `KB - List of Centres.xlsx` (superseded by the JSON), `md_locations/` (legacy copies, excluded from the
image through `.dockerignore`).

WhatsApp numbers are not part of any bot answer or indexed document.

## 2. Flow generation (`userjourney/build_cs_support.js`)

1. Loads `KB - List of Centres.json` and maps each centre to its bot name through a brand code
   (`AXA`, `OPP`, `IDX`, ...).
2. Fills each centre's address, phone, fax, email, website, map link, hours, convenience, amenities and
   description from the JSON.
   - Markdown links inside KB addresses are reduced to their text.
   - A map link that is empty or truncated (`...`) is **not** shown.
   - Hours are shown as `Monday - Friday, 8:30 AM – 5:30 PM` from `opening_time` / `closing_time`.
3. Builds, per centre, one card per product (`PO/MR/VO/DW Centre: <name>`) and a `Front Desk: <name>` card.
4. Builds the city lists (`City Directory: <city>`) with each centre's address and hours.
5. Builds the phone directory and the human-handoff reply per centre, grouped by city (not one number per country).
6. Adds training phrases (English and Indonesian) so free text reaches the right intent (section 3).
7. De-duplicates training phrases (section 4).

### Intent naming

| Prefix | Meaning |
|---|---|
| `PO Centre: <centre>` / `MR` / `VO` / `DW` | Centre card for Private office / Meeting room / Virtual office / Dedicated workstation |
| `Front Desk: <centre>` | Front desk contact for that centre |
| `City Directory: <city>` | Centres of a city with address and hours |
| `Locations: Select City` | City picker |
| `CS: Contact Directory All Locations` | Phone/email per centre |
| `Facilities: Building Access & Access Cards` | Hours per city and access rules |

## 3. Question coverage

| User asks | Reaches |
|---|---|
| "address / alamat / link lokasi / google maps / email / phone / jam buka / convenience / amenities / fasilitas" + centre name or brand code | that centre's card (`PO Centre: ...`) |
| "centre jakarta", "kantor di jakarta", "lokasi jakarta", "email jakarta", ... | `City Directory: <city>` |
| bare centre name (e.g. "centennial tower") | that centre's card |
| bare city name (e.g. "jakarta") | `City Directory: <city>` |
| "link lokasi", "email", "alamat", "google maps", "nomor telepon" without a centre | `Locations: Select City` |
| "jam buka", "jam tutup", "opening hours", "jam operasional" without a centre | `Facilities: Building Access & Access Cards` (hours listed per city) |

The widget matches the first intent whose name or training phrase equals the message, so a phrase must have one owner.

## 4. De-duplication rules

- Intent names are unique (case-insensitive).
- A training phrase belongs to exactly one intent: the intent **named** exactly like the phrase, otherwise the first
  intent that lists it.
- City Directory intents do not keep phrases that are centre names, so a centre name opens the card.
- The WordPress export (`ceosuite.WordPress.*-location.xml`) is indexed with: drafts dropped, one chunk per
  published slug, and every centre covered by the centres JSON skipped (including legacy slugs listed in
  `LEGACY_XML_SLUGS` in `scripts/lib/kb-lib.js`).
- Product cards (PO/MR/VO/DW) intentionally repeat the same centre data; they are generated from the same
  source, so they cannot drift.

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
   `scripts/database/register_all_knowledge_base.js` does).
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
```

A healthy start logs the flow action, `knowledge base synced: N documents, M chunks` and
`result: activeFlow="..." language=en` per tenant.

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
| `tests/api/flow-cs-support.test.ts` (`TEST-CS-01`..`20`) | Flow integrity, option transitions, centre cards against the KB (address, phone, hours, map link, email, convenience, amenities, description), free-text questions per centre and per city, centre-less questions, no WhatsApp, FAQ questions |
| `tests/api/kb-consistency.test.ts` (`TEST-KB-10`..`15`) | No duplicated names/phrases, centre vs city routing, WordPress export de-duplication, L2 documents match the JSON, no WhatsApp in documents |
| `tests/api/sync-knowledge.test.ts` (`TEST-KB-01`..`05`) | Centres JSON chunks, superseded sources, dry-run plan, Dockerfile/compose wiring |
| `tests/api/widget-contact-submit.test.ts` | Report summary language resolution |

Run everything with `npx vitest run`.

## Open items

- `docker compose build` and the database part of `sync-knowledge.js` have not been run end to end. The Docker
  engine stopped responding during the first image build, and the sync was not pointed at the shared database.
  Run it against staging first.
- Singapore Land Tower (`SLT`) and Nan Fung Tower (`WNF`) exist in the KB JSON but have no city menu entry or
  centre card, so they are not answered by the flow.
- Vietcombank Tower's `location_url` is truncated in the KB, and Ping An and Sunshine Financial Center have no
  `location_url`; their cards show no map link until the KB is completed.
- Chunks are stored without embeddings (same as the previous registration script); retrieval quality depends on
  the AI proxy.
- The centre manager is in the KB but intentionally not shown to visitors.
