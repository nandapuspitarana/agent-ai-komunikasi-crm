# Admin Billing Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Halaman `/admin` khusus SUPER_ADMIN yang menampilkan, per tenant dan per periode tagihan, akun staf, pengguna akhir, aktivitas chat, serta token & biaya AI yang akurat (tanpa batas 5000 baris), plus export CSV.

**Architecture:** Proxy (`ai-agent-proxy`) mendapat migration 006 (retensi metrik 400 hari + dua fungsi agregasi SQL yang mengembalikan `jsonb`) dan endpoint `GET /api/v1/observability/usage-by-tenant`. CRM mendapat lib murni `src/lib/admin-billing.ts` (periode, merge, CSV), lib query Prisma `src/lib/admin-stats.ts`, route `GET /api/admin/overview`, dan halaman `src/app/[lang]/(dashboard)/admin/page.tsx` dengan komponen di `src/components/admin/`.

**Tech Stack:** FastAPI + supabase-py (async) + pytest; Next.js 16 App Router + Prisma 5 + next-auth v5 + Tailwind + lucide-react + vitest.

**Spec:** `docs/superpowers/specs/2026-11-19-admin-billing-dashboard-design.md`

## Global Constraints

- Hanya role `SUPER_ADMIN` boleh mengakses `/api/admin/overview` dan halaman `/admin` (`requireUser({ roles: ['SUPER_ADMIN'], requireTenant: false })`).
- Token/biaya yang tidak diketahui (proxy gagal) = `null` → tampil "—"; **tidak pernah 0**.
- Request type yang dihitung: `llm_complete`, `embedding`, `eval` saja.
- Periode: tanggal kalender inklusif `from..to` (`YYYY-MM-DD`), dikonversi ke `[from 00:00, to+1 00:00)` di zona `BILLING_TIMEZONE` (default `Asia/Jakarta`); `from ≤ to`; maks **400 hari**.
- Retensi `ai_trace_logs`: isi percakapan (`user_message`, `llm_prompt`, `llm_response`, `rag_similarity_scores`, `rag_sources`, `eval_notes`) di-NULL-kan setelah **28 hari**; baris dihapus setelah **400 hari**.
- Tidak ada isi percakapan di endpoint/route/halaman baru.
- Tanpa dependency npm baru; tanpa library chart.
- Prisma: hanya `count` / `groupBy` / `aggregate` / `$queryRaw` agregat — tidak memuat seluruh baris `ChatSession`/`Message`.
- CSV kolom persis: `tenant_id,tenant_name,plan,period_from,period_to,staff_total,staff_active,end_users_active,sessions,messages,input_tokens,cached_input_tokens,output_tokens,total_tokens,requests,cost_usd,unpriced_requests` (16 kolom spesifikasi + `unpriced_requests` di akhir; sel teks diberi awalan `'` bila diawali `=`,`+`,`-`,`@`,tab,CR); nama file `billing_<from>_<to>.csv`; `cost_usd` 6 desimal.
- i18n namespace `admin` di kelima `src/dictionaries/*.json`; `en` & `id` diterjemahkan, `ko/th/zh` berisi teks Inggris; setiap `t('admin', key, fallback)` memberi fallback Inggris.
- Branch kerja: `feature/admin-billing-dashboard` di **kedua** repo. Repo CRM punya perubahan user yang belum di-commit (`Dockerfile`, `docker-compose.yml`, `package.json`, `userjourney/*`, `scripts/docker/bootstrap.js`, …) — **jangan** di-stage; selalu `git add <path spesifik>`.

## Review Focus

1. Tenant dengan nama mengandung koma/kutip/newline di CSV → harus di-escape RFC 4180 (test di Task 4).
2. Proxy hidup tapi lambat (> 15 detik) → `ai.status = "unavailable"`, data Prisma tetap tampil (test timeout di Task 5).
3. Periode yang dimulai sebelum `oldest_available` → banner peringatan, bukan angka diam-diam lebih kecil (test di Task 4 `needsRetentionWarning`).
4. Rentang melewati pergantian tahun / bulan Februari / `to` = hari ini → rentang UTC benar (test di Task 2 & Task 4).
5. Supabase PostgREST `db-max-rows` (default 1000) memotong hasil RPC set-returning → fungsi SQL mengembalikan **satu nilai `jsonb`**, bukan `SETOF` (dipaksa di Task 1, diuji bentuknya di Task 3).

---

