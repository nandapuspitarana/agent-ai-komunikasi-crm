# Agent Komunikasi CRM 🚀

A modern, production-ready SaaS CRM Monolith built with Next.js, featuring an AI-powered Omni-Inbox, a Visual Flow Builder, and a lightweight embeddable Chat Widget.

---

## ✨ Features

- **🤖 AI-Powered CRM**: Integrated AI agents to handle customer communications and automate workflows.
- **🎨 Visual Flow Builder**: No-code Drag-and-Drop interface (built with XYFlow) for designing complex communication DAGs.
- **📥 Omni-Inbox**: Centralized dashboard to manage conversations across multiple channels (Web, WhatsApp, etc.).
- **💬 Embeddable Chat Widget**: High-performance, lightweight widget built with Preact and isolated using Shadow DOM.
- **🏢 SaaS Multi-Tenancy**: Built-in tenant isolation using a shared database with isolated records.
- **⚡ Real-time Communication**: Powered by Socket.io and Redis for instant message delivery.
- **⛓️ Robust Queueing**: Background tasks and webhook processing handled by BullMQ and Redis.

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 15+ (App Router)](https://nextjs.org/)
- **ORM**: [Prisma](https://www.prisma.io/) (PostgreSQL)
- **Styling**: [Tailwind CSS 4.0](https://tailwindcss.com/)
- **State & Real-time**: [Redis](https://redis.io/) (Caching, Pub/Sub, BullMQ)
- **Flow Engine**: [XYFlow (React Flow)](https://reactflow.dev/)
- **Widget**: Preact / Vanilla JS (Shadow DOM Isolation)

---

## 🚀 Quickstart

### Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [PostgreSQL](https://www.postgresql.org/)
- [Redis](https://redis.io/)

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/nandapuspitarana/agent-ai-komunikasi-crm.git
   cd agent-ai-komunikasi-crm
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Setup environment variables**:
   Copy `.env.example` to `.env` and update the values:
   ```bash
   DATABASE_URL="postgresql://user:pass@localhost:5444/crm?schema=public"
   REDIS_URL="redis://localhost:5448"
   AES_ENCRYPTION_KEY="your-32-character-encryption-key"
   
   # NextAuth Configuration
   AUTH_SECRET="your-secret-key-change-this-in-production-min-32-chars"
   NEXTAUTH_URL="http://localhost:3101"
   ```

4. **Setup database**:
   ```bash
   # Push schema to database
   npm run db:push
   
   # Seed database with test users
   npm run db:seed
   ```

5. **Start development server**:
   ```bash
   npm run dev
   ```

6. **Access the application**:
   Open [http://localhost:3101](http://localhost:3101) in your browser.

---

## 🔐 Authentication

The application uses **NextAuth.js v5** with credential-based authentication and role-based access control (RBAC).

### User Roles

- **SUPER_ADMIN**: Full system access, not tied to any tenant
- **AGENT**: Customer support agent, tied to a specific tenant
- **BUSINESS_PARTNER**: Business partner with limited access, tied to a specific tenant

### Test Accounts

After running `npm run db:seed`, you can login with:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@zetacrm.com | password123 |
| Agent | agent@zetacrm.com | password123 |
| Business Partner | partner@zetacrm.com | password123 |

### Protected Routes

The following routes require authentication:
- `/inbox` - Inbox dashboard
- `/dashboard` - Main dashboard  
- `/agent` - Agent configuration
- `/settings` - Settings page

For more details, see [Authentication Documentation](./docs/authentication.md).

---

## 📦 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint

npm run db:push      # Push Prisma schema to database
npm run db:seed      # Seed database with test data
npm run db:reset     # Reset database and seed
```

3. **Configure Environment Variables**:
   Copy the example environment file and update your credentials:
   ```bash
   cp .env.example .env
   ```
   *Required variables:*
   - `DATABASE_URL`: Your PostgreSQL connection string.
   - `REDIS_URL`: Your Redis connection string.
   - `AES_ENCRYPTION_KEY`: A 32-character key for data encryption.

4. **Database Setup**:
   Initialize your database schema:
   ```bash
   npx prisma db push
   ```

5. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   The dashboard will be available at [http://localhost:3100](http://localhost:3100).

---

## 📂 Project Structure

```text
/
├── prisma/             # Database schema and migrations
├── src/
│   ├── app/            # Next.js App Router (Pages & API Routes)
│   ├── modules/
│   │   ├── ai/         # AI Agent logic and proxying
│   │   ├── widget/     # Widget UI components
│   │   └── inbox/      # Messaging and inbox management
│   ├── components/     # Shared UI components (Shadcn/UI)
│   ├── lib/            # Shared utilities (Prisma, Redis, Socket)
├── widget/             # Standalone lightweight Chat Widget project
├── specs/              # Feature specifications and implementation plans
└── AGENTS.md           # Developer guidelines and context
```

---

## 🔌 Widget Integration

To embed the chat widget on any website, include the compiled script:

```html
<script src="https://your-cdn.com/widget.js" id="crm-widget" data-tenant-id="YOUR_TENANT_ID"></script>
```

The widget uses **Shadow DOM** to ensure no CSS conflicts with the host website.

---

## 🤝 Contributing

1. Create a feature branch: `git checkout -b feature/amazing-feature`
2. Commit your changes: `git commit -m 'Add amazing feature'`
3. Push to the branch: `git push origin feature/amazing-feature`
4. Open a Pull Request.

---

## 📄 License

Distributed under the ISC License. See `LICENSE` for more information.

---

Built with ❤️ by [Nanda Puspita](https://github.com/nandapuspitarana)
