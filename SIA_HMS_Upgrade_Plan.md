# SIA HMS — Post-Build Upgrade & Hardening Plan
## Based on Review of PROGRESS.md + Phase 0–10 Walkthroughs
**Version:** 1.0 | **Prepared By:** SIA Enterprises | **Type:** Antigravity Task Plan

---

> **HOW TO USE THIS FILE**
> This is a direct continuation of the original `SIA_HMS_Antigravity_Plan.md`. All 9 original phases + Phase 10 (SaaS landing/onboarding) are marked complete in PROGRESS.md — this file covers what needs to happen **next**, before the system goes in front of real clients.
>
> Hand this file to Antigravity as the first message of a new session. Work top to bottom — 🔴 Critical items first, 🟡 Important second, 🟢 Nice-to-have last.
>
> After each task, update `PROGRESS.md` with a new entry under "Phase 11 — Hardening & Upgrades".

---

## TABLE OF CONTENTS

1. [Why This Plan Exists](#1-why-this-plan-exists)
2. [🔴 Critical — Before Any Client Demo](#2-critical--before-any-client-demo)
3. [🟡 Important — Before First Paying Client](#3-important--before-first-paying-client)
4. [🟢 Nice-to-Have — Roadmap](#4-nice-to-have--roadmap)
5. [Master Checklist](#5-master-checklist)
6. [AI Handoff Prompt](#6-ai-handoff-prompt)

---

## 1. Why This Plan Exists

PROGRESS.md shows all 9 original phases plus a bonus Phase 10 complete — full multi-tenant architecture, all 10 core modules, 53 passing backend tests, zero TypeScript errors. This is a genuinely strong build.

However, a few things were either **stubbed**, **promised-but-not-built**, or **need verification** before this system is safe to demo to the villa/resort client or any future client:

| Issue | Why It Matters | Severity |
|---|---|---|
| Fonepay is simulated, not real | Staff could think a payment succeeded when it didn't | 🔴 Critical |
| No Nepali language support found | Promised as standard in every client pricing proposal except starter plan| 🔴 Critical |
| Impersonation has no audit trail | SuperAdmin can view any tenant's data with zero logging | 🔴 Critical |
| Nepal tax slabs not verified against current FY | Wrong payslips = legal/compliance liability for client | 🔴 Critical |
| Public onboarding has no rate limiting | Open door to spam-create tenant schemas | 🟡 Important |
| Payroll/Loyalty test coverage thin (2 tests each) | Money-handling modules need more edge cases | 🟡 Important |
| WebSocket tenant isolation unverified | KDS/Housekeeping channels may leak across tenants | 🟡 Important |
| Guest ID images stored indefinitely | Data retention/privacy liability | 🟡 Important |
| No API docs, health checks, E2E tests | Slows future integrations and ops monitoring | 🟢 Nice-to-have |

---

## 2. 🔴 Critical — Before Any Client Demo

---

### Task C.1 — Complete Real Fonepay Integration

```
PROMPT TO ANTIGRAVITY:

The current Fonepay integration in backend/apps/payments/fonepay.py is a
placeholder — it generates a QR code and polls for "success" without
actually contacting Fonepay's API.

Replace this with a real integration:

1. Implement Fonepay's actual QR payment API:
   - POST to Fonepay merchant API with merchant code, amount, transaction ID
   - Generate the real dynamic QR code returned by Fonepay (not a placeholder)
   - Implement the real status-check endpoint (poll Fonepay's verification API,
     not an internal "always succeeds" stub)

2. Add FONEPAY_SANDBOX=True/False to settings, matching the eSewa/Khalti pattern
   already used elsewhere in the codebase

3. Update PaymentTransaction model if any new fields are needed
   (e.g., fonepay_trace_id, fonepay_qr_data)

4. If real Fonepay merchant credentials are not yet available:
   - Clearly mark the Fonepay option in the frontend PaymentModal as
     "Coming Soon" and disable it, rather than leaving it clickable
   - Add a TODO comment block at the top of fonepay.py explaining
     exactly what's stubbed and what's needed to complete it

5. Write tests in apps/payments/tests/test_fonepay.py covering:
   - QR generation request/response shape
   - Status polling against mocked Fonepay responses
   - Webhook signature verification (if Fonepay uses webhooks)

Reference apps/payments/esewa.py and khalti.py for the established
pattern (sandbox flags, PaymentTransaction logging, webhook handlers).
```

---

### Task C.2 — Nepali / English Language Support (i18n)

```
PROMPT TO ANTIGRAVITY:

Every client pricing proposal except starter plan promises Nepali/English language toggle as
a STANDARD feature. This is not yet implemented anywhere in the codebase.
Implement it now across both backend and frontend.

BACKEND (Django):
1. Enable Django's i18n framework in config/settings/base.py:
   - USE_I18N = True
   - LANGUAGES = [('en', 'English'), ('ne', 'नेपाली')]
   - LocaleMiddleware in MIDDLEWARE (after SessionMiddleware)
   - LOCALE_PATHS pointing to backend/locale/

2. Wrap all user-facing strings in API error messages, validation messages,
   and notification templates (SMS/email) with Django's gettext (_())
   - Priority order: accounts (auth errors), bookings (validation messages),
     frontdesk, billing (invoice labels), payroll (payslip labels)

3. Generate .po files for Nepali:
   python manage.py makemessages -l ne
   Translate the highest-traffic strings first:
   - Auth errors (invalid credentials, session expired)
   - Booking validation (room unavailable, invalid dates)
   - Common status labels (Pending, Confirmed, Checked In, etc.)

4. PDF templates (invoice.html, payslip.html, reports):
   - Add a language parameter to PDF generation functions
   - Create Nepali versions of static labels (Invoice → बिल, Total → जम्मा, etc.)
   - WeasyPrint supports Devanagari script — verify font (Noto Sans Devanagari
     or similar) is bundled in the Docker image for correct rendering

FRONTEND (Next.js):
1. Install and configure next-intl (App Router compatible)
2. Create translation files:
   - frontend/messages/en.json
   - frontend/messages/ne.json
3. Wrap the dashboard layout with the i18n provider
4. Add a language toggle component in the Navbar — persists choice in
   user profile (add `preferred_language` field to User model) so it's
   remembered across sessions and devices

5. PRIORITY TRANSLATION ZONES (translate these first):
   - Login page
   - Dashboard navigation (Sidebar — all module names)
   - Front Desk dashboard (Arrivals/In-House/Departures, button labels)
   - POS interface (menu categories, order panel, payment buttons)
   - Housekeeping task statuses
   - Common form labels (Save, Cancel, Confirm, Delete, Edit)

6. Numbers and dates: ensure Nepali locale formatting is available as an
   OPTION (NPR currency formatting, but keep Gregorian dates as default —
   Bikram Sambat calendar can be a future add-on, not part of this task)

DELIVERABLE: A working language toggle that switches the Sidebar, Front
Desk dashboard, and POS interface between English and Nepali. Remaining
modules can be translated incrementally — but the toggle infrastructure
and these three high-traffic areas must work end-to-end.

Write a test confirming /api/auth/me/ returns preferred_language and that
changing it persists correctly.
```

---

### Task C.3 — Impersonation Audit Log & Token Hardening

```
PROMPT TO ANTIGRAVITY:

The SuperAdmin impersonation feature (apps/accounts/admin_views.py +
apps/tenants/middleware.py ImpersonationMiddleware) currently has no
audit trail. Given this feature grants a SuperAdmin full access to any
tenant's guest data, financial records, and staff PII, it needs:

1. NEW MODEL — apps/accounts/models.py (shared/public schema):
   ImpersonationLog:
     - admin_user (FK → User)
     - target_tenant (FK → tenants.Client)
     - started_at, ended_at (nullable)
     - reason (CharField, required — admin must state why)
     - ip_address

2. UPDATE the impersonation start endpoint:
   - Require a `reason` field in the request body before issuing the
     impersonation token
   - Create an ImpersonationLog row with started_at=now()
   - Return the log entry ID alongside the impersonation JWT

3. UPDATE token expiry:
   - Impersonation JWTs currently use the same lifetime as normal access
     tokens (15 min). Change impersonation tokens to expire in 10 minutes,
     and require re-authentication (not silent refresh) to extend

4. UPDATE the "Stop Impersonating" flow:
   - When ended, update ImpersonationLog.ended_at = now()

5. TENANT-SIDE VISIBILITY:
   - When an impersonation session is active, show a banner in the
     TENANT's dashboard layout (not just the admin's) reading:
     "SIA Enterprises support is currently viewing this account
     (Reason: [reason]) — Session started at [time]"
   - This banner should be visible to PropertyManager role at minimum

6. NEW SUPERADMIN PAGE — /superadmin/audit-log/:
   - Table of all ImpersonationLog entries: admin, tenant, reason,
     start/end time, duration
   - Filterable by tenant and date range

Write tests confirming:
- Impersonation without a `reason` field is rejected (400)
- ImpersonationLog entry is created on start and updated on stop
- Impersonation token expires after 10 minutes and cannot be silently refreshed
```

---

### Task C.4 — Verify & Update Nepal Tax Slabs

```
PROMPT TO ANTIGRAVITY:

backend/apps/payroll/calculator.py implements Nepal's progressive income
tax (TDS) using "single (500k NPR base slab) vs married (600k NPR base
slab)". These figures must be verified against the CURRENT fiscal year's
official IRD tax brackets before any real payslip is generated.

1. Create a TaxSlab model (or config table) instead of hardcoded values:
   apps/payroll/models.py:
     TaxSlab:
       - fiscal_year (e.g., "2081/82")
       - filing_status: single | married
       - slab_order (1, 2, 3...)
       - min_amount, max_amount (nullable for top bracket)
       - rate_percent
       - applies_from, applies_to (date range)

2. Seed this table via a data migration with a CLEAR comment block:
   "VERIFY THESE RATES AGAINST CURRENT IRD NOTICE BEFORE PRODUCTION USE.
    Source: [leave blank for Sudip to fill in with official IRD circular]"

   I cannot verify current Nepal tax rates myself — flag this prominently
   in the migration file and in PROGRESS.md as a manual verification task
   for Sudip before going live with any real payroll run.

3. Refactor calculator.py to read from TaxSlab instead of hardcoded
   500k/600k figures — this makes future fiscal year updates a data change,
   not a code change

4. Add a SuperAdmin page /superadmin/tax-slabs/ where SIA can update
   tax brackets each fiscal year without a deployment

5. SSF rates (11% employee / 20% employer) — same treatment: move to a
   configurable settings table rather than hardcoded constants, since
   these can also change

Write a migration test confirming TaxSlab seeds correctly and
calculator.py produces the same output as before for the seeded values
(regression test — don't change behavior yet, just make it configurable).

IMPORTANT: Add a checklist item to PROGRESS.md:
"⚠️ MANUAL ACTION REQUIRED: Verify TaxSlab seed data against official
IRD tax notice for FY [current year] before first real payroll run."
```

---

## 3. 🟡 Important — Before First Paying Client

---

### Task I.1 — Rate Limiting on Public Endpoints

```
PROMPT TO ANTIGRAVITY:

The self-onboarding endpoint /api/public/onboard/ and the login endpoint
/api/auth/login/ currently have no rate limiting. Add protection:

1. Install django-ratelimit (or use DRF's built-in throttling classes)

2. Apply throttling:
   - /api/public/onboard/ — max 3 requests per IP per hour
     (legitimate signups are rare; this stops schema-spam attacks)
   - /api/auth/login/ — max 10 attempts per IP per 15 minutes
     (stops brute-force credential attacks)
   - /api/auth/refresh/ — max 30 per IP per hour

3. Return clear 429 responses with Retry-After headers

4. Log rate-limit hits (not just block them) so SIA can monitor for
   abuse patterns — write to a simple RateLimitLog model or use
   Django's logging framework to a dedicated log file

Write tests confirming the 4th onboarding attempt from the same IP
within an hour returns 429.
```

---

### Task I.2 — Expand Payroll & Loyalty Test Coverage

```
PROMPT TO ANTIGRAVITY:

apps/payroll/tests/ and apps/loyalty/tests/ currently have 2 tests each.
Given these modules handle real money and guest rewards, expand coverage:

PAYROLL (apps/payroll/tests/test_payroll.py) — add tests for:
- Staff member who joined mid-month (pro-rated salary for partial month)
- Staff member with zero attendance (all absent) — net pay should reflect
  full deductions correctly, not crash
- Overtime exceeding a configurable monthly cap (if a cap should exist,
  add one; if not, test that uncapped overtime calculates correctly for
  a high-hours edge case)
- Staff member exactly at a tax bracket boundary (e.g., taxable income
  exactly equal to a slab threshold) — confirm correct bracket applied
- Bulk payroll run with a mix of monthly and hourly salary_type staff
  in the same PayrollPeriod

LOYALTY (apps/loyalty/tests/test_loyalty.py) — add tests for:
- Tier upgrade triggers exactly at threshold (e.g., guest crosses from
  999 to 1000 points — confirm Bronze → Silver transition fires)
- Points redemption that would result in negative balance — should be
  rejected, not allowed to go negative
- Multiple invoices paid on the same day for the same guest — points
  accumulate correctly across both
- Tier downgrade scenario (if points can expire/decrease) — confirm
  tier re-evaluation logic handles downgrades, or document that tiers
  are one-way if that's the intended design

Run full suite after additions:
pytest apps/payroll/tests/ apps/loyalty/tests/ -v
```

---

### Task I.3 — Verify WebSocket Tenant Isolation

```
PROMPT TO ANTIGRAVITY:

KDS (apps/pos/consumers.py) and Housekeeping (apps/housekeeping/consumers.py)
use Django Channels with Redis as the channel layer. HTTP requests get
tenant isolation via django-tenants schema routing — but WebSocket
connections may not automatically inherit this.

1. AUDIT both consumers:
   - Confirm channel group names include the tenant schema name, e.g.
     group_name = f"kds_{tenant_schema}_{station}"
     NOT just f"kds_{station}" (which would broadcast across ALL tenants)

2. If group names are NOT tenant-scoped, fix this:
   - Extract tenant_schema from the WebSocket connection's scope
     (should be available via the tenant middleware applied to ASGI)
   - Prefix all channel group names with tenant_schema

3. Write an integration test that:
   - Creates two tenants (tenant_a, tenant_b)
   - Opens a KDS WebSocket connection for each
   - Creates an order in tenant_a
   - Asserts tenant_b's WebSocket does NOT receive the broadcast
   - Asserts tenant_a's WebSocket DOES receive it

4. Repeat the same audit + test for HousekeepingConsumer channel groups

This is a potential data leak between hotel clients if not isolated —
treat as high priority even though categorized as "Important" not
"Critical" (it's important because PROGRESS.md doesn't show this was
explicitly tested).
```

---

### Task I.4 — Guest ID Document Retention Policy

```
PROMPT TO ANTIGRAVITY:

CheckIn.id_document_image stores guest ID photos (passport/citizenship)
in MinIO indefinitely. Add a configurable retention policy:

1. Add to Property model:
   - id_document_retention_days (default: 365, configurable per property)

2. Create a Celery Beat task (apps/frontdesk/tasks.py):
   - cleanup_expired_id_documents — runs daily
   - Finds CheckIn records older than retention_days where
     id_document_image is not null
   - Deletes the file from MinIO
   - Sets id_document_image to null, adds a note:
     "ID document auto-deleted per retention policy on [date]"
   - Does NOT delete the CheckIn record itself — only the image file

3. Add encryption at rest for the MinIO bucket storing ID documents
   specifically (separate bucket from room/menu images):
   - guest-documents bucket: server-side encryption enabled
   - room-images, menu-images buckets: no encryption needed (not sensitive)

4. SuperAdmin/PropertyManager setting page: expose retention_days as
   an editable field in property settings UI

Write a test confirming the Celery task correctly identifies and
processes expired documents without affecting recent ones.
```

---

## 4. 🟢 Nice-to-Have — Roadmap

---

### Task N.1 — API Documentation (OpenAPI/Swagger)

```
PROMPT TO ANTIGRAVITY:

Install and configure drf-spectacular:

1. pip install drf-spectacular, add to INSTALLED_APPS
2. Configure SPECTACULAR_SETTINGS in settings/base.py with title
   "SIA HMS API", description, version
3. Add schema view and Swagger UI at /api/schema/ and /api/docs/
   (only enabled when DEBUG=True or behind SuperAdmin auth in production)
4. Add docstrings/descriptions to key ViewSets (bookings, pos, billing)
   so the generated docs are useful, not just auto-generated noise

This will make scoping future add-ons (Channel Manager, Accounting
Integration) significantly faster since the API surface is documented.
```

---

### Task N.2 — Health Check Endpoints

```
PROMPT TO ANTIGRAVITY:

Add health check endpoints for monitoring (Netdata or future uptime tools):

1. /api/health/ — basic 200 OK, no auth required
2. /api/health/db/ — checks PostgreSQL connection, returns 200/503
3. /api/health/redis/ — checks Redis connection, returns 200/503
4. /api/health/celery/ — checks at least one Celery worker is responding
   (via a quick ping task), returns 200/503

These should be excluded from tenant routing (always hit the public
schema / shared infrastructure check) and from rate limiting.

Write tests confirming each endpoint returns the expected status
when its dependency is reachable.
```

---

### Task N.3 — End-to-End Guest Journey Tests

```
PROMPT TO ANTIGRAVITY:

Set up Playwright for end-to-end testing of the critical guest journey,
which currently has unit test coverage per-module but no test verifying
the full flow works together:

1. Install Playwright in frontend/, configure for the dev Docker environment

2. Write one E2E test covering:
   - Staff logs in as PropertyManager
   - Creates a new booking via /bookings/new
   - Checks in the guest via /frontdesk
   - Places a restaurant order via /pos, charges it to the room
   - Checks out the guest — verify the invoice includes both room
     charge AND the POS order
   - Verify loyalty points were credited to the guest's account

3. This single test, if it passes, gives high confidence that the
   5 modules involved (bookings, frontdesk, pos, billing, loyalty)
   are correctly integrated — much faster than manually clicking
   through during a client demo to discover something's broken.

Run in CI as part of the GitHub Actions pipeline (can be a separate,
slower job that runs on PRs to main, not on every push).
```

---

### Task N.4 — Housekeeping Mobile PWA

```
PROMPT TO ANTIGRAVITY:

The /housekeeping/my-tasks page is used by housekeeping staff, likely
on personal phones. Make it installable as a home-screen app:

1. Add frontend/public/manifest.json with app name "SIA HMS — Housekeeping",
   icons, theme color matching property branding
2. Add a service worker for basic caching (not full offline mode —
   just faster repeat loads and an "Add to Home Screen" prompt)
3. Ensure /housekeeping/my-tasks is fully responsive at 360px width
   (smallest common Android screen)
4. Large tap targets (min 44x44px) for "Start", "Done", "Report Issue"
   buttons — verify against current implementation

This significantly improves real-world adoption by housekeeping staff
who won't use a desktop browser.
```

---

## 5. Master Checklist

| # | Task | Priority | Est. Hours | Status |
|---|---|---|---|---|
| C.1 | Real Fonepay integration (or clearly disable) | 🔴 Critical | 12–16 | ⬜ |
| C.2 | Nepali/English i18n (toggle + 3 priority zones) | 🔴 Critical | 25–35 | ⬜ |
| C.3 | Impersonation audit log + token hardening | 🔴 Critical | 10–14 | ⬜ |
| C.4 | Nepal tax slabs → configurable + manual verify | 🔴 Critical | 8–12 | ⬜ |
| I.1 | Rate limiting on public/auth endpoints | 🟡 Important | 4–6 | ⬜ |
| I.2 | Expand payroll/loyalty test coverage | 🟡 Important | 8–10 | ⬜ |
| I.3 | WebSocket tenant isolation audit + fix | 🟡 Important | 6–10 | ⬜ |
| I.4 | Guest ID document retention policy | 🟡 Important | 6–8 | ⬜ |
| N.1 | API docs (drf-spectacular) | 🟢 Nice-to-have | 4–6 | ⬜ |
| N.2 | Health check endpoints | 🟢 Nice-to-have | 3–4 | ⬜ |
| N.3 | E2E guest journey test (Playwright) | 🟢 Nice-to-have | 8–12 | ⬜ |
| N.4 | Housekeeping PWA | 🟢 Nice-to-have | 4–6 | ⬜ |

**Critical path total: ~55–77 hours** before this is safe to demo to the villa/resort client with full confidence.
**Important path total: ~24–34 hours** before first paying client goes live.
**Nice-to-have total: ~19–28 hours** — can happen post-launch, in parallel with client onboarding.

---

## 6. AI Handoff Prompt

Reuse the same handoff prompt format from the original implementation plan. Update the three fields:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AI HANDOFF — SIA Enterprises Hotel Management System
PHASE 11: HARDENING & UPGRADES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CURRENT PROGRESS:
→ [e.g. "Task C.1 (Fonepay) complete. Starting Task C.2 (i18n)."]

LAST FILE WORKED ON:
→ [e.g. "backend/apps/payments/fonepay.py — real API integration done"]

NEXT TASK:
→ [paste the exact task block from UPGRADE_PLAN.md, Section 2, 3, or 4]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(All tech stack, coding standards, and global skills references
from the original SIA_HMS_Antigravity_Plan.md still apply.)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please ask me for any files you need to see before continuing.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

*SIA Enterprises — Strategy · Innovation · Analytics*
*siaenterprises.com.np · contact@siaenterprises.com.np · Kathmandu, Nepal*
