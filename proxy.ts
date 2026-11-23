import { apiErrorBody } from "@/server/api-handler";
import { timingSafeEqual, createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cacheIncr } from "@/server/redis-cache";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const RATE_LIMITED = /\/api\/(auth\/(login|register|forgot-?password|reset-?password|send-verification-email)|admin\/login|contact|passport\/extract-local)$/i;

function hasServerKey(req: NextRequest): boolean {
  const expected = process.env.API_KEY?.trim();
  const supplied = req.headers.get("x-api-key")?.trim() ||
    req.headers.get("authorization")?.replace(/^ApiKey\s+/i, "");
  if (!expected || !supplied) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(supplied);
  return a.length === b.length && timingSafeEqual(a, b);
}

function isSameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get("origin");
  if (!origin || origin === "null") return false;
  const allowed = new Set([req.nextUrl.origin]);
  // Next may normalize nextUrl to localhost behind a local/reverse proxy.
  const host = req.headers.get("host");
  if (host) {
    try { allowed.add(new URL(`${req.nextUrl.protocol}//${host}`).origin); } catch { /* invalid host */ }
  }
  const configured = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    try { allowed.add(new URL(configured).origin); } catch { /* fail closed */ }
  }
  return allowed.has(origin);
}

export async function proxy(req: NextRequest) {
  const serverClient = hasServerKey(req);
  // Browser clients use HttpOnly sessions. A service key never grants user access.
  if (!SAFE_METHODS.has(req.method) && !serverClient && !isSameOrigin(req)) {
    return NextResponse.json(apiErrorBody(403, "Request origin is not allowed.", "ORIGIN_NOT_ALLOWED"), { status: 403 });
  }
  if (req.method === "POST" && req.nextUrl.pathname === "/api/passport/extract-local" &&
      !req.cookies.get("flyjatt_booking_session")?.value &&
      !req.headers.get("authorization")?.startsWith("Bearer ")) {
    return NextResponse.json(apiErrorBody(401, "Please sign in to scan a passport."), { status: 401 });
  }
  if (RATE_LIMITED.test(req.nextUrl.pathname) && req.method === "POST") {
    // Only trust forwarded addresses when the ingress overwrites these headers.
    const address = process.env.TRUST_PROXY === "true"
      ? (req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown")
      : "untrusted-ingress";
    const fingerprint = createHash("sha256").update(address).digest("hex");
    const window = Math.floor(Date.now() / 60_000);
    try {
      const count = await cacheIncr(`http:rate:${req.nextUrl.pathname}:${fingerprint}:${window}`, 120);
      if (count > 10) {
        return NextResponse.json(apiErrorBody(429, "Too many requests. Please try again shortly."), {
          status: 429, headers: { "Retry-After": "60" },
        });
      }
    } catch {
      return NextResponse.json(apiErrorBody(503, "Service temporarily unavailable."), { status: 503 });
    }
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
