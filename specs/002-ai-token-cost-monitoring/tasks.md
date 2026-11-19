# TODO — Monitoring Token & Estimasi Biaya AI (USD)

> Cakupan: `ai-agent-proxy` (FastAPI, tempat semua panggilan OpenAI) + `agent-ai-komunikasi-crm` (Next.js, dashboard).
> Provider aktif: OpenAI (`OPENAI_BASE_URL=https://api.openai.com`), model `gpt-4o-mini` / `gpt-4o`, embedding `text-embedding-3-small`.
> Dibuat: 2026-11-04

---

## Kondisi saat ini (hasil audit & implementasi)

| Komponen | Status | Lokasi |
|---|---|---|
| Ambil `usage.prompt_tokens/completion_tokens` dari OpenAI | ✅ ada | `ai-agent-proxy/agent/llm_manager.py:175` |
| Tabel `ai_trace_logs` (+ `total_tokens` + `cost_usd` + `cached/reasoning`) | ✅ ada | `migrations/003_ai_trace_logs.sql`, `migrations/004_ai_cost_columns.sql` |
| Tabel `ai_model_pricing` (seed OpenAI models) | ✅ ada | `migrations/005_ai_model_pricing.sql` |
| `TraceLogger.record_llm_call()` & `record_embedding_call()` | ✅ ada | `ai-agent-proxy/observability/trace_logger.py` |
| Endpoint agregasi biaya `GET /api/v1/observability/dashboard` | ✅ ada | `ai-agent-proxy/api/observability.py` |
| Route CRM `/api/dashboard/ai-cost` (clamped days, superadmin selector) | ✅ ada | `src/app/api/dashboard/ai-cost/route.ts` |
| **TraceLogger di-wire ke LLMManager / Orchestrator / Embedder** | ✅ **sudah** | `ai-agent-proxy/api/dependencies.py` |
| Token embedding dicatat | ✅ **sudah** | `ai-agent-proxy/rag/embedder.py`, `rag/ingestion/pipeline.py` |
| Konteks tenant aman untuk request paralel | ✅ **sudah** | `ai-agent-proxy/observability/context.py` (contextvars) |
| Harga model | ✅ **dinamis & snapshot** | `observability/pricing.py` + DB table `ai_model_pricing` |
| Panggilan gagal (exception) tercatat | ✅ **sudah** | `status="error"`, `error_type` dicatat di `ai_trace_logs` |
| Anti-double-count tokens | ✅ **sudah** | Hanya akumulasi `llm_complete`, `embedding`, `eval` |
| Rekonsiliasi dengan tagihan OpenAI asli | ⏳ fase 3 | — |
| Budget / alert per tenant | ⏳ fase 4 | — |
| Dashboard penagihan Super Admin (lintas tenant, CSV) | ✅ sudah | src/app/[lang]/(dashboard)/admin/page.tsx, /api/admin/overview, docs/superpowers/specs/2026-11-19-admin-billing-dashboard-design.md |

---

## Fase 0 — Bikin data mengalir (prioritas tertinggi) ✅ SELESAI

- [x] **T001** Wire `TraceLogger` di `ai-agent-proxy/api/dependencies.py`
  - Buat singleton `get_trace_logger()` (pakai `TraceRepository`).
  - `LLMManager(trace_logger=...)` dan `Orchestrator(..., trace_logger=...)`.
  - `evals/eval_runner.py` (`LLMManager()` untuk LLM judge) dicatat dengan `request_type="eval"`.
- [x] **T002** Ganti `bind_request_context()` berbasis atribut instance dengan `contextvars.ContextVar` (`session_id`, `tenant_id`, `flow_id`, `request_type`) di `observability/context.py`.
- [x] **T003** Catat token embedding di `rag/embedder.py` (`resp.usage.prompt_tokens`, `request_type="embedding"`, `output_tokens=0`).
  - Termasuk ingestion dokumen (`rag/ingestion/pipeline.py`).
- [x] **T004** Catat juga panggilan yang **gagal** (exception) dengan `status="error"` + `error_type`, token `NULL`.
- [x] **T005** Hindari double-count: baris `request_type="chat"` (level orchestrator) tidak ikut dijumlahkan. Aturan: **biaya & token = SUM dari baris `llm_complete` + `embedding` + `eval` saja**.
- [x] **T006** Verifikasi end-to-end: kirim chat & embedding langsung → terverifikasi tertulis di `ai_trace_logs` dengan token, `cost_usd`, dan `status`.

## Fase 1 — Perhitungan biaya yang akurat ✅ SELESAI

