# Staywired deployment guide

Hospitality management powered by **Techwired Solutions**.

## Deployment boundaries

| Component | Hosting | Purpose |
| --- | --- | --- |
| Next.js frontend | Vercel, project root `frontend` | Marketing, isolated demo, authenticated application UI and auth route handlers |
| PostgreSQL | Supabase | Existing Django schema-per-tenant database |
| Django ASGI application | Container/VM service | REST API, tenant routing, WebSocket support |
| Redis + Celery worker + Celery Beat | Persistent services | Queues, scheduled tasks and channel layer |
| Files | Existing S3-compatible storage | Property/room images, generated artifacts |

Vercel plus Supabase is sufficient to serve the **public demo**. It is not a replacement for the Django service, Redis or workers used by the live product. The demo makes no API requests and stores fictional data in the visitor's browser. Existing modules remain backed by Django, not Supabase's browser API.

## 1. Vercel frontend and demo

Verified public deployment: [staywired.vercel.app](https://staywired.vercel.app), demo [here](https://staywired.vercel.app/demo/). Vercel project: `staywired`, ID `prj_3RdzywmcI5FgFfv6HHB7BdoYy3gP`, team `sudip-2000s-projects`. The production deployment is ready; Supabase and the live backend remain pending account/service configuration.

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

Connect Supabase through the available integration using that account. Select or create a dedicated `staywired` project after verifying the organization and available free project capacity. Database credentials belong only in the backend host's secret environment configuration. Never paste them into documentation, client code or GitHub.

Use Supabase as managed PostgreSQL for the existing Django application. Do not replace Django authentication or tenant isolation with a browser-side Supabase client. Django's migrations remain the source of truth.

### Connection settings

Configure backend environment variables from Supabase's **Connect** dialog:

```dotenv
POSTGRES_DB=postgres
POSTGRES_USER=postgres.YOUR_PROJECT_REF
POSTGRES_PASSWORD=SET_IN_HOST_SECRET_STORE
POSTGRES_HOST=YOUR_SESSION_POOLER_HOST
POSTGRES_PORT=5432
POSTGRES_SSLMODE=require
POSTGRES_CONN_MAX_AGE=0
```

Use a direct connection when network support allows it, or the **session pooler on port 5432** for an IPv4-only backend. For direct connections the username is usually `postgres`; copy the actual value from the project dashboard. Do not use the transaction pooler on port 6543 for this schema-per-tenant application: tenant selection relies on session state (`search_path`). Prefer a direct connection for migrations and backup/restore.

Keep application tenant schemas out of Supabase's exposed API schemas. The Django database role requires permissions to create schemas and run migrations; inspect the project's actual role privileges. Never grant browser users access to tenant schemas. RLS on a Supabase Data API table is not a replacement for Django's schema routing.

Reference: [Supabase connection methods](https://supabase.com/docs/guides/database/connecting-to-postgres), [pooling and session behavior](https://supabase.com/docs/guides/database/connecting-to-postgres/pooling-and-limits).

## 3. Django and background services

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

## 4. Smoke checks

- Anonymous `/demo/` loads without API credentials; no real guest data appears.
- Anonymous `/bookings/` and `/admin/` redirect to sign in.
- The real booking widget `/book/` remains public.
- Login, token refresh and logout work over HTTPS for the chosen tenant domain.
- Two overlapping bookings for one room cannot both save.
- Arrival/departure changes recompute prices and reject conflicts.
- Check-in, checkout, guest balances, housekeeping and invoices work in a staging tenant.
- WebSockets, scheduled billing and background reports work on the service host.
- Database backups, restore procedure and operational logs are configured.

## 5. Rollback

For frontend-only changes, promote the last verified Vercel deployment. For database migrations, take a backup first and review reversibility before applying them. This release adds connection settings and application validation, with no new booking-schema migration. Other pre-existing local changes in this repository may include migrations and must be evaluated separately before a production database upgrade.

## Secrets already in repository history

A legacy local credentials Markdown file was tracked by the original repository. It is excluded from new tracked files in this release while its local copy is preserved. Rotate any live credentials recorded there; removing a file from the latest commit does not remove earlier Git history. This guide intentionally contains no real credentials.
