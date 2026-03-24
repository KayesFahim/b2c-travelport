import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { verifySessionJwt } from "@/server/jwt-session";

const PUBLIC_API_PATHS = new Set([
    "/api/auth/login",
    "/api/auth/register",
    "/api/contact",
    "/api/homepage",
    "/api/cms/blog",
]);

const PROTECTED_PREFIXES = [
    "/api/admin",
    "/api/user",
    "/api/travel-buddy",
    "/api/travelport",
    "/api/auth/me",
    "/api/auth/logout",
    "/api/cms/settings",
];

function getAllowedOrigins(requestOrigin: string): Set<string> {
    const configured = String(process.env.ALLOWED_API_ORIGINS || "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);

    return new Set([requestOrigin, ...configured]);
}

function normalizeIp(ipRaw: string): string {
    const ip = String(ipRaw || "").trim();
    if (!ip) return "";
    if (ip.startsWith("::ffff:")) {
        return ip.replace("::ffff:", "");
    }
    return ip;
}

function getClientIp(req: NextRequest): string {
    const forwarded = String(req.headers.get("x-forwarded-for") || "").trim();
    const firstForwarded = forwarded.split(",")[0]?.trim();
    if (firstForwarded) return normalizeIp(firstForwarded);

    const realIp = String(req.headers.get("x-real-ip") || "").trim();
    if (realIp) return normalizeIp(realIp);

    return normalizeIp(String((req as unknown as { ip?: string }).ip || ""));
}

function isLocalhostIp(ip: string): boolean {
    return ip === "127.0.0.1" || ip === "::1" || ip === "localhost";
}

function isClientIpAllowed(req: NextRequest): boolean {
    const clientIp = getClientIp(req);
    if (!clientIp) return false;

    const configuredAllowedIps = String(process.env.ALLOWED_API_IPS || "")
        .split(",")
        .map((entry) => normalizeIp(entry))
        .filter(Boolean);

    const allowed = new Set<string>(
        configuredAllowedIps.length > 0
            ? configuredAllowedIps
            : ["127.0.0.1", "::1", "localhost"]
    );

    if (allowed.has(clientIp)) return true;
    if (isLocalhostIp(clientIp) && [...allowed].some((item) => isLocalhostIp(item))) {
        return true;
    }
    return false;
}

function isOriginAllowed(req: NextRequest): boolean {
    const requestOrigin = req.nextUrl.origin;
    const allowedOrigins = getAllowedOrigins(requestOrigin);

    const originHeader = req.headers.get("origin");
    if (originHeader && !allowedOrigins.has(originHeader)) {
        return false;
    }

    const refererHeader = req.headers.get("referer");
    if (refererHeader) {
        try {
            const refererOrigin = new URL(refererHeader).origin;
            if (!allowedOrigins.has(refererOrigin)) {
                return false;
            }
        } catch {
            return false;
        }
    }

    return true;
}

function getBearerToken(req: NextRequest): string {
    const authHeader = String(req.headers.get("authorization") || "").trim();
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
        return "";
    }
    return authHeader.slice(7).trim();
}

function isProtectedPath(pathname: string): boolean {
    if (PUBLIC_API_PATHS.has(pathname)) return false;
    return PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;
    if (!pathname.startsWith("/api/")) {
        return NextResponse.next();
    }

    if (!isClientIpAllowed(req)) {
        return NextResponse.json({ message: "API access denied for this IP" }, { status: 403 });
    }

    if (!isOriginAllowed(req)) {
        return NextResponse.json({ message: "API access denied from this origin" }, { status: 403 });
    }

    if (!isProtectedPath(pathname)) {
        return NextResponse.next();
    }

    const token = getBearerToken(req);
    if (!token) {
        return NextResponse.json({ message: "Authorization token is required" }, { status: 401 });
    }

    const claims = await verifySessionJwt(token);
    if (!claims?.sub || !claims?.sid) {
        return NextResponse.json({ message: "Invalid or expired authorization token" }, { status: 401 });
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/api/:path*"],
};
