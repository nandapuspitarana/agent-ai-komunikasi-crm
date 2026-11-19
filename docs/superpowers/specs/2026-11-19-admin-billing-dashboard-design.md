# Desain — Dashboard Admin Penagihan (Super Admin, lintas tenant)

> Tanggal: 2026-11-19 · Repo: `agent-ai-komunikasi-crm` (Next.js) + `ai-agent-proxy` (FastAPI/Supabase)
> Terkait: `specs/002-ai-token-cost-monitoring/tasks.md` (menyentuh T020, T022, T023, T051, T064)

## 1. Tujuan & alasan

Super Admin perlu memantau **semua tenant** untuk **penagihan**: per tenant, berapa akun staf,
berapa pengguna akhir, seberapa aktif, dan berapa token/biaya AI yang dipakai dalam satu periode
tagihan. Karena dipakai untuk menagih, angka harus **akurat dan lengkap** untuk periode yang dipilih —
angka yang terpotong atau "0 karena error" lebih buruk daripada tidak ada angka.

## 2. Sasaran, bukan sasaran, anti-sasaran

**Sasaran**
- Halaman `/admin` khusus `SUPER_ADMIN`: ringkasan platform + tabel per tenant + tren harian.
- Token & biaya per tenant untuk periode bebas (bulan ini, bulan lalu, rentang kustom), tanpa batas 5000 baris.
- Export CSV per tenant untuk bahan invoice.

**Bukan sasaran (tahap berikutnya)**
- Budget/alert per tenant (spec 002 Fase 4), rekonsiliasi tagihan OpenAI (Fase 3), tabel rollup harian (T021), konversi IDR, pembuatan invoice otomatis.
- Mengubah tab "AI Cost & Tokens" yang sudah ada di `/dashboard`.

**Anti-sasaran (gagal walau "jalan")**
- Menampilkan token/biaya **0** ketika proxy tidak bisa dihubungi atau datanya tidak lengkap.
- Total per tenant yang tidak sama dengan total platform (token dari `tenant_id` yang tidak dikenal hilang diam-diam).
- Data percakapan (`user_message`, `llm_response`, prompt) muncul di halaman ini atau tersimpan lebih lama dari 28 hari.
- Role selain `SUPER_ADMIN` bisa membuka halaman atau API-nya.

## 3. Kendala yang ditemukan di kode

1. `GET /api/v1/observability/dashboard` (proxy) memuat maks **5000 baris** lalu menjumlah di Python, dan `days ≤ 28` → tidak bisa dipakai untuk tagihan.
2. `ai_trace_logs` punya **retensi 28 hari**: `purge_old_trace_logs()` (migration 003, dijalankan pg_cron / `TraceRepository.purge_old`) **menghapus seluruh baris**, termasuk token & `cost_usd`. Tagihan bulan lalu akan hilang sebagian.
3. `by_tenant` dari proxy hanya berisi `tenant_id` (TEXT), nama tenant ada di DB CRM (Prisma `Tenant`).
4. `VisitorProfile` juga dibersihkan per tenant (`cleanUpStaleVisitors`, `visitorConfig.retentionDays`) → jumlah profil = "yang masih tersimpan", bukan "pernah ada".
5. `/api/dashboard/stats` memuat semua `ChatSession` ke memori — pola ini **tidak** dipakai di dashboard baru.
6. API route tidak dilindungi `src/middleware.ts`; tiap route wajib memakai `requireUser()` dari `src/lib/api-guard.ts`.

## 4. Pendekatan yang dipertimbangkan

| | Pendekatan | Trade-off |
|---|---|---|
| A | CRM saja, pakai endpoint proxy yang ada | Cepat, tapi maks 28 hari & bisa terpotong 5000 baris → tidak layak untuk tagihan |
| **B ✅** | **CRM + endpoint agregasi SQL baru di proxy** | Akurat, periode bebas, dua repo + 1 migration |
| C | B + rollup harian (cron) + budget/alert | Paling lengkap, banyak komponen baru; cocok jadi tahap berikutnya |

**Dipilih: B** (oleh pengguna), karena satu-satunya yang memberi angka tagihan benar tanpa infrastruktur baru.

Sub-keputusan retensi (keputusan saya, bisa dikoreksi): agar data tagihan tidak hilang tanpa tabel rollup,
**purge 28 hari diubah menjadi "kosongkan isi percakapan"** (bukan hapus baris), dan baris metrik
disimpan **400 hari** (cukup untuk tagihan bulanan + perbandingan tahunan). Alternatif rollup harian (T021) ditunda;
agregasi langsung di `ai_trace_logs` dengan index yang ada cukup untuk volume saat ini.

