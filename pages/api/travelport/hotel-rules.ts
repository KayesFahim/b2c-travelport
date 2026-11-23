import type { NextApiRequest, NextApiResponse } from "next";
import { withApiHandler } from "@/server/api-handler";
import {
  callTravelportHotelApi,
  normalizeHotelRulesResponseUsd,
} from "@/server/travelport-hotel";

type HotelRulesBody = {
  catalogOfferingsIdentifier?: string;
  catalogOfferingIdentifier?: string;
  authority?: string;
  aggregator?: string;
  propertyCode?: string;
  chainCode?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  const body = (req.body ?? {}) as HotelRulesBody;
  const catalogOfferingIdentifier = String(body.catalogOfferingIdentifier || "").trim();
  const authority = String(body.authority || body.aggregator || "TVPT").trim() || "TVPT";

  if (!catalogOfferingIdentifier) {
    return res.status(400).json({
      message: "catalogOfferingIdentifier is required for hotel rules.",
    });
  }

  const requestPayload = {
    OfferQueryBuildFromCatalogOffering: {
      "@type": "OfferQueryBuildFromCatalogOffering",
      BuildFromCatalogOfferingHospitality: {
        "@type": "BuildFromCatalogOfferingHospitality",
        CatalogOfferingIdentifier: {
          value: catalogOfferingIdentifier,
          authority,
        },
      },
    },
  };

  try {
    const result = await callTravelportHotelApi({
      path: "/rules/offershospitality/buildfromcatalogoffering",
      payload: requestPayload,
      apiName: "hotel-rules",
      retryOnTransientError: true,
      meta: {
        catalogOfferingIdentifier,
        authority,
        propertyCode: body.propertyCode,
        chainCode: body.chainCode,
      },
    });

    if (!result.ok || result.hasPayloadErrors) {
      return res.status(result.status >= 400 ? result.status : 502).json({
        success: false,
        code: "TRAVELPORT_HOTEL_RULES_ERROR",
        source: "travelport-live",
        message: result.errorMessage,
        status: result.status,
        correlationId: result.correlationId,
        isProvisioningError: result.isProvisioningError,
        upstreamDetails: result.data,
      });
    }

    const rules = await normalizeHotelRulesResponseUsd(result.data, catalogOfferingIdentifier);

    return res.status(200).json({
      success: true,
      source: "travelport-live",
      correlationId: result.correlationId,
      offerIdentifier: rules.offerIdentifier,
      rules,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hotel rules lookup failed";
    return res.status(500).json({
      success: false,
      code: "TRAVELPORT_HOTEL_RULES_ERROR",
      message,
    });
  }
}

export default withApiHandler(handler, { methods: ["POST"] });