## Bagian A — `ai-agent-proxy` (`c:\Users\nanda\Documents\aiagent\ai-agent-proxy`)

### Task 0: Branch kedua repo

- [ ] **Step 1:** Proxy: `git -C ../ai-agent-proxy status --short` harus bersih; `git -C ../ai-agent-proxy checkout -b feature/admin-billing-dashboard`.
- [ ] **Step 2:** CRM: `git checkout -b feature/admin-billing-dashboard` (perubahan user yang belum di-commit ikut pindah branch apa adanya — biarkan).

### Task 1: Migration 006 — retensi & fungsi agregasi

**Files:**
- Create: `migrations/006_ai_usage_billing.sql`
- Modify: `schema.sql` (fungsi `purge_old_trace_logs` ~baris 339 + tambahkan dua fungsi baru), `migrations/README.md` (baris 006, koreksi deskripsi 003), `README.md:384` (teks retensi)

**Interfaces:**
- Produces (SQL, dipanggil via `client.rpc`):
  - `purge_old_trace_logs() RETURNS INT` — signature tetap; NULL-kan payload baris > 28 hari (yang payload-nya belum NULL), `DELETE` baris > 400 hari; return jumlah baris terhapus + ter-scrub.
  - `ai_usage_by_tenant(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ) RETURNS JSONB` — array objek `{tenant_id, request_type, model_name, input_tokens, cached_input_tokens, output_tokens, cost_usd, request_count, error_count, unpriced_count}`; filter `created_at >= p_from AND created_at < p_to AND request_type IN ('llm_complete','embedding','eval')`; `GROUP BY tenant_id, request_type, model_name`; SUM dengan `COALESCE(...,0)`; `cost_usd` = `SUM(cost_usd)` (NULL diabaikan); `error_count` = `COUNT(*) FILTER (WHERE status='error')`; `unpriced_count` = `COUNT(*) FILTER (WHERE cost_usd IS NULL AND status='success')`; `COALESCE(jsonb_agg(...), '[]'::jsonb)`.
  - `ai_usage_daily(p_from TIMESTAMPTZ, p_to TIMESTAMPTZ, p_tz TEXT) RETURNS JSONB` — array `{date: 'YYYY-MM-DD', total_tokens, cost_usd, request_count}` dengan `(created_at AT TIME ZONE p_tz)::date`, urut tanggal, filter request_type sama.
  - `ai_usage_oldest() RETURNS TIMESTAMPTZ` — `MIN(created_at)` dari `ai_trace_logs`.
  - Ketiga fungsi baru: `LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public`; `REVOKE ALL ... FROM PUBLIC, anon, authenticated; GRANT EXECUTE ... TO service_role`.

- [ ] **Step 1:** Tulis `migrations/006_ai_usage_billing.sql` sesuai Interfaces (idempoten: `CREATE OR REPLACE`), header komentar mengikuti gaya 003.
- [ ] **Step 2:** Samakan `schema.sql` dan update README (`Auto-purge log > 28 hari` → "isi percakapan di-scrub > 28 hari, metrik disimpan 400 hari").
- [ ] **Step 3: Verifikasi (butuh user — Supabase SQL editor, DB non-production dulu):** jalankan 006, lalu
  `SELECT jsonb_array_length(ai_usage_by_tenant(now() - interval '7 days', now()));` → angka ≥ 0, tanpa error;
  `SELECT ai_usage_daily(now() - interval '7 days', now(), 'Asia/Jakarta');` → array JSON;
  `SELECT ai_usage_oldest();` → timestamp atau NULL.
  Bandingkan `SUM(total_tokens)` hasil fungsi dengan `SELECT SUM(total_tokens) FROM ai_trace_logs WHERE request_type IN ('llm_complete','embedding','eval') AND created_at >= now() - interval '7 days'` → sama.
- [ ] **Step 4: Commit**
  ```bash
  git add migrations/006_ai_usage_billing.sql migrations/README.md schema.sql README.md
  git commit -m "feat(observability): 400-day metric retention and SQL usage aggregation for billing"
  ```

### Task 2: Lib billing murni (periode & perakitan respons)

**Files:**
- Create: `observability/billing.py`
- Modify: `config/settings.py` (field `BILLING_TIMEZONE: str = "Asia/Jakarta"`), `pyproject.toml` (pastikan `tzdata` ada di dependencies — Windows & image slim tidak punya zona sistem)
- Test: `tests/unit/test_billing.py`

