import type { NextApiRequest, NextApiResponse } from "next";
import { clearAdminSession } from "@/server/admin-session";

type ResponseBody = {
    success: boolean;
    message: string;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<ResponseBody>
) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ success: false, message: "Method not allowed" });
    }

    try {
        await clearAdminSession(req, res);
        return res.status(200).json({ success: true, message: "Admin logged out successfully" });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error instanceof Error ? error.message : "Admin logout failed",
        });
    }
}