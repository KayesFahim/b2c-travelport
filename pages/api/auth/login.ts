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

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    await createSession(req, res, {
      id: user.id,
      email: user.email,
      name: user.name || "Traveler",
    });

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name || "Traveler",
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Login failed",
    });
  }
}