**Interfaces:**
- Produces:
  - `MAX_BILLING_DAYS = 400`
  - `class BillingPeriodError(ValueError)`
  - `resolve_period(date_from: str, date_to: str, tz: str) -> tuple[datetime, datetime]` — UTC-aware `[start, end)`; raise `BillingPeriodError` untuk format salah, `from > to`, rentang > 400 hari (inklusif), tz tidak valid (`ZoneInfoNotFoundError`).
  - `build_usage_response(rows: list[dict], daily: list[dict], oldest: str | None, period: dict) -> dict` — bentuk persis seperti spec §5.1 (`period, totals, tenants[{tenant_id, …totals fields, by_type, by_model}], by_day, unpriced_models, retention{metrics_days: 400, oldest_available}`); `total_tokens = input + output`; `cost_usd` dibulatkan 6 desimal; `tenants` urut `cost_usd` desc lalu `total_tokens` desc; `unpriced_models` = nama model unik dengan `unpriced_count > 0`, urut.

- [ ] **Step 1: Tulis test yang gagal**
  ```python
  def test_resolve_period_jakarta_month():
      s, e = resolve_period("2026-11-01", "2026-11-30", "Asia/Jakarta")
      assert s == datetime(2026, 10, 31, 17, 0, tzinfo=timezone.utc)
      assert e == datetime(2026, 11, 30, 17, 0, tzinfo=timezone.utc)

  def test_resolve_period_crosses_year():
      s, e = resolve_period("2026-12-15", "2027-01-14", "UTC")
      assert (e - s).days == 31

  @pytest.mark.parametrize("f,t,tz", [
      ("2026-11-30", "2026-11-01", "UTC"),   # terbalik
      ("2025-01-01", "2026-02-05", "UTC"),   # > 400 hari
      ("2026-11-01", "2026-11-30", "Mars/Base"),
      ("01-11-2026", "2026-11-30", "UTC"),
  ])
  def test_resolve_period_rejects(f, t, tz):
      with pytest.raises(BillingPeriodError):
          resolve_period(f, t, tz)

  def test_resolve_period_accepts_exactly_400_days():
      resolve_period("2025-10-16", "2026-11-19", "UTC")  # 400 hari inklusif

  def test_build_usage_response_totals_equal_sum_of_tenants():
      rows = [
          {"tenant_id": "t1", "request_type": "llm_complete", "model_name": "gpt-4o-mini",
           "input_tokens": 100, "cached_input_tokens": 10, "output_tokens": 50, "cost_usd": 0.0001234567,
           "request_count": 3, "error_count": 1, "unpriced_count": 0},
          {"tenant_id": "t1", "request_type": "embedding", "model_name": "text-embedding-3-small",
           "input_tokens": 40, "cached_input_tokens": 0, "output_tokens": 0, "cost_usd": None,
           "request_count": 2, "error_count": 0, "unpriced_count": 2},
          {"tenant_id": None, "request_type": "eval", "model_name": "gpt-4o",
           "input_tokens": 5, "cached_input_tokens": 0, "output_tokens": 5, "cost_usd": 0.5,
           "request_count": 1, "error_count": 0, "unpriced_count": 0},
      ]
      r = build_usage_response(rows, [], None, {"from": "2026-11-01", "to": "2026-11-30", "tz": "UTC"})
      assert r["totals"]["total_tokens"] == 200
      assert r["totals"]["request_count"] == 6
      assert r["totals"]["cost_usd"] == pytest.approx(0.500123, abs=1e-6)
      assert sum(t["total_tokens"] for t in r["tenants"]) == r["totals"]["total_tokens"]
      assert [t["tenant_id"] for t in r["tenants"]] == [None, "t1"]       # urut biaya desc
      t1 = r["tenants"][1]
      assert {b["request_type"] for b in t1["by_type"]} == {"llm_complete", "embedding"}
      assert r["unpriced_models"] == ["text-embedding-3-small"]
      assert r["retention"] == {"metrics_days": 400, "oldest_available": None}

  def test_build_usage_response_empty():
      r = build_usage_response([], [], None, {"from": "2026-11-01", "to": "2026-11-01", "tz": "UTC"})
      assert r["tenants"] == [] and r["totals"]["total_tokens"] == 0 and r["by_day"] == []
  ```
