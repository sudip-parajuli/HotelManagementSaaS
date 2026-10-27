# SIA HMS — Build Progress

## Current Status
- **Phase:** 12 ✅ COMPLETE (Platform Production Readiness)
- **Next Phase:** None (All phases complete)
- **Last Updated:** 2026-07-08
- **AI Tool:** Antigravity

---

## Module Catalog

Every module is independently toggleable per tenant via the Super Admin panel. Modules can be granted through subscription plans or manually assigned. New industries (gaming cafes, restaurants, co-working spaces, etc.) can select only the modules they need.

| Key | Module | Description | Use Case |
|-----|--------|-------------|----------|
| `rooms` | **Room Management** | Manage room types, floor layouts, room status (available/occupied/dirty/maintenance), and property configuration. | Hotels, resorts, hostels, any lodging business |
| `bookings` | **Booking Engine** | Online and walk-in reservations with availability calendar, rate plans, guest profiles, overbooking prevention, and public booking widget. | Hotels with direct booking or OTA integration |
| `frontdesk` | **Front Desk Operations** | Check-in/check-out workflows, key assignment, guest folio management, walk-in registration, and daily arrivals/departures board. | Hotels, resorts, inns with reception desk |
| `pos` | **Restaurant & POS** | Order taking, menu categories, item modifiers, cart management, Kitchen Display integration, table service, and bill settlement. | Restaurants, cafes, bars, food courts |
| `housekeeping` | **Housekeeping** | Room cleaning schedules, task assignment to staff, status updates, maintenance requests, lost & found tracking, room discrepancy resolution. | Hotels, resorts with housekeeping staff |
| `billing` | **Billing & Invoicing** | Invoice generation with Nepal-compliant 10% Service Charge + 13% VAT, digital payment rebates, payment settlements, and IRD-ready PDF invoices. | Any business needing tax-compliant billing |
| `crm` | **CRM & Loyalty** | Guest profiles with segmentation tags, activity tracking, SMS marketing campaigns, loyalty points (1 point per Rs. 100), and tier management. | Hospitality, retail, member-based businesses |
| `staff` | **Staff & HR** | Employee records, departments, work shifts, clock-in/out with PIN, attendance grid, leave requests, overtime calculation (1.5×), and payroll-ready data. | Any business with shift-based employees |
| `timed_sessions` | **Timed Sessions** | Session billing with start/end/pause/resume, configurable rate cards (per-hour, per-minute, flat), slot schedules, session packages, unit management, and real-time WebSocket state updates. | Gaming cafes, coworking spaces, spas/salons, billiards, karaoke venues |
| `payroll` | **Nepalese Payroll** | Progressive TDS tax computation, SSF contributions, salary slip generation with QR verification, payroll periods, and accountant review workflows. | Nepalese businesses with salaried employees |
| `inventory` | **Inventory Management** | Suppliers registry, purchase order cycles, goods receipt notes, stock movements (adjustments/transfers/write-offs), recipes with cost %, and auto-deductions on POS orders. | Restaurants, hotels, retail with stock tracking |
| `analytics` | **Analytics & Reports** | Daily metrics aggregation, revenue/occupancy/ADR trends, top menu items, guest sources, exportable PDF/Excel reports, and Recharts dashboards. | Any data-driven business |

## Phase 0 — Project Scaffolding & Dev Environment ✅

### Task 0.1 — Initialize Monorepo & Docker ✅
- [x] `docker-compose.yml` — 8 services: db, redis, backend, celery_worker, celery_beat, frontend, minio, nginx
- [x] `docker-compose.prod.yml` — Production-ready compose with health checks
- [x] `.env.example` — All 40+ variables documented
- [x] `nginx/nginx.conf` — API proxy, WebSocket, static files
- [x] `.github/workflows/deploy.yml` — CI/CD pipeline
- [x] `PROGRESS.md` — This file

### Task 0.1 Backend Scaffold ✅
- [x] `backend/manage.py`
- [x] `backend/Dockerfile` — python:3.12-slim multi-stage
- [x] `backend/requirements/base.txt` — All 30+ packages
- [x] `backend/requirements/development.txt` — pytest, debug toolbar
- [x] `backend/requirements/production.txt` — gunicorn, sentry
- [x] `backend/pytest.ini`
- [x] `config/settings/base.py` — SHARED_APPS, TENANT_APPS, JWT, CORS, Celery, Storage
- [x] `config/settings/development.py`
- [x] `config/settings/production.py`
- [x] `config/urls.py`, `config/urls_public.py`
- [x] `config/asgi.py` — Django Channels ProtocolTypeRouter
- [x] `config/wsgi.py`, `config/celery.py`
- [x] All 20 app directories scaffolded with `__init__.py` and `apps.py`

### Task 0.1 Frontend Scaffold ✅
- [x] `frontend/` — Next.js 14, TypeScript, Tailwind CSS, App Router
- [x] `frontend/Dockerfile` — Multi-stage build, standalone output
- [x] `frontend/.env.local.example`
- [x] `next.config.mjs` — Standalone, image domains, API rewrites
- [x] shadcn/ui v4 initialized (`base-nova` style)
- [x] Components: Button, Card, Input, Label, DropdownMenu
- [x] Dependencies: axios, zustand, @tanstack/react-query, react-hook-form, zod, recharts, lucide-react, sonner, date-fns

