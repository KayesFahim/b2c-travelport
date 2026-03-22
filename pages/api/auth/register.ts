import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { createSession } from "@/server/auth-session";

type ErrorResponse = {
  message: string;
};

type SuccessResponse = {
  success: true;
  user: {
    id: number;
    email: string;
    name: string;
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
    const name = String(req.body?.name || "").trim() || "Traveler";

    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "Valid email is required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters." });
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
        passwordHash,
      },
    });

    await createSession(req, res, {
      id: user.id,
      email: user.email,
      name: user.name || "Traveler",
    });

    return res.status(201).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || "Traveler",
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Registration failed",
    });
  }
}
