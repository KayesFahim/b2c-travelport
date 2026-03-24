import type { NextApiRequest, NextApiResponse } from "next";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { issueEmailVerification } from "@/server/auth-email";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ message: "Method not allowed" });
    }

    assertDatabaseConfigured();

    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
        return res.status(400).json({ message: "Valid email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        return res.status(200).json({ success: true, message: "Verification email sent" });
    }

    await issueEmailVerification({ id: user.id, email: user.email, name: user.name });
    return res.status(200).json({ success: true, message: "Verification email sent" });
}
