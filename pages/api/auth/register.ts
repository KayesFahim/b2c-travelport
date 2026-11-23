import { withApiHandler } from "@/server/api-handler";
import { isValidPassword, PASSWORD_POLICY_MESSAGE } from "@/utils/passwordPolicy";
import { publicErrorMessage } from "@/server/public-error";
import type { NextApiRequest, NextApiResponse } from "next";
import bcrypt from "bcryptjs";
import {
  assertDatabaseConfigured,
  getDatabaseUnavailableMessage,
  isDatabaseConnectionError,
  prisma,
} from "@/server/prisma";
import { createSession } from "@/server/auth-session";
import { emailVerificationRequired, issueEmailVerification } from "@/server/auth-email";

type ErrorResponse = {
  message: string;
};

type SuccessResponse = {
  success: true;
  verificationRequired: boolean;
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

    const email = normalizeEmail(req.body?.email);
    const password = String(req.body?.password || "");
    const name = String(req.body?.name || "").trim() || "Traveler";

    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Valid email is required." });
    }
    if (!isValidPassword(password)) {
      return res.status(400).json({
        message: PASSWORD_POLICY_MESSAGE,
      });
    }

    if (name.length > 120) return res.status(400).json({ message: "Name must be 120 characters or fewer." });

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

    const session = emailVerificationRequired() ? { token: "" } : await createSession(req, res, {
      id: user.id,
      email: user.email,
      name: user.name || "Traveler",
      admin: user.admin,
      role: user.role,
    });

    return res.status(201).json({
      success: true,
      verificationRequired: emailVerificationRequired(),
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
      message: publicErrorMessage(error, "Registration failed"),
    });
  }
}

export default withApiHandler(handler, { methods: ["POST"] });

export const config = { api: { bodyParser: false } };
