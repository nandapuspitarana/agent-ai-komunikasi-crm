# Tasks: Mobile Quick-Reply Buttons (Welcome + After-Reply) & Gap Backlog

**Scope**: `agent-ai-komunikasi-crm` (backend + `packages/flutter_ai_agent_sdk`) dan konsumennya `cs_portal_mobile`
**Dibuat**: 2026-09-30 | **Basis kode**: branch `001-data-fixing` @ `199803e` (commit yang sama dengan `pubspec.lock` mobile)
**Format**: `[ID] [P?] [Sev] Deskripsi` — `[P]` = bisa paralel, Sev = P0 blocker / P1 penting / P2 hardening

Label bukti: **[CONFIRMED-RUN]** = direproduksi dengan test yang dijalankan · **[CONFIRMED-READ]** = dari membaca kode, belum dijalankan · **[UNVERIFIED]** = perlu dicek di server/device.

---

## Status implementasi (diperbarui 2026-09-30)

**Selesai & teruji**: Phase A (kecuali MQ007), Phase B (kecuali MQ023, MQ034, MQ035), Phase C (kecuali MQ043–MQ047), MQT00.
Hasil test terakhir: backend `npm run test:api` **26/26**, SDK `flutter test` **65/65**, mobile `test/unit/ai_agent + test/widget/ai_agent + performance` **37/37**.
Dijalankan sebagai regression: 7 dari 9 test halaman mobile **gagal** di SDK lama (pin `199803e`) dan lulus di SDK baru → test benar-benar mengunci bug.

**Belum di-commit / belum di-push.** Perubahan SDK ada di working tree repo backend; mobile masih memakai `ref: 001-data-fixing` @ `199803e`.
Urutan rilis yang aman:
1. Push branch backend `001-data-fixing` (memuat SDK baru) dan deploy backend.
2. Di repo mobile: `flutter pub upgrade flutter_ai_agent_sdk` → `pubspec.lock` berpindah dari `199803e` ke commit SDK baru (pin `ref: 001-data-fixing` adalah branch, jadi `pubspec.yaml` tidak perlu diubah) → commit lock itu (MQ044).
3. Baru build/rilis app. **Sebelum langkah 2 CI mobile merah** (test baru butuh SDK baru) dan APK yang dibuat belum punya tombol baru.
Build number mobile sudah dinaikkan ke `1.0.0+65`. Jika repo SDK privat, isi secret `SDK_GIT_TOKEN` (read-only) di Gitea agar CI mobile bisa `pub get`.
Kode mobile yang diubah kompatibel dengan SDK lama **dan** baru (dicek `flutter analyze`), jadi bisa dirilis sebelum pin diganti — tombol baru baru muncul setelah SDK di-upgrade.

**Penyimpangan dari rencana awal (disengaja)**
- Kontrak `init`: field lama `welcomeMessageOptions` **tetap string** (build mobile lama mem-parse `List` lewat `toString()` dan akan rusak jika diganti array of map). Bentuk terstruktur ada di field baru `welcomeOptions`.
- Channel `widget` (web) **tidak diubah perilakunya**: reply tetap berisi HTML tombol (kini di-escape) dan tanpa field `options`, agar tidak render dobel dan tidak bentrok dengan dedupe realtime `ChatWindow`. Channel lain (`mobile_app`, dll.) mendapat teks bersih + `options[]` + `responseType`. Migrasi web ke `options[]` = MQ051.
- TTL cache chat mobile ditetapkan **24 jam** (`AiChatSessionManager.sessionTtl`); ubah konstanta itu jika produk menginginkan lebih lama.

**Temuan baru saat implementasi**
- [x] Session id klien `session_<µs>` bisa bentrok di Windows (jam kasar) → test U15 gagal konsisten di kode lama. Diperbaiki: ditambah counter.
- [ ] MQ036 [P1] `AiChatView(showAppBar: true)` overflow horizontal di layar ≤ 320dp (RenderFlex overflow 92px pada title AppBar dengan `botName` default). Tidak terpengaruh di app mobile (`showAppBar: false`), tapi SDK lain akan kena.
- [ ] Rate limiter SDK 1.2 dtk (jam nyata) menelan tap kedua yang cepat pada chip; pertimbangkan tidak men-throttle pilihan chip yang berbeda.

---

## 0. Kenapa welcome message + bubble button tidak muncul di mobile

Jalur mobile: `AiSupportChatPage` → `AiChatSessionManager` → `AiChatController.initialize()` → `POST /api/widget/init` → `QuickReplyBar`.
Kalau server mengirim `welcomeMessageOptions` dan sesi masih baru, tombol **muncul** (test A lulus). Jadi masalahnya ada di sekitar itu:

