import bcrypt from "bcryptjs";
import { AccessRole } from "@prisma/client";
import { prisma } from "@/server/prisma";

function readEnv(...keys: string[]): string {
    for (const key of keys) {
        const value = String(process.env[key] || "").trim();
        if (value) return value;
    }
    return "";
}

function normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
}

export function getConfiguredSuperAdmin(): {
    email: string;
    password: string;
    name: string;
} | null {
    const email = normalizeEmail(readEnv("SUPERADMIN_EMAIL", "SUPER_ADMIN_EMAIL"));
    const password = readEnv("SUPERADMIN_PASSWORD", "SUPER_ADMIN_PASSWORD");
    const name = readEnv("SUPERADMIN_NAME", "SUPER_ADMIN_NAME") || "Super Admin";

    if (!email || !password) {
        return null;
    }

    return { email, password, name };
}

export async function ensureSuperAdminBootstrap(): Promise<void> {
    const configured = getConfiguredSuperAdmin();
    if (!configured) {
        return;
    }

    const existingByEmail = await prisma.adminUser.findUnique({
        where: { email: configured.email },
        select: { id: true, role: true, isActive: true },
    });

    if (existingByEmail) {
        if (existingByEmail.role !== AccessRole.SUPER_ADMIN || !existingByEmail.isActive) {
            await prisma.adminUser.update({
                where: { id: existingByEmail.id },
                data: {
                    role: AccessRole.SUPER_ADMIN,
                    isActive: true,
                    name: configured.name,
                },
            });
        }
        return;
    }

    const existingSuperAdmin = await prisma.adminUser.count({
        where: { role: AccessRole.SUPER_ADMIN },
    });

    if (existingSuperAdmin > 0) {
        return;
    }

    const passwordHash = await bcrypt.hash(configured.password, 10);
    await prisma.adminUser.create({
        data: {
            email: configured.email,
            name: configured.name,
            passwordHash,
            role: AccessRole.SUPER_ADMIN,
            isActive: true,
        },
    });
}