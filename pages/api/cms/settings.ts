import { withApiHandler } from "@/server/api-handler";
import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../../src/server/prisma";
import { canManageCms, deny, getActor } from "@/server/rbac";

// GET  /api/cms/settings?section=contact|about|homepage
// PUT  /api/cms/settings  body: { section, settings: { key: value, ... } }

async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "GET") {
        try {
            const section = String(req.query.section ?? "");
            if (!section) {
                return res.status(400).json({ message: "section query param required" });
            }
            const rows = await prisma.siteSettings.findMany({ where: { section } });
            const result: Record<string, string | null> = {};
            for (const row of rows) {
                result[row.key] = row.value;
            }
            return res.status(200).json(result);
        } catch (err) {
            console.error("[cms/settings GET]", err);
            return res.status(500).json({ message: "Failed to fetch settings" });
        }
    }

    if (req.method === "PUT") {
        try {
            const actor = await getActor(req);
            if (!canManageCms(actor)) {
                return deny(res, "Only Super Admin/Admin/Manager can update CMS settings");
            }
            const { section, settings } = req.body ?? {};
            if (!section || typeof settings !== "object" || settings === null) {
                return res.status(400).json({ message: "section and settings object required" });
            }
            const upserts = Object.entries(settings as Record<string, string>).map(([key, value]) =>
                prisma.siteSettings.upsert({
                    where: { section_key: { section: String(section), key: String(key) } },
                    update: { value: value != null ? String(value) : null },
                    create: { section: String(section), key: String(key), value: value != null ? String(value) : null },
                })
            );
            await Promise.all(upserts);
            return res.status(200).json({ message: "Settings saved" });
        } catch (err) {
            console.error("[cms/settings PUT]", err);
            return res.status(500).json({ message: "Failed to save settings" });
        }
    }

    res.setHeader("Allow", ["GET", "PUT"]);
    return res.status(405).json({ message: "Method not allowed" });
}

export default withApiHandler(handler, { methods: ["GET", "PUT"] });

export const config = { api: { bodyParser: false } };
