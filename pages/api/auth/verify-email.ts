import type { NextApiRequest, NextApiResponse } from "next";
import { verifyEmailToken } from "@/server/auth-email";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ message: "Method not allowed" });
    }

    const token = String(req.query.token || "").trim();
    if (!token) {
        return res.status(400).json({ message: "Verification token is required" });
    }

    const verified = await verifyEmailToken(token);
    if (!verified) {
        return res.status(400).json({ message: "Invalid or expired verification token" });
    }

    return res.status(200).json({
        success: true,
        message: "Email verified successfully",
        email: verified.email,
    });
}