- [ ] **Step 2:** `.venv/Scripts/python -m pytest tests/unit/test_billing.py -v` → FAIL (`ModuleNotFoundError: observability.billing`).
- [ ] **Step 3:** Implementasi `observability/billing.py` sesuai Interfaces; tambah `BILLING_TIMEZONE` ke `Settings`; cek/ tambah `tzdata` di `pyproject.toml`.
- [ ] **Step 4:** Ulangi Step 2 → PASS.
- [ ] **Step 5: Commit** — `git add observability/billing.py tests/unit/test_billing.py config/settings.py pyproject.toml` · `feat(observability): billing period resolution and usage response builder`

### Task 3: Endpoint `GET /api/v1/observability/usage-by-tenant`

**Files:**
- Modify: `api/observability.py` (tambah endpoint; endpoint lama tidak diubah)
- Test: `tests/unit/test_usage_by_tenant_api.py`

**Interfaces:**
- Consumes: `resolve_period`, `build_usage_response`, `BillingPeriodError` (Task 2); RPC `ai_usage_by_tenant`, `ai_usage_daily`, `ai_usage_oldest` (Task 1).
- Produces: `GET {API_V1_PREFIX}/observability/usage-by-tenant?from=YYYY-MM-DD&to=YYYY-MM-DD[&tz=…]` → JSON dari `build_usage_response`; 422 untuk `BillingPeriodError` (`detail` = pesan); 502 `{"detail": "usage aggregation failed"}` bila RPC melempar exception. Supabase client didapat via `client = Depends(get_supabase)` supaya bisa di-override di test. Query param bernama `from` → `Query(..., alias="from")`.

- [ ] **Step 1: Tulis test yang gagal** — `main.app` + `app.dependency_overrides[get_supabase]` ke fake client yang `rpc(name, params).execute()` mengembalikan objek dengan `.data`; header `AUTH_HEADERS` dari `tests/conftest.py`.
  - `test_requires_internal_key`: tanpa header → 401.
  - `test_returns_aggregated_usage`: fake `ai_usage_by_tenant` → 1 baris t1, `ai_usage_daily` → `[{"date":"2026-11-01","total_tokens":150,"cost_usd":0.1,"request_count":3}]`, `ai_usage_oldest` → `"2026-10-22T00:00:00+00:00"`; assert 200, `body["tenants"][0]["tenant_id"] == "t1"`, `body["by_day"][0]["date"] == "2026-11-01"`, `body["retention"]["oldest_available"].startswith("2026-10-22")`; assert RPC dipanggil dengan `p_from == "2026-10-31T17:00:00+00:00"` untuk `from=2026-11-01&tz=Asia/Jakarta`, dan `ai_usage_daily` menerima `p_tz == "Asia/Jakarta"`.
  - `test_default_tz_from_settings`: tanpa `tz` → `body["period"]["tz"] == get_settings().BILLING_TIMEZONE`.
  - `test_rejects_bad_period`: `from=2026-11-30&to=2026-11-01` → 422.
  - `test_rpc_failure_returns_502`: fake `rpc` melempar `RuntimeError` → 502, body tidak berisi pesan exception mentah.
  - `test_never_returns_conversation_fields`: `json.dumps(body)` tidak mengandung `user_message`, `llm_response`, `llm_prompt`.
- [ ] **Step 2:** `.venv/Scripts/python -m pytest tests/unit/test_usage_by_tenant_api.py -v` → FAIL (404).
- [ ] **Step 3:** Implementasi endpoint (tiga RPC dipanggil berurutan atau `asyncio.gather`; `.data` dari RPC `jsonb` adalah list/str — normalisasi `None` → `[]`).
- [ ] **Step 4:** Ulangi Step 2 → PASS; lalu seluruh unit suite `.venv/Scripts/python -m pytest tests/unit -q` → semua PASS (tidak ada regresi).
- [ ] **Step 5: Commit** — `git add api/observability.py tests/unit/test_usage_by_tenant_api.py` · `feat(observability): usage-by-tenant endpoint for billing dashboard`

---

## Bagian B — `agent-ai-komunikasi-crm`

### Task 4: Lib murni `src/lib/admin-billing.ts`

