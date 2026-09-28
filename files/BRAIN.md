# BRAIN.md
## Master Context File — QR-Based Table Ordering & Billing System ("Chai Partner")

Purpose of this file: a single source of truth for anyone (human or AI coding assistant) picking up this project, so decisions already made aren't re-litigated and known failure modes aren't reintroduced. Read this before touching code. Full detail lives in the companion docs — **PRD.md**, **TRD.md**, **UI-UX-Design-Brief.md**, **App-Flow.md** — this file is the condensed, load-bearing summary.

---

## 1. What This Project Is

A responsive web (PWA) system for a 25-table cafe: customers scan a per-table QR code, verify via OTP, order from a category-wise digital menu, pay online (Razorpay) or at the counter (cash), and track their order live. Staff run the whole lifecycle — accept, prepare, ready, bill — from an admin dashboard, plus manage the menu, view order history, and see sales analytics.

Not a generic food-delivery clone: it's **table-bound, single-location, session-scoped**. Every design decision should respect that scope — don't build for multi-restaurant or delivery-address complexity that doesn't exist here.

---

## 2. Tech Stack (decided — don't re-debate without reason)

- Frontend: Next.js (React), PWA-enabled, mobile-first responsive.
- Backend: Node.js (NestJS/Express) + Socket.io for real-time.
- DB: PostgreSQL. Cache/ephemeral state: Redis.
- Payments: Razorpay (Orders API + Webhooks).
- OTP: third-party Verify API (not hand-rolled).
- Hosting: Docker, managed Postgres/Redis.

Full rationale in TRD.md §1.

---

## 3. Non-Negotiable Engineering Rules

These exist because each one maps to a specific bug class already identified — do not skip them to move faster.

1. **Every order-status/session-status/payment-status change is a guarded transactional UPDATE** (`WHERE status = <expected>`), never a blind write. Prevents double-accept races and illegal state jumps.
2. **`order_items.unit_price` is snapshotted at order-placement time and is immutable.** Never join back to live `menu_items.price` for historical orders.
3. **Payment status is only ever confirmed via server-side signature verification + Razorpay webhook.** The browser's post-checkout callback is a UI hint only, never the write path.
4. **All order creation requires an `Idempotency-Key` header**, deduplicated server-side. No exceptions for "it's just a quick fix."
5. **One active session per table, enforced at the DB level** (partial unique index), not just application logic.
6. **A table only becomes `available` via: (a) ghost-session sweep with zero orders, (b) admin billing settlement, or (c) admin force-vacate with logged reason.** Never auto-freed just because a session's 2-hour timer expired while an unbilled order exists.
7. **Every refund — cash or online — is logged** (amount, reason, processed_by) before an order can be marked cancelled.
8. **QR tokens are signed/rotatable per table**, not raw table numbers — mitigates the "old photographed QR" fraud scenario.
9. **All admin state-changing actions write to `audit_log`.** No silent overrides.

---

## 4. Known Open Product Decisions (resolve before building the affected feature)

- Shared session vs. one-session-per-person at a table with multiple people ordering.
- Whether kitchen order status is tracked at the item level or only the order level.
- Whether partial item cancellation is allowed before kitchen acceptance.
- Tax/service-charge rules (flat % vs. category-dependent).
- Printer integration method (network thermal printer vs. browser print dialog).

See PRD.md §10 and App-Flow.md for how these currently default (order-level status, order-level cancel only) until explicitly changed.

---

## 5. Design Direction (condensed — full detail in UI-UX-Design-Brief.md)

- Palette: warm cream background, deep coffee-brown text, terracotta-brown primary accent, sage secondary accent — matches the cafe's existing menu branding.
- Simple, classy, minimal-motion. One primary action per screen.
- Mobile-first for customer flow; tablet/PC-optimized for admin dashboard.
- Status always conveyed by color **and** text/icon, never color alone.

---

## 6. Data Model Summary (full schema in TRD.md §3)

`tables`, `sessions`, `menu_categories`, `menu_items`, `orders`, `order_items`, `payments`, `refunds`, `admin_users`, `audit_log`, `idempotency_keys`.

Key relationships: a `session` belongs to a `table`; an `order` belongs to a `session` and (denormalized) a `table`; `order_items` snapshot price at write time; `payments` and `refunds` link to `orders`.

---

## 7. Build Order (see PRD.md §9 / TRD.md for detail)

1. Core loop, cash-only, manual billing.
2. Razorpay integration + webhook verification.
3. Session/table-state hardening (ghost sweeper, force-vacate, conflict handling).
4. Full admin depth (menu mgmt, history, RBAC).
5. Analytics, printer integration, polish.

Do not skip ahead to Phase 4/5 features before Phase 1–3's reliability guarantees are in place — the bug list this project is built around (double-booked tables, unreconciled cash orders, duplicate orders) all live in Phases 1–3.

---

## 8. What "Done" Looks Like for v1

- A customer can scan, verify, order, pay (either method), and track a full order lifecycle without staff intervention.
- Staff can run the entire floor (accept/prepare/ready/bill) from the dashboard with zero manual reconciliation gaps at end of day.
- No table can end up double-occupied, silently unbilled, or orphaned by a crashed session.
- Owner can see, at a glance, what sold best and who's a repeat customer.

Anything beyond this (bill-splitting, loyalty, multi-branch, native apps) is explicitly v2 — see PRD.md §5.2.
