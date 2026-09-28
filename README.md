# Chai Partner — QR-Based Table Ordering & Billing System

A responsive, production-grade web application (Next.js PWA + NestJS + PostgreSQL + Redis + Socket.io) designed for a 25-table cafe.

## Architecture & Monorepo Structure

- `apps/web`: Next.js 15 PWA frontend for mobile customers & tablet/PC admin dashboard.
- `apps/api`: NestJS backend API with Socket.io gateway, PostgreSQL database, and Redis cache.
- `packages/shared`: Shared TypeScript types, enums, DTOs, state machine constants, and crypto helpers.
- `docs/`: Product specification, architecture, engineering rules (`BRAIN.md`), and UI/UX design brief.

## Non-Negotiable Engineering Rules (BRAIN.md §3)
1. Guarded transactional status updates (`WHERE status = <expected>`).
2. Snapshot `order_items.unit_price` at order-placement time (immutable).
3. Server-side payment verification (Razorpay signature + webhook).
4. `Idempotency-Key` required for order creation.
5. Exactly one active session per table (`one_active_session_per_table` partial unique index).
6. Tables freed only by ghost sweep (zero orders), settlement, or force-vacate with reason.
7. Every refund is logged before order cancellation.
8. Signed rotatable QR tokens (HMAC-SHA256).
9. All admin actions write to `audit_log`.

## Quickstart

### 1. Requirements
- Node.js >= 20 (v22 recommended)
- Docker & Docker Compose (or local PostgreSQL 16 and Redis 7)

### 2. Environment Setup
```bash
cp .env.example .env
```

### 3. Start Database & Cache
```bash
docker compose up -d
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Run Database Migrations & Seeds
```bash
npm run seed
```

### 6. Export Printable 25 Table QR Codes
```bash
npm run export-qr
```

### 7. Run Dev Servers
```bash
# Terminal 1: API
npm run dev:api

# Terminal 2: Web
npm run dev:web
```

- Customer App: http://localhost:3000
- Admin Dashboard: http://localhost:3000/admin
- API Docs / Health: http://localhost:4000/api/health