- [x] **T010** Pindahkan tabel harga ke tabel DB `ai_model_pricing` (`migrations/005_ai_model_pricing.sql`):
  - Model seeding: `gpt-4o-mini`, `gpt-4o`, `text-embedding-3-small`, `text-embedding-3-large`.
  - Dynamic cache loader di `observability/pricing.py`.
  - Normalisasi nama model dengan prefix matching (mis. `gpt-4o-mini-2024-07-18`).
- [x] **T011** Tambah kolom ke `ai_trace_logs` via `migrations/004_ai_cost_columns.sql`:
  - `cached_input_tokens INT DEFAULT 0`
  - `reasoning_tokens INT DEFAULT 0`
  - `cost_usd NUMERIC(12,6)` (snapshot dihitung saat insert)
  - `openai_request_id TEXT`
  - `status TEXT DEFAULT 'success'`, `error_type TEXT`
- [x] **T012** Model tanpa harga → `cost_usd = NULL` + `logger.warning` sekali per model. Tampilkan di dashboard sebagai `unpriced_models`.
- [x] **T013** Unit test perhitungan biaya: standard rates, cached tokens, model tak dikenal, prefix matching (`tests/unit/test_pricing.py`).

## Fase 2 — Agregasi yang skalabel (~1 hari)

- [ ] **T020** Ganti loop Python + `limit(5000)` dengan Postgres RPC/view, mis. `ai_cost_summary(tenant_id, from, to, group_by)` yang mengembalikan SUM token & `cost_usd` per hari / model / `request_type`.
- [ ] **T021** Tabel rollup harian `ai_usage_daily (date, tenant_id, model_name, request_type, input_tokens, cached_input_tokens, output_tokens, cost_usd, request_count)` diisi cron (pg_cron atau scheduled job) — supaya query bulanan/tahunan tetap cepat.
- [ ] **T022** Endpoint baru / perluasan di `api/observability.py` — sebagian: `GET /observability/usage-by-tenant?from&to` sudah ada (lihat spec admin billing); month-to-date/proyeksi belum:
  - `GET /observability/cost?tenant_id&from&to&group_by=day|model|type` (hilangkan batas `le=28`)
  - `GET /observability/cost/month-to-date?tenant_id` → `{spent_usd, projected_month_end_usd, budget_usd, pct}`
  - Proyeksi akhir bulan = `spent / hari_berjalan × jumlah_hari_bulan`.
- [x] **T023** Mode super-admin: agregat lintas tenant (`tenant_id` opsional) + ranking tenant termahal.

## Fase 3 — Integrasi OpenAI (rekonsiliasi tagihan asli) (~1 hari)

Tujuan: angka internal adalah **estimasi**; angka dari OpenAI adalah **tagihan sebenarnya**. Keduanya ditampilkan berdampingan.

- [ ] **T030** Buat **Admin API key** OpenAI (`sk-admin-...`, hanya bisa dibuat oleh Owner organisasi) → simpan sebagai `OPENAI_ADMIN_KEY` di `.env` proxy. Jangan dipakai untuk inference.
- [ ] **T031** (Disarankan) Pisahkan **OpenAI Project** per environment (prod / uat / dev) supaya biaya bisa dipisah via `project_id`; set `OPENAI_PROJECT_ID` per environment.
- [ ] **T032** Job harian `scripts/sync_openai_usage.py`:
  - `GET https://api.openai.com/v1/organization/costs?start_time=<unix>&bucket_width=1d&group_by=project_id,line_item` → biaya USD aktual
  - `GET https://api.openai.com/v1/organization/usage/completions?start_time=<unix>&bucket_width=1d&group_by=model,project_id` → token aktual
  - `GET .../v1/organization/usage/embeddings` → token embedding aktual
  - Tangani pagination (`next_page`) dan simpan ke tabel `openai_billing_daily`.
- [ ] **T033** Rekonsiliasi: bandingkan `SUM(ai_usage_daily)` vs `openai_billing_daily` per hari/model. Jika selisih > 10% → alert (indikasi ada panggilan yang tidak tercatat, mis. dari skrip/eval/kunci yang sama dipakai aplikasi lain).
- [ ] **T034** Catatan: OpenAI **tidak bisa** memecah biaya per tenant CRM. Biaya per tenant tetap dari log internal; OpenAI hanya untuk validasi total.

## Fase 4 — Budget & Alert (~1 hari)