| # | Penyebab | Bukti | Gejala di device |
|---|----------|-------|------------------|
| 1 | **Welcome lama di-restore dari SharedPreferences, `initialize()` di-skip.** `restoreMessages()` men-set `_isInitialized = true`, sehingga `initialize()` tidak pernah fetch config lagi. Welcome tanpa opsi (dari versi lama / fallback offline) tersimpan permanen di `ai_agent_chat_<contactId>`. | [CONFIRMED-RUN] test C: `initCalls=0 options=0` | Welcome tampil tapi tanpa tombol, sampai user tekan **Restart** |
| 2 | **Init gagal → fallback welcome tanpa opsi, ditandai `_isInitialized=true`, tidak ada retry**, lalu ikut tersimpan (poin 1). Penyebab init gagal: `AI_AGENT_TENANT_ID` default `'default-tenant'` → 404, jaringan, server down. | [CONFIRMED-RUN] test E; default di `lib/core/app_config.dart:33` | Banner kuning "offline fallback mode", tanpa tombol |
| 3 | **Race restore vs initialize.** Page memanggil `initialize()` langsung, sementara restore SharedPreferences berjalan async. Jika restore selesai saat fetch init masih jalan, hasil init menimpa riwayat (`_messages = [welcome]`). | [CONFIRMED-RUN] test B: riwayat hilang, hanya `[Hi]` | Riwayat chat kadang hilang / welcome muncul lagi di tengah sesi |
| 4 | **Server produksi belum menjalankan `199803e`** atau flow tidak punya `welcomeMessageOptions` / salah flow (`activeFlow` vs `flows[0]`). `welcomeMessageType` diabaikan backend & SDK, jadi mode "Text Only" dengan sisa options tetap menampilkan tombol dan sebaliknya. | [CONFIRMED-READ] `init/route.ts:28,46-47`; deploy [UNVERIFIED] | Tombol tidak ada walau di builder sudah diisi |
| 5 | **Desain UI: bukan "bubble button".** Opsi hanya dirender di `QuickReplyBar` (strip 48px di atas input) dari `messages.last` bila bot & tidak typing. Hilang begitu ada pesan berikutnya. Tidak ada tombol di bawah bubble seperti web `ChatUI`. | [CONFIRMED-READ] `ai_chat_view.dart:95-98,188-193` | Tombol tidak menempel ke bubble, mudah terlewat |

### Kenapa tombol setelah reply juga tidak ada (bug terpisah)

`POST /api/widget/message` tidak pernah mengirim field `options` / `responseType`. Tombol dikirim sebagai **HTML mentah di dalam `reply`**
(`<div class="flex..."><button onclick="window.postMessage(...)">`, `message/route.ts:364,384`). Web widget merender HTML itu; SDK Flutter tidak.
[CONFIRMED-RUN] test D: `msg.text` berisi `<button ... onclick=...>` apa adanya, `options=0`, `type=text` → user mobile melihat tag HTML mentah dan tidak ada tombol.

### Cek cepat di device (untuk membedakan penyebab)
1. Tekan ikon Restart di AppBar → tombol muncul? → penyebab **#1/#2/#3** (state lokal basi).
2. Ada banner "offline fallback mode"? → **#2** (cek `AI_AGENT_URL` / `AI_AGENT_TENANT_ID` di `.env` build).
3. `curl -X POST <AI_AGENT_URL>/api/widget/init -d '{"tenantId":"<id>"}'` → `config.welcomeMessageOptions` kosong/null? → **#4**.

---

## Phase A — Kontrak API (backend) — blocker untuk semua fase lain

**Kontrak yang diusulkan**

```jsonc
// POST /api/widget/init  → config   (DIIMPLEMENTASI)
{ "welcomeMessage": "...", "welcomeMessageType": "text|options|form",
  "welcomeMessageOptions": "Pricing|pricing, Tour",                        // string lama, dipertahankan untuk SDK lama; null bila type≠options
  "welcomeOptions": [{ "label": "Pricing", "value": "pricing" }],          // BARU: terstruktur; [] bila type≠options
  "initialFlow": { "id": "...", "name": "..." } }                          // whitelist, tanpa config/prompt

// POST /api/widget/message  → body   (DIIMPLEMENTASI)
// channel ≠ "widget" (mis. "mobile_app"):
{ "reply": "teks bersih tanpa HTML tombol", "responseType": "text|options|card|form",
  "options": [{ "label": "...", "value": "..." }], "sessionId": "...", ... }
// channel = "widget" (web): reply masih memuat <button> HTML (ter-escape), tanpa field "options";
// responseType tetap dikirim (informasional).
```

