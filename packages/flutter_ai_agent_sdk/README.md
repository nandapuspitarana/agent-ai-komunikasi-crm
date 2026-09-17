# 📱 Flutter AI Agent SDK

SDK Client & UI Kit Flutter untuk mengintegrasikan **AI Agent Chatbot & CRM Support** ke dalam aplikasi mobile CEO Suite Portal (`cs_portal_mobile`).

---

## 🌟 Fitur Utama
- **Native 60/120 FPS UI Kit**: Tampilan chat executive red (`#801517`) mulus tanpa webview.
- **5 Response Types Support**:
  1. 💬 **Text Only**: Teks percakapan standar dengan formatting markdown & URL.
  2. 🔘 **Quick Reply Options**: Tombol opsi cepat (*horizontal chips* dengan pipe parsing `Label|SentValue`).
  3. 🃏 **Info Card**: Kartu visual featured lokasi/layanan dengan tombol link eksternal.
  4. 📋 **Lead Form**: Formulir penangkap prospek dinamis terhubung webhook.
  5. 🙋 **Human Handoff**: Banner otomatis ketika percakapan dialihkan ke Customer Service.
- **Security & Anti-Flood Built-in**:
  - `ContentSanitizer`: Perlindungan dari XSS dan script injection berbahaya.
  - `RateLimiter`: Pembatasan pengiriman bertubi-tubi (*anti-flood throttle* 1.2s).
- **State Machine Agnostik**: Menggunakan `AiChatController` berbasis `ChangeNotifier` sehingga kompatibel 100% dengan Bloc, Riverpod, Provider, atau GetX.

---

## 🚀 Panduan Integrasi di `cs_portal_mobile`

### 1. Tambahkan Dependency ke `pubspec.yaml`

Buka file `cs_portal_mobile/pubspec.yaml`, lalu tambahkan di bawah `dependencies:`:

```yaml
dependencies:
  flutter:
    sdk: flutter

  # AI Agent SDK Client
  flutter_ai_agent_sdk:
    path: ../../../aiagent/agent-ai-komunikasi-crm/packages/flutter_ai_agent_sdk
```

Lalu jalankan:
```bash
fvm flutter pub get
```

---

### 2. Tambahkan Environment Variable ke `.env`

Buka file `.env` di root proyek `cs_portal_mobile`:

```env
# AI Agent CRM Configuration
AI_AGENT_API_URL=https://cb242.ceosuite.com
AI_AGENT_TENANT_ID=default-tenant
```

---

### 3. Cara Membuka Halaman Chat di Flutter

Anda dapat memanggil `AiChatView` di mana saja (misalnya dari tombol bantuan di AppBar, Dashboard, atau Floating Action Button):

```dart
import 'package:flutter/material.dart';
import 'package:flutter_ai_agent_sdk/flutter_ai_agent_sdk.dart';

void openAiSupportChat(BuildContext context) {
  // 1. Siapkan konfigurasi
  const config = AiAgentConfig(
    apiUrl: 'https://cb242.ceosuite.com', // atau ambil dari dotenv
    tenantId: 'default-tenant',
    botName: 'CEO Suite Assistant',
    primaryColor: Color(0xFF801517), // Executive Red
  );

  // 2. Buat API Client & Controller
  final apiClient = AiAgentApiClient(config: config);
  final controller = AiChatController(
    apiClient: apiClient,
    config: config,
    contactId: 'user_odoo_id_or_email', // Opsional: kaitkan dengan profil pengguna login
  );

  // 3. Buka sebagai Full Page Navigation atau Modal Bottom Sheet
  Navigator.of(context).push(
    MaterialPageRoute(
      builder: (_) => AiChatView(
        controller: controller,
        onLaunchUrl: (url) {
          // Buka link eksternal menggunakan url_launcher
        },
      ),
    ),
  );
}
```

---

## 🧪 Standar Pengujian Komprehensif (Passed 100%)

Sesuai konvensi `cs_portal_mobile`, test suite dibagi ke dalam 3 taksonomi pengujian:

### 1. Functional Testing (`test/functional/`)
* **`TEST-AI-U01` s/d `TEST-AI-U05`**: Serialisasi & parsing model data (`QuickReplyOption`, `CardPayload`, `FormPayload`, `[HANDOFF_REQUESTED]`).
* **`TEST-AI-U06` s/d `TEST-AI-U10`**: API Client REST calls, retry otomatis pada *network drop*, dan penanganan HTTP 500.
* **`TEST-AI-U11` s/d `TEST-AI-U15`**: State machine controller, *optimistic UI update*, dan *session restart*.
* **`TEST-AI-W01` s/d `TEST-AI-W04`**: Widget tests untuk `AiChatView`, pengiriman pesan via TextField, klik Quick Reply chip, dan tampilan Handoff Banner.

### 2. Performance Testing (`test/performance/`)
* **`TEST-AI-PERF01`**: Benchmark rendering 500+ pesan pada `ListView.builder` tanpa *frame drop* (<16ms per frame untuk 60 FPS).
* **`TEST-AI-PERF02`**: Isolasi repainting tiap bubble dengan `RepaintBoundary` agar scrolling bebas *jank*.
* **`TEST-AI-PERF03`**: Verifikasi pembersihan referensi & listener pada `controller.dispose()` untuk mencegah *memory leak*.

### 3. Security Testing (`test/security/`)
* **`TEST-AI-SEC01` s/d `TEST-AI-SEC03`**: Pembersihan tag `<script>`, `<iframe>`, dan *event handlers* (`onerror`, `onclick`) oleh `ContentSanitizer`.
* **`TEST-AI-SEC04`**: Validasi `isSafeUrl` yang menolak skema berbahaya (`javascript:`, `data:`, `file:`).
* **`TEST-AI-SEC05` s/d `TEST-AI-SEC07`**: Pengujian *RateLimiter* anti-flood yang memblokir klik spam bertubi-tubi dalam interval 1.2 detik.

### Menjalankan Test Suite
```bash
fvm flutter test
```
*Hasil pengujian saat ini: **29/29 tests passed (100%)**.*