### Task 0.2 — Multi-Tenant Setup ✅
- [x] `apps/tenants/models.py` — Client (TenantMixin), Domain (DomainMixin)
- [x] `apps/tenants/management/commands/create_tenant.py`
- [x] `apps/tenants/tests/test_tenants.py` — Model & schema isolation tests

### Task 0.3 — Authentication & RBAC ✅

**Backend:**
- [x] `apps/accounts/models.py` — Custom User (email login, 7 roles)
- [x] `apps/accounts/authentication.py` — CookieJWTAuthentication (httpOnly cookie support)
- [x] `apps/accounts/permissions.py` — 7 role permission classes: IsSuperAdmin, IsPropertyManager, IsFrontDesk, IsHousekeeping, IsRestaurantStaff, IsInventoryManager, IsAccountant, IsAnyStaff
- [x] `apps/accounts/serializers.py` — Custom JWT claims (role, full_name, email)
- [x] `apps/accounts/views.py` — Login, Refresh, Logout, Me, ChangePassword, UserCRUD
- [x] `apps/accounts/urls.py` — All auth endpoints
- [x] `apps/accounts/exceptions.py` — Global DRF exception handler
- [x] `apps/accounts/tests/test_auth.py` — 6 auth endpoint tests
- [x] `apps/accounts/tests/test_permissions.py` — 7 RBAC matrix tests
- [x] `backend/conftest.py` — Global fixtures: create_user, auth_client, role fixtures

**Frontend:**
- [x] `middleware.ts` — JWT cookie-based route protection
- [x] `src/app/api-auth/login/route.ts` — Proxies to Django, sets httpOnly cookies
- [x] `src/app/api-auth/logout/route.ts` — Blacklists token, clears cookies
- [x] `src/app/api-auth/refresh/route.ts` — Silent token refresh
- [x] `src/app/api-auth/me/route.ts` — Profile fetch with auto-refresh
- [x] `src/lib/api/client.ts` — Axios + 401 interceptor with silent refresh
- [x] `src/lib/api/auth.ts` — Auth API module
- [x] `src/lib/api/rooms.ts` — Rooms API module
- [x] `src/lib/api/bookings.ts` — Bookings API module
- [x] `src/lib/api/frontdesk.ts` — Frontdesk & analytics API module
- [x] `src/lib/store/authStore.ts` — Zustand auth store (persisted)
- [x] `src/lib/store/posStore.ts` — Zustand POS cart store
- [x] `src/lib/hooks/useAuth.ts` — Auth hook (login, logout, fetchMe)
- [x] `src/lib/hooks/useWebSocket.ts` — WebSocket hook with auto-reconnect
- [x] `src/lib/types/index.ts` — All TypeScript interfaces
- [x] `src/app/(auth)/login/page.tsx` — Premium glassmorphic login UI
- [x] `src/app/(dashboard)/layout.tsx` — Sidebar + Navbar shell
- [x] `src/app/(dashboard)/page.tsx` — Live dashboard with stats, activity feed
- [x] `src/components/layout/Sidebar.tsx` — Collapsible sidebar with role filtering
- [x] `src/components/layout/Navbar.tsx` — Navbar with user dropdown

---

## Phase 1 — Property & Room Management ✅

### Task 1.1 — Property & Room Management API ✅
- [x] `apps/properties/models.py` — Property, RoomType, Room, Amenity, RoomImage models
- [x] `apps/properties/serializers.py` — Nested serializers and room status summaries
- [x] `apps/properties/views.py` — ViewSets with customized permissions and floor/status filters
- [x] `apps/properties/urls.py` — Router registration
- [x] `apps/properties/tests/test_properties.py` — Complete property tests

### Task 1.2 — Rooms UI ✅
- [x] `/rooms` — Status grid with floor grouping and color-coded statuses
- [x] `/rooms/types` — Room classes dashboard with detail forms and image uploads
- [x] `/rooms/[id]` — Detailed room workspace showing booking logs
- [x] Components: `RoomStatusGrid.tsx`, `RoomCard.tsx`, `RoomTypeForm.tsx`, `RoomDetailSheet.tsx`

---

## Phase 2 — Booking Engine & Reservations ✅

### Task 2.1 — Booking Models & Availability Engine ✅
- [x] `apps/bookings/models.py` — `GuestProfile`, `Reservation`, and `RatePlan` models
- [x] `apps/bookings/availability.py` — `get_available_rooms` (DB-level exclusion) and `calculate_price` algorithms
- [x] `apps/bookings/serializers.py` — Overbooking validations and automatic stay cost estimators
- [x] `apps/bookings/views.py` — CRUD operations, confirmation/cancellation flows, and public availability APIs
- [x] `apps/bookings/tests/test_bookings.py` — Full pricing, overlap, and tenant schema test coverage

### Task 2.2 — Booking Calendar UI ✅
- [x] `/bookings/calendar` — Timeline grid page mapping rooms vs dates with drag/click interaction
- [x] `/bookings/new` — Multi-step reservation builder wizard (stay dates, guest profile lookup/creation, confirmation)
- [x] `/bookings/[id]` — Booking detail manager with check-in and cancel transitions
- [x] Components: `BookingCalendar.tsx`, `BookingDetailSheet.tsx`, `NewBookingDialog.tsx`, `GuestSearchInput.tsx`

