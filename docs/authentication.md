# Authentication System - ZetaCRM

## Overview
Sistem autentikasi menggunakan NextAuth.js v5 dengan credential-based authentication dan role-based access control (RBAC).

## User Roles

### 1. SUPER_ADMIN
- Akses penuh ke seluruh sistem
- Tidak terikat ke tenant tertentu
- Dapat mengelola semua tenant dan user

### 2. AGENT
- Customer support agent
- Terikat ke tenant tertentu
- Akses ke inbox, chat sessions, dan customer management

### 3. BUSINESS_PARTNER
- Mitra bisnis
- Terikat ke tenant tertentu
- Akses terbatas sesuai partnership agreement

## Test Accounts

Setelah menjalankan seed, Anda dapat login dengan akun berikut:

### Super Admin
- **Email**: admin@zetacrm.com
- **Password**: password123
- **Role**: SUPER_ADMIN

### Agent
- **Email**: agent@zetacrm.com
- **Password**: password123
- **Role**: AGENT

### Business Partner
- **Email**: partner@zetacrm.com
- **Password**: password123
- **Role**: BUSINESS_PARTNER

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Setup environment variables** (sudah ada di `.env`):
   ```
   DATABASE_URL="postgresql://user:pass@localhost:5444/crm?schema=public"
   AUTH_SECRET="your-secret-key-change-this-in-production-min-32-chars"
   NEXTAUTH_URL="http://localhost:3101"
   ```

3. **Push database schema**:
   ```bash
   npm run db:push
   ```

4. **Seed database dengan test users**:
   ```bash
   npm run db:seed
   ```

5. **Run development server**:
   ```bash
   npm run dev
   ```

6. **Access aplikasi**:
   - Open browser: http://localhost:3101
   - Login dengan salah satu test account di atas

## Protected Routes

Routes berikut dilindungi dan memerlukan autentikasi:
- `/inbox` - Inbox dashboard
- `/dashboard` - Main dashboard
- `/agent` - Agent configuration
- `/settings` - Settings page

User yang belum login akan diredirect ke `/login`.

## API Routes

### Authentication
- `POST /api/auth/signin` - Login
- `POST /api/auth/signout` - Logout
- `GET /api/auth/session` - Get current session

## Database Schema

### User Model
```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  name      String
  role      UserRole @default(AGENT)
  tenantId  String?
  tenant    Tenant?  @relation(fields: [tenantId], references: [id])
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum UserRole {
  SUPER_ADMIN
  AGENT
  BUSINESS_PARTNER
}
```

## Session Management

- Strategy: JWT (JSON Web Token)
- Session data includes:
  - `user.id` - User ID
  - `user.email` - User email
  - `user.name` - User name
  - `user.role` - User role (SUPER_ADMIN, AGENT, BUSINESS_PARTNER)
  - `user.tenantId` - Associated tenant ID (null for SUPER_ADMIN)

## Middleware Protection

File `src/middleware.ts` handles:
- Route protection for authenticated routes
- Redirect logged-in users away from login page
- Inject tenant context into request headers

## Security Features

- Password hashing with bcryptjs (10 salt rounds)
- JWT-based session management
- Role-based access control
- Middleware route protection
- Secure environment variables

## Next Steps

Untuk menambahkan authorization berdasarkan role, Anda dapat:

1. **Check role di server component**:
   ```typescript
   import { auth } from '@/auth';
   
   export default async function AdminPage() {
     const session = await auth();
     
     if (session?.user?.role !== 'SUPER_ADMIN') {
       redirect('/inbox');
     }
     
     // Admin-only content
   }
   ```

2. **Check role di client component**:
   ```typescript
   'use client';
   import { useSession } from 'next-auth/react';
   
   export default function MyComponent() {
     const { data: session } = useSession();
     
     if (session?.user?.role === 'SUPER_ADMIN') {
       return <AdminFeature />;
     }
     
     return <RegularFeature />;
   }
   ```

3. **Create authorization utilities**:
   ```typescript
   // lib/auth-utils.ts
   export function canAccessAdminPanel(role: string) {
     return role === 'SUPER_ADMIN';
   }
   
   export function canManageAgents(role: string) {
     return ['SUPER_ADMIN', 'BUSINESS_PARTNER'].includes(role);
   }
   ```

## Troubleshooting

### Login tidak berhasil
- Pastikan database sudah di-seed dengan `npm run db:seed`
- Check bahwa PostgreSQL berjalan di port 5444
- Verify email dan password yang digunakan

### Session tidak persist
- Check `AUTH_SECRET` sudah diset di `.env`
- Verify `NEXTAUTH_URL` sesuai dengan URL aplikasi

### Prisma errors
- Jalankan `npx prisma generate` untuk regenerate client
- Jalankan `npm run db:push` untuk sync schema
