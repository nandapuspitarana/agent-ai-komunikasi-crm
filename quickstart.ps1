<#
.SYNOPSIS
    Agent AI Komunikasi CRM - Quick Start (PowerShell)
    Setup pertama kali: jalankan Docker (Postgres + Redis), push schema, seed data, lalu jalankan Next.js dev server.
.USAGE
    .\quickstart.ps1
#>

$ErrorActionPreference = "Stop"
$CrmPort = 8201

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Agent AI Komunikasi CRM  |  Quick Start" -ForegroundColor Cyan
Write-Host "  Next.js port: $CrmPort  |  Node.js 20+" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Check Node.js ─────────────────────────────────────────────────────────
try {
    $nodeVersion = node --version 2>&1
    Write-Host "[OK] Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js tidak ditemukan. Instal Node.js 20+:" -ForegroundColor Red
    Write-Host "        https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# ── 2. Check Docker ──────────────────────────────────────────────────────────
try {
    docker info >$null 2>&1
    Write-Host "[OK] Docker berjalan." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker tidak ditemukan atau tidak berjalan." -ForegroundColor Red
    Write-Host "        Instal Docker Desktop: https://www.docker.com/products/docker-desktop/" -ForegroundColor Yellow
    exit 1
}

# ── 3. Setup .env ─────────────────────────────────────────────────────────────
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host ""
        Write-Host "╔══════════════════════════════════════════════════════════╗" -ForegroundColor Yellow
        Write-Host "║  PERHATIAN: File .env baru dibuat dari .env.example     ║" -ForegroundColor Yellow
        Write-Host "║                                                          ║" -ForegroundColor Yellow
        Write-Host "║  Silakan periksa nilai berikut di .env:                 ║" -ForegroundColor Yellow
        Write-Host "║    DATABASE_URL    = postgresql://user:pass@...         ║" -ForegroundColor Yellow
        Write-Host "║    AUTH_SECRET     = secret min 32 karakter             ║" -ForegroundColor Yellow
        Write-Host "║    NEXTAUTH_URL    = http://localhost:8201               ║" -ForegroundColor Yellow
        Write-Host "║    AGENT_PROXY_URL = http://127.0.0.1:8200              ║" -ForegroundColor Yellow
        Write-Host "╚══════════════════════════════════════════════════════════╝" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "  Tekan Enter untuk melanjutkan setelah mengisi .env..." -ForegroundColor Cyan
        Read-Host
    } else {
        Write-Host "[ERROR] .env.example tidak ditemukan." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[OK]  File .env sudah ada." -ForegroundColor Green
}

# ── 4. Start Docker services (Postgres + Redis) ───────────────────────────────
Write-Host "[INFO] Menjalankan Postgres + Redis via Docker Compose..." -ForegroundColor Yellow
docker compose up -d postgres redis
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Gagal menjalankan Docker Compose." -ForegroundColor Red
    exit 1
}
Write-Host "[OK]  Postgres (port 5444) dan Redis (port 5448) berjalan." -ForegroundColor Green

# ── 5. Tunggu Postgres siap ──────────────────────────────────────────────────
Write-Host "[INFO] Menunggu Postgres siap..." -ForegroundColor Yellow
$retries = 15
for ($i = 1; $i -le $retries; $i++) {
    $ready = docker exec crm-postgres pg_isready -U user -d crm 2>&1
    if ($ready -match "accepting connections") {
        Write-Host "[OK]  Postgres siap." -ForegroundColor Green
        break
    }
    if ($i -eq $retries) {
        Write-Host "[ERROR] Postgres tidak siap setelah $retries detik." -ForegroundColor Red
        exit 1
    }
    Start-Sleep -Seconds 1
}

# ── 6. Install Node dependencies ─────────────────────────────────────────────
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Menginstall Node.js dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Gagal install npm packages." -ForegroundColor Red
        exit 1
    }
    Write-Host "[OK]  Node dependencies terinstall." -ForegroundColor Green
} else {
    Write-Host "[OK]  node_modules sudah ada (skip npm install)." -ForegroundColor Green
}

# ── 7. Push Prisma schema ─────────────────────────────────────────────────────
Write-Host "[INFO] Menerapkan Prisma schema ke database..." -ForegroundColor Yellow
npm run db:push
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Prisma db:push gagal." -ForegroundColor Red
    exit 1
}
Write-Host "[OK]  Schema berhasil diterapkan." -ForegroundColor Green

# ── 8. Seed database (hanya jika tabel kosong) ───────────────────────────────
Write-Host "[INFO] Menjalankan seed data..." -ForegroundColor Yellow
npm run db:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Seed mungkin sudah dijalankan sebelumnya (aman diabaikan)." -ForegroundColor Yellow
} else {
    Write-Host "[OK]  Seed selesai." -ForegroundColor Green
}

# ── 9. Start Next.js dev server ───────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Menjalankan Next.js CRM Dev Server..." -ForegroundColor Cyan
Write-Host ""
Write-Host "  Dashboard  : http://localhost:$CrmPort" -ForegroundColor White
Write-Host "  Inbox      : http://localhost:$CrmPort/inbox" -ForegroundColor White
Write-Host "  Widget UI  : http://localhost:$CrmPort/widget-ui" -ForegroundColor White
Write-Host "  Widget.js  : http://localhost:$CrmPort/widget.js" -ForegroundColor White
Write-Host ""
Write-Host "  CATATAN: Pastikan AI Agent Proxy sudah berjalan di port 8200" -ForegroundColor Yellow
Write-Host "           Jalankan: cd ..\ai-agent-proxy && .\quickstart.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Tekan Ctrl+C untuk menghentikan server." -ForegroundColor Gray
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

npm run dev
