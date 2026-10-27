# Staywired frontend

Hospitality management powered by **Techwired Solutions**.

## Run locally

```bash
npm ci
npm run dev
```

- `/landing/`: public product website.
- `/demo/`: interactive, browser-local hotel demo; no backend required.
- `/login/`: existing staff authentication, requiring Django.

Copy `.env.local.example` to `.env.local` and configure `INTERNAL_BACKEND_URL` for staff workflows. Demo mode makes no API requests.

## Verify

```bash
npm test
npm run typecheck
npm run build
```

## Deploy

Import the repository into Vercel with root directory `frontend`. See [deployment documentation](../docs/DEPLOYMENT.md) and [demo walkthrough](../docs/DEMO.md). The existing `output: standalone` setting supports Docker; Vercel uses the Next.js framework adapter.
