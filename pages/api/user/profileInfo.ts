import { withApiHandler } from "@/server/api-handler";
import { publicErrorMessage } from "@/server/public-error";
import type { NextApiRequest, NextApiResponse } from "next";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { getSessionUser } from "@/server/auth-session";

type SuccessResponse = {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    phone: string;
    gender: string;
    nationality: string;
    dob: string;
    dateOfBirth: string | null;
    passport: string;
    passportNumber: string;
    passportCountry: string;
    passportIssuingCountry: string;
    passportexp: string;
    passportExp: string;
    passportExpiryDate: string | null;
    fullName: string;
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
    return {
        firstName: parts[0] || "",
        lastName: parts.slice(1).join(" "),
    };
}

function toIsoDate(value: Date | null): string | null {
    return value ? value.toISOString() : null;
}

async function handler(
    req: NextApiRequest,
    res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        assertDatabaseConfigured();

        const sessionUser = await getSessionUser(req);
        if (!sessionUser?.id) {
            return res.status(401).json({ message: "Login required" });
        }

        const user = await prisma.user.findUnique({
            where: { id: sessionUser.id },
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

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const split = splitName(toText(user.name));
        const firstName = toText(user.givenName) || split.firstName;
        const lastName = toText(user.surName) || split.lastName;
        const fullName = [firstName, lastName].filter(Boolean).join(" ");
        const dob = toIsoDate(user.dateOfBirth);
        const passportExpiryDate = toIsoDate(user.passportExpiryDate);
        const passportNumber = toText(user.passportNumber);
        const passportIssuingCountry = toText(user.passportIssuingCountry);

        return res.status(200).json({
            id: user.id,
            firstName,
            lastName,
            email: user.email,
            address: toText(user.address),
            phone: toText(user.phone),
            gender: toText(user.gender),
            nationality: toText(user.nationality),
            dob: dob || "",
            dateOfBirth: dob,
            passport: passportNumber,
            passportNumber,
            passportCountry: passportIssuingCountry,
            passportIssuingCountry,
            passportexp: passportExpiryDate || "",
            passportExp: passportExpiryDate || "",
            passportExpiryDate,
            fullName,
        });
    } catch (error) {
        return res.status(500).json({
            message: publicErrorMessage(error, "Unable to load profile"),
        });
    }
}

export default withApiHandler(handler, { methods: ["GET"] });

export const config = { api: { bodyParser: false } };
