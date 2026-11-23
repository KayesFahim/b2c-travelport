import type { NextApiRequest, NextApiResponse } from "next";
import { withApiHandler } from "@/server/api-handler";
import { callTravelportHotelApi } from "@/server/travelport-hotel";

type HotelRulesBody = {
  catalogOfferingsIdentifier?: string;
  catalogOfferingIdentifier?: string;
  productIdentifier?: string;
  propertyCode?: string;
  chainCode?: string;
  rateCode?: string;
  checkIn?: string;
  checkOut?: string;
  rooms?: number | string;
  adults?: number | string;
  currency?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  const body = (req.body ?? {}) as HotelRulesBody;
  const catalogOfferingsIdentifier = String(body.catalogOfferingsIdentifier || "").trim();
  const catalogOfferingIdentifier = String(body.catalogOfferingIdentifier || "").trim();
  const productIdentifier = String(body.productIdentifier || "").trim();

  if (!catalogOfferingsIdentifier || !catalogOfferingIdentifier) {
    return res.status(400).json({
      message:
        "catalogOfferingsIdentifier and catalogOfferingIdentifier are required for hotel rules.",
    });
  }

  const requestPayload = {
    OfferQueryBuildFromCatalogOfferingHospitality: {
      "@type": "OfferQueryBuildFromCatalogOfferingHospitality",
      BuildFromCatalogOfferingHospitality: {
        "@type": "BuildFromCatalogOfferingHospitality",
        CatalogOfferingsIdentifier: {
          Identifier: {
            value: catalogOfferingsIdentifier,
            authority: "Travelport",
          },
        },
        CatalogOfferingIdentifier: {
          Identifier: {
            value: catalogOfferingIdentifier,
            authority: "Travelport",
          },
        },
        ...(productIdentifier
          ? {
              ProductIdentifier: [
                {
                  Identifier: {
                    value: productIdentifier,
                  },
                },
              ],
            }
          : {}),
      },
    },
  };

  try {
    const result = await callTravelportHotelApi({
      path: "/rules/offershospitality/buildfromcatalogoffering",
      payload: requestPayload,
      apiName: "hotel-rules",
      meta: {
        catalogOfferingsIdentifier,
        catalogOfferingIdentifier,
        productIdentifier,
      },
    });

    if (!result.ok) {
      return res.status(result.status >= 400 ? result.status : 502).json({
        success: false,
        source: "travelport-live",
        message: result.errorMessage,
        status: result.status,
        correlationId: result.correlationId,
        isProvisioningError: result.isProvisioningError,
        upstreamDetails: result.data,
      });
    }

    const offerRoot =
      (result.data as any)?.OfferListResponse?.OfferID?.[0] ??
      (result.data as any)?.OfferResponse?.Offer ??
      result.data;
    const terms =
      (offerRoot as any)?.TermsAndConditionsFull?.[0] ??
      (result.data as any)?.OfferListResponse?.ReferenceList?.find((r: any) =>
        Array.isArray(r?.TermsAndConditions)
      )?.TermsAndConditions?.[0] ??
      {};

    return res.status(200).json({
      success: true,
      source: "travelport-live",
      correlationId: result.correlationId,
      offerIdentifier: String((offerRoot as any)?.Identifier?.value || catalogOfferingIdentifier),
      rules: {
        cancelPenalties: Array.isArray(terms?.CancelPenalty) ? terms.CancelPenalty : [],
        guarantees: Array.isArray(terms?.Guarantee) ? terms.Guarantee : [],
        checkInTime: terms?.CheckInOutPolicy?.checkInTime || null,
        checkOutTime: terms?.CheckInOutPolicy?.checkOutTime || null,
        acceptedCards: Array.isArray(terms?.AcceptedCreditCard)
          ? terms.AcceptedCreditCard
          : [],
        descriptions: Array.isArray(terms?.TextBlock) ? terms.TextBlock : [],
      },
      raw: result.data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hotel rules lookup failed";
    return res.status(500).json({
      success: false,
      message,
    });
  }
}

export default withApiHandler(handler, { methods: ["POST"] });
