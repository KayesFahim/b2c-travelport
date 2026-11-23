import { withApiHandler } from "@/server/api-handler";
import { publicErrorMessage } from "@/server/public-error";
import type { NextApiRequest, NextApiResponse } from "next";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { getSessionUser } from "@/server/auth-session";
import { buildTravelBuddyPayload } from "@/server/travel-buddy";

type SuccessResponse = {
    travelBuddies: ReturnType<typeof buildTravelBuddyPayload>[];
};

type ErrorResponse = {
    message: string;
};

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

        const travelBuddies = await prisma.travelBuddy.findMany({
            where: { userId: sessionUser.id },
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        });

        return res.status(200).json({
            travelBuddies: travelBuddies.map((travelBuddy) => buildTravelBuddyPayload(travelBuddy)),
        });
    } catch (error) {
        return res.status(500).json({
            message: publicErrorMessage(error, "Unable to load travel buddies"),
        });
    }
}

export default withApiHandler(handler, { methods: ["GET"] });

export const config = { api: { bodyParser: false } };