- [ ] **T040** Kolom budget di Prisma `Tenant` (CRM): `aiMonthlyBudgetUsd Decimal?`, `aiBudgetHardLimit Boolean @default(false)`; default per plan (free/starter/professional/enterprise) mengikuti `PLAN_LIMITS` di `src/middleware/usage.ts`.
- [ ] **T041** Cek budget di proxy sebelum memanggil LLM (cache 60 detik): bila `hardLimit` dan MTD ≥ budget → kembalikan balasan fallback ("hubungkan ke agen manusia") tanpa memanggil OpenAI.
- [ ] **T042** Alert di 50% / 80% / 100% budget (email via `nodemailer` yang sudah ada, atau notifikasi in-app). Simpan state alert supaya tidak terkirim berulang.
- [ ] **T043** Alert global: biaya harian seluruh sistem > ambang `AI_DAILY_COST_ALERT_USD`.
- [ ] **T044** Set juga **Usage limit / budget alert di dashboard OpenAI** (Settings → Limits) sebagai jaring pengaman terakhir.

## Fase 5 — Dashboard CRM (~1 hari)

- [ ] **T050** Tab "AI Cost & Evals" (`dashboard/page.tsx:559`):
  - Kartu: **Total token bulan ini**, **Biaya MTD (estimasi)**, **Proyeksi akhir bulan**, **Biaya aktual OpenAI** (dari T032), **Sisa budget** (progress bar).
  - Grafik biaya harian (data `by_day` sudah tersedia), breakdown per model & per `request_type` (chat / embedding / eval).
  - Pemilih periode: 7 hari / 30 hari / bulan ini / bulan lalu / custom.
  - Tampilkan baris "unpriced models" bila ada (T012).
- [x] **T051** Export CSV per periode (untuk invoicing ke tenant).
- [ ] **T052** Konversi IDR opsional (kurs dari env `USD_IDR_RATE` atau API kurs), tampilkan sebagai sekunder — USD tetap sumber kebenaran.

## Fase 6 — Keamanan & bersih-bersih

- [ ] **T060** Endpoint `/api/v1/observability/*` di proxy **tanpa autentikasi** dan mengembalikan `llm_prompt`/`user_message` (data percakapan). Tambahkan shared secret/service token antara CRM ↔ proxy, dan jangan expose port 8200 ke publik.
- [ ] **T061** `src/app/api/dashboard/ai-cost/route.ts`: `encodeURIComponent(tenantId)`; validasi `days`; super-admin bisa pilih tenant.
- [ ] **T062** `src/modules/ai/agent-proxy.ts` masih **mock** (usage = panjang string, bukan token) dan dipakai `src/app/api/agent/route.ts` → hapus atau arahkan ke `chatWithAgent()`.
- [ ] **T063** Jalur `LOCAL_LLM_URL` di `src/lib/ai-agent.ts` melewati proxy → tidak tercatat. Bila dipakai, catat sebagai model `local/*` dengan biaya 0 agar volume tetap terlihat.
- [x] **T064** Retensi: `llm_prompt`/`llm_response` di `ai_trace_logs` dipangkas/dihapus setelah N hari (privasi + ukuran DB); kolom token & biaya tetap disimpan (atau cukup di rollup T021). — purge kini mengosongkan isi percakapan > 28 hari, metrik disimpan 400 hari (migration 006).

## Fase 7 — Testing

- [ ] **T070** Unit test: kalkulasi biaya (T013), contextvars tidak bocor antar request paralel (`asyncio.gather` 2 tenant).
- [ ] **T071** Integration test: 1 chat → baris trace tertulis dengan `cost_usd` > 0.
- [ ] **T072** Test sinkronisasi OpenAI dengan respons API yang di-mock (termasuk pagination).
- [ ] **T073** E2E Playwright: tab AI Cost menampilkan angka non-nol setelah chat percobaan.

---

## Urutan pengerjaan yang disarankan

1. **Fase 0** — tanpa ini semua dashboard tetap $0.
2. **Fase 1** — angka dolar menjadi benar.
3. **Fase 6 (T060)** — sebelum dashboard dipakai lebih luas, karena endpoint saat ini membocorkan isi percakapan.
4. Fase 3 → 4 → 2 → 5 → 7 sesuai kebutuhan (Fase 2 baru mendesak bila log > ~5000 baris per periode).

## Variabel environment baru

| Nama | Repo | Keterangan |
|---|---|---|
| `OPENAI_ADMIN_KEY` | ai-agent-proxy | Admin key untuk Usage/Costs API (rahasia, jangan di-commit) |
| `OPENAI_PROJECT_ID` | ai-agent-proxy | Filter biaya per environment |
| `AI_DAILY_COST_ALERT_USD` | ai-agent-proxy | Ambang alert global harian |
| `OBSERVABILITY_SERVICE_TOKEN` | keduanya | Auth CRM → proxy (T060) |
| `USD_IDR_RATE` | crm (opsional) | Tampilan kurs |
| `BILLING_TIMEZONE` | keduanya | Zona batas periode tagihan, default `Asia/Jakarta` |
