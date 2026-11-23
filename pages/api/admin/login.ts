import { withApiHandler } from "@/server/api-handler";
import { publicErrorMessage } from "@/server/public-error";
import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import {
    assertDatabaseConfigured,
    getDatabaseUnavailableMessage,
    isDatabaseConnectionError,
    prisma,
} from "@/server/prisma";
import { ensureSuperAdminBootstrap } from "@/server/admin-bootstrap";
import { createAdminSession } from "@/server/admin-session";

type ErrorResponse = {
    message: string;
};

type SuccessResponse = {
    success: true;
    token: string;
    user: {
        id: number;
        email: string;
        name: string;
        admin: true;
        role: string;
    };
};

function normalizeEmail(value: unknown): string {
    return String(value ?? "").trim().toLowerCase();
}

async function handler(
    req: NextApiRequest,
    res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        assertDatabaseConfigured();
        await ensureSuperAdminBootstrap();

        const email = normalizeEmail(req.body?.email);
        const password = String(req.body?.password || "");

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }

        const adminUser = await prisma.adminUser.findUnique({ where: { email } });
        if (!adminUser || !adminUser.isActive) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const isValidPassword = await bcrypt.compare(password, adminUser.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ message: "Invalid email or password." });
        }

        const session = await createAdminSession(req, res, {
            id: adminUser.id,
            email: adminUser.email,
            name: adminUser.name || "Admin User",
            admin: true,
            role: adminUser.role,
        });

        return res.status(200).json({
            success: true,
            token: session.token,
            user: {
                id: adminUser.id,
                email: adminUser.email,
                name: adminUser.name || "Admin User",
                admin: true,
                role: adminUser.role,
            },
        });
    } catch (error) {
        if (isDatabaseConnectionError(error)) {
            return res.status(503).json({
                message: getDatabaseUnavailableMessage(),
            });
        }
        return res.status(500).json({
            message: publicErrorMessage(error, "Admin login failed"),
        });
    }
}
export default withApiHandler(handler, { methods: ["POST"] });

export const config = { api: { bodyParser: false } };
