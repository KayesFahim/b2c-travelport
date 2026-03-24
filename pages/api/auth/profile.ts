import type { NextApiRequest, NextApiResponse } from "next";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { getSessionUser } from "@/server/auth-session";

type ProfileResponse = {
    id: number;
    email: string;
    name: string;
    fullName: string;
    firstName: string;
    lastName: string;
    phone: string;
    gender: string;
    dob: string;
    dateOfBirth: string | null;
    nationality: string;
    address: string;
    passport: string;
    passportNumber: string;
    passportCountry: string;
    passportIssuingCountry: string;
    passportexp: string;
    passportExp: string;
    passportExpiryDate: string | null;
    admin: boolean;
    role: string;
    createdAt: string | null;
    updatedAt: string | null;
};

type ErrorResponse = { message: string };

function toText(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return "";
}

function splitName(full: string): { firstName: string; lastName: string } {
    const parts = full.trim().split(/\s+/).filter(Boolean);
    return { firstName: parts[0] || "", lastName: parts.slice(1).join(" ") };
}

function toIso(value: Date | null | undefined): string | null {
    return value ? value.toISOString() : null;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ProfileResponse | ErrorResponse>
) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ message: "Method not allowed" });
    }

    const sessionUser = await getSessionUser(req);
    if (!sessionUser?.id) {
        return res.status(401).json({ message: "Not authenticated" });
    }

    try {
        assertDatabaseConfigured();

        const user = await prisma.user.findUnique({
            where: { id: sessionUser.id },
            select: {
                id: true,
                email: true,
                name: true,
                givenName: true,
                surName: true,
                phone: true,
                gender: true,
                dateOfBirth: true,
                nationality: true,
                address: true,
                passportNumber: true,
                passportIssuingCountry: true,
                passportExpiryDate: true,
                admin: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const split = splitName(toText(user.name));
        const firstName = toText(user.givenName) || split.firstName;
        const lastName = toText(user.surName) || split.lastName;
        const fullName = [firstName, lastName].filter(Boolean).join(" ") || toText(user.name);
        const dob = toIso(user.dateOfBirth);
        const passportExpiryDate = toIso(user.passportExpiryDate);
        const passportNumber = toText(user.passportNumber);
        const passportIssuingCountry = toText(user.passportIssuingCountry);

        return res.status(200).json({
            id: user.id,
            email: user.email,
            name: toText(user.name),
            fullName,
            firstName,
            lastName,
            phone: toText(user.phone),
            gender: toText(user.gender),
            dob: dob || "",
            dateOfBirth: dob,
            nationality: toText(user.nationality) || "BD",
            address: toText(user.address),
            passport: passportNumber,
            passportNumber,
            passportCountry: passportIssuingCountry,
            passportIssuingCountry,
            passportexp: passportExpiryDate || "",
            passportExp: passportExpiryDate || "",
            passportExpiryDate,
            admin: user.admin,
            role: user.role,
            createdAt: toIso(user.createdAt),
            updatedAt: toIso(user.updatedAt),
        });
    } catch (error) {
        console.error("[/api/auth/profile]", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}
