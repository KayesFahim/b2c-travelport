# Validation record — 21 November 2026

- `npm run check`: passed ESLint and TypeScript.
- `npm run prisma:generate`: passed with Prisma 6.19.3. No database migration was applied.
- `npm run smoke:build`: passed the production build and 12 public HTTP route/header checks.
- `PLAYWRIGHT_CHROME=1 npm run test:browser`: 18 checks passed across desktop Chrome and mobile Chrome emulation. Includes homepage layout, section width, public route rendering, keyboard navigation, anonymous reservation/OCR rejection, cross-origin mutation rejection, response headers, malformed cookies, password limits and JWT rejection cases.
- `npm audit`: zero known vulnerabilities across production and development dependencies at validation time.
- `git diff --check`: passed.
- Browser bundle scan: selected server credential values from the local environment were not found in `.next/static` output; secret values were not printed.

Screenshots: `artifacts/home-desktop.png` and `artifacts/home-mobile.png` (ignored local artifacts). Offscreen lazy images may not appear until scrolled into view.

`npm run check:production` correctly fails against the current development configuration: no HTTPS `APP_URL`, Travelport pre-production endpoints and no configured trusted ingress. Deployment must also address the certification exports/credential rotation and email worker requirements described in [DEPLOYMENT.md](DEPLOYMENT.md).

Not verified: Docker image execution, actual MySQL migration/restore, multi-instance authenticated flows, SMTP delivery, real supplier search/booking/payment/ticket issuance, native mobile Safari or penetration testing. No live supplier booking or ticket was created by these checks.
