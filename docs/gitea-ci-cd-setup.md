# 🚀 Panduan CI/CD Gitea Actions: crm-custom-dashboard

Dokumentasi ini menjelaskan konfigurasi alur kerja **CI (Continuous Integration)** dan **CD (Continuous Deployment)** untuk repositori `crm-custom-dashboard` di [Gitea CEOSUITE](http://git.ceosuite.com:3000/nanda/crm-custom-dashboard).

---

## 📌 Ringkasan Alur CI/CD

| Workflow | File Lokasi | Pemicu (Trigger) | Fungsi & Tanggung Jawab |
| :--- | :--- | :--- | :--- |
| **CI (Continuous Integration)** | [ci.yml](file:///c:/Users/nanda/Documents/aiagent/agent-ai-komunikasi-crm/.gitea/workflows/ci.yml) | Push ke semua branch (`**`) & Pull Request | 1. Validasi TypeScript (`npm run type-check`)<br>2. Unit & Integration test (`npm run test:api`)<br>3. Verifikasi build Next.js (`npm run build`)<br>4. Analisis & pengujian Flutter SDK (`flutter analyze`, `flutter test`) |
| **CD (Continuous Deployment)** | [deploy.yml](file:///c:/Users/nanda/Documents/aiagent/agent-ai-komunikasi-crm/.gitea/workflows/deploy.yml) | Push ke branch `ceosuite` & Manual trigger (*workflow_dispatch*) | 1. Menjalankan *Pre-Deploy Validation* (pengujian lolos)<br>2. Remote SSH ke server target `192.168.20.242`<br>3. `git pull` perubahan terbaru pada branch `ceosuite`<br>4. Build & restart container `docker compose up -d web`<br>5. Pemeriksaan status endpoint `/api/version` |

---

## 🔐 1. Konfigurasi Secrets di Gitea

Buka menu repositori di Gitea:  
👉 **`http://git.ceosuite.com:3000/nanda/crm-custom-dashboard/settings/actions/secrets`**

Tambahkan Secret terenkripsi berikut:

| Secret Name | Nilai Rekomendasi | Deskripsi / Catatan |
| :--- | :--- | :--- |
| `SSH_HOST` | `192.168.20.242` | IP address atau hostname server target |
| `SSH_USERNAME` | `nanda` | Akun pengguna SSH di server |
| `SSH_PASSWORD` | `<password-user-ssh>` | Password otentikasi SSH (contoh: password user `nanda`) |
| `SSH_KEY` | _(opsional)_ | Private key SSH (`id_rsa` / `id_ed25519`) jika menggunakan key-based auth |
| `SSH_PORT` | `22` | Port daemon SSH server |
| `SSH_DEPLOY_PATH` | `/opt/crm-custom-dashboard` | Lokasi direktori repositori di server target |
| `SUDO_PASSWORD` | `<password-sudo>` | Password sudo untuk menjalankan perintah `docker compose` jika dibutuhkan |

> 💡 **Catatan**: Jika `SSH_HOST`, `SSH_USERNAME`, atau `SSH_DEPLOY_PATH` tidak diisi di Gitea Secrets, workflow telah memiliki nilai *fallback default* ke `192.168.20.242`, `nanda`, dan `/opt/crm-custom-dashboard`.

---

## 🛠️ 2. Langkah Detail yang Dijalankan oleh Workflow

### A. Tahap Validasi (Pre-Deploy)
Sebelum menyentuh server produksi/UAT, runner CI menjalankan:
1. `npm ci` untuk menginstal dependensi bersih dari `package-lock.json`.
2. `npx prisma generate` untuk meregenerasi tipe Prisma Client.
3. `npm run type-check` untuk memastikan tidak ada kesalahan TypeScript.
4. `npm run test:api` untuk menjalankan seluruh 136+ unit test (Vitest).

Jika salah satu tahap di atas gagal (merah), deployment ke server **otomatis dibatalkan** sehingga server terlindungi dari kode yang rusak.

### B. Tahap Deployment di Server Target (Remote SSH)
Saat tahap validasi berhasil, action `appleboy/ssh-action` masuk ke server `192.168.20.242` dan mengeksekusi:

```bash
# 1. Masuk ke direktori aplikasi
cd /opt/crm-custom-dashboard

# 2. Ambil perubahan terbaru dari branch ceosuite
git config --global --add safe.directory /opt/crm-custom-dashboard || true
git fetch ceosuite || git fetch origin
git checkout ceosuite
git pull ceosuite ceosuite || git pull origin ceosuite

# 3. Build container web terbaru
docker compose build web

# 4. Restart container secara zero-downtime / in-place
docker compose up -d web

# 5. Health Check verifikasi versi
curl -s http://127.0.0.1:8201/api/version
```

---

## 🎯 3. Cara Menjalankan Deployment Manual (One-Click Deploy)

Selain berjalan otomatis saat ada `git push` ke branch `ceosuite`, Anda dapat memicu deployment kapan saja secara manual:

1. Buka repositori di Gitea: [`http://git.ceosuite.com:3000/nanda/crm-custom-dashboard/actions`](http://git.ceosuite.com:3000/nanda/crm-custom-dashboard/actions).
2. Di sebelah kiri, pilih workflow **`Deploy to Server (CD)`**.
3. Klik tombol **Run workflow** (di sudut kanan atas).
4. Pilih branch **`ceosuite`**, lalu klik tombol **Run workflow**.
5. Pantau log eksekusi build dan reload container secara langsung di browser.

---

## 🩺 4. Verifikasi Hasil Deployment

Setelah workflow selesai, Anda dapat memverifikasi bahwa aplikasi telah aktif dengan membuka:

- **Browser**: [http://192.168.20.242:8201](http://192.168.20.242:8201) atau [https://cb242.ceosuite.com](https://cb242.ceosuite.com)
- **API Endpoint Version**:
  ```bash
  curl http://192.168.20.242:8201/api/version
  ```
  Output JSON akan menampilkan versi `CRM_VERSION`, hash commit git terbaru, dan waktu build aplikasi.
