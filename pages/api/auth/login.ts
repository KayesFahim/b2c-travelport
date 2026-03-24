import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { createSession } from "@/server/auth-session";

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
    admin: boolean;
    role: string;
  };
};

function normalizeEmail(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

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

    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const configuredSuperAdminEmail = normalizeEmail(process.env.SUPER_ADMIN_EMAIL);
    if (configuredSuperAdminEmail && email === configuredSuperAdminEmail) {
      const superAdminCount = await prisma.user.count({
        where: { role: "SUPER_ADMIN", admin: true },
      });

      if (superAdminCount > 1) {
        return res.status(500).json({
          message: "System guard failed: more than one Super Admin exists.",
        });
      }

      if (superAdminCount === 0 || user.role !== "SUPER_ADMIN" || user.admin !== true) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { role: "SUPER_ADMIN", admin: true },
        });
      }
    }

    const session = await createSession(req, res, {
      id: user.id,
      email: user.email,
      name: user.name || "Traveler",
      admin: user.admin,
      role: user.role,
    });

    return res.status(200).json({
      success: true,
      token: session.token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || "Traveler",
        admin: user.admin,
        role: user.role,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Login failed",
    });
  }
}
