import { withApiHandler } from "@/server/api-handler";
import type { NextApiRequest, NextApiResponse } from "next";
import { put } from "@vercel/blob";
import { canManageCms, deny, getActor } from "@/server/rbac";

type UploadBody = {
    fileName?: string;
    contentType?: string;
    dataUrl?: string;
};

function sanitizeFileName(name: string): string {
    return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        res.setHeader("Allow", ["POST"]);
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        const actor = await getActor(req);
        if (!canManageCms(actor)) {
            return deny(res, "Only Super Admin/Admin/Manager can upload blog images");
        }

        const body = (req.body ?? {}) as UploadBody;
        const fileName = String(body.fileName || "").trim();
        const contentType = String(body.contentType || "application/octet-stream").trim();
        const dataUrl = String(body.dataUrl || "").trim();

        if (!fileName || !dataUrl) {
            return res.status(400).json({ message: "fileName and dataUrl are required" });
        }

        const base64Payload = dataUrl.includes(",") ? dataUrl.split(",").pop() || "" : dataUrl;
        const buffer = Buffer.from(base64Payload, "base64");
        if (!buffer.length) {
            return res.status(400).json({ message: "Invalid image payload" });
        }

        const safeName = sanitizeFileName(fileName);
        const blob = await put(`blog/${Date.now()}-${safeName}`, buffer, {
            access: "public",
            contentType,
            addRandomSuffix: false,
        });

        return res.status(200).json({ url: blob.url });
    } catch (error) {
        console.error("[cms/blog-image POST]", error);
        return res.status(500).json({ message: "Failed to upload image" });
    }
}
export default withApiHandler(handler, { methods: ["POST"], bodyLimit: 8 * 1024 * 1024 });

export const config = { api: { bodyParser: false } };
