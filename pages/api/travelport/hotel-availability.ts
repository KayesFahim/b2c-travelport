import type { NextApiRequest, NextApiResponse } from "next";
import { withApiHandler } from "@/server/api-handler";
import { getUsdExchangeRates } from "@/server/currency-usd";
import {
  callTravelportHotelApi,
  computeStayNights,
  normalizeHotelAvailabilityResponseUsd,
} from "@/server/travelport-hotel";

type HotelAvailabilityBody = {
  propertyCode?: string;
  chainCode?: string;
  checkIn?: string;
  checkOut?: string;
  rooms?: number | string;
  adults?: number | string;
  children?: number | string;
  currency?: string;
  aggregator?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  const body = (req.body ?? {}) as HotelAvailabilityBody;
  const propertyCode = String(body.propertyCode || "").trim();
  const chainCode = String(body.chainCode || "").trim().toUpperCase();
  const checkIn = String(body.checkIn || "").trim();
  const checkOut = String(body.checkOut || "").trim();

  if (!propertyCode || !checkIn || !checkOut) {
    return res.status(400).json({
      message: "propertyCode, checkIn, and checkOut are required.",
    });
  }

  const rooms = Math.max(1, Math.min(9, Number(body.rooms) || 1));
  const adults = Math.max(1, Math.min(9, Number(body.adults) || 1));
  const children = Math.max(0, Math.min(6, Number(body.children) || 0));
  const currency = "USD";
  const nights = computeStayNights(checkIn, checkOut);

  const guestCounts: Array<Record<string, unknown>> = [
    {
      "@type": "GuestCount",
      ageQualifyingCode: "10",
      count: adults,
    },
  ];
  if (children > 0) {
    guestCounts.push({
      "@type": "GuestCount",
      ageQualifyingCode: "8",
      age: 8,
      count: children,
    });
  }

  const requestPayload = {
    CatalogOfferingsQueryRequest: {
      "@type": "CatalogOfferingsQueryRequest",
      CatalogOfferingsRequest: [
        {
          "@type": "CatalogOfferingsRequestHospitality",
          verboseResponseInd: true,
          requestedCurrency: currency,
          StayDates: {
            start: checkIn,
            end: checkOut,
          },
          HotelSearchCriterion: {
            "@type": "HotelSearchCriterion",
            numberOfRooms: rooms,
            PropertyRequest: [
              {
                "@type": "PropertyRequest",
                PropertyKey: {
                  "@type": "PropertyKey",
                  ...(chainCode ? { chainCode } : {}),
                  propertyCode,
                },
              },
            ],
            RoomStayCandidates: {
              "@type": "RoomStayCandidates",
              RoomStayCandidate: [
                {
                  "@type": "RoomStayCandidate",
                  GuestCounts: {
                    "@type": "GuestCounts",
                    GuestCount: guestCounts,
                  },
                },
              ],
            },
          },
        },
      ],
    },
  };

  try {
    const [fxRates, result] = await Promise.all([
      getUsdExchangeRates(),
      callTravelportHotelApi({
        path: "/availability/catalogofferingshospitality",
        payload: requestPayload,
        apiName: "hotel-availability",
        retryOnTransientError: true,
        meta: { propertyCode, chainCode, checkIn, checkOut },
      }),
    ]);

    if (!result.ok) {
      return res.status(result.status >= 400 ? result.status : 502).json({
        success: false,
        code: "TRAVELPORT_HOTEL_AVAILABILITY_ERROR",
        source: "travelport-live",
        message: result.errorMessage,
        status: result.status,
        correlationId: result.correlationId,
        isProvisioningError: result.isProvisioningError,
        offers: [],
        upstreamDetails: result.data,
      });
    }

    const normalized = await normalizeHotelAvailabilityResponseUsd(result.data, nights, fxRates);

    return res.status(200).json({
      success: true,
      source: "travelport-live",
      correlationId: result.correlationId,
      nights,
      catalogOfferingsIdentifier: normalized.catalogOfferingsIdentifier,
      count: normalized.offers.length,
      offers: normalized.offers,
      ...(normalized.offers.length === 0 && result.errorMessage
        ? { warning: result.errorMessage }
        : {}),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Hotel availability lookup failed";
    return res.status(500).json({
      success: false,
      message,
      offers: [],
    });
  }
}

export default withApiHandler(handler, { methods: ["POST"] });
