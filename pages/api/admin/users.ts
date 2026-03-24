import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { AccessRole } from "@prisma/client";
import { prisma } from "@/server/prisma";
import {
    canManageTeamAccess,
    canViewTeamAccess,
    deny,
    getActor,
    isProtectedSuperAdmin,
} from "@/server/rbac";

type ErrorResponse = { message: string };

type ManagedUser = {
    id: number;
    email: string;
    name: string;
    admin: boolean;
    role: AccessRole;
    createdAt: string;
    updatedAt: string;
};

type SuccessResponse =
    | { users: ManagedUser[] }
    | { user: ManagedUser }
    | { message: string };

const ALLOWED_MANAGED_ROLES = new Set<AccessRole>([
    AccessRole.ADMIN,
    AccessRole.MANAGER,
    AccessRole.STAFF,
    AccessRole.ACCOUNTANT,
    AccessRole.RESERVATION,
]);

function normalizeEmail(value: unknown): string {
    return String(value ?? "").trim().toLowerCase();
}

function asManagedUser(user: {
    id: number;
    email: string;
    name: string | null;
    admin: boolean;
    role: AccessRole;
    createdAt: Date;
    updatedAt: Date;
}): ManagedUser {
    return {
        id: user.id,
        email: user.email,
        name: user.name || "",
        admin: user.admin,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
    };
}

async function getSuperAdminCount(): Promise<number> {
    return prisma.user.count({ where: { role: AccessRole.SUPER_ADMIN, admin: true } });
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
    const actor = await getActor(req);
    if (!actor) {
        return res.status(401).json({ message: "Login required" });
    }

    if (req.method === "GET") {
        if (!canViewTeamAccess(actor)) {
            return deny(res, "Only Super Admin/Admin/Manager can view team users");
        }

        const users = await prisma.user.findMany({
            where: { admin: true },
            orderBy: [{ role: "asc" }, { createdAt: "desc" }],
            select: {
                id: true,
                email: true,
                name: true,
                admin: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return res.status(200).json({ users: users.map(asManagedUser) });
    }

    if (req.method === "POST") {
        if (!canManageTeamAccess(actor)) {
            return deny(res, "Only Super Admin can add team users");
        }

        const email = normalizeEmail(req.body?.email);
        const name = String(req.body?.name || "").trim() || "Team User";
        const password = String(req.body?.password || "");
        const role = String(req.body?.role || "").trim().toUpperCase() as AccessRole;

        if (!email || !email.includes("@")) {
            return res.status(400).json({ message: "Valid email is required" });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters" });
        }
        if (!ALLOWED_MANAGED_ROLES.has(role)) {
            return res.status(400).json({
                message: "Role must be one of ADMIN, MANAGER, STAFF, ACCOUNTANT, RESERVATION",
            });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ message: "User already exists for this email" });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                name,
                passwordHash,
                admin: true,
                role,
            },
            select: {
                id: true,
                email: true,
                name: true,
                admin: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return res.status(201).json({ user: asManagedUser(user) });
    }

    if (req.method === "PATCH") {
        if (!canManageTeamAccess(actor)) {
            return deny(res, "Only Super Admin can update team users");
        }

        const userId = Number(req.query.id || req.body?.id);
        if (!userId) {
            return res.status(400).json({ message: "User id is required" });
        }

        const target = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                role: true,
                admin: true,
            },
        });

        if (!target) {
            return res.status(404).json({ message: "User not found" });
        }

        if (isProtectedSuperAdmin(target)) {
            return res.status(403).json({
                message: "Super Admin account is protected and cannot be edited",
            });
        }

        const nextData: {
            name?: string;
            email?: string;
            role?: AccessRole;
            admin?: boolean;
            passwordHash?: string;
        } = {};

        if (req.body?.name !== undefined) {
            nextData.name = String(req.body.name || "").trim();
        }

        if (req.body?.email !== undefined) {
            const email = normalizeEmail(req.body.email);
            if (!email || !email.includes("@")) {
                return res.status(400).json({ message: "Valid email is required" });
            }
            nextData.email = email;
        }

        if (req.body?.role !== undefined) {
            const role = String(req.body.role || "").trim().toUpperCase() as AccessRole;
            if (!ALLOWED_MANAGED_ROLES.has(role)) {
                return res.status(400).json({
                    message: "Role must be one of ADMIN, MANAGER, STAFF, ACCOUNTANT, RESERVATION",
                });
            }
            nextData.role = role;
            nextData.admin = true;
        }

        if (req.body?.password !== undefined) {
            const password = String(req.body.password || "");
            if (password.length < 6) {
                return res.status(400).json({ message: "Password must be at least 6 characters" });
            }
            nextData.passwordHash = await bcrypt.hash(password, 10);
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: nextData,
            select: {
                id: true,
                email: true,
                name: true,
                admin: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        return res.status(200).json({ user: asManagedUser(user) });
    }

    if (req.method === "DELETE") {
        if (!canManageTeamAccess(actor)) {
            return deny(res, "Only Super Admin can delete team users");
        }

        const userId = Number(req.query.id || req.body?.id);
        if (!userId) {
            return res.status(400).json({ message: "User id is required" });
        }

        const target = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, admin: true },
        });

        if (!target) {
            return res.status(404).json({ message: "User not found" });
        }

        if (isProtectedSuperAdmin(target)) {
            return res.status(403).json({
                message: "Super Admin account is protected and cannot be deleted",
            });
        }

        await prisma.user.delete({ where: { id: userId } });

        const superAdminCount = await getSuperAdminCount();
        if (superAdminCount !== 1) {
            return res.status(500).json({
                message: "System guard failed: exactly one Super Admin must exist",
            });
        }

        return res.status(200).json({ message: "User deleted" });
    }

    res.setHeader("Allow", ["GET", "POST", "PATCH", "DELETE"]);
    return res.status(405).json({ message: "Method not allowed" });
}
