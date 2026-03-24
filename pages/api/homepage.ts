import type { NextApiRequest, NextApiResponse } from "next";
import sliderData from "../../src/data/sliderData.json";
import { prisma } from "../../src/server/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Record<string, unknown>>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const rows = await prisma.siteSettings.findMany({
      where: { section: "homepage" },
    });

    const settings: Record<string, string> = {};
    rows.forEach((row) => {
      settings[row.key] = String(row.value ?? "");
    });

    const response = JSON.parse(JSON.stringify(sliderData)) as Record<string, unknown>;

    if (settings.mainTitle) response.mainTitle = settings.mainTitle;
    if (settings.subTitle) response.subTitle = settings.subTitle;

    if (settings.bannerImageUrl && typeof response.bannerimage === "object" && response.bannerimage) {
      (response.bannerimage as { imageUrl?: string }).imageUrl = settings.bannerImageUrl;
    }

    if (Array.isArray(response.sliderimage)) {
      response.sliderimage = response.sliderimage.map((item, index) => {
        const key = `slide${index + 1}Url`;
        const nextUrl = settings[key];
        if (!nextUrl) return item;
        return { ...(item as Record<string, unknown>), imageUrl: nextUrl };
      });
    }

    // Extra homepage config fields for footer/header consumers.
    response.contactPhone = settings.contactPhone || "";
    response.contactEmail = settings.contactEmail || "";
    response.copyright = settings.copyright || "";

    return res.status(200).json(response);
  } catch {
    return res.status(200).json(sliderData as Record<string, unknown>);
  }
}
