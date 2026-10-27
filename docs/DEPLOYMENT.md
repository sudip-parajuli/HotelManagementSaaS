# Staywired deployment guide

Hospitality management powered by **Techwired Solutions**.

## Deployment boundaries

| Component | Hosting | Purpose |
| --- | --- | --- |
| Next.js frontend | Vercel, project root `frontend` | Marketing, isolated demo, authenticated application UI and auth route handlers |
| PostgreSQL | Supabase | Existing Django schema-per-tenant database |
| Django ASGI application | Vercel project `staywired-api` or container host | REST API and tenant routing |
| Redis + Celery worker + Celery Beat | Persistent services | Queues, scheduled tasks and channel layer |
| Files | Optional S3-compatible storage; not configured on the serverless profile | Private uploads and generated artifacts need durable storage |

The public demo remains independent of backend services. Current Vercel Django support also permits hosting the API directly; this repository now includes a separate serverless profile. The traditional Redis/worker deployment remains available for scheduled work and shared realtime broadcasts. The demo makes no API requests and stores fictional data in the visitor's browser. Existing modules remain backed by Django, not Supabase's browser API.

## 1. Vercel frontend and demo

Verified public deployment: [staywired.vercel.app](https://staywired.vercel.app), demo [here](https://staywired.vercel.app/demo/). Vercel project: `staywired`, ID `prj_3RdzywmcI5FgFfv6HHB7BdoYy3gP`, team `sudip-2000s-projects`. The production deployment is ready; the Supabase project is verified in the requested account and the API is hosted at [staywired-api.vercel.app](https://staywired-api.vercel.app/api/health/). The database connection, shared migrations, owner bootstrap and isolated cloud demo are complete. The operational core is verified through the hosted frontend; remaining service boundaries are listed below.

1. Import `sudip-parajuli/HotelManagementSaaS` into the intended Vercel team.
2. Name the project **staywired** and select root directory `frontend`.
3. Framework: Next.js. Node: 22.x. Install: `npm ci`. Build: `npm run build`.
4. Configuration and response headers are in `frontend/vercel.json`.
5. Deploy the verified commit. `/` sends anonymous users to `/landing/`; `/demo/` is public without credentials.
6. For real account login, set `INTERNAL_BACKEND_URL=https://YOUR-DJANGO-HOST` as a server-only environment variable for the appropriate environments, then redeploy. Never prefix a database password, JWT secret or service-role key with `NEXT_PUBLIC_`.
7. Register the actual frontend domain in Django's `ALLOWED_HOSTS`, trusted CSRF/CORS origins and `Domain` tenant records. Auth handlers forward the incoming host so Django can resolve the correct tenant. Verify this through the deployment proxy before onboarding real hotels.
8. Keep preview deployments protected if they connect to live data. The public demo needs no connection to a production database.

The repository name remains unchanged to preserve its existing remote and integrations; **Staywired** is the product and Vercel project name.

Reference: [Vercel monorepo root directories](https://vercel.com/docs/monorepos), [build configuration](https://vercel.com/docs/builds/configure-a-build).

## 2. Supabase account and project

Use **sudipparajuli800@gmail.com**. Do not create this project under **sparajuli802@gmail.com** or modify that account's existing projects. Confirm the selected account and organization before creating a project. Use the free tier; do not enable paid upgrades.

Reuse the verified existing project **Hotel Management System** (`vwrwuywyadbjugyttbgb`), organization **sudipparajuli800's Org** (`vnooitrvthyyvmzvchwi`), free tier, Tokyo (`ap-northeast-1`). Do not create a duplicate project. Database credentials belong only in the backend host's secret environment configuration. Never paste them into documentation, client code or GitHub.

Use Supabase as managed PostgreSQL for the existing Django application. Do not replace Django authentication or tenant isolation with a browser-side Supabase client. Django's migrations remain the source of truth.

### Connection settings

Configure backend environment variables from Supabase's **Connect** dialog:

```dotenv
POSTGRES_DB=postgres
POSTGRES_USER=postgres.vwrwuywyadbjugyttbgb
POSTGRES_PASSWORD=SET_IN_HOST_SECRET_STORE
POSTGRES_HOST=aws-0-ap-northeast-1.pooler.supabase.com
POSTGRES_PORT=5432
POSTGRES_SSLMODE=require
POSTGRES_CONN_MAX_AGE=0
```

Use a direct connection when network support allows it, or the **session pooler on port 5432** for an IPv4-only backend. For direct connections the username is usually `postgres`; copy the actual value from the project dashboard. Do not use the transaction pooler on port 6543 for this schema-per-tenant application: tenant selection relies on session state (`search_path`). Prefer a direct connection for migrations and backup/restore.

Keep application tenant schemas out of Supabase's exposed API schemas. The Django database role requires permissions to create schemas and run migrations; inspect the project's actual role privileges. Never grant browser users access to tenant schemas. RLS on a Supabase Data API table is not a replacement for Django's schema routing.

Reference: [Supabase connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres), [pooling and session behavior](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits).

## 3. Vercel API setup

Vercel project **staywired-api**, ID `prj_RsnRw6iXDNANWaz6ZVoXmpiuThbH`, uses root directory `backend` and the Django framework. `backend/pyproject.toml` selects the ASGI entrypoint, `backend/vercel.json` configures its request duration, and `config.settings.vercel` provides deployment settings. [Current Vercel Django documentation](https://vercel.com/docs/frameworks/full-stack/django) supersedes the earlier assumption that a container host was mandatory.

The ignored local file `backend/.env.supabase.local` holds the verified connection parameters and deployment secrets. The supplied database password is configured locally and in the production API environment. The bootstrap owner credentials also remain in this file; the owner password is not uploaded as a runtime environment variable.

```powershell
cd backend
.\.venv\Scripts\python.exe scripts/supabase_manage.py check
.\.venv\Scripts\python.exe scripts/supabase_manage.py migrate_schemas --shared --noinput
.\.venv\Scripts\python.exe scripts/supabase_manage.py bootstrap_staywired
.\.venv\Scripts\python.exe scripts/configure_vercel.py api
.\.venv\Scripts\python.exe scripts/configure_vercel.py frontend
```

Inspect the remote database before migrating. Bootstrap creates only the public tenant, platform owner and module catalog; it preserves an existing owner's password and refuses to take domains away from another tenant. It enables RLS on Django-owned public tables without adding browser policies. It does not change Supabase's managed `auth` or `storage` schemas. Migration execution is explicit, never performed on an ordinary web request or automatically during a Vercel build.

The CLI configuration helper transfers an allowlist of secrets through stdin, prints names only and targets production. Preview deployments do not inherit live database credentials. Redeploy both applications after setting environments. Verify the backend `/api/health/` for liveness, then test authenticated database endpoints; liveness alone does not verify migrations or database readiness.

The Next.js server route `/api/[...path]` forwards API traffic and tenant host context using a shared server secret. It does not overwrite the platform's HTTP Host header. Django accepts only configured frontend hosts and a matching secret. Browser-supplied proxy headers are discarded, cross-origin writes are rejected and responses are not cached.

### Serverless feature boundaries

The serverless profile runs explicitly requested Celery work synchronously; it does not run Beat schedules. Process-local cache and Channels are not shared between instances. Durable media uploads are deliberately rejected until an object-storage backend is configured, rather than written to Vercel's temporary disk. PDF generation still requires native WeasyPrint libraries; billing's existing HTML fallback remains available. These services must be configured and verified before enabling those capabilities for real hotel operations.

Do not treat an API liveness response or public demo as proof that storage, scheduled jobs or realtime coordination are production-ready.

## 4. Traditional container and worker deployment

Use the existing `backend/Dockerfile` or production Compose topology. Configure a unique Django secret, allowed hosts, trusted origins, PostgreSQL, Redis and file storage secrets. `config.settings.production` requires HTTPS and recognizes `X-Forwarded-Proto` from the trusted reverse proxy. The proxy must overwrite, not simply trust, client-supplied forwarded headers.

Before migrating, take a backup of existing data. On a new empty project:

```bash
cd backend
python manage.py check --deploy --settings=config.settings.production
python manage.py migrate_schemas --shared
python manage.py migrate_schemas --tenant
python manage.py collectstatic --noinput
```

Bootstrap the public tenant with `python manage.py create_tenant --help` and supply unique credentials via a secure administrative session. Register a domain for each hotel. Never deploy the legacy sample credential values from earlier setup notes. Use the existing subscription seed commands after checking `python manage.py help` for the current command names.

Start the ASGI service and Celery worker/Beat using the existing container configuration. Ensure exactly one Beat scheduler runs. Supabase does not run these processes.

## 5. Smoke checks

- Anonymous `/demo/` loads without API credentials; no real guest data appears.
- Anonymous `/bookings/` and `/admin/` redirect to sign in.
- The real booking widget `/book/` remains public.
- Login, token refresh and logout work over HTTPS for the chosen tenant domain.
- Two overlapping bookings for one room cannot both save.
- Arrival/departure changes recompute prices and reject conflicts.
- Check-in, checkout, guest balances, housekeeping and invoices work in a staging tenant.
- WebSockets, scheduled billing and background reports work on the service host.
- Database backups, restore procedure and operational logs are configured.

## 6. Rollback

For frontend-only changes, promote the last verified Vercel deployment. For database migrations, take a backup first and review reversibility before applying them. This release adds connection settings and application validation, with no new booking-schema migration. Other pre-existing local changes in this repository may include migrations and must be evaluated separately before a production database upgrade.

## Secrets already in repository history

A legacy local credentials Markdown file was tracked by the original repository. It is excluded from new tracked files in this release while its local copy is preserved. Rotate any live credentials recorded there; removing a file from the latest commit does not remove earlier Git history. This guide intentionally contains no real credentials.


## Verified live setup — 27 October 2026

- Frontend: https://staywired.vercel.app
- Owner sign-in: https://staywired.vercel.app/login/
- API liveness: https://staywired-api.vercel.app/api/health/
- Supabase project: https://supabase.com/dashboard/project/vwrwuywyadbjugyttbgb
- Platform owner: `sudipparajuli800@gmail.com`. The generated app password is the `STAYWIRED_ADMIN_PASSWORD` entry in the ignored local file; it is not the Google or database password. No password is recorded in this guide.
- Shared migrations: 81 recorded; 33 public Django tables. Verified zero public Django tables with RLS disabled and zero anonymous/public access policies.
- Cloud sample: **Himalayan Haven (Demo)**, schema `staywired_demo`, eight rooms, zero-price sample module subscriptions with no next billing date. Its data is fictional and separate from other hotels.
- Open the sample from **Hotels Directory → Impersonate**, entering a reason for the audit log. No custom tenant DNS is required for this owner-driven flow.
- Live verification passed: login, profile, administration, signed tenant routing, room listing, guest/reservation creation, overlap rejection, check-in, a sample cash-settled checkout/invoice, housekeeping completion and room readiness.

`python scripts/smoke_vercel.py` repeats that flow only in the explicitly labelled demo. It refuses to select a different hotel. It leaves fictional demo records and a sample invoice, never contacts a payment gateway, and never prints credentials or session tokens.

Supabase Authentication's Users page is not the app's staff directory: existing Django JWT authentication and the shared `accounts_user` table remain the source of staff identity.
