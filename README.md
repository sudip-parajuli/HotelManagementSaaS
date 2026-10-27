# Staywired

**Hospitality management, powered by Techwired Solutions.**

Staywired connects reservations, rooms, front desk, housekeeping and guest balances in a hospitality workspace. The repository also contains the existing multi-tenant Django operational system, including restaurant POS, billing, staff, inventory, CRM and modular subscriptions.

## Try the demo

**Live:** [Staywired](https://staywired.vercel.app) · [Interactive hotel demo](https://staywired.vercel.app/demo/)

Run the frontend and open [http://localhost:3000/demo/](http://localhost:3000/demo/). The public demo needs no database or login and uses fictional hotel data. Create a reservation, check a guest in, settle a sample balance, check out and mark the room ready. Changes persist in that browser. No real payments are processed.

```bash
cd frontend
npm ci
npm run dev
```

Marketing page: `/landing/`. Interactive demo: `/demo/`. Live owner login: [staywired.vercel.app/login](https://staywired.vercel.app/login/).

The Django API is hosted on Vercel and connected to the verified Supabase project. The owner can open **Himalayan Haven (Demo)** from the hotel directory using Impersonate. See the [verified setup and deployment boundaries](docs/DEPLOYMENT.md#verified-live-setup--27-october-2026).

## What's new

- Staywired branding and Techwired Solutions attribution across the public site, login and workspace.
- A redesigned, responsive hospitality landing page and six-view interactive demo.
- Connected room availability, reservation, front-desk, housekeeping and revenue demo workflows.
- Native dialogs, keyboard focus, reduced-motion support, subtle transitions, feedback and empty states.
- Protected booking/admin page routing; only the actual `/book/` guest widget remains public.
- Booking validation for malformed availability inputs, unsellable rooms, capacity and negative discounts.
- Room locking and conflict revalidation for competing reservation writes; partial date edits reprice stays.
- Supabase-compatible SSL connection settings and Vercel frontend configuration.
- Automated frontend domain/routing tests and backend booking regression coverage.

The demo is separate from live hotel data. The authenticated application's existing modules still require its backend services. This is not a claim that every legacy feature has been audited for production.

## Architecture

| Layer | Technology | Deployment |
| --- | --- | --- |
| Public site, demo and operational UI | Next.js 14, React 18, TypeScript | Vercel, root `frontend` |
| API and tenant isolation | Django 5, DRF, django-tenants | Vercel `staywired-api` or container host |
| Database | PostgreSQL, schema per tenant | Supabase, direct/session-mode connection |
| Background jobs and realtime | Celery, Redis, Channels | Persistent worker/Redis services |
| Existing media storage | S3-compatible storage | Existing MinIO/S3 configuration |

Supabase hosts PostgreSQL; the deployed Django API runs on Vercel. Requested tasks run synchronously in its serverless profile. Scheduled jobs, shared realtime coordination and durable media require the additional services described in the deployment guide. Existing staff authentication uses Django JWT cookies. No Supabase service-role key is sent to the browser.

## Full local setup

Use Node 20/22, Python 3.11/3.12, PostgreSQL and Redis. Copy `.env.example` to `.env` and configure unique local credentials. For the existing Docker stack:

```bash
docker compose up --build
docker compose exec backend python manage.py migrate_schemas --shared
docker compose exec backend python manage.py migrate_schemas --tenant
docker compose exec backend python manage.py create_tenant --help
```

Use the management command to create the public tenant and unique administrator credentials. Register a tenant domain for each hotel. Do not reuse credentials from legacy sample files.

For manual development, create a virtual environment inside `backend`, install `requirements/development.txt`, configure PostgreSQL/Redis environment variables, migrate schemas, and run `python manage.py runserver 8000`. Configure `frontend/.env.local` from `frontend/.env.local.example`; then run the frontend commands above. The standalone demo works without these backend steps.

## Verification

```bash
cd frontend
npm test
npm run typecheck
npm run build
```

```bash
cd backend
python manage.py check
pytest apps/bookings/tests/test_booking_regressions.py --reuse-db
pytest apps/bookings/tests/ --reuse-db
```

Backend tests require a reachable PostgreSQL test database with schema creation privileges. Do not point the test suite at a live hotel database. The existing CI workflow provisions PostgreSQL and Redis; frontend CI runs type checking, regression tests and a production build.

## Documentation

- [Demo walkthrough and metric definitions](docs/DEMO.md)
- [Vercel, Supabase and backend deployment guide](docs/DEPLOYMENT.md)
- [Release notes and verification status](docs/RELEASE.md)
- [Existing production planning](SIA_HMS_SaaS_Production_Plan.md)

Use the **sudipparajuli800@gmail.com** Supabase account for this deployment as requested. The other account's existing projects must remain untouched. See the deployment guide for connection setup, tenant isolation, smoke checks and rollback.

## Security and operational notes

Environment files, local credentials and runtime scheduler files are ignored. A legacy tracked credentials document is removed from the current tracked tree while its local copy is preserved; rotate any live credentials it previously contained, since older Git commits retain their history. Never commit database passwords, wallet secrets, JWT secrets or production guest records.

The original GitHub repository URL is retained to preserve integrations. The product and new deployment are named **Staywired**.


### Current operations and design

See [cloud operations](docs/CLOUD_OPERATIONS.md) for private uploads, scheduled maintenance and tenant-scoped live updates, and [the Staywired design system](docs/DESIGN.md) for the shared palette and light/dark theme.