- [x] MQ001 [P0] `src/app/api/widget/message/route.ts` — bangun `options[]` terstruktur dari `qnaMatch.options` (parser `Label|Value` dipakai bersama) dan kembalikan `options` + `responseType`; **jangan** append `<button>` HTML ke `reply` untuk `channel !== 'widget-html'`. Hapus duplikasi blok di baris 361-371 dan 380-391 jadi satu helper `buildOptions()`. _Selesai untuk channel non-web; web sengaja tidak diubah (lihat Status)._
- [x] MQ002 [P0] Ekstrak helper bersama `src/lib/quick-replies.ts` (`parseOptions(raw): {label,value}[]`, `toLegacyHtml(options)`), dipakai `init`, `config`, `message`. Tambah escape label/value.
- [x] MQ003 [P0] `src/app/api/widget/init/route.ts` — kembalikan `welcomeMessageType`, `welcomeMessageOptions` sebagai array terstruktur (bukan string), hormati type (`text` → options kosong). Tetap kirim string lama di field terpisah `welcomeMessageOptionsRaw` selama masa transisi SDK lama. _Selesai: field terstruktur baru `welcomeOptions`, string lama dipertahankan._
- [x] MQ004 [P0] `src/app/api/widget/config/route.ts` — samakan resolusi flow dengan `init`/`message` (`activeFlow || flows[0]`); saat ini `config` hanya `activeFlow` sehingga web widget tanpa `activeFlowId` tidak punya welcome. Pindahkan resolusi ke `resolveEffectiveFlow(tenant)` di `src/lib/`.
- [x] MQ005 [P0] [CONFIRMED-READ] `init/route.ts:44` mengembalikan **seluruh** `flow` (`initialFlow`) ke endpoint publik tanpa auth → membocorkan `config.systemPrompt`, `humanPrompt`, `businessNeeds`. Ganti dengan whitelist `{ id, name }`.
- [x] MQ006 [P1] Perbaiki injeksi di HTML tombol lama: `value` dimasukkan mentah ke `onclick="...'${value}'..."` (patah oleh apostrof `Kids' room`, JS injection dari data KB/intent). Gunakan `data-value` + event delegation di `ChatUI`, atau escape.
- [ ] MQ007 [P1] Dokumentasikan kontrak di `specs/001-core-crm-engine/contracts/api-contracts.md` (versi + field deprecated).

## Phase B — Flutter SDK (`packages/flutter_ai_agent_sdk`)

**Welcome & state**
- [x] MQ010 [P0] `AiChatController.initialize()` — pisahkan "restored" dari "initialized": jangan set `_isInitialized=true` di `restoreMessages()`; jika riwayat ter-restore, tetap refresh **config saja** (tenantName/botName) dan **re-hydrate opsi welcome** bila pesan pertama adalah welcome tanpa opsi.
- [x] MQ011 [P0] Serialisasi welcome dengan marker (`isWelcome: true` di `ChatMessage`/`toJson`), agar bisa diganti tanpa menyentuh riwayat.
- [x] MQ012 [P0] Guard race: `initialize()` harus `await` restore lebih dulu (sediakan `Future<void> restored` di manager/controller) dan tidak menimpa `_messages` bila sudah ada pesan setelah await (merge, bukan replace).
- [x] MQ013 [P0] Fallback offline **tidak** menandai `_isInitialized=true` secara permanen: simpan flag `_needsRetry`, jangan persist pesan `welcome_fallback`, coba lagi saat `AiChatView` resume / tombol "Coba lagi" di banner error.
- [x] MQ014 [P1] Hormati `welcomeMessageType`; `type` pesan = `options` hanya bila `options.isNotEmpty` (saat ini `optionsRaw != null` → string kosong/spasi tetap dianggap options).
- [x] MQ015 [P2] Hapus string brand hard-coded di SDK (`'...CEOSUITE services today?'`, `'Welcome to CEOSUITE Portal!'`) → ambil dari `AiAgentConfig`/i18n.

**Tombol setelah reply**
- [x] MQ020 [P0] `AiAgentApiClient.sendMessage` — baca `options`/`responseType` terstruktur dari response (Phase A) dan **fallback parser HTML** untuk server lama: ekstrak `<button ...>Label</button>` + nilai dari `text: '...'` pada onclick, lalu **strip** blok tersebut dari `text`.
- [x] MQ021 [P0] `ChatMessage.fromApiResponse` — strip tag HTML tersisa (`toPlainText`) sebelum tampil; pertahankan card/form parsing yang ada.
- [x] MQ022 [P0] Handle `reply == null` (status `agent`): jangan menambah bubble bot kosong; tampilkan status "Menunggu balasan agen".
- [ ] MQ023 [P1] Terapkan `triggerLeadForm` + `leadFormConfig` dari response `/message` (saat ini diabaikan SDK).

