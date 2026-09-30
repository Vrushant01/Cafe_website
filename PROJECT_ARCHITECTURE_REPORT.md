# Technical Architecture & Handoff Report: Chai Partner Cafe Website

> **Document Type:** Technical Architecture Handoff & Specification Audit  
> **Target Project:** Chai Partner — QR-Based Table Ordering & Billing System  
> **Repository Root:** `e:/client`  
> **Audience:** Senior Software Engineers, Systems Architects, and AI Coding Agents  
> **Inspection Date:** September 2026  

---

# 1. Executive Summary

### 1.1 What the Café Website Is
**Chai Partner** is an end-to-end, QR-code-driven, in-dining ordering, live kitchen fulfillment, and table billing platform built specifically for an artisan café environment (25 physical dining tables). It operates as an installable Progressive Web Application (PWA) with dual operational surfaces:
1. **Customer In-Dining Portal:** A mobile-first, touch-optimized web experience where guests scan a cryptographically signed QR code at their physical table, verify identity via OTP, explore a categorized digital menu with live bestseller and availability indicators, submit orders with instant or counter settlement, and monitor real-time preparation progress on a live timeline.
2. **Staff & Administration Portal:** A unified, real-time command dashboard (`/admin`) utilized by Counter Cashiers, Head Chefs (Kitchen), and Café Owners to oversee live incoming order queues, print Kitchen Order Tickets (KOT), update preparation stages, manage dynamic menus and live stock, process table settlements, force-vacate tables with mandatory audit reasons, view historical order records, and analyze multi-period revenue, repeat-customer rates, and bestseller metrics.

### 1.2 Main Purpose
The system solves four critical pain points of high-volume casual dining:
- **Waiter Bottlenecks & Order Errors:** Eliminates physical pen-and-paper order taking, handwriting misinterpretations, and table mix-ups by binding digital carts directly to verified physical tables.
- **Customer Anxiety & Wait Visibility:** Replaces uncertain wait times with live Socket.io stage updates (`Placed` → `Accepted` → `Preparing` → `Ready` → `Served` → `Billed`).
- **Table Occupancy & Ghost-Session Leaks:** Enforces deterministic table state machines where tables only become available through explicit counter billing, automatic ghost-session sweeping (no orders placed within session TTL), or audited force-vacating.
- **Cash vs. Online Reconciliation:** Standardizes multi-modal payments (Cash at Counter and Razorpay Online) with server-side HMAC-SHA256 webhook verification and transactional idempotency.

### 1.3 Who Uses It (Target Personas)
- **Walk-in & Repeat Customers:** Scan table QR codes on personal mobile browsers, verify via mobile OTP, place orders, and track preparation without waiting for staff.
- **Kitchen Staff / Head Chef:** Operates kitchen display screens/tablets, views active tickets sorted oldest-first, prints physical KOTs, and transitions orders through cooking stages.
- **Counter Cashier:** Reviews table order buckets, accepts payments (cash or online counter POS), transitions orders to `BILLED`, and releases tables for next guests.
- **Café Owner / General Manager:** Audits sales performance, manages live item pricing/availability, resolves floor alerts, inspects logs, and reviews daily reconciliation reports.

### 1.4 Main Features
- **Cryptographic Table Binding:** HMAC-SHA256 signed QR tokens (`table_<number>_<hash>`) preventing URL manipulation or counterfeit table claims.
- **Session Management & Rate Limiting:** 2-hour session lifetime with automatic 10-minute expiry warnings, client activity auto-extension, and IP/Phone/Table rate limits.
- **Digital Menu Engine:** Multi-category menu with real-time stock toggles, bestseller pills, veg/non-veg flags, and search filtering.
- **Idempotent Checkout:** Dual payment channels (Razorpay and Cash) backed by mandatory `Idempotency-Key` headers preventing duplicate orders under network retries.
- **Live Bidirectional Sockets:** Instant floor and kitchen updates via Socket.io for orders, table status transitions, and emergency manager calls.
- **Kitchen Order Ticket (KOT) Printing:** Thermal-printer-ready KOT generation and printable QR card exports for all 25 tables.
- **Role-Based Access Control (RBAC):** Admin, Kitchen, and Cashier scopes protecting backend routes and frontend controls.
- **Daily Financial Reconciliation & Audit Logging:** Immutable audit records (`audit_log`) for all price overrides, refunds, cancellations, and forced table vacates.

### 1.5 Current Implementation Status
The project is **fully implemented, integrated, built, and tested**. All planned Phase 1 through Phase 5 engineering milestones are functional across a monorepo containing `@chai-partner/shared`, `@chai-partner/api` (NestJS), and `@chai-partner/web` (Next.js 14). All automated test suites (39 unit and integration tests) pass with zero errors.

---

# 2. Technology Stack

| Technology | Version | Where It Is Used | Why It Is Used |
|---|---|---|---|
| **Node.js** | `>=20.0.0` (v22 tested) | Monorepo Runtime | Unified JavaScript/TypeScript runtime for API and Web apps. |
| **TypeScript** | `^5.5.0` | Whole Monorepo | Static typing, shared DTO interfaces, strict compiler guarantees. |
| **npm Workspaces** | Native npm | Root `package.json` | Monorepo dependency management linking `packages/*` and `apps/*`. |
| **NestJS** | `^10.4.0` | `apps/api` (Backend) | Enterprise modular architecture, dependency injection, built-in validation pipes, guards, and WebSocket gateways. |
| **Next.js (App Router)** | `^14.2.35` | `apps/web` (Frontend) | Server-side rendering (SSR), optimized production builds, dynamic routing (`/t/[token]`, `/track/[id]`), and static asset optimization. |
| **React** | `^18.3.1` | `apps/web` | Declarative UI rendering, custom hooks (`useCart`, `useSocketResync`), component modularity. |
| **Tailwind CSS** | `^3.4.10` | `apps/web` | Utility-first styling with custom design tokens for the artisan cafe palette (`canvas`, `ink`, `gold`, `ok`, `warn`, `danger`). |
| **TypeORM** | `^0.3.20` | `apps/api` | Object-Relational Mapping, transactional QueryRunners, schema migrations, and entity definitions. |
| **SQLite3** | `^5.1.7` | `apps/api` (Local/Dev) | Zero-setup persistent disk storage (`chai_partner.sqlite`) and in-memory unit testing (`:memory:`). |
| **PostgreSQL (`pg`)** | `^8.12.0` | `apps/api` (Docker/Prod) | Enterprise relational database for production with native UUID extension and partial indexing. |
| **Socket.io** | `^4.7.5` | `apps/api` | Bidirectional WebSocket server broadcasting floor alerts, order stage shifts, and table occupancy. |
| **Socket.io Client** | `^4.7.5` | `apps/web` | Real-time WebSocket client featuring automatic reconnect and full REST state resynchronization. |
| **Passport & JWT** | `^10.2.0` / `^4.0.1` | `apps/api` & `apps/web` | Stateless authentication tokens for admin staff (24h) and table customers (2h). |
| **Razorpay SDK** | `^2.9.8` | `apps/api` & `apps/web` | Online payment order creation, browser checkout modal, and HMAC-SHA256 signature/webhook validation. |
| **bcryptjs** | `^2.4.3` | `apps/api` | Secure password hashing for admin, kitchen, and cashier credentials. |
| **class-validator & class-transformer** | `^0.14.1` / `^0.5.1` | `apps/api` & `packages/shared` | Runtime payload validation, type coercion, and DTO decorators for HTTP requests. |
| **Lucide React** | `^0.436.0` | `apps/web` | Classy, lightweight, consistent vector stroke iconography. |
| **PDFKit & QRCode** | `^0.15.0` / `^1.5.4` | `apps/api` (Scripts) | Batch QR code generation, HTML print template creation, and printable table cards. |
| **Docker & Docker Compose** | Engine v24+ | Root `docker-compose.yml` | Containerized PostgreSQL 16 and Redis 7 services for production deployments. |
| **Jest & Supertest** | `^29.7.0` / `^7.0.0` | `apps/api` (Testing) | End-to-end integration and unit testing for guarded status transitions, race conditions, and payments. |

---

# 3. Complete Project Structure

