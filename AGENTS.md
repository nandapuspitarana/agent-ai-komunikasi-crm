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

### Model `ChatSession`
Melacak status alur percakapan:
- `status` (String, default: `"bot"`): Status sesi chat, bernilai `"bot"`, `"queue"` (menunggu agen), atau `"agent"` (ditangani manusia).
- `handoffRequested` (Boolean, default: `false`): Menandakan jika pengguna widget meminta berbicara dengan manusia.
- `assignedAgentId` (String, opsional): ID Agen manusia yang mengambil alih percakapan.
- `updatedAt` (DateTime): Waktu pembaruan sesi (otomatis menggunakan `@updatedAt`).

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

### Alur Pesan Masuk
1. **Widget POST `/api/widget/message`**:
   - Menyimpan pesan pengguna.
   - Mengirim event `widget_message` ke `inbox:${tenantId}` (agar semua dashboard agen melihat pesan real-time).
   - Mengirim event `user_message` ke `session:${sessionId}` (memperbarui chat box agen).
2. **Balasan AI (Bot Reply)**:
   - Next.js memanggil FastAPI `/generate`.
   - Hasil balasan disimpan di database.
   - Mengirim event `bot_reply` ke `session:${sessionId}`.
3. **Pengambilalihan Sesi (Claim Session)**:
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

