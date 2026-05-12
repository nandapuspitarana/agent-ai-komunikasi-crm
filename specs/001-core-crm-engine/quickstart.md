# Quickstart Guide

## Prerequisites
- Node.js 18+
- PostgreSQL database
- Redis instance (Upstash or local)

## Setup Steps

1. **Install Dependencies**
   ```bash
   npm install
   cd widget && npm install
   ```

2. **Environment Configuration**
   Copy `.env.example` to `.env` and fill in the required variables:
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/crm"
   REDIS_URL="redis://localhost:6379"
   AES_ENCRYPTION_KEY="your-32-byte-secret-key"
   ```

3. **Database Initialization**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Run Development Servers**
   To start the Next.js app, BullMQ workers, and Socket.io server concurrently:
   ```bash
   npm run dev
   ```

5. **Build Widget (Optional)**
   If working on the standalone widget package:
   ```bash
   cd widget
   npm run build
   ```