### Task 2.3 — Public Booking Widget ✅
- [x] `/book` — Standalone iframe-embeddable public booking widget
- [x] Public API endpoints: `/api/bookings/public/availability/` (unauthenticated)
- [x] Clean mobile-first design leveraging local hotel branding colors

---

## Phase 3 — Front Desk (Check-in / Check-out) ✅

### Task 3.1 — Front Desk API ✅
- [x] `apps/frontdesk/models.py` — `CheckIn` and `CheckOut` operational database models
- [x] `apps/frontdesk/serializers.py` — Serializers for check-ins, check-outs and walk-in flows
- [x] `apps/frontdesk/views.py` — Today aggregates, check-in, check-out, and walked-in transaction logic views
- [x] `apps/frontdesk/urls.py` & `admin.py` — Expose urls routing and admin panel mounts
- [x] `apps/frontdesk/tests/test_frontdesk.py` — pytest suite covering checkins, checkouts, and transactional walkins
- [x] `apps/housekeeping/models.py` — Scaffold `HousekeepingTask` model
- [x] `apps/billing/models.py` — Scaffold `Invoice` model
- [x] `apps/loyalty/models.py` — Scaffold `LoyaltyAccount` and `LoyaltyTransaction` models

### Task 3.2 — Front Desk Dashboard UI ✅
- [x] `src/lib/api/frontdesk.ts` — Axios client helpers for checking in/out and walked-ins
- [x] `src/components/ui/textarea.tsx` — Custom Textarea UI element supporting details notes
- [x] `src/components/modules/frontdesk/` — `OccupancyBar.tsx`, `GuestCard.tsx`, `CheckInModal.tsx`, `CheckOutModal.tsx`, and `WalkInForm.tsx` components
- [x] `src/app/(dashboard)/frontdesk/page.tsx` — operations dashboard loading today statistics, Arrivals, In-House, and Departures lists

---

## Session Log

### 2026-06-14 — Session 2
✅ **PHASE 1 COMPLETE**
- Built backend APIs in `apps/properties/`: models, serializers, viewsets, urls, admin, and full tests.
- Implemented frontend pages and components: RoomCard, RoomStatusGrid, RoomDetailSheet, RoomTypeForm, `/rooms`, `/rooms/types`, `/rooms/[id]`.
- Deleted conflicting `app/page.tsx` file.
- TypeScript: 0 compile errors.

### 2026-06-14 — Session 1
✅ **PHASE 0 COMPLETE**
- All backend scaffolding, multi-tenant setup, auth/RBAC done
- Full frontend Next.js 14 app with httpOnly JWT cookies, middleware, dashboard shell
- TypeScript: 0 errors
- All auth tests written (conftest.py, test_auth.py, test_permissions.py)

---

### 2026-06-14 — Session 3
✅ **PHASE 2 COMPLETE**
- Resolved remaining TypeScript compilation errors in types index, search input, and multi-step bookings builder.
- Configured custom theme variables in `tailwind.config.ts` and corrected `globals.css` structure to compile Tailwind v3 properly.
- Deployed Next.js production build check with zero compiler or bundling warnings/errors.
- Updated progress tracking and project plan validation.

---

### 2026-06-14 — Session 4
✅ **PHASE 3 COMPLETE**
- Implemented Front Desk Check-In and Check-Out transaction modules on backend (models, views, serializers, urls, admin, and complete tests).
- Scaffolded auxiliary apps: Housekeeping task triggers, Billing final invoices, and Loyalty points earn accounts.
- Created frontend operations dashboard: stats aggregates, search roster filters, and Columns lists.
- Built interactive modal screens: CheckInModal key assignment, CheckOutModal items billing additions, and WalkInForm quick allocations.
- Created text area custom UI components, verified TypeScript with 0 compilation errors, and verified production build bundling success.

---

## Phase 4 — Restaurant POS & Kitchen Display ✅

### Task 4.1 — Restaurant & POS Models ✅
- [x] `apps/restaurant/models.py` — DiningTable, MenuItem, MenuCategory
- [x] `apps/pos/models.py` — Order, OrderItem, KOT models
- [x] `apps/pos/consumers.py` & `routing.py` — KDS WebSocket consumer
- [x] `apps/pos/tests/test_pos.py` — Full test suite for orders and KOT routing

### Task 4.2 — POS Ordering UI ✅
- [x] `/pos` — Restaurant order taking dashboard (menu search, categories, cart panel)
- [x] `/pos/tables` — Table management board showing status and capacities
- [x] Components: `MenuPanel.tsx`, `MenuItemCard.tsx`, `OrderPanel.tsx`, `PaymentModal.tsx`
- [x] Zustand: `posStore.ts` central cart state management

### Task 4.3 — Kitchen Display Screen (KDS) & WebSocket Notifications ✅
- [x] `/pos/kds` — Kitchen screen showing dynamic order cards routed by station
- [x] Components: `KDSOrderCard.tsx`
- [x] WebSockets: Real-time KDS state updates

---

## Phase 5 — Housekeeping & Inventory Management ✅

### Task 5.1 — Housekeeping Module ✅
- [x] `apps/housekeeping/models.py` — HousekeepingTask updates and MaintenanceRequest database model
- [x] `apps/housekeeping/serializers.py` & `views.py` — Task status transition endpoints with WebSocket broadcasts
- [x] `/housekeeping` — Manager board with floor room status grids and bulk assignment drawers
- [x] `/housekeeping/my-tasks` — Mobile-optimized housekeeper touch control screen
- [x] `apps/housekeeping/tests/test_housekeeping.py` — Status flow and maintenance resolution tests