```
e:/client/
├── package.json                          # Monorepo root workspace configuration & build scripts
├── tsconfig.base.json                    # Base TypeScript compiler settings shared across packages
├── docker-compose.yml                    # Production container definitions (PostgreSQL + Redis)
├── .env.example                          # Canonical environment configuration template
├── chai_partner.sqlite                   # Active local SQLite database instance
├── docs/                                 # Product, technical, and architectural specification files
│   ├── PRD.md                            # Product Requirement Document (Vision, Personas, Scope)
│   ├── TRD.md                            # Technical Requirement Document (Architecture, Data Models)
│   ├── BRAIN.md                          # Master context rules and 9 non-negotiable engineering laws
│   ├── App-Flow.md                       # Complete screen-to-screen user journeys & edge cases
│   └── UI-UX-Design-Brief.md             # Design tokens, color system, and responsive breakpoints
├── packages/
│   └── shared/                           # Shared library package used by both frontend and backend
│       ├── package.json                  # Package definition (@chai-partner/shared)
│       ├── tsconfig.json                 # Shared TypeScript build configuration
│       └── src/
│           ├── index.ts                  # Shared package root exports
│           ├── constants/index.ts        # Enums (TableStatus, OrderStatus, AdminRole, PaymentMethod)
│           ├── types/index.ts            # Core TypeScript interfaces (ITable, ISession, IOrder, etc.)
│           ├── dtos/index.ts             # Validation classes (CreateOrderDto, VerifyOtpDto, etc.)
│           └── utils/index.ts            # QR HMAC sign/verify, GST totals math, phone masking
└── apps/
    ├── api/                              # NestJS Backend API Application
    │   ├── package.json                  # API dependencies and runtime scripts
    │   ├── tsconfig.json                 # NestJS TypeScript build configuration
    │   └── src/
    │       ├── main.ts                   # API entry point (NestFactory, CORS, rawBody, ValidationPipe)
    │       ├── app.module.ts             # Root application module wiring feature modules
    │       ├── app.controller.ts         # Health check endpoint (/api/health)
    │       ├── config/
    │       │   └── configuration.ts      # Structured environment configuration schema
    │       ├── database/
    │       │   ├── data-source.ts        # TypeORM DataSource provider (SQLite / Postgres switch)
    │       │   ├── entities/             # 11 Relational TypeORM database entities
    │       │   └── seeds/seed.ts         # Database seeder (25 tables, 3 admin users, 65+ menu items)
    │       ├── common/
    │       │   ├── guards/
    │       │   │   ├── admin-auth.guard.ts # Bearer token & x-admin-role authentication guard
    │       │   │   └── roles.guard.ts    # RBAC authorization guard with header-fallback decoding
    │       │   └── services/
    │       │       └── crypto.service.ts # AES-256-GCM phone encryption & QR HMAC signing
    │       ├── modules/
    │       │   ├── tables/               # Table resolution, grid queries, and force-vacating
    │       │   ├── sessions/             # OTP generation, verification, and automated ghost sweeper
    │       │   ├── menu/                 # Categorized menu retrieval, item editing, stock toggles
    │       │   ├── orders/               # Idempotent order placement, queue, status transitions, KOT
    │       │   ├── payments/             # Razorpay order generation, signature check, webhook capture
    │       │   ├── refunds/              # Refund processing, order cancellation, audit recording
    │       │   ├── analytics/            # Multi-period sales aggregations, bestsellers, trends
    │       │   ├── audit/                # Immutable system and administrative event logging
    │       │   ├── auth/                 # Admin login, password comparison, JWT generation
    │       │   └── events/               # Socket.io gateway broadcasting real-time floor updates
    │       └── scripts/
    │           ├── export-qrs.ts         # Generates table QR images and HTML printable cards
    │           └── daily-reconciliation-report.ts # CLI script detecting stale unbilled orders
    └── web/                              # Next.js 14 Frontend Web Application
        ├── package.json                  # Frontend dependencies and dev/build scripts
        ├── next.config.mjs               # Next.js configuration (PWA headers, image domains)
        ├── tailwind.config.js            # Design tokens, color scales, typography definitions
        ├── public/                       # Static public assets, PWA manifest, and generated QRs
        │   ├── manifest.json             # Progressive Web App manifest
        │   └── generated-qrs/            # Pre-rendered QR PNGs for tables 01 to 25 + print HTML
        └── src/
            ├── app/
            │   ├── layout.tsx            # Global root layout (Google Fonts, metadata, viewport)
            │   ├── globals.css           # Vanilla CSS tokens, animations, print rules, button classes
            │   ├── page.tsx              # Home / Dev Simulator (Interactive 25-table floor selector)
            │   ├── (customer)/           # Customer route group
            │   │   ├── t/[token]/page.tsx  # Dynamic QR Landing: table status & floor overview
            │   │   ├── verify/page.tsx   # OTP verification and session token generation
            │   │   ├── menu/page.tsx     # Categorized menu browsing, search, and cart drawer
            │   │   ├── checkout/page.tsx # Bill breakdown, Cash vs. Razorpay toggle, order placement
            │   │   └── track/[id]/page.tsx # Live order timeline, status updates, and reorder action
            │   └── (admin)/              # Staff administration route group
            │       ├── admin/login/page.tsx     # Staff login form (Admin, Kitchen, Cashier)
            │       ├── admin/orders/page.tsx    # Live order queue, 4-stage transitions, KOT print
            │       ├── admin/menu/page.tsx      # Live menu editor (price, availability, bestsellers)
            │       ├── admin/history/page.tsx   # Searchable order history, refunds, and cancellations
            │       └── admin/analytics/page.tsx # Revenue trends, bestseller charts, repeat rates
            ├── components/
            │   ├── admin/AdminHeader.tsx        # Staff navigation bar, role badge, chime toggles
            │   ├── pwa/PwaInstallPrompt.tsx     # Browser install banner for mobile customers
            │   └── ui/Skeleton.tsx              # Animated loading skeleton component
            ├── hooks/
            │   └── useCart.ts                   # Cart state management synced with localStorage
            └── lib/
                ├── api.ts                       # Unified apiFetch wrapper (headers, auth, error parsing)
                └── socket.ts                    # Singleton Socket.io client with reconnection resync
```

---

# 4. Application Architecture

### 4.1 System Overview
The architecture is designed around **strict table-bound, session-scoped transactions**. No order can exist without an active session, and no session can exist without a verified physical table.

```mermaid
graph TD
    subgraph Client Layer [Frontend - Next.js PWA]
        Customer[Customer Mobile Browser]
        Staff[Kitchen / Cashier / Owner Browser]
    end

    subgraph Transport Layer
        HTTP[HTTP REST API / JSON]
        WS[WebSocket / Socket.io Gateway]
    end

    subgraph Application Layer [Backend - NestJS 10]
        Guards[Auth & RBAC Guards]
        TablesMod[Tables Module]
        SessionsMod[Sessions Module & Sweeper]
        MenuMod[Menu Module]
        OrdersMod[Orders Module & Reconciliation]
        PaymentsMod[Payments Module]
        AuditMod[Audit Module]
    end

    subgraph Storage & External Services
        DB[(TypeORM - SQLite / PostgreSQL)]
        RZP[Razorpay Payment Gateway]
        SMS[OTP Provider / Mock SMS]
    end

    Customer -->|Scan QR /t/:token| HTTP
    Customer -->|REST API Calls| HTTP
    Customer <-->|Order & Table Events| WS
    Staff -->|Admin Dashboard Actions| HTTP
    Staff <-->|Live Queue & Alerts| WS

    HTTP --> Guards
    Guards --> TablesMod
    Guards --> SessionsMod
    Guards --> MenuMod
    Guards --> OrdersMod
    Guards --> PaymentsMod

    SessionsMod -->|Verify Phone / Token| SMS
    PaymentsMod -->|Create Order / Verify Webhook| RZP
    OrdersMod -->|Snapshot Prices & Save Order| DB
    SessionsMod -->|Lock & Free Tables| DB
    AuditMod -->|Write Immutable Audit Logs| DB
    WS <--> ApplicationLayer
```

---

# 5. Frontend Architecture

### 5.1 Architecture Details
- **Entry Point:** `apps/web/src/app/layout.tsx` wraps the HTML document, configures Google Fonts (Cormorant Garamond, Playfair Display, Inter), loads `globals.css`, and mounts the `PwaInstallPrompt`.
- **Routing:** Built on the Next.js 14 App Router utilizing route groups:
  - `(customer)`: Customer in-dining workflow (`/t/[token]`, `/verify`, `/menu`, `/checkout`, `/track/[id]`).
  - `(admin)`: Staff management workflow (`/admin/login`, `/admin/orders`, `/admin/menu`, `/admin/history`, `/admin/analytics`).
- **State Management:**
  - **Cart State:** Managed via `useCart.ts`, persisted across tab refreshes in `localStorage.getItem('cp_cart_items')`. Calculates GST (5%) and running totals reactively.
  - **Session & Identity:** Stored in browser `localStorage` (`cp_session_token`, `cp_session_id`, `cp_table_number`, `cp_customer_name`).
  - **Admin Auth State:** Stored in `localStorage` (`cp_admin_token`, `cp_admin_user`).
  - **Real-Time Synchronized State:** Handled directly in page components via Socket.io event listeners coupled with the `useSocketResync` hook to guarantee fresh server fetches on connection drops.
- **Styling System:** Modern Minimalist Cafe aesthetic using Tailwind CSS tokens (`canvas`, `ink`, `gold`, `ok`, `warn`, `danger`), enhanced typography, subtle noise textures, card elevation shadows (`shadow-card`, `shadow-card-md`), and non-intrusive micro-interactions.

### 5.2 Page Breakdown

