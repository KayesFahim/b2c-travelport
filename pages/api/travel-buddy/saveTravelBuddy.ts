import type { NextApiRequest, NextApiResponse } from "next";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { getSessionUser } from "@/server/auth-session";
import {
    buildTravelBuddyPayload,
    parseOptionalDate,
    toText,
} from "@/server/travel-buddy";

type SuccessResponse = {
    message: string;
    travelBuddy: ReturnType<typeof buildTravelBuddyPayload>;
};

type ErrorResponse = {
    message: string;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        assertDatabaseConfigured();

        const sessionUser = await getSessionUser(req);
        if (!sessionUser?.id) {
            return res.status(401).json({ message: "Login required" });
        }

        const body = (req.body ?? {}) as Record<string, unknown>;
        const title = toText(body.title);
        const firstName = toText(body.firstName);
        const lastName = toText(body.lastName);
        const paxtype = toText(body.paxtype);
        const gender = toText(body.gender);
        const nationality = toText(body.nationality || body.nationility);
        const dateOfBirth = parseOptionalDate(body.dob || body.dateOfBirth);
        const passportNumber = toText(body.passport || body.passportNumber);
        const passportExpiryDate = parseOptionalDate(body.passportexp || body.passportExpiryDate);

        if (!title || !firstName || !lastName || !paxtype) {
            return res.status(400).json({
                message: "Title, first name, last name and passenger type are required",
            });
        }

        const travelBuddy = await prisma.travelBuddy.create({
            data: {
                userId: sessionUser.id,
                title: title || null,
                firstName: firstName || null,
                lastName: lastName || null,
                paxtype: paxtype || null,
                gender: gender || null,
                nationality: nationality || null,
                dateOfBirth,
                passportNumber: passportNumber || null,
                passportExpiryDate,
            },
        });

        return res.status(201).json({
            message: "Travel buddy saved successfully",
            travelBuddy: buildTravelBuddyPayload(travelBuddy),
        });
    } catch (error) {
        return res.status(500).json({
            message: error instanceof Error ? error.message : "Unable to save travel buddy",
        });
    }
}
