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

Production Django services, Redis, workers and storage must be configured separately. Supabase provisioning requires a confirmed connection to the requested account (`sudipparajuli800@gmail.com`). No project should be created under the other account. Deployment completion and the verified live URL are reported in the final delivery; this file does not claim that an unconnected Supabase project exists.

See [deployment guide](DEPLOYMENT.md) for runtime topology, connection settings, migrations, smoke checks, backups and rollback.