### Task 5.2 — Inventory Management ✅
- [x] `apps/inventory/models.py` — Category, InventoryItem, Supplier, PurchaseOrder, POItem, StockMovement, Recipe models
- [x] `apps/inventory/serializers.py` & `views.py` — Nested PO creation, manual adjustment endpoints, and GRN receive endpoints
- [x] `apps/inventory/signals.py` — Auto-deductions of ingredients from stock when POS order items transition to served
- [x] `apps/inventory/tests/test_inventory.py` — Recipe stock auto-deduction and GRN transaction tests
- [x] `/inventory` — Stocks dashboard showing metrics, reorder warnings, and movements feed
- [x] `/inventory/items` — Catalog item ledger with search, category filtering, and manual stock adjustment modal
- [x] `/inventory/po` — Purchase Order workspace wizard and delivery receiving GRN wizard
- [x] `frontend/src/lib/api/inventory.ts` — Axios client bindings for inventory, POs, GRNs, recipes, and movements
- [x] Central TypeScript interfaces updated in `src/lib/types/index.ts`

---

## Session Log

### 2026-06-14 — Session 5
✅ **PHASE 4 & 5 COMPLETE**
- Built backend APIs for POS and Kitchen routing (orders, items, KOTs, KDS consumer) and full unit tests.
- Built POS frontend order wizard, cart system, table boards, and live WebSocket KDS screen.
- Built Housekeeping backend task flows, maintenance logs, and manager/staff dashboards.
- Built Inventory models, serializers, views, and signal handlers for recipe stock auto-deductions.
- Created PO wizard and GRN receiving wizards, stock ledger item boards, and dashboard statistics page.
- Cleared all TypeScript compilation warnings, achieving 0 compiler errors.
- Verified Next.js build and bundle generation successfully.

---

### 2026-06-14 — Session 6
✅ **PHASE 6 & 7 COMPLETE**
- Built staff directory profiles, HR shifts, attendance logs, and Nepal TDS/SSF payroll calculator.
- Built WeasyPrint payslip PDF rendering with verification QR codes.
- Built staff directories, schedules, clock-in consoles, and payroll processing views on Next.js.
- Built Billing Engine with automatic 10% Service Charge + 13% VAT and IRD compliance.
- Integrated Nepal payment gateways: eSewa epay v2 HMAC-SHA256 signature verification, Khalti API v2 checking client, and simulated Fonepay QR scanning with success poller.
- Integrated CRM & Loyalty accounts, automating points allocations (1 point per 100 NPR) and tier ranks promotions.
- Cleared all TypeScript compilation warnings and verified that typechecking passes cleanly.

---

### 2026-06-14 — Session 7
✅ **PHASE 8 COMPLETE**
- Created `DailyMetric` and `ReportExport` models for aggregation database storage.
- Programmed daily midnight Celery task aggregates and report files export manager task.
- Created REST API views mapping analytics timeseries and generating background report requests.
- Wrote PDF builders for revenue, occupancy, active checked-in guest ledger accounts, and IRD Nepal VAT sales book compliance format.
- Wrote Excel spreadsheet builders for monthly staff attendance tables, inventory consumption items, P&L statements, and payroll reconciliation registers.
- Built Next.js interactive analytics dashboard with Recharts stacked areas, monthly heatmaps, acquisition channels, and top kitchen menu items.
- Built Reports Console generator page letting managers request PDF or Excel compile jobs.
- Cleared all TypeScript type errors, achieving 0 compiler warnings/errors.

---

## Phase 9 — SaaS Subscriptions & Super Admin ✅

### Task 9.1 — Subscription & Feature Gating ✅
- [x] `backend/apps/subscriptions/models.py` — `SubscriptionPlan`, `TenantSubscription`, and `SubscriptionInvoice` in the public schema
- [x] `backend/apps/subscriptions/permissions.py` — Feature gating base and specific permissions (`HasPayrollFeature`, `HasCRMFeature`, `HasAdvancedAnalytics`)
- [x] `backend/apps/subscriptions/tasks.py` — Daily cron renewals, delinquency suspensions (past due > 7 days), and monthly invoice compilation
- [x] `backend/apps/subscriptions/tests/test_subscriptions.py` — 6 integration test cases passing

### Task 9.2 — Super Admin Panel & Impersonation ✅
- [x] `backend/apps/accounts/admin_views.py` — Onboarding transactional hooks (isolated PostgreSQL schemas creation, migrations triggers), JWT impersonation, and platform-wide MRR aggregates
- [x] `backend/config/urls.py` — Registered `/api/admin/` endpoints routing
- [x] `frontend/src/lib/types/index.ts` — Structured SaaS types and API payloads
- [x] `frontend/src/lib/api/superadmin.ts` — Axios service triggers for SaaS controls
- [x] `frontend/src/app/api-auth/impersonate/route.ts` — Next.js Route Handler for secure token cookies swap
- [x] `frontend/src/app/(dashboard)/superadmin/layout.tsx` — RoleGuard administrator boundary layout
- [x] `frontend/src/app/(dashboard)/superadmin/page.tsx` — Recharts visual MRR graph, trial count summary cards, and quick dashboard navigation panel
- [x] `frontend/src/app/(dashboard)/superadmin/tenants/page.tsx` — Database list search roster, suspension switches, and Impersonate triggers
- [x] `frontend/src/app/(dashboard)/superadmin/tenants/new/page.tsx` — Real-time slug derivation wizard and auto-migration onboarding console
- [x] `frontend/src/app/(dashboard)/superadmin/subscriptions/page.tsx` — Interactive room caps, staff bounds, and gated feature flags editor panel
- [x] `frontend/src/app/(dashboard)/layout.tsx` — Dynamic top header alert letting administrators stop impersonation sessions and restore their superadmin session

