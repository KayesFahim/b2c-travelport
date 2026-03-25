import type { NextApiRequest, NextApiResponse } from "next";
import { randomBytes } from "crypto";
import { cacheDelete, cacheGetJson, cacheSetJson } from "./redis-cache";
import { issueSessionJwt, verifySessionJwt } from "./jwt-session";

export const ADMIN_SESSION_COOKIE = "flyjatt_admin_session";
const ADMIN_SESSION_TTL_SEC = 60 * 60;
const AUTH_BEARER_PREFIX = "Bearer ";

export type AdminSessionUser = {
    id: number;
    email: string;
    name: string;
    role: string;
    admin: true;
};

type SessionPayload = {
    user: AdminSessionUser;
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
    return `admin:session:${sessionId}`;
}

function getTokenCacheKey(token: string): string {
    return `admin:token:${token}`;
}

function getSessionIdFromRequest(req: NextApiRequest): string {
    const cookies = parseCookies(req);
    return String(cookies[ADMIN_SESSION_COOKIE] || "").trim();
}

function getBearerTokenFromRequest(req: NextApiRequest): string {
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
        await cacheSetJson(getSessionCacheKey(sessionId), payload, ADMIN_SESSION_TTL_SEC);
    }
    if (token) {
        await cacheSetJson(getTokenCacheKey(token), payload, ADMIN_SESSION_TTL_SEC);
    }
}

export async function getAdminSessionUser(req: NextApiRequest): Promise<AdminSessionUser | null> {
    const bearerToken = getBearerTokenFromRequest(req);
    if (bearerToken) {
        const claims = await verifySessionJwt(bearerToken);
        if (claims?.sid) {
            const jwtSessionPayload = await cacheGetJson<SessionPayload>(
                getSessionCacheKey(String(claims.sid))
            );
            if (jwtSessionPayload?.user?.id && String(jwtSessionPayload.user.id) === String(claims.sub)) {
                await refreshSessionTtl(jwtSessionPayload);
                return jwtSessionPayload.user;
            }
        }

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

    await refreshSessionTtl(payload);
    return payload.user;
}

export async function createAdminSession(
    req: NextApiRequest,
    res: NextApiResponse,
    user: AdminSessionUser
): Promise<{ token: string }> {
    const existingSessionId = getSessionIdFromRequest(req);
    if (existingSessionId) {
        await cacheDelete(getSessionCacheKey(existingSessionId));
    }

    const existingToken = getBearerTokenFromRequest(req);
    if (existingToken) {
        const existingClaims = await verifySessionJwt(existingToken);
        if (existingClaims?.sid) {
            await cacheDelete(getSessionCacheKey(String(existingClaims.sid)));
        }
        await cacheDelete(getTokenCacheKey(existingToken));
    }

    const sessionId = randomBytes(32).toString("hex");
    const token = await issueSessionJwt(user, sessionId, ADMIN_SESSION_TTL_SEC);
    const payload: SessionPayload = {
        user,
        createdAt: Date.now(),
        sessionId,
        token,
    };

    await cacheSetJson(getSessionCacheKey(sessionId), payload, ADMIN_SESSION_TTL_SEC);
    await cacheSetJson(getTokenCacheKey(token), payload, ADMIN_SESSION_TTL_SEC);

    res.setHeader(
        "Set-Cookie",
        buildSetCookie(ADMIN_SESSION_COOKIE, sessionId, ADMIN_SESSION_TTL_SEC)
    );

    return { token };
}

export async function clearAdminSession(
    req: NextApiRequest,
    res: NextApiResponse
): Promise<void> {
    const bearerToken = getBearerTokenFromRequest(req);
    const sessionId = getSessionIdFromRequest(req);

    if (bearerToken) {
        const claims = await verifySessionJwt(bearerToken);
        if (claims?.sid) {
            await cacheDelete(getSessionCacheKey(String(claims.sid)));
        }

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

    res.setHeader("Set-Cookie", buildSetCookie(ADMIN_SESSION_COOKIE, "", 0));
}