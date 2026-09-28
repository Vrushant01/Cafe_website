# UI/UX Design Brief
## Project: QR-Based Table Ordering & Billing System — "Chai Partner"

**Design direction:** Simple, classy, warm — mirrors the cafe's existing chai-brown/cream menu aesthetic. Smooth and responsive across mobile, tablet, and PC.

---

## 1. Design Principles

1. **Simple over clever.** A customer using this once, standing/sitting at a table, should never feel lost. Minimal steps, obvious next action always visible.
2. **Classy, not flashy.** Warm neutral palette (matching the cafe's existing menu card — muted browns, cream, muted teal-gray accents), generous whitespace, restrained use of color to highlight only what matters (bestsellers, CTAs, status).
3. **One primary action per screen.** Every screen has one obvious button (Verify, Add to Cart, Place Order, Accept) — secondary actions are visually quieter.
4. **Responsive by default, not adapted after.** Build mobile-first (customers), then scale up layouts for tablet/PC (mostly the admin dashboard).
5. **Motion with purpose.** Animations (like the cooking-loader) should reassure, not delight for its own sake — keep them subtle and fast.

---

## 2. Visual System

### 2.1 Color Palette (derived from the existing menu branding)
| Role | Color | Use |
|---|---|---|
| Base background | Warm cream `#F4ECE0` | App background |
| Primary text | Deep coffee brown `#3B2A21` | Headings, body text |
| Primary accent | Muted terracotta/brown `#8B5E3C` | Primary buttons, active states |
| Secondary accent | Sage/teal-gray `#7C8B85` | Secondary buttons, category chips |
| Success | Soft green `#5A8F5A` | "Available," "Paid," "Ready" states |
| Warning/Attention | Warm amber `#C98A3B` | "Payment Pending," session-expiry warning |
| Error | Muted brick red `#B24A3A` | "Occupied," errors, cancellations |
| Surface/card | White/off-white `#FFFDF9` | Menu item cards, order cards |

### 2.2 Typography
- **Headings:** a warm serif or slab-serif (e.g., "Fraunces," "Poppins SemiBold") to nod at the cafe's handwritten/branded menu feel without sacrificing legibility.
- **Body/UI text:** a clean sans-serif (e.g., "Inter," "Work Sans") for menu items, buttons, forms — must stay crisp at small mobile sizes.
- **Scale:** mobile base 16px body / 22–24px headings; scale up modestly on tablet/PC (no drastic jumps — this is a utility app, not a marketing site).

### 2.3 Components
- **Buttons:** rounded corners (8–10px), solid fill for primary, outline for secondary, generous tap targets (min 44×44px) for mobile.
- **Cards:** menu items and orders as soft-shadow cards on the cream background — consistent card shape used for table grid, menu items, and order-history rows.
- **Badges:** small pill-shaped tags — "Bestseller" (accent gold/terracotta), "Unavailable" (muted gray, reduced opacity on the whole card), status badges (color per state table above).
- **Icons:** simple line icons (not filled/skeuomorphic) — consistent stroke width throughout.

---

## 3. Responsive Behavior

| Breakpoint | Target | Layout notes |
|---|---|---|
| < 480px (mobile) | Customer primary use case | Single column, sticky bottom cart bar, category chips scroll horizontally |
| 480–1024px (tablet) | Customer secondary; Admin primary (counter/kitchen) | 2-column menu grid; admin queue as a scrollable list with larger tap targets |
| > 1024px (PC) | Admin/owner primary (dashboard, analytics) | Multi-column layout: sidebar nav + main content + detail panel; menu grid 3–4 columns |

- Use CSS Grid/Flexbox with fluid breakpoints, not fixed pixel layouts.
- Sticky elements: cart summary bar (customer, mobile), order-queue filters (admin).
- Touch-friendly spacing on mobile/tablet; denser information layout permitted on PC admin views (owner wants more data visible at once).

---

## 4. Key Screens (customer)

1. **Table Landing** — scanned table highlighted at top; grid of all 25 tables below with status/seat-count; classy card grid, color-coded status dot (green=available, red=occupied).
2. **Occupied-Table Fallback** — calm, reassuring copy ("Looks like this table shows occupied — let's get it sorted"), manager contact card, "Notify Staff" button.
3. **Verification** — single-column form: name, phone, OTP input (auto-advancing digit boxes), optional email, minimal copy.
4. **Menu** — sticky category chips at top, item cards with image, name, price, bestseller badge; sticky "View Cart (₹X)" bar at bottom on mobile.
5. **Cart/Checkout** — itemized list with qty steppers, subtotal, GST line, grand total, payment method toggle (Razorpay / Cash), single "Place Order" CTA.
6. **Order Tracking** — cooking-themed loader animation (subtle, looping), horizontal/vertical timeline (Ordered → Accepted → Preparing → Ready → Served), estimated time, Reorder button, "Need to cancel?" link (routes to counter-cancellation info).

## 5. Key Screens (admin/kitchen/cashier)

1. **Login** — simple, role-based redirect after login.
2. **Orders Queue** — card-per-order, oldest first, four-stage action buttons, color-coded billing badge (green/red), Print KOT action appears post-Accept.
3. **Menu Management** — table/grid view of items grouped by category, inline edit for price/availability/bestseller toggle.
4. **Order History** — searchable/filterable table (date range, name, phone, order ID), expandable rows for item-level detail.
5. **Analytics** — chart cards (bestsellers bar chart, repeat-customer %, sales trend line graph), date-range selector at top.

---

## 6. Motion & Feedback

- Page transitions: fast fades/slides (150–250ms), never long enough to feel like the app is "loading a lot."
- Cooking-loader animation on the tracking screen: simple looping icon (steam/cup), not a heavy Lottie file that slows mobile load.
- Toasts for confirmations (order placed, payment success) — short-lived, non-blocking.
- Skeleton loaders for menu/queue while fetching, never a blank white screen.

---

## 7. Accessibility

- Minimum contrast ratio 4.5:1 for text against background (verify the terracotta/cream combo meets this for body text; reserve lower-contrast tones for decorative elements only).
- All interactive elements reachable via keyboard on PC admin views.
- Status conveyed by color **and** text/icon (not color alone) — important for the red/green occupied/available and billing badges.