---

## Session Log

### 2026-06-14 — Session 8
✅ **PHASE 9 COMPLETE**
- Built Django-tenants transactional tenant onboarding API which programmatically spins up clean PostgreSQL database schemas, executes app-specific migrations, and configures the default property manager admin.
- Implemented robust multi-tenant token impersonation middleware, generating JWT overrides for database routing scoped to requested schemas.
- Configured Celery daily task cycles checking trial warnings, past_due billing increments, and SMS alerts.
- Built Next.js Route Handler for impersonation cookie backups and session restorers.
- Developed beautiful, fully-functional Super Admin dashboards (MRR Recharts lines graphs, database search lists, onboarding wizards, and feature flags checklist controllers).
- Achieved 100% green pytest coverage for subscription suites and 0 TypeScript compilation warnings/errors.

### 2026-06-17 — Session 9 (Upgrades & Hardening)
✅ **PHASE 11 COMPLETE**
- **Fonepay Dynamic QR API (C.1) [COMPLETE]**: Integrated real status check and QR generation endpoints with fallback stub sandbox mode support.
- **English-Nepali i18n Translation (C.2) [COMPLETE]**: Integrated complete dual-language translation engine support with 550+ lines translated, routing sidebars, POS, occupancy stats dashboards, and forms dynamically.
- **Impersonation Log Auditing (C.3) [COMPLETE]**: Built `ImpersonationLog` tracking to log SuperAdmin Support actions, swap cookie swap timers down to 10 minutes, and display visibility warning banners to tenant managers.
- **Nepal Tax Slabs Configuration (C.4) [COMPLETE]**: Refactored payroll engine calculations to load dynamically from `TaxSlab` and `SSFConfig` tables, exposing edit consoles inside SuperAdmin controls.
- **Lahana Resort Seeding [COMPLETE]**: Built automated seeder scripts for property listings, room allocations, guest check-ins, and POS tables.
- **Robustness & Crash Hardening [COMPLETE]**: Resolved multiple runtime TypeError crash conditions inside POS menu panels, reports, inventory wizards, and schema onboarding handlers.

---

## Phase 12 — Platform Production Readiness ✅

### Track A — SuperAdmin Platform Rebuild
- [x] **Task A.3.1 — Separate Route Groups & Layouts**: Created `/admin` routes folder; implemented custom `AdminSidebar` and `AdminNavbar`; set up role guards and redirection; cleaned up old `/superadmin` routes and fixed layout.
- [x] **Task A.3.2 — Platform Dashboard**: Extended `SuperAdminMetricsView` with comprehensive data. Built `/admin/page.tsx` with KPI cards, Recharts area charts, tenant health table, and recent activity feed.
- [x] **Task A.3.3 — Tenant Management (Deep)**: Added `TenantFeatureGrant` model and endpoints. Updated `HasFeaturePermission` to check manual grants. Built `/admin/tenants/[id]` detail page with 5 tabs (Overview, Usage, Features with grant/revoke, Billing with mark-paid, Support with impersonation). Added "Details" button to tenant list.
- [x] **Task A.3.4 — Add-on Marketplace Management**: Created `AddonModule` and `AddonRequest` models (migration applied). Built `/admin/addons` page with catalog grid (create/edit) and requests table (approve/reject + auto TenantFeatureGrant).
- [x] **Task A.3.5 — System Health & Support Console**: Created `SystemHealthView` endpoint pinging DB/Redis/Celery. Built `/admin/system` page with service health cards, latency gauges, and 15-second auto-refresh.

### Track C — Platform Fixes & Module Management
- [x] **C.1 — Admin Missing Pages**: Created `/admin/revenue`, `/admin/support`, `/admin/settings` pages
- [x] **C.2 — Tenant Login Fix**: Fixed Next.js 14 cookie handling in all auth route handlers (`response.cookies.set()`)
- [x] **C.3 — Module Management System**:
  - `GET /api/auth/features/` endpoint for tenant feature discovery
  - Frontend sidebar gating by `featureKey`
  - Module Marketplace toggle UI in tenant detail Features tab
  - `seed_modules` management command

### Track B — Core HMS Module Hardening
- [x] **B.1 — Nepal Tax Compliance & Billing**
  - Property tax config fields (`service_charge_applicable`, `service_charge_rate`, `vat_rate`, `digital_payment_rebate_rate`)
  - Invoice fields (`vat_amount`, `digital_rebate_amount`, `net_payable_amount`)
  - Correct Nepal calculation order: Base → Service Charge → Subtotal → VAT → Gross Total → Rebate → Net Payable
  - CARD payment method added
  - PDF invoice template shows all line items
  - Digital payments charge `net_payable_amount` automatically
  - Frontend types updated with net_payable_amount
  - PaymentModal shows net payable for digital payments
