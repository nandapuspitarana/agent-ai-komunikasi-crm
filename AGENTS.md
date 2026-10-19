<!-- SPECKIT START -->
For additional context about technologies to be used, project structure,
shell commands, and other important information, read the current plan at specs/001-core-crm-engine/plan.md
<!-- SPECKIT END -->

# 🤖 Dokumentasi Integrasi AI Agent & Human Handoff (GPU)

Dokumen ini menjelaskan arsitektur, skema database, aturan handoff, alur Socket.io, dan panduan menjalankan sistem integrasi AI Agent dengan akselerasi GPU (PyTorch) di Next.js CRM.

---

## 🏗️ Arsitektur Sistem

Sistem ini menggunakan arsitektur mikro untuk memisahkan logika UI/CRM dari eksekusi model AI yang berat:

```
[ Widget Chat (Client) ] ◄--- HTTP / WebSockets ---► [ Next.js Monolith ]
                                                            │ (HTTP REST)
                                                            ▼
                                                     [ Python FastAPI ]
                                                            │ (CUDA PyTorch)
                                                            ▼
                                                     [ NVIDIA GPU VRAM ]
```

1. **Next.js CRM**: Menangani autentikasi, manajemen tenant, database (Prisma + PostgreSQL), state, dan broker event real-time (Socket.io).
2. **FastAPI AI Engine**: Layanan backend Python mandiri yang memuat model AI lokal (LLM) langsung ke VRAM GPU menggunakan PyTorch + CUDA, memproses teks dengan performa tinggi.

---

## 🗄️ Model Database (Prisma Schema)

Field berikut ditambahkan untuk melacak aktivasi AI dan permintaan pengalihan percakapan:

### Model `Tenant`
Menyimpan konfigurasi AI untuk setiap unit bisnis (tenant):
- `aiEnabled` (Boolean, default: `true`): Mengaktifkan/menonaktifkan auto-reply AI untuk tenant.
- `aiSystemPrompt` (String, opsional): Instruksi khusus (system prompt) untuk personalisasi respons AI.
- `humanHandoffEnabled` (Boolean, default: `true`): Toggle mengaktifkan/menonaktifkan transfer percakapan ke agen manusia.
- `fallbackEmail` (String, opsional): Email resmi perusahaan penerima laporan kendala ketika handoff dinonaktifkan.
- `visitorConfig` (Json): Menyimpan aturan ekstraksi prospek dan konfigurasi form funnel `contactForm`.

### Model `ChatSession`
Melacak status alur percakapan:
- `status` (String, default: `"bot"`): Status sesi chat, bernilai `"bot"`, `"queue"` (menunggu agen), atau `"agent"` (ditangani manusia).
- `handoffRequested` (Boolean, default: `false`): Menandakan jika pengguna widget meminta berbicara dengan manusia.
- `assignedAgentId` (String, opsional): ID Agen manusia yang mengambil alih percakapan.
- `updatedAt` (DateTime): Waktu pembaruan sesi (otomatis menggunakan `@updatedAt`).

---

## 🎛️ Pengaturan Tenant: Human Handoff & Form Funnel (Saat Toggle Nonaktif)

Pada menu **Pengaturan > Pengaturan Penyewa (Tenant)** di Dashboard (`src/app/[lang]/(dashboard)/settings/page.tsx`), terdapat switch kendali **"Bantuan Agen Manusia / Talk to CS"** (`humanHandoffEnabled`):

### 1. Saat Toggle Aktif (`humanHandoffEnabled: true`)
- **UI Dashboard**: Menampilkan pilihan **Default Handoff Agent (Human Queue)** (`handoffAgentId`).
- **UI Widget & SDK Mobile**: Tombol menampilkan opsi *"Bicara dengan Agen"*.
- **Alur**: Permintaan transfer akan memasukkan percakapan ke antrean agen (`status: "queue"`).

### 2. Saat Toggle Dinonaktifkan (`humanHandoffEnabled: false`)
Jika bisnis tidak memiliki tim customer support live atau ingin mengalihkan laporan secara asinkron, sistem menampilkan **Form Pengaturan Funnel & Laporan (Saat Agen Nonaktif)**:

