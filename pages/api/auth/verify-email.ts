import { withApiHandler } from "@/server/api-handler";
import type { NextApiRequest, NextApiResponse } from "next";
import { verifyEmailToken } from "@/server/auth-email";

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ message: "Method not allowed" });
    }

    const token = String(req.query.token || "").trim();
    if (!token) {
        return res.redirect(302, "/?verified=invalid");
    }

    const verified = await verifyEmailToken(token);
    if (!verified) {
        return res.redirect(302, "/?verified=expired");
    }

    return res.redirect(302, "/?verified=success");
}

export default withApiHandler(handler, { methods: ["GET"] });

export const config = { api: { bodyParser: false } };