- [x] **B.2 — POS & KDS Completion**
  - KOT/BOT ticket_type distinction + station routing
  - Pre-orders with scheduled_time + Celery activation task
  - OrderDiscount model with approval threshold
  - POS Insights endpoint + `/pos/insights/` page
  - KOT timing tracking (accepted_at, completed_at, served_at)
- [x] **B.3 — Table Management**
  - Table status lifecycle (available → occupied → bill_requested → cleaning → available)
  - Steward/waiter assignment (assigned_waiter FK on DiningTable)
  - Table merge endpoint (POST /restaurant/tables/merge/)
  - Table split endpoint (POST /restaurant/tables/{id}/split/)
  - Floor plan coordinates (position_x, position_y on DiningTable)
- [x] **B.4 — Inventory ↔ Kitchen ↔ Room**
  - RoomAmenityConsumption model + auto-charge to folio endpoint
  - Housekeeping supply consumption on task completion
  - Cross-department low-stock alerts via Category.category_type
  - Recipe cost % on menu (cost_price / selling_price) - already available
- [x] **B.5 — Staff Attendance Punch In/Out**
  - Clock in/out endpoints with PIN validation (audit: PIN stored - could be improved)
  - Duplicate punch prevention
  - Late/early detection logic
  - Overtime calculation (+1.5× for hours > 8)
  - Attendance dashboard with grid view (month/year filter)
  - Punch kiosk page at `/staff/attendance` with numeric keypad
- [x] **B.6 — Housekeeping Completion**
   - RoomDiscrepancy model for status mismatch tracking
   - LostFoundItem model + UI for item tracking  
   - Housekeeping supply consumption integration
   - Discrepancy resolution workflow
- [x] **B.7 — Booking Gaps**
   - BookingGapsView endpoint for unbooked date detection
   - Frontend API client for gaps endpoint
   - TypeScript BookingGap interface
- [x] **B.8 — CRM & Loyalty**
   - GuestTag, GuestActivity, Campaign models complete
   - GuestPortfolioViewSet with tag/untag actions
   - Frontend CRM dashboard with guest tags and activities
- [x] **B.9 — Analytics & Reporting**
   - DailyMetric and ReportExport models
   - DashboardSummaryView, RevenueAnalyticsView, TopMenuItemsView
   - OccupancyAnalyticsView, GuestSourcesView implemented
   - Reports Console with PDF/Excel generation
   - Frontend analytics dashboard with Recharts

### Track D — Modular Subscription System & Timed Sessions
- [x] **D.1 — Timed Session Backend (`apps/timed_sessions/`)**
   - Models: SessionType, RateCard, Session (with start/end/pause/resume), SessionPackage, SlotSchedule, SessionUnit
   - Service layer (`session_service.py`) — active session count, hourly revenue, concurrent limit enforcement
   - Celery tasks — auto-end stale sessions, daily metrics aggregation
   - WebSocket consumer — real-time session state broadcasts per unit
   - Serializers & Views — SessionViewSet (CRUD + pause/resume/extend), SessionUnitViewSet, RateCardViewSet, SlotScheduleViewSet, LeaderboardView, SessionMetricsView
   - URL routing + comprehensive test suite (42 tests)
- [x] **D.2 — Module Subscription Backend (`apps/subscriptions/` extensions)**
   - Module model with dependency graph (`depends_on` M2M self) and pricing (monthly/yearly)
   - `TenantModule` model — per-tenant activation with active/inactive/granted states
   - `seed_modules.py` — 14 modules, 9 business types, Nepal-realistic pricing
   - `ActivateModulesView` — dependency validation (returns 400 `dependency_not_met` with `requires` list)
   - `calculate_tenant_monthly_bill` — aggregates all active module prices
   - `0004_migrate_plan_features_to_module_subs.py` — migration converts legacy plan features to per-module subscriptions
   - Billing service: `test_module_billing.py` (9 tests) + `test_sessions.py` (42 tests) = 109 total passing
- [x] **D.3 — Tenant-Facing Module Selection UX**
   - `/settings/modules/` — Module marketplace grid with activation toggles, dependency warnings, pricing breakdown
   - `lib/api/modules.ts` — API client for tenant module management
   - Module dependency validation displayed inline with tooltip guidance
- [x] **D.4 — Timed Session Frontend Pages**
   - `/sessions/` — Active sessions dashboard with status cards, real-time WebSocket feed
   - `/sessions/new/` — Multi-step session creator (select session type/rate/unit, start timer)
   - `/sessions/[id]/` — Session detail with pause/resume/extend controls, live timer
   - `/sessions/units/` — Unit management (gaming PCs, coworking desks, spa rooms, etc.)
   - `/sessions/reports/` — Revenue, occupancy, and session metrics with charts
   - `lib/api/sessions.ts` — Full API client for timed sessions
- [x] **D.5 — Super Admin — Module Catalog CRUD & Revenue Analytics**
   - `/admin/addons/` — Full module catalog management (create/edit/delete modules, set pricing, configure dependencies)
   - `/admin/revenue/` — Revenue analytics dashboard: MRR chart, per-module revenue breakdown, tenant billing history
   - `/admin/tenants/[id]/` — Enhanced with module activation overview, manual grant/revoke per module
