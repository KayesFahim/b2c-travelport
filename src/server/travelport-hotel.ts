import { randomUUID } from "crypto";
import { getTravelportAccessToken } from "@/server/travelport-token";
import { fetchUpstream } from "@/server/upstream-fetch";
import { logTravelportApi } from "@/utils/travelportLogger";

export interface HotelGuestCount {
  adults: number;
  children: number;
  childAges?: number[];
}

export interface NormalizedHotelProperty {
  propertyCode: string;
  chainCode: string;
  hotelName: string;
  starRating: number | null;
  ratingProvider: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  distanceValue: number | null;
  distanceUnit: string;
  phone: string;
  imageUrl: string;
  amenities: string[];
  currencyCode: string;
  minTotalPrice: number | null;
  minNightlyPrice: number | null;
  available: boolean;
  aggregator: string;
  identifier: string;
  raw?: Record<string, unknown>;
}

export interface NormalizedHotelRoomOffer {
  offerId: string;
  catalogOfferingsIdentifier: string;
  catalogOfferingIdentifier: string;
  productIdentifier: string;
  propertyCode: string;
  chainCode: string;
  roomName: string;
  roomDescription: string;
  rateCode: string;
  ratePlanName: string;
  mealPlan: string;
  bedType: string;
  maxOccupancy: number | null;
  refundable: boolean;
  freeCancellationDeadline: string | null;
  cancellationSummary: string;
  guaranteeRequired: boolean;
  paymentType: string;
  currencyCode: string;
  basePrice: number;
  taxes: number;
  totalPrice: number;
  nightlyPrice: number;
  commissionable: boolean;
  aggregator: string;
  raw?: Record<string, unknown>;
}

export function getHotelBaseUrl(): string {
  const configured = String(process.env.TRAVELPORT_HOTEL_URL || "").trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const flightsUrl = String(process.env.TRAVELPORT_FLIGHTS_URL || "").trim();
  if (flightsUrl) {
    const match = flightsUrl.match(/^(https?:\/\/[^/]+\/\d+)\/air\b/i);
    if (match?.[1]) {
      return `${match[1]}/hotel`;
    }
  }

  const version = String(
    process.env.TRAVELPORT_HOTEL_VERSION || process.env.TRAVELPORT_VERSION || "11"
  ).trim();
  return `https://api.pp.travelport.net/${version}/hotel`;
}

export function getHotelApiVersion(): string {
  return String(
    process.env.TRAVELPORT_HOTEL_VERSION || process.env.TRAVELPORT_VERSION || "11"
  ).trim();
}

