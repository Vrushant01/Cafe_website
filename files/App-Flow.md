# App Flow
## Project: QR-Based Table Ordering & Billing System — "Chai Partner"

This document maps every screen-to-screen transition for both the customer app and the admin/kitchen/cashier dashboard, including edge cases.

---

## 1. Customer Flow

```mermaid
flowchart TD
    A[Scan QR at Table] --> B[Table Landing: scanned table + full grid of 25]
    B -->|Table available| C[Verification: Name + Phone]
    B -->|Table shows occupied| X[Occupied Fallback: Contact Manager]
    X -->|Staff resolves / force-vacates| C
    C --> D[OTP Confirmation]
    D -->|OTP valid| E[Session Started - 2hr timer]
    D -->|OTP invalid/expired| C
    E --> F[Menu - category wise, bestseller highlighted]
    F --> G[Add items to Cart]
    G --> H[Checkout: Grand Total + GST]
    H -->|Choose Razorpay| I[Razorpay Checkout]
    H -->|Choose Cash| J[Order Placed - Payment Pending]
    I -->|Payment success + webhook verified| K[Order Placed - Advance Paid]
    I -->|Payment failed| H
    J --> L[Order Tracking Screen]
    K --> L
    L --> M{Status updates via socket}
    M --> N[Ordered]
    N --> O[Accepted]
    O --> P[Preparing]
    P --> Q[Ready to Serve]
    Q --> R[Served]
    L --> S[Reorder action - creates new order]
    L --> T[Need to Cancel - Go to Billing Counter]
    R --> U[Customer goes to counter for billing]
    U --> V[Admin settles bill - session closes, table frees]
    E -->|10 min before 2hr mark, idle| W[Expiry Warning]
    W -->|active interaction| E
    W -->|no interaction| Y[Session Expired - login screen shown again]
```

### 1.1 Step-by-step with edge cases

1. **Scan QR** → resolves signed per-table token.
2. **Table Landing** → shows scanned table + status grid of all 25 tables.
   - *Edge case:* table shows occupied but customer is physically there → **Occupied Fallback** screen with manager name/phone + "Notify Staff" button (pushes a real-time alert to admin dashboard).
3. **Verification** → name + phone → OTP sent.
   - *Edge case:* OTP not received → resend with cooldown timer (rate-limited).
   - *Edge case:* wrong OTP 3x → temporary lockout, "Contact staff" fallback.
4. **Session starts** → table marked occupied, 2-hour timer begins.
5. **Menu** → category tabs, bestseller badges, unavailable items disabled.
6. **Cart → Checkout** → grand total with GST shown separately.
   - *Edge case:* item price changed by admin mid-session → cart still honors the price at time of adding (server snapshots on order placement, not on add-to-cart, so this is resolved at the moment "Place Order" is tapped).
7. **Payment** → Razorpay or Cash.
   - *Edge case:* Razorpay payment fails/cancelled → return to checkout, no order created.
   - *Edge case:* network drops after payment success but before confirmation screen loads → idempotency key ensures no duplicate order; on reconnect, tracking screen resolves to the correct existing order.
8. **Order Tracking** → live timeline; **Reorder** creates a fresh order (not a reopened one).
   - *Edge case:* customer wants to cancel an advance-paid order → directed to billing counter; staff processes cancellation + logs refund reason in-system.
9. **Session expiry** → warning banner 10 minutes before 2-hour mark; auto-extends if user is actively interacting; otherwise expires and returns to verification screen. Table itself stays occupied if there's an unbilled order — only frees when admin completes billing.
10. **Billing** → customer approaches counter; admin opens their order bucket, settles (online/cash), table frees and session formally closes.

---

## 2. Admin / Kitchen / Cashier Flow

```mermaid
flowchart TD
    AA[Admin Login] --> AB{Role}
    AB -->|Kitchen| AC[Orders Queue]
    AB -->|Cashier| AC
    AB -->|Owner/Admin| AD[Full Dashboard: Orders, Menu, History, Analytics]

    AC --> AE[New order appears - oldest first]
    AE --> AF[Accept]
    AF --> AG[Print KOT]
    AG --> AH[Preparing]
    AH --> AI[Ready / Completed]
    AI --> AJ{Billing badge}
    AJ -->|Green: Advance Paid| AK[Open Order Bucket]
    AJ -->|Red: Payment Pending| AK
    AK --> AL[Settle: Online or Cash]
    AL --> AM[Order removed from queue, table freed, session closed]

    AD --> AN[Menu Management: add/edit/remove items, toggle bestseller/unavailable, edit price]
    AD --> AO[Order History: search by name/phone/order ID, filter by date range]
    AD --> AP[Analytics: bestsellers, repeat customers, sales trend]
    AD --> AQ[Force-Vacate Table: mandatory reason, logged]
```

### 2.1 Step-by-step with edge cases

1. **Login** → role-based landing (kitchen/cashier see Orders only; owner sees full dashboard).
2. **Orders Queue** → sorted oldest-first, real-time push on new orders.
   - *Edge case:* two staff devices try to Accept the same order simultaneously → guarded transaction ensures only the first succeeds; second sees "Already accepted by [name]."
3. **Accept → Print KOT** → sends to kitchen printer.
4. **Preparing → Ready/Completed** → customer's tracking screen updates live.
5. **Billing** → badge reflects payment status; opening it shows itemized bucket for that session/table.
   - *Edge case:* customer wants to pay differently than pre-selected (e.g., chose cash but wants to pay online at counter) → cashier can override payment method at settlement.
6. **Settle** → marks paid, closes session, frees table — this is the **only** action that frees a table with an unbilled order attached.
7. **Menu Management** → changes apply to future orders only (existing order snapshots unaffected).
8. **Order History** → full searchability for disputes/reporting.
9. **Analytics** → aggregate views, refreshed periodically (not necessarily real-time).
10. **Force-Vacate** → used when a session is stuck (customer left without ordering, app crash, stale QR photo scenario) — requires a reason, logged to audit trail, immediately frees the table for the next customer.

---

## 3. Cross-Cutting Flow: Table Status Lifecycle

```mermaid
stateDiagram-v2
    [*] --> Available
    Available --> Occupied: Session created (OTP verified)
    Occupied --> Available: Ghost session swept (no orders ever placed)
    Occupied --> Available: Admin settles billing
    Occupied --> Available: Admin force-vacates (manual override)
    Occupied --> Occupied: Session expires but unbilled order exists (table stays occupied)
```