**UI bubble button**
- [x] MQ030 [P0] Render opsi **inline di bawah bubble** (`Wrap` chip) di `ChatBubble` untuk pesan bot; pertahankan `QuickReplyBar` sebagai opsi `quickReplyStyle: bar|inline` (default `inline`).
- [x] MQ031 [P1] Perilaku setelah dipilih: chip pesan itu menjadi disabled + tersorot (pilihan user), chip pesan lama tidak bisa diklik ulang; buka kembali hanya untuk pesan bot terakhir.
- [x] MQ032 [P1] Chip tetap terlihat saat `isTyping` (disabled, bukan hilang) agar layout tidak melompat.
- [x] MQ033 [P1] Aksesibilitas: `Semantics(button: true, label:)`, target sentuh ≥ 44dp, dukung teks panjang (wrap, bukan strip 1 baris 48px), dark mode. _Selesai: semantics + wrap label panjang (test F15/F19); target sentuh 48dp via `MaterialTapTargetSize.padded`._
- [ ] MQ034 [P1] Render `ResponseType.form` — `FormPayload` sudah di-parse tapi **tidak ada widget form** (`ui/widgets/` hanya bubble, card, quick-reply, handoff). Buat `LeadFormView` + submit ke `form-proxy`/webhook.
- [ ] MQ036 [P1] Overflow AppBar SDK di layar ≤ 320dp (lihat Temuan baru).
- [ ] MQ035 [P2] Markdown/link di teks bot (README menjanjikan "markdown & URL", `ChatBubble` memakai `SelectableText` polos); `onLaunchUrl` saat ini hanya dipakai kartu.

## Phase C — Aplikasi mobile (`cs_portal_mobile`)

- [x] MQ040 [P0] `AiChatSessionManager` — versi skema storage (`v:2`) + TTL (mis. 24 jam); data lama tanpa `isWelcome`/opsi dibuang atau di-migrasi. Batasi jumlah pesan tersimpan (mis. 200) — sekarang tak terbatas.
- [x] MQ041 [P0] `_restoreSavedSession`: guard `_isRestoring` membuat controller kedua (ganti brand/contact cepat) tidak pernah restore. Ganti flag dengan `Future` per controller.
- [x] MQ042 [P0] `ai_support_chat_page._initChat` — tunggu restore selesai sebelum `initialize()` dan sebelum `initialPrompt` dikirim (kalau tidak, welcome+tombol langsung tertutup balasan otomatis).
- [ ] MQ043 [P1] Validasi konfigurasi saat startup: `AI_AGENT_TENANT_ID=='default-tenant'` di build release → log/assert; tampilkan error jelas, bukan fallback senyap.
- [ ] MQ044 [P1] _(blocker rilis: SDK harus di-push dulu)_ Perbarui pin SDK di `pubspec.yaml` (`ref: 001-data-fixing` → tag rilis SDK, mis. `sdk-v1.1.0`) dan jalankan `flutter pub upgrade flutter_ai_agent_sdk`; `pubspec.lock` sekarang terkunci di `199803e`.
- [ ] MQ045 [P1] Sinkron balasan agen manusia: setelah handoff mobile tidak punya kanal masuk (tidak ada socket/Supabase/polling) → balasan agen tidak pernah tampil. Pilih: polling `GET /api/chat/messages?sessionId=` (cepat) atau Supabase Realtime (`crm_agent_Message`) seperti web; plus push FCM saat agen membalas dan app di background.
- [ ] MQ046 [P2] `contactId` = `odooId`/email → PII dikirim sebagai id dan disimpan di `VisitorProfile`; pakai id ter-hash/opaque.
- [ ] MQ047 [P2] Kirim data visitor pasif (`/api/widget/visitor`: device/OS/app version) — mobile tidak memanggilnya sama sekali.

## Phase D — Paritas web widget & bug backend terkait