**Files:**
- Create: `src/lib/admin-billing.ts`
- Test: `tests/api/admin-billing.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export const MAX_BILLING_DAYS = 400;
  export const billingTimezone = (): string => process.env.BILLING_TIMEZONE || 'Asia/Jakarta';
  export type BillingPeriod = { from: string; to: string; tz: string; start: Date; end: Date }; // [start,end) UTC
  export class BillingPeriodError extends Error {}
  export function resolvePeriod(from: string | null, to: string | null, tz: string, now?: Date): BillingPeriod;
  //   from & to null → bulan berjalan di tz (1..hari terakhir bulan). Satu saja null → BillingPeriodError.
  export function presetPeriod(preset: 'this_month' | 'last_month', tz: string, now?: Date): { from: string; to: string };
  export function zonedMidnightToUtc(date: string, tz: string): Date;   // 00:00 lokal tz → instant UTC via Intl offset
  export type ProxyTenantUsage = { tenant_id: string | null; input_tokens: number; cached_input_tokens: number;
    output_tokens: number; total_tokens: number; cost_usd: number; request_count: number; error_count: number;
    unpriced_count: number; by_type: Array<{ request_type: string; total_tokens: number; cost_usd: number; request_count: number }>;
    by_model: Array<{ model_name: string; total_tokens: number; cost_usd: number }> };
  export type TenantAi = { totalTokens: number; inputTokens: number; cachedInputTokens: number; outputTokens: number;
    costUsd: number; requests: number; errors: number; byType: ProxyTenantUsage['by_type']; byModel: ProxyTenantUsage['by_model'] };
  export type TenantRow = { id: string | null; name: string; plan: string | null; aiEnabled: boolean | null; createdAt: string | null;
    lastActivityAt: string | null; staff: { total: number; active: number; byRole: Record<string, number> };
    endUsers: { activeInPeriod: number; storedProfiles: number; newProfilesInPeriod: number };
    activity: { sessions: number; messages: number; handoffs: number }; ai: TenantAi | null; known: boolean };
  export function mergeTenantUsage(crmRows: TenantRow[], usage: ProxyTenantUsage[] | null): TenantRow[];
  //   usage null → setiap row.ai = null. Tenant CRM tanpa usage → ai berisi nol. usage tanpa tenant CRM →
  //   row baru known:false, name `Tenant tidak dikenal (${id.slice(0,8)})` atau 'Tanpa tenant' bila id null, angka CRM 0.
  export function needsRetentionWarning(period: BillingPeriod, oldestAvailable: string | null): boolean;
  //   true bila oldestAvailable != null && new Date(oldestAvailable) > period.start
  export function buildBillingCsv(rows: TenantRow[], period: Pick<BillingPeriod, 'from' | 'to'>): string;
  export function billingCsvFilename(period: Pick<BillingPeriod, 'from' | 'to'>): string; // billing_<from>_<to>.csv
  ```

- [ ] **Step 1: Tulis test yang gagal** (vitest, tanpa mock):
  - `resolvePeriod(null, null, 'Asia/Jakarta', new Date('2026-11-19T20:00:00Z'))` → `from '2026-11-01'`, `to '2026-11-30'`, `start.toISOString() === '2026-10-31T17:00:00.000Z'`, `end.toISOString() === '2026-11-30T17:00:00.000Z'`.
  - Batas hari: `resolvePeriod(null, null, 'Asia/Jakarta', new Date('2026-11-30T17:30:00Z'))` → `from '2026-12-01'` (sudah tanggal 1 Desember di Jakarta).
  - `presetPeriod('last_month', 'Asia/Jakarta', new Date('2026-03-10T00:00:00Z'))` → `{ from: '2026-02-01', to: '2026-02-28' }`; `presetPeriod('last_month','UTC', new Date('2026-01-05T00:00:00Z'))` → `{ from: '2025-12-01', to: '2025-12-31' }`.
  - `resolvePeriod` melempar `BillingPeriodError` untuk: `('2026-11-30','2026-11-01')`, `('2025-01-01','2026-02-05')`, `('2026-11-01', null)`, `('2026/11/01','2026-11-30')`, tz `'Mars/Base'`. Menerima tepat 400 hari `('2025-10-16','2026-11-19')`.
  - `mergeTenantUsage`: (a) usage `null` → semua `ai === null`; (b) tenant CRM `A` tanpa usage → `ai.totalTokens === 0`; (c) usage `tenant_id: 'zzzzzzzz-1111'` tak dikenal → row `known:false`, `name === 'Tenant tidak dikenal (zzzzzzzz)'`; usage `tenant_id: null` → `name === 'Tanpa tenant'`; (d) jumlah `ai.totalTokens` semua row === jumlah `total_tokens` usage.
  - `needsRetentionWarning`: oldest setelah start → true; sebelum → false; null → false.
  - `buildBillingCsv`: baris header persis sesuai Global Constraints; tenant bernama `Acme, "Intl"\nLtd` → sel `"Acme, ""Intl""\nLtd"`; `cost_usd` `0.1` → `0.100000`; row `ai === null` → kolom token & biaya kosong (bukan 0); line ending `\r\n`.
  - `billingCsvFilename({from:'2026-11-01',to:'2026-11-30'}) === 'billing_2026-11-01_2026-11-30.csv'`.
