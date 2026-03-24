import type { NextApiRequest, NextApiResponse } from "next";
import { issueForgotPassword } from "@/server/auth-email";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ message: "Method not allowed" });
    }

    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) {
        return res.status(400).json({ message: "Valid email is required" });
    }

    await issueForgotPassword(email);
    return res.status(200).json({
        success: true,
        message: "If this email exists, a password reset link has been sent.",
    });
}
