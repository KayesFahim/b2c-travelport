import { withApiHandler } from "@/server/api-handler";
import { isValidPassword, PASSWORD_POLICY_MESSAGE } from "@/utils/passwordPolicy";
import type { NextApiRequest, NextApiResponse } from "next";
import { resetPasswordWithToken } from "@/server/auth-email";

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ message: "Method not allowed" });
    }

    const token = String(req.body?.token || "").trim();
    const newPassword = String(req.body?.newPassword || "");

    if (!token) {
        return res.status(400).json({ message: "Reset token is required" });
    }
    if (!isValidPassword(newPassword)) {
        return res.status(400).json({ message: PASSWORD_POLICY_MESSAGE });
    }

    const ok = await resetPasswordWithToken({ token, newPassword });
    if (!ok) {
        return res.status(400).json({ message: "Invalid or expired token" });
    }

    return res.status(200).json({ success: true, message: "Password reset successful" });
}

export default withApiHandler(handler, { methods: ["POST"] });

export const config = { api: { bodyParser: false } };