- [ ] **Step 2:** `npx vitest run tests/api/admin-billing.test.ts` → FAIL (module not found).
- [ ] **Step 3:** Implementasi. `zonedMidnightToUtc`: ambil tebakan `Date.UTC(y,m,d)`, hitung offset tz pada instant itu dengan `Intl.DateTimeFormat('en-US',{timeZone,hourCycle:'h23',year,month,day,hour,minute,second})`, kurangi offset; ulangi sekali untuk zona DST. Tz invalid → `RangeError` dari Intl → bungkus jadi `BillingPeriodError`.
- [ ] **Step 4:** Ulangi Step 2 → PASS.
- [ ] **Step 5: Commit** — `git add src/lib/admin-billing.ts tests/api/admin-billing.test.ts` · `feat(admin): billing period, usage merge and CSV helpers`

### Task 5: Query Prisma + route `GET /api/admin/overview`

**Files:**
- Create: `src/lib/admin-stats.ts`, `src/app/api/admin/overview/route.ts`
- Test: `tests/api/admin-overview.test.ts`

**Interfaces:**
- Consumes: Task 4 (`resolvePeriod`, `billingTimezone`, `mergeTenantUsage`, `BillingPeriodError`, types); `requireUser` (`src/lib/api-guard.ts`); `agentProxyFetch` (`src/lib/agent-proxy-client.ts`); proxy endpoint Task 3.
- Produces:
  - `getAdminStats(period: BillingPeriod): Promise<{ platform: PlatformStats; tenants: TenantRow[] }>` di `src/lib/admin-stats.ts`, `PlatformStats` = bentuk `platform` di spec §5.2 (`tenants{total,byPlan,aiEnabled}`, `staff{total,active,byRole,newInPeriod,loggedInPeriod}`, `endUsers{activeInPeriod,storedProfiles,newProfilesInPeriod,hotLeads}`, `activity{sessions,sessionsByChannel,handoffs,messages,messagesBySender}`). Semua `TenantRow.ai = null` (diisi di route).
    - Pengguna aktif per tenant (berbasis pesan, bukan `ChatSession.createdAt`): `$queryRaw` `SELECT s."tenantId", COUNT(DISTINCT s."contactId")::int AS n FROM "crm_agent_Message" m JOIN "crm_agent_ChatSession" s ON s."id" = m."sessionId" WHERE m."createdAt" >= ${start} AND m."createdAt" < ${end} AND m."senderType" = 'user' GROUP BY s."tenantId"`; total platform = `COUNT(DISTINCT (s."tenantId", s."contactId"))`. Sesi/handoff = `COUNT(DISTINCT m."sessionId")` pada join yang sama; aktivitas terakhir = `MAX(m."createdAt")` sepanjang waktu.
    - Pesan per tenant & sender: `$queryRaw` join `crm_agent_Message` m → `crm_agent_ChatSession` s, `GROUP BY s."tenantId", m."senderType"`, filter `m."createdAt"` dalam periode.
    - Handoff = sesi dalam periode dengan `handoffRequested = true`. `lastActivityAt` = `chatSession.groupBy({ by:['tenantId'], _max:{ updatedAt:true } })` (tanpa filter periode).
    - Hot leads = `visitorProfile.count({ where: { leadClassification: 'hot_lead' } })`.
    - Staf: `user.groupBy({ by: ['tenantId','role','isActive'], _count: true })`; staf tanpa tenant (SUPER_ADMIN) hanya masuk total platform.
  - `GET /api/admin/overview?from&to` → `{ period:{from,to,tz}, platform, ai, tenants }`; `ai` = `{ status:'ok', totals, byDay, unpricedModels, oldestAvailable }` atau `{ status:'unavailable', error }`. 400 `{ error }` untuk `BillingPeriodError`. Proxy dipanggil `agentProxyFetch('/api/v1/observability/usage-by-tenant?from=…&to=…&tz=…', { signal: AbortSignal.timeout(15000), cache: 'no-store' })`. `tenants` diurutkan `ai.costUsd` desc (null terakhir), lalu nama.