- [ ] MQ050 [P0] [CONFIRMED-READ] `ChatWindow.addMessage` men-drop pesan yang sama dari pengirim yang sama dalam 3 pesan terakhir → user menekan opsi yang sama dua kali: bubble kedua tidak tampil tapi pesan **tetap terkirim ke server**. Dedupe berdasarkan `id` server, bukan teks.
- [ ] MQ051 [P1] `ChatWindow` — `data.options` sudah dibaca tapi tak pernah dikirim server; setelah MQ001 hubungkan `options` + hapus ketergantungan `dangerouslySetInnerHTML` untuk tombol.
- [ ] MQ052 [P1] `ChatWindow` config effect memakai deps `[tenantId, addMessage, t]` dan `setMessages([welcome])` → bila `t` berubah identitas, welcome menimpa seluruh percakapan. Pisahkan (`if (prev.length===0)`), memoize `t`.
- [ ] MQ053 [P1] `ChatWindow`: `data.welcomeMessageType==='form'` tidak pernah dirender (tidak dikirim API). Terapkan di web.
- [ ] MQ054 [P1] Sanitasi output bot/agent di `ChatUI` (`dangerouslySetInnerHTML` tanpa sanitizer — pesan agent yang diketik manual ikut dirender sebagai HTML ke visitor). Tambah DOMPurify allowlist (`b,i,a,br,p,ul,li,button[data-value]`).
- [ ] MQ055 [P1] Status sesi: `status==='queue'` tetap dijawab bot (hanya `agent` yang di-skip di `message/route.ts:157`), dan `closed` juga masih dijawab. Tentukan perilaku: `queue` → balasan tunggu + tetap simpan pesan; `closed` → buat sesi baru.
- [ ] MQ056 [P2] `parseAIResponseForHandoff`/`parseClassificationTag`/`parseDataExtractionTag` memakai `replace` string → hanya tag pertama terhapus; gunakan regex global.
- [ ] MQ057 [P2] `conversationHistory` menghapus HTML dengan regex sehingga label tombol menempel ke teks (`"...paket.OfficeVirtual"`); gunakan `options` terstruktur, jangan masuk history.
- [ ] MQ058 [P2] Widget Preact lama `widget/src/index.js` rusak dan tidak dipakai (WP plugin memuat `public/widget.js`): `POST /init` tanpa `tenantId` → 400, membaca `config.sessionId` yang tak ada, `!config.status === 'success'` selalu `false`. Hapus atau perbaiki; sesuaikan `docs/` yang masih merujuk ke sana.

## Phase E — Fungsi lain yang perlu dikerjakan (hasil scan)

**Security / integritas** (dokumen `docs/SECURITY_AUDIT.md` menyatakan "PASSED", tetapi beberapa klaim tidak cocok dengan kode → tandai ulang)
- [ ] MQ060 [P0] [CONFIRMED-READ] `POST /api/webhooks/whatsapp`: `await request.json()` lalu `await request.text()` → body sudah terbaca, `text()` melempar → catch → **setiap webhook gagal** (dan HMAC dihitung dari body yang salah). Baca `text()` sekali, verifikasi HMAC dengan `timingSafeEqual`, baru `JSON.parse`.
- [ ] MQ061 [P0] [CONFIRMED-READ] `POST /api/widget/form-proxy` melakukan `fetch(url)` ke URL apa pun dari klien tanpa auth → **SSRF** (metadata cloud, jaringan internal) + menulis pesan ke `sessionId` sembarang. Allowlist domain per tenant, blok IP privat, verifikasi `sessionId` milik `tenantId`/`contactId`.
- [ ] MQ062 [P0] [CONFIRMED-READ] `message/route.ts:92-94` mencari sesi hanya dengan `sessionId` (tanpa cek `tenantId`/`contactId`) → siapa pun yang tahu/menebak id bisa menulis ke sesi tenant lain. Wajibkan kecocokan tenant + contact.
- [ ] MQ063 [P1] Rate limit endpoint publik `/api/widget/*` (audit mengklaim ada; grep di `src/app/api/widget`, `src/middleware*` tidak menemukan apa pun). `middleware.ts` matcher juga mengecualikan `/api`, jadi `x-tenant-id` tidak pernah di-inject ke API.
- [ ] MQ064 [P1] CORS `Access-Control-Allow-Origin: *` di semua route widget → whitelist per tenant (`allowedOrigins`); tandai di audit.
- [ ] MQ065 [P1] Rekonsiliasi `docs/SECURITY_AUDIT.md`: `src/lib/redis-session.ts` tidak ada; Shadow DOM disebut `open` sedangkan `public/widget.js` memakai `closed`; klaim CSRF/CSP/HSTS perlu bukti header nyata (`curl -I`).
- [ ] MQ066 [P2] `widget/config` fallback logo `via.placeholder.com`, dan `POST /widget/config` memakai `tenant.findFirst()` (multi-tenant salah) — perbaiki/hapus.

