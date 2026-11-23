# Deployment

## Prepare infrastructure

Use Node 22 LTS, HTTPS ingress, a backed-up MySQL database and a private shared Redis instance. Set `.env.example` variables through the hosting secret manager. Local `.env` and exported credentials must never be copied into an image or static bundle.

The trusted ingress must overwrite `X-Forwarded-For` before enabling `TRUST_PROXY=true`. Without trusted forwarding, throttling uses a conservative shared bucket. Keep application origins exact: `APP_URL` and `NEXT_PUBLIC_APP_URL` must identify the public HTTPS site. Service clients making writes without Origin need `x-api-key`; interactive customers still need a real user session.

Supply Travelport-approved production endpoints and credentials. The supplied `api.pp.travelport.net` / `auth.pp.travelport.net` endpoints are pre-production. Do not enable payment or live ticket issuance until payment reconciliation, ownership, duplicate prevention and failure recovery have passed an approved end-to-end staging exercise.

Set `PASSPORT_IMAGE_ORIGINS` only to controlled HTTPS storage origins. Remote OCR redirects are rejected, downloads are bounded, and an empty list disables remote image downloads. Base64 uploads require an authenticated customer.

## Database migrations

The initial migration reflects the existing schema. For a **new empty database**:

```sh
npm run prisma:deploy
```

For an **existing database**, first back up and compare its schema with `prisma/schema.prisma`. Only when it matches, baseline the initial migration without re-creating tables:

```sh
npx prisma migrate resolve --applied 20261121000000_initial
npm run prisma:deploy
```

Review schema drift before resolving. Never use `prisma migrate dev` or `db push` to change a live database. No migration has been applied to the connected database by this maintenance work.

## Build and release

```sh
npm ci
npm run prisma:generate
npm run check
npm run smoke:build
npx playwright install chromium
npm run test:browser
npm audit --audit-level=high
npm run check:production
npm run start
```

The optional Dockerfile runs the standalone Next.js output as a non-root user on port 3000. It has not been used to deploy this project. Inject production secrets at runtime.

Run the same smoke suite against the release URL, then verify customer/admin login, email verification/reset, account isolation, session revocation, Redis failure handling, actual supplier search, booking, ticket issuance and SMTP delivery with approved test accounts. The automated suite deliberately performs no financial or supplier mutations.

## Operational release requirements

- Rotate the API key previously exposed in browser bundles. Remove any old `NEXT_PUBLIC_API_KEY` variable and replace deployed assets.
- Review private exports already tracked under `cert/` and any historical credentials/PII. Adding ignore rules does not remove files from Git history. Preserve required certification records in restricted storage, remove private exports from the release repository and rotate affected credentials.
- Verify dependency security on the release date; CI gates high severity findings.
- Verify database backups and restore procedures, TLS renewal, Redis availability, alerting and log retention. Raw supplier payload logging and search-fixture writes are disabled in production.
- Establish a durable email queue worker before relying on background email retries in a serverless deployment. The existing request-triggered queue processor is not a separately supervised worker.
- Review static promotional fares/coupons against commercially approved content before launch.
- Workbench previews are bound to the customer in shared Redis for one hour; expired previews must be created again. Validate this across instances during staging.

Passing the build and smoke checks establishes code-level validation. It does not certify supplier access, payment processing, operational controls or live deployment readiness.