- [x] **D.6 — Landing Page Upgrade**
   - Hero: "Pay Only for What You Actually Use" — modular SaaS messaging
   - 14-module catalog grid with icons, pricing, categories, and "Core" badges
   - 9 business types with per-type module recommendations
   - Pricing bundles: Hotel (11 modules / NPR 7,500/mo), Gaming (7 / NPR 4,200/mo), Restaurant (8 / NPR 4,900/mo)
   - Transparent per-module pricing, yearly = monthly × 10 (2 months free)
   - *(Session 16: removed bundles, moved pricing into industry cards)*

---

### 2026-06-30 — Session 12
✅ **PHASE 12 TASK B.6 COMPLETE**
- Added RoomDiscrepancy and LostFoundItem models with serializers
- Created TypeScript interfaces for room discrepancies and lost items
- Verified housekeeping views include model imports
- Added discrepancies and lost-found endpoints to housekeeping/urls.py

### 2026-06-30 — Session 13
✅ **TRACK B COMPLETE (B.7 - B.9)**
- Implemented BookingGapsView for revenue optimization insights
- Updated frontend bookings API with gaps endpoint
- Verified B.8 CRM models and views already complete
- Verified B.9 Analytics reports and views already complete
- TypeScript interfaces for BookingGap added

### 2026-07-07 — Session 14
✅ **BUG FIXES & MODULE MANAGEMENT**
- **Fixed admin sidebar 404s**: Created `/admin/revenue`, `/admin/support`, `/admin/settings` pages with full stats/tabs layouts
- **Fixed tenant login redirect**: Root cause was Next.js 14 `cookies().set()` not transferring to `NextResponse.json()` in Route Handlers. Rewrote all 4 auth route handlers (`login`, `me`, `refresh`, `logout`) to use `response.cookies.set()` directly. Also fixed middleware to allow authenticated users through without rewriting `/` → `/landing/`
- **Built Module Management System**:
  - New backend `GET /api/auth/features/` endpoint (`UserFeaturesView`) returning enabled feature keys for current tenant
  - Frontend sidebar now gates nav items by `featureKey` — only shows modules the tenant has access to
  - Dashboard layout fetches features on mount and stores in Zustand auth store
  - Enhanced tenant detail Features tab with Module Marketplace grid (toggle switches for addon modules)
  - Created `python manage.py seed_modules` command to seed addon catalog and update plan features

### 2026-07-07 — Session 15
✅ **PHASE 12 TRACK D COMPLETE — MODULAR SUBSCRIPTIONS & TIMED SESSIONS**
- **Built Timed Sessions backend** (`apps/timed_sessions/`): Session lifecycle (start/end/pause/resume), rate cards, slot schedules, unit management, WebSocket real-time state, Celery auto-end, and 42 passing tests.
- **Extended Subscription system**: `Module` model with dependency graph (M2M self), `TenantModule` per-tenant activation, `seed_modules.py` with 14 modules × 9 business types, `ActivateModulesView` with dependency validation, `calculate_tenant_monthly_bill` aggregating all active module prices.
- **Migration `0004_migrate_plan_features_to_module_subs.py`**: Converts legacy plan feature flags → per-module tenant subscriptions.
- **TDD approach**: 9 new module billing tests + 42 timed session tests = 109 total passing (67 subscriptions + 42 timed_sessions).
- **Tenant module selection UX**: `/settings/modules/` marketplace grid with activation toggles, dependency warnings, and pricing breakdown.
- **Timed session frontend**: 5 pages — dashboard (`/sessions/`), new session wizard, detail view with pause/resume/extend, units management, and reports with charts.
- **Super Admin extensions**: `/admin/addons/` for module catalog CRUD, `/admin/revenue/` for MRR & per-module revenue analytics, `/admin/tenants/[id]/` with module activation overview and manual grant/revoke.
- **Landing page upgraded**: Modular SaaS hero ("Pay Only for What You Actually Use"), 14-module catalog grid with icons/pricing/categories, 9 business type recommendations, three pricing bundles (Hotel/Gaming/Restaurant), transparent per-module pricing.

### 2026-07-07 — Session 16
✅ **BUSINESS-TYPE-SPECIFIC REGISTRATION & LANDING PAGE OVERHAUL**
- **Landing page**: Removed Pricing bundles section entirely; each industry card now shows a computed starting price (NPR X,XXX/mo based on recommended modules) + "Start Free Trial" button linked to `/register/?business_type=<key>`. Hero CTA also links to generic `/register/`.
- **Registration form**: Fully rewritten to be business-type-specific. Accepts `business_type` query param from landing page. Dynamic title ("Create Your Gaming Cafe Workspace", etc.), dynamic input labels ("Café Name", "Hotel Name", etc.), and removes the old "Subscription Plan Tier" dropdown. Sends `business_type` in the onboard payload instead of `plan_slug`.
- **Backend `PublicTenantOnboardView`**: Accepts `business_type` → sets `Client.business_type` + auto-activates core modules + recommended modules for that business type via `TenantModuleSubscription`. `plan_slug` now optional (falls back to cheapest active plan). Default subscription status: TRIAL (14 days).
- **Types**: `ClientOnboardPayload.business_type` added, `plan_slug` removed.
- **Tests**: All 3 public onboarding tests + 9 modular billing permission tests pass. Existing setup wizard (`/setup/`) works with new flow — pre-selects business type and modules from registration.