**Fungsional lain**
- [ ] MQ070 [P1] Human handoff end-to-end di mobile (lihat MQ045) + `HandoffBanner` menampilkan posisi antrean / status agen.
- [ ] MQ071 [P1] Review/rating setelah sesi `closed` (`/api/chat/sessions/[id]/review`) hanya ada di web; tambahkan di SDK/mobile.
- [ ] MQ072 [P1] Intent matching: saat `aiEnabled=true` hanya exact match; partial match hanya bila AI mati (`message/route.ts:249-258`). Uji dan putuskan kebijakan; tambahkan normalisasi (trim/punctuation/case) dan prioritas match terpanjang.
- [ ] MQ073 [P1] Intent `responseType` `card`/`form` di-bypass LLM tetapi `handoff` tidak; samakan aturan bypass dan pastikan `[HANDOFF_REQUESTED]` tetap men-set status `queue`.
- [ ] MQ074 [P2] Analytics klik quick-reply (event `quick_reply_clicked` {messageId, value, source: welcome|reply}) untuk mengukur konversi tombol.
- [ ] MQ075 [P2] Lead form kontekstual (`triggerLeadForm`) di mobile dan dukungan `leadFormSkippable`.
- [ ] MQ076 [P2] i18n SDK: string hard-coded ('Assistant is typing...', 'Silakan lengkapi form berikut:', 'Restart Conversation', hint input) → `AiChatStrings` yang bisa di-override dari app (`id`/`en`).
- [ ] MQ077 [P2] `README` SDK masih menyebut dependency `path:` sedangkan app memakai `git ref`; perbarui panduan + cara rilis/tag SDK.
- [ ] MQ078 [P2] Inbox dashboard: pastikan pesan bot yang mengandung HTML tombol tidak tampil mentah ke agen (cek `inbox/page.tsx`; setelah MQ001 field `options` bisa ditampilkan sebagai chip read-only).

---

## Phase T — Test plan

> Aturan repo untuk test device (ARTEMIS): sebelum menulis skrip E2E mobile, jalankan alurnya dulu lewat ARTEMIS di device/emulator untuk memastikan urutan layar; skrip final memakai wait eksplisit (bukan sleep buta), lokator dinamis dulu (`find.text`/`Key`), koordinat hanya fallback. Jika ada lebih dari satu device, tanyakan serial ke pemilik sebelum menjalankan.

### T0 — Infrastruktur
- [x] MQT00 [P0] Backend belum punya unit/integration test runner (hanya Playwright). Tambah `vitest` + helper prisma-mock/test-DB untuk route handler `src/app/api/widget/**`; script `npm run test:api`.
- [x] MQT01 [P0] CI job terpasang: backend `.github/workflows/ci.yml` (job `api`: prisma generate + `npm run type-check` + `npm run test:api`; job `sdk`: `flutter analyze` + `flutter test`) dan mobile `.gitea/workflows/ci.yml` (`flutter analyze` + `flutter test`). _Playwright belum masuk CI (butuh DB + app berjalan) → MQT03._
- [ ] MQT03 [P1] Tambah job E2E Playwright di CI (service Postgres + `prisma db push` + seed + `next build/start`), setelah TEST-AI-F43 diperbaiki.
- [ ] MQT02 [P1] Contract test bersama: satu fixture JSON `init`/`message` di `packages/flutter_ai_agent_sdk/test/fixtures/` dipakai test SDK **dan** test route backend (mencegah drift kontrak seperti kasus string vs array).

### T1 — Regression (mengunci bug yang sudah dikonfirmasi; harus **gagal** sebelum fix dan lulus sesudahnya)

| ID | Lokasi | Skenario | Bug |
|----|--------|----------|-----|
| ✅ TEST-AI-R01 | SDK unit | `restoreMessages()` dengan welcome tanpa opsi → `initialize()` tetap men-hydrate opsi dari server | #1 (test C) |
| ✅ TEST-AI-R02 | SDK unit | `initialize()` lambat + `restoreMessages()` di tengah → riwayat tetap ada, sessionId dari restore dipakai | #3 (test B) |
| ✅ TEST-AI-R03 | SDK unit | Init 404/timeout → `errorMessage` terisi, `isInitialized=false`/`needsRetry`, panggilan kedua ke `initialize()` mencoba lagi dan sukses | #2 (test E) |
| ✅ TEST-AI-R04 | SDK unit | Fallback welcome tidak ikut ter-persist ke storage | #2 |
| ✅ TEST-AI-R05 | SDK unit | `sendMessage` dengan `reply` berisi `<div><button onclick=…>Office</button></div>` → `text` bersih, `options=[Office]`, `type=options` | D (test D) |
| ✅ TEST-AI-R06 | SDK unit | `reply: null`, `status:'agent'` → tidak ada bubble kosong | MQ022 |
| ✅ TEST-AI-R07 | SDK unit | `welcomeMessageOptions: ''`/`'  '` → `type=text`, tanpa chip | MQ014 |
| ✅ TEST-AI-R08 | Mobile unit | `AiChatSessionManager`: data storage skema lama dibuang/di-migrasi; TTL lewat → welcome dimuat ulang | MQ040 |
| ✅ TEST-AI-R09 | Mobile unit | Dua `getOrCreateController` berurutan cepat → keduanya melakukan restore | MQ041 |
| ✅ TEST-AI-R10 | Mobile widget | `initialPrompt` terisi: welcome + tombol tetap ada di riwayat, prompt terkirim setelah restore | MQ042 |
| TEST-AI-R11 | Web (Playwright) | Klik opsi yang sama dua kali → dua bubble user tampil & dua request terkirim | MQ050 |
| ✅ TEST-AI-R12 | API | `/widget/config` tanpa `activeFlowId` tetap mengembalikan welcome dari `flows[0]` | MQ004 |
| ✅ TEST-AI-R13 | API | `/widget/init` tidak memuat `initialFlow.config` (`systemPrompt` tidak bocor) | MQ005 |
| ✅ TEST-AI-R14 | API | Apostrof pada opsi (`Kids' room`) tidak merusak tombol / tidak bisa inject JS | MQ006 |
| TEST-AI-R15 | API | WhatsApp webhook dengan signature valid → 200; signature salah → 403; body tidak "already read" | MQ060 |
| TEST-AI-R16 | API | `sessionId` milik tenant A dipakai dengan `tenantId` B → 403/sesi baru, bukan tulis lintas tenant | MQ062 |
| TEST-AI-R17 | API | `form-proxy` menolak `http://169.254.169.254`, `localhost`, IP privat | MQ061 |

