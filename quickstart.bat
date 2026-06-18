@echo off
setlocal EnableDelayedExpansion

echo.
echo ============================================================
echo   Agent AI Komunikasi CRM ^| Quick Start (Windows)
echo   Next.js port: 8201  ^|  Node.js 20+
echo ============================================================
echo.

:: ── 1. Check Node.js ─────────────────────────────────────────
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan. Instal dari https://nodejs.org/
    pause & exit /b 1
)
echo [OK] Node.js ditemukan.

:: ── 2. Check Docker ──────────────────────────────────────────
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker tidak ditemukan atau tidak berjalan.
    echo         Instal Docker Desktop: https://www.docker.com/products/docker-desktop/
    pause & exit /b 1
)
echo [OK] Docker berjalan.

:: ── 3. Setup .env ─────────────────────────────────────────────
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo.
        echo [PERLU DIISI] File .env dibuat dari .env.example.
        echo              Periksa dan sesuaikan nilai berikut di .env:
        echo                DATABASE_URL    = postgresql://user:pass@localhost:5444/crm
        echo                AUTH_SECRET     = secret min 32 karakter
        echo                NEXTAUTH_URL    = http://localhost:8201
        echo                AGENT_PROXY_URL = http://127.0.0.1:8200
        echo.
        echo   Tekan sembarang tombol setelah memeriksa .env ...
        pause >nul
    ) else (
        echo [ERROR] .env.example tidak ditemukan.
        pause & exit /b 1
    )
) else (
    echo [OK] File .env sudah ada.
)

:: ── 4. Start Docker services ──────────────────────────────────
echo [INFO] Menjalankan Postgres + Redis via Docker Compose...
docker compose up -d postgres redis
if %errorlevel% neq 0 (
    echo [ERROR] Gagal menjalankan Docker Compose.
    pause & exit /b 1
)
echo [OK] Postgres (port 5444) dan Redis (port 5448) berjalan.

:: ── 5. Tunggu Postgres ───────────────────────────────────────
echo [INFO] Menunggu Postgres siap (max 15 detik)...
set /a tries=0
:wait_postgres
timeout /t 1 /nobreak >nul
docker exec crm-postgres pg_isready -U user -d crm >nul 2>&1
if %errorlevel% equ 0 goto postgres_ready
set /a tries=%tries%+1
if %tries% lss 15 goto wait_postgres
echo [ERROR] Postgres tidak siap setelah 15 detik.
pause & exit /b 1
:postgres_ready
echo [OK] Postgres siap.

:: ── 6. Install npm dependencies ───────────────────────────────
if not exist "node_modules" (
    echo [INFO] Menginstall Node.js dependencies...
    call npm install
    if !errorlevel! neq 0 ( echo [ERROR] npm install gagal. & pause & exit /b 1 )
    echo [OK] Node dependencies terinstall.
) else (
    echo [OK] node_modules sudah ada.
)

:: ── 7. Prisma db:push ─────────────────────────────────────────
echo [INFO] Menerapkan Prisma schema ke database...
call npm run db:push
if %errorlevel% neq 0 ( echo [ERROR] Prisma db:push gagal. & pause & exit /b 1 )
echo [OK] Schema berhasil diterapkan.

:: ── 8. Seed ──────────────────────────────────────────────────
echo [INFO] Menjalankan seed data...
call npm run db:seed
echo [OK] Seed selesai (atau sudah ada sebelumnya).

:: ── 9. Start dev server ───────────────────────────────────────
echo.
echo ============================================================
echo   Menjalankan Next.js CRM Dev Server...
echo.
echo   Dashboard  : http://localhost:8201
echo   Inbox      : http://localhost:8201/inbox
echo   Widget UI  : http://localhost:8201/widget-ui
echo.
echo   CATATAN: Pastikan AI Agent Proxy berjalan di port 8200
echo   Tekan Ctrl+C untuk menghentikan server.
echo ============================================================
echo.
call npm run dev
