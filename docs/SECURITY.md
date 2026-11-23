# Security notes

The maintenance changes remove server API-key injection from the browser, require a same-origin write or a server credential, preserve route-level session checks, enforce customer ownership for PNR retrieval/ticketing/seat and ancillary mutations, bind prepared workbenches to their customer for commit/special-services changes, and require authentication for passport extraction. API responses are private/no-store. CSP restricts base URI, objects, framing and form destinations; it is not a strict nonce-based script policy. HSTS is sent in production.

JWT verification requires a secret of at least 32 characters and validates issuer, audience, algorithm and expiry. Expired JWTs are no longer accepted through the legacy token cache. Cookie parsing tolerates malformed input. Customer and administrator browser requests use HttpOnly cookies instead of persisting bearer credentials in local storage. Production cache/session operations fail closed when shared Redis is unavailable. Password creation/reset uses a common minimum of 12 characters with bcrypt's 72-byte limit.

Public contact/auth/OCR POST routes have server-side throttling. Behind multiple instances this relies on Redis and ingress-controlled client addresses. Contact lengths, remote OCR origins, image/download sizes and SMTP remote/file access are constrained. Generic production error messages avoid exposing exception internals.

This is targeted hardening, not a penetration test. Review every supplier workbench mutation, authorization edge case, privacy policy and payment flow in staging. Refer to the deployment checklist for release blockers. Never run live ticket smoke scripts against production as part of routine CI.