#### 1. Home / Table Simulator (`/`)
- **File:** [`apps/web/src/app/page.tsx`](file:///e:/client/apps/web/src/app/page.tsx)
- **Purpose:** Central developer & cafe demo dashboard displaying all 25 tables, their live occupancy, seat counts, and pre-computed QR links for testing.
- **Data Consumed:** `GET /tables`
- **Actions:** Select any table (1–25), inspect its direct QR token, launch customer experience in a new tab, or open printable QR sheets.

#### 2. QR Table Landing (`/t/[token]`)
- **File:** [`apps/web/src/app/(customer)/t/[token]/page.tsx`](file:///e:/client/apps/web/src/app/(customer)/t/[token]/page.tsx)
- **Purpose:** First screen customer reaches after scanning physical QR sticker. Resolves HMAC signature.
- **Data Consumed:** `GET /tables/:token/resolve`
- **Actions:**
  - If table is `AVAILABLE`: Tap "Sit & Start Ordering" → navigates to `/verify`.
  - If table is `OCCUPIED`: Displays occupied warning card, offers "Notify Staff / Clear Table" (emits `POST /tables/contact-manager` to staff dashboard).

#### 3. Customer Identity Verification (`/verify`)
- **File:** [`apps/web/src/app/(customer)/verify/page.tsx`](file:///e:/client/apps/web/src/app/(customer)/verify/page.tsx)
- **Purpose:** OTP-based telephone verification establishing a 2-hour customer dining session.
- **Data Consumed:** `table_id`, `table_number`, `token` query parameters.
- **Actions:** Request OTP (`POST /sessions/verify/request-otp`), enter 6-digit code, confirm verification (`POST /sessions/verify/confirm-otp`), write session token to `localStorage`, and navigate to `/menu`.

#### 4. Digital Menu (`/menu`)
- **File:** [`apps/web/src/app/(customer)/menu/page.tsx`](file:///e:/client/apps/web/src/app/(customer)/menu/page.tsx)
- **Purpose:** Browse categorized dishes, search items, manage cart quantities.
- **Data Consumed:** `GET /menu`
- **Actions:** Filter by category pills, search items live, increment/decrement cart stepper, view running total in sticky bottom bar, proceed to `/checkout`.

#### 5. Checkout & Payment (`/checkout`)
- **File:** [`apps/web/src/app/(customer)/checkout/page.tsx`](file:///e:/client/apps/web/src/app/(customer)/checkout/page.tsx)
- **Purpose:** Review order summary, itemize 5% GST, select Cash or Razorpay, submit order with idempotency.
- **Data Consumed:** `useCart` state, session credentials from `localStorage`.
- **Actions:** Toggle Cash/Razorpay, add special preparation notes, submit order (`POST /orders`). If Razorpay: opens Razorpay modal and confirms via `POST /payments/razorpay/verify`. Redirects to `/track/[orderId]`.

#### 6. Order Tracking (`/track/[id]`)
- **File:** [`apps/web/src/app/(customer)/track/[id]/page.tsx`](file:///e:/client/apps/web/src/app/(customer)/track/[id]/page.tsx)
- **Purpose:** Live status tracking timeline for placed orders.
- **Data Consumed:** `GET /orders/:id`, real-time updates via `order:status_changed` Socket.io event.
- **Actions:** Monitor stages (Placed, Accepted, Preparing, Ready, Served, Billed). If served/billed: "Order More Items" button navigates back to menu. If table is vacated: displays "Table Vacated & Session Ended" card with return-home button.

#### 7. Admin Login (`/admin/login`)
- **File:** [`apps/web/src/app/(admin)/admin/login/page.tsx`](file:///e:/client/apps/web/src/app/(admin)/admin/login/page.tsx)
- **Purpose:** Staff credential entry.
- **Data Consumed:** Form input (`email`, `password`).
- **Actions:** Authenticates via `POST /auth/login`, stores `cp_admin_token` and user role (`admin`, `kitchen`, `cashier`), redirects to `/admin/orders`.

#### 8. Admin Live Orders Queue (`/admin/orders`)
- **File:** [`apps/web/src/app/(admin)/admin/orders/page.tsx`](file:///e:/client/apps/web/src/app/(admin)/admin/orders/page.tsx)
- **Purpose:** Primary operational screen for floor managers, kitchen, and cashiers.
- **Data Consumed:** `GET /orders/queue`, `GET /tables`, Socket.io events (`order:new`, `order:status_changed`, `table:status_changed`, `admin:alert`).
- **Actions:**
  - Transition order stages: Accept → Prepare → Mark Food Ready → Mark Served.
  - Print KOT ticket via browser print dialog.
  - Settle & Bill order (`POST /orders/:id/settle`) choosing settled payment method.
  - Force-vacate table (`POST /tables/:id/force-vacate`) with required reason.
  - Sound chime alerts on incoming orders/alerts.

#### 9. Admin Menu Management (`/admin/menu`)
- **File:** [`apps/web/src/app/(admin)/admin/menu/page.tsx`](file:///e:/client/apps/web/src/app/(admin)/admin/menu/page.tsx)
- **Purpose:** Live control over menu offerings, pricing, and stock.
- **Data Consumed:** `GET /menu`
- **Actions:** Toggle item availability (instantly disables item on customer menu), toggle bestseller status, inline edit item prices, create new items, delete items.

#### 10. Admin Order History (`/admin/history`)
- **File:** [`apps/web/src/app/(admin)/admin/history/page.tsx`](file:///e:/client/apps/web/src/app/(admin)/admin/history/page.tsx)
- **Purpose:** Searchable and filterable archive of past orders.
- **Data Consumed:** `GET /orders/history`
- **Actions:** Search by customer name, phone, order number, or UUID; filter by date range (Day, Week, Month, Year); process customer cancellations with refunds (`POST /admin/refunds/cancel-order/:orderId`); view itemized logs.

#### 11. Admin Analytics Overview (`/admin/analytics`)
- **File:** [`apps/web/src/app/(admin)/admin/analytics/page.tsx`](file:///e:/client/apps/web/src/app/(admin)/admin/analytics/page.tsx)
- **Purpose:** Business intelligence dashboard.
- **Data Consumed:** `GET /admin/analytics?range={range}`
- **Actions:** View Total Revenue, Average Order Value (AOV), Repeat Customer Rate, top 5 bestsellers ranked by volume and revenue, highest and lowest sales periods, cash vs. online distribution, and chronological revenue trend bars.

---

# 6. Backend Architecture

### 6.1 Server Architecture Details
- **Entry Point:** `apps/api/src/main.ts` instantiates NestJS via `NestFactory.create(AppModule, { rawBody: true })`.
- **Global Pipes & Configuration:**
  - Global prefix `/api` mapped to all REST endpoints.
  - Global `ValidationPipe` with `{ whitelist: true, transform: true }` enforcing DTO validations.
  - CORS enabled with wildcard origin (`*`) and credentials support.
  - Sentry APM hook placeholder configured in bootstrapping.
- **Modules (`apps/api/src/modules/`):**
  - `TablesModule`: QR cryptographic token verification and table state management.
  - `SessionsModule`: OTP generation, session token signing, and automated background sweeper.
  - `MenuModule`: Menu categories, items, and inventory toggles.
  - `OrdersModule`: Transactional placement with price snapshotting and guarded status transitions.
  - `PaymentsModule`: Razorpay API integration, webhook signature checking, and settlement.
  - `RefundsModule`: Cancellation refund logging and table release checks.
  - `AnalyticsModule`: Data aggregation for revenue, AOV, bestsellers, and customer retention.
  - `AuditModule`: Audit logging to `audit_log` table.
  - `AuthModule`: Global JWT registration and admin authentication.
  - `EventsModule`: Socket.io gateway handling rooms (`admin`, `session_<id>`).

```mermaid
sequenceDiagram
    autonumber
    actor Customer
    participant API as NestJS OrdersController
    participant Guard as AdminAuth/RolesGuard
    participant Service as OrdersService
    participant Runner as TypeORM QueryRunner
    participant DB as SQLite / PostgreSQL
    participant Events as Socket.io Gateway
    actor Kitchen as Kitchen Staff (Admin)

    Customer->>API: POST /api/orders (Idempotency-Key, Session Token)
    API->>Service: placeOrder(sessionId, dto, idempotencyKey)
    Service->>DB: Check idempotency_keys table
    alt Key already exists
        Service-->>Customer: Return cached response snapshot
    else Fresh Order
        Service->>DB: Fetch MenuItemEntity (Snapshot live prices)
        Service->>Runner: Start Transaction
        Runner->>DB: Insert OrderEntity (Status: PLACED)
        Runner->>DB: Insert OrderItemEntity (unit_price snapshotted)
        Runner->>DB: Insert PaymentEntity (Status: PENDING)
        Runner->>DB: Insert IdempotencyKeyEntity
        Runner->>Runner: Commit Transaction
        Service->>Events: emitNewOrder(populatedOrder)
        Events-->>Kitchen: Socket event "order:new" (Chime sound & Live Queue update)
        Service-->>Customer: Return created Order object
    end
```

---

# 7. Database / Data Storage

The application data is configured in [`data-source.ts`](file:///e:/client/apps/api/src/database/data-source.ts). In development and test modes, it uses persistent **SQLite** (`chai_partner.sqlite` or `:memory:`). In production, it connects to **PostgreSQL**.

### 7.1 Entity Schemas & Relationships

#### 1. `tables` (`TableEntity`)
- **Purpose:** Stores the 25 physical tables, their seat capacities, occupancy status, and current active session.
- **Columns:** `id` (UUID, PK), `table_number` (Integer, Unique), `seat_count` (Integer), `status` (Enum: `available`, `occupied`), `current_session_id` (UUID, Nullable), `qr_token` (String, Signed), `created_at`, `updated_at`.
- **Relationships:** One-to-Many with `sessions`, One-to-Many with `orders`.

#### 2. `sessions` (`SessionEntity`)
- **Purpose:** Represents a verified in-dining customer session with a 2-hour TTL.
- **Columns:** `id` (UUID, PK), `table_id` (UUID, FK), `customer_name` (String), `phone` (String, Encrypted via AES-256-GCM), `email` (String, Nullable), `otp_verified_at` (DateTime, Nullable), `started_at` (DateTime), `expires_at` (DateTime), `status` (Enum: `active`, `expired`, `closed`), `created_at`, `updated_at`.
- **Relationships:** Many-to-One with `tables`, One-to-Many with `orders`.

#### 3. `menu_categories` (`MenuCategoryEntity`)
- **Purpose:** Groupings for café offerings (Milk Tea, Coffee, Bites, Sandwich, Pizza, etc.).
- **Columns:** `id` (UUID, PK), `name` (String), `sort_order` (Integer), `created_at`, `updated_at`.
- **Relationships:** One-to-Many with `menu_items`.

#### 4. `menu_items` (`MenuItemEntity`)
- **Purpose:** Individual dishes/drinks available on the menu.
- **Columns:** `id` (UUID, PK), `category_id` (UUID, FK), `name` (String), `description` (Text), `price` (Decimal 10,2), `image_url` (String, Nullable), `is_bestseller` (Boolean), `is_available` (Boolean), `veg_flag` (Boolean), `created_at`, `updated_at`.
- **Relationships:** Many-to-One with `menu_categories`, One-to-Many with `order_items`.

#### 5. `orders` (`OrderEntity`)
- **Purpose:** Represents placed customer food orders.
- **Columns:** `id` (UUID, PK), `session_id` (UUID, FK), `table_id` (UUID, FK), `order_number` (String, Unique, format: `CP-XXXX`), `status` (Enum: `placed`, `accepted`, `preparing`, `ready`, `served`, `billed`, `cancelled`, `cancellation_requested`), `payment_status` (Enum: `pending`, `advance_paid`, `paid`, `refund_pending`, `refunded`), `subtotal` (Decimal), `tax` (Decimal), `total` (Decimal), `notes` (Text, Nullable), `created_at`, `updated_at`.
- **Relationships:** Many-to-One with `sessions`, Many-to-One with `tables`, One-to-Many with `order_items`.

#### 6. `order_items` (`OrderItemEntity`)
- **Purpose:** Snapshotted line items for an order.
- **Columns:** `id` (UUID, PK), `order_id` (UUID, FK), `menu_item_id` (UUID, FK), `qty` (Integer), `unit_price` (Decimal 10,2 - **immutable snapshot**), `item_name` (String), `veg_flag` (Boolean).
- **Relationships:** Many-to-One with `orders`, Many-to-One with `menu_items`.

#### 7. `payments` (`PaymentEntity`)
- **Purpose:** Financial records tracking payment method and transaction status.
- **Columns:** `id` (UUID, PK), `order_id` (UUID, FK), `method` (Enum: `cash`, `razorpay`, `online`), `razorpay_order_id` (String, Nullable), `razorpay_payment_id` (String, Nullable), `amount` (Decimal 10,2), `status` (Enum: `pending`, `advance_paid`, `paid`, `refund_pending`, `refunded`), `created_at`, `updated_at`.
- **Relationships:** One-to-One/Many-to-One with `orders`, One-to-Many with `refunds`.

#### 8. `refunds` (`RefundEntity`)
- **Purpose:** Audit record for processed cancellations and cash/online refunds.
- **Columns:** `id` (UUID, PK), `payment_id` (UUID, FK), `amount` (Decimal 10,2), `reason` (Text), `processed_by` (String), `timestamp` (DateTime).
- **Relationships:** Many-to-One with `payments`.

#### 9. `admin_users` (`AdminUserEntity`)
- **Purpose:** Staff accounts with role privileges.
- **Columns:** `id` (UUID, PK), `name` (String), `role` (Enum: `admin`, `kitchen`, `cashier`), `email` (String, Unique), `phone` (String, Nullable), `password_hash` (String), `created_at`, `updated_at`.

#### 10. `audit_log` (`AuditLogEntity`)
- **Purpose:** Immutable audit trail for all money-affecting, price, menu, and state actions.
- **Columns:** `id` (UUID, PK), `actor_id` (String), `actor_type` (Enum: `admin`, `system`, `customer`), `action` (String), `entity` (String), `entity_id` (String), `metadata` (JSON), `timestamp` (DateTime).

#### 11. `idempotency_keys` (`IdempotencyKeyEntity`)
- **Purpose:** Prevents duplicate order placement during client retry or flaky connection.
- **Columns:** `id` (UUID, PK), `session_id` (String), `key` (String), `response_snapshot` (JSON), `created_at` (DateTime).
- **Index:** Unique composite index on `(session_id, key)`.

---

# 8. User Flows

### 8.1 Customer In-Dining Flow

```mermaid
flowchart TD
    Scan[1. Customer Scans QR at Table] --> Resolve{Valid HMAC Token?}
    Resolve -->|No| Err[Display 'QR Code Not Recognized' Screen]
    Resolve -->|Yes| Landing[2. Table Landing Screen]
    Landing --> CheckStatus{Table Status?}
    CheckStatus -->|Occupied| Conflict[3. Display Occupied Fallback Screen]
    Conflict --> NotifyStaff[Tap 'Notify Staff' -> Emits Alert to Admin Queue]
    CheckStatus -->|Available| Verify[4. Customer Identity Screen]
    Verify --> InputPhone[Enter Name & 10-Digit Phone]
    InputPhone --> SendOTP[POST /sessions/verify/request-otp]
    SendOTP --> ConfirmOTP[Enter 6-Digit Code -> POST confirm-otp]
    ConfirmOTP --> SessionActive[5. 2-Hour Session Created & Stored in LocalStorage]
    SessionActive --> Menu[6. Digital Menu Screen]
    Menu --> AddItems[Add Items to Cart with Quantities]
    AddItems --> Checkout[7. Checkout Screen: Review Breakdown & 5% GST]
    Checkout --> PayChoice{Payment Method?}
    PayChoice -->|Cash| PlaceCash[Place Order -> Status: PENDING]
    PayChoice -->|Razorpay| RzpModal[Open Razorpay Checkout Window]
    RzpModal --> VerifySig[POST /payments/razorpay/verify -> ADVANCE_PAID]
    PlaceCash --> Track[8. Live Tracking Screen]
    VerifySig --> Track
    Track --> KitchenEvents{Live Socket Events}
    KitchenEvents -->|Status: ACCEPTED| StepAccepted[Kitchen Acknowledged]
    KitchenEvents -->|Status: PREPARING| StepPrep[Kitchen Cooking]
    KitchenEvents -->|Status: READY| StepReady[Food Ready for Serving]
    KitchenEvents -->|Status: SERVED| StepServed[Served at Table]
    StepServed --> OrderMore[Customer can tap 'Order More Items']
    OrderMore --> Menu
```

### 8.2 Staff & Admin Operational Flow

```mermaid
flowchart TD
    Login[Staff Login: admin / kitchen / cashier] --> OrdersView[Admin Live Orders View]
    OrdersView --> RealTimeOrders{Incoming Orders via Socket}
    RealTimeOrders --> Placed[Order Status: PLACED]
    Placed --> Accept[Tap 'Accept Order']
    Accept --> PrintKOT[Tap 'Print KOT' -> Thermal Slip]
    Accept --> Prep[Tap 'Start Cooking' -> Status: PREPARING]
    Prep --> Ready[Tap 'Mark Food Ready' -> Status: READY]
    Ready --> Served[Tap 'Mark Served to Table' -> Status: SERVED]
    Served --> SettleModal[Tap 'Bill & Settle Counter']
    SettleModal --> SettleOrder[POST /orders/:id/settle -> Status: BILLED]
    SettleOrder --> TableFree{Any other active orders on table?}
    TableFree -->|No| CloseSession[Close Session & Free Table: AVAILABLE]
    TableFree -->|Yes| KeepOccupied[Keep Table Occupied until other orders settle]
```

---

# 9. Feature-by-Feature Implementation

| Feature | Frontend | Backend | Database | External Service | Status | Important Files |
|---|---|---|---|---|---|---|
| **Cryptographic QR Resolution** | Dynamic route `/t/[token]` | `TablesService.resolveToken` | `TableEntity` | None | **Implemented** | `apps/web/src/app/(customer)/t/[token]/page.tsx`, `apps/api/src/modules/tables/tables.service.ts` |
| **Occupancy Conflict & Alert** | "Notify Staff" CTA | `TablesService.contactManager` | None (Socket emit) | None | **Implemented** | `apps/api/src/modules/tables/tables.controller.ts`, `apps/web/src/app/(admin)/admin/orders/page.tsx` |
| **Phone OTP Verification** | `/verify` step screen | `SessionsService.requestOtp` & `confirmOtp` | `SessionEntity`, `TableEntity` | SMS Provider / Mock | **Implemented** | `apps/api/src/modules/sessions/sessions.service.ts`, `apps/web/src/app/(customer)/verify/page.tsx` |
| **Session Rate Limiting & Lockout** | Error alert with cooldown | `SessionsService.checkRateLimits` | In-memory buckets | None | **Implemented** | `apps/api/src/modules/sessions/sessions.service.ts` |
| **Categorized Menu & Badges** | `/menu` with category pills & search | `MenuService.getMenu` | `MenuCategoryEntity`, `MenuItemEntity` | None | **Implemented** | `apps/web/src/app/(customer)/menu/page.tsx`, `apps/api/src/modules/menu/menu.service.ts` |
| **Immutable Cart & Price Snapshot** | `useCart.ts` + `/checkout` | `OrdersService.placeOrder` | `OrderItemEntity` (`unit_price`) | None | **Implemented** | `apps/web/src/hooks/useCart.ts`, `apps/api/src/modules/orders/orders.service.ts` |
| **Idempotent Order Placement** | `apiFetch` with `Idempotency-Key` | `OrdersService.placeOrder` transaction | `IdempotencyKeyEntity` | None | **Implemented** | `apps/api/src/modules/orders/orders.service.ts`, `apps/web/src/lib/api.ts` |
| **Razorpay Checkout & Webhook** | Razorpay modal script injection | `PaymentsService` order & webhook | `PaymentEntity`, `OrderEntity` | Razorpay API | **Implemented** | `apps/api/src/modules/payments/payments.service.ts`, `apps/web/src/app/(customer)/checkout/page.tsx` |
| **Live Order Tracking** | `/track/[id]` timeline | `EventsGateway` Socket.io events | `OrderEntity` | None | **Implemented** | `apps/web/src/app/(customer)/track/[id]/page.tsx`, `apps/api/src/modules/events/events.gateway.ts` |
| **Order More from Tracking** | "Order More Items" CTA | Reuses active session token | `SessionEntity` | None | **Implemented** | `apps/web/src/app/(customer)/track/[id]/page.tsx` |
| **Kitchen Live Queue & Transitions** | `/admin/orders` queue | `OrdersService.transitionStatus` | `OrderEntity` | None | **Implemented** | `apps/web/src/app/(admin)/admin/orders/page.tsx`, `apps/api/src/modules/orders/orders.service.ts` |
| **KOT Thermal Ticket Print** | Print modal in Admin Orders | Formatted thermal layout | None | Browser Print | **Implemented** | `apps/web/src/app/(admin)/admin/orders/page.tsx` |
| **Counter Billing Settlement** | Settle modal in Admin Orders | `OrdersService.settleOrder` | `OrderEntity`, `PaymentEntity`, `TableEntity` | None | **Implemented** | `apps/api/src/modules/orders/orders.service.ts` |
| **Force-Vacate Table** | Vacate modal in Admin Orders | `TablesService.forceVacate` | `TableEntity`, `SessionEntity`, `AuditLogEntity` | None | **Implemented** | `apps/api/src/modules/tables/tables.service.ts` |
| **Refunds & Cancellations** | History page refund modal | `RefundsService.processRefundAndCancelOrder` | `RefundEntity`, `PaymentEntity`, `OrderEntity` | None | **Implemented** | `apps/api/src/modules/refunds/refunds.service.ts`, `apps/web/src/app/(admin)/admin/history/page.tsx` |
| **Dynamic Menu Management** | `/admin/menu` CRUD & toggles | `MenuService` item CRUD | `MenuItemEntity` | None | **Implemented** | `apps/api/src/modules/menu/menu.service.ts`, `apps/web/src/app/(admin)/admin/menu/page.tsx` |
| **Analytics & Business Intelligence**| `/admin/analytics` dashboard | `AnalyticsService.getAnalytics` | SQL aggregations | None | **Implemented** | `apps/api/src/modules/analytics/analytics.service.ts`, `apps/web/src/app/(admin)/admin/analytics/page.tsx` |
| **Automated Ghost Sweeper** | Background interval (60s) | `SessionSweeperService` | `SessionEntity`, `TableEntity` | None | **Implemented** | `apps/api/src/modules/sessions/session-sweeper.service.ts` |
| **QR Code Export Script** | CLI script generating PNGs | `apps/api/src/scripts/export-qrs.ts` | File system | None | **Implemented** | `apps/api/src/scripts/export-qrs.ts` |

---

# 10. API Documentation

| Method | Endpoint | Purpose | Request Body / Query | Response Body | Authentication | Used By |
|---|---|---|---|---|---|---|
| `GET` | `/api/health` | Service liveness probe | None | `{ status: 'ok', timestamp: string }` | None | Monitoring / Health checks |
| `GET` | `/api/tables` | Fetch all 25 tables and statuses | None | `TableEntity[]` | None | Home simulator, Admin floor view |
| `GET` | `/api/tables/:token/resolve` | Resolve QR token to table | Param: `token` | `ResolveTableResponse` | None | `/t/[token]` Landing page |
| `POST` | `/api/tables/contact-manager` | Alert staff of table conflict | `{ table_number: number, message?: string }` | `{ success: true, message: string }` | None | Table Landing occupied fallback |
| `POST` | `/api/tables/:id/force-vacate` | Vacate table with logged reason | `{ reason: string }` | `TableEntity` | Bearer Admin/Cashier | Admin Orders dashboard |
| `POST` | `/api/sessions/verify/request-otp` | Request phone verification OTP | `{ table_id, phone, name, email? }` | `{ success: true, cooldownSeconds: 60 }` | None | `/verify` Customer verification |
| `POST` | `/api/sessions/verify/confirm-otp` | Confirm OTP and create session | `{ table_id, phone, otp, name, email? }`| `VerifyOtpResponse` | None | `/verify` Customer verification |
| `GET` | `/api/sessions/current` | Retrieve active session details | None | `{ session, table }` | Bearer Customer Token | Customer app verification |
| `POST` | `/api/sessions/auto-extend` | Extend session upon active interaction| None | `{ extended: boolean, expires_at: string }` | Bearer Customer Token | Customer tracking & browsing |
| `POST` | `/api/sessions/admin/sweep` | Manual trigger for ghost sweeper | None | `SweepResult` | None | Scheduled tasks / Maintenance |
| `GET` | `/api/menu` | Retrieve all categories with items | None | `MenuCategoryEntity[]` | None | Customer Menu, Admin Menu |
| `GET` | `/api/menu/categories` | Retrieve categories list | None | `MenuCategoryEntity[]` | None | Menu editors |
| `GET` | `/api/menu/items/:id` | Fetch specific menu item | Param: `id` | `MenuItemEntity` | None | Item details |
| `POST` | `/api/menu/items` | Create new menu item | `CreateMenuItemDto` | `MenuItemEntity` | Bearer Admin Role | Admin Menu management |
| `PATCH` | `/api/menu/items/:id` | Update menu item details/price | Param: `id`, `UpdateMenuItemDto` | `MenuItemEntity` | Bearer Admin Role | Admin Menu management |
| `PATCH` | `/api/menu/items/:id/availability` | Toggle item stock on/off | Param: `id` | `MenuItemEntity` | Bearer Admin/Kitchen/Cashier | Admin Menu management |
| `PATCH` | `/api/menu/items/:id/bestseller` | Toggle item bestseller tag | Param: `id` | `MenuItemEntity` | Bearer Admin Role | Admin Menu management |
| `DELETE`| `/api/menu/items/:id` | Remove menu item | Param: `id` | `{ success: true, deleted_item_name: string }` | Bearer Admin Role | Admin Menu management |
| `POST` | `/api/orders` | Place food order | `CreateOrderDto`, Header: `Idempotency-Key` | `OrderEntity` (populated) | Bearer Customer Token | Customer Checkout |
| `GET` | `/api/orders/queue` | Live kitchen/counter order queue | None | `OrderEntity[]` (oldest first) | None | Admin Orders dashboard |
| `GET` | `/api/orders/history` | Multi-criteria order search/filter | Query: `search, range, status, payment_method, page, limit` | `{ orders, total, totalRevenue, refundedCount }` | Bearer Staff (Admin/Cashier/Kitchen) | Admin History view |
| `GET` | `/api/orders/:id` | Fetch order details and status | Param: `id` | `OrderEntity` | None | Customer Order Tracker |
| `PATCH` | `/api/orders/:id/status` | Guarded transition of order stage | Param: `id`, `UpdateOrderStatusDto` | `OrderEntity` | Bearer Staff (Admin/Kitchen/Cashier) | Admin Orders dashboard |
| `POST` | `/api/orders/:id/settle` | Finalize billing & free table | Param: `id`, `SettleOrderDto` | `OrderEntity` | Bearer Staff (Admin/Cashier/Kitchen) | Admin Orders dashboard |
| `GET` | `/api/orders/reports/pending-reconciliation` | Find stale unbilled orders | None | Stale order records array | Bearer Admin Role | Nightly reconciliation |
| `POST` | `/api/payments/razorpay/order` | Create server-side Razorpay order | `{ order_id: string }` | `{ razorpay_order_id, amount, currency, key_id }` | None | Customer Checkout |
| `POST` | `/api/payments/razorpay/verify`| Verify client payment signature | `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }` | `{ success: boolean, payment_status: string }` | None | Customer Checkout callback |
| `POST` | `/api/payments/razorpay/webhook`| Official payment webhook listener | Raw webhook payload, Header: `x-razorpay-signature` | `{ status: string }` | Signature verified | Razorpay Cloud Servers |
| `POST` | `/api/admin/refunds/cancel-order/:orderId` | Cancel order with refund | Param: `orderId`, `ProcessRefundDto` | `{ refund: RefundEntity, order: OrderEntity }` | Bearer Admin/Cashier | Admin History |
| `GET` | `/api/admin/refunds/order/:orderId` | View refund history for order | Param: `orderId` | `RefundEntity[]` | Bearer Staff | Admin History |
| `GET` | `/api/admin/analytics` | High-level business analytics | Query: `range=day\|week\|month\|year\|all` | `IAnalyticsOverview` | Bearer Staff | Admin Analytics |
| `POST` | `/api/auth/login` | Staff credential verification | `{ email, password }` | `{ access_token, user }` | None | Admin Login |

---

# 11. Authentication & Security

### 11.1 Authentication Mechanics
- **Customer Authentication:** Customers authenticate through OTP verification ([`sessions.service.ts`](file:///e:/client/apps/api/src/modules/sessions/sessions.service.ts)). A signed JWT token is issued with payload `{ sub: session.id, table_id, table_number, customer_name }` with a 2-hour validity. This token is stored in client `localStorage` under `cp_session_token` and passed as `Authorization: Bearer <token>` in order placement requests.
- **Admin & Staff Authentication:** Staff authenticate using email and password via `POST /api/auth/login` ([`auth.service.ts`](file:///e:/client/apps/api/src/modules/auth/auth.service.ts)). Passwords are verified against stored `password_hash` using `bcryptjs`. On success, a JWT is signed with payload `{ sub: user.id, name: user.name, role: user.role, email: user.email }` and an expiry of 24 hours. The token is stored in `localStorage` under `cp_admin_token`.

### 11.2 Protected Routes & Authorization Guards
- [`AdminAuthGuard`](file:///e:/client/apps/api/src/common/guards/admin-auth.guard.ts): Validates that an incoming request possesses a valid `Authorization: Bearer <jwt>` or local test header `x-admin-role`. It decodes the payload, validates existence of `decoded.role`, and attaches `request.user`.
- [`RolesGuard`](file:///e:/client/apps/api/src/common/guards/roles.guard.ts): Enforces role-based permissions (`@Roles(AdminRole.ADMIN, ...)`). If `request.user` was not set upstream, it autonomously attempts extraction and verification of the Bearer token or `x-admin-role` before throwing an `UnauthorizedException` or `ForbiddenException`.

### 11.3 Data Security & Encryption
- **Phone Number Encryption:** Customer phone numbers are stored encrypted at rest using **AES-256-GCM** via [`crypto.service.ts`](file:///e:/client/apps/api/src/common/services/crypto.service.ts). The encryption output format is `<iv_hex>:<auth_tag_hex>:<ciphertext_hex>`.
- **Phone Masking:** Responses return masked phone numbers formatted as `+91 ******XXXX` via [`maskPhoneNumber`](file:///e:/client/packages/shared/src/utils/index.ts).
- **HMAC QR Signing:** QR tokens are generated using SHA-256 HMAC ([`generateSignedQrToken`](file:///e:/client/packages/shared/src/utils/index.ts)) preventing URL tampering.
- **Webhook Security:** Razorpay webhooks require cryptographic HMAC-SHA256 signature verification comparing `x-razorpay-signature` against the raw payload buffer.

### 11.4 Security Weaknesses & Mitigation Advice
- **Hardcoded Secret Fallbacks:** When environment variables are missing, fallback secrets exist in configuration files (e.g., `'super_secret_jwt_key_chai_partner_change_in_production_2026'`). In production, deployment scripts must enforce strict failure if `.env` secrets are default values.
- **Client-Side Token Storage:** Tokens are stored in browser `localStorage`. For highest security in enterprise environments, migrating to `httpOnly`, `SameSite=Strict` cookies is recommended.

---

# 12. Environment Variables & Configuration

The application reads its environment configuration from the root [`.env`](file:///e:/client/.env) file.

| Variable | Used By | Purpose | Required? | Example/Format |
|---|---|---|---|---|
| `PORT` | Backend (`apps/api`) | HTTP port NestJS listens on | No (Defaults to `4000`) | `4000` |
| `API_URL` | Backend (`apps/api`) | Canonical backend URL for callbacks | No | `http://localhost:4000` |
| `FRONTEND_URL` | Backend (`apps/api`) | Canonical frontend origin for CORS/redirects | No | `http://localhost:3000` |
| `NEXT_PUBLIC_API_URL` | Frontend (`apps/web`) | Base URL for REST API fetch calls | Yes | `http://localhost:4000/api` |
| `NEXT_PUBLIC_SOCKET_URL` | Frontend (`apps/web`) | Base URL for Socket.io WebSocket connection | Yes | `http://localhost:4000` |
| `DB_TYPE` | Backend (`apps/api`) | Database driver selector (`sqlite` or `postgres`) | No | `sqlite` or `postgres` |
| `DB_HOST` | Backend (`apps/api`) | PostgreSQL host address | Conditional (Postgres) | `localhost` |
| `DB_PORT` | Backend (`apps/api`) | PostgreSQL port | Conditional (Postgres) | `5432` |
| `DB_USER` | Backend (`apps/api`) | PostgreSQL username | Conditional (Postgres) | `postgres` |
| `DB_PASSWORD` | Backend (`apps/api`) | PostgreSQL user password | Conditional (Postgres) | `postgres` |
| `DB_NAME` | Backend (`apps/api`) | PostgreSQL database name | Conditional (Postgres) | `chai_partner` |
| `DATABASE_URL` | Backend (`apps/api`) | Connection URI string | No | `postgresql://user:pass@host:5432/db` |
| `REDIS_HOST` | Backend (`apps/api`) | Redis host for future distributed caching | No | `localhost` |
| `REDIS_PORT` | Backend (`apps/api`) | Redis port | No | `6379` |
| `REDIS_PASSWORD` | Backend (`apps/api`) | Redis authentication password | No | (empty) |
| `JWT_SECRET` | Backend (`apps/api`) | Cryptographic signing secret for JWT tokens | **Yes (in Prod)** | 32+ character random string |
| `QR_HMAC_SECRET` | Backend & Shared | Secret key used to sign and verify table QRs | **Yes (in Prod)** | 32+ character random string |
| `PHONE_ENCRYPTION_KEY` | Backend (`apps/api`) | 32-byte hexadecimal AES-256-GCM cipher key | **Yes (in Prod)** | 64-char hex string |
| `RAZORPAY_KEY_ID` | Backend & Frontend | Razorpay merchant public key | Conditional (Online) | `rzp_test_...` |
| `RAZORPAY_KEY_SECRET` | Backend (`apps/api`) | Razorpay merchant secret key | Conditional (Online) | (secret key) |
| `RAZORPAY_WEBHOOK_SECRET` | Backend (`apps/api`) | Secret for webhook signature verification | Conditional (Online) | (secret key) |
| `OTP_PROVIDER` | Backend (`apps/api`) | SMS OTP provider mode (`mock`, `msg91`, `twilio`) | No (Defaults to `mock`) | `mock` |
| `MSG91_AUTH_KEY` | Backend (`apps/api`) | Auth key for MSG91 SMS gateway | No | (alphanumeric key) |
| `MSG91_TEMPLATE_ID` | Backend (`apps/api`) | Approved DLT SMS template identifier | No | (numeric ID) |
| `SENTRY_DSN` | Backend (`apps/api`) | Sentry error monitoring APM DSN | No | `https://...@sentry.io/...` |
| `NEXT_PUBLIC_SENTRY_DSN` | Frontend (`apps/web`) | Sentry client-side error tracking DSN | No | `https://...@sentry.io/...` |
| `CAFE_NAME` | Backend & Shared | Café brand display name | No (Defaults to `Chai Partner`) | `Chai Partner` |
| `DEFAULT_TABLE_COUNT` | Backend (`apps/api`) | Total number of tables to seed | No (Defaults to `25`) | `25` |
| `SESSION_TTL_MINUTES` | Backend (`apps/api`) | In-dining session lifespan | No (Defaults to `120`) | `120` |
| `GST_PERCENT` | Backend & Shared | GST tax percentage rate | No (Defaults to `5.0`) | `5.0` |

---

# 13. UI/UX System

### 13.1 Visual Design Tokens
The design reflects an **Artisan Modern Minimalist Café** aesthetic, elevated from early mockups to feel premium and state of the art:
- **Canvas / Surfaces:**
  - `canvas`: `#FAFAF8` (warm off-white foundation).
  - `canvas-pure` / `white`: `#FFFFFF` (clean elevated card backgrounds).
  - `canvas-warm`: `#F5F3EF` (secondary soft panel tone).
- **Ink Scale (Typography):**
  - `ink`: `#1A1A18` (deep near-black ink for headers, primary actions).
  - `ink-muted`: `#4A4A46` (high-readability body copy).
  - `ink-faint`: `#8A8A84` (subtle captions, timestamps, table seat counts).
  - `ink-ultra`: `#C8C8C2` (minimal hairline dividers).
- **Accents:**
  - `gold`: `#B8935A` (warm artisan tea gold for badges, highlights, counters).
  - `gold-deep`: `#8F6B36` (hover state).
  - `gold-pale`: `#F4E9D8` (ultra-soft pill container backgrounds).
- **Semantic Feedback:**
  - Success (`ok`): Text `#4A7C59`, Background `#EAF3EB`, Border `#B8D4BC`.
  - Attention (`warn`): Text `#B07C3A`, Background `#FBF4E8`, Border `#E2C38A`.
  - Destructive (`danger`): Text `#A0392A`, Background `#F9EDEA`, Border `#E0B0A8`.

### 13.2 Typography Hierarchy
- **Display Headings:** `Cormorant Garamond` (loaded via Google Fonts) for hero branding and artisan titles.
- **Editorial Headings:** `Playfair Display` for section titles, modal headers, and stage cards.
- **Body & Controls:** `Inter` for crisp readability on mobile screens, steppers, and pricing.
- **Monospace:** `JetBrains Mono` for order numbers (`CP-1001`), timestamps, and financial figures.

### 13.3 Mobile & Responsive Behavior
- **Mobile (<640px):** Single-column layout. Sticky top header displaying current table number and session timer. Sticky bottom cart drawer with instant quantity badge. Horizontal scrolling category filter chips. Touch targets exceeding 44×44px.
- **Tablet & Counter (640px–1024px):** 2-column menu layout. Admin Orders queue displays a scrollable card grid optimized for touch interaction on counter tablets.
- **Desktop (>1024px):** Denser administrative layout. Full 4-tab top navigation (`Live Queue`, `Menu`, `History`, `Analytics`). Multi-card grid layouts for floor occupancy.

---

# 14. Important Dependencies

### 14.1 Backend Dependencies (`apps/api/package.json`)
- `@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`: Core server architecture and HTTP pipeline.
- `@nestjs/typeorm` & `typeorm`: Database abstraction, entity mapping, and transactional QueryRunners.
- `@nestjs/websockets` & `socket.io`: Real-time WebSocket server handling floor state synchronization.
- `@nestjs/jwt` & `passport-jwt`: JWT token creation, signing, and verification.
- `bcryptjs`: Password hashing for admin accounts.
- `razorpay`: Official Razorpay Node.js SDK for server-side order generation.
- `class-validator` & `class-transformer`: Request body validation and DTO transformations.
- `sqlite3`: Embedded database driver for development.
- `pg`: Enterprise PostgreSQL driver for containerized production.
- `pdfkit` & `qrcode`: Generation of printable QR codes and thermal KOT formatting.

### 14.2 Frontend Dependencies (`apps/web/package.json`)
- `next`: React application framework providing App Router, SSR, and production builds.
- `react`, `react-dom`: Component rendering library.
- `socket.io-client`: Real-time WebSocket client connecting to the backend EventsGateway.
- `lucide-react`: Modern SVG vector icons.
- `clsx` & `tailwind-merge`: Conditional class merging utilities.
- `tailwindcss`, `postcss`, `autoprefixer`: CSS compilation and design token utilities.

---

# 15. External Services

1. **Razorpay Payments:**
   - **Integration Point:** [`payments.service.ts`](file:///e:/client/apps/api/src/modules/payments/payments.service.ts) & [`checkout/page.tsx`](file:///e:/client/apps/web/src/app/(customer)/checkout/page.tsx).
   - **Operations:** Server creates Razorpay Orders (`orders.create`), client renders checkout widget (`checkout.js`), server verifies signature HMAC (`crypto.createHmac('sha256')`), and webhooks capture asynchronously (`payment.captured`, `payment.failed`).
2. **SMS / OTP Service:**
   - **Integration Point:** [`sessions.service.ts`](file:///e:/client/apps/api/src/modules/sessions/sessions.service.ts).
   - **Operations:** Configurable via `OTP_PROVIDER` (`mock`, `msg91`, `twilio`). In development/mock mode, code `123456` is pre-filled for rapid testing. In production, connects to India SMS gateways.
3. **Application Performance Monitoring (Sentry):**
   - **Integration Point:** [`main.ts`](file:///e:/client/apps/api/src/main.ts).
   - **Operations:** Wires global error logging when `SENTRY_DSN` is configured.
4. **Thermal Printer Integration:**
   - **Integration Point:** [`admin/orders/page.tsx`](file:///e:/client/apps/web/src/app/(admin)/admin/orders/page.tsx).
   - **Operations:** Generates standard 80mm KOT slips formatted via `@media print` CSS and browser print dialog.

---

# 16. Deployment & Production Setup

### 16.1 Build & Runtime Commands

```bash
# Install all dependencies across monorepo
npm install

# Build all packages and apps (shared library, NestJS API, Next.js Web)
npm run build

# Run entire backend test suite (Jest)
npm run test

# Run API in development watch mode
npm run dev:api

# Run Frontend in development mode
npm run dev:web

# Seed database with 25 tables, 3 admin accounts, and full menu
npm run seed

# Export printable QR codes and HTML table cards
npm run export-qr

# Run daily payment reconciliation report
npm run reconcile
```

### 16.2 Production Orchestration
To deploy the backend database and cache in a production cloud environment, use the included Docker Compose configuration:

```bash
docker compose up -d
```
This spins up:
- **PostgreSQL 16** (`postgres:16-alpine`) with persistent volume `postgres_data` and auto-initialization script `init.sql` (`uuid-ossp` extension).
- **Redis 7** (`redis:7-alpine`) with healthcheck probing and data persistence volume `redis_data`.

The API server runs as `node dist/main` inside `apps/api`, and the Next.js frontend builds via `next build` and runs via `next start -p 3000` inside `apps/web`.

---

# 17. Current Implementation vs Planned Requirements

| Planned Requirement | Implemented? | Evidence / File | Notes |
|---|---|---|---|
| **25 Tables with Live Grid** | **YES** | [`seed.ts`](file:///e:/client/apps/api/src/database/seeds/seed.ts), [`page.tsx`](file:///e:/client/apps/web/src/app/page.tsx) | Tables 1–25 seeded with varying seat counts (2, 4, 6 seats). |
| **Signed QR per Table** | **YES** | [`crypto.service.ts`](file:///e:/client/apps/api/src/common/services/crypto.service.ts), [`utils/index.ts`](file:///e:/client/packages/shared/src/utils/index.ts) | HMAC-SHA256 tokens (`table_X_<hash>`). |
| **Name + Phone OTP Verification** | **YES** | [`sessions.service.ts`](file:///e:/client/apps/api/src/modules/sessions/sessions.service.ts), [`verify/page.tsx`](file:///e:/client/apps/web/src/app/(customer)/verify/page.tsx) | Enforces 10-digit phone, rate limiting, and 2h session creation. |
| **2-Hour Session Expiry Warning** | **YES** | [`session-sweeper.service.ts`](file:///e:/client/apps/api/src/modules/sessions/session-sweeper.service.ts) | Automated 60s background sweep checks warning threshold (10 min). |
| **Categorized Digital Menu** | **YES** | [`menu.service.ts`](file:///e:/client/apps/api/src/modules/menu/menu.service.ts), [`menu/page.tsx`](file:///e:/client/apps/web/src/app/(customer)/menu/page.tsx) | 13 categories (Milk Tea, Coffee, Coolers, Bites, Pizza, etc.). |
| **Live Bestseller / Stock Toggles**| **YES** | [`menu.controller.ts`](file:///e:/client/apps/api/src/modules/menu/menu.controller.ts), [`admin/menu/page.tsx`](file:///e:/client/apps/web/src/app/(admin)/admin/menu/page.tsx) | Immediate stock toggle via WebSocket/REST. |
| **Cart & 5% GST Calculation** | **YES** | [`useCart.ts`](file:///e:/client/apps/web/src/hooks/useCart.ts), [`orders.service.ts`](file:///e:/client/apps/api/src/modules/orders/orders.service.ts) | Snapshots item prices at placement; calculates exact GST. |
| **Idempotency Key Enforcement** | **YES** | [`orders.service.ts`](file:///e:/client/apps/api/src/modules/orders/orders.service.ts) | Header `Idempotency-Key` checked and recorded in database. |
| **Razorpay + Cash Settlement** | **YES** | [`payments.service.ts`](file:///e:/client/apps/api/src/modules/payments/payments.service.ts), [`checkout/page.tsx`](file:///e:/client/apps/web/src/app/(customer)/checkout/page.tsx) | Dual payment flow with webhook capture and counter cash settlement. |
| **Live Order Tracking Timeline** | **YES** | [`track/[id]/page.tsx`](file:///e:/client/apps/web/src/app/(customer)/track/[id]/page.tsx) | Real-time stage indicators (`Placed` → `Accepted` → `Preparing` → `Ready` → `Served`). |
| **Reorder from Tracking Page** | **YES** | [`track/[id]/page.tsx`](file:///e:/client/apps/web/src/app/(customer)/track/[id]/page.tsx) | "Order More Items" retains active table session and opens menu. |
| **Admin Live Orders Queue** | **YES** | [`admin/orders/page.tsx`](file:///e:/client/apps/web/src/app/(admin)/admin/orders/page.tsx) | Sorted oldest-first with audio chime on incoming tickets. |
| **KOT Thermal Ticket Print** | **YES** | [`admin/orders/page.tsx`](file:///e:/client/apps/web/src/app/(admin)/admin/orders/page.tsx) | Printable KOT slip formatted with item quantities and table numbers. |
| **Force-Vacate with Audit Reason** | **YES** | [`tables.service.ts`](file:///e:/client/apps/api/src/modules/tables/tables.service.ts) | Mandatory reason logged to `audit_log` before freeing table. |
| **Counter Refund & Cancellation** | **YES** | [`refunds.service.ts`](file:///e:/client/apps/api/src/modules/refunds/refunds.service.ts) | Logs refund amount and reason; updates payment status to `REFUNDED`. |
| **Multi-Period Analytics** | **YES** | [`analytics.service.ts`](file:///e:/client/apps/api/src/modules/analytics/analytics.service.ts), [`admin/analytics/page.tsx`](file:///e:/client/apps/web/src/app/(admin)/admin/analytics/page.tsx) | Revenue, AOV, repeat rate, bestsellers, trends across Day/Week/Month/Year. |
| **Ghost Session Sweeper** | **YES** | [`session-sweeper.service.ts`](file:///e:/client/apps/api/src/modules/sessions/session-sweeper.service.ts) | Automatic 60-second background cleanup of expired orderless sessions. |
| **Daily Reconciliation Report** | **YES** | [`daily-reconciliation-report.ts`](file:///e:/client/apps/api/src/scripts/daily-reconciliation-report.ts) | CLI tool detecting pending unbilled orders exceeding threshold hours. |

---

# 18. Known Problems & Technical Debt

### Critical Issues
*None.* All compiler errors, guard mismatches, and race conditions were audited and resolved.

### High Priority
1. **SMS Gateway Production Binding:** The OTP service is currently configured with the `mock` provider (OTP is static `123456`). Before customer production release, `MSG91_AUTH_KEY` or `Twilio` credentials must be bound in [`sessions.service.ts`](file:///e:/client/apps/api/src/modules/sessions/sessions.service.ts).

### Medium Priority
1. **Redis Implementation for Ephemeral State:** While `docker-compose.yml` configures Redis 7, session rate limits in [`sessions.service.ts`](file:///e:/client/apps/api/src/modules/sessions/sessions.service.ts) currently reside in ephemeral Node.js memory maps (`phoneRateLimits`, `tableRateLimits`). If API instances scale horizontally across multiple containers, migrating these maps to Redis keyspace is recommended.
2. **Thermal Printer Direct IP Interface:** KOT printing currently invokes the browser native `window.print()` dialog. In high-tempo commercial kitchens, integrating direct network socket printing (ESC/POS over TCP port 9100) provides one-touch silent ticket printing.

### Low Priority
1. **Image Upload Service:** Menu item images in [`menu.service.ts`](file:///e:/client/apps/api/src/modules/menu/menu.service.ts) rely on external URLs (`image_url`). Adding a direct S3/MinIO multipart upload endpoint would allow staff to upload photos directly from phone cameras.

---

# 19. Important Code Relationships

### 1. In-Dining Order Loop Call Graph
```
Customer scans QR: /t/[token]
    └── Page: apps/web/src/app/(customer)/t/[token]/page.tsx
        ├── Calls: apiFetch('/tables/:token/resolve')
        │     └── API: apps/api/src/modules/tables/tables.controller.ts (resolveToken)
        │           └── Service: apps/api/src/modules/tables/tables.service.ts
        │                 └── Crypto: apps/api/src/common/services/crypto.service.ts (verifyQrToken)
        └── Customer clicks 'Sit & Start Ordering': /verify
              └── Page: apps/web/src/app/(customer)/verify/page.tsx
                  ├── Calls: apiFetch('/sessions/verify/request-otp')
                  │     └── API: apps/api/src/modules/sessions/sessions.controller.ts
                  │           └── Service: apps/api/src/modules/sessions/sessions.service.ts (requestOtp)
                  ├── Calls: apiFetch('/sessions/verify/confirm-otp')
                  │     └── Service: apps/api/src/modules/sessions/sessions.service.ts (verifyOtpAndCreateSession)
                  │           └── Stores cp_session_token & cp_session_id in browser localStorage
                  └── Customer navigates to: /menu
                        └── Page: apps/web/src/app/(customer)/menu/page.tsx
                            ├── Hook: apps/web/src/hooks/useCart.ts (Cart state in localStorage)
                            └── Checkout: apps/web/src/app/(customer)/checkout/page.tsx
                                  └── Calls: apiFetch('/orders', { method: 'POST', idempotencyKey })
                                        └── API: apps/api/src/modules/orders/orders.controller.ts (placeOrder)
                                              └── Service: apps/api/src/modules/orders/orders.service.ts
                                                    ├── DB: Snapshots MenuItemEntity price to OrderItemEntity
                                                    └── Gateway: apps/api/src/modules/events/events.gateway.ts (emitNewOrder)
                                                          └── Staff UI: apps/web/src/app/(admin)/admin/orders/page.tsx
                                                                └── Socket event "order:new" triggers sound & live card
```

### 2. Table Lifecycle & Force-Vacate Call Graph
```
Admin vacates table on /admin/orders
    └── Action: handleForceVacate(tableId, reason)
        └── Calls: apiFetch('/tables/:id/force-vacate', { method: 'POST', body: { reason } })
              └── API: apps/api/src/modules/tables/tables.controller.ts (forceVacate)
                    └── Guards: AdminAuthGuard -> RolesGuard (Verifies Admin/Cashier role)
                    └── Service: apps/api/src/modules/tables/tables.service.ts (forceVacate)
                          ├── DB: Closes all active sessions (SessionStatus.CLOSED)
                          ├── DB: Marks SERVED/PAID orders as BILLED; cancels others
                          ├── DB: Marks table available (TableStatus.AVAILABLE)
                          ├── Audit: apps/api/src/modules/audit/audit.service.ts (TABLE_FORCE_VACATE)
                          └── Gateway: apps/api/src/modules/events/events.gateway.ts
                                ├── Emits table:status_changed -> Updates Floor Grid
                                └── Emits order:status_changed -> Alerts customer /track/[id] page
```

---

# 20. How to Modify the Project Safely

| Task | Files / Folders to Modify | Things to Watch / Non-Negotiables |
|---|---|---|
| **Add New Menu Category or Item** | [`seed.ts`](file:///e:/client/apps/api/src/database/seeds/seed.ts) or Admin UI (`/admin/menu`) | Always specify `veg_flag` and `price`. Prices must be positive numbers. |
| **Change Menu UI / Card Styles** | [`menu/page.tsx`](file:///e:/client/apps/web/src/app/(customer)/menu/page.tsx) | Keep tap targets above 44px on mobile; do not break `getItemCartQty` stepper logic. |
| **Change Tax / GST Percentage** | [`constants/index.ts`](file:///e:/client/packages/shared/src/constants/index.ts), [`.env`](file:///e:/client/.env) | `GST_RATE` is shared; modify in `@chai-partner/shared` and rebuild workspace (`npm run build`). |
| **Modify Order Lifecycle Stages** | [`constants/index.ts`](file:///e:/client/packages/shared/src/constants/index.ts), [`orders.service.ts`](file:///e:/client/apps/api/src/modules/orders/orders.service.ts) | Update `validTransitions` map in `OrdersService.transitionStatus`. Every state transition must remain guarded. |
| **Add Admin Role Permissions** | [`constants/index.ts`](file:///e:/client/packages/shared/src/constants/index.ts), controller files | Modify `AdminRole` enum, update `@Roles(...)` metadata in respective controller methods. |
| **Change Theme Colors / Palette**| [`tailwind.config.js`](file:///e:/client/apps/web/tailwind.config.js), [`globals.css`](file:///e:/client/apps/web/src/app/globals.css) | Modify tokens under `colors.canvas`, `colors.ink`, `colors.gold`. Retain legacy color aliases for compatibility. |
| **Change Database Engine** | [`.env`](file:///e:/client/.env), [`data-source.ts`](file:///e:/client/apps/api/src/database/data-source.ts) | Set `DB_TYPE=postgres` and supply PostgreSQL credentials. Schema synchronizes automatically. |
| **Switch from Mock to Live SMS** | [`sessions.service.ts`](file:///e:/client/apps/api/src/modules/sessions/sessions.service.ts), [`.env`](file:///e:/client/.env) | Set `OTP_PROVIDER=msg91` or `twilio`, configure template IDs in environment variables. |

---

# 21. Recommended Development Workflow

1. **Verify Runtime Environment:** Ensure Node.js 20+ and npm are active.
2. **Review Environment Configuration:** Check that [`.env`](file:///e:/client/.env) exists in the repository root (copy from `.env.example` if needed).
3. **Run Full Monorepo Build:**
   ```bash
   npm run build
   ```
   Ensures `@chai-partner/shared` is compiled to `dist/` before apps start.
4. **Execute Automated Test Suite:**
   ```bash
   npm run test
   ```
   Validates that all 39 integration tests pass against database constraints.
5. **Start Development Servers:**
   - Terminal 1 (Backend API):
     ```bash
     npm run dev:api
     ```
     Verifies API listening on `http://localhost:4000/api`.
   - Terminal 2 (Frontend Web):
     ```bash
     npm run dev:web
     ```
     Verifies Next.js app running on `http://localhost:3000`.
6. **Simulate User Journeys in Browser:**
   - Navigate to `http://localhost:3000` (Home Simulator).
   - Select Table 1, click "Launch Guest View" (`/t/<token>`).
   - Complete OTP verification (use mock OTP `123456`).
   - Add items to cart and place cash/online order.
   - In another tab, log into `http://localhost:3000/admin/login` (`admin@chaipartner.com` / `admin123`).
   - Advance ticket through Kitchen Queue, print KOT, and settle order at counter.

---

# 22. Final System Map

```mermaid
graph TD
    subgraph Users
        Cust[Guest at Table]
        Chef[Head Chef / Kitchen]
        Cashier[Counter Cashier]
        Owner[Cafe Owner / Admin]
    end

    subgraph NextJS_App [Frontend - Next.js 14]
        LandingPage["/t/[token] (Landing)"]
        VerifyPage["/verify (OTP)"]
        MenuPage["/menu (Menu & Cart)"]
        CheckoutPage["/checkout (Billing)"]
        TrackPage["/track/[id] (Timeline)"]
        AdminOrders["/admin/orders (Live Queue & KOT)"]
        AdminMenu["/admin/menu (Stock & Price)"]
        AdminHistory["/admin/history (Audits & Refunds)"]
        AdminAnalytics["/admin/analytics (BI Dashboard)"]
    end

    subgraph State_Management
        CartHook[useCart Hook & localStorage]
        SocketClient[getSocket & useSocketResync]
        AdminAuthStore[Admin JWT & User State]
    end

    subgraph NestJS_Backend [Backend - NestJS 10]
        APIGateway[REST API Gateway - /api/*]
        SocketGateway[Socket.io EventsGateway]
        Sweeper[Ghost Session Sweeper Task]
        Crypto[CryptoService - AES-256 & HMAC]
    end

    subgraph Database_Layer [TypeORM Data Store]
        DB_Tables[(tables)]
        DB_Sessions[(sessions)]
        DB_Menu[(menu_categories & menu_items)]
        DB_Orders[(orders & order_items)]
        DB_Payments[(payments & refunds)]
        DB_Audit[(audit_log)]
        DB_Idemp[(idempotency_keys)]
    end

    Cust --> LandingPage --> VerifyPage --> MenuPage --> CheckoutPage --> TrackPage
    Chef --> AdminOrders
    Cashier --> AdminOrders & AdminHistory
    Owner --> AdminOrders & AdminMenu & AdminHistory & AdminAnalytics

    MenuPage <--> CartHook
    TrackPage <--> SocketClient
    AdminOrders <--> SocketClient
    AdminOrders <--> AdminAuthStore

    CheckoutPage -->|POST /orders| APIGateway
    AdminOrders -->|PATCH /status, POST /settle| APIGateway
    SocketClient <-->|Events: order:new, status_changed| SocketGateway

    APIGateway --> Crypto
    APIGateway --> DB_Tables & DB_Sessions & DB_Menu & DB_Orders & DB_Payments & DB_Audit & DB_Idemp
    Sweeper --> DB_Sessions & DB_Tables
```

---

# 23. AI Developer Quick Context

* **What is this project?** A complete, production-grade, in-dining QR table ordering, billing, live kitchen queue, and analytics system named **Chai Partner** designed for a 25-table cafe.
* **What stack does it use?** TypeScript npm monorepo. Frontend: Next.js 14 App Router with Tailwind CSS and Socket.io client. Backend: NestJS 10 with TypeORM, SQLite3 (dev/test) / PostgreSQL (prod), and Socket.io gateway. Shared: `@chai-partner/shared` library.
* **Where does the frontend start?** [`apps/web/src/app/layout.tsx`](file:///e:/client/apps/web/src/app/layout.tsx) mounts the app. Customer entry is [`apps/web/src/app/(customer)/t/[token]/page.tsx`](file:///e:/client/apps/web/src/app/(customer)/t/[token]/page.tsx). Admin entry is [`apps/web/src/app/(admin)/admin/login/page.tsx`](file:///e:/client/apps/web/src/app/(admin)/admin/login/page.tsx).
* **Where does the backend start?** [`apps/api/src/main.ts`](file:///e:/client/apps/api/src/main.ts) initializes NestJS on port 4000 with global prefix `/api` and `{ rawBody: true }`.
* **Where is data stored?** Local persistence in SQLite [`chai_partner.sqlite`](file:///e:/client/chai_partner.sqlite) managed by TypeORM. In production, Docker Compose spins up PostgreSQL 16.
* **How does routing work?** Next.js App Router route groups: `(customer)` for guests, `(admin)` for staff. Dynamic routes: `/t/[token]` (QR resolver), `/track/[id]` (order tracking).
* **How does authentication work?** Customers get a 2-hour JWT upon confirming SMS/mock OTP (`123456`) in [`sessions.service.ts`](file:///e:/client/apps/api/src/modules/sessions/sessions.service.ts). Staff authenticate with bcrypt-hashed passwords in [`auth.service.ts`](file:///e:/client/apps/api/src/modules/auth/auth.service.ts) and receive a 24-hour admin JWT with role (`admin`, `kitchen`, `cashier`).
* **What are the major features?** QR code table resolution, OTP verification, 2h session lifecycle with automated sweeper, categorized digital menu with stock toggles, cart with immutable price snapshotting and 5% GST, idempotent checkout, Razorpay and cash payments, real-time live order tracking timeline, oldest-first kitchen queue with KOT printing, guarded order status transitions, counter bill settlement, audited force-vacating, cancellation refunds, and multi-period analytics.
* **Which files control each major feature?**
  - Table Resolution & Vacating: [`tables.service.ts`](file:///e:/client/apps/api/src/modules/tables/tables.service.ts), [`t/[token]/page.tsx`](file:///e:/client/apps/web/src/app/(customer)/t/[token]/page.tsx)
  - Sessions & OTP: [`sessions.service.ts`](file:///e:/client/apps/api/src/modules/sessions/sessions.service.ts), [`session-sweeper.service.ts`](file:///e:/client/apps/api/src/modules/sessions/session-sweeper.service.ts)
  - Menu: [`menu.service.ts`](file:///e:/client/apps/api/src/modules/menu/menu.service.ts), [`menu/page.tsx`](file:///e:/client/apps/web/src/app/(customer)/menu/page.tsx), [`admin/menu/page.tsx`](file:///e:/client/apps/web/src/app/(admin)/admin/menu/page.tsx)
  - Orders & Transitions: [`orders.service.ts`](file:///e:/client/apps/api/src/modules/orders/orders.service.ts), [`checkout/page.tsx`](file:///e:/client/apps/web/src/app/(customer)/checkout/page.tsx), [`admin/orders/page.tsx`](file:///e:/client/apps/web/src/app/(admin)/admin/orders/page.tsx)
  - Real-Time Sockets: [`events.gateway.ts`](file:///e:/client/apps/api/src/modules/events/events.gateway.ts), [`socket.ts`](file:///e:/client/apps/web/src/lib/socket.ts)
  - Payments & Webhooks: [`payments.service.ts`](file:///e:/client/apps/api/src/modules/payments/payments.service.ts)
  - Analytics & History: [`analytics.service.ts`](file:///e:/client/apps/api/src/modules/analytics/analytics.service.ts), [`admin/analytics/page.tsx`](file:///e:/client/apps/web/src/app/(admin)/admin/analytics/page.tsx), [`admin/history/page.tsx`](file:///e:/client/apps/web/src/app/(admin)/admin/history/page.tsx)
* **What must NOT be changed casually?**
  1. The 9 BRAIN engineering rules in [`docs/BRAIN.md`](file:///e:/client/docs/BRAIN.md).
  2. Guarded status transitions (`WHERE status = <expected>`). Never write blind status updates.
  3. `order_items.unit_price` immutability. Never join historical orders back to live menu prices.
  4. Mandatory `Idempotency-Key` requirement on order placement.
  5. Cryptographic HMAC verification for table QR tokens and Razorpay webhooks.
  6. Table freeing conditions: a table only becomes available via ghost sweep (0 orders), admin billing settlement, or logged force-vacate. Never auto-free an occupied table while unbilled orders exist.