## 5. Desain

### 5.1 Proxy (`ai-agent-proxy`)

**Migration `006_ai_usage_billing.sql`**
- Ganti `purge_old_trace_logs()`:
  - baris `created_at < now() - 28 days` → set `user_message`, `llm_prompt`, `llm_response`, `rag_similarity_scores`, `rag_sources`, `eval_notes` ke `NULL` (hanya yang belum NULL);
  - baris `created_at < now() - 400 days` → `DELETE`.
  - Nama & signature fungsi tetap (dipanggil pg_cron dan `TraceRepository.purge_old`). Perbarui komentar migration 003/README.
- Fungsi `ai_usage_by_tenant(p_from timestamptz, p_to timestamptz)` (`p_to` eksklusif), `SECURITY DEFINER`, hanya `service_role`:
  - Hanya `request_type IN ('llm_complete','embedding','eval')` (aturan anti-double-count T005).
  - `GROUP BY tenant_id, request_type, model_name` → `input_tokens`, `cached_input_tokens`, `output_tokens`,
    `cost_usd` (SUM), `request_count`, `error_count` (`status='error'`), `unpriced_count` (`cost_usd IS NULL AND status='success'`).
  - `tenant_id` NULL dikembalikan apa adanya (ditampilkan sebagai "tanpa tenant").
- Fungsi `ai_usage_daily(p_from, p_to, p_tz text)` → total platform per hari (`date` di zona `p_tz`): `tokens`, `cost_usd`, `request_count`.
- Index: `idx_trace_tenant (tenant_id, created_at)` dan `idx_trace_created_at` sudah ada — tidak perlu index baru.

**Endpoint `GET /api/v1/observability/usage-by-tenant`**
- Di `api/observability.py`, otomatis di bawah `verify_internal_key` (router sudah memakai `AUTH`).
- Query: `from=YYYY-MM-DD`, `to=YYYY-MM-DD` (inklusif, tanggal kalender), `tz` (default env `BILLING_TIMEZONE`, default `Asia/Jakarta`).
  Rentang dikonversi ke `[from 00:00 tz, to+1 00:00 tz)`. Validasi: `from ≤ to`, maks 400 hari, `tz` harus nama zona IANA valid → 422.
- Response:
  ```json
  {
    "period": {"from": "2026-11-01", "to": "2026-11-30", "tz": "Asia/Jakarta"},
    "totals": {"input_tokens": 0, "cached_input_tokens": 0, "output_tokens": 0, "total_tokens": 0,
               "cost_usd": 0.0, "request_count": 0, "error_count": 0, "unpriced_count": 0},
    "tenants": [{"tenant_id": "…", "…same fields as totals…",
                 "by_type":  [{"request_type": "llm_complete", "total_tokens": 0, "cost_usd": 0.0, "request_count": 0}],
                 "by_model": [{"model_name": "gpt-4o-mini", "total_tokens": 0, "cost_usd": 0.0}]}],
    "by_day": [{"date": "2026-11-01", "total_tokens": 0, "cost_usd": 0.0, "request_count": 0}],
    "unpriced_models": ["…"],
    "retention": {"metrics_days": 400, "oldest_available": "2026-10-22T…Z"}
  }
  ```
  `oldest_available` = `MIN(created_at)` — dipakai CRM untuk memberi peringatan bila periode dimulai sebelum data tersedia.
- `cost_usd` dibulatkan 6 desimal di proxy (pembulatan tampilan dilakukan di CRM).
- Tidak pernah mengembalikan isi percakapan.

**Test proxy** (`tests/unit/test_usage_by_tenant.py`): validasi parameter (urutan tanggal, >400 hari, tz invalid), konversi rentang tz, perakitan response dari baris RPC yang di-mock (totals = jumlah tenants, `tenant_id` NULL), dan endpoint menolak tanpa internal key.

### 5.2 CRM (`agent-ai-komunikasi-crm`)