### T2 — Functional

**API / backend (vitest)**
- [ ] TEST-AI-F01 `init`: welcome `text` → `options=[]`; `options` → array terstruktur; `form` → `welcomeForm`; parsing `Label|Value`, spasi, koma ganda, duplikat.
- [ ] TEST-AI-F02 `init`/`config`: resolusi flow `activeFlow` → fallback `flows[0]` → tidak ada flow (welcome null, bukan error).
- [ ] TEST-AI-F03 `message`: intent `options` mengembalikan `options[]` + `responseType`, `reply` tanpa HTML; `aiEnabled` true & false.
- [ ] TEST-AI-F04 `message`: keyword handoff → `status:'queue'`, `handoffOccurred:true`; tag `[HANDOFF_REQUESTED]` dari LLM; multi-tag dibersihkan semua.
- [ ] TEST-AI-F05 `message`: sesi `agent` → `reply:null`; sesi `queue`/`closed` sesuai kebijakan MQ055.
- [ ] TEST-AI-F06 `message`: LLM error → `defaultResponse` flow / pesan default sesuai bahasa (`id`/`en`) + handoff.
- [ ] TEST-AI-F07 `message`: `triggerLeadForm` hanya sekali per visitor (`leadFormShown`).
- [ ] TEST-AI-F08 `message`: ekstraksi `[DATA: …]` & `[CLASS: …]` memperbarui `VisitorProfile` dan tag tidak muncul di `reply`.
- [ ] TEST-AI-F09 rate limit widget (MQ063): request ke-N+1 → 429.

**SDK (flutter test)**
- [x] TEST-AI-F10 Welcome + opsi tampil **inline di bawah bubble**, semua chip terlihat (`find.byType(ActionChip)` di dalam `ChatBubble`).
- [x] TEST-AI-F11 Tap chip welcome → `sendMessage(value)`; user bubble berisi `value`; chip tersebut disabled setelahnya; chip pesan lama tidak bisa dipakai ulang.
- [x] TEST-AI-F12 Setelah reply berisi opsi → chip baru muncul di bawah bubble reply, chip welcome lama nonaktif.
- [x] TEST-AI-F13 `Label|Value`: label tampil, `value` terkirim.
- [x] TEST-AI-F14 Saat `isTyping` chip disabled (tidak hilang); layout tidak bergeser (golden test).
- [x] TEST-AI-F15 Teks panjang/RTL/emoji pada label chip: wrap, tidak overflow; dark mode kontras.
- [ ] TEST-AI-F22 Form: `ResponseType.form` merender field, validasi `required`/email/tel, submit sukses/gagal, tombol submit disabled saat loading.
- [ ] TEST-AI-F23 Card: tombol link memanggil `onLaunchUrl`, URL non-http(s) ditolak.
- [ ] TEST-AI-F24 Handoff: banner muncul, nama agen tampil, pesan agen bertanda `MessageSender.agent`, tidak ada bubble kosong.
- [ ] TEST-AI-F20 Rate limiter: tap chip beruntun cepat hanya mengirim satu pesan.

**Mobile app (flutter test + integration_test)**
- [ ] TEST-AI-F30 `AiSupportChatPage` dengan `MockClient` init berisi opsi → tombol welcome tampil untuk brand CEO **dan** Work Wise (tema berbeda).
- [ ] TEST-AI-F31 Buka → kirim pesan → Back → buka lagi: riwayat utuh **dan** welcome tetap punya opsi.
- [ ] TEST-AI-F32 Logout membersihkan chat; login user lain tidak melihat riwayat sebelumnya.
- [ ] TEST-AI-F33 Mode pesawat: banner offline + tombol "Coba lagi"; setelah online welcome+opsi muncul tanpa Restart.
- [ ] TEST-AI-F34 Dark/light mode + perubahan brand saat chat terbuka.
- [ ] TEST-AI-F35 `initialPrompt` dari deep link / FAQ widget (`need_help_faq_widget`) terkirim tepat sekali.
- [ ] TEST-AI-F36 `integration_test/ai_chat_flow_test.dart` (device/emulator, server mock): buka menu AI Assistant → lihat welcome + 3 tombol → tap tombol → reply dengan tombol baru → tap → handoff → banner. Buat setelah eksplorasi ARTEMIS.