- **Default Support Email (`fallbackEmail`)**: Alamat email resmi tujuan pengiriman ringkasan kendala (contoh: `support@domain.com`).
- **Label Tombol (`contactForm.buttonLabel`)**: Teks tombol pemicu pada widget (default: *"Send Email to Company"* atau kustom seperti *"Kirim Email / Laporan"*).
- **Judul Modal Form (`contactForm.formTitle`)**: Judul header pada formulir in-app (default: *"Hubungi Perusahaan / Laporan"*).
- **Daftar Kategori Masalah (`contactForm.categories`)**: Daftar pilihan dropdown kategori kendala yang dapat diisi pengguna (dipisahkan koma).
- **Template Balasan Konfirmasi AI (`contactForm.autoReplyTemplate`)**: Format pesan bot otomatis setelah formulir dikirim. Mendukung variabel dinamis:
  - `{name}`: Nama pengunjung (dari parameter widget/profil)
  - `{category}`: Kategori kendala yang dipilih
  - `{company}`: Nama perusahaan pengunjung
  - `{email}`: Email kontak pengunjung
- **Gunakan Formulir Funnel In-App (`contactForm.enabled`)**:
  - `true` (*Default*): Membuka form modal minimalis langsung di dalam widget / SDK tanpa meninggalkan aplikasi.
  - `false`: Mengarahkan tombol langsung ke klien email eksternal pengguna (`mailto:${fallbackEmail}`).

