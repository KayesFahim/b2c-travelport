import { withApiHandler } from "@/server/api-handler";
import { publicErrorMessage } from "@/server/public-error";
import type { NextApiRequest, NextApiResponse } from "next";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { ensureSuperAdminBootstrap } from "@/server/admin-bootstrap";
import { getAdminSessionUser } from "@/server/admin-session";

type ErrorResponse = {
    message: string;
};

type SuccessResponse = {
    authenticated: true;
    user: {
        id: number;
        email: string;
        name: string;
        admin: true;
        role: string;
        isActive: boolean;
        createdAt: string | null;
        updatedAt: string | null;
    };
};

function toIsoDate(value: Date | null | undefined): string | null {
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
        await ensureSuperAdminBootstrap();

        const sessionUser = await getAdminSessionUser(req);
        if (!sessionUser) {
            return res.status(401).json({ message: "Not authenticated" });
        }

        const adminUser = await prisma.adminUser.findUnique({
            where: { id: sessionUser.id },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                isActive: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!adminUser || !adminUser.isActive) {
            return res.status(401).json({ message: "Admin session is no longer valid" });
        }

        return res.status(200).json({
            authenticated: true,
            user: {
                id: adminUser.id,
                email: adminUser.email,
                name: adminUser.name || "Admin User",
                admin: true,
                role: adminUser.role,
                isActive: adminUser.isActive,
                createdAt: toIsoDate(adminUser.createdAt),
                updatedAt: toIsoDate(adminUser.updatedAt),
            },
        });
    } catch (error) {
        return res.status(500).json({
            message: publicErrorMessage(error, "Unable to load admin session"),
        });
    }
}
export default withApiHandler(handler, { methods: ["GET"] });

export const config = { api: { bodyParser: false } };
