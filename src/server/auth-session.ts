import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import { cacheDelete, cacheGetJson, cacheSetJson } from "./redis-cache";

export const BOOKING_SESSION_COOKIE = "flyjatt_booking_session";
const BOOKING_SESSION_TTL_SEC = 7 * 24 * 60 * 60;

type SessionUser = {
  id: number;
  email: string;
  name: string;
};

type SessionPayload = {
  user: SessionUser;
  createdAt: number;
};

function parseCookies(req: NextApiRequest): Record<string, string> {
  const raw = req.headers.cookie || "";
  return raw.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.split("=");
    const cookieKey = decodeURIComponent(String(key || "").trim());
    if (!cookieKey) return acc;
    acc[cookieKey] = decodeURIComponent(rest.join("=").trim());
    return acc;
  }, {});
}

function buildSetCookie(name: string, value: string, maxAgeSec: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${encodeURIComponent(name)}=${encodeURIComponent(
    value
  )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSec}${secure}`;
}

function getSessionCacheKey(sessionId: string): string {
  return `booking:session:${sessionId}`;
}

export function getSessionIdFromRequest(req: NextApiRequest): string {
  const cookies = parseCookies(req);
  return String(cookies[BOOKING_SESSION_COOKIE] || "").trim();
}

export async function getSessionUser(req: NextApiRequest): Promise<SessionUser | null> {
  const sessionId = getSessionIdFromRequest(req);
  if (!sessionId) return null;
  const payload = await cacheGetJson<SessionPayload>(getSessionCacheKey(sessionId));
  if (!payload?.user?.id) return null;
  return payload.user;
}

export async function createSession(
  req: NextApiRequest,
  res: NextApiResponse,
  user: SessionUser
): Promise<void> {
  const existingSessionId = getSessionIdFromRequest(req);
  if (existingSessionId) {
    await cacheDelete(getSessionCacheKey(existingSessionId));
  }

  const sessionId = randomBytes(32).toString("hex");
  await cacheSetJson(
    getSessionCacheKey(sessionId),
    {
      user,
      createdAt: Date.now(),
    } satisfies SessionPayload,
    BOOKING_SESSION_TTL_SEC
  );

  res.setHeader(
    "Set-Cookie",
    buildSetCookie(BOOKING_SESSION_COOKIE, sessionId, BOOKING_SESSION_TTL_SEC)
  );
}

export async function clearSession(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const sessionId = getSessionIdFromRequest(req);
  if (sessionId) {
    await cacheDelete(getSessionCacheKey(sessionId));
  }
  res.setHeader("Set-Cookie", buildSetCookie(BOOKING_SESSION_COOKIE, "", 0));
}
