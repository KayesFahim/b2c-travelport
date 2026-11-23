import { fetchUpstream } from "@/server/upstream-fetch";
import { withApiHandler } from "@/server/api-handler";
import type { NextApiRequest, NextApiResponse } from "next";
import { randomUUID } from "crypto";
import { getTravelportAccessToken } from "@/server/travelport-token";
import { toUnifiedSearchResult, type LegacySegment } from "./search-flight";
import { logTravelportApi } from "@/utils/travelportLogger";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

type BuildNextBody = {
  cposId?: string;
  catalogProductOfferingsIdentifier?: string;
  selectedCpoId?: string;
  offerIdentifier?: string;
  selectedProductRef?: string;
  productIdentifier?: string;
  productIdentifiers?: string[];
  segments?: LegacySegment[];
  contentSourceList?: string[];
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  const body = (req.body ?? {}) as BuildNextBody;
  const cposId = String(
    body.cposId || body.catalogProductOfferingsIdentifier || ""
  ).trim();
  const selectedCpoId = String(
    body.selectedCpoId || body.offerIdentifier || ""
  ).trim();

  let selectedProductRef = String(
    body.selectedProductRef ||
      body.productIdentifier ||
      (Array.isArray(body.productIdentifiers) ? body.productIdentifiers[0] : "") ||
      ""
  ).trim();

  if (!cposId) {
    return res.status(400).json({
      message: "cposId (catalogProductOfferingsIdentifier) is required",
    });
  }

  if (!selectedCpoId) {
    return res.status(400).json({
      message: "selectedCpoId (offerIdentifier) is required",
    });
  }

  if (!selectedProductRef) {
    selectedProductRef = "p0";
  }

  try {
    const accessToken = await getTravelportAccessToken();
    const flightsUrl = getRequiredEnv("TRAVELPORT_FLIGHTS_URL");
    const buildNextUrl = flightsUrl.replace(
      /\/catalogproductofferings\/?$/i,
      "/catalogproductofferings/buildnext"
    );
    const accessGroup = getRequiredEnv("TRAVELPORT_ACCESS_GROUP");
    const version = process.env.TRAVELPORT_VERSION || "11";
    const correlationId = randomUUID();

    const requestPayload = {
      "@type": "CatalogProductOfferingsQueryBuildNext",
      BuildFromCatalogProductOfferingsRequest: {
        "@type": "BuildFromCatalogProductOfferingsRequestAir",
        CatalogProductOfferingsIdentifier: {
          Identifier: {
            value: cposId,
          },
        },
        CatalogProductOfferingSelection: [
          {
            "@type": "CatalogProductOfferingSelection",
            CatalogProductOfferingIdentifier: {
              Identifier: {
                value: selectedCpoId,
              },
            },
            ProductIdentifier: [
              {
                "@type": "ProductIdentifier",
                Identifier: {
                  value: selectedProductRef,
                },
              },
            ],
          },
        ],
      },
    };

    const requestHeaders: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      XAUTH_TRAVELPORT_ACCESSGROUP: accessGroup,
      "Accept-Version": version,
      "Content-Version": version,
      taxBreakDown: "true",
      Authorization: `Bearer ${accessToken}`,
      "TVP-Correlation-Id": correlationId,
    };

    if (process.env.TRAVELPORT_PCC_CORE) {
      requestHeaders["TVP-PCC-Core"] = process.env.TRAVELPORT_PCC_CORE;
    }

    const response = await fetchUpstream(buildNextUrl, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(requestPayload),
    });

    const responseText = await response.text();
    let responsePayload: Record<string, unknown> = {};

    try {
      responsePayload = responseText ? JSON.parse(responseText) : {};
    } catch {
      responsePayload = { rawText: responseText };
    }

    logTravelportApi({
      endpoint: buildNextUrl,
      request: {
        method: "POST",
        body: requestPayload,
      },
      response: responsePayload,
      status: response.status,
      meta: {
        api: "buildnext",
        cposId,
        selectedCpoId,
      },
    });

    if (!response.ok) {
      return res.status(response.status).json({
        message: "Travelport BuildNext request failed",
        status: response.status,
        details: responsePayload,
      });
    }

    const segments = Array.isArray(body.segments) ? body.segments : [];
    const contentSources = Array.isArray(body.contentSourceList)
      ? body.contentSourceList
      : ["GDS", "NDC"];

    const unifiedResults = toUnifiedSearchResult(
      segments,
      responsePayload,
      contentSources
    );

    return res.status(200).json({
      success: true,
      cposId,
      selectedCpoId,
      selectedProductRef,
      count: unifiedResults.length,
      offers: unifiedResults,
      raw: responsePayload,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error";
    return res.status(500).json({
      message: "Failed to process Next Leg offerings",
      error: message,
    });
  }
}

export default withApiHandler(handler);