**API `GET /api/admin/overview?from=YYYY-MM-DD&to=YYYY-MM-DD`** — `src/app/api/admin/overview/route.ts`
- `requireUser({ roles: ['SUPER_ADMIN'], requireTenant: false })`; selain itu 401/403.
- Default periode: bulan berjalan di `BILLING_TIMEZONE`. Validasi sama dengan proxy (pesan error 400).
- Data dari Prisma, **pakai `count`/`groupBy`, tidak memuat seluruh baris**:
  - Tenant: `id, name, subscription, aiEnabled, createdAt`.
  - Akun staf: `user.groupBy([tenantId, role, isActive])`; staf baru dalam periode (`createdAt`); staf login dalam periode (`lastLoginAt`).
  - Pengguna akhir:
    - **Pengguna aktif dalam periode** = jumlah `contactId` unik dari `ChatSession` yang `createdAt` dalam periode, per tenant (metrik utama untuk tagihan; tidak terpengaruh pembersihan VisitorProfile). Pakai `groupBy([tenantId, contactId])` lalu hitung, atau `$queryRaw` `COUNT(DISTINCT …)` bila lebih efisien.
    - Profil pengunjung tersimpan = `visitorProfile.groupBy(tenantId)`; profil baru dalam periode; jumlah `hot_lead`.
  - Aktivitas: sesi chat dalam periode per tenant & per `channel` (`widget`, `whatsapp`, …); pesan dalam periode per tenant per `senderType` (`user`, `bot`, `agent`) via relasi `session.tenantId`; sesi yang di-handoff ke agen.
  - Aktivitas terakhir per tenant = `MAX(ChatSession.updatedAt)`.
- Data token: panggil proxy `usage-by-tenant` dengan `agentProxyUrl()` + `agentProxyHeaders()` (sama seperti `/api/dashboard/ai-cost`), timeout 15 detik.
  - Gabungkan per `tenant_id`. Tenant CRM tanpa pemakaian → token 0 (itu nilai sebenarnya). `tenant_id` dari proxy yang tidak ada di CRM → baris "Tenant tidak dikenal (`id`)", NULL → "Tanpa tenant", supaya total per tenant = total platform.
  - Proxy gagal/timeout → `ai: { status: "unavailable", error }` dan semua field token tenant = `null` (bukan 0). Bagian Prisma tetap dikembalikan.
- Bentuk response:
  ```ts
  {
    period: { from, to, tz },
    platform: { tenants: { total, byPlan: Record<string, number>, aiEnabled },
                staff: { total, active, byRole, newInPeriod, loggedInPeriod },
                endUsers: { activeInPeriod, storedProfiles, newProfilesInPeriod, hotLeads },
                activity: { sessions, sessionsByChannel, handoffs, messages, messagesBySender } },
    ai: { status: "ok" | "unavailable", error?, totals?, byDay?, unpricedModels?, oldestAvailable? },
    tenants: Array<{ id, name, plan, aiEnabled, createdAt, lastActivityAt,
                     staff: { total, active, byRole }, endUsers: { activeInPeriod, storedProfiles, newProfilesInPeriod },
                     activity: { sessions, messages, handoffs },
                     ai: { totalTokens, inputTokens, cachedInputTokens, outputTokens, costUsd, requests, errors,
                           byType, byModel } | null,
                     known: boolean }>
  }
  ```

**Halaman `/[lang]/admin`** — `src/app/[lang]/(dashboard)/admin/page.tsx` (+ komponen di `src/components/admin/`)
- Item sidebar "Admin" (ikon `ShieldCheck`) di `layout.tsx`, **hanya dirender bila `session.user.role === 'SUPER_ADMIN'`**. Halaman sendiri menampilkan 403 untuk role lain (API tetap jadi penjaga utama).
- Mengikuti gaya visual dashboard yang ada (Tailwind, kartu putih, `lucide-react`, tanpa library chart baru).

