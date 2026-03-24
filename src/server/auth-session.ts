import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import { cacheDelete, cacheGetJson, cacheSetJson } from "./redis-cache";

export const BOOKING_SESSION_COOKIE = "flyjatt_booking_session";
const BOOKING_SESSION_TTL_SEC = 60 * 60; // 1 hour
const AUTH_BEARER_PREFIX = "Bearer ";

type SessionUser = {
  id: number;
  email: string;
  name: string;
};

type SessionPayload = {
  user: SessionUser;
  createdAt: number;
  sessionId?: string;
  token?: string;
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

function getTokenCacheKey(token: string): string {
  return `booking:token:${token}`;
}

export function getSessionIdFromRequest(req: NextApiRequest): string {
  const cookies = parseCookies(req);
  return String(cookies[BOOKING_SESSION_COOKIE] || "").trim();
}

export function getBearerTokenFromRequest(req: NextApiRequest): string {
  const authHeader = String(req.headers.authorization || "").trim();
  if (!authHeader) return "";
  if (!authHeader.toLowerCase().startsWith(AUTH_BEARER_PREFIX.toLowerCase())) {
    return "";
  }
  return authHeader.slice(AUTH_BEARER_PREFIX.length).trim();
}

async function refreshSessionTtl(payload: SessionPayload) {
  const sessionId = String(payload?.sessionId || "").trim();
  const token = String(payload?.token || "").trim();
  if (sessionId) {
    await cacheSetJson(getSessionCacheKey(sessionId), payload, BOOKING_SESSION_TTL_SEC);
  }
  if (token) {
    await cacheSetJson(getTokenCacheKey(token), payload, BOOKING_SESSION_TTL_SEC);
  }
}

export async function getSessionUser(req: NextApiRequest): Promise<SessionUser | null> {
  const bearerToken = getBearerTokenFromRequest(req);
  if (bearerToken) {
    const tokenPayload = await cacheGetJson<SessionPayload>(getTokenCacheKey(bearerToken));
    if (tokenPayload?.user?.id) {
      await refreshSessionTtl(tokenPayload);
      return tokenPayload.user;
    }
  }

  const sessionId = getSessionIdFromRequest(req);
  if (!sessionId) return null;
  const payload = await cacheGetJson<SessionPayload>(getSessionCacheKey(sessionId));
  if (!payload?.user?.id) return null;

  // Keep an active session alive for the configured TTL window.
  await refreshSessionTtl(payload);

  return payload.user;
}

export async function createSession(
  req: NextApiRequest,
  res: NextApiResponse,
  user: SessionUser
): Promise<{ token: string }> {
  const existingSessionId = getSessionIdFromRequest(req);
  if (existingSessionId) {
    await cacheDelete(getSessionCacheKey(existingSessionId));
  }
  const existingToken = getBearerTokenFromRequest(req);
  if (existingToken) {
    await cacheDelete(getTokenCacheKey(existingToken));
  }

  const sessionId = randomBytes(32).toString("hex");
  const token = randomBytes(32).toString("hex");
  const payload: SessionPayload = {
    user,
    createdAt: Date.now(),
    sessionId,
    token,
  };

  await cacheSetJson(
    getSessionCacheKey(sessionId),
    payload,
    BOOKING_SESSION_TTL_SEC
  );
  await cacheSetJson(
    getTokenCacheKey(token),
    payload,
    BOOKING_SESSION_TTL_SEC
  );

  res.setHeader(
    "Set-Cookie",
    buildSetCookie(BOOKING_SESSION_COOKIE, sessionId, BOOKING_SESSION_TTL_SEC)
  );

  return { token };
}

export async function clearSession(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  const bearerToken = getBearerTokenFromRequest(req);
  const sessionId = getSessionIdFromRequest(req);

  if (bearerToken) {
    const tokenPayload = await cacheGetJson<SessionPayload>(getTokenCacheKey(bearerToken));
    if (tokenPayload?.sessionId) {
      await cacheDelete(getSessionCacheKey(tokenPayload.sessionId));
    }
    await cacheDelete(getTokenCacheKey(bearerToken));
  }

  if (sessionId) {
    const sessionPayload = await cacheGetJson<SessionPayload>(getSessionCacheKey(sessionId));
    if (sessionPayload?.token) {
      await cacheDelete(getTokenCacheKey(sessionPayload.token));
    }
    await cacheDelete(getSessionCacheKey(sessionId));
  }
  res.setHeader("Set-Cookie", buildSetCookie(BOOKING_SESSION_COOKIE, "", 0));
}
