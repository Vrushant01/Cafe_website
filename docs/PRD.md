# Product Requirement Document (PRD)
## Project: QR-Based Table Ordering & Billing System — "Chai Partner"

**Version:** 1.0
**Status:** Draft for build
**Owner:** Product/Founder

---

## 1. Purpose & Vision

Replace manual, waiter-dependent ordering at a 25-table cafe with a self-serve QR flow: a customer scans a code at their table, verifies identity via OTP, browses the menu, orders, pays (or defers to counter), and tracks their food live — while staff run the entire order lifecycle and daily operations from one admin dashboard.

**Vision statement:** Make ordering feel as fast as a food-delivery app, without losing the "walk in, sit down, chai arrives" simplicity of a cafe.

---

## 2. Problem Statement

- Manual order-taking is slow during peak hours and error-prone (missed items, wrong tables).
- No visibility for customers into how long their order will take.
- No structured way to track table occupancy, repeat customers, or sales trends.
- Cash-heavy billing makes reconciliation and fraud (walkouts, under-billing) hard to control.

---

## 3. Target Users / Personas

| Persona | Description | Core Need |
|---|---|---|
| **Walk-in Customer** | Scans QR at their table on a phone browser | Order quickly without waiting for staff, know when food is coming |
| **Repeat Customer** | Regular who's ordered before | Fast re-verification, sees bestsellers/history implicitly via same phone number |
| **Kitchen Staff** | Watches the order queue | Clear, ordered list of what to cook next, printable KOT |
| **Cashier** | Settles bills at the counter | Quick lookup of a table's order bucket, clear pending-payment flags |
| **Owner/Admin** | Manages menu, prices, and reviews performance | Full visibility into sales, best-sellers, repeat rate, historical orders |

---

## 4. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Reduce order-taking time | Time from table scan to order placed < 3 min average |
| Reduce billing errors/disputes | Zero unbilled-but-vacated tables per week |
| Increase upsell | Bestseller-tagged items make up a rising % of order volume |
| Operational visibility | Owner can answer "what sold best this month" in one dashboard view |
| Reliability | Zero double-booked tables; zero duplicate orders from retries |

---

## 5. Scope

### 5.1 In Scope (v1)
- QR-per-table landing with live table-status grid (25 tables, seat counts).
- Name + phone (OTP) verification; optional email.
- 2-hour session per table, auto-expiry with grace warning.
- Category-wise digital menu (per uploaded menu: Milk Tea, Milk, Coeeff, Coolers, Without Milk Tea, Ice Tea, Bites, Desi Garam, Sandwich, Maggie, Nanchos, Moctails, Pizza), with bestseller highlighting and availability toggling.
- Cart, checkout, grand total with tax breakup.
- Payment: Razorpay online, or Cash-at-counter.
- Order tracking screen with timeline (Ordered → Accepted → Preparing → Ready → Served) and reorder action.
- Cancellation-with-advance-payment flow via billing counter, with refund logging.
- Admin dashboard: Orders (live queue + 4-stage actions + KOT print), Menu management, Order History (search/filter), Analytics (sales graphs, bestsellers, repeat customers).
- Manager-contact fallback when a table shows falsely occupied.

### 5.2 Out of Scope (v1 — candidates for v2)
- Bill splitting by item/person.
- Item-level customization (spice level, add-ons) beyond existing half/full options.
- Loyalty points / rewards program.
- Native mobile apps (v1 is a responsive web PWA only).
- Multi-branch/multi-location support.
- Automated Razorpay refunds (v1 refunds are manual, counter-driven, but logged in-system).

---

## 6. Functional Requirements

### 6.1 Customer-Facing
1. Scanning a table's QR opens a page showing that table pre-selected plus a full grid of all 25 tables with live status (available/occupied) and seat count.
2. If the resolved table is occupied but the customer believes it's free, they can tap "Contact Manager," which shows the manager's name/number and simultaneously notifies the admin dashboard.
3. Verification requires full name + phone number, confirmed via OTP; email is optional.
4. On successful verification, a 2-hour session begins and the table is marked occupied.
5. Customer browses menu grouped by category; bestseller items are visually highlighted; unavailable items are disabled with a badge.
6. Customer adds items to cart, sees a running subtotal, proceeds to checkout showing grand total with tax (GST) broken out.
7. Customer chooses Razorpay (online) or Cash at counter.
8. On order placement, customer is shown a tracking screen with a cooking-themed animation, an estimated wait (25–30 min), and a live status timeline.
9. Customer may reorder the same items directly from the tracking screen.
10. If the customer paid in advance and wants to cancel, they're directed to the billing counter for manual cancellation/refund.
11. Session auto-expires after 2 hours of the ordering flow being idle; a warning appears 10 minutes prior, and any active checkout in progress is not interrupted.

### 6.2 Admin/Staff-Facing
1. **Orders tab:** live queue sorted oldest-first; each order has Accept → Print KOT, Preparing, Ready/Completed, and Billing actions.
2. Billing action shows green (advance paid) or red ("Payment Pending") badge; opening it reveals the order bucket with an Online/Cash settle action.
3. Completing billing removes the order from the active queue and closes/frees the associated table session.
4. **Menu tab:** add/edit/remove items per category, toggle Unavailable, toggle Bestseller, edit prices.
5. **Order History tab:** search by customer name, phone, or order ID; filter by day/week/month/year; view payment method per order.
6. **Analytics tab:** graphs for best-selling items, repeat-customer rate, highest/lowest sales periods.
7. Admin can force-vacate a table (with mandatory reason, logged) when a session is stuck or abandoned.

---

## 7. Non-Functional Requirements

- **Responsiveness:** must work smoothly on mobile, tablet, and desktop/PC browsers (customers primarily on mobile; admin dashboard used on tablet/PC at the counter and kitchen).
- **Performance:** menu and order screens should load in under 2 seconds on typical cafe Wi-Fi/4G.
- **Reliability:** no duplicate orders or double-charged payments under retry/poor-connectivity conditions.
- **Security:** OTP-based identity verification, encrypted/hashed storage of phone numbers, signed QR tokens, verified payment webhooks.
- **Availability:** system should tolerate individual customer device disconnects without affecting kitchen/admin operations.

---

## 8. Assumptions & Constraints

- Cafe has stable Wi-Fi/router for staff devices (kitchen printer, tablet at counter); customer connectivity may vary.
- Razorpay account and KYC are already set up or will be set up before payment integration goes live.
- SMS/OTP provider account (for India numbers) will be procured before launch.
- 25 tables is the fixed initial scale; the schema should not hardcode this number.

---

## 9. Release Plan (tie-in with TRD phases)

1. **Phase 1:** Core ordering loop, cash-only, manual billing.
2. **Phase 2:** Razorpay integration + webhook verification.
3. **Phase 3:** Session/table-state hardening (ghost sessions, force-vacate, conflict handling).
4. **Phase 4:** Full admin depth (menu mgmt, history, RBAC).
5. **Phase 5:** Analytics, printer integration, polish.

---

## 10. Open Questions (see App-Flow.md and TRD.md for how these are currently handled)

- Shared vs. per-person sessions at one table.
- Partial order cancellation before kitchen acceptance.
- Item-level vs. order-level kitchen status.