```
┌ Admin · Penagihan ─────────────────── [Bulan ini ▾] [01/11/2026 – 30/11/2026] [⬇ CSV] ┐
│ ⚠ Data token tersedia sejak 22/10/2026 (bila periode mulai lebih awal)               │
│ ⚠ Layanan AI tidak dapat dihubungi — angka token tidak tersedia (bila proxy gagal)    │
├───────────────┬───────────────┬───────────────┬───────────────┬──────────────────────┤
│ Tenant        │ Akun staf     │ Pengguna aktif│ Total token   │ Estimasi biaya AI    │
│ 12 (8 AI on)  │ 47 (41 aktif) │ 3.210         │ 18,4 jt       │ $41,27               │
│ free 5 · pro 7│ SA1·BP12·AG34 │ +540 profil   │ in 15,1·out 3,3│ 1.204 req · 3 error │
├───────────────┴───────────────┴───────────────┴───────────────┴──────────────────────┤
│ Tren harian token & biaya (bar per hari, SVG/CSS)                                    │
├──────────────────────────────────────────────────────────────────────────────────────┤
│ [Cari tenant…]                                         urut: Biaya ▾                 │
│ Tenant      Plan  Staf  Pengguna aktif  Sesi   Pesan   Token     Biaya   Terakhir aktif│
│ PT Alpha    pro   8/9   1.120           1.430  9.880   7,2 jt    $16,10  2 jam lalu  │
│  ▸ rincian: per tipe (chat/embedding/eval) · per model · staf per role · channel     │
│ PT Beta     free  2/2   35              40     210     —         —       5 hari lalu │
│ Tenant tidak dikenal (a1b2…)  …                                                       │
│ TOTAL             …                                                                   │
└──────────────────────────────────────────────────────────────────────────────────────┘
```
- Pemilih periode: Bulan ini (default), Bulan lalu, Rentang kustom (dua `input type="date"`).
- Tabel bisa diurutkan (biaya, token, pengguna aktif, nama) dan dicari; baris bisa diperluas untuk rincian.
- Peringatan `unpriced_models`: "N panggilan tanpa harga model (biaya belum termasuk): …".
- Token `null` ditampilkan "—" dengan tooltip, bukan 0.
- **Export CSV** dibuat di browser dari data yang sama: satu baris per tenant, kolom
  `tenant_id, tenant_name, plan, period_from, period_to, staff_total, staff_active, end_users_active, sessions, messages, input_tokens, cached_input_tokens, output_tokens, total_tokens, requests, cost_usd`;
  nama file `billing_<from>_<to>.csv`; `cost_usd` 6 desimal; tombol nonaktif bila `ai.status = unavailable`.
- i18n: namespace baru `admin` di `src/dictionaries/{en,id,ko,th,zh}.json`; `en` & `id` diterjemahkan penuh, `ko/th/zh` diisi teks Inggris (bisa diterjemahkan belakangan). Setiap pemanggilan `t('admin', key, fallback)` memakai fallback Inggris.

**Test CRM**
- `tests/api/admin-overview.test.ts` (vitest, pola mock Prisma/auth seperti `tenant-isolation.test.ts`): 401 tanpa sesi, 403 untuk `BUSINESS_PARTNER`/`AGENT`, validasi periode, penggabungan token proxy + tenant tidak dikenal + total konsisten, proxy gagal → `ai.status = unavailable` & token `null` sambil data Prisma tetap ada.
- Fungsi murni (merge, CSV, rentang periode) dipisah ke `src/lib/admin-billing.ts` agar bisa diuji langsung.

### 5.3 Env baru

| Nama | Repo | Keterangan |
|---|---|---|
| `BILLING_TIMEZONE` | keduanya | Zona batas periode tagihan, default `Asia/Jakarta` |

## 6. Keputusan yang saya ambil (bisa dikoreksi)

1. Retensi: isi percakapan tetap dihapus setelah 28 hari, **baris metrik disimpan 400 hari**.
2. "Pengguna" untuk tagihan = **contactId unik yang chat dalam periode** (profil tersimpan ditampilkan sebagai info tambahan).
3. Batas periode memakai zona `Asia/Jakarta` (bisa diubah lewat env).
4. Biaya `eval` (LLM-as-judge) ikut dihitung per tenant tetapi ditampilkan terpisah di rincian per tipe, supaya admin bisa memutuskan apakah ditagihkan.
5. CSV dibuat di browser, bukan endpoint terpisah.
6. Tanpa library chart baru; tren harian digambar dengan elemen HTML/SVG sederhana.

## 7. Diserahkan ke pembangun

- Struktur komponen di `src/components/admin/`, nama key i18n, detail styling.
- `groupBy` vs `$queryRaw` untuk hitungan unik, selama tidak memuat seluruh baris.
- Cara memanggil RPC Supabase dari endpoint proxy (`client.rpc(...)`), selama agregasi terjadi di Postgres.

## 8. Catatan risiko

- Bila pg_cron sudah menjalankan purge lama di production, data > 28 hari **sudah hilang** dan tidak bisa dipulihkan; tagihan akurat dimulai dari data yang masih ada. Peringatan `oldest_available` menangani ini di UI.
- Migration 006 harus dijalankan di Supabase **sebelum** purge berikutnya agar tidak ada lagi data metrik yang terhapus.
