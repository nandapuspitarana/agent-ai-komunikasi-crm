<!-- 
Sync Impact Report:
- Version change: 1.0.0 → 1.1.0
- List of modified principles:
  - Added: I. Platform Agnostic (Core Service)
  - Added: II. Embeddable Chat Widget
  - Modified: III. Visual Flow Builder (added no-code emphasis)
  - Modified: IV. SaaS Multi-Tenancy (added auto-scaling and strict agent control)
  - Added: V. Webhook & Sync Engine
  - Added: VI. Developer Friendly
  - Modified: VII. Design Language (added "invisible" and shadow DOM rules)
- Added sections: None
- Removed sections: Previous tech stack constraints that are now superseded by API-First design.
- Templates requiring updates:
  - .specify/templates/plan-template.md (✅ updated)
  - .specify/templates/spec-template.md (✅ updated)
  - .specify/templates/tasks-template.md (✅ updated)
- Follow-up TODOs: None
-->
# Modern SaaS CRM (Omnichannel & Cross-Platform) Constitution

## Core Principles

### I. Platform Agnostic (Core Service)
CRM harus dibangun sebagai API-First Web Service. Inti sistem (Engine) tidak boleh terikat pada satu platform. Harus bisa dikonsumsi oleh WordPress Plugin, Shopify App, atau Custom Web melalui JS Snippet.

### II. Embeddable Chat Widget
Widget chat harus ringan (lightweight), terisolasi menggunakan Shadow DOM agar tidak merusak CSS website klien, dan mendukung kustomisasi melalui dashboard utama (White-label ready).

### III. Visual Flow Builder
Antarmuka pembuatan flow yang intuitif dengan kemampuan integrasi WhatsApp dan Google Sheets tanpa perlu menyentuh kode (Kommunicate Style).

### IV. SaaS Multi-Tenancy
Sistem manajemen akun yang mampu menangani ribuan tenant dengan kontrol akses agen yang ketat dan skalabilitas otomatis.

### V. Webhook & Sync Engine
Mekanisme sinkronisasi data real-time antara CRM dengan platform pihak ketiga (seperti update stok dari Google Sheets ke chat flow secara otomatis).

### VI. Developer Friendly
Menyediakan SDK JavaScript dan dokumentasi API yang lengkap agar pengguna teknis bisa membuat integrasi custom sendiri.

### VII. Design Language
Modern, clean, dan "invisible" (widget harus menyatu alami dengan brand website pengguna).

## Governance

Amendments require documentation, approval, and a migration plan. All PRs/reviews MUST verify compliance with the Core Principles. Complexity must be justified based on requirements.

**Version**: 1.1.0 | **Ratified**: 2026-04-30 | **Last Amended**: 2026-04-30
