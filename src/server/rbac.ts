import type { NextApiRequest, NextApiResponse } from "next";
import { AccessRole } from "@prisma/client";
import { prisma } from "@/server/prisma";
import { ensureSuperAdminBootstrap } from "@/server/admin-bootstrap";
import { getAdminSessionUser } from "@/server/admin-session";

export type Actor = {
    id: number;
    email: string;
    name: string;
    admin: boolean;
    role: AccessRole;
};

export const ROLE_LABELS: Record<AccessRole, string> = {
    CUSTOMER: "Customer",
    SUPER_ADMIN: "Super Admin",
    ADMIN: "Admin",
    MANAGER: "Manager",
    STAFF: "Staff",
    ACCOUNTANT: "Accountant",
    RESERVATION: "Reservation",
};

export function isPrivilegedRole(role: AccessRole): boolean {
    return role === AccessRole.SUPER_ADMIN || role === AccessRole.ADMIN || role === AccessRole.MANAGER;
}

export function canManageCms(actor: Actor | null): boolean {
    if (!actor) return false;
    return actor.role === AccessRole.SUPER_ADMIN || actor.role === AccessRole.ADMIN || actor.role === AccessRole.MANAGER;
}

export function canViewTeamAccess(actor: Actor | null): boolean {
    if (!actor) return false;
    return isPrivilegedRole(actor.role);
}

export function canManageTeamAccess(actor: Actor | null): boolean {
    if (!actor) return false;
    return actor.role === AccessRole.SUPER_ADMIN;
}

export function isProtectedSuperAdmin(user: { role: AccessRole }): boolean {
    return user.role === AccessRole.SUPER_ADMIN;
}

export async function getActor(req: NextApiRequest): Promise<Actor | null> {
    await ensureSuperAdminBootstrap();

    const session = await getAdminSessionUser(req);
    if (!session?.id) return null;

    const user = await prisma.adminUser.findUnique({
        where: { id: session.id },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActive: true,
        },
    });

    if (!user || !user.isActive) return null;

    return {
        id: user.id,
        email: user.email,
        name: user.name || "",
        admin: true,
        role: user.role,
    };
}

export function deny(res: NextApiResponse, message = "Forbidden") {
    return res.status(403).json({ message });
}
