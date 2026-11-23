import type { NextApiRequest, NextApiResponse } from "next";
import { withApiHandler } from "@/server/api-handler";
import {
  callTravelportHotelApi,
  computeStayNights,
  normalizeHotelDetailsResponseUsd,
} from "@/server/travelport-hotel";

type HotelDetailsBody = {
  chainCode?: string;
  propertyCode?: string;
  imageSize?: "Small" | "Medium" | "Large" | "ExtraLarge" | "Thumbnail" | string;
  checkIn?: string;
  checkOut?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  const source = (req.method === "GET" ? req.query : req.body ?? {}) as HotelDetailsBody;
  const chainCode = String(source.chainCode || "").trim().toUpperCase();
  const propertyCode = String(source.propertyCode || "").trim();
  const imageSize = ["Small", "Medium", "Large", "ExtraLarge", "Thumbnail"].includes(
    String(source.imageSize || "").trim()
  )
    ? String(source.imageSize).trim()
    : "Large";
  const checkIn = String(source.checkIn || "").trim();
  const checkOut = String(source.checkOut || "").trim();

  if (!chainCode || !propertyCode) {
    return res.status(400).json({
      message: "chainCode and propertyCode are required for hotel details.",
    });
  }

  const nights = checkIn && checkOut ? computeStayNights(checkIn, checkOut) : 1;
  const query = new URLSearchParams({
    chainCode,
    propertyCode,
    ImageSize: imageSize,
  });

  try {
    const result = await callTravelportHotelApi({
      method: "GET",
      path: `/search/propertiesdetail?${query.toString()}`,
      apiName: "hotel-details",
      meta: { chainCode, propertyCode, imageSize },
      retryOnTransientError: true,
    });

    if (!result.ok) {
      return res.status(result.status >= 400 ? result.status : 502).json({
        success: false,
        code: "TRAVELPORT_HOTEL_DETAILS_ERROR",
        source: "travelport-live",
        message: result.errorMessage,
        status: result.status,
        correlationId: result.correlationId,
        property: null,
        upstreamDetails: result.data,
      });
    }

    const property = await normalizeHotelDetailsResponseUsd(result.data, nights);

    return res.status(200).json({
      success: true,
      source: "travelport-live",
      correlationId: result.correlationId,
      property,
      ...(property ? {} : { warning: result.errorMessage || "No details returned for this property." }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hotel details lookup failed";
    return res.status(500).json({
      success: false,
      code: "TRAVELPORT_HOTEL_DETAILS_ERROR",
      message,
      property: null,
    });
  }
}

export default withApiHandler(handler, { methods: ["GET", "POST"] });