export async function callTravelportHotelApi(params: {
  path: string;
  payload: Record<string, unknown>;
  apiName: string;
  meta?: Record<string, unknown>;
}): Promise<{
  ok: boolean;
  status: number;
  url: string;
  correlationId: string;
  data: Record<string, unknown>;
  errorMessage: string;
  hasPayloadErrors: boolean;
  isProvisioningError: boolean;
}> {
  const accessToken = await getTravelportAccessToken();
  const baseUrl = getHotelBaseUrl();
  const version = getHotelApiVersion();
  const accessGroup = String(process.env.TRAVELPORT_ACCESS_GROUP || "").trim();
  const pccCore = String(process.env.TRAVELPORT_PCC_CORE || "").trim();
  const correlationId = randomUUID();
  const traceId = randomUUID();
  const url = `${baseUrl}${params.path.startsWith("/") ? params.path : `/${params.path}`}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "Accept-Version": version,
    "Content-Version": version,
    "TVP-Correlation-Id": correlationId,
    TraceId: traceId,
  };

  if (accessGroup) {
    headers.XAUTH_TRAVELPORT_ACCESSGROUP = accessGroup;
  }
  if (pccCore) {
    headers["TVP-PCC-Core"] = pccCore;
  }

  const response = await fetchUpstream(url, {
    method: "POST",
    headers,
    body: JSON.stringify(params.payload),
  });

  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  } catch {
    data = { rawText: text };
  }

  logTravelportApi({
    endpoint: url,
    request: {
      method: "POST",
      body: params.payload,
    },
    response: data,
    status: response.status,
    meta: {
      api: params.apiName,
      correlationId,
      ...(params.meta || {}),
    },
  });

  const errorMessage = extractHotelErrorMessage(data, response.status);
  const isProvisioningError =
    response.status === 500 ||
    response.status === 403 ||
    /INTERNAL SERVER ERROR|NOT AUTHORIZED|ENTITLEMENT|PROVISION/i.test(errorMessage);

  return {
    ok: response.ok,
    status: response.status,
    url,
    correlationId,
    data,
    errorMessage,
    hasPayloadErrors: hasHotelPayloadErrors(data),
    isProvisioningError,
  };
}

function toNum(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toStr(value: unknown, fallback = ""): string {
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

export function extractHotelErrorMessage(
  payload: Record<string, unknown>,
  status: number
): string {
  const candidates: unknown[] = [
    (payload as any)?.ErrorResponse?.Result?.Error?.[0]?.Message,
    (payload as any)?.PropertiesResponse?.Result?.Error?.[0]?.Message,
    (payload as any)?.CatalogOfferingsHospitalityResponse?.Result?.Error?.[0]?.Message,
    (payload as any)?.OfferListResponse?.Result?.Error?.[0]?.Message,
    (payload as any)?.ReservationResponse?.Result?.Error?.[0]?.Message,
    (payload as any)?.Result?.Error?.[0]?.Message,
    (payload as any)?.Error?.[0]?.Message,
    (payload as any)?.error?.message,
    (payload as any)?.message,
    (payload as any)?.Message,
    (payload as any)?.error_description,
  ];

  for (const item of candidates) {
    const text = toStr(item);
    if (text) return text;
  }

  if (status >= 500) {
    return `Travelport Stays API returned HTTP ${status} (INTERNAL SERVER ERROR). Verify that Hotel/Stays entitlements and TVP-PCC-Core are provisioned for this Travelport Access Group.`;
  }
  if (status >= 400) {
    return `Travelport Stays API rejected the request with HTTP ${status}.`;
  }
  return "";
}

export function hasHotelPayloadErrors(payload: Record<string, unknown>): boolean {
  const errorLists = [
    (payload as any)?.ErrorResponse?.Result?.Error,
    (payload as any)?.PropertiesResponse?.Result?.Error,
    (payload as any)?.CatalogOfferingsHospitalityResponse?.Result?.Error,
    (payload as any)?.OfferListResponse?.Result?.Error,
    (payload as any)?.ReservationResponse?.Result?.Error,
    (payload as any)?.Result?.Error,
  ];
  return errorLists.some((list) => Array.isArray(list) && list.length > 0);
}

export function computeStayNights(checkIn: string, checkOut: string): number {
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  const diff = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, diff);
}

export function normalizeHotelSearchResponse(
  raw: Record<string, unknown>,
  nights = 1
): NormalizedHotelProperty[] {
  const root =
    (raw as any)?.PropertiesResponse?.Properties ??
    (raw as any)?.Properties ??
    (raw as any)?.CatalogOfferingsHospitalityResponse?.CatalogOfferings ??
    {};

  const propertyInfoList: any[] = Array.isArray(root?.PropertyInfo)
    ? root.PropertyInfo
    : Array.isArray(root?.Property)
      ? root.Property
      : Array.isArray((raw as any)?.PropertyInfo)
        ? (raw as any).PropertyInfo
        : [];

  return propertyInfoList.map((entry, idx) => {
    const detail = entry?.PropertyDetail || entry?.Property || entry || {};
    const addressObj = detail?.PropertyAddress || detail?.Address || entry?.Address || {};
    const addressLines = Array.isArray(addressObj?.AddressLine)
      ? addressObj.AddressLine.map((line: unknown) => toStr(line)).filter(Boolean)
      : [toStr(addressObj?.Street || addressObj?.street)].filter(Boolean);
    const city = toStr(addressObj?.City || addressObj?.city);
    const country = toStr(addressObj?.Country?.value || addressObj?.Country || addressObj?.country);
    const postalCode = toStr(addressObj?.PostalCode || addressObj?.postalCode);
    const fullAddress = [...addressLines, city, country].filter(Boolean).join(", ");

    const ratings = Array.isArray(detail?.Rating) ? detail.Rating : [];
    const firstRating = ratings[0] || {};
    const starRating = toNum(firstRating?.value ?? detail?.starRating ?? entry?.starRating);
    const ratingProvider = toStr(firstRating?.provider || "Travelport");

    const geo = detail?.GeographicLocation || detail?.GeoLocation || entry?.GeoLocation || {};
    const distance = entry?.Distance || detail?.Distance || {};

    const amenityList: string[] = Array.isArray(detail?.PropertyAmenity)
      ? detail.PropertyAmenity.map((a: any) =>
          toStr(a?.description || a?.code || a?.value || a)
        ).filter(Boolean)
      : Array.isArray(entry?.Amenities)
        ? entry.Amenities.map((a: any) => toStr(a?.description || a?.value || a)).filter(Boolean)
        : [];

    const images = Array.isArray(detail?.Image)
      ? detail.Image
      : Array.isArray(entry?.Images)
        ? entry.Images
        : [];
    const imageUrl = toStr(images[0]?.url || images[0]?.value || images[0]);

    const lowestRateObj =
      entry?.LowestAvailableRate ||
      entry?.MinimumAmount ||
      entry?.LowestRate ||
      entry?.Price ||
      detail?.MinimumAmount ||
      {};
    const currencyCode = toStr(
      lowestRateObj?.code || lowestRateObj?.CurrencyCode?.value || "USD"
    );
    const rawRateVal = toNum(
      lowestRateObj?.value ?? lowestRateObj?.TotalPrice ?? lowestRateObj?.Amount
    );
    const isNightlyLowestRate = Boolean(entry?.LowestAvailableRate?.value !== undefined);
    const minNightlyPrice =
      rawRateVal !== null
        ? isNightlyLowestRate
          ? Math.round(rawRateVal * 100) / 100
          : Math.round((rawRateVal / Math.max(1, nights)) * 100) / 100
        : null;
    const minTotalPrice =
      rawRateVal !== null
        ? isNightlyLowestRate
          ? Math.round(rawRateVal * Math.max(1, nights) * 100) / 100
          : Math.round(rawRateVal * 100) / 100
        : null;

    const propertyCode = toStr(
      detail?.PropertyKey?.propertyCode ||
        entry?.PropertyKey?.propertyCode ||
        detail?.propertyCode ||
        entry?.propertyCode ||
        `PROP-${idx + 1}`
    );
    const chainCode = toStr(
      detail?.PropertyKey?.chainCode ||
        entry?.PropertyKey?.chainCode ||
        detail?.chainCode ||
        entry?.chainCode
    );

    const phones = Array.isArray(detail?.Telephone) ? detail.Telephone : [];
    const firstPhone = phones[0];
    const phone =
      typeof firstPhone === "string"
        ? firstPhone.trim()
        : toStr(firstPhone?.phoneNumber || firstPhone?.value || "");

    const availabilityText = toStr(entry?.availability).toLowerCase();
    const available =
      availabilityText === "open" ||
      (availabilityText !== "close" && availabilityText !== "notavailable");

    return {
      propertyCode,
      chainCode,
      hotelName: toStr(detail?.name || entry?.name || `Property ${propertyCode}`),
      starRating,
      ratingProvider,
      address: fullAddress,
      city,
      country,
      postalCode,
      latitude: toNum(geo?.latitude),
      longitude: toNum(geo?.longitude),
      distanceValue: toNum(distance?.value),
      distanceUnit: toStr(distance?.unitOfDistance || distance?.unit || "Kilometers"),
      phone,
      imageUrl,
      amenities: amenityList.slice(0, 12),
      currencyCode,
      minTotalPrice,
      minNightlyPrice,
      available,
      aggregator: toStr(entry?.Identifier?.authority || entry?.aggregator || detail?.aggregator || "TVPT"),
      identifier: toStr(entry?.id || `${chainCode}-${propertyCode}`),
      raw: entry,
    };
  }).sort((a, b) => {
    if (a.available !== b.available) return a.available ? -1 : 1;
    if (a.minNightlyPrice !== null && b.minNightlyPrice !== null) {
      return a.minNightlyPrice - b.minNightlyPrice;
    }
    if (a.minNightlyPrice !== null) return -1;
    if (b.minNightlyPrice !== null) return 1;
    return 0;
  });
}

export function normalizeHotelAvailabilityResponse(
  raw: Record<string, unknown>,
  nights = 1
): {
  catalogOfferingsIdentifier: string;
  offers: NormalizedHotelRoomOffer[];
} {
  const responseRoot =
    (raw as any)?.CatalogOfferingsHospitalityResponse ??
    (raw as any)?.CatalogOfferingsResponse ??
    raw;
  const offeringsContainer = responseRoot?.CatalogOfferings || {};
  const catalogOfferingsIdentifier = toStr(offeringsContainer?.Identifier?.value || "");

  const catalogOfferingList: any[] = Array.isArray(offeringsContainer?.CatalogOffering)
    ? offeringsContainer.CatalogOffering
    : [];
  const referenceList: any[] = Array.isArray(responseRoot?.ReferenceList)
    ? responseRoot.ReferenceList
    : [];

  const products: any[] =
    referenceList.find((ref) => Array.isArray(ref?.Product))?.Product ?? [];
  const termsList: any[] =
    referenceList.find((ref) => Array.isArray(ref?.TermsAndConditions))?.TermsAndConditions ?? [];

  const productMap = new Map<string, any>(products.map((p) => [toStr(p?.id), p]));
  const termsMap = new Map<string, any>(termsList.map((t) => [toStr(t?.id), t]));

  const offers: NormalizedHotelRoomOffer[] = [];

  catalogOfferingList.forEach((offering, idx) => {
    const offeringIdentifierValue = toStr(
      offering?.Identifier?.value || offering?.id || `co-${idx + 1}`
    );
    const offeringAuthority = toStr(offering?.Identifier?.authority || "TVPT");
    const productOption = Array.isArray(offering?.ProductOptions)
      ? offering.ProductOptions[0]
      : null;
    const inlineProduct =
      productOption?.Product?.[0] || offering?.Product?.[0] || {};
    const productRef = toStr(
      inlineProduct?.productRef ||
        inlineProduct?.id ||
        inlineProduct?.bookingCode ||
        `p-${idx}`
    );
    const product = productMap.get(productRef) || inlineProduct || {};
    const termsRef = toStr(offering?.TermsAndConditions?.termsAndConditionsRef);
    const terms =
      termsMap.get(termsRef) ||
      (Array.isArray(offering?.TermsAndConditionsFull)
        ? offering.TermsAndConditionsFull[0]
        : offering?.TermsAndConditions) ||
      {};

    const price = offering?.Price || offering?.TotalPrice || {};
    const currencyCode = toStr(price?.CurrencyCode?.value || price?.CurrencyCode || "USD");
    const totalPrice = toNum(price?.TotalPrice ?? price?.Total ?? price?.Amount) ?? 0;
    const basePrice = toNum(price?.Base) ?? totalPrice;
    const taxes = toNum(price?.TotalTaxes) ?? Math.max(0, totalPrice - basePrice);
    const firstNightlyAmount = toNum(
      price?.PriceBreakdown?.[0]?.NightlyRate?.[0]?.Amount?.Base
    );
    const nightlyPrice =
      firstNightlyAmount !== null
        ? Math.round(firstNightlyAmount * 100) / 100
        : Math.round((totalPrice / Math.max(1, nights)) * 100) / 100;

    const roomType = product?.RoomType || product?.RoomStay?.RoomType || {};
    const roomCharacteristics = roomType?.RoomCharacteristics || {};
    const bedConfigs = Array.isArray(roomCharacteristics?.BedConfiguration)
      ? roomCharacteristics.BedConfiguration
      : Array.isArray(roomCharacteristics?.bedConfiguration)
        ? roomCharacteristics.bedConfiguration
        : [];
    const bedText = bedConfigs
      .map((b: any) =>
        [b?.quantity ? `${b.quantity}x` : "", toStr(b?.bedType)].filter(Boolean).join(" ")
      )
      .filter(Boolean)
      .join(", ");
    const ratePlan = product?.RatePlan || product?.RoomStay?.RatePlan || {};
    const propertyKey = product?.PropertyKey || offering?.PropertyKey || {};

    const cancelPenalties = Array.isArray(terms?.CancelPenalty) ? terms.CancelPenalty : [];
    const firstPenalty = cancelPenalties[0] || {};
    const refundable = Boolean(
      firstPenalty?.refundableInd !== false && !firstPenalty?.NonRefundableInd
    );
    const deadline = toStr(
      firstPenalty?.Deadline?.SpecificDate?.date ||
        firstPenalty?.Deadline?.Time ||
        ""
    );
    const cancellationSummary = toStr(
      firstPenalty?.Description?.value ||
        (refundable
          ? deadline
            ? `Free cancellation before ${deadline}`
            : "Refundable per property policy"
          : "Non-refundable rate")
    );

    const guarantee = Array.isArray(terms?.Guarantee)
      ? terms.Guarantee[0] || {}
      : terms?.Guarantee || {};
    const guaranteeRequired = Boolean(guarantee?.guaranteeType || terms?.Guarantee);
    const roomFullDesc = toStr(
      roomType?.Description?.value || ratePlan?.Description?.value || ""
    );
    const roomTitle = toStr(
      roomType?.name ||
        (roomFullDesc ? roomFullDesc.split(",")[0] : "") ||
        roomType?.roomCategory ||
        "Standard Room"
    );

    offers.push({
      offerId: `${offeringIdentifierValue}-${idx}`,
      catalogOfferingsIdentifier:
        catalogOfferingsIdentifier || offeringIdentifierValue.split(":")[0] || offeringIdentifierValue,
      catalogOfferingIdentifier: offeringIdentifierValue,
      productIdentifier: productRef,
      propertyCode: toStr(propertyKey?.propertyCode),
      chainCode: toStr(propertyKey?.chainCode),
      roomName: roomTitle,
      roomDescription: roomFullDesc,
      rateCode: toStr(ratePlan?.rateCode || product?.bookingCode),
      ratePlanName: toStr(ratePlan?.ratePlanName || ratePlan?.name || "Best Available Rate"),
      mealPlan: toStr(
        product?.MealsIncluded?.breakfastInd
          ? "Breakfast Included"
          : product?.MealsIncluded?.allInclusiveInd
            ? "All Inclusive"
            : "Room Only"
      ),
      bedType: bedText,
      maxOccupancy: toNum(roomType?.maxOccupancy),
      refundable,
      freeCancellationDeadline: deadline || null,
      cancellationSummary,
      guaranteeRequired,
      paymentType: toStr(guarantee?.guaranteeType || "GuaranteeRequired"),
      currencyCode,
      basePrice,
      taxes,
      totalPrice,
      nightlyPrice,
      commissionable: Boolean(ratePlan?.commissionableInd),
      aggregator: offeringAuthority,
      raw: offering,
    });
  });

  return {
    catalogOfferingsIdentifier,
    offers: offers.sort((a, b) => a.totalPrice - b.totalPrice),
  };
}