- [ ] **Step 1: Tulis test yang gagal** — mock `@/auth`, `@/lib/prisma` (`tenant.findMany`, `user.groupBy/count`, `visitorProfile.groupBy/count`, `chatSession.groupBy/count`, `$queryRaw`), dan `global.fetch` (`vi.stubGlobal`), pola seperti `tests/api/tenant-isolation.test.ts`.
  - `rejects anonymous` → 401; `rejects BUSINESS_PARTNER` dan `AGENT` → 403; Prisma tidak dipanggil.
  - `rejects bad period` `?from=2026-11-30&to=2026-11-01` → 400.
  - `merges proxy usage`: 2 tenant CRM + proxy mengembalikan usage untuk tenant 1 dan `tenant_id` tak dikenal → `tenants.length === 3`, `ai.status === 'ok'`, jumlah `tenants[].ai.totalTokens` === `ai.totals.total_tokens`; URL fetch mengandung `from=2026-11-01&to=2026-11-30&tz=Asia%2FJakarta`.
  - `proxy down`: fetch reject → 200, `ai.status === 'unavailable'`, setiap `tenants[i].ai === null`, `platform.staff.total` tetap terisi.
  - `proxy timeout`: fetch reject dengan `DOMException('…','TimeoutError')` → sama dengan proxy down.
  - `proxy non-2xx`: `status: 502` → `ai.status === 'unavailable'`.
  - `does not load whole tables`: `prismaMock.chatSession.findMany` dan `prismaMock.message.findMany` tidak didefinisikan / tidak dipanggil.
- [ ] **Step 2:** `npx vitest run tests/api/admin-overview.test.ts` → FAIL.
- [ ] **Step 3:** Implementasi `src/lib/admin-stats.ts` lalu route (`export const dynamic = 'force-dynamic'`). Log error proxy dengan `console.error('[admin/overview] proxy', …)`; `error` di response berisi pesan generik, bukan stack.
- [ ] **Step 4:** Ulangi Step 2 → PASS; `npm run test:api` → semua PASS; `npm run type-check` → tanpa error baru di file yang dibuat.
- [ ] **Step 5: Commit** — `git add src/lib/admin-stats.ts src/app/api/admin/overview/route.ts tests/api/admin-overview.test.ts` · `feat(admin): super-admin billing overview API`

### Task 6: Halaman `/admin`, komponen, sidebar, i18n

**Files:**
- Create: `src/app/[lang]/(dashboard)/admin/page.tsx`, `src/components/admin/AdminSummaryCards.tsx`, `src/components/admin/UsageTrendChart.tsx`, `src/components/admin/TenantBillingTable.tsx`, `src/components/admin/PeriodPicker.tsx`
- Modify: `src/app/[lang]/(dashboard)/layout.tsx` (item nav), `src/dictionaries/{en,id,ko,th,zh}.json` (`sidebar.admin` + namespace `admin`), `.env.example` & `.env.production.example` (`BILLING_TIMEZONE=Asia/Jakarta`) — **cek dulu `git diff .env.production.example`; file itu sudah dimodifikasi user, tambahkan baris saja dan stage dengan `git add -p` hanya hunk ini**.

