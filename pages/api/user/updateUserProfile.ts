import type { NextApiRequest, NextApiResponse } from "next";
import { Prisma } from "@prisma/client";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { getSessionUser } from "@/server/auth-session";

type SuccessResponse = {
    message: string;
    profile: {
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        address: string;
        phone: string;
        gender: string;
        nationality: string;
        dateOfBirth: string | null;
        passportNumber: string;
        passportIssuingCountry: string;
        passportExpiryDate: string | null;
    };
};

type ErrorResponse = {
    message: string;
};

function toText(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return "";
}

function splitName(fullName: string): { firstName: string; lastName: string } {
    const clean = toText(fullName);
    if (!clean) return { firstName: "", lastName: "" };
    const parts = clean.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || "";
    const lastName = parts.slice(1).join(" ");
    return { firstName, lastName };
}

function normalizePhone(value: unknown): string {
    return toText(value).replace(/[^0-9+]/g, "");
}

function parseDateValue(value: unknown): Date | null {
    const raw = toText(value);
    if (!raw) return null;

    const normalized = raw.replace(/\//g, "-");
    const ddmmyyyy = normalized.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddmmyyyy) {
        const [, dd, mm, yyyy] = ddmmyyyy;
        const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    const iso = new Date(normalized);
    return Number.isNaN(iso.getTime()) ? null : iso;
}

function toIsoDateString(value: Date | null): string | null {
    if (!value) return null;
    return value.toISOString();
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
    if (req.method !== "PATCH") {
        res.setHeader("Allow", "PATCH");
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        assertDatabaseConfigured();

        const sessionUser = await getSessionUser(req);
        if (!sessionUser?.id) {
            return res.status(401).json({ message: "Login required" });
        }

        const body = (req.body ?? {}) as Record<string, unknown>;
        const email = toText(body.email).toLowerCase();
        const fullName = toText(body.fullName || body.name);
        const explicitGivenName = toText(body.givenName || body.firstName);
        const explicitSurName = toText(body.surName || body.lastName);
        const address = toText(body.address);
        const phone = normalizePhone(body.phone);
        const gender = toText(body.gender);
        const nationality = toText(body.nationality || body.nationility);
        const dateOfBirth = parseDateValue(body.dateOfBirth || body.dob);
        const passportNumber = toText(body.passportNumber || body.passport);
        const passportIssuingCountry = toText(
            body.passportIssuingCountry || body.passportCountry || body.nationality || body.nationility
        );
        const passportExpiryDate = parseDateValue(
            body.passportExpiryDate || body.passportExp || body.passportexp
        );

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const { firstName, lastName } = splitName(fullName);
        const resolvedGivenName = explicitGivenName || firstName;
        const resolvedSurName = explicitSurName || lastName;
        const resolvedName = [resolvedGivenName, resolvedSurName].filter(Boolean).join(" ");

        const updatedUser = await prisma.user.update({
            where: { id: sessionUser.id },
            data: {
                email,
                name: resolvedName || null,
                givenName: resolvedGivenName || null,
                surName: resolvedSurName || null,
                address: address || null,
                phone: phone || null,
                dateOfBirth,
                passportNumber: passportNumber || null,
                passportIssuingCountry: passportIssuingCountry || null,
                passportExpiryDate,
                nationality: nationality || null,
                gender: gender || null,
            },
            select: {
                id: true,
                email: true,
                name: true,
                givenName: true,
                surName: true,
                address: true,
                phone: true,
                dateOfBirth: true,
                passportNumber: true,
                passportIssuingCountry: true,
                passportExpiryDate: true,
                nationality: true,
                gender: true,
            },
        });

        const finalName = toText(updatedUser.name);
        const split = splitName(finalName);

        return res.status(200).json({
            message: "Profile updated successfully",
            profile: {
                id: updatedUser.id,
                firstName: toText(updatedUser.givenName) || split.firstName,
                lastName: toText(updatedUser.surName) || split.lastName,
                email: updatedUser.email,
                address: toText(updatedUser.address),
                phone: toText(updatedUser.phone),
                gender: toText(updatedUser.gender),
                nationality: toText(updatedUser.nationality),
                dateOfBirth: toIsoDateString(updatedUser.dateOfBirth),
                passportNumber: toText(updatedUser.passportNumber),
                passportIssuingCountry: toText(updatedUser.passportIssuingCountry),
                passportExpiryDate: toIsoDateString(updatedUser.passportExpiryDate),
            },
        });
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return res.status(409).json({ message: "Email is already in use" });
        }

        return res.status(500).json({
            message: error instanceof Error ? error.message : "Unable to update profile",
        });
    }
}