### 2026-07-08 — Session 18
✅ **PUBLIC ONBOARDING BUG FIXES (500 ERROR + ECONNRESET)**
- **Fixed `transaction.atomic()` wrapping DDL**: Removed `transaction.atomic()` around schema creation + migrations in `PublicTenantOnboardView`. django-tenants' `auto_create_schema` runs DDL (CREATE SCHEMA + migrations) internally; wrapping it in an outer `atomic()` corrupts the PostgreSQL connection state, causing ECONNRESET on the proxy and silent 500 errors.
- **Fixed missing `SubscriptionPlan` crash**: On fresh databases no plans are seeded, so `plan` was `None` → `TenantSubscription.objects.create(plan=None)` violated the NOT NULL FK constraint → 500. Added auto-creation of a default "Free Trial" plan when none exists.
- **Fixed `recommended_for__contains` query**: Was `recommended_for__contains=[business_type.key]` (list-wrapped), which breaks the JSONB `@>` operator. Changed to `recommended_for__contains=business_type.key`.
- **Added `logger.exception()` in except handler**: The broad `except Exception` previously swallowed the full traceback with no logging, making every onboarding failure impossible to debug.
- **Tests**: All 3 public onboarding tests pass. All 31 subscription tests pass.

### 2026-07-07 — Session 17
✅ **SIDEBAR FEATURE GATING & BUSINESS-TYPE MODULE FILTERING**
- **Fixed missing `/api-auth/features/` Route Handler**: Created `app/api-auth/features/route.ts` — proxies `GET /api-auth/features/` → backend `GET /api/auth/features/` with cookie forwarding and silent token refresh. (This was never created in Session 14, causing a 404 that silently logged tenants out.)
- **Dashboard layout hardened**: `/features` fetch failure now returns `{ features: [] }` instead of crashing through `.catch()` → `clearAuth()` → redirect to login.
- **Sidebar fallback removed**: Deleted `if (features.length === 0) return true;` which showed ALL nav items when features hadn't loaded yet.
- **Settings featureKey fixed**: Was incorrectly set to `"timed_sessions"` so the Settings link only showed when timed_sessions was active. Removed featureKey so it always shows.
- **Admin dashboard rewritten**: Replaced old hotel-centric plan-distribution layout with module-level KPI cards, Module Adoption & Revenue table, and top-modules bar chart.
- **Tenant dashboard rewritten**: Now fetches `GET /api/modules/tenant/` on mount, shows only quick links for active modules + per-module widget cards. No more hotel data (occupancy rate, arrivals, room status) for gaming cafe tenants.
- **Business-type filter in `UserFeaturesView`**: Features are now filtered against the tenant's `business_type.recommended_modules` + core modules. The filter applies to the **final combined set** (`active_module_keys | grant_keys | plan_features`) rather than just module subscriptions. Feature grants always bypass. Legacy `plan_features` that leak irrelevant modules (e.g., `rooms` on a starter plan) are also filtered out.
- **Admin onboarding now sets `business_type`**: `TenantManagementViewSet.create` accepts `business_type` in request payload, validates it, stores it on the tenant, and auto-activates the recommended modules for that business type (same as public registration flow).
- **Existing tenants without `business_type`**: Can be fixed with `Client.objects.filter(name__icontains="gaming").update(business_type=bt)` in the Django shell.
- **Tests**: All 31 subscription tests pass. TypeScript: 0 errors.

### 2026-07-08 — Session 19
✅ **ADMIN PAGE OVERHAUL — MODULAR SUBSCRIPTIONS & BUSINESS TYPES**
- **Fixed `TenantManagementViewSet.create` DDL bug**: Removed `transaction.atomic()` wrapping schema creation/migrations (same ECONNRESET cause as public onboarding).
- **Updated `ClientSerializer`**: Added `business_type`, `business_type_name`, `business_type_key`, `business_description`, `active_module_count` fields.
- **Updated `SuperAdminMetricsView`**: Added `active_tenants`, `trial_tenants`, `plan_mrr`, `module_mrr`; MRR now sums plan + module subscription prices. Removed nonexistent `GRANTED` enum reference.
- **Updated `Tenant` TS type**: Added business-type fields, `active_module_count`.
- **Rewrote `/admin/tenants/page.tsx`**: Business-type colour badges, module count column, searchable by business type.
- **Rewrote `/admin/tenants/new/page.tsx`**: 9 business-type cards, auto-computed schema/subdomain, live module-catalog grid with core lock.
- **Rewrote `/admin/subscriptions/page.tsx`**: Fetches live modules from `modulesApi.listModules()`, plan editor with module toggle grid and category badges.
- **Rewrote `/admin/settings/page.tsx`**: Editable tax slabs & SSF rows (add/remove), system health card, consistent cyan/slate theme.
- **Rewrote `/admin/support/page.tsx`**: New "Module Requests" tab with approve/reject workflow + reject reason modal.
- **Fixed `AddonModule` type mismatch**: Aligned `modules.ts` type with `types/index.ts` (`depends_on` → `depends_on_keys`, added `created_at`/`updated_at`); fixed consuming files (`onboarding/setup/page.tsx`).
- **Tests**: 50/50 backend tests pass. TypeScript: 0 errors.
