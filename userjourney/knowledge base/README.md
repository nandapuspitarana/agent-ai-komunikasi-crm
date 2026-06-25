# Panduan Konversi Knowledge Base XML (WordPress WXR) ke Markdown

Direktori ini berisi data *Knowledge Base* yang diekstrak dari website WordPress CEO SUITE (berupa file `.xml` hasil export). Mengingat sistem AI RAG (Retrieval-Augmented Generation) tidak dapat memproses file XML WordPress secara optimal karena banyaknya metadata dan tag HTML, maka diperlukan konversi ke format Markdown (`.md`).

## Proses Konversi

Kami menggunakan script Python khusus (`convert_xml_to_md.py`) yang diletakkan di root direktori CRM. Script ini bertugas untuk:
1. Membaca file `.xml` export dari WordPress.
2. Membersihkan *invalid HTML* yang ada di awal file.
3. Mengekstrak data spesifik untuk post_type `office`, meliputi:
   - Nama Lokasi
   - Deskripsi Singkat
   - Alamat, Email, Telepon, WhatsApp
   - Daftar Fasilitas (Amenities)
   - Daftar Layanan & Harga
4. Menyimpannya menjadi file `.md` yang bersih.

## Lokasi File

- **File Source (XML):** `ceosuite.WordPress.2026-06-24-location.xml`
- **Script Konverter:** `../../convert_xml_to_md.py`
- **Output Direktori (Markdown):** `md_locations/`

## Cara Menggunakan Script Konverter

Jika Anda memiliki data XML terbaru dari WordPress, Anda bisa melakukan proses ekstraksi ulang dengan langkah berikut:

1. Buka terminal di root folder `agent-ai-komunikasi-crm`.
2. Pastikan file XML terbaru sudah diletakkan di folder `userjourney/knowledge base/`.
3. Jalankan script Python:
   ```bash
   python convert_xml_to_md.py
   ```
4. Hasil konversi akan otomatis meng-overwrite atau menambahkan file baru di dalam folder `md_locations/`.

## Mengunggah ke Knowledge Base

Setelah file berada di dalam folder `md_locations/`, Anda bisa mengunggah file-file Markdown tersebut ke dashboard AI Agent (menu Knowledge Base / Documents) agar bot AI memiliki informasi yang selalu *up-to-date* terkait lokasi, fasilitas, dan harga.
