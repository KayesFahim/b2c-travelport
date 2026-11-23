import type { NextApiRequest } from "next";

/** Ignore malformed cookies instead of letting URI decoding crash an API request. */
export function parseCookies(req: Pick<NextApiRequest, "headers">): Record<string, string> {
  const cookies: Record<string, string> = Object.create(null);
  for (const part of (req.headers.cookie || "").split(";")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    try {
      const key = decodeURIComponent(part.slice(0, separator).trim());
      cookies[key] = decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      // Other valid session cookies can still be used.
    }
  }
  return cookies;
}