### 3. Skema Data `ContactFormConfig`
Didefinisikan pada [src/lib/visitor-config.ts](file:///c:/Users/nanda/Documents/aiagent/agent-ai-komunikasi-crm/src/lib/visitor-config.ts):
```typescript
export interface ContactFormConfig {
  enabled: boolean;
  buttonLabel?: string;
  formTitle?: string;
  categories?: string[];
  autoReplyTemplate?: string;
}
```

### 4. Pengaturan Bahasa Tenant & Lokalisasi Modal Popup
Sistem mendukung lokalisasi dinamis untuk formulir funnel / modal laporan masalah (`ContactFunnelModal` di mobile SDK & `ChatUI` web overlay) berdasarkan pengaturan bahasa tenant:
- **Pengaturan Bahasa Tenant (`tenant.visitorConfig.language`)**:
  - Dapat dikonfigurasi melalui menu **Pengaturan > Pengaturan Penyewa (Tenant)** di dropdown **Tenant Primary Language**.
  - Opsi: `en` (*English*, Default) atau `id` (*Bahasa Indonesia*).
- **Penyesuaian Teks Modal Berdasarkan Bahasa**:
  - **Bahasa Inggris (`en`)**:
    - Judul Modal: *"Contact Company / Report Issue"*
    - Label Kategori: *"Issue Category"*
    - Dropdown Kategori: `['General Inquiry', 'Services & Facilities', 'Technical Issue', 'Billing & Payment', 'Partnership', 'Other']`
    - Label Deskripsi: *"Issue Description"*
    - Placeholder Deskripsi: *"Briefly describe your issue or inquiry..."*
    - Tombol Batal: *"Cancel"*
    - Tombol Submit: *"Submit Report"*
    - Status Mengirim: *"Submitting..."*
    - Validasi: *"This field is required"*
    - Pesan Ringkasan di Chat: `📝 [Inquiry / Issue Report to Company]`
    - Balasan Bot Standar: *"Thank you {name}! Your message and report regarding "{category}" has been forwarded to our team..."*
  - **Bahasa Indonesia (`id`)**:
    - Judul Modal: *"Hubungi Perusahaan / Laporan"*
    - Label Kategori: *"Kategori Masalah"*
    - Dropdown Kategori: `['Pertanyaan Umum', 'Layanan & Fasilitas', 'Kendala Teknis', 'Billing & Pembayaran', 'Kemitraan', 'Lainnya']`
    - Label Deskripsi: *"Deskripsi Masalah"*
    - Tombol Submit: *"Kirim Laporan"*
    - Pesan Ringkasan di Chat: `📝 [Laporan Masalah ke Perusahaan]`
- **Di Flutter SDK (`ContactFunnelStrings`)**:
  - Menggunakan factory `ContactFunnelStrings.fromConfig(contactFormConfig, language: controller.tenantLanguage)`.
  - Terintegrasi otomatis di `AiChatController` dan `AiChatView` tanpa perlu konfigurasi manual dari klien mobile.

### 5. Lokalisasi Antarmuka Dashboard CRM (i18n Settings & Email Gateway)
Seluruh antarmuka pada menu **Pengaturan (Settings)** dan **Panel Gateway Email & SMTP** telah terintegrasi dengan arsitektur i18n berbasis rute `src/app/[lang]/(dashboard)/settings/page.tsx` dan kamus dictionary (`src/dictionaries/en.json` & `src/dictionaries/id.json`).

Ketika rute dibuka dengan bahasa Inggris (contoh: `http://192.168.20.242:8201/en/settings`):
- **Toggle Bantuan Agen Manusia**:
  - Label: *"Human Agent Support / Talk to CS"*
  - Keterangan: *"Toggle to enable \"Talk to Agent\" option. Disable if live support is exclusively routed to official customer support email."*
- **Antrean Agen Default (Saat Toggle Aktif)**:
  - Label: *"Default Handoff Agent (Human Queue)"*
  - Keterangan: *"Who will be assigned (or named by AI) when users are transferred to human agent queue."*
  - Opsi Antrean Umum: *"-- No specific agent (General Queue) --"*
- **Form Funnel & Laporan (Saat Toggle Nonaktif)**:
  - Header: *"Funnel Form & Issue Report Settings (When Agent is Disabled)"*
  - Badge Mode: *"Funnel Form Mode"*
  - Deskripsi: *"Configure inquiry and issue collection form (funnel) displayed to users when human agent option is disabled."*
  - Email Tujuan Laporan: *"Default Support Email (Report Destination)"*
  - Navigasi Gateway: *"Configure SMTP / Azure Gateway →"*
  - Label Tombol: *"Button Label"* (Placeholder: *"Send Email to Company"*, Hint: *"Example: Send Email to Company / Contact via Email"*)
  - Judul Form Modal: *"Form Modal Title"* (Placeholder: *"Contact Company / Report Issue"*, Hint: *"Example: Contact Company / Report Issue"*)
  - Daftar Kategori: *"Issue Categories List (Comma-separated)"* (Placeholder: *"General Inquiry, Services & Facilities, Technical Issue, Billing & Payment, Partnership, Other"*)
  - Template Auto-Reply: *"AI Confirmation Auto-Reply Template (Bot Auto-Reply)"*
  - Toggle Form In-App: *"Use In-App Funnel Form"*
- **Tab Layanan Email & SMTP (`EmailSmtpConfigPanel`)**:
  - Header: *"Email & SMTP Service Settings"*
  - Pilihan Gateway: *"1. Select Email Gateway / Provider"* (Microsoft Azure, Gmail SMTP, Custom SMTP)
  - Formulir Kredensial: Label kredensial Azure (Tenant ID, Client ID, Client Secret), Gmail (App Password), dan Custom SMTP (Host, Port, SSL Encryption).
  - Email Resmi Tenant: *"Recipient Support Email (Tenant Official Email)"*
  - Pengujian Langsung: *"Email Delivery Test (Live Test)"*, status pengiriman, dan tombol *"Save Email & SMTP Settings"*.

Ketika rute dibuka dengan Bahasa Indonesia (`/id/settings`), seluruh antarmuka tetap dirender dalam Bahasa Indonesia secara konsisten.

### 6. API Endpoints Terkait
- **`PUT /api/tenant`**: Menyimpan status toggle `humanHandoffEnabled`, `fallbackEmail`, bahasa tenant (`visitorConfig.language`), dan objek `visitorConfig.contactForm`.
- **`GET /api/widget/config` & `POST /api/widget/init`**: Mengirimkan properti `language`, `humanHandoffEnabled`, `fallbackEmail`, dan `contactForm` ke klien Web & Mobile SDK.
- **`POST /api/widget/contact-submit`**: Menerima pengiriman form, menyimpan percakapan laporan pengguna (dalam bahasa yang sesuai), memperbarui data prospek di `VisitorProfile`, dan menghasilkan balasan bot instan berdasarkan `autoReplyTemplate`.

### 7. Alur Penyimpanan Data Funnel & Kontak Pengunjung (Lead Profile)
Saat form funnel in-app dikirim oleh pengunjung melalui endpoint `POST /api/widget/contact-submit`:

1. **Tabel `ChatSession`**:
   - Jika sesi belum ada, sistem membuat sesi chat baru dengan status `"bot"` dan channel `"widget"`.
2. **Tabel `Message`**:
   - **Pesan User**: Menyimpan pesan ringkasan laporan ke riwayat chat:
     ```
     📝 [Laporan Masalah ke Perusahaan]
     • Kategori: <category>
     • Perusahaan: <company>
     • Nama: <name>
     • Email: <email>
     • Deskripsi: <description>
     ```
   - **Pesan Balasan Bot**: Menyimpan respons konfirmasi bot instan (berdasarkan `contactForm.autoReplyTemplate`).
3. **Tabel `VisitorProfile` (Penyimpanan Data Funnel & Lead Utama)**:
   - Data pengunjung di-upsert menggunakan relasi komposit `[tenantId, contactId]`:
     - `name`: Nama lengkap pengunjung.
     - `email`: Alamat email pengunjung.
     - `lastIntent`: Kategori masalah/inquiry yang dipilih (contoh: *"Pertanyaan Umum"*, *"Kendala Teknis"*).
     - `leadClassification`: Jika sebelumnya berstatus `"cold"`, otomatis dipromosikan ke `"support"`.
     - `leadScore`: Skor prospek otomatis ditingkatkan (+25 poin) untuk menandakan pengunjung aktif berinteraksi.
     - `sessions` & `messageCount`: Dihitung dan ditambah secara berkesinambungan (+2 pesan).
     - `lastSeenAt`: Dicatat waktu interaksi saat ini.
     - **Field `metadata` (JSON)**:
       - `company`: Nama perusahaan pengunjung.
       - `lastInquiryCategory`: Kategori masalah terakhir.
       - `lastInquiryDescription`: Teks lengkap detail deskripsi masalah yang dilaporkan.
       - `lastInquirySubmittedAt`: Timestamp ISO saat form dikirim.
4. **Notifikasi Internal Perusahaan (`fallbackEmail`) & Gateway Email**:
   - Sistem mengirimkan email ringkasan laporan ke alamat email resmi perusahaan yang ditentukan di `tenant.fallbackEmail`.
   - **Template Email Multibahasa (Berdasarkan `visitorConfig.language`)**:
     - **Bahasa Inggris (`en`, Default)**:
       - Subjek: `New Visitor Inquiry / Issue Report: [<category>] - <name>`
       - Header: *Visitor Inquiry & Issue Report*
       - Subtitle: *Received via CS Portal Widget & Mobile Funnel*
       - Salam: *Hello <Company> Support Team,*
       - Pengantar: *An application visitor has submitted an issue or inquiry report while live agent assistance is routed:*
       - Label Rincian: *Issue Category*, *Visitor Name*, *Company*, *Contact Email*, *Issue Description*, *Submission Time*.
       - Callout: *You can review the conversation history and this lead profile directly in the CRM Dashboard.*
       - Footer: *This email was sent automatically by CEOSUITE CS Portal AI Concierge (<PROVIDER>).*
     - **Bahasa Indonesia (`id`)**:
       - Subjek: `Laporan Baru Pengunjung: [<category>] - <name>`
       - Header: *Laporan Masalah / Kebutuhan Pengunjung*
       - Label Rincian: *Kategori Masalah*, *Nama Pengunjung*, *Perusahaan*, *Email Kontak*, *Deskripsi Masalah*, *Waktu Pengiriman*.
   - Pengiriman email diproses oleh **Email Service Gateway** ([src/lib/email-service.ts](file:///c:/Users/nanda/Documents/aiagent/agent-ai-komunikasi-crm/src/lib/email-service.ts)) dengan 3 opsi provider yang dapat dikonfigurasi di menu **Pengaturan > Email & SMTP**:
     1. **Microsoft Azure (Office 365 / Graph API OAuth2)**: Menggunakan Azure App Registration (`AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `AZURE_SENDER_EMAIL`, `AZURE_SENDER_NAME`, `AZURE_EMAIL_SUBJECT_PREFIX`).
     2. **Gmail SMTP**: Menggunakan akun Gmail / Google Workspace dengan Google App Password 16-karakter via `smtp.gmail.com`.
     3. **Custom SMTP Server**: Server SMTP standar (Mailgun, SendGrid, Amazon SES, dsb.) dengan konfigurasi host, port (587/465), enkripsi SSL/TLS, username, password, dan sender name.
     4. **Nonaktif / Simulasi (`none`)**: Mencatat pesan di server log tanpa pengiriman keluar.
   - Admin dapat melakukan uji coba pengiriman email langsung di dashboard melalui fitur **"Uji Coba Pengiriman Email (Live Test)"** (`POST /api/email/test`).
5. **Visibilitas di Dashboard CRM**:
   - Data profil pengunjung dan rekam jejak funnel dapat langsung dipantau di halaman **Pengunjung (Visitors)** (`/visitors`) dan halaman detail profil pengunjung (`/visitors/[id]`).

---

## 🤖 Rules Engine & Deteksi Handoff

Logika aturan pendeteksi handoff ditulis di `src/lib/ai-rules.ts`.

1. **Deteksi Kata Kunci Cepat (Tanpa LLM)**:
   Mengevaluasi kata kunci pemicu secara langsung sebelum memanggil LLM (mengurangi beban GPU). Contoh: `"bicara dengan agen"`, `"hubungi manusia"`, `"live agent"`, `"tidak mau bot"`.
2. **Deteksi via Flag LLM**:
   AI dilatih (via system prompt) untuk menyertakan tag khusus `[HANDOFF_REQUESTED]` jika percakapan mengarah pada permintaan bantuan manusia. Sistem kemudian mem-parsing tag tersebut dan mengalihkan status sesi ke `"queue"`.

---

## 🔌 Sinkronisasi Real-time (Socket.io)

### Penanganan Koneksi & Room
Pada [socket.ts](file:///c:/Users/nanda/Documents/aiagent/agent-ai-komunikasi-crm/src/lib/socket.ts), koneksi diatur berdasarkan peran pengakses pada default namespace `/` (dengan path `/api/socket`):
- **Widget Visitor**: Bergabung ke room `widget:${sessionId}` dan `session:${sessionId}`.
- **Human Agent**: Ditandai dengan adanya `userId` di query handshake, bergabung ke room `inbox:${tenantId}` dan `tenant:${tenantId}`.

### Alur Pesan Masuk & Tracking Pengunjung
1. **Widget POST `/api/widget/init`**: Mengambil konfigurasi widget & aturan tracking.
2. **Widget POST `/api/widget/visitor`**: Menyimpan data pasif pengunjung (device, OS, referrer).
3. **Widget POST `/api/widget/visitor/geo`**: Menyimpan data geolokasi pengunjung (jika diizinkan).
4. **Widget POST `/api/widget/message`**:
   - Menyimpan pesan pengguna.
   - Melakukan NLP Extraction dan AI Classification secara asinkron.
   - Mengirim event `widget_message` ke `inbox:${tenantId}` (agar semua dashboard agen melihat pesan real-time).
   - Mengirim event `user_message` ke `session:${sessionId}` (memperbarui chat box agen).
5. **Dashboard GET `/api/visitors` & `/api/visitors/[id]`**: Menampilkan profil lengkap pengunjung, riwayat sesi, dan lead score.
6. **Balasan AI (Bot Reply)**:
   - Next.js memanggil FastAPI `/generate`.
   - Hasil balasan disimpan di database.
   - Mengirim event `bot_reply` ke `session:${sessionId}`.
7. **Pengambilalihan Sesi (Claim Session)**:
   - Agen mengklik tombol "**Ambil Percakapan**" (memicu `POST /api/chat/sessions/[sessionId]/claim`) atau langsung mengirim pesan.
   - Status sesi diubah menjadi `"agent"` dan `assignedAgentId` diisi.
   - Sistem mengirim event `agent_joined` ke widget dan memberitahu dashboard agen lainnya via `session_updated`.

---

## 🚀 Panduan Setup & Menjalankan Aplikasi

### 1. Prasyarat Sistem
- Windows OS
- Node.js v20+ & PostgreSQL
- Python 3.10 atau 3.11
- NVIDIA GPU dengan driver terbaru & CUDA Toolkit (disarankan CUDA 12.1)

### 2. Konfigurasi Environment (`.env`)
Pastikan variabel `DATABASE_URL` mengarah ke database PostgreSQL aktif (misal port default 5432):
```env
DATABASE_URL="postgresql://postgres:password@192.168.20.242:5432/postgres?schema=crm"

# Local AI Engine Proxy (Opsional jika menggunakan fast-path intent matching)
LOCAL_LLM_URL="http://localhost:8000/generate"
```

### 3. Sinkronisasi Skema Database & Knowledge Base
Setelah koneksi database PostgreSQL aktif dan dapat dijangkau:
```powershell
# Terapkan skema database Prisma
npx prisma db push

# Lakukan seeding akun tenant default & data awal
npm run db:seed

# Sinkronisasi knowledge base dan intent FAQ (230 intent & 71 KB pusat layanan)
node scripts/docker/sync-knowledge.js
```

### 4. Setup AI Engine (FastAPI - Opsional GPU Mode)
Buka terminal baru di sistem Anda:
```powershell
# Masuk ke folder AI Engine
cd ai-engine

# Buat & aktifkan virtual environment
python -m venv venv
.\venv\Scripts\activate

# Install PyTorch CUDA (Sesuaikan dengan versi CUDA Anda)
pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install requirements
pip install -r requirements.txt

# Jalankan server uvicorn
uvicorn main:app --host 0.0.0.0 --port 8000
```
*Pastikan terminal log menampilkan: `[AI Engine] Model loaded successfully on cuda!`.*

### 5. Jalankan Next.js Web App & Integrasi Mobile SDK
Di terminal root proyek Next.js:
```powershell
# Jalankan server development
npm run dev
```

Buka widget pengujian di `http://localhost:8201/widget-ui` dan masuk ke dashboard agen di `http://localhost:8201/inbox`.

#### Menghubungkan Aplikasi Mobile Flutter (`cs_portal_mobile`):
Gunakan ADB reverse agar perangkat Android fisik dapat mengakses server Next.js di `127.0.0.1:8201`:
```powershell
adb reverse tcp:8201 tcp:8201
```
Pastikan `.env` di `cs_portal_mobile` mengarah ke:
```env
AI_AGENT_URL=http://127.0.0.1:8201
```

---

## 🛡️ Pengerasan Keamanan & Validasi API (Agency-Agents Review)
1. **Validasi Payload JSON**: Endpoint `POST /api/widget/message` dilengkapi dengan isolasi `try/catch` untuk parsing JSON mentah. Payload malformed atau terpotong ditangani secara elegan dengan `HTTP 400 Bad Request` (`{ "error": "Invalid JSON payload" }`) dan tidak menghasilkan unhandled crash `HTTP 500`.
2. **Dynamic Variables di Docker**: Seluruh kredensial database di `docker-compose.yml` dievaluasi secara dinamis dari `.env` (`${POSTGRES_USER}`, `${POSTGRES_PASSWORD}`, `${POSTGRES_DB}`, `${POSTGRES_PORT}`) tanpa hardcode rahasia.
3. **Penyelarasan Port Docker Host**: Menggunakan port `5444:5432` untuk mencegah tabrakan dengan service Windows lokal `postgresql-x64-17` pada port 5432.
4. **Verifikasi Otomatis**: Proyek lolos 100% pengujian:
   - `npm run test:api`: 156/156 passed (14 test suites).
   - `npm run type-check`: 0 TypeScript errors.

