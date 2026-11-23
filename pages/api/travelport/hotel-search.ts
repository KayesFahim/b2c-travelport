import type { NextApiRequest, NextApiResponse } from "next";
import { withApiHandler } from "@/server/api-handler";
import {
  callTravelportHotelApi,
  computeStayNights,
  normalizeHotelSearchResponse,
} from "@/server/travelport-hotel";

type HotelSearchBody = {
  destination?: string;
  cityCode?: string;
  airportCode?: string;
  latitude?: number | string;
  longitude?: number | string;
  radiusKm?: number | string;
  checkIn?: string;
  checkOut?: string;
  rooms?: number | string;
  adults?: number | string;
  children?: number | string;
  childAges?: number[];
  currency?: string;
  hotelName?: string;
  chainCodes?: string[];
  minStarRating?: number | string;
  returnOnlyAvailable?: boolean;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  const body = (req.body ?? {}) as HotelSearchBody;
  const checkIn = String(body.checkIn || "").trim();
  const checkOut = String(body.checkOut || "").trim();

  if (!checkIn || !checkOut) {
    return res.status(400).json({
      message: "checkIn and checkOut dates (YYYY-MM-DD) are required.",
    });
  }

  const cityCode = String(body.cityCode || "").trim().toUpperCase().slice(0, 3);
  const airportCode = String(body.airportCode || "").trim().toUpperCase().slice(0, 3);
  const destinationRaw = String(body.destination || "").trim();
  const lat = body.latitude !== undefined && body.latitude !== "" ? Number(body.latitude) : NaN;
  const lng = body.longitude !== undefined && body.longitude !== "" ? Number(body.longitude) : NaN;
  const hasCoordinates = Number.isFinite(lat) && Number.isFinite(lng);

  // Resolve 3-letter IATA city/airport code from destination if cityCode not passed explicitly
  let resolvedCode = cityCode || airportCode;
  if (!resolvedCode && destinationRaw) {
    const parenMatch = destinationRaw.match(/\(([A-Z]{3})\)/i);
    if (parenMatch?.[1]) {
      resolvedCode = parenMatch[1].toUpperCase();
    } else if (/^[A-Za-z]{3}$/.test(destinationRaw)) {
      resolvedCode = destinationRaw.toUpperCase();
    }
  }

  if (!resolvedCode && !hasCoordinates && !destinationRaw) {
    return res.status(400).json({
      message: "Provide cityCode, airportCode, destination, or latitude/longitude.",
    });
  }

  const rooms = Math.max(1, Math.min(9, Number(body.rooms) || 1));
  const adults = Math.max(1, Math.min(9, Number(body.adults) || 1));
  const children = Math.max(0, Math.min(6, Number(body.children) || 0));
  const radiusValue = Math.max(1, Math.min(100, Number(body.radiusKm) || 25));
  const currency =
    String(body.currency || process.env.TRAVELPORT_DEFAULT_CURRENCY || "USD")
      .trim()
      .toUpperCase()
      .slice(0, 3) || "USD";
  const hotelName = String(body.hotelName || "").trim();
  const chainCodes = Array.isArray(body.chainCodes)
    ? body.chainCodes
        .map((code) => String(code || "").trim().toUpperCase())
        .filter((code) => /^[A-Z0-9]{2}$/.test(code))
    : [];
  const minStarRating = Number(body.minStarRating) || 0;
  const nights = computeStayNights(checkIn, checkOut);

  const guestCountItems: Array<Record<string, unknown>> = [
    {
      "@type": "GuestCount",
      ageQualifyingCode: "10",
      count: adults,
    },
  ];
  if (children > 0) {
    const ages =
      Array.isArray(body.childAges) && body.childAges.length === children
        ? body.childAges
        : Array.from({ length: children }, () => 8);
    ages.forEach((age) => {
      guestCountItems.push({
        "@type": "GuestCount",
        ageQualifyingCode: "8",
        age: Math.max(1, Math.min(17, Number(age) || 8)),
        count: 1,
      });
    });
  }

  const searchBy = hasCoordinates
    ? {
        "@type": "SearchByCoordinates",
        GeographicCoordinates: {
          "@type": "GeographicCoordinates",
          latitude: lat,
          longitude: lng,
        },
        SearchRadius: {
          "@type": "SearchRadius",
          value: Math.min(25, radiusValue),
          unitOfDistance: "Kilometers",
        },
      }
    : airportCode
      ? {
          "@type": "SearchByAirport",
          SearchAirport: airportCode,
          SearchRadius: {
            "@type": "SearchRadius",
            value: Math.min(25, radiusValue),
            unitOfDistance: "Kilometers",
          },
        }
      : {
          "@type": "SearchByCity",
          SearchCity: resolvedCode || destinationRaw,
          SearchRadius: {
            "@type": "SearchRadius",
            value: Math.min(25, radiusValue),
            unitOfDistance: "Kilometers",
          },
        };

  const roomStayCandidates = Array.from({ length: rooms }, () => ({
    "@type": "RoomStayCandidate",
    GuestCounts: {
      "@type": "GuestCounts",
      GuestCount: guestCountItems,
    },
  }));

  const requestPayload: Record<string, unknown> = {
    PropertiesQuerySearch: {
      "@type": "PropertiesQuerySearch",
      CheckInDate: checkIn,
      CheckOutDate: checkOut,
      RoomStayCandidate: roomStayCandidates,
      SearchBy: searchBy,
      RequestedCurrency: currency,
      ...(hotelName ? { HotelName: hotelName } : {}),
      ...(chainCodes.length > 0 ? { ChainCodes: chainCodes } : {}),
      ...(minStarRating >= 1 && minStarRating <= 5
        ? {
            Rating: {
              "@type": "Rating",
              value: minStarRating,
            },
          }
        : {}),
    },
  };

  try {
    const result = await callTravelportHotelApi({
      path: "/search/properties/search",
      payload: requestPayload,
      apiName: "hotel-search",
      meta: {
        cityCode: resolvedCode || destinationRaw,
        checkIn,
        checkOut,
        rooms,
        adults,
      },
    });

    if (!result.ok) {
      return res.status(result.status >= 400 ? result.status : 502).json({
        success: false,
        code: "TRAVELPORT_HOTEL_SEARCH_ERROR",
        source: "travelport-live",
        message: result.errorMessage,
        status: result.status,
        correlationId: result.correlationId,
        isProvisioningError: result.isProvisioningError,
        properties: [],
        nights,
        searchCriteria: {
          destination: destinationRaw || resolvedCode,
          cityCode: resolvedCode,
          checkIn,
          checkOut,
          rooms,
          adults,
          children,
          currency,
        },
        upstreamDetails: result.data,
      });
    }

    const properties = normalizeHotelSearchResponse(result.data, nights);

    return res.status(200).json({
      success: true,
      source: "travelport-live",
      correlationId: result.correlationId,
      nights,
      count: properties.length,
      properties,
      ...(properties.length === 0 && result.errorMessage
        ? { warning: result.errorMessage }
        : {}),
      searchCriteria: {
        destination: destinationRaw || resolvedCode,
        cityCode: resolvedCode,
        checkIn,
        checkOut,
        rooms,
        adults,
        children,
        currency,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hotel search failed";
    return res.status(500).json({
      success: false,
      message,
      properties: [],
    });
  }
}

export default withApiHandler(handler, { methods: ["POST"] });
