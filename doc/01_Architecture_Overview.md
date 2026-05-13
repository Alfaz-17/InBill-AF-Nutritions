# InBill ERP — Architecture Overview & System Design

## Executive Summary
Transform current single-niche Electron+Next.js+SQLite app into a **universal, AI-powered, offline-first ERP** using a monorepo with NestJS cloud backend, Prisma ORM, PostgreSQL cloud DB, and Redis queues.

---

## 1. High-Level System Architecture

```mermaid
graph TB
    subgraph Desktop["Electron Desktop App"]
        UI["Next.js + shadcn/ui Frontend"]
        IPC["Electron IPC Bridge"]
        LOCAL["SQLite Local DB"]
        SYNC["Sync Engine"]
        PRINT["Print Engine"]
    end

    subgraph Cloud["Cloud Backend"]
        API["NestJS API Gateway"]
        AUTH["Auth Module (JWT)"]
        QUEUE["Redis + BullMQ"]
        AI["AI Service (Gemini)"]
        PG["PostgreSQL"]
    end

    UI <--> IPC
    IPC <--> LOCAL
    IPC <--> SYNC
    SYNC <-->|"REST + WebSocket"| API
    API <--> AUTH
    API <--> QUEUE
    API <--> AI
    API <--> PG
    QUEUE <--> PG
```

## 2. Monorepo Structure (pnpm workspaces)

```
inbill/
├── apps/
│   ├── desktop/                  # Electron + Next.js desktop app
│   └── api/                      # NestJS Cloud Backend
├── packages/
│   ├── shared-types/             # Shared TypeScript interfaces
│   └── shared-utils/             # Shared utility functions
└── prisma/
    └── schema.prisma             # Single source of truth for DB schema
```

## 3. Offline-First Sync Architecture

```mermaid
sequenceDiagram
    participant U as User
    participant E as Electron App
    participant SQ as Sync Queue (SQLite)
    participant API as NestJS API
    participant PG as PostgreSQL

    U->>E: Create Sale (offline)
    E->>E: Write to local SQLite
    E->>SQ: Enqueue sync event
    Note over SQ: {table: "sales", op: "INSERT", data: {...}, timestamp}

    loop Every 30 seconds (if online)
        E->>E: Check navigator.onLine
        E->>API: POST /sync/push (batch of events)
        API->>PG: Apply changes
        API->>E: Return server timestamps + conflicts
        E->>E: Resolve conflicts (server-wins for same field)
        E->>API: GET /sync/pull?since=lastSync
        API->>E: Return changes from other devices
        E->>E: Apply remote changes to SQLite
    end
```

### Sync Queue Table (SQLite)
```sql
CREATE TABLE sync_queue (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_type TEXT    NOT NULL,
  entity_id   TEXT    NOT NULL,
  operation   TEXT    NOT NULL,
  payload     TEXT    NOT NULL,
  created_at  TEXT    DEFAULT (datetime('now')),
  synced      INTEGER DEFAULT 0
);
```
