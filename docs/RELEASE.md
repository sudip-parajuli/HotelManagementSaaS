# Staywired release — 27 October 2026

**Staywired — hospitality management powered by Techwired Solutions.**

## Delivered

- Rebranded public experience, staff login, tenant workspace and onboarding text.
- Responsive marketing website with locally rendered architectural illustrations.
- Interactive hotel demo with overview, reservations, front desk, rooms, housekeeping and revenue.
- Reservation availability and capacity checks; check-in guards; balance settlement; checkout-to-cleaning handover; cancellation; search/filter; CSV export; browser persistence and reset confirmation.
- Keyboard focus, native dialogs, reduced-motion handling, subtle hover/entry effects, feedback and empty states. Responsive phone and desktop layouts were inspected in a browser.
- Real front-desk occupancy, arrivals and in-house counts on the authenticated dashboard instead of the corresponding placeholders; visible error/retry state; narrower mobile sidebar.
- Fixed the `/book` prefix match that also treated `/bookings` as public; staff/admin pages now require an authentication cookie before page delivery. Actual backend authorization remains enforced by Django.
- Backend availability validation, maintenance/out-of-order filtering, guest capacity checks and partial-edit conflict detection.
- Locked room records and revalidated reservations during create/update; room/date changes recalculate totals using Decimal arithmetic.
- Missing migrations for existing restaurant waiter/position fields, lost-and-found/discrepancy records and inventory room consumption.
- Supabase SSL/session connection settings, trusted HTTPS proxy setting, Vercel headers/configuration, regression scripts and deployment/demo documentation.
- Removed a legacy credentials document from tracking while preserving the local file; ignored credential notes, scheduler state and Vercel metadata. Tenant creation now requires an explicit administrator password.

## Existing work preserved

The checkout already contained extensive local changes to POS, billing, subscriptions, admin routing, timed sessions and other modules. Those changes and the previously unpushed fix commit are preserved in the published source. They are not all newly authored or exhaustively audited in this release.

## Verification

- Frontend regression tests: **8 passed**.
- TypeScript: **passed**.
- Next.js production build: **passed**, including 57 generated pages.
- Django system check: **passed**.
- Booking suite, including new regressions: **21 passed**.
- Migration drift check after adding missing migrations: **no changes detected**.
- Browser demo walkthrough: create reservation, check in, settle, check out, mark the room ready; desktop and phone-sized layouts inspected.
- Front desk / billing / housekeeping suite: **15 passed** (36 backend tests passed across the two runs).
- Full backend collection: blocked on this Windows machine by missing native Pango library required by WeasyPrint. The existing backend Dockerfile installs Pango; execute the complete suite in that environment before treating the full system as production-verified.

## Deployment state and limits

The public demo is isolated from live hotel data and works on Vercel without backend credentials. It does not process payments or send notifications. Its room-only quotes are not tax invoices.

Production Django services, Redis, workers and storage must be configured separately. Supabase provisioning requires a confirmed connection to the requested account (`sudipparajuli800@gmail.com`). No project should be created under the other account. The Vercel production deployment is **READY** and verified at [staywired.vercel.app](https://staywired.vercel.app), with the [public demo](https://staywired.vercel.app/demo/). Source commit: `79c095e898b573e208d6e5aff860ce80ff5e6242`. Browser checks confirmed the homepage, demo, mobile overflow containment, and anonymous `/bookings/` redirect to `/login/`. The follow-up below records the now-completed Supabase and Django API provisioning.

See [deployment guide](DEPLOYMENT.md) for runtime topology, connection settings, migrations, smoke checks, backups and rollback.


## Supabase/Vercel follow-up

Verified the existing free-tier Hotel Management System project in sudipparajuli800's Org. Added a dedicated Vercel Django profile and API project, secure frontend proxy, idempotent public bootstrap/RLS command, ignored local secret configuration, and secret-safe CLI deployment helpers. New checks: four frontend proxy tests and eight backend runtime/financial regression tests pass. Platform-admin impersonation now switches URL routing along with the tenant schema, with a regression ensuring ordinary staff claims cannot switch tenants. The user supplied the database password locally and explicitly approved the owner/RLS/demo setup. Shared and demo-tenant migrations, owner creation, catalog seeding and public-table RLS protection are complete. The full hosted guest lifecycle passed, including overbooking rejection, check-in, sample checkout/invoice and housekeeping turnover. The API is live at `https://staywired-api.vercel.app`; the owner can sign in through the frontend. The generated app password remains in the ignored local configuration.

The visual owner-dashboard check exposed catalog-based MRR estimates that incorrectly counted free demo module access as revenue. Module MRR now uses actual contracted prices and normalizes yearly amounts to months; zero-price demo access contributes zero MRR. The trial plan record marks the sample hotel active without charging it.