**Interfaces:**
- Consumes: response `/api/admin/overview` (Task 5); `presetPeriod`, `buildBillingCsv`, `billingCsvFilename`, `needsRetentionWarning`, types (Task 4) — `admin-billing.ts` harus bebas import server-only agar bisa dipakai di client component.
- Produces:
  - Nav item `{ href: '/admin', labelKey: 'admin', icon: ShieldCheck, superAdminOnly: true }` — `NAV_ITEMS` difilter dengan `session.user.role === 'SUPER_ADMIN'`.
  - `page.tsx` ('use client'): role bukan SUPER_ADMIN → panel "403 — khusus Super Admin" tanpa fetch. State `period` (default `presetPeriod('this_month', tz)` dengan tz = `period.tz` dari respons pertama; awalnya request tanpa query → server menentukan default). Fetch ulang saat periode berubah; loading skeleton; error 4xx/5xx → banner error dengan tombol "Coba lagi".
  - `PeriodPicker` props `{ value: {from,to}; tz: string; onChange(v) }` — opsi Bulan ini / Bulan lalu / Kustom (dua `<input type="date">`, tombol Terapkan nonaktif bila `from > to`).
  - `AdminSummaryCards` props `{ platform; ai }` — 5 kartu sesuai sketsa spec §5.2; nilai token/biaya `ai.status !== 'ok'` → "—".
  - `UsageTrendChart` props `{ byDay: Array<{date,total_tokens,cost_usd,request_count}> }` — bar CSS per hari (tinggi relatif ke maks), tooltip `title` berisi tanggal, token, biaya; kosong → teks "Belum ada pemakaian AI di periode ini".
  - `TenantBillingTable` props `{ tenants: TenantRow[] }` — pencarian nama (case-insensitive), urut by `costUsd|totalTokens|activeInPeriod|name` (klik header), baris bisa diperluas (byType, byModel, staf per role), baris TOTAL di bawah, baris `known:false` dengan badge abu-abu.
  - Banner: `needsRetentionWarning` → "Data token tersedia sejak <tanggal>"; `ai.status==='unavailable'` → "Layanan AI tidak dapat dihubungi — angka token tidak tersedia" dan tombol CSV nonaktif; `unpricedModels.length` → "N model tanpa harga (biaya belum termasuk): …".
  - Tombol CSV: `Blob` + `URL.createObjectURL` + `<a download={billingCsvFilename(period)}>`, BOM `\uFEFF` di depan agar Excel membaca UTF-8.
  - Format angka: `Intl.NumberFormat(locale, { notation: 'compact' })` untuk token; biaya `$` 2 desimal di UI (CSV tetap 6).

- [ ] **Step 1:** Tambah key i18n (`sidebar.admin` = "Admin"; namespace `admin`: `title, subtitle, periodThisMonth, periodLastMonth, periodCustom, apply, exportCsv, cardTenants, cardStaff, cardEndUsers, cardTokens, cardCost, trendTitle, trendEmpty, searchPlaceholder, colTenant, colPlan, colStaff, colActiveUsers, colSessions, colMessages, colTokens, colCost, colLastActivity, total, unknownTenant, noTenant, warnRetention, warnAiUnavailable, warnUnpriced, forbidden, retry`). Verifikasi: `node -e "for (const l of ['en','id','ko','th','zh']) JSON.parse(require('fs').readFileSync('src/dictionaries/'+l+'.json','utf8'))"` → tanpa error.
- [ ] **Step 2:** Tambah nav item + filter role di `layout.tsx`.
- [ ] **Step 3:** Buat komponen & halaman sesuai Interfaces.
- [ ] **Step 4:** `npm run type-check` dan `npm run lint` → tanpa error baru di file yang disentuh.
- [ ] **Step 5: Verifikasi manual di app** (`npm run dev`, proxy jalan dengan migration 006):
  - login SUPER_ADMIN → menu "Admin" terlihat, `/id/admin` menampilkan kartu, tren, tabel; total tabel = kartu Total token;
  - ganti ke Bulan lalu dan rentang kustom → angka berubah, URL fetch berisi `from/to`;
  - matikan proxy → banner "Layanan AI tidak dapat dihubungi", token "—", CSV nonaktif, kartu staf/pengguna tetap terisi;
  - Export CSV → file `billing_<from>_<to>.csv` terbuka benar di Excel;
  - login BUSINESS_PARTNER → menu Admin tidak ada; buka `/id/admin` langsung → panel 403; `curl` `/api/admin/overview` dengan cookie BP → 403.
- [ ] **Step 6: Commit** — `git add src/app/[lang]/(dashboard)/admin src/components/admin src/app/[lang]/(dashboard)/layout.tsx src/dictionaries .env.example` (+ hunk `.env.production.example` via `git add -p`) · `feat(admin): super-admin billing dashboard page`

### Task 7: Dokumentasi & penutup

**Files:**
- Modify: `specs/002-ai-token-cost-monitoring/tasks.md` (centang T022 sebagian, T023, T051, T064; tambahkan catatan "lihat docs/superpowers/specs/2026-11-19-admin-billing-dashboard-design.md"), `docs/installation.md` (env `BILLING_TIMEZONE` + langkah jalankan migration 006 di Supabase **sebelum** purge berikutnya)

- [ ] **Step 1:** Update dua file di atas.
- [ ] **Step 2:** Verifikasi akhir: proxy `.venv/Scripts/python -m pytest tests/unit -q` → PASS; CRM `npm run test:api` → PASS; `npm run build` → sukses.
- [ ] **Step 3: Commit** — `git add specs/002-ai-token-cost-monitoring/tasks.md docs/installation.md docs/superpowers` · `docs: admin billing dashboard spec, plan and setup notes`
