import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import {
  assertDatabaseConfigured,
  getDatabaseUnavailableMessage,
  isDatabaseConnectionError,
  prisma,
} from "@/server/prisma";
import { createSession } from "@/server/auth-session";
import { issueEmailVerification } from "@/server/auth-email";

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

function isValidSignupPassword(password: string): boolean {
  return /^(?=.*[a-zA-Z]).{6,}$/.test(password);
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
    const name = String(req.body?.name || "").trim() || "Traveler";

    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "Valid email is required." });
    }
    if (!isValidSignupPassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long, and contain at least one letter.",
      });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ message: "Account already exists for this email." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        name,
        admin: false,
        role: "CUSTOMER",
        passwordHash,
      },
    });

    try {
      await issueEmailVerification({ id: user.id, email: user.email, name: user.name });
    } catch {
      // Do not fail registration when SMTP is unavailable.
    }

    const session = await createSession(req, res, {
      id: user.id,
      email: user.email,
      name: user.name || "Traveler",
      admin: user.admin,
      role: user.role,
    });

    return res.status(201).json({
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
    if (isDatabaseConnectionError(error)) {
      return res.status(503).json({
        message: getDatabaseUnavailableMessage(),
      });
    }
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Registration failed",
    });
  }
}
