import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { cacheDelete, cacheGetJson, cacheSetJson } from "@/server/redis-cache";
import { prisma } from "@/server/prisma";
import { sendEmail } from "@/server/email/mailer";
import {
    buildVerifyEmailTemplate,
    buildForgotPasswordTemplate,
    buildBookingTemplate,
    buildTicketTemplate,
} from "@/server/email/templates";
import { createBookingPdf, createTicketPdf } from "@/server/email/pdf";

const VERIFY_TOKEN_TTL_SECONDS = 24 * 60 * 60;
const RESET_TOKEN_TTL_SECONDS = 60 * 60;
const VERIFIED_CACHE_TTL_SECONDS = 10 * 365 * 24 * 60 * 60;

function toText(value: unknown): string {
    return String(value ?? "").trim();
}

function appBaseUrl(): string {
    return (
        toText(process.env.NEXT_PUBLIC_APP_URL) ||
        toText(process.env.APP_BASE_URL) ||
        "http://localhost:3000"
    ).replace(/\/$/, "");
}

export function emailVerificationRequired(): boolean {
    const raw = toText(process.env.EMAIL_VERIFICATION_REQUIRED).toLowerCase();
    if (!raw) return true;
    return raw === "true" || raw === "1" || raw === "yes";
}

type VerifyTokenPayload = {
    userId: number;
    email: string;
};

type ResetTokenPayload = {
    userId: number;
    email: string;
};

function verifyTokenKey(token: string): string {
    return `auth:verify:${token}`;
}

function resetTokenKey(token: string): string {
    return `auth:reset:${token}`;
}

function verifiedUserKey(userId: number): string {
    return `auth:verified:user:${userId}`;
}

export async function isUserEmailVerified(userId: number): Promise<boolean> {
    if (!emailVerificationRequired()) return true;
    // Fast path: check cache first to avoid DB round-trip on hot path.
    const cached = await cacheGetJson<{ verified: boolean }>(verifiedUserKey(userId));
    if (cached?.verified) return true;
    // Fall back to DB for durability across cache restarts.
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { emailVerified: true },
    });
    if (user?.emailVerified) {
        await cacheSetJson(verifiedUserKey(userId), { verified: true }, VERIFIED_CACHE_TTL_SECONDS);
        return true;
    }
    return false;
}

export async function issueEmailVerification(user: {
    id: number;
    email: string;
    name?: string | null;
}): Promise<void> {
    const token = randomBytes(24).toString("hex");
    const payload: VerifyTokenPayload = { userId: user.id, email: user.email };
    await cacheSetJson(verifyTokenKey(token), payload, VERIFY_TOKEN_TTL_SECONDS);

    const verifyUrl = `${appBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    const template = buildVerifyEmailTemplate({
        name: toText(user.name) || "Traveler",
        verifyUrl,
    });

    await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
    });
}

export async function verifyEmailToken(token: string): Promise<VerifyTokenPayload | null> {
    if (!token) return null;
    const payload = await cacheGetJson<VerifyTokenPayload>(verifyTokenKey(token));
    if (!payload?.userId || !payload?.email) return null;

    // Persist to DB for durability across cache restarts.
    try {
        await prisma.user.update({
            where: { id: payload.userId },
            data: { emailVerified: true },
        });
    } catch {
        // Cache-only fallback if DB is momentarily unreachable.
    }
    await cacheSetJson(verifiedUserKey(payload.userId), { verified: true }, VERIFIED_CACHE_TTL_SECONDS);
    await cacheDelete(verifyTokenKey(token));
    return payload;
}

export async function issueForgotPassword(emailRaw: string): Promise<void> {
    const email = toText(emailRaw).toLowerCase();
    if (!email) return;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const token = randomBytes(24).toString("hex");
    const payload: ResetTokenPayload = { userId: user.id, email: user.email };
    await cacheSetJson(resetTokenKey(token), payload, RESET_TOKEN_TTL_SECONDS);

    // /resetpassword is the React SPA route handled by ChangePassword.jsx
    const resetUrl = `${appBaseUrl()}/resetpassword?token=${encodeURIComponent(token)}`;
    const template = buildForgotPasswordTemplate({
        name: toText(user.name) || "Traveler",
        resetUrl,
    });

    await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
    });
}

export async function resetPasswordWithToken(params: {
    token: string;
    newPassword: string;
}): Promise<boolean> {
    const token = toText(params.token);
    const newPassword = String(params.newPassword || "");
    if (!token || newPassword.length < 6) return false;

    const payload = await cacheGetJson<ResetTokenPayload>(resetTokenKey(token));
    if (!payload?.email || !payload?.userId) return false;

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: payload.userId },
        data: { passwordHash },
    });

    await cacheDelete(resetTokenKey(token));
    return true;
}

function toDisplayDate(value: unknown): string {
    const raw = toText(value);
    if (!raw) return "N/A";
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toISOString().split("T")[0] || raw;
}

export async function sendBookingConfirmationEmail(params: {
    to: string;
    name: string;
    locator: string;
    reservationId: string;
    route: string;
    travelDate: string;
    amount: string;
}): Promise<void> {
    const to = toText(params.to).toLowerCase();
    if (!to || !to.includes("@")) return;

    const template = buildBookingTemplate({
        name: params.name,
        locator: params.locator,
        reservationId: params.reservationId,
        route: params.route,
        travelDate: toDisplayDate(params.travelDate),
        amount: params.amount,
    });

    const pdf = await createBookingPdf({
        name: params.name,
        locator: params.locator,
        reservationId: params.reservationId,
        route: params.route,
        travelDate: toDisplayDate(params.travelDate),
        amount: params.amount,
    });

    await sendEmail({
        to,
        sender: "booking",
        subject: template.subject,
        html: template.html,
        text: template.text,
        attachments: [
            {
                filename: `booking-${toText(params.locator) || toText(params.reservationId) || "copy"}.pdf`,
                content: pdf,
            },
        ],
    });
}

export async function sendTicketIssuedEmail(params: {
    to: string;
    name: string;
    locator: string;
    reservationId: string;
    route: string;
    ticketInfo: string;
}): Promise<void> {
    const to = toText(params.to).toLowerCase();
    if (!to || !to.includes("@")) return;

    const template = buildTicketTemplate({
        name: params.name,
        locator: params.locator,
        reservationId: params.reservationId,
        route: params.route,
        ticketInfo: params.ticketInfo,
    });

    const pdf = await createTicketPdf({
        name: params.name,
        locator: params.locator,
        reservationId: params.reservationId,
        route: params.route,
        ticketInfo: params.ticketInfo,
    });

    await sendEmail({
        to,
        sender: "ticket",
        subject: template.subject,
        html: template.html,
        text: template.text,
        attachments: [
            {
                filename: `ticket-${toText(params.locator) || toText(params.reservationId) || "copy"}.pdf`,
                content: pdf,
            },
        ],
    });
}
