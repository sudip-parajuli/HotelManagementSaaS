# SIA HMS — SaaS Platform Production-Readiness Plan
## SuperAdmin Rebuild + Core HMS Hardening
**Version:** 1.0 | **Prepared By:** SIA Enterprises | **Type:** Antigravity Task Plan

---

> **HOW TO USE THIS FILE**
> This continues from `PROGRESS.md` — Phases 0–11 are complete (10 HMS modules + i18n + security hardening).
> This plan covers two parallel tracks:
> **Track A** — Rebuild the SuperAdmin platform as a genuinely separate admin product
> **Track B** — Harden and complete every operational HMS module to production/market-competitive standard
>
> Hand this file to Antigravity. Work Track A first (it's foundational and currently broken),
> then move through Track B module by module. Update `PROGRESS.md` after every session
> under a new "Phase 12 — Platform Production Readiness" heading.

---

## TABLE OF CONTENTS

1. [Why This Plan Exists](#1-why-this-plan-exists)
2. [Track A — SuperAdmin Platform Rebuild](#track-a--superadmin-platform-rebuild)
   - A.1 [The Core Problem](#a1-the-core-problem)
   - A.2 [New SuperAdmin Information Architecture](#a2-new-superadmin-information-architecture)
   - A.3 [Implementation Tasks](#a3-implementation-tasks)
3. [Track B — Core HMS Module Hardening](#track-b--core-hms-module-hardening)
   - B.1 [Billing Engine — Nepal Tax Compliance](#b1-billing-engine--nepal-tax-compliance)
   - B.2 [POS & KDS Completion](#b2-pos--kds-completion)
   - B.3 [Table Management](#b3-table-management)
   - B.4 [Inventory ↔ Kitchen ↔ Room Connections](#b4-inventory--kitchen--room-connections)
   - B.5 [Staff Attendance — Punch In/Out](#b5-staff-attendance--punch-inout)
   - B.6 [Housekeeping Completion](#b6-housekeeping-completion)
   - B.7 [Booking Engine Gaps](#b7-booking-engine-gaps)
   - B.8 [CRM & Loyalty Completion](#b8-crm--loyalty-completion)
   - B.9 [Analytics & Reporting Gaps](#b9-analytics--reporting-gaps)
4. [Master Checklist](#4-master-checklist)
5. [AI Handoff Prompt](#5-ai-handoff-prompt)

---

## 1. Why This Plan Exists

PROGRESS.md confirms 10 core modules, multi-tenancy, i18n, and Phase 11 hardening are complete. But "complete" in the build sense doesn't mean "production-ready" or "market-competitive" — two different bars.

Two specific gaps triggered this plan:

**Gap 1 — SuperAdmin/Tenant navigation conflation.** The current SuperAdmin experience appears to share sidebar/navigation logic with tenant (hotel) users, filtered by role rather than architected as a separate product. A platform administrator managing 50 hotel tenants should never see "Rooms" or "POS" in their own navigation — those are tenant concepts. This needs a structural fix, not a patch.

**Gap 2 — Operational depth.** Several modules are built but not deep enough to compete with Aegis HMS (400+ clients, 5 years in market) or similar Nepal hospitality platforms. Specifically: Nepal-compliant billing math, full table management, inventory-to-kitchen stock deduction, and staff punch in/out attendance.

---

## TRACK A — SUPERADMIN PLATFORM REBUILD

---

### A.1 The Core Problem

A SuperAdmin's job is **platform oversight**, not hotel operations. They manage:
- Who is using the platform (tenants, trial status, plan tier)
- Platform health (uptime, errors, performance)
- Feature/module access control (who gets what, including paid add-ons)
- Revenue (MRR, churn, billing)
- Support (impersonation, audit logs, tickets)

A SuperAdmin should **never** see: Rooms, Bookings, POS, KDS, Housekeeping, Inventory, Staff schedules, or any other tenant-operational data as primary navigation. The only way they touch tenant data is through **impersonation** (already built in Phase 11) — a deliberate, logged, time-boxed action — not as default navigation.

```
CURRENT (WRONG):
┌─────────────────────────┐
│  Sidebar.tsx             │
│  - Rooms                 │
│  - Bookings               │ ← filtered by role,
│  - POS                    │   but SuperAdmin still
│  - Housekeeping            │   sees a stripped-down
│  - ...                    │   version of HOTEL nav
│  - Super Admin (if role)  │
└─────────────────────────┘

CORRECT (TARGET):
┌──────────────────────────┐     ┌──────────────────────────┐
│  TenantSidebar.tsx        │     │  AdminSidebar.tsx          │
│  (used at /[tenant]/...)  │     │  (used at /admin/...)      │
│  - Rooms                  │     │  - Dashboard (Platform)    │
│  - Bookings                │     │  - Tenants                 │
│  - POS                     │     │  - Subscriptions & Plans   │
│  - Housekeeping             │     │  - Feature Flags            │
│  - Inventory                │     │  - Revenue & Billing         │
│  - Staff                    │     │  - Support & Audit Log        │
│  - Analytics                 │     │  - System Health              │
│  - CRM                       │     │  - Settings                    │
└──────────────────────────┘     └──────────────────────────┘
       Completely separate component trees, separate layouts,
       separate route groups. Zero shared navigation logic.
```

---

### A.2 New SuperAdmin Information Architecture

```
/admin                          → Platform dashboard (default landing)
/admin/tenants                  → All tenants — list, search, filter
/admin/tenants/new              → Onboard new tenant
/admin/tenants/[id]             → Single tenant detail & management
/admin/tenants/[id]/usage       → Usage metrics for this tenant
/admin/tenants/[id]/features    → Feature/module toggles for this tenant
/admin/tenants/[id]/billing     → Invoices, payment history for this tenant
/admin/subscriptions            → Plan management (Starter/Pro/Enterprise)
/admin/subscriptions/plans      → Edit plan definitions, pricing, limits
/admin/addons                   → Add-on module catalog management
/admin/addons/requests          → Pending add-on requests from tenants
/admin/revenue                  → MRR, churn, growth charts
/admin/revenue/invoices         → All subscription invoices across tenants
/admin/support                  → Support tickets / issues
/admin/support/audit-log        → Impersonation audit log (built in Phase 11)
/admin/system                   → Server health, error logs, background jobs
/admin/settings                 → Platform-wide settings (tax slab defaults, SMS credits, etc.)
```

---

### A.3 Implementation Tasks

---

#### Task A.3.1 — Separate Route Groups & Layouts

```
PROMPT TO ANTIGRAVITY:

Restructure the frontend routing so SuperAdmin and Tenant experiences
are completely separate Next.js route groups with zero shared navigation.

1. Create frontend/src/app/admin/ as a top-level route group (NOT inside
   the existing (dashboard) group used by tenants).

2. Create frontend/src/app/admin/layout.tsx:
   - Wraps all /admin/* routes
   - Uses a NEW component: AdminSidebar.tsx (not the tenant Sidebar.tsx)
   - Uses a NEW component: AdminNavbar.tsx
   - Includes a route guard: redirect to /login if user.role !== 'SUPER_ADMIN'
   - This layout has ZERO knowledge of hotel concepts (no room status,
     no booking widgets, nothing tenant-specific)

3. Create frontend/src/components/layout/AdminSidebar.tsx from scratch:
   Sections (with Tabler icons):
   - Dashboard (ti-layout-dashboard)
   - Tenants (ti-building)
   - Subscriptions & Plans (ti-credit-card)
   - Add-on Marketplace (ti-puzzle)
   - Revenue (ti-chart-line)
   - Support & Audit (ti-headset)
   - System Health (ti-activity)
   - Settings (ti-settings)
   This sidebar NEVER references rooms, bookings, POS, or any tenant
   operational concept.

4. Move existing pages:
   FROM: frontend/src/app/(dashboard)/superadmin/*
   TO:   frontend/src/app/admin/*
   Update all internal links and the post-login redirect logic in
   useAuth.ts accordingly (SUPER_ADMIN role → redirect to /admin,
   not /superadmin).

5. DELETE the old superadmin folder under (dashboard) entirely once
   migration is verified working — do not leave duplicate routes.

6. Verify: a SuperAdmin logging in lands on /admin and at NO point
   sees the tenant Sidebar.tsx component rendered anywhere in their
   session, except when actively impersonating (which already shows
   the correct impersonation banner per Phase 11).

This is a structural refactor — no new backend work needed for this
specific task, only frontend route reorganization.
```

---

#### Task A.3.2 — Platform Dashboard (Real Oversight, Not Hotel Stats)

```
PROMPT TO ANTIGRAVITY:

Build frontend/src/app/admin/page.tsx as the SuperAdmin's landing dashboard.
This should answer: "How is my SaaS business doing right now?"

SECTIONS:

1. Top KPI row (stat cards):
   - Total Active Tenants
   - MRR (Monthly Recurring Revenue)
   - Trial Tenants (count, with "ending in 3 days" sub-count)
   - Churn this month (tenants who cancelled)

2. MRR Growth Chart (Recharts area chart):
   - Last 12 months MRR trend
   - Already partially built per PROGRESS.md — verify/extend it here

3. Tenant Health Table (compact, top 10 by recent activity):
   - Tenant name, plan, status, last active, days since signup
   - Color flag: 🟢 healthy, 🟡 low activity, 🔴 at risk (no login in 14+ days)
   - Click → /admin/tenants/[id]

4. Plan Distribution (donut chart):
   - How many tenants on Starter vs Professional vs Enterprise

5. Recent Platform Events (activity feed):
   - New tenant signups, plan upgrades/downgrades, support tickets opened,
     payment failures — last 20 events, real-time via WebSocket if feasible,
     otherwise polling every 30s

BACKEND — apps/subscriptions/admin_views.py (extend existing):
   GET /api/admin/dashboard/
   Returns: { total_tenants, mrr, trial_count, trial_ending_soon,
              churn_this_month, mrr_history[], tenant_health[],
              plan_distribution{}, recent_events[] }

This page replaces whatever currently exists at the old
/superadmin page — move logic here, don't duplicate.
```

---

#### Task A.3.3 — Tenant Management (Deep)

```
PROMPT TO ANTIGRAVITY:

Build out /admin/tenants/ as a genuinely useful tenant management
console — this is the SuperAdmin's most-used page.

1. /admin/tenants/ — list page:
   - Searchable, filterable table: name, plan, status (trial/active/
     past_due/suspended/cancelled), rooms count, staff count, MRR
     contribution, signup date
   - Bulk actions: none needed yet, keep single-row actions only
   - Row actions: View, Impersonate (existing), Suspend, Change Plan

2. /admin/tenants/[id]/ — tenant detail page with tabs:

   TAB: Overview
     - Property name, contact info, signup date, current plan
     - Quick stats: total bookings ever, total revenue processed
       through the platform, last login, active staff count
     - Danger zone: Suspend Tenant, Delete Tenant (with confirmation)

   TAB: Usage (NEW — this is what's currently missing)
     - Rooms used / room limit (from plan)
     - Staff users / staff limit
     - API calls this month (if rate-limited)
     - Storage used (MinIO bucket size for this tenant)
     - Visual progress bars — flag in red if tenant is near/over limit

   TAB: Features & Add-ons (NEW — directly addresses your ask)
     - Shows EVERY gateable feature as a toggle:
       Payroll, Advanced CRM, Advanced Analytics, Channel Manager,
       Guest Mobile App access, etc.
     - Each toggle shows: included in current plan? OR manually granted?
     - SuperAdmin can manually grant a feature to a specific tenant
       WITHOUT changing their whole plan (e.g., "give this one client
       Payroll access as a goodwill gesture" without upgrading their tier)
     - Audit trail: who granted/revoked what feature, when

   TAB: Billing
     - Subscription invoice history for this tenant
     - Payment method on file, next billing date
     - Manual actions: Issue Credit, Mark Invoice Paid (for offline
       bank transfer payments — common in Nepal), Resend Invoice

   TAB: Support
     - Notes field for SuperAdmin/support staff (internal only,
       tenant never sees this)
     - Impersonation history for this specific tenant
       (pulls from ImpersonationLog built in Phase 11)

BACKEND:
   New model: apps/subscriptions/models.py
     TenantFeatureGrant:
       tenant (FK), feature_key (str), granted_by (FK User),
       granted_at, reason, expires_at (nullable — for time-limited grants)

   Update permission classes (HasPayrollFeature etc. from Phase 9/11)
   to check: plan.features OR active TenantFeatureGrant — whichever
   grants access. This is the mechanism for "give add-on features to
   only those who requested them" that you described.

   New endpoints:
     GET  /api/admin/tenants/{id}/usage/
     GET  /api/admin/tenants/{id}/features/
     POST /api/admin/tenants/{id}/features/grant/
     POST /api/admin/tenants/{id}/features/revoke/
     POST /api/admin/tenants/{id}/suspend/
     POST /api/admin/tenants/{id}/billing/mark-paid/

Write tests for feature grant/revoke logic and the permission check
combining plan-level and grant-level access.
```

---

#### Task A.3.4 — Add-on Marketplace Management

```
PROMPT TO ANTIGRAVITY:

This directly implements "which features should be given to only those
who have requested the add-ons" — a formal request → approve → grant flow.

1. New model: apps/subscriptions/models.py
   AddonModule:
     key, name, description, price_monthly, price_one_time,
     is_active, category (e.g., 'integration', 'premium_module')

   AddonRequest:
     tenant (FK), addon (FK), requested_by (FK User, tenant-side),
     status: pending | approved | rejected | active
     requested_at, reviewed_at, reviewed_by (FK User, SuperAdmin),
     rejection_reason

2. TENANT-SIDE (small addition to existing tenant settings page):
   - A simple "Request Add-on" button per locked/unavailable feature
   - Creates an AddonRequest with status=pending
   - Tenant sees their request status (pending/approved/rejected)

3. ADMIN-SIDE — /admin/addons/:
   - Catalog tab: manage AddonModule entries (CRUD)
   - Requests tab: queue of pending AddonRequest entries
     Each row: tenant name, addon requested, when, message
     Actions: Approve (creates TenantFeatureGrant automatically),
     Reject (with reason, notifies tenant)

4. On approval: automatically create the TenantFeatureGrant from
   Task A.3.3, optionally create a SubscriptionInvoice line item if
   the addon has a price.

5. Notification: when a request is approved/rejected, send an
   in-app notification (and optionally email) to the tenant who requested it.

Write tests for the full request → approve → grant flow, confirming
the tenant gains feature access immediately after approval.
```

---

#### Task A.3.5 — System Health & Support Console

```
PROMPT TO ANTIGRAVITY:

Build /admin/system/ and /admin/support/ for operational visibility.

/admin/system/:
   - Service status cards: Database, Redis, Celery Workers, MinIO
     (ping each, show green/red + response time)
   - Recent background job failures (from Celery — failed tasks log)
   - Error rate chart (if Sentry or similar is configured per
     production.txt requirements — surface recent error count)
   Backend: GET /api/admin/system/health/ — reuses health check
   endpoints if already built per the earlier hardening phase;
   otherwise build basic DB/Redis/Celery ping checks here.

/admin/support/:
   - Simple ticket list (if no helpdesk tool exists yet, build a
     minimal SupportTicket model: tenant FK, subject, message,
     status open/in_progress/resolved, created_at)
   - /admin/support/audit-log/ — surface the existing ImpersonationLog
     in a filterable table (tenant, admin, reason, duration)

This task is lower priority than A.3.1–A.3.4 — sequence it after
the core tenant/addon management is working.
```

---

## TRACK B — CORE HMS MODULE HARDENING

---

### B.1 Billing Engine — Nepal Tax Compliance

```
PROMPT TO ANTIGRAVITY:

PROGRESS.md states the billing engine has "automatic 10% Service Charge
+ 13% VAT" — verify and harden the exact calculation order and digital
payment rebate, since this is the single most scrutinized part of any
Nepal hospitality system by clients.

REQUIRED CALCULATION ORDER (verify apps/billing/ matches exactly):
   1. Base Price (sum of room charges + F&B items)
   2. Service Charge = Base Price × 10%
   3. Subtotal = Base Price + Service Charge
   4. VAT = Subtotal × 13%
   5. Gross Total = Subtotal + VAT

DIGITAL PAYMENT VAT REBATE (verify this exists — if not, build it):
   - When payment_method is digital (eSewa, Khalti, Fonepay, card):
     VAT Rebate = VAT × 10%
     Net Payable = Gross Total − VAT Rebate
   - When payment_method is cash: no rebate, guest pays Gross Total

INVOICE PDF must show ALL of these as separate line items:
   Base Price | Service Charge (10%) | Subtotal | VAT (13%) |
   Digital Payment VAT Rebate (if applicable) | Net Payable

1. Audit apps/billing/models.py Invoice and InvoiceItem — confirm
   fields exist for: service_charge_amount, vat_amount, digital_rebate_amount,
   net_payable_amount (separate from gross total)

2. Audit the calculation logic (likely in serializers.py or a
   billing/calculator.py) — write/fix to match the exact order above.
   This is NOT optional rounding — service charge must be calculated
   on base price BEFORE vat, and VAT must be calculated on the
   subtotal AFTER service charge. Getting this order wrong is the
   most common Nepal billing bug.

3. Update backend/templates/pdf/invoice.html to clearly display all
   line items in order, with the digital rebate shown only when applicable.

4. Add a Property-level toggle: service_charge_applicable (bool) —
   not all properties charge a service fee; this must be configurable,
   not hardcoded to always-on.

5. Add Property-level configurable rates (don't hardcode 10%/13%):
   Property.service_charge_rate (default 10.00)
   Property.vat_rate (default 13.00)
   Property.digital_payment_rebate_rate (default 10.00)
   These can change by government notice — must be admin-editable,
   not a code constant.

Write comprehensive tests:
   - Cash payment: correct gross total, no rebate
   - Digital payment: correct rebate calculation and net payable
   - Service charge disabled property: VAT calculated directly on
     base price, no service charge line
   - Custom rates: property with 0% service charge and 13% VAT only
   - Rounding: verify NPR amounts round correctly to 2 decimals,
     no floating point drift (use Decimal throughout, never float)
```

---

### B.2 POS & KDS Completion

```
PROMPT TO ANTIGRAVITY:

PROGRESS.md confirms core POS/KDS exists (orders, KOTs, WebSocket
consumer). Harden it to match what competitors like Aegis HMS offer:
"Sales Insights, Order Management with KOT/BOT tracking and preorders,
Kitchen Efficiency, Discount Monitoring, Real-Time KDS."

GAPS TO CLOSE:

1. KOT/BOT Distinction:
   Aegis separates KOT (Kitchen Order Ticket — food) from BOT
   (Bar Order Ticket — beverages). Verify apps/pos/models.py KOT model
   supports a `ticket_type: kitchen | bar` field and routes to the
   correct station/screen. If missing, add it — different stations
   often have different staff and different urgency.

2. Pre-Orders:
   Add ability to create an Order with a future scheduled_time
   (e.g., guest pre-orders breakfast for 7 AM tomorrow). Status:
   scheduled → activated (moves to kitchen queue) → in normal flow.
   Celery Beat task checks every 5 min for orders due to activate.

3. Discount Monitoring (audit/fraud prevention):
   New model: OrderDiscount — order (FK), discount_type (percent/flat),
   amount, reason, applied_by (FK Staff), approved_by (FK Staff,
   nullable — for discounts above a threshold requiring manager approval)
   Add a Property-level setting: discount_approval_threshold_percent
   (e.g., discounts over 20% require manager PIN approval)
   New report: /pos/reports/discounts/ — flags staff members with
   unusually high discount frequency (potential fraud indicator)

4. Sales Insights Dashboard (per Aegis's "Menu & item-wise sales
   analysis"):
   /pos/insights/ page — top selling items, least selling items,
   sales by category, sales by hour-of-day heatmap
   Reuses analytics infrastructure from Phase 8 if present, otherwise
   build dedicated endpoint: GET /api/pos/insights/?start=&end=

5. Production/Kitchen Efficiency Tracking:
   On each KOT: track created_at, accepted_at (kitchen taps "started"),
   completed_at (kitchen taps "done"), served_at (waiter delivers)
   New report: average ticket time by station, by hour, by day —
   surfaces kitchen bottlenecks

Write tests for: pre-order activation timing, discount threshold
approval flow, KOT/BOT routing to correct station.
```

---

### B.3 Table Management

```
PROMPT TO ANTIGRAVITY:

Verify and extend apps/restaurant/models.py DiningTable for full
table management — competitors offer "table/steward management."

GAPS TO CLOSE:

1. Table Status Lifecycle (verify this exact state machine exists):
   available → occupied → bill_requested → cleaning → available
   Each transition should be a single API call, not manual field editing.

2. Steward/Waiter Assignment:
   Add assigned_waiter (FK Staff, nullable) to DiningTable or to
   the active Order. Floor manager can reassign tables to different
   waiters mid-shift. Track which waiter served which table for
   tip distribution and performance reports.

3. Table Merge / Split (for large parties or group bookings):
   New endpoint: POST /api/restaurant/tables/merge/
     Body: { table_ids: [...], merged_into: table_id }
     Combines orders from multiple tables into one bill
   POST /api/restaurant/tables/split/
     Splits one table's order into multiple separate bills
     (different from the bill-splitting-by-amount feature — this
     splits by TABLE for when a merged group wants separate checks)

4. Floor Plan Visual Editor (if not already polished):
   /pos/tables/ should show tables as a draggable visual layout,
   not just a list — matches Aegis's visual table management.
   Property admin can arrange table positions once; this layout
   persists (store x, y coordinates on DiningTable model) and is
   used by all staff thereafter.

5. Reservation-to-Table Linking:
   If a guest reserves a table in advance (not just walk-in), link
   Reservation (restaurant-specific, separate from room Reservation)
   to a DiningTable with a time window. Table shows "Reserved 7:30 PM"
   status ahead of physical occupancy.

Write tests for: merge/split correctness (totals must reconcile),
status transition validation (can't go from available directly to
cleaning, must pass through occupied first).
```

---

### B.4 Inventory ↔ Kitchen ↔ Room Connections

```
PROMPT TO ANTIGRAVITY:

PROGRESS.md confirms recipe-based auto-deduction exists for POS orders
("Auto-deductions of ingredients from stock when POS order items
transition to served"). Extend this connection to cover room-side
consumption too, which is currently likely missing.

GAPS TO CLOSE:

1. Room Amenity Consumption (NEW):
   Many properties stock in-room items that deplete: minibar items,
   toiletries, welcome amenities. Currently inventory likely only
   tracks F&B via Recipe → MenuItem. Add:
   New model: RoomAmenityConsumption — room (FK), inventory_item (FK),
   quantity, consumed_at, logged_by (FK Staff), reservation (FK, nullable)
   Housekeeping staff log consumed minibar/amenity items during
   room cleaning — auto-deducts from InventoryItem stock, and
   auto-adds a charge to the guest's folio if not complimentary.

2. Housekeeping Supply Consumption (NEW):
   Cleaning supplies (linens, toiletries, cleaning chemicals) are
   consumed per room clean but don't currently connect to inventory.
   Extend HousekeepingTask completion flow: when a task is marked
   "done", optionally log supply usage (linen sets, amenity kits)
   against InventoryItem — same StockMovement pattern already used
   for POS auto-deduction.

3. Low Stock Cross-Department Alerts:
   Currently SMS alerts likely exist for kitchen ingredients only
   (per Phase 5 description). Extend the low-stock Celery task to
   cover ALL InventoryItem categories — F&B, housekeeping supplies,
   room amenities — and route the alert SMS to the correct manager
   (Inventory Manager always; additionally Housekeeping Manager for
   supply items, Restaurant Manager for F&B items) based on
   InventoryItem.category.

4. Recipe Costing Visibility on Menu (verify exists):
   Confirm /pos/menu/ admin view shows real-time food cost % per
   menu item (cost_price from Recipe ingredients ÷ selling price).
   If missing, surface this — it's a core differentiator competitors
   advertise ("Cost Control: Reconcile food costs and track recipe
   expenses").

Write tests for: room amenity auto-charge-to-folio, cross-category
low stock alert routing, recipe cost calculation accuracy.
```

---

### B.5 Staff Attendance — Punch In/Out

```
PROMPT TO ANTIGRAVITY:

Verify and harden the attendance system per your specific request:
staff should "punch in and out" — confirm this exists properly and
extend it to be production-grade.

PROGRESS.md mentions "/clock_in/ & /clock_out/ quick action entries
validating PIN entries and calculating overtime hours" — audit and
extend this:

1. AUDIT existing apps/hr/views.py clock_in/clock_out endpoints:
   - Confirm PIN validation is secure (hashed PIN comparison, not
     plaintext stored on StaffMember)
   - Confirm duplicate punch-in prevention (can't clock in twice
     without clocking out first)
   - Confirm late/early detection against the staff member's
     scheduled Shift for that day

2. ADD — Punch Kiosk Mode (if not present):
   A dedicated, simplified frontend page: /staff/punch/
   - Large numeric PIN pad (not a full login) — designed for a
     shared tablet mounted near the staff entrance
   - Staff enters their PIN, taps "Clock In" or "Clock Out"
   - Shows their name and photo on successful punch for visual
     confirmation (prevents punching in for a colleague)
   - No other navigation accessible from this kiosk view — locked
     to this single page (consider a kiosk_mode flag suppressing
     the normal dashboard chrome)

3. ADD — Geofencing/Location Validation (optional but valuable):
   If staff use a personal phone PWA instead of a shared kiosk,
   optionally validate they're within property GPS coordinates
   when punching in/out (Property.latitude, Property.longitude +
   configurable radius). Flag (don't necessarily block) punches
   from outside the radius for manager review.

4. ADD — Photo Capture on Punch (optional, fraud prevention):
   Capture a quick webcam/phone-camera photo at punch-in time,
   store alongside the Attendance record. Manager can spot-check
   for buddy-punching.

5. Overtime & Late Calculation — verify accuracy:
   - Late: clock_in time > Shift.start_time + grace_period_minutes
     (configurable per property, e.g., 10 min grace)
   - Overtime: hours worked > Shift scheduled hours, calculated at
     1.5× rate per existing payroll calculator
   - Early leave: clock_out time < Shift.end_time − some threshold,
     flagged but not auto-penalized (manager discretion)

6. Attendance Dashboard for Managers:
   /staff/attendance/ — monthly grid (staff × days), color-coded:
   present=green, late=amber, absent=red, leave=blue, holiday=grey
   Click any cell → see punch time, photo (if captured), notes
   Export to Excel using existing xlsx reporting infrastructure

Write tests for: duplicate punch prevention, PIN security (hashing),
late/overtime calculation against various shift configurations,
geofence validation logic (mocked GPS coordinates).
```

---

### B.6 Housekeeping Completion

```
PROMPT TO ANTIGRAVITY:

Extend the existing housekeeping module (status flows, manager board,
mobile staff view already built per Phase 5) toward full competitive
parity — Aegis advertises "Room Insights: Status, movement, flash, and
discrepancy reports; Amenities Tracking; Lost & Found."

GAPS TO CLOSE:

1. Room Discrepancy Reports (NEW):
   When front desk system shows a room as "Occupied" but housekeeping
   physically finds it empty/vacant (or vice versa) — log a
   RoomDiscrepancy: room (FK), system_status, physical_status_found,
   reported_by (FK Staff), reported_at, resolved (bool)
   Surfaces a manager alert — common real-world hotel issue (skip
   guests, early checkouts not logged) that audit-conscious owners
   specifically value.

2. Flash Reports (NEW — daily housekeeping summary):
   Auto-generated each morning: rooms cleaned yesterday, rooms
   pending, average clean time, staff productivity (rooms/staff/shift)
   Mirrors PMS terminology ("flash report") that hotel managers expect.

3. Lost & Found (NEW):
   New model: LostFoundItem — room (FK), found_by (FK Staff),
   description, photo (MinIO), found_at, status: stored | claimed | disposed,
   claimed_by_guest (FK GuestProfile, nullable), claimed_at
   /housekeeping/lost-found/ page — log items, search by description/
   room/date, mark as returned to guest with notes

4. Amenity Restocking Checklist (extends B.4):
   Standard per-room amenity checklist (towels, toiletries, minibar)
   that housekeeping staff confirm during cleaning — ties into the
   RoomAmenityConsumption tracking from Task B.4.

Write tests for: discrepancy logging and manager notification,
lost & found search/claim flow.
```

---

### B.7 Booking Engine Gaps

```
PROMPT TO ANTIGRAVITY:

Phase 2 built the core booking engine and public widget. Close
remaining gaps to compete with full PMS platforms.

GAPS TO CLOSE:

1. Group/Block Booking:
   New model: BookingGroup — group_name, organizer GuestProfile,
   reservations (M2M to Reservation), block_rate (optional special
   rate for the whole group), notes
   /bookings/groups/ — create a group booking covering multiple
   rooms/dates in one flow, useful for weddings, corporate retreats
   (directly relevant given Lahana/resort-style client conversations)

2. Waitlist:
   When no rooms are available for requested dates, allow guest
   to join a Waitlist instead of failing the booking entirely.
   New model: Waitlist — guest, desired dates, room_type, status
   Celery task: when a cancellation frees up matching availability,
   notify waitlisted guests via SMS in queue order.

3. Rate Plan Refinement (verify RatePlan from Phase 2 supports):
   - Seasonal pricing (date-range based rate overrides) — verify exists
   - Length-of-stay discounts (e.g., 7+ nights = 10% off)
   - Early-bird / last-minute pricing rules
   If RatePlan is currently flat/simple, extend with a rules engine:
   priority-ordered list of pricing rules evaluated per booking.

4. No-Show Handling:
   Celery Beat task: daily check for Reservations with status=confirmed
   where check_in_date has passed and no CheckIn record exists.
   Auto-transition to status=no_show, apply no-show policy
   (forfeit deposit per Property cancellation policy), free the room.

Write tests for: waitlist notification ordering, rate rule priority
resolution, no-show auto-detection timing.
```

---

### B.8 CRM & Loyalty Completion

```
PROMPT TO ANTIGRAVITY:

Phase 7 built core CRM/loyalty (points, tiers, campaigns). Verify and
extend for full guest relationship management depth.

GAPS TO CLOSE:

1. Guest Preference & Allergy Profile (verify exists — was specifically
   requested for resort clients):
   GuestProfile should have: dietary_restrictions (text/tags),
   allergies (text/tags, flagged prominently), room_preferences
   (high floor, away from elevator, etc.), special_occasion_dates
   (anniversary, birthday — separate from DOB)
   Surface allergy info PROMINENTLY (red badge) on:
     - Front desk check-in screen
     - POS order screen when ordering for a room-linked guest
     - KDS ticket if the order is linked to a guest with known allergies

2. Guest Communication Log (NEW):
   New model: GuestCommunication — guest (FK), channel (sms/email/call/
   in_person), direction (inbound/outbound), summary, logged_by (FK
   Staff), logged_at
   Gives staff a history of "what have we already told/promised this
   guest" — prevents repeated or contradictory communication.

3. Repeat Guest Recognition at Booking:
   When creating a new Reservation, if guest phone/email matches an
   existing GuestProfile, surface their history prominently: past
   stays, preferences, loyalty tier, any flags (blacklist, VIP) —
   verify this lookup-and-prefill exists in the booking creation flow.

Write tests for: allergy flag propagation from GuestProfile to POS
order display, repeat guest lookup matching logic.
```

---

### B.9 Analytics & Reporting Gaps

```
PROMPT TO ANTIGRAVITY:

Phase 8 built daily aggregation and core reports. Close gaps versus
competitive offerings (Aegis advertises "Night audit, revenue, rate
variance, Manager & Tourism Insights, AD/BS Reporting Formats").

GAPS TO CLOSE:

1. Night Audit Process (NEW — standard hotel industry concept):
   A formal end-of-day process: Celery Beat task runs at a configurable
   time (e.g., 11:59 PM property-local time):
   - Verifies all checked-in guests have a room rate applied for the
     night (auto-post room charges for the night to each in-house
     guest's folio)
   - Flags any discrepancies (room marked occupied with no active
     reservation, etc.)
   - Generates the Night Audit Report: rooms sold, no-shows, walk-ins,
     total room revenue, total F&B revenue, summarized for management
   - Marks the business date as "closed" — prevents backdating charges
     to a closed date without manager override

2. Rate Variance Report (NEW):
   Compares actual rate charged per reservation against the
   RatePlan's standard rate for those dates — flags discounts/overrides
   for management review. Useful fraud/revenue-leakage detection.

3. AD/BS Dual Calendar Support (Nepal-specific, mentioned as a
   competitor differentiator):
   Add a utility function converting Gregorian (AD) dates to Bikram
   Sambat (BS) for report display purposes. Use a maintained Python
   library (e.g., nepali-datetime or similar) rather than building
   conversion logic from scratch. Add a Property-level or User-level
   preference: date_format_preference: AD | BS | both
   Apply this preference to report headers and date displays in
   reports specifically (not necessarily the entire UI, which is a
   larger undertaking) — start with Reports Console date pickers and
   report output headers showing both formats.

4. Tourism/Source Market Insights (mentioned by Aegis as a differentiator):
   Extend existing booking_source analytics to break down by guest
   nationality (GuestProfile.nationality) — useful for resorts
   tracking which countries their guests come from for marketing.

Write tests for: night audit idempotency (running it twice doesn't
double-charge), rate variance threshold flagging, AD-BS date conversion
accuracy against known reference dates.
```

---

## 4. Master Checklist

| # | Task | Track | Priority | Est. Hours |
|---|---|---|---|---|
| A.3.1 | Separate route groups & layouts | A | 🔴 Foundational | 8–10 |
| A.3.2 | Platform dashboard | A | 🔴 Foundational | 8–10 |
| A.3.3 | Tenant management (deep) | A | 🔴 Foundational | 14–18 |
| A.3.4 | Add-on marketplace management | A | 🔴 Foundational | 10–14 |
| A.3.5 | System health & support console | A | 🟡 Important | 8–10 |
| B.1 | Billing engine Nepal tax compliance | B | 🔴 Critical | 10–14 |
| B.2 | POS & KDS completion | B | 🟡 Important | 14–18 |
| B.3 | Table management | B | 🟡 Important | 10–14 |
| B.4 | Inventory ↔ kitchen ↔ room | B | 🟡 Important | 10–12 |
| B.5 | Staff attendance punch in/out | B | 🔴 Critical | 10–14 |
| B.6 | Housekeeping completion | B | 🟢 Nice-to-have | 8–10 |
| B.7 | Booking engine gaps | B | 🟡 Important | 12–16 |
| B.8 | CRM & loyalty completion | B | 🟡 Important | 6–8 |
| B.9 | Analytics & reporting gaps | B | 🟢 Nice-to-have | 12–16 |

**Track A total: ~48–62 hours** — do this first, it's the foundation for everything else SuperAdmin-related.
**Track B total: ~92–122 hours** — sequence by priority: B.1 and B.5 first (critical/compliance), then B.2/B.3/B.4/B.7/B.8, then B.6/B.9.

**Grand total: ~140–184 hours** to reach genuine market-competitive parity.

---

## 5. AI Handoff Prompt

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI HANDOFF — SIA HMS SaaS Platform
PHASE 12: PRODUCTION READINESS (SuperAdmin Rebuild + HMS Hardening)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CURRENT PROGRESS:
→ [e.g. "Task A.3.1 complete — admin route group separated.
   Starting A.3.2 (platform dashboard)."]

LAST FILE WORKED ON:
→ [e.g. "frontend/src/app/admin/layout.tsx"]

NEXT TASK:
→ [paste exact task block from this plan]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTEXT:
Repo: github.com/sudip-parajuli/HotelManagementSaaS
This is the SaaS multi-tenant platform (not the Lahana private install).
Phases 0–11 complete: 10 HMS modules, multi-tenancy, i18n, security
hardening. This phase rebuilds SuperAdmin as a genuinely separate
product and hardens operational modules toward market parity with
Aegis HMS and similar Nepal hospitality platforms.

KEY PRINCIPLE FOR TRACK A:
SuperAdmin and Tenant are TWO DIFFERENT PRODUCTS sharing one codebase
and one database. They must NEVER share navigation/sidebar components.
SuperAdmin sees platform business metrics. Tenants see hotel operations.
The only bridge between them is the existing impersonation feature.

TECH STACK (unchanged):
Django 5 + DRF + Channels + Celery | Next.js 14 App Router + TypeScript +
shadcn/ui + Tailwind | PostgreSQL 16 (django-tenants) + Redis + MinIO |
eSewa + Khalti + Fonepay | Sparrow SMS | WeasyPrint + openpyxl

CODING STANDARDS (unchanged):
Django ORM only, never raw SQL | TypeScript strict, no 'any' |
shadcn/ui for all components | Tests required for new logic |
httpOnly cookies for JWT | Decimal (never float) for all money math

GLOBAL SKILLS AVAILABLE: frontend-design, pdf, xlsx, docx, pptx, file-reading

Please ask for any files you need before continuing.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

*SIA Enterprises — Strategy · Innovation · Analytics*
*siaenterprises.com.np · contact@siaenterprises.com.np · Kathmandu, Nepal*
