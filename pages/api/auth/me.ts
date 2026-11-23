import { withApiHandler } from "@/server/api-handler";
import { publicErrorMessage } from "@/server/public-error";
import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/server/auth-session";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";

type ErrorResponse = {
  message: string;
};

type SuccessResponse = {
  authenticated: true;
  user: {
    id: number;
    email: string;
    name: string;
    fullName: string;
    firstName: string;
    lastName: string;
    address: string;
    phone: string;
    gender: string;
    nationality: string;
    dob: string;
    dateOfBirth: string | null;
    passport: string;
    passportNumber: string;
    passportCountry: string;
    passportIssuingCountry: string;
    passportexp: string;
    passportExp: string;
    passportExpiryDate: string | null;
    admin: boolean;
    role: string;
    createdAt?: string | null;
    updatedAt?: string | null;
  };
};

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function toIsoDate(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const clean = toText(fullName);
  if (!clean) return { firstName: "", lastName: "" };

  const parts = clean.split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || "",
    lastName: parts.slice(1).join(" "),
  };
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    let resolvedUser: SuccessResponse["user"] = {
      id: user.id,
      email: user.email,
      name: user.name,
      fullName: user.name,
      firstName: splitName(user.name).firstName,
      lastName: splitName(user.name).lastName,
      address: "",
      phone: "",
      gender: "",
      nationality: "",
      dob: "",
      dateOfBirth: null,
      passport: "",
      passportNumber: "",
      passportCountry: "",
      passportIssuingCountry: "",
      passportexp: "",
      passportExp: "",
      passportExpiryDate: null,
      admin: user.admin,
      role: user.role,
      createdAt: null,
      updatedAt: null,
    };

    try {
      assertDatabaseConfigured();

      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          givenName: true,
          surName: true,
          address: true,
          phone: true,
          dateOfBirth: true,
          passportNumber: true,
          passportIssuingCountry: true,
          passportExpiryDate: true,
          nationality: true,
          gender: true,
          admin: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (dbUser) {
        const fallbackSplit = splitName(toText(dbUser.name) || user.name);
        const firstName = toText(dbUser.givenName) || fallbackSplit.firstName;
        const lastName = toText(dbUser.surName) || fallbackSplit.lastName;
        const fullName = [firstName, lastName].filter(Boolean).join(" ") || toText(dbUser.name) || user.name;
        const dateOfBirth = toIsoDate(dbUser.dateOfBirth);
        const passportExpiryDate = toIsoDate(dbUser.passportExpiryDate);
        const passportNumber = toText(dbUser.passportNumber);
        const passportIssuingCountry = toText(dbUser.passportIssuingCountry);

        resolvedUser = {
          id: dbUser.id,
          email: dbUser.email,
          name: fullName || user.name,
          fullName,
          firstName,
          lastName,
          address: toText(dbUser.address),
          phone: toText(dbUser.phone),
          gender: toText(dbUser.gender),
          nationality: toText(dbUser.nationality),
          dob: dateOfBirth || "",
          dateOfBirth,
          passport: passportNumber,
          passportNumber,
          passportCountry: passportIssuingCountry,
          passportIssuingCountry,
          passportexp: passportExpiryDate || "",
          passportExp: passportExpiryDate || "",
          passportExpiryDate,
          admin: dbUser.admin,
          role: dbUser.role,
          createdAt: toIsoDate(dbUser.createdAt),
          updatedAt: toIsoDate(dbUser.updatedAt),
        };
      }
    } catch {
      // Fall back to the session snapshot if the database is unavailable.
    }

    return res.status(200).json({
      authenticated: true,
      user: resolvedUser,
    });
  } catch (error) {
    return res.status(500).json({
      message: publicErrorMessage(error, "Unable to load session"),
    });
  }
}

export default withApiHandler(handler, { methods: ["GET"] });

export const config = { api: { bodyParser: false } };