**Web widget (Playwright, perluas `tests/e2e/`)**
- [ ] TEST-AI-F40 `ai-chat.spec.ts`: welcome + tombol tampil, klik tombol mengirim `value`, tombol reply muncul.
- [ ] TEST-AI-F41 Builder → simpan welcome type `options` → widget menampilkan tombol; ubah ke `text` → tombol hilang (MQ003).
- [ ] TEST-AI-F42 XSS: pesan agent berisi `<img onerror>` tidak dieksekusi (MQ054).
- [ ] TEST-AI-F43 Perbaiki `quick-chat.spec.ts` "06 - Agent claims session and sends reply": gagal `page.fill('#email')` timeout 15 dtk (lihat `tests/e2e/test-results/*/error-context.md`) — selector/redirect locale login (`/en/login`) perlu diperbarui.

### T2b — Yang sudah ada di kode (rujukan)

| Lapisan | File | Test ID |
|---|---|---|
| Backend | `tests/api/quick-replies.test.ts` | F01a–c, F02, R14 (helper + escape) |
| Backend | `tests/api/widget-init-config.test.ts` | F01d, R12, R13, fallback flows[0], 400/404 |
| Backend | `tests/api/widget-message.test.ts` | F03a, F03b, R14 (web), responseType card, F04 |
| SDK | `test/regression/welcome_quick_reply_regression_test.dart` | R01, R01b, R02, R02b, R03, R03b, R04, R05, R05b–e, R06, R07, R08, F01e, `HtmlReplyParser` unit |
| SDK | `test/functional/quick_reply_inline_widget_test.dart` | F10–F15, bar style (F16), text-only (F17), Retry (F18), semantics (F19) |
| Mobile | `test/unit/ai_agent/ai_chat_session_manager_persistence_test.dart` | R01m, R08, R08b, R08c, R09, R04m, F32 |
| Mobile | `test/widget/ai_agent/ai_support_chat_welcome_buttons_test.dart` | F30, F30b–d, R01m2, R10, F31, F33, F19m |
| Mobile | `test/helpers/fake_ai_agent_server.dart` | helper: `/init` + `/message` palsu di atas `AiAgentApiClient` asli |

> Penomoran F16–F19 pada file SDK mengikuti isi file (bar/text-only/retry/semantics); Form/Card/Handoff dipindah ke F22–F24 di daftar di atas.
> Menjalankan test mobile terhadap SDK lokal: buat `pubspec_overrides.yaml` sementara dengan `dependency_overrides` → `path:` ke `packages/flutter_ai_agent_sdk`, `flutter pub get`, jalankan test, lalu hapus file itu dan `flutter pub get` lagi.

### T3 — Verifikasi manual/lintas-lingkungan (checklist rilis)
- [ ] MQT10 Deploy server dengan `199803e`+ dan jalankan `curl` `init`/`message` terhadap tenant produksi; simpan sampel respons di `specs/…/contracts/`.
- [ ] MQT11 Uji upgrade: install build mobile lama (dengan welcome tersimpan tanpa opsi) → update ke build baru → tombol muncul tanpa Restart (MQ040).
- [ ] MQT12 Uji 3 jaringan (Wi-Fi, 4G lambat, offline→online) pada Android + iOS.

---

## Urutan eksekusi yang disarankan

1. **Phase A (MQ001–MQ005)** + TEST-AI-R12/R13/R05 → kontrak stabil, kebocoran prompt tertutup.
2. **Phase B P0 (MQ010–MQ013, MQ020–MQ022, MQ030)** + R01–R07 → tombol welcome & after-reply berfungsi di SDK.
3. **Phase C P0 (MQ040–MQ042, MQ044)** + R08–R10 → mobile memakai SDK baru dan tidak lagi menyimpan state basi.
4. **Phase E security P0 (MQ060–MQ062)** paralel dengan 2–3 (file berbeda) + R15–R17.
5. Sisanya (P1/P2) per prioritas; jalankan T2 penuh sebelum rilis.

**Definition of done (fitur tombol)**: welcome dan setiap reply yang punya opsi menampilkan chip di bawah bubble di web & mobile; tap mengirim `value`; tidak ada HTML mentah di bubble; state lama tidak menyembunyikan tombol; semua TEST-AI-R* hijau di CI.
