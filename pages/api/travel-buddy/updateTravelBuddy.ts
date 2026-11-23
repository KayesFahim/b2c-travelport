import { withApiHandler } from "@/server/api-handler";
import { publicErrorMessage } from "@/server/public-error";
import type { NextApiRequest, NextApiResponse } from "next";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { getSessionUser } from "@/server/auth-session";
import {
    buildTravelBuddyPayload,
    parseOptionalDate,
    toText,
    toUpperText,
} from "@/server/travel-buddy";

type SuccessResponse = {
    message: string;
    travelBuddy: ReturnType<typeof buildTravelBuddyPayload>;
};

type ErrorResponse = {
    message: string;
};

async function handler(
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
        const id = Number(body.id);
        const title = toText(body.title);
        const firstName = toUpperText(body.firstName);
        const lastName = toUpperText(body.lastName);
        const paxtype = toUpperText(body.paxtype);
        const gender = toText(body.gender);
        const nationality = toUpperText(body.nationality || body.nationility);
        const dateOfBirth = parseOptionalDate(body.dob || body.dateOfBirth);
        const passportNumber = toUpperText(body.passport || body.passportNumber);
        const passportExpiryDate = parseOptionalDate(body.passportexp || body.passportExpiryDate);

        if (!Number.isInteger(id) || id <= 0) {
            return res.status(400).json({ message: "Valid travel buddy ID is required" });
        }

        if (!title || !firstName || !lastName || !paxtype) {
            return res.status(400).json({
                message: "Title, first name, last name and passenger type are required",
            });
        }

        const existingTravelBuddy = await prisma.travelBuddy.findFirst({
            where: {
                id,
                userId: sessionUser.id,
            },
        });

        if (!existingTravelBuddy) {
            return res.status(404).json({ message: "Travel buddy not found" });
        }

        const travelBuddy = await prisma.travelBuddy.update({
            where: { id },
            data: {
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

        return res.status(200).json({
            message: "Travel buddy updated successfully",
            travelBuddy: buildTravelBuddyPayload(travelBuddy),
        });
    } catch (error) {
        return res.status(500).json({
            message: publicErrorMessage(error, "Unable to update travel buddy"),
        });
    }
}
export default withApiHandler(handler, { methods: ["PATCH"] });

export const config = { api: { bodyParser: false } };
