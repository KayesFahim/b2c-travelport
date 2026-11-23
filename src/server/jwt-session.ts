import { SignJWT, jwtVerify, type JWTPayload } from "jose";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const ISSUER = "flyjatt-api";
const AUDIENCE = "flyjatt-client";

export type JwtSessionClaims = JWTPayload & {
    sub: string;
    sid: string;
    email: string;
    name: string;
    role: string;
    admin: boolean;
};

type SessionUserLike = {
    id: number;
    email: string;
    name: string;
    role: string;
    admin: boolean;
};

function getJwtSecret(): Uint8Array | null {
    const raw = String(process.env.JWT_SESSION_SECRET || "").trim();
    if (raw.length < 32) return null;
    return new TextEncoder().encode(raw);
}

export async function issueSessionJwt(
    user: SessionUserLike,
    sessionId: string,
    ttlSeconds = ACCESS_TOKEN_TTL_SECONDS
): Promise<string> {
    const secret = getJwtSecret();
    if (!secret) {
        throw new Error("JWT_SESSION_SECRET is required to issue session tokens");
    }

    const now = Math.floor(Date.now() / 1000);
    return await new SignJWT({
        email: user.email,
        name: user.name,
        role: user.role,
        admin: Boolean(user.admin),
        sid: sessionId,
    })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setSubject(String(user.id))
        .setIssuedAt(now)
        .setExpirationTime(now + Math.max(60, Math.floor(ttlSeconds)))
        .sign(secret);
}

export async function verifySessionJwt(token: string): Promise<JwtSessionClaims | null> {
    const secret = getJwtSecret();
    if (!secret) return null;

    try {
        const { payload } = await jwtVerify(token, secret, {
            issuer: ISSUER,
            audience: AUDIENCE,
            algorithms: ["HS256"],
        });

        if (!payload?.sub || !payload?.sid) {
            return null;
        }

        return payload as JwtSessionClaims;
    } catch {
        return null;
    }
}
