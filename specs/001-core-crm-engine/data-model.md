# Data Model

## Core Entities (Prisma Schema)

### `Tenant`
*Represents a SaaS account.*
- `id`: String (UUID)
- `name`: String
- `subscription`: String (e.g., "free", "pro")
- `createdAt`: DateTime

### `Integration`
*Stores third-party credentials and configurations.*
- `id`: String (UUID)
- `tenantId`: String (Foreign Key)
- `provider`: String ("whatsapp", "google_sheets")
- `apiKey`: String (AES-256 Encrypted)
- `isActive`: Boolean

### `Flow`
*Represents the visual conversation DAG.*
- `id`: String (UUID)
- `tenantId`: String (Foreign Key)
- `name`: String
- `nodes`: Json (Array of UI node data and types)
- `edges`: Json (Array of connections)

### `ChatSession`
*A conversation instance.*
- `id`: String (UUID)
- `tenantId`: String (Foreign Key)
- `contactId`: String (WhatsApp number or anonymous browser ID)
- `channel`: String ("whatsapp", "widget")
- `status`: String ("bot", "human_handoff", "closed")

### `Message`
*Individual chat bubbles.*
- `id`: String (UUID)
- `sessionId`: String (Foreign Key)
- `senderType`: String ("user", "bot", "agent")
- `content`: Text

## Security Constraints
- All database queries must enforce Row Level Security or include a `where: { tenantId }` clause in the middleware/repository pattern to ensure Multi-Tenancy isolation.
