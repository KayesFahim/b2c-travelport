import type { NextApiRequest, NextApiResponse } from "next";
import sliderData from "../../src/data/sliderData.json";
import { prisma } from "../../src/server/prisma";

type HomepagePayload = Record<string, unknown>;

const HOMEPAGE_SETTINGS_CACHE_TTL_MS = 60 * 1000;
let homepageCache: { expiresAt: number; payload: HomepagePayload } | null = null;

function buildHomepagePayload(settings: Record<string, string>): HomepagePayload {
  const response = JSON.parse(JSON.stringify(sliderData)) as HomepagePayload;

  if (settings.mainTitle) response.mainTitle = settings.mainTitle;
  if (settings.subTitle) response.subTitle = settings.subTitle;

  if (
    settings.bannerImageUrl &&
    typeof response.bannerimage === "object" &&
    response.bannerimage
  ) {
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

  response.contactPhone = settings.contactPhone || "";
  response.contactEmail = settings.contactEmail || "";
  response.copyright = settings.copyright || "";

  return response;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Record<string, unknown>>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    res.setHeader(
      "Cache-Control",
      "public, max-age=300, s-maxage=300, stale-while-revalidate=1200"
    );

    if (homepageCache && homepageCache.expiresAt > Date.now()) {
      return res.status(200).json(homepageCache.payload);
    }

    const rows = await prisma.siteSettings.findMany({
      where: { section: "homepage" },
    });

    const settings: Record<string, string> = {};
    rows.forEach((row) => {
      settings[row.key] = String(row.value ?? "");
    });

    const response = buildHomepagePayload(settings);
    homepageCache = {
      expiresAt: Date.now() + HOMEPAGE_SETTINGS_CACHE_TTL_MS,
      payload: response,
    };

    return res.status(200).json(response);
  } catch {
    const fallback = buildHomepagePayload({});
    homepageCache = {
      expiresAt: Date.now() + 10 * 1000,
      payload: fallback,
    };
    return res.status(200).json(fallback);
  }
}
