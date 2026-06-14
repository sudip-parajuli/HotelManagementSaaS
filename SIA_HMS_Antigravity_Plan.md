# SIA Enterprises — Hotel Management System (HMS)
## Complete Antigravity Implementation Plan
### Django REST · Next.js · React · PostgreSQL · Redis · Docker
**Version:** 1.0 | **Prepared By:** SIA Enterprises | **Type:** Internal AI Build Plan

---

> **HOW TO USE THIS FILE**
> Hand this file directly to Antigravity as the first message of every session.
> Each section is a standalone prompt block. Work phase by phase, task by task.
> At quota limit → jump to [Section 7: AI Handoff Prompt](#7-ai-handoff-prompt) immediately.

---

## TABLE OF CONTENTS

1. [System Overview & Architecture](#1-system-overview--architecture)
2. [Multi-Tenant Strategy](#2-multi-tenant-strategy)
3. [Complete Module Breakdown](#3-complete-module-breakdown)
4. [Project Directory Structure](#4-project-directory-structure)
5. [Phase-by-Phase Implementation Plan](#5-phase-by-phase-implementation-plan)
6. [Database Schema Decisions](#6-database-schema-decisions)
7. [AI Handoff Prompt](#7-ai-handoff-prompt)
8. [Quota Management Strategy](#8-quota-management-strategy)
9. [Testing Strategy](#9-testing-strategy)
10. [Deployment Plan](#10-deployment-plan)
11. [Global Skills Reference](#11-global-skills-reference)
12. [Master Timeline](#12-master-timeline)

---

## 1. System Overview & Architecture

### What We Are Building

SIA Enterprises is building a **proprietary Hotel Management System (HMS)** from scratch — not forked from any existing platform. This is a multi-tenant SaaS product that SIA owns, operates, and sells to hotel and villa clients across Nepal on a subscription basis. For clients who prefer full private ownership, the exact same codebase is sold as a one-time installation with full source code.

**Business Model:**
- **SaaS Mode** → Client accesses via `clientname.siaenterprises.com.np` — pays monthly
- **Private Install Mode** → Codebase deployed on client's own VPS — one-time payment
- **White-label Mode** → SIA hosts, client uses their own domain via CNAME — pays monthly

### Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Backend API | Django 5 + Django REST Framework | Business logic, REST endpoints, auth |
| Async / Realtime | Django Channels + Celery + Redis | WebSocket, background jobs, queues |
| Frontend | Next.js 14 (App Router) + TypeScript | Dashboard, booking UI, public pages |
| UI Components | shadcn/ui + Tailwind CSS | Accessible, consistent component system |
| Database | PostgreSQL 16 + Django ORM | Primary relational data store |
| Cache | Redis 7 | Sessions, real-time pub/sub, rate limiting |
| File Storage | MinIO (self-hosted S3) | Images, documents, invoices |
| Email | Django Email + SMTP | Booking confirmations, notifications |
| SMS | Sparrow SMS API | Nepal-native SMS for guests and staff |
| Payments | eSewa API + Khalti API v2 + Fonepay | Nepal payment gateways |
| PDF | WeasyPrint | Invoices, payslips, reports |
| Excel | openpyxl | Data exports, report generation |
| Containerization | Docker + Docker Compose | Dev/staging/prod environment parity |
| Reverse Proxy | Nginx + Gunicorn | Production server |
| CI/CD | GitHub Actions | Auto-deploy on push to main |
| Monitoring | Netdata (self-hosted) | Server health, uptime, alerts |

### Architecture Pattern

```
Client Browser
     │
     ▼
Nginx (SSL termination)
     │
     ├──► Next.js (port 3000) ────► Django REST API (port 8000)
     │         │                           │
     │    Static Assets               Django Channels (WS)
     │                                     │
     │                              PostgreSQL ◄── django-tenants
     │                              Redis
     │                              MinIO
     │                              Celery Workers
     │
     └──► /api/* proxy → Django REST API
```

---

## 2. Multi-Tenant Strategy

### Schema-per-Tenant Model

Each hotel client gets their own **PostgreSQL schema** within the same database instance. This provides complete data isolation with shared infrastructure.

```
PostgreSQL: sia_hms_db
├── public schema          → Shared: User, SubscriptionPlan, TenantSubscription, Billing
├── hotel_paraiso schema   → All HMS data for Hotel Paraiso
├── himalayan_villa schema → All HMS data for Himalayan Villa
└── demo schema            → Demo/trial tenant
```

**Library:** `django-tenants` — handles schema routing per request via subdomain detection.

### URL Routing

```
# SaaS mode — subdomain routing
paraiso.siaenterprises.com.np      →  schema: hotel_paraiso
himalayan.siaenterprises.com.np    →  schema: himalayan_villa

# Private install — single tenant, client's own domain
pms.hotelparaiso.com.np            →  schema: public (single tenant mode)

# SIA Super Admin
admin.siaenterprises.com.np        →  public schema only
```

### Tenant vs Shared Apps

```python
# settings/base.py

SHARED_APPS = [
    'django_tenants',
    'django.contrib.contenttypes',
    'apps.accounts',          # User model lives here
    'apps.subscriptions',     # Plans, billing, tenant registry
]

TENANT_APPS = [
    'django.contrib.auth',
    'apps.properties',
    'apps.bookings',
    'apps.frontdesk',
    'apps.restaurant',
    'apps.pos',
    'apps.housekeeping',
    'apps.billing',
    'apps.payments',
    'apps.staff',
    'apps.hr',
    'apps.payroll',
    'apps.inventory',
    'apps.crm',
    'apps.loyalty',
    'apps.analytics',
    'apps.reports',
    'apps.notifications',
]
```

---

## 3. Complete Module Breakdown

The HMS is built in **10 core modules**. Each module is a standalone Django app with its own models, serializers, views, URLs, and tests. Frontend has its own page directory per module.

| # | Module | Django Apps | Frontend Route | Key Models |
|---|---|---|---|---|
| 1 | Property & Room Mgmt | `properties`, `rooms` | `/rooms/` | Property, RoomType, Room, Amenity |
| 2 | Booking & Reservations | `bookings` | `/bookings/` | Reservation, GuestProfile, BookingSource |
| 3 | Front Desk (Check-in/out) | `frontdesk` | `/frontdesk/` | CheckIn, CheckOut, GuestIDRecord |
| 4 | Restaurant & POS | `restaurant`, `pos` | `/pos/`, `/menu/` | Table, MenuItem, Order, OrderItem, KOT |
| 5 | Housekeeping | `housekeeping` | `/housekeeping/` | HousekeepingTask, RoomStatus |
| 6 | Billing & Payments | `billing`, `payments` | `/billing/` | Invoice, Payment, PaymentTransaction |
| 7 | Staff & HR | `staff`, `hr`, `payroll` | `/staff/` | StaffMember, Shift, Attendance, Payslip |
| 8 | Inventory | `inventory` | `/inventory/` | Item, Stock, Supplier, PurchaseOrder |
| 9 | CRM & Loyalty | `crm`, `loyalty` | `/crm/` | GuestProfile, LoyaltyAccount, Campaign |
| 10 | Analytics & Reports | `analytics`, `reports` | `/analytics/` | DailyMetric, OccupancyMetric, RevenueLog |

---

## 4. Project Directory Structure

Antigravity must create this exact structure. Do not deviate.

```
sia-hms/
├── PROGRESS.md                        ← Update this after every session
├── .env.example
├── docker-compose.yml                 ← Dev environment
├── docker-compose.prod.yml            ← Production environment
│
├── backend/
│   ├── manage.py
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── development.txt
│   │   └── production.txt
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── development.py
│   │   │   └── production.py
│   │   ├── urls.py                    ← Root URL config
│   │   ├── wsgi.py
│   │   └── asgi.py                   ← Django Channels entry point
│   └── apps/
│       ├── tenants/                   ← django-tenants config
│       │   ├── models.py              ← Client, Domain models
│       │   └── management/commands/create_tenant.py
│       ├── accounts/                  ← Auth, JWT, RBAC
│       │   ├── models.py              ← Custom User model
│       │   ├── serializers.py
│       │   ├── views.py
│       │   ├── permissions.py         ← Role-based permission classes
│       │   ├── urls.py
│       │   └── tests/
│       ├── properties/
│       │   ├── models.py
│       │   ├── serializers.py
│       │   ├── views.py
│       │   ├── urls.py
│       │   └── tests/
│       ├── bookings/
│       ├── frontdesk/
│       ├── restaurant/
│       ├── pos/
│       │   └── consumers.py           ← WebSocket consumer for KDS
│       ├── housekeeping/
│       │   └── consumers.py           ← WebSocket consumer for room status
│       ├── billing/
│       ├── payments/
│       │   ├── esewa.py               ← eSewa gateway handler
│       │   ├── khalti.py              ← Khalti gateway handler
│       │   └── fonepay.py             ← Fonepay gateway handler
│       ├── staff/
│       ├── hr/
│       ├── payroll/
│       ├── inventory/
│       ├── crm/
│       ├── loyalty/
│       ├── analytics/
│       │   └── tasks.py               ← Celery daily aggregation tasks
│       ├── reports/
│       │   ├── pdf/                   ← WeasyPrint HTML templates
│       │   └── excel/                 ← openpyxl report builders
│       ├── notifications/
│       │   ├── sms.py                 ← Sparrow SMS integration
│       │   └── email.py
│       └── subscriptions/             ← SaaS plan management (shared app)
│
├── frontend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   ├── middleware.ts                  ← JWT auth + route protection
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx             ← Sidebar + navbar shell
│   │   │   ├── page.tsx               ← Main dashboard
│   │   │   ├── rooms/
│   │   │   ├── bookings/
│   │   │   ├── frontdesk/
│   │   │   ├── pos/
│   │   │   │   └── kds/page.tsx       ← Kitchen Display (fullscreen)
│   │   │   ├── housekeeping/
│   │   │   ├── billing/
│   │   │   ├── staff/
│   │   │   ├── inventory/
│   │   │   ├── crm/
│   │   │   ├── analytics/
│   │   │   └── superadmin/            ← SIA internal panel
│   │   └── (public)/
│   │       ├── book/page.tsx          ← Public booking widget
│   │       └── [slug]/page.tsx        ← Hotel public website
│   ├── components/
│   │   ├── ui/                        ← shadcn/ui components (auto-generated)
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Navbar.tsx
│   │   │   └── Breadcrumb.tsx
│   │   ├── dashboard/
│   │   │   ├── StatCard.tsx
│   │   │   ├── OccupancyChart.tsx
│   │   │   └── RevenueChart.tsx
│   │   └── modules/                   ← One folder per module
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts              ← Axios instance with JWT interceptor
│   │   │   ├── rooms.ts
│   │   │   ├── bookings.ts
│   │   │   ├── pos.ts
│   │   │   └── ...                    ← One file per module
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   ├── useWebSocket.ts
│   │   │   └── ...
│   │   ├── store/
│   │   │   ├── authStore.ts           ← Zustand auth state
│   │   │   └── posStore.ts            ← Zustand POS cart state
│   │   ├── types/
│   │   │   └── index.ts               ← All TypeScript interfaces
│   │   └── utils/
│   └── public/
│
├── nginx/
│   └── nginx.conf
└── .github/
    └── workflows/
        └── deploy.yml
```

---

## 5. Phase-by-Phase Implementation Plan

> **INSTRUCTION FOR ANTIGRAVITY:**
> Work through each task block completely before moving to the next.
> Every task = one focused session. Complete API + UI + tests per task.
> Reference global skills where noted. Never skip writing tests.

---

### PHASE 0 — Project Scaffolding & Dev Environment
**Duration:** Week 1 | **AI:** Antigravity (primary)

---

#### Task 0.1 — Initialize Monorepo & Docker

```
You are starting the SIA HMS project from scratch.

Reference the global `frontend-design` skill for all UI decisions throughout this project.

Create the full monorepo at `sia-hms/` with this exact structure:

BACKEND (backend/):
- Django 5 project named `config`
- Install: django, djangorestframework, django-tenants, channels, channels-redis,
  celery, redis, psycopg2-binary, djangorestframework-simplejwt, django-cors-headers,
  django-storages, boto3, weasyprint, openpyxl, pillow, python-decouple
- config/settings/base.py — all shared settings
- config/settings/development.py — DEBUG=True, sqlite fallback for local if needed
- config/settings/production.py — DEBUG=False, all env vars via python-decouple
- config/asgi.py — Django Channels ASGI config with ProtocolTypeRouter

FRONTEND (frontend/):
- Next.js 14 with App Router, TypeScript, Tailwind CSS
- Install shadcn/ui: run `npx shadcn-ui@latest init` config
- Install: axios, zustand, @tanstack/react-query, react-hook-form, zod,
  recharts, socket.io-client, date-fns, lucide-react

DOCKER (root):
- docker-compose.yml with services: db (postgres:16), redis (redis:7-alpine),
  backend (Django), celery_worker, celery_beat, frontend (Next.js), minio, nginx
- All services connected via `hms_network` bridge network
- Volumes: postgres_data, redis_data, minio_data, static_files, media_files
- .env.example with all required variables documented

Generate ALL files completely. No placeholders.
```

---

#### Task 0.2 — Multi-Tenant Setup

```
Set up django-tenants multi-tenancy in backend/apps/tenants/:

1. Create `Client` model (inherits TenantMixin):
   - Fields: name, schema_name, created_on, is_active,
     contact_email, contact_phone, subscription_plan (FK, nullable)
   - auto_create_schema = True

2. Create `Domain` model (inherits DomainMixin):
   - FK to Client

3. Update config/settings/base.py:
   - DATABASES engine = 'django_tenants.postgresql_backend'
   - DATABASE_ROUTERS = ['django_tenants.routers.TenantSyncRouter']
   - SHARED_APPS and TENANT_APPS as defined in the plan

4. config/urls.py — use TenantAwareRouter

5. Management command: backend/apps/tenants/management/commands/create_tenant.py
   - Creates Client + Domain + initial superadmin user for that tenant
   - Usage: python manage.py create_tenant --name "Hotel Paraiso"
     --schema "hotel_paraiso" --domain "paraiso" --admin-email "admin@paraiso.com"

6. Seed script: creates a `demo` tenant for local development

Write tests in apps/tenants/tests/ covering tenant creation and schema isolation.
```

---

#### Task 0.3 — Authentication & RBAC

```
In backend/apps/accounts/, implement the full auth system:

MODELS:
- Custom User model extending AbstractUser:
  - Additional fields: phone, avatar (MinIO), role, is_active
  - role choices: SUPER_ADMIN | PROPERTY_MANAGER | FRONT_DESK |
    HOUSEKEEPING | RESTAURANT_STAFF | INVENTORY_MANAGER | ACCOUNTANT

JWT CONFIG (djangorestframework-simplejwt):
- Access token: 15 minutes
- Refresh token: 7 days
- Token blacklisting enabled
- Custom claims: include role, tenant_schema, full_name

PERMISSION CLASSES (apps/accounts/permissions.py):
- IsPropertyManager(BasePermission)
- IsFrontDesk(BasePermission)
- IsHousekeeping(BasePermission)
- IsRestaurantStaff(BasePermission)
- IsInventoryManager(BasePermission)
- IsAccountant(BasePermission)
- IsSuperAdmin(BasePermission)
- Each checks request.user.role

API ENDPOINTS:
- POST /api/auth/login/          → returns access + refresh tokens
- POST /api/auth/refresh/        → refresh access token
- POST /api/auth/logout/         → blacklist refresh token
- GET  /api/auth/me/             → current user profile
- PUT  /api/auth/me/             → update profile
- POST /api/auth/change-password/

FRONTEND (frontend/app/(auth)/login/):
- Clean login page — reference global frontend-design skill
- Email + password form using react-hook-form + zod
- JWT stored in httpOnly cookies (not localStorage)
- middleware.ts — protect all /dashboard/* routes, redirect to /login if no valid token
- useAuth() hook in lib/hooks/useAuth.ts

Tests: test all endpoints for each role, test token refresh, test permission blocks.
```

---

### PHASE 1 — Property & Room Management
**Duration:** Weeks 2–3 | **AI:** Antigravity

---

#### Task 1.1 — Property & Room Models + API

```
In backend/apps/properties/, create:

MODELS:
- Property:
    name, tagline, address, city, country, phone, email, website
    logo (MinIO), cover_image (MinIO), currency (default: NPR)
    timezone (default: Asia/Kathmandu), vat_number, pan_number
    check_in_time, check_out_time, cancellation_policy, terms

- RoomType:
    property (FK), name, slug, description, max_occupancy
    base_price_per_night, weekend_price, extra_person_charge
    amenities (M2M → Amenity), is_active, display_order

- Room:
    room_type (FK), room_number, floor, status
    (available | occupied | dirty | maintenance | out_of_order)
    is_active, notes, last_cleaned_at

- Amenity: name, icon (lucide icon name), category

- RoomImage:
    room_type (FK), image (MinIO), caption, is_primary, display_order

SERIALIZERS + VIEWSETS:
- Full CRUD for all models
- RoomType serializer includes nested amenities + primary image
- Room serializer includes current reservation summary if occupied
- Filter: /api/rooms/?status=available&floor=2

PERMISSIONS:
- Property: SuperAdmin, PropertyManager can write; all roles can read
- Rooms: SuperAdmin, PropertyManager, FrontDesk can write

Write full test coverage.
```

---

#### Task 1.2 — Room Management UI

```
In frontend/app/(dashboard)/rooms/, create:

PAGES:
1. /rooms — Room overview page:
   - Top stats: Total Rooms, Available, Occupied, Dirty, Maintenance
   - Room status grid: each room as a colored card
     Green = available, Red = occupied, Amber = dirty, Grey = maintenance
   - Filter bar: by floor, room type, status
   - Click room card → opens RoomDetailSheet (shadcn Sheet component)

2. /rooms/types — Room type management:
   - Card grid of room types with photo, name, price, occupancy
   - Add/Edit room type dialog with full form
   - Image upload to MinIO via presigned URL

3. /rooms/[id] — Individual room detail:
   - Current status, current guest (if occupied), booking history table
   - Quick actions: Change Status, Assign to Housekeeping, Maintenance Note

COMPONENTS (frontend/components/modules/rooms/):
- RoomStatusGrid.tsx
- RoomCard.tsx
- RoomTypeForm.tsx
- RoomDetailSheet.tsx

Use global frontend-design skill for visual decisions.
Use shadcn/ui: Card, Badge, Sheet, Dialog, Form, Select, Tabs.
API calls in lib/api/rooms.ts.
```

---

### PHASE 2 — Booking Engine & Reservations
**Duration:** Weeks 3–5 | **AI:** Antigravity

---

#### Task 2.1 — Booking Models & Availability Engine

```
In backend/apps/bookings/, create:

MODELS:
- GuestProfile:
    first_name, last_name, email, phone, nationality
    id_type (passport | citizenship | driving_license | other)
    id_number, date_of_birth, address
    notes, dietary_restrictions, preferences
    is_blacklisted, blacklist_reason
    created_at, updated_at

- Reservation:
    guest (FK → GuestProfile), room (FK → Room)
    check_in_date, check_out_date
    adults, children, infants
    status: pending | confirmed | checked_in | checked_out | cancelled | no_show
    booking_source: direct | phone | walk_in | online | ota_booking | ota_agoda | ota_expedia
    total_nights (property), base_amount, tax_amount, discount_amount, total_amount
    deposit_paid, deposit_amount
    special_requests, internal_notes
    confirmed_at, cancelled_at, cancellation_reason
    created_by (FK → User)

- RatePlan:
    room_type (FK), name, price_per_night
    valid_from, valid_to, min_nights, is_active
    Conditions: weekend override, advance booking discount, long stay discount

AVAILABILITY ENGINE (bookings/availability.py):
- Function: get_available_rooms(check_in, check_out, adults, room_type=None)
  Returns rooms with no CONFIRMED or CHECKED_IN reservation overlapping the dates
  Uses DB-level query with date range exclusion — no Python loops
- Function: calculate_price(room_type, check_in, check_out)
  Applies rate plans, weekend pricing, extra person charge
  Returns: {base_amount, tax_amount, total_amount, nights, breakdown[]}

API ENDPOINTS:
- GET  /api/bookings/availability/?check_in=&check_out=&adults=&room_type=
- POST /api/bookings/                    → create reservation
- GET  /api/bookings/                    → list (filter by status, date range, guest)
- GET  /api/bookings/{id}/
- PUT  /api/bookings/{id}/               → update
- POST /api/bookings/{id}/confirm/       → confirm + send SMS
- POST /api/bookings/{id}/cancel/        → cancel + apply policy
- GET  /api/bookings/today/              → arrivals, departures, in-house counts

Overbooking prevention: database constraint + serializer validation.
Write tests for availability engine edge cases (back-to-back bookings, same-day).
```

---

#### Task 2.2 — Booking Calendar UI

```
In frontend/app/(dashboard)/bookings/, create:

PAGES:
1. /bookings — Default view redirects to /bookings/calendar

2. /bookings/calendar — Horizontal timeline calendar:
   - Y-axis: rooms (grouped by room type)
   - X-axis: dates (default: current week, 14 days visible)
   - Booking blocks: colored spans from check-in to check-out
     Color by status: confirmed=blue, checked_in=green, pending=amber
   - Click empty cell → open NewBookingDialog pre-filled with date + room
   - Click booking block → open BookingDetailSheet
   - Date navigation: prev/next week, jump to date picker, "Today" button
   - Keyboard: arrow keys navigate dates

3. /bookings/new — Multi-step booking form:
   Step 1 — Date & Room:
     Date range picker, adults/children selector
     Live availability check (debounced API call)
     Room cards with price and availability
   Step 2 — Guest Details:
     Search existing guests by phone/name (autocomplete)
     If new: full GuestProfile form
   Step 3 — Confirmation & Deposit:
     Price breakdown, special requests
     Optional deposit via eSewa/Khalti
     Confirm button → POST /api/bookings/

4. /bookings/[id] — Booking detail:
   Status timeline, guest info, room info, price breakdown
   Actions: Confirm, Check-in (if arriving today), Cancel, Edit
   Linked invoices and payments

COMPONENTS:
- BookingCalendar.tsx (custom canvas or CSS grid)
- BookingBlock.tsx
- NewBookingDialog.tsx
- BookingDetailSheet.tsx
- GuestSearchInput.tsx (combobox with API search)

Real-time: subscribe to bookings WebSocket channel for live calendar updates.
```

---

#### Task 2.3 — Public Booking Widget

```
In frontend/app/(public)/book/, create the embeddable booking widget:

PAGES:
- /book — Full booking flow for guests
  Must work standalone (no dashboard chrome)
  Must be embeddable as <iframe src="https://[tenant].siaenterprises.com.np/book">

FLOW:
1. Search: check-in date, check-out date, adults, children
2. Results: room type cards with photo gallery, amenities, price per night
   Add "Book Now" button per room type
3. Guest details form: name, email, phone, special requests
4. Payment: eSewa or Khalti (redirect flow)
   Show total breakdown with VAT
5. Confirmation: booking reference, summary, PDF download button
   Auto-send confirmation SMS via Sparrow SMS

DESIGN:
Use global frontend-design skill — this is guest-facing.
Must be: clean, mobile-first, fast loading, trustworthy.
Use the hotel's logo and colors from Property settings.
No authentication required for guests.

BACKEND:
- Public API endpoint (no auth): GET /api/public/availability/
- Public endpoint: POST /api/public/bookings/ → creates pending booking
- Payment webhook handlers update booking to confirmed
```

---

### PHASE 3 — Front Desk (Check-in / Check-out)
**Duration:** Week 5–6 | **AI:** Antigravity

---

#### Task 3.1 — Front Desk API

```
In backend/apps/frontdesk/, create:

MODELS:
- CheckIn:
    reservation (OneToOne FK), actual_checkin_time
    checked_in_by (FK → User), id_document_image (MinIO)
    key_issued, locker_number, notes

- CheckOut:
    reservation (OneToOne FK), actual_checkout_time
    checked_out_by (FK → User), final_amount
    additional_charges (JSON: [{description, amount}])
    payment_method, feedback_rating (1-5), feedback_comment

API ENDPOINTS:
- GET  /api/frontdesk/today/
    Returns: {
      arrivals: [reservations with check_in_date=today, status=confirmed],
      departures: [reservations with check_out_date=today, status=checked_in],
      in_house: [reservations with status=checked_in],
      occupancy_rate: float
    }

- POST /api/frontdesk/checkin/
    Validates: reservation exists, status=confirmed, check_in_date <= today
    Creates CheckIn record
    Updates Room.status = 'occupied'
    Updates Reservation.status = 'checked_in'
    Triggers SMS: "Welcome to [Hotel]! Your room is [room_number]. Enjoy your stay."

- POST /api/frontdesk/checkout/
    Validates: reservation status=checked_in
    Aggregates all POS charges linked to reservation
    Creates final Invoice
    Creates CheckOut record
    Updates Room.status = 'dirty'
    Updates Reservation.status = 'checked_out'
    Triggers HousekeepingTask creation for that room
    Triggers Loyalty points credit for guest
    Returns: {invoice_id, total_amount, checkout_summary}

- POST /api/frontdesk/walkin/
    Creates GuestProfile + Reservation + immediate CheckIn in one transaction
    Room must be available for today

Write tests for: normal checkin, early checkin, checkout with POS charges,
checkout triggers housekeeping, walk-in flow.
```

---

#### Task 3.2 — Front Desk Dashboard UI

```
In frontend/app/(dashboard)/frontdesk/, create:

PAGES:
1. /frontdesk — Today's operations hub:

   Three-column layout:
   ┌─────────────┬──────────────┬─────────────┐
   │  ARRIVALS   │   IN-HOUSE   │ DEPARTURES  │
   │  (today)    │  (all active)│  (today)    │
   └─────────────┴──────────────┴─────────────┘

   Each guest card shows:
   - Guest name, room number, nationality flag
   - Check-in/check-out time, adults/children
   - Status badge, quick action button

   Live updates via WebSocket — no manual refresh needed
   Auto-refreshes at midnight to load next day

2. Check-in Modal (triggered from arrival card):
   - Confirm guest details (view + edit GuestProfile)
   - ID capture: webcam photo or file upload
   - Room assignment (confirm or swap to available room)
   - Key/card number field
   - Balance payment if deposit was partial
   - Confirm Check-in button

3. Check-out Modal (triggered from in-house/departure card):
   - Stay summary: nights, room charges
   - POS charges: itemized list from restaurant/bar
   - Additional charges: add line items (parking, phone, damage)
   - Total with VAT breakdown
   - Payment method selection
   - Print/Email receipt toggle
   - Confirm Check-out button

4. Walk-in Quick Booking:
   - Minimal form: room selection, guest name, phone, nights
   - Creates booking + checks in immediately
   - For when guests arrive without prior booking

COMPONENTS:
- TodayDashboard.tsx
- GuestCard.tsx
- CheckInModal.tsx
- CheckOutModal.tsx
- WalkInForm.tsx
- OccupancyBar.tsx (visual occupancy indicator)

WebSocket: connect to /ws/frontdesk/ for real-time status updates.
```

---

### PHASE 4 — Restaurant POS & Kitchen Display
**Duration:** Weeks 6–8 | **AI:** Antigravity

---

#### Task 4.1 — Restaurant & POS Models

```
In backend/apps/restaurant/ and backend/apps/pos/, create:

MODELS (restaurant/):
- DiningArea: name (Main Restaurant, Pool Bar, Room Service, Terrace), is_active
- DiningTable:
    area (FK), table_number, capacity
    status: available | occupied | reserved | cleaning
    qr_code (auto-generated UUID for guest-facing menu)
- MenuCategory: name, display_order, is_active, icon
- MenuItem:
    category (FK), name, description, price, cost_price
    is_available, prep_time_minutes
    image (MinIO), is_vegetarian, is_vegan, contains_allergens

MODELS (pos/):
- Order:
    table (FK, nullable), reservation (FK, nullable — for room service)
    order_type: dine_in | takeaway | room_service | bar
    status: pending | preparing | ready | served | paid | cancelled
    created_by (FK → User), created_at, served_at, paid_at
    notes, subtotal, tax_amount, discount_amount, total_amount

- OrderItem:
    order (FK), menu_item (FK)
    quantity, unit_price, modifiers (JSON), notes
    status: pending | preparing | ready | served

- KOT (Kitchen Order Ticket):
    order (FK), station (hot_kitchen | cold_prep | bar | pastry)
    items (M2M → OrderItem), created_at, status: pending | done

WEBSOCKET CONSUMER (pos/consumers.py):
- KDSConsumer: on new Order → broadcast to kitchen channel group
  Channel groups: kds_hot_kitchen, kds_cold_prep, kds_bar
  Message: {order_id, table_number, items, created_at, elapsed_seconds}
- Broadcast on OrderItem status change

API ENDPOINTS:
- GET  /api/restaurant/tables/          → table status board
- PUT  /api/restaurant/tables/{id}/status/
- GET  /api/restaurant/menu/            → full menu tree (categories + items)
- POST /api/pos/orders/                 → create order
- GET  /api/pos/orders/active/          → all non-paid orders
- POST /api/pos/orders/{id}/items/      → add item to existing order
- PUT  /api/pos/orders/{id}/items/{item_id}/  → update item
- POST /api/pos/orders/{id}/pay/        → payment + close order
- POST /api/pos/orders/{id}/void/       → void with reason (manager only)
- GET  /api/pos/kds/{station}/          → KDS orders for a station

Write tests for: order creation, item addition, room charge linking, KDS fanout.
```

---

#### Task 4.2 — POS Interface

```
In frontend/app/(dashboard)/pos/, create:

PAGES:
1. /pos — Main POS interface:

   Two-panel layout (optimized for tablet):
   ┌──────────────────────┬──────────────────┐
   │   MENU PANEL         │   ORDER PANEL    │
   │                      │                  │
   │  [Category tabs]     │  Table: #4       │
   │                      │  ─────────────   │
   │  [Item grid]         │  2x Burger  400  │
   │  Large touch targets │  1x Coke     80  │
   │  Item image          │  ─────────────   │
   │  Name + price        │  Subtotal:  480  │
   │                      │  VAT (13%):  62  │
   │                      │  Total:     542  │
   │                      │                  │
   │                      │  [Pay] [Hold]    │
   └──────────────────────┴──────────────────┘

   Features:
   - Category tabs at top of menu panel
   - Search bar for items
   - Item modifier dialog on add (quantity, notes, variants)
   - Swipe to delete order item
   - Hold & Fire: save order without sending to kitchen
   - Charge to Room: links order to active reservation

2. /pos/tables — Table map view:
   Visual grid of all tables colored by status
   Click occupied table → loads that table's order in POS
   Click available table → starts new order for that table

3. /pos/kds — Kitchen Display Screen:
   Fullscreen mode, designed for large screen/TV
   Order cards sorted oldest-first (top-left)
   Card colors: green (< 10min), yellow (10-20min), red (> 20min)
   Large font — readable from 3 meters
   One-tap "DONE" button on each item
   Station filter: All / Hot Kitchen / Cold Prep / Bar
   Receives orders via WebSocket — zero polling
   Use global frontend-design skill: high-contrast, minimal chrome

COMPONENTS:
- MenuPanel.tsx, MenuCategoryTabs.tsx, MenuItemCard.tsx
- OrderPanel.tsx, OrderItemRow.tsx, PaymentModal.tsx
- TableMap.tsx, TableCard.tsx
- KDSScreen.tsx, KDSOrderCard.tsx, KDSTimer.tsx

State: Zustand posStore for cart, selected table, current order.
WebSocket: useWebSocket hook connects to /ws/kds/{station}/.
```

---

#### Task 4.3 — Bill Integration & Restaurant Reports

```
Implement charge-to-room and restaurant financial reporting:

CHARGE TO ROOM:
- POS PaymentModal includes "Charge to Room" option
- Shows list of currently checked-in guests with room numbers
- Selecting a guest links Order → Reservation
- On hotel checkout, all linked POS orders auto-appear in hotel invoice
- Room service orders: created directly from reservation without table

RESTAURANT INVOICE (standalone):
- For non-hotel dining guests who pay directly at restaurant
- POST /api/pos/orders/{id}/pay/ with payment_method=cash|esewa|khalti
- Generate PDF receipt using global pdf skill (WeasyPrint)
  Template: backend/apps/reports/pdf/restaurant_receipt.html
  Include: order items, tax breakdown, payment method, QR code for reorder

DAILY RESTAURANT REPORT:
- Endpoint: GET /api/analytics/restaurant/daily/?date=
  Returns: total_covers, total_revenue, avg_spend, top_items[], revenue_by_area[]
- Excel export using global xlsx skill (openpyxl)
  Sheet 1: Summary, Sheet 2: Item breakdown, Sheet 3: Hourly sales
- Celery task runs at 23:59 to pre-aggregate daily metrics
```

---

### PHASE 5 — Housekeeping & Inventory
**Duration:** Weeks 8–10 | **AI:** KiloCode / OpenCode

> ⚠️ **QUOTA HANDOFF POINT** — At Phase 5, switch to KiloCode or OpenCode.
> Use the AI Handoff Prompt in Section 7 before switching.

---

#### Task 5.1 — Housekeeping Module

```
In backend/apps/housekeeping/, create:

MODELS:
- HousekeepingTask:
    room (FK), assigned_to (FK → User, nullable)
    task_type: clean | deep_clean | turndown | maintenance | inspection
    status: pending | in_progress | done | skipped | issue_reported
    priority: low | normal | high | urgent
    triggered_by: checkout | manual | scheduled | maintenance_request
    notes, issue_description, completion_photo (MinIO)
    created_at, started_at, completed_at, due_by

- MaintenanceRequest:
    room (FK), reported_by (FK), description
    category: plumbing | electrical | furniture | ac | other
    status: open | in_progress | resolved
    resolved_by (FK), resolution_notes

AUTO-TRIGGER:
- Signal on CheckOut → auto-create HousekeepingTask (type=clean, priority=high)
- Auto-assign to housekeeping staff based on floor assignment (configurable)

WEBSOCKET (housekeeping/consumers.py):
- HousekeepingConsumer: broadcasts room status changes
- Channel group: housekeeping_floor_{floor_number}

API ENDPOINTS:
- GET  /api/housekeeping/tasks/?date=&status=&assigned_to=
- POST /api/housekeeping/tasks/             → create manual task
- PUT  /api/housekeeping/tasks/{id}/status/ → update status
- POST /api/housekeeping/tasks/{id}/complete/ → complete with optional photo
- GET  /api/housekeeping/board/             → all rooms + current task status
- POST /api/housekeeping/maintenance/       → report maintenance issue

FRONTEND (/housekeeping/):
- Manager View: room status board (same visual as room grid but shows task status)
  Filter: by floor, by staff, by status
  Bulk assign: select multiple rooms → assign to staff member
- Staff Mobile View: /housekeeping/my-tasks/
  Optimized for phone: large cards, single-tap actions
  "Start Cleaning", "Done", "Report Issue" buttons
  Optional photo capture on completion
```

---

#### Task 5.2 — Inventory Management

```
In backend/apps/inventory/, create:

MODELS:
- Category: name, parent (self FK for subcategories)
- InventoryItem:
    category (FK), name, sku, unit (kg | litre | piece | box | dozen)
    current_stock (Decimal), reorder_level, max_stock
    cost_price, last_purchase_price
    is_perishable, expiry_tracking

- Supplier:
    name, contact_person, phone, email, address
    payment_terms, rating

- PurchaseOrder:
    supplier (FK), status: draft | sent | partial | fulfilled | cancelled
    expected_date, notes, total_amount
    items (via POItem)

- POItem: po (FK), item (FK → InventoryItem), quantity, unit_price, received_qty

- StockMovement:
    item (FK), movement_type: purchase_in | manual_in | recipe_out | manual_out | waste | adjustment
    quantity, unit_cost, reference_id (PO id or Order id), notes
    created_by (FK), created_at

- Recipe:
    menu_item (FK → MenuItem), ingredient (FK → InventoryItem)
    quantity_per_serving (Decimal), unit

AUTO-DEDUCTION:
- Signal on Order status → 'served': for each OrderItem, deduct Recipe quantities from stock
  Creates StockMovement (type=recipe_out, reference_id=order_id)
- Celery task: daily check for items below reorder_level
  Sends SMS via Sparrow SMS to PropertyManager

API ENDPOINTS:
- GET/POST     /api/inventory/items/
- PUT          /api/inventory/items/{id}/
- POST         /api/inventory/items/{id}/adjust/  → manual stock adjustment
- GET/POST     /api/inventory/suppliers/
- GET/POST     /api/inventory/purchase-orders/
- POST         /api/inventory/purchase-orders/{id}/receive/  → GRN
- GET          /api/inventory/movements/?item=&from=&to=
- GET          /api/inventory/low-stock/
- GET          /api/inventory/valuation/          → current stock value

FRONTEND (/inventory/):
- Dashboard: low stock alerts banner, stock value summary, recent movements
- Items list: searchable, filterable, inline stock update
- Purchase Orders: create PO, send to supplier (email), mark received (GRN)
- Excel export: stock report using global xlsx skill
```

---

### PHASE 6 — Staff, HR & Payroll
**Duration:** Weeks 10–12 | **AI:** KiloCode / OpenCode

---

#### Task 6.1 — Staff Profiles & Attendance

```
In backend/apps/staff/ and backend/apps/hr/, create:

MODELS (staff/):
- Department: name, head (FK → StaffMember, nullable)
- StaffMember:
    user (OneToOne FK → User), department (FK)
    designation, hire_date, employment_type: full_time | part_time | contract
    base_salary, salary_type: monthly | hourly
    bank_name, bank_account_number
    emergency_contact_name, emergency_contact_phone
    profile_photo (MinIO), is_active

- StaffDocument:
    staff (FK), document_type: citizenship | passport | contract | certificate | other
    file (MinIO), expiry_date, notes

MODELS (hr/):
- Shift:
    staff (FK), date, start_time, end_time, department (FK)
    is_confirmed, notes

- Attendance:
    staff (FK), date
    clock_in, clock_out, status: present | absent | half_day | leave | holiday | weekend
    clock_in_by (FK, if manager logs it), overtime_hours, notes

- LeaveType: name, days_per_year, is_paid, carry_forward_limit
- LeaveBalance: staff (FK), leave_type (FK), year, total, used, remaining
- LeaveRequest:
    staff (FK), leave_type (FK), start_date, end_date, days
    reason, status: pending | approved | rejected
    approved_by (FK), approved_at, rejection_reason

API ENDPOINTS:
- CRUD /api/staff/members/
- POST /api/staff/members/{id}/documents/
- GET  /api/hr/schedule/?week=&department=
- POST /api/hr/schedule/                        → create shift
- POST /api/hr/attendance/clock-in/             → clock in (requires PIN)
- POST /api/hr/attendance/clock-out/
- GET  /api/hr/attendance/?staff=&month=&year=
- CRUD /api/hr/leave-requests/
- PUT  /api/hr/leave-requests/{id}/approve/
- GET  /api/hr/leave-balance/{staff_id}/

FRONTEND (/staff/):
- Staff directory: searchable cards with photo, name, role, department
- Staff profile: full details, documents, attendance history, leave balance
- /staff/schedule/ — weekly drag-drop shift builder
  Rows: staff members, Columns: days of week
  Drag to assign shifts, click to edit
- /staff/attendance/ — monthly grid view per staff
  Color-coded: present=green, absent=red, leave=blue, holiday=grey
  Export to Excel using global xlsx skill
```

---

#### Task 6.2 — Payroll Processing

```
In backend/apps/payroll/, create:

MODELS:
- PayrollPeriod: month, year, status: draft | processing | approved | paid
- PayrollEntry:
    period (FK), staff (FK → StaffMember)
    working_days, present_days, absent_days, leave_days
    basic_salary, overtime_hours, overtime_rate, overtime_amount
    allowances (JSON: [{name, amount}])
    deductions (JSON: [{name, amount}])
    ssf_employee, ssf_employer, income_tax
    gross_salary, total_deductions, net_salary
    is_approved, approved_by (FK), notes

PAYROLL CALCULATION (payroll/calculator.py):
- Function: calculate_payroll(staff_member, period):
    1. Fetch attendance records for the month
    2. Calculate working days, absences, leaves
    3. Pro-rate salary if any absent days
    4. Calculate overtime: hours > 8/day × 1.5× hourly rate
    5. Apply SSF: 11% employee + 20% employer (Nepal SSF rules)
    6. Calculate income tax per Nepal tax brackets
    7. Return PayrollEntry (not saved — caller saves after review)

- Celery task: bulk_calculate_payroll(period_id) — process all active staff
  Runs as background job, sends notification when complete

PAYSLIP PDF (using global pdf skill):
- WeasyPrint template: backend/apps/reports/pdf/payslip.html
- Include: company letterhead, staff details, earnings table, deductions table,
  net pay, QR code (encodes: staff_id, period, net_pay for verification)
- API: GET /api/payroll/entries/{id}/payslip/ → streams PDF

API ENDPOINTS:
- GET/POST  /api/payroll/periods/
- POST      /api/payroll/periods/{id}/calculate/  → trigger bulk calculation
- GET       /api/payroll/entries/?period=
- PUT       /api/payroll/entries/{id}/             → manual adjustments
- POST      /api/payroll/periods/{id}/approve/
- GET       /api/payroll/entries/{id}/payslip/

FRONTEND (/staff/payroll/):
- Payroll period list with status badges
- Run payroll: select period → confirm → Celery job → loading state → results
- Payroll entries table: all staff, calculated amounts, edit individual entries
- Approve payroll button (PropertyManager only)
- Bulk download all payslips as ZIP
```

---

### PHASE 7 — Billing, Payments & CRM
**Duration:** Weeks 12–14 | **AI:** KiloCode / OpenCode

---

#### Task 7.1 — Billing Engine

```
In backend/apps/billing/, create:

MODELS:
- Invoice:
    invoice_number (auto: SIA-2025-0001 format), invoice_type: hotel | restaurant | mixed
    reservation (FK, nullable), walk_in_guest_name, walk_in_guest_phone
    issued_at, due_date, status: draft | issued | partially_paid | paid | void
    subtotal, discount_amount, discount_reason
    tax_rate (default 13%), tax_amount
    service_charge_rate (default 10%), service_charge_amount
    total_amount, paid_amount, balance_due
    notes, is_irdbill (bool)

- InvoiceItem:
    invoice (FK), description, quantity, unit_price, tax_rate, amount
    item_type: room_charge | pos_charge | extra_charge | discount

- Payment:
    invoice (FK), amount, payment_method: cash | esewa | khalti | fonepay | bank_transfer | credit
    paid_at, reference_number, notes, received_by (FK → User)

AUTO-GENERATION:
- On checkout: aggregate all charges → generate Invoice automatically
  Room charges: nights × rate (per RatePlan)
  POS charges: all Orders linked to reservation
  Extra charges: from CheckOut.additional_charges

IRD COMPLIANCE:
- Invoice PDF must include: Hotel PAN number, fiscal year (e.g., 2081/82)
  VAT registration number, itemized tax lines
  Use WeasyPrint with global pdf skill
  Template: backend/apps/reports/pdf/invoice.html

API ENDPOINTS:
- GET  /api/billing/invoices/
- GET  /api/billing/invoices/{id}/
- POST /api/billing/invoices/{id}/payments/   → record payment
- GET  /api/billing/invoices/{id}/pdf/        → stream PDF
- POST /api/billing/invoices/{id}/void/       → void invoice (manager only)
- GET  /api/billing/daily-summary/?date=      → daily revenue summary
```

---

#### Task 7.2 — Nepal Payment Gateways

```
In backend/apps/payments/, implement:

ESEWA (payments/esewa.py):
- initiate_payment(amount, invoice_id, success_url, failure_url)
  Returns: {form_url, form_data} — frontend POSTs to eSewa
- verify_payment(response_data) → validates signature with eSewa secret
- Webhook handler: POST /api/payments/esewa/webhook/
- Test mode: ESEWA_SANDBOX=True in settings

KHALTI (payments/khalti.py):
- Khalti API v2 (Payment Initiation + Verification)
- initiate_payment(amount, invoice_id) → returns {pidx, payment_url}
- verify_payment(pidx) → GET /api/khalti-verify/ after redirect
- Webhook handler: POST /api/payments/khalti/webhook/
- Test mode: KHALTI_SECRET_KEY = test key

FONEPAY (payments/fonepay.py):
- QR payment flow
- generate_qr(amount, invoice_id) → returns QR image URL
- check_status(transaction_id) → poll payment status
- Webhook handler: POST /api/payments/fonepay/webhook/

SHARED:
- PaymentTransaction model: gateway, amount, status, gateway_ref, raw_response (JSON)
- All webhooks: verify signature, update Invoice.paid_amount, create Payment record
  If fully paid: update Invoice.status = 'paid', trigger confirmation SMS

FRONTEND (payment modal component):
- Show 3 gateway cards: eSewa | Khalti | Fonepay + Cash
- eSewa: submit hidden form → redirect → return to success/failure page
- Khalti: redirect to payment_url → verify on return
- Fonepay: show QR code, poll status every 5s until paid
- Cash: confirm amount, record manually
```

---

#### Task 7.3 — CRM & Loyalty

```
In backend/apps/crm/ and backend/apps/loyalty/, create:

GUEST INTELLIGENCE:
- GuestProfile already created in bookings/ — extend with:
    total_stays, total_nights, total_spend (computed properties)
    last_stay_date (property), average_spend_per_visit (property)
    preferred_room_type (from booking history)
    tags (M2M): vip | corporate | regular | problematic | group

- GuestActivity log: guest (FK), activity_type, description, created_at

LOYALTY ENGINE (loyalty/):
- LoyaltyAccount: guest (FK), points_balance, tier, tier_updated_at
  Tiers: Bronze (0-999pts) | Silver (1000-4999) | Gold (5000-14999) | Platinum (15000+)
  Tier benefits: configurable per property (discount %, room upgrade, free breakfast)

- PointTransaction:
    account (FK), transaction_type: earn | redeem | expire | bonus | adjustment
    points, balance_after, reference (invoice id), notes, created_at

- Earn Rule (configurable): X points per NPR Y spent (default: 1 point per NPR 100)
- Redeem Rule: X points = NPR Y discount (default: 100 points = NPR 50)

AUTO-EARN:
- Signal on Invoice status → 'paid': calculate points, create PointTransaction
  Also check tier upgrade

CAMPAIGNS:
- Campaign model: name, type (birthday | anniversary | winback | promotion)
  message_template, send_at (scheduled), target_segment (JSON filter), status
- Celery Beat: daily check for birthday/anniversary guests → queue SMS
- Winback: guests not visited in > 60 days → send offer SMS
- Uses Sparrow SMS API for delivery

API ENDPOINTS:
- GET  /api/crm/guests/                      → list + search
- GET  /api/crm/guests/{id}/                 → full profile with history
- GET  /api/crm/guests/{id}/loyalty/         → loyalty account + transactions
- POST /api/crm/guests/{id}/loyalty/redeem/  → apply points redemption
- GET  /api/crm/campaigns/
- POST /api/crm/campaigns/                   → create campaign
- POST /api/crm/campaigns/{id}/send/         → trigger send

FRONTEND (/crm/):
- Guest list with: photo placeholder, name, nationality, visits, total spend, tier badge
- Guest profile: complete history, preferences, loyalty card view, notes
- Loyalty dashboard: points balance, tier progress bar, transaction history
- Campaign builder: segment selector, message template, preview, schedule
```

---

### PHASE 8 — Analytics & Reporting
**Duration:** Weeks 14–15 | **AI:** OpenCode / KiloCode

---

#### Task 8.1 — Analytics Backend

```
In backend/apps/analytics/, create:

DAILY AGGREGATION (analytics/tasks.py — Celery task, runs 23:59 daily):
- Function: aggregate_daily_metrics(date, property_id):
  Calculates and saves DailyMetric:
    - total_revenue: sum of all paid invoice amounts
    - room_revenue: room charge items only
    - restaurant_revenue: POS charges only
    - other_revenue: extras
    - occupied_rooms: count of checked_in reservations
    - total_rooms: count of active rooms
    - occupancy_rate: occupied / total × 100
    - adr (average daily rate): room_revenue / occupied_rooms
    - revpar: total_revenue / total_rooms
    - total_guests: sum of adults + children for checked_in
    - new_guests: guests with first visit today
    - restaurant_covers: count of served POS orders
    - avg_restaurant_spend: restaurant_revenue / covers

- DailyMetric model stores all above fields

API ENDPOINTS:
- GET /api/analytics/dashboard/
    Returns last 30 days summary + today snapshot
    Used for main dashboard KPI cards

- GET /api/analytics/revenue/?start=&end=&groupby=day|week|month
    Returns revenue timeseries data for charts

- GET /api/analytics/occupancy/?start=&end=
    Returns occupancy % per day + per room type

- GET /api/analytics/top-items/?start=&end=&limit=10
    Top selling menu items by revenue

- GET /api/analytics/guest-sources/?start=&end=
    Bookings by source (direct, OTA, walk-in, phone)

- GET /api/analytics/reports/generate/
    Params: report_type, start_date, end_date, format (pdf|excel)
    Triggers Celery task → returns task_id
    Poll: GET /api/analytics/reports/status/{task_id}/
    Download: GET /api/analytics/reports/download/{task_id}/
```

---

#### Task 8.2 — Analytics Dashboard UI

```
In frontend/app/(dashboard)/analytics/, create:

MAIN DASHBOARD (/analytics/):
- Date range picker (presets: Today, This Week, This Month, Last Month, Custom)
- KPI Cards row: Occupancy %, ADR, RevPAR, Total Revenue, Total Guests
  Each card: current value, vs previous period (% change, trend arrow)
- Revenue chart: BarChart (Recharts) — daily revenue stacked (rooms + restaurant + other)
- Occupancy heatmap: calendar grid, each day colored by occupancy %
  Low=light blue, High=dark blue, Full=navy
- Booking sources: PieChart — direct vs phone vs OTA vs walk-in
- Top menu items: horizontal BarChart — top 10 by revenue

REPORTS PAGE (/analytics/reports/):
Available reports (with download buttons):
- Daily Revenue Report (PDF + Excel)
- Occupancy Report (PDF + Excel)
- Guest Ledger / Folio (PDF)
- Staff Attendance Summary (Excel)
- Inventory Consumption Report (Excel)
- P&L Summary (Excel)
- Nepal Tax / VAT Report (PDF — IRD format)
- Payroll Summary (PDF + Excel)

UI flow:
- Select report → pick date range → choose format → Generate
- Shows loading spinner while Celery task runs (poll task status)
- Download button appears when ready
- Last 10 generated reports listed for re-download

Use global xlsx skill and pdf skill for all report generation.
Use global frontend-design skill for chart aesthetics.
```

---

### PHASE 9 — SaaS Subscriptions & Super Admin
**Duration:** Weeks 15–17 | **AI:** Antigravity

---

#### Task 9.1 — Subscription & Feature Gating

```
In backend/apps/subscriptions/ (SHARED app — public schema), create:

MODELS:
- SubscriptionPlan:
    name, slug, price_monthly (NPR), price_yearly (NPR)
    max_rooms, max_staff_users, max_restaurants
    features (JSON list of feature keys)
    is_active, is_public (visible on pricing page)
    Plans:
      starter:      NPR 3,000/mo  — 10 rooms, 5 users, basic features
      professional: NPR 6,000/mo  — 30 rooms, 20 users, all core features
      enterprise:   NPR 12,000/mo — unlimited, all features including payroll, CRM

- TenantSubscription:
    tenant (FK → Client), plan (FK → SubscriptionPlan)
    status: trial | active | past_due | cancelled | suspended
    trial_ends_at, current_period_start, current_period_end
    next_billing_date, cancelled_at

- SubscriptionInvoice:
    tenant (FK), plan (FK), amount, period_start, period_end
    status: pending | paid | failed, paid_at, payment_ref

FEATURE GATING (subscriptions/permissions.py):
- FeaturePermission base class: checks tenant subscription for feature key
- Specific classes: HasPayrollFeature, HasCRMFeature, HasAdvancedAnalytics
- Apply to ViewSets: @permission_classes([IsAuthenticated, HasPayrollFeature])
- Frontend: check features from /api/auth/me/ response, hide nav items for locked features
  Show upgrade prompt if user tries to access locked feature

CELERY BEAT TASKS:
- Daily: check subscriptions ending in 3 days → send renewal reminder SMS
- Daily: check past_due subscriptions > 7 days → suspend tenant (read-only mode)
- Monthly: generate subscription invoices for all active tenants
```

---

#### Task 9.2 — Super Admin Panel

```
In frontend/app/(dashboard)/superadmin/ (SIA internal only — SuperAdmin role):

PAGES:
1. /superadmin — SIA operations dashboard:
   MRR (Monthly Recurring Revenue), active tenants, trial tenants
   New signups this month, churn this month
   Revenue chart: MRR over last 12 months

2. /superadmin/tenants — All hotel clients:
   Table: name, plan, status, rooms, since, MRR contribution
   Actions: View, Upgrade/Downgrade plan, Suspend, Impersonate

3. /superadmin/tenants/new — Onboard new client:
   Form: hotel name, schema name, domain, admin email, plan selection
   On submit: POST /api/admin/tenants/ → creates Client + schema + admin user
   Sends welcome email with login credentials

4. /superadmin/tenants/[id] — Tenant detail:
   Subscription history, invoice list, support notes
   Impersonate button: logs SIA admin into that tenant's system
   (Sets tenant context in session, shows banner "Viewing as [Hotel Name]")

5. /superadmin/subscriptions — Plan management:
   Edit plan features, prices, limits
   See which tenants are on each plan

BACKEND:
- All superadmin endpoints: /api/admin/* — SuperAdmin role only
- POST /api/admin/tenants/ → create tenant + run migrations for new schema
- POST /api/admin/tenants/{id}/impersonate/ → returns scoped JWT for that tenant
- GET  /api/admin/metrics/ → MRR, churn, growth metrics
```

---

## 6. Database Schema Decisions

### Multi-tenant Isolation

```python
# Django ORM automatically uses the correct schema per request
# NEVER use raw SQL — always use Django ORM

# Correct way (ORM handles schema):
reservations = Reservation.objects.filter(check_in_date=today)

# NEVER do this (bypasses tenant isolation):
cursor.execute("SELECT * FROM bookings_reservation WHERE ...")
```

### Critical Indexes

Add to every model's `Meta` class:

```python
# Reservation — availability queries
class Meta:
    indexes = [
        models.Index(fields=['room', 'check_in_date', 'check_out_date']),
        models.Index(fields=['status', 'check_in_date']),
        models.Index(fields=['guest', '-created_at']),
    ]

# Invoice — financial queries
class Meta:
    indexes = [
        models.Index(fields=['status', 'issued_at']),
        models.Index(fields=['reservation', 'status']),
    ]

# DailyMetric — analytics
class Meta:
    indexes = [
        models.Index(fields=['date', 'property']),
    ]

# Order — POS queries
class Meta:
    indexes = [
        models.Index(fields=['status', 'created_at']),
        models.Index(fields=['table', 'status']),
    ]
```

### Coding Standards (ALWAYS follow)

```
DJANGO:
- Models in models.py, serializers in serializers.py, views in views.py
- URLs in urls.py, tests in tests/ directory
- Never skip writing tests — minimum 80% coverage per app
- Use select_related() and prefetch_related() — no N+1 queries
- All money fields: DecimalField(max_digits=10, decimal_places=2)
- All images/files: stored in MinIO via django-storages with boto3
- Error response format (always): {"error": "message", "code": "ERROR_CODE", "detail": {}}

NEXT.JS:
- Server Components by default — use 'use client' only when needed
- Never use localStorage for auth tokens — httpOnly cookies only
- API calls only in lib/api/*.ts files — never fetch directly in components
- All forms: react-hook-form + zod validation
- TypeScript strict mode — no 'any' types anywhere
- shadcn/ui for ALL UI components — never write raw HTML forms or tables
- Loading states and error boundaries on every data-fetching component

GENERAL:
- Environment variables: never hardcode secrets, always use .env + python-decouple
- Never commit .env files — only .env.example with placeholder values
- Every PR must pass: tests, type check, linting
```

---

## 7. AI Handoff Prompt

**WHEN TO USE:** When Antigravity quota is exhausted mid-session.
**HOW:** Copy everything below the line. Paste as FIRST message in KiloCode or OpenCode. Fill in the 3 fields marked with `→`.

---

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI HANDOFF — SIA Enterprises Hotel Management System
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You are continuing development of the SIA Enterprises Hotel Management
System (HMS) — a full-stack SaaS for hotel/villa management built for Nepal.

CURRENT PROGRESS:
→ [Fill in: e.g. "Phase 3 complete. Starting Phase 4, Task 4.1"]

LAST FILE WORKED ON:
→ [Fill in: e.g. "backend/apps/frontdesk/views.py — checkout endpoint done"]

NEXT TASK:
→ [Fill in: paste the exact task block from the plan above]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TECH STACK:
- Backend: Django 5 + Django REST Framework + django-tenants
- Async: Django Channels (WebSocket) + Celery + Redis
- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- Database: PostgreSQL 16, schema-per-tenant isolation via django-tenants
- Storage: MinIO (S3-compatible, self-hosted)
- SMS: Sparrow SMS API (Nepal)
- Payments: eSewa API + Khalti API v2 + Fonepay

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CODING STANDARDS (follow exactly):

Django:
- Models in models.py, serializers in serializers.py, views in views.py
- Always write tests in tests/ directory — never skip
- Use Django ORM only — no raw SQL (breaks tenant isolation)
- All money: DecimalField(max_digits=10, decimal_places=2)
- Files/images: MinIO via django-storages
- Error format: {"error": "message", "code": "ERROR_CODE", "detail": {}}

Next.js:
- Server Components by default, 'use client' only when needed
- httpOnly cookies for JWT — never localStorage
- API calls only in lib/api/*.ts with axios JWT interceptor
- All forms: react-hook-form + zod
- TypeScript strict mode — no 'any'
- All UI: shadcn/ui components only

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GLOBAL SKILLS AVAILABLE (use these, don't reinvent):
- frontend-design → visual design principles for all UI work
- pdf skill       → use WeasyPrint for invoices, payslips, reports
- xlsx skill      → use openpyxl for Excel report generation
- docx skill      → Word document generation if needed
- pptx skill      → Presentation generation if needed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MULTI-TENANCY RULES:
- Each hotel = one PostgreSQL schema
- django-tenants handles routing per subdomain
- Shared apps (public schema): accounts, subscriptions
- Tenant apps (per hotel schema): everything else
- ALWAYS use Django ORM — never raw SQL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROGRESS FILE:
Always update PROGRESS.md in repo root after each task.
Format:
  ## [Date] — Phase X, Task X.X
  ✅ Completed: [what was done]
  🔧 In Progress: [current state]
  ⚠️ Issues: [any blockers]
  📋 Next: [next task]

Please ask me for any files you need to see before continuing.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 8. Quota Management Strategy

### Three-Model Rotation

| Tool | Best Used For | Use In |
|---|---|---|
| **Antigravity** (Claude Sonnet) | Architecture, complex multi-file logic, schema design, auth, WebSocket, SaaS layer | Phases 0, 1, 2, 3, 4, 9 |
| **KiloCode** | Repetitive CRUD modules, models/serializers/views that follow established patterns | Phases 5, 6, 7 |
| **OpenCode** | Frontend pages, shadcn/ui components, styling, simple list/detail pages | Phase 8, frontend polish |

### Quota-Saving Techniques

1. **Pattern reuse** — After writing the first full model/serializer/view, say:
   *"Follow the exact same pattern from `apps/bookings/` to create `apps/housekeeping/`"*

2. **Batch generation** — Instead of one model at a time:
   *"Generate all 5 models for the inventory app in one response"*

3. **Frontend cloning** — After first CRUD page:
   *"Clone the /rooms page pattern (table + filters + detail sheet) for /inventory/items/ and /inventory/suppliers/"*

4. **Context attachment** — Always attach existing files:
   *"Here is `bookings/views.py` — follow the same ViewSet structure for `frontdesk/views.py`"*

5. **TODO batching** — Leave placeholders, batch later:
   ```python
   def calculate_payroll(staff, period):
       # TODO: AI — implement Nepal SSF and income tax calculation
       pass
   ```
   Then: *"Implement all TODO functions in payroll/calculator.py"*

### End-of-Session Checklist

Before quota runs out, do these in order:

- [ ] Commit all generated files: `git add -A && git commit -m "Phase X: Task X.X complete"`
- [ ] Update `/PROGRESS.md` with current state
- [ ] Note exact file + function you were working on
- [ ] List any failing tests or open issues
- [ ] Fill in the Handoff Prompt (Section 7) — ready to paste into next AI

---

## 9. Testing Strategy

### Backend Tests (always generate with every app)

```
tests/
├── test_models.py           → field validation, __str__, computed properties
├── test_serializers.py      → required fields, validation, nested data
├── test_views.py            → all endpoints: status codes, response shape, auth
├── test_permissions.py      → each role: what they can/cannot access
└── test_business_logic.py   → availability engine, billing calc, payroll
```

**Prompt to include in every backend task:**
```
Write pytest tests for everything you generate.
Use APIClient from rest_framework.test.
Use model_bakery (baker.make()) for test fixtures — no manual model creation.
Test each user role separately for permission-sensitive endpoints.
Minimum: happy path + auth failure + validation error for each endpoint.
```

### Frontend Tests

```
__tests__/
├── components/BookingCalendar.test.tsx
├── components/POSInterface.test.tsx
└── lib/api/bookings.test.ts
```

**Prompt to include in every frontend task:**
```
Write Vitest + React Testing Library tests for all components.
Test: renders without crash, key user interactions, error states.
Mock API calls using msw (Mock Service Worker).
```

---

## 10. Deployment Plan

### Environments

| Environment | Server | Trigger | URL |
|---|---|---|---|
| Local Dev | Docker Compose (laptop) | Manual | localhost:3000 |
| Staging | SIA VPS | Push to `staging` branch | staging.siaenterprises.com.np |
| Production | SIA VPS | Merge to `main` + approval | *.siaenterprises.com.np |

### CI/CD — GitHub Actions Prompt

```
Generate .github/workflows/deploy.yml:

ON PUSH TO main:
1. Backend CI:
   - python -m pytest backend/ --cov=apps --cov-fail-under=70
   - Fail if any test fails

2. Frontend CI:
   - cd frontend && npx tsc --noEmit
   - Fail if type errors

3. Deploy (only if both CI pass):
   - SSH into production VPS
   - Run /opt/sia-hms/deploy.sh

deploy.sh content:
  cd /opt/sia-hms
  git pull origin main
  docker-compose -f docker-compose.prod.yml up --build -d backend celery_worker celery_beat
  docker-compose exec backend python manage.py migrate --no-input
  docker-compose exec backend python manage.py collectstatic --no-input
  docker-compose restart nginx
  # Send WhatsApp notification via Sparrow SMS: "HMS deployed ✅"

ON PUSH TO staging:
  Same CI checks
  Deploy to staging server only
```

### Production Server Setup Prompt

```
Generate complete server setup script for Ubuntu 22.04 VPS:

1. System packages: nginx, certbot, docker, docker-compose, git, fail2ban, ufw
2. UFW rules: allow 22 (SSH), 80 (HTTP), 443 (HTTPS) only
3. SSH hardening: disable password auth, key-only
4. Certbot: wildcard SSL for *.siaenterprises.com.np
5. Nginx config: subdomain routing to Next.js (3000) and Django API (8000)
   Each tenant subdomain → same Next.js app (tenant resolved by Django)
6. Fail2ban: protect SSH and nginx
7. Cron: daily certbot renewal check
8. Cron: daily pg_dump backup → encrypted → stored in /backups/
9. Netdata install for server monitoring
```

---

## 11. Global Skills Reference

> These skills are available globally in Antigravity. Reference them explicitly in your prompts.

| Skill | When to Use | How to Reference in Prompt |
|---|---|---|
| `frontend-design` | Any UI/UX work — layouts, color, typography | *"Use the global frontend-design skill for visual decisions on this page"* |
| `pdf` (WeasyPrint) | Invoices, payslips, reports, receipts | *"Use the global pdf skill — generate WeasyPrint HTML template for this"* |
| `xlsx` (openpyxl) | Excel exports, financial reports, attendance | *"Use the global xlsx skill — generate openpyxl code for this Excel report"* |
| `docx` | Word document generation | *"Use the global docx skill for this document"* |
| `pptx` | Presentations | *"Use the global pptx skill"* |
| `file-reading` | Reading uploaded files | *"Use the global file-reading skill to parse this file"* |

---

## 12. Master Timeline

| Phase | Module | Weeks | AI Tool | Status |
|---|---|---|---|---|
| 0 | Scaffolding, Auth, Multi-tenant | 1 | Antigravity | ✅ Complete |
| 1 | Property & Room Management | 2–3 | Antigravity | ✅ Complete |
| 2 | Booking Engine + Public Widget | 3–5 | Antigravity | ✅ Complete |
| 3 | Front Desk — Check-in/out | 5–6 | Antigravity | ✅ Complete |
| 4 | Restaurant POS + KDS | 6–8 | Antigravity | ✅ Complete |
| 5 | Housekeeping + Inventory | 8–10 | KiloCode | ✅ Complete |
| 6 | Staff, HR, Payroll | 10–12 | KiloCode | ✅ Complete |
| 7 | Billing, Payments, CRM | 12–14 | KiloCode | ✅ Complete |
| 8 | Analytics & Reports | 14–15 | OpenCode | 🔄 In progress |
| 9 | SaaS Subscriptions + Super Admin | 15–17 | Antigravity | ⬜ Not started |
| — | UAT + Bug Fixes | 17–19 | All | ⬜ Not started |
| — | Client Onboarding + Training | 19–20 | — | ⬜ Not started |
| — | Buffer / Polish | 20–22 | — | ⬜ Not started |

> Update `Status` column as you progress:
> ⬜ Not started → 🔄 In progress → ✅ Complete → ⚠️ Blocked

---

## PROGRESS.md Template

Create this file at the repo root and update it every session:

```markdown
# SIA HMS — Build Progress

## Current Status
- **Phase:** 0
- **Task:** 0.1
- **Last Updated:** [date]
- **AI Tool:** Antigravity

## Session Log

### [Date] — Session 1
✅ Completed: [what was done]
🔧 In Progress: [current state]
⚠️ Issues: [any blockers or decisions made]
📋 Next Session: [exact task + prompt to start with]

---
```

---

*SIA Enterprises — Strategy · Innovation · Analytics*
*siaenterprises.com.np · contact@siaenterprises.com.np · Kathmandu, Nepal*
