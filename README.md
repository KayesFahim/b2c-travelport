# FlyJatt

Flight search, booking and customer/admin portal built with Next.js Pages Router, React, Material UI, Travelport JSON Air, MySQL/Prisma and Redis. The existing client routes run through React Router.

## Local setup

Use Node 22 LTS (`nvm use`, or install Node 22), then:

```sh
npm ci
cp .env.example .env
# Fill in local credentials; keep .env private.
docker compose up -d
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

The Compose services are for development and bind to loopback. Set `DATABASE_URL` to match the local MySQL credentials. Existing populated databases need a migration baseline; see [deployment instructions](docs/DEPLOYMENT.md). Do not run the initial migration against tables that already exist.

## Validation

```sh
npm run check                 # ESLint and TypeScript
npm run smoke:build           # production build + HTTP checks, port 4310
npx playwright install chromium
npm run test:browser          # desktop/mobile UI and API security checks, port 4311
npm audit --audit-level=high
npm run check:production      # configuration readiness; intentionally fails for PP URLs
```

For installed Google Chrome, use `PLAYWRIGHT_CHROME=1 npm run test:browser`. Browser tests save homepage screenshots under `artifacts/`; failures save traces in `test-results/`. Tests do not create reservations, issue tickets or send email. Live supplier flows require a separately approved staging test with test credentials.

To smoke-test a deployed environment:

```sh
SMOKE_BASE_URL=https://your-domain.example npm run smoke:production
```

See the [validation record](docs/VALIDATION.md) for completed checks and verification limits.

## Configuration and security

Only public configuration belongs in `NEXT_PUBLIC_*`. Browser requests use HttpOnly session cookies; `API_KEY` is an optional server-to-server credential and never grants booking ownership or administrator access. Cross-origin writes are denied, and sensitive API responses are not cached. Shared Redis is required for production sessions and throttling; production refuses an in-memory fallback.

`/api/health` is a liveness check and does not prove database, Redis, SMTP or Travelport connectivity. See [deployment instructions](docs/DEPLOYMENT.md) for release requirements and [security notes](docs/SECURITY.md) for remaining operational work.

## Project layout

- `pages/`: Next.js page entry points and API handlers.
- `src/Pages/`, `src/Shared/`: existing feature screens and shared components.
- `src/theme/`, `src/index.css`, `src/App.css`: brand theme and shared presentation.
- `src/server/`: authentication, access checks, persistence, email and supplier token handling.
- `src/utils/`: client utilities and supplier response adapters.
- `prisma/`: schema and migrations.
- `tests/browser/`, `scripts/smoke.mjs`: repeatable smoke checks.
- `sample/`, `tessdata/`: existing supplier search fixtures and OCR runtime assets.

Private certification exports, booking logs, environment files, generated builds, test reports and local caches must stay outside published artifacts. Existing local and user-edited files are preserved.
