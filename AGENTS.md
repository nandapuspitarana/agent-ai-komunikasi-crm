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

### 4. API Endpoints Terkait
- **`PUT /api/tenant`**: Menyimpan status toggle `humanHandoffEnabled`, `fallbackEmail`, dan objek `visitorConfig.contactForm`.
- **`GET /api/widget/config` & `POST /api/widget/init`**: Mengirimkan properti `humanHandoffEnabled`, `fallbackEmail`, dan `contactForm` ke klien Web & Mobile SDK.
- **`POST /api/widget/contact-submit`**: Menerima pengiriman form, menyimpan percakapan laporan pengguna, memperbarui data prospek di `VisitorProfile`, dan menghasilkan balasan bot instan berdasarkan `autoReplyTemplate`.

### 5. Alur Penyimpanan Data Funnel & Kontak Pengunjung (Lead Profile)
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
Pastikan variabel berikut ada di file `.env` root proyek Anda:
```env
LOCAL_LLM_URL="http://localhost:8000/generate"
```

### 3. Setup AI Engine (FastAPI)
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

### 4. Jalankan Next.js Web App
Di terminal root proyek Next.js:
```powershell
# Terapkan perubahan database (jika belum)
npm run db:push

# Jalankan server development
npm run dev
```
Buka widget pengujian di `http://localhost:8201/widget-ui` dan masuk ke dashboard agen di `http://localhost:8201/inbox`.

