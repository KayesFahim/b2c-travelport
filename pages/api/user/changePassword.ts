import { withApiHandler } from "@/server/api-handler";
import { isValidPassword, PASSWORD_POLICY_MESSAGE } from "@/utils/passwordPolicy";
import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { getSessionUser } from "@/server/auth-session";
import { isProtectedSuperAdmin } from "@/server/rbac";

type SuccessResponse = {
    message: string;
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

        const sessionUser = await getSessionUser(req);
        if (!sessionUser?.id) {
            return res.status(401).json({ message: "Login required" });
        }

        const protectedUser = await prisma.user.findUnique({
            where: { id: sessionUser.id },
            select: { admin: true, role: true },
        });

        if (protectedUser && isProtectedSuperAdmin(protectedUser)) {
            return res.status(403).json({
                message: "Super Admin account is protected and cannot be edited",
            });
        }

        const body = (req.body ?? {}) as Record<string, unknown>;
        const currentPassword = toText(body.currentPassword);
        const newPassword = toText(body.newPassword);
        const confirmPassword = toText(body.confirmPassword);

        if (!currentPassword) {
            return res.status(400).json({ message: "Current password is required" });
        }

        if (!newPassword) {
            return res.status(400).json({ message: "New password is required" });
        }

        if (!confirmPassword) {
            return res.status(400).json({ message: "Password confirmation is required" });
        }

        if (!isValidPassword(newPassword)) return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New password and confirm password do not match" });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({ message: "New password must be different from current password" });
        }

        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: sessionUser.id },
            select: { passwordHash: true },
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if current password is correct
        const isPasswordCorrect = await bcrypt.compare(currentPassword, user.passwordHash || "");
        if (!isPasswordCorrect) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await prisma.user.update({
            where: { id: sessionUser.id },
            data: {
                passwordHash: hashedPassword,
            },
        });

        return res.status(200).json({
            message: "Password changed successfully",
        });
    } catch (error) {
        console.error("[ERROR] changePassword:", error);
        return res.status(500).json({ message: "Internal server error" });
    }
}

export default withApiHandler(handler, { methods: ["POST"] });

export const config = { api: { bodyParser: false } };
