import { randomUUID } from "crypto";
import { getTravelportAccessToken } from "@/server/travelport-token";
import { fetchUpstream } from "@/server/upstream-fetch";
import { logTravelportApi } from "@/utils/travelportLogger";
import {
  convertToUsd,
  extractTravelportUsdRates,
  getUsdExchangeRates,
  roundUsd,
} from "@/server/currency-usd";

export interface HotelGuestCount {
  adults: number;
  children: number;
  childAges?: number[];
}

export interface HotelAmenityFlags {
  hasPool: boolean;
  hasWifi: boolean;
  hasParking: boolean;
  hasGym: boolean;
  hasRestaurant: boolean;
  hasSpa: boolean;
  hasAc: boolean;
  hasShuttle: boolean;
  hasBusiness: boolean;
  petFriendly: boolean;
  hasBreakfast: boolean;
  freeCancellationHint: boolean;
  creditCardRequiredHint: boolean;
  prepayRequiredHint: boolean;
}

export interface NormalizedHotelImage {
  url: string;
  caption: string;
  dimensionCategory: string;
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
  distanceKm: number | null;
  phone: string;
  email?: string;
  imageUrl: string;
  images: NormalizedHotelImage[];
  amenities: string[];
  amenityFlags: HotelAmenityFlags;
  guestRoomInfo?: Array<{ label: string; count: number }>;
  businessServices?: string[];
  accessibilityFeatures?: string[];
  currencyCode: string;
  minTotalPrice: number | null;
  minNightlyPrice: number | null;
  maxNightlyPrice: number | null;
  maxTotalPrice: number | null;
  available: boolean;
  aggregator: string;
  identifier: string;
  descriptions?: Array<{ title: string; text: string }>;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  raw?: Record<string, unknown>;
}

export interface NormalizedHotelNightlyRate {
  startDate: string;
  nights: number;
  base: number;
  taxes: number;
  total: number;
}

export interface NormalizedHotelRoomOffer {
  offerId: string;
  catalogOfferingsIdentifier: string;
  catalogOfferingIdentifier: string;
  productIdentifier: string;
  authority: string;
  propertyCode: string;
  chainCode: string;
  roomName: string;
  roomDescription: string;
  rateCode: string;
  ratePlanName: string;
  mealPlan: string;
  breakfastIncluded: boolean;
  bedType: string;
  maxOccupancy: number | null;
  wifiIncluded: boolean;
  smokingAllowed: string;
  accessibleRoom: boolean;
  refundable: boolean;
  freeCancellation: boolean;
  freeCancellationDeadline: string | null;
  cancellationSummary: string;
  guaranteeRequired: boolean;
  creditCardRequired: boolean;
  prepayRequired: boolean;
  paymentType: string;
  currencyCode: string;
  basePrice: number;
  taxes: number;
  totalPrice: number;
  nightlyPrice: number;
  nightlyTotalPrice: number;
  localFeesTotal: number;
  localFeesDetail: Array<{ description: string; amount: number; currencyCode: string; frequency: string }>;
  taxBreakdown: Array<{ description: string; amount: number; currencyCode: string }>;
  nightlyRates: NormalizedHotelNightlyRate[];
  commissionable: boolean;
  aggregator: string;
  raw?: Record<string, unknown>;
}

export interface NormalizedHotelRules {
  offerIdentifier: string;
  propertyName: string;
  bookingCode: string;
  roomDescription: string;
  bedType: string;
  wifiIncluded: boolean;
  maxOccupancy: number | null;
  currencyCode: string;
  basePrice: number;
  taxes: number;
  totalPrice: number;
  cancellationPolicy: string;
  guaranteePolicy: string;
  depositPolicy: string;
  rateDescription: string;
  promotionalInfo: string;
  otherInfo: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  freeCancellation: boolean;
  creditCardRequired: boolean;
  prepayRequired: boolean;
  acceptedCards: string[];
  textBlocks: Array<{ title: string; text: string }>;
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

function buildHotelHeaders(accessToken: string, correlationId: string): Record<string, string> {
  const version = getHotelApiVersion();
  const accessGroup = String(process.env.TRAVELPORT_ACCESS_GROUP || "").trim();
  const pccCore = String(process.env.TRAVELPORT_PCC_CORE || "").trim();

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
    Authorization: `Bearer ${accessToken}`,
    "Accept-Version": version,
    "Content-Version": version,
    "TVP-Correlation-Id": correlationId,
    TraceId: `Trace_${randomUUID().slice(0, 12)}`,
  };

  if (accessGroup) {
    headers.XAUTH_TRAVELPORT_ACCESSGROUP = accessGroup;
  }
  if (pccCore) {
    headers["TVP-PCC-Core"] = pccCore;
  }

  return headers;
}

export async function callTravelportHotelApi(params: {
  path: string;
  method?: "GET" | "POST";
  payload?: Record<string, unknown>;
  apiName: string;
  meta?: Record<string, unknown>;
  retryOnTransientError?: boolean;
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
  const method = params.method || "POST";
  const url = `${baseUrl}${params.path.startsWith("/") ? params.path : `/${params.path}`}`;
  const maxAttempts = params.retryOnTransientError ? 2 : 1;

  let lastResult: {
    ok: boolean;
    status: number;
    url: string;
    correlationId: string;
    data: Record<string, unknown>;
    errorMessage: string;
    hasPayloadErrors: boolean;
    isProvisioningError: boolean;
  } | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const correlationId = randomUUID();
    const headers = buildHotelHeaders(accessToken, correlationId);

    const response = await fetchUpstream(url, {
      method,
      headers,
      ...(method !== "GET" && params.payload
        ? { body: JSON.stringify(params.payload) }
        : {}),
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
        method,
        ...(params.payload ? { body: params.payload } : {}),
      },
      response: data,
      status: response.status,
      meta: {
        api: params.apiName,
        attempt,
        correlationId,
        ...(params.meta || {}),
      },
    });

    const errorMessage = extractHotelErrorMessage(data, response.status);
    const hasPayloadErrors = hasHotelPayloadErrors(data);
    const isProvisioningError =
      response.status === 500 ||
      response.status === 403 ||
      /NOT AUTHORIZED|ENTITLEMENT|PROVISION/i.test(errorMessage);

    lastResult = {
      ok: response.ok,
      status: response.status,
      url,
      correlationId,
      data,
      errorMessage,
      hasPayloadErrors,
      isProvisioningError,
    };

    const isTransientCommError =
      /COMMUNICATION ERROR|RETRY|TIMEOUT|TEMPORARILY/i.test(errorMessage) ||
      response.status === 502 ||
      response.status === 503 ||
      response.status === 504;

    if (attempt < maxAttempts && isTransientCommError) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      continue;
    }

    return lastResult;
  }

  return lastResult!;
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
    (payload as any)?.OfferHospitalityResponse?.Result?.Error?.[0]?.Message,
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
    return `Travelport Stays API returned HTTP ${status}. Please retry shortly.`;
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
    (payload as any)?.OfferHospitalityResponse?.Result?.Error,
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

function buildAmenityFlags(amenities: string[], corpusExtra = ""): HotelAmenityFlags {
  const corpus = `${amenities.join(" ")} ${corpusExtra}`.toLowerCase();
  return {
    hasPool: /\b(pool|swimming|aquatic)\b/.test(corpus),
    hasWifi: /\b(wi-fi|wifi|wireless|internet)\b/.test(corpus),
    hasParking: /\b(parking|valet|garage)\b/.test(corpus),
    hasGym: /\b(gym|fitness|health club|exercise|workout)\b/.test(corpus),
    hasRestaurant: /\b(restaurant|dining|cafe|coffee shop|lounge|bar)\b/.test(corpus),
    hasSpa: /\b(spa|sauna|massage|wellness|steam room|jacuzzi|whirlpool)\b/.test(corpus),
    hasAc: /\b(air condition|a\/c|climate control)\b/.test(corpus),
    hasShuttle: /\b(shuttle|airport transfer|transportation)\b/.test(corpus),
    hasBusiness: /\b(business|meeting|conference)\b/.test(corpus),
    petFriendly: /\b(pet|pets allowed|dog|cat)\b/.test(corpus) && !/\bno pets\b/.test(corpus),
    hasBreakfast: /\b(breakfast|continental|buffet|complimentary meal|morning meal)\b/.test(corpus),
    freeCancellationHint:
      /\b(free cancel|cancellation permitted|refundable)\b/.test(corpus) &&
      !/\bnon-refundable|non refundable\b/.test(corpus),
    creditCardRequiredHint: /\b(credit card|guarantee|card required)\b/.test(corpus),
    prepayRequiredHint: /\b(prepay|pre-pay|prepaid|advance deposit|deposit required)\b/.test(corpus),
  };
}

function normalizePropertyEntry(entry: any, idx: number, nights: number): NormalizedHotelProperty {
  const detail = entry?.PropertyDetail || entry?.Property || entry || {};
  const addressObj = detail?.PropertyAddress || detail?.Address || entry?.Address || {};
  const addressLines = Array.isArray(addressObj?.AddressLine)
    ? addressObj.AddressLine.map((line: unknown) => toStr(line)).filter(Boolean)
    : [toStr(addressObj?.Street || addressObj?.street)].filter(Boolean);
  const city = toStr(addressObj?.City || addressObj?.city);
  const country = toStr(
    addressObj?.Country?.value || addressObj?.Country?.name || addressObj?.Country || addressObj?.country
  );
  const postalCode = toStr(addressObj?.PostalCode || addressObj?.postalCode);
  const fullAddress = [...addressLines, city, country].filter(Boolean).join(", ");

  const ratings = Array.isArray(detail?.Rating) ? detail.Rating : [];
  const bestRating =
    ratings.find((r: any) => String(r?.provider || "").toUpperCase() === "GIATA") ||
    ratings.find((r: any) => String(r?.provider || "").toUpperCase() === "AAA") ||
    ratings[0] ||
    {};
  const starRating = toNum(bestRating?.value ?? detail?.starRating ?? entry?.starRating);
  const ratingProvider = toStr(bestRating?.provider || "Travelport");

  const geo = detail?.GeographicLocation || detail?.GeoLocation || entry?.GeoLocation || {};
  const distance = entry?.Distance || detail?.Distance || {};
  const distanceValue = toNum(distance?.value);
  const distanceUnit = toStr(distance?.unitOfDistance || distance?.unit || "Kilometers");
  const distanceKm =
    distanceValue !== null
      ? /mile/i.test(distanceUnit)
        ? Math.round(distanceValue * 1.60934 * 100) / 100
        : Math.round(distanceValue * 100) / 100
      : null;

  const rawAmenities: any[] = Array.isArray(detail?.PropertyAmenity)
    ? detail.PropertyAmenity
    : Array.isArray(entry?.Amenities)
      ? entry.Amenities
      : [];
  const amenities = Array.from(
    new Set(
      rawAmenities
        .map((a) => toStr(a?.description || a?.category || a?.code || a?.value || a))
        .filter(Boolean)
    )
  );

  const rawImages: any[] = Array.isArray(detail?.Image)
    ? detail.Image
    : Array.isArray(entry?.Images)
      ? entry.Images
      : [];
  const images: NormalizedHotelImage[] = rawImages
    .map((img) => ({
      url: toStr(img?.url || img?.value || (typeof img === "string" ? img : "")),
      caption: toStr(img?.caption || ""),
      dimensionCategory: toStr(img?.dimensionCategory || ""),
    }))
    .filter((img) => Boolean(img.url));
  const imageUrl = images[0]?.url || "";

  const lowestRateObj =
    entry?.LowestAvailableRate ||
    entry?.MinimumAmount ||
    entry?.LowestRate ||
    entry?.Price ||
    detail?.MinimumAmount ||
    {};
  const maxRateObj = entry?.MaximumAvailableRate || {};
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

  const rawMaxVal = toNum(maxRateObj?.value);
  const maxNightlyPrice = rawMaxVal !== null ? Math.round(rawMaxVal * 100) / 100 : null;
  const maxTotalPrice =
    maxNightlyPrice !== null
      ? Math.round(maxNightlyPrice * Math.max(1, nights) * 100) / 100
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
  const email = toStr(detail?.Email?.value || detail?.Email || detail?.email || "");

  const guestRoomInfo: Array<{ label: string; count: number }> = Array.isArray(detail?.GuestRoomInfo)
    ? detail.GuestRoomInfo
        .map((g: any) => ({
          label: toStr(g?.description || g?.code),
          count: toNum(g?.number) ?? 0,
        }))
        .filter((g: { label: string; count: number }) => Boolean(g.label) && g.count > 0)
    : [];
  const businessServices: string[] = Array.isArray(detail?.BusinessService)
    ? Array.from(
        new Set(
          detail.BusinessService.map((b: any) => toStr(b?.description || b?.value || b)).filter(Boolean)
        )
      )
    : [];
  const accessibilityFeatures: string[] = Array.isArray(detail?.AccessibilityFeature)
    ? Array.from(
        new Set(
          detail.AccessibilityFeature.map((a: any) => toStr(a?.description || a?.value || a)).filter(Boolean)
        )
      )
    : [];

  const availabilityText = toStr(entry?.availability).toLowerCase();
  const available =
    availabilityText === "open" ||
    (availabilityText !== "close" && availabilityText !== "notavailable");

  const rawDescriptions: Array<{ title: string; text: string }> = [];
  if (Array.isArray(detail?.Description)) {
    detail.Description.forEach((d: any) => {
      const text = toStr(d?.value || d?.text || (typeof d === "string" ? d : ""));
      if (text) rawDescriptions.push({ title: toStr(d?.title || "Overview"), text });
    });
  } else if (detail?.Description?.value) {
    rawDescriptions.push({ title: "Overview", text: toStr(detail.Description.value) });
  }
  if (Array.isArray(detail?.TextBlock)) {
    detail.TextBlock.forEach((tb: any) => {
      const text = Array.isArray(tb?.TextFormatted)
        ? tb.TextFormatted.map((f: any) => toStr(f?.value || f)).filter(Boolean).join(" ")
        : toStr(tb?.value || tb?.text);
      if (text) rawDescriptions.push({ title: toStr(tb?.title || "Details"), text });
    });
  }

  const descCorpus = `${rawDescriptions.map((d) => `${d.title} ${d.text}`).join(" ")} ${businessServices.join(" ")} ${accessibilityFeatures.join(" ")}`;
  const amenityFlags = buildAmenityFlags(amenities, descCorpus);

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
    distanceValue,
    distanceUnit,
    distanceKm,
    phone,
    email,
    imageUrl,
    images,
    amenities,
    amenityFlags,
    guestRoomInfo,
    businessServices,
    accessibilityFeatures,
    currencyCode,
    minTotalPrice,
    minNightlyPrice,
    maxNightlyPrice,
    maxTotalPrice,
    available,
    aggregator: toStr(entry?.Identifier?.authority || entry?.aggregator || detail?.aggregator || "TVPT"),
    identifier: toStr(entry?.id || `${chainCode}-${propertyCode}`),
    descriptions: rawDescriptions,
    checkInTime: toStr(detail?.CheckInOutPolicy?.checkInTime || detail?.checkInTime) || null,
    checkOutTime: toStr(detail?.CheckInOutPolicy?.checkOutTime || detail?.checkOutTime) || null,
  };
}

export function normalizeHotelSearchResponse(
  raw: Record<string, unknown>,
  nights = 1
): {
  properties: NormalizedHotelProperty[];
  totalProperties: number;
  propertiesPerPage: number;
  numberOfPages: number;
  searchIdentifier: string;
} {
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

  const properties = propertyInfoList
    .map((entry, idx) => normalizePropertyEntry(entry, idx, nights))
    .sort((a, b) => {
      if (a.available !== b.available) return a.available ? -1 : 1;
      if (a.minNightlyPrice !== null && b.minNightlyPrice !== null) {
        return a.minNightlyPrice - b.minNightlyPrice;
      }
      if (a.minNightlyPrice !== null) return -1;
      if (b.minNightlyPrice !== null) return 1;
      return 0;
    });

  return {
    properties,
    totalProperties: toNum(root?.totalProperties) ?? properties.length,
    propertiesPerPage: toNum(root?.propertiesPerPage) ?? properties.length,
    numberOfPages: toNum(root?.numberOfPages) ?? 1,
    searchIdentifier: toStr(root?.Identifier?.value || ""),
  };
}

export function normalizeHotelDetailsResponse(
  raw: Record<string, unknown>,
  nights = 1
): NormalizedHotelProperty | null {
  const root = (raw as any)?.PropertiesResponse?.Properties ?? (raw as any)?.Properties ?? {};
  const list: any[] = Array.isArray(root?.PropertyInfo)
    ? root.PropertyInfo
    : Array.isArray(root?.Property)
      ? root.Property
      : [];
  const first = list[0] || (raw as any)?.PropertyDetail || null;
  if (!first) return null;
  return normalizePropertyEntry(first, 0, nights);
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
    const taxes =
      toNum(price?.TotalTaxes) ??
      Math.max(0, Math.round((totalPrice - basePrice) * 100) / 100);

    const breakdowns: any[] = Array.isArray(price?.PriceBreakdown) ? price.PriceBreakdown : [];
    const perNightBreakdown =
      breakdowns.find((b) => /per night/i.test(toStr(b?.roomPricingType))) || breakdowns[0] || {};
    const perStayBreakdown =
      breakdowns.find((b) => /per stay/i.test(toStr(b?.roomPricingType))) || breakdowns[1] || {};

    const rawNightly: any[] = Array.isArray(perNightBreakdown?.NightlyRate)
      ? perNightBreakdown.NightlyRate
      : [];
    const nightlyRates: NormalizedHotelNightlyRate[] = rawNightly.map((nr) => {
      const amt = nr?.Amount || {};
      const nBase = toNum(amt?.Base) ?? 0;
      const nTax = toNum(amt?.Taxes?.TotalTaxes) ?? 0;
      const nTotal = toNum(amt?.Total) ?? Math.round((nBase + nTax) * 100) / 100;
      return {
        startDate: toStr(nr?.startDate),
        nights: toNum(nr?.nights) ?? 1,
        base: nBase,
        taxes: nTax,
        total: nTotal,
      };
    });

    const avgNightlyBase =
      toNum(perNightBreakdown?.AverageNightlyRate?.[0]?.value) ??
      nightlyRates[0]?.base ??
      Math.round((basePrice / Math.max(1, nights)) * 100) / 100;
    const nightlyPrice = Math.round(avgNightlyBase * 100) / 100;
    const nightlyTotalPrice = Math.round((totalPrice / Math.max(1, nights)) * 100) / 100;

    // Tax breakdown & additional fees payable locally (e.g. Tourism Dirham / Service charge)
    const stayTaxesRaw: any[] = Array.isArray(perStayBreakdown?.Amount?.Taxes?.Tax)
      ? perStayBreakdown.Amount.Taxes.Tax
      : Array.isArray(nightlyRates[0] ? rawNightly[0]?.Amount?.Taxes?.Tax : [])
        ? rawNightly[0].Amount.Taxes.Tax
        : [];
    const taxBreakdown = stayTaxesRaw
      .map((t) => ({
        description: toStr(t?.purpose || t?.description || "Tax"),
        amount: toNum(t?.value) ?? 0,
        currencyCode: toStr(t?.currencyCode || currencyCode),
      }))
      .filter((t) => t.amount > 0);

    const stayFeesNode = perStayBreakdown?.Amount?.Fees || rawNightly[0]?.Amount?.Fees || {};
    const localFeesTotal = toNum(stayFeesNode?.TotalAdditionalFeesPayableLocally) ?? 0;
    const localFeesRaw: any[] = Array.isArray(stayFeesNode?.Fee) ? stayFeesNode.Fee : [];
    const localFeesDetail = localFeesRaw
      .map((f) => ({
        description: toStr(f?.description || f?.purpose || "Property Fee"),
        amount:
          toNum(f?.FeeAmountOrPercent?.Amount?.value ?? f?.Amount?.value) ?? 0,
        currencyCode: toStr(
          f?.FeeAmountOrPercent?.Amount?.code || f?.Amount?.code || currencyCode
        ),
        frequency: toStr(f?.feeFrequency || "PerStay"),
      }))
      .filter((f) => f.amount > 0);

    const roomType = product?.RoomType || product?.RoomStay?.RoomType || {};
    const roomCharacteristics = roomType?.RoomCharacteristics || {};
    const bedConfigs = Array.isArray(roomCharacteristics?.BedConfiguration)
      ? roomCharacteristics.BedConfiguration
      : Array.isArray(roomCharacteristics?.bedConfiguration)
        ? roomCharacteristics.bedConfiguration
        : [];
    const bedText = bedConfigs
      .map((b: any) => {
        const qty = b?.quantity ? `${b.quantity}x` : "";
        const type = toStr(b?.bedType).replace(/\(s\)/gi, "");
        const size = toStr(b?.size);
        return [qty, type, size ? `(${size})` : ""].filter(Boolean).join(" ");
      })
      .filter(Boolean)
      .join(", ");

    const ratePlan = product?.RatePlan || product?.RoomStay?.RatePlan || {};
    const propertyKey = product?.PropertyKey || offering?.PropertyKey || {};

    const termsDescArr: string[] = Array.isArray(terms?.Description)
      ? terms.Description.map((d: unknown) => toStr(d)).filter(Boolean)
      : [];
    const rawRoomDesc = toStr(
      roomType?.Description?.value ||
        ratePlan?.Description?.value ||
        termsDescArr.slice(1).join(" ") ||
        ""
    )
      .replace(/\bDou\s+Ble\b/gi, "Double")
      .replace(/\bDoub\s+Le\b/gi, "Double")
      .replace(/\s+/g, " ")
      .trim();

    const ratePlanName = toStr(
      perStayBreakdown?.Description ||
        ratePlan?.ratePlanName ||
        ratePlan?.name ||
        termsDescArr[0] ||
        "Best Available Rate"
    );

    const lowerCorpus = `${rawRoomDesc} ${ratePlanName} ${termsDescArr.join(" ")} ${toStr(terms?.RatePaymentInfo)}`.toLowerCase();

    // Travelport Stays v11 uses CancelPenalty[].Refundable ("Yes" | "No"), Description (string), Deadline.SpecificDate.end & Time, HotelPenalty.Percent
    const cancelPenalties: any[] = Array.isArray(terms?.CancelPenalty)
      ? terms.CancelPenalty
      : [];
    const refundablePenalty = cancelPenalties.find(
      (p) => toStr(p?.Refundable).toLowerCase() === "yes" || p?.refundableInd === true
    );
    const nonRefundablePenalty = cancelPenalties.find(
      (p) =>
        toStr(p?.Refundable).toLowerCase() === "no" ||
        Boolean(p?.NonRefundableInd) ||
        p?.refundableInd === false
    );
    const firstPenalty = refundablePenalty || cancelPenalties[0] || {};

    const ratePaymentInfo = toStr(terms?.RatePaymentInfo || "");
    const guarantee = Array.isArray(terms?.Guarantee)
      ? terms.Guarantee[0] || {}
      : terms?.Guarantee || {};
    const guaranteeType = toStr(guarantee?.guaranteeType || "");

    const prepayRequired =
      /prepay|deposit/i.test(ratePaymentInfo) ||
      /prepay|deposit/i.test(guaranteeType) ||
      /\bprepay|pre-pay|prepaid|deposit required|advance purchase\b/.test(lowerCorpus);

    const creditCardRequired =
      prepayRequired ||
      /guarantee|credit|card/i.test(ratePaymentInfo) ||
      /guarantee|credit|card/i.test(guaranteeType) ||
      Boolean(guaranteeType);

    const isExplicitlyRefundable = Boolean(refundablePenalty);
    const isExplicitlyNonRefundable =
      (!isExplicitlyRefundable && Boolean(nonRefundablePenalty)) ||
      (!isExplicitlyRefundable && prepayRequired) ||
      /\bnon-refundable|non refundable|no refund|advance purchase\b/.test(lowerCorpus);

    const refundable = isExplicitlyRefundable || !isExplicitlyNonRefundable;
    const deadlineDate = toStr(
      firstPenalty?.Deadline?.SpecificDate?.end ||
        firstPenalty?.Deadline?.SpecificDate?.date ||
        ""
    );
    const deadlineTime = toStr(firstPenalty?.Deadline?.Time || "").slice(0, 5);
    const deadline = [deadlineDate, deadlineTime].filter(Boolean).join(" ");

    const penaltyPercent = toNum(firstPenalty?.HotelPenalty?.Percent);
    const penaltyAmount = toNum(
      firstPenalty?.HotelPenalty?.Amount?.value ?? firstPenalty?.Penalty?.Amount
    );
    const firstPenaltyDesc =
      typeof firstPenalty?.Description === "string"
        ? firstPenalty.Description.trim()
        : toStr(firstPenalty?.Description?.value);

    const freeCancellation =
      isExplicitlyRefundable &&
      (penaltyPercent === 0 ||
        penaltyAmount === 0 ||
        /free/i.test(firstPenaltyDesc) ||
        Boolean(deadlineDate));

    const cancellationSummary = isExplicitlyNonRefundable
      ? "Non-refundable"
      : freeCancellation && deadline
        ? `Free cancellation until ${deadline}`
        : firstPenaltyDesc
          ? firstPenaltyDesc.length > 95
            ? `${firstPenaltyDesc.slice(0, 92)}...`
            : firstPenaltyDesc
          : refundable
            ? "Refundable per property policy"
            : "Non-refundable";

    // MealsIncluded in Travelport Stays v11 lives on TermsAndConditions.MealsIncluded
    const meals = terms?.MealsIncluded || product?.MealsIncluded || {};
    const hasAllInclusive =
      Boolean(meals?.allInclusiveInd) || /\ball inclusive\b/.test(lowerCorpus);
    const hasBreakfastFlag =
      Boolean(meals?.breakfastInd) ||
      /\bbreakfast|brkfast|bed\+brkfast|bed and breakfast|\bb&b\b|halfboard|half board|fullboard|full board\b/.test(
        lowerCorpus
      );
    const hasLunchFlag = Boolean(meals?.lunchInd);
    const hasDinnerFlag = Boolean(meals?.dinnerInd);
    const isFullBoard =
      (hasBreakfastFlag && hasLunchFlag && hasDinnerFlag) ||
      /\bfull\s*board\b/.test(lowerCorpus);
    const isHalfBoard =
      (hasBreakfastFlag && (hasLunchFlag || hasDinnerFlag)) ||
      /\bhalf\s*board|\bhb\/halfboard\b/.test(lowerCorpus);

    const breakfastIncluded =
      hasAllInclusive || isFullBoard || isHalfBoard || hasBreakfastFlag;
    const mealPlan = hasAllInclusive
      ? "All Inclusive"
      : isFullBoard
        ? "Full Board"
        : isHalfBoard
          ? "Half Board (Incl. Breakfast)"
          : breakfastIncluded
            ? "Breakfast Included"
            : "Room Only";

    const wifiIncluded =
      String(roomCharacteristics?.wifiIncluded || "").toLowerCase() === "yes" ||
      /\bwi-fi|wifi|internet\b/.test(lowerCorpus);

    // Strip noisy GDS meal prefixes like "Null-Hb/Halfboard " or "Saver Bb-Bb/Bed+Brkfast " from room title
    const cleanedRoomTitle = rawRoomDesc
      .replace(/^(null|saver|flex|std|bar)\s*[-–]\s*[^\s]+\s+/i, "")
      .replace(/^(null|saver)\s+[a-z]{2}-[a-z]{2}\/[^\s]+\s+/i, "")
      .trim();

    const roomTitle = toStr(
      roomType?.name ||
        cleanedRoomTitle ||
        rawRoomDesc ||
        roomType?.roomCategory ||
        "Standard Room"
    );

    const commissionApp = toStr(perStayBreakdown?.Commission?.application || "");
    const commissionable =
      Boolean(ratePlan?.commissionableInd) ||
      (Boolean(commissionApp) && !/non-paying|no/i.test(commissionApp));

    offers.push({
      offerId: `${offeringIdentifierValue}-${idx}`,
      catalogOfferingsIdentifier:
        catalogOfferingsIdentifier ||
        offeringIdentifierValue.split(":")[0] ||
        offeringIdentifierValue,
      catalogOfferingIdentifier: offeringIdentifierValue,
      productIdentifier: productRef,
      authority: offeringAuthority,
      propertyCode: toStr(propertyKey?.propertyCode),
      chainCode: toStr(propertyKey?.chainCode),
      roomName: roomTitle,
      roomDescription: rawRoomDesc,
      rateCode: toStr(ratePlan?.rateCode || product?.bookingCode),
      ratePlanName,
      mealPlan,
      breakfastIncluded,
      bedType: bedText,
      maxOccupancy: toNum(roomType?.maxOccupancy ?? roomType?.RoomOccupancy?.[0]?.maxOccupancy),
      wifiIncluded,
      smokingAllowed: toStr(roomCharacteristics?.smokingAllowed || "Unknown"),
      accessibleRoom: String(roomCharacteristics?.accessibleRoom || "").toLowerCase() === "yes",
      refundable,
      freeCancellation,
      freeCancellationDeadline: deadline || null,
      cancellationSummary,
      guaranteeRequired: creditCardRequired,
      creditCardRequired,
      prepayRequired,
      paymentType: toStr(ratePaymentInfo || guaranteeType || "GuaranteeRequired"),
      currencyCode,
      basePrice,
      taxes,
      totalPrice,
      nightlyPrice,
      nightlyTotalPrice,
      localFeesTotal,
      localFeesDetail,
      taxBreakdown,
      nightlyRates,
      commissionable,
      aggregator: offeringAuthority,
    });
  });

  return {
    catalogOfferingsIdentifier,
    offers: offers.sort((a, b) => a.totalPrice - b.totalPrice),
  };
}

export function normalizeHotelRulesResponse(
  raw: Record<string, unknown>,
  fallbackOfferIdentifier = ""
): NormalizedHotelRules {
  const offer =
    (raw as any)?.OfferHospitalityResponse?.Offer ??
    (raw as any)?.OfferListResponse?.OfferID?.[0] ??
    (raw as any)?.OfferResponse?.Offer ??
    {};
  const product = Array.isArray(offer?.Product) ? offer.Product[0] || {} : offer?.Product || {};
  const price = offer?.Price || {};
  const terms = Array.isArray(offer?.TermsAndConditionsFull)
    ? offer.TermsAndConditionsFull[0] || {}
    : offer?.TermsAndConditionsFull || {};

  const rawTextBlocks: any[] = Array.isArray(terms?.TextBlock) ? terms.TextBlock : [];
  const textBlocks = rawTextBlocks
    .map((tb) => {
      const title = toStr(tb?.title || "Policy");
      const text = Array.isArray(tb?.TextFormatted)
        ? tb.TextFormatted.map((f: any) => toStr(f?.value || f)).filter(Boolean).join(" ")
        : toStr(tb?.value || tb?.text);
      return { title, text };
    })
    .filter((tb) => Boolean(tb.text));

  const findBlock = (pattern: RegExp) =>
    textBlocks
      .filter((tb) => pattern.test(tb.title))
      .map((tb) => tb.text)
      .join(" ");

  const cancellationPolicy =
    findBlock(/cancel/i) ||
    toStr(terms?.CancelPenalty?.[0]?.Description?.value) ||
    "Refer to property cancellation terms.";
  const guaranteePolicy =
    findBlock(/guarantee/i) ||
    toStr(terms?.Guarantee?.[0]?.Description?.value) ||
    "Standard hotel guarantee applies.";
  const depositPolicy =
    findBlock(/deposit|prepay|payment/i) ||
    toStr(terms?.Deposit?.[0]?.Description?.value) ||
    "";
  const rateDescription = findBlock(/rate description/i);
  const promotionalInfo = findBlock(/promotional/i);
  const otherInfo = findBlock(/^other$/i);

  const roomType = product?.RoomType || {};
  const roomChars = roomType?.RoomCharacteristics || {};
  const bedConfigs = Array.isArray(roomChars?.BedConfiguration)
    ? roomChars.BedConfiguration
    : [];
  const bedType = bedConfigs
    .map((b: any) => [b?.quantity ? `${b.quantity}x` : "", toStr(b?.bedType)].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(", ");

  const policyCorpus = `${cancellationPolicy} ${guaranteePolicy} ${depositPolicy} ${rateDescription}`.toLowerCase();
  const freeCancellation =
    !/non-refundable|non refundable|no refund/i.test(policyCorpus) &&
    /cancellation permitted|free cancel|refundable/i.test(policyCorpus);
  const prepayRequired = /prepay|prepaid|deposit required|advance deposit/i.test(policyCorpus);
  const creditCardRequired =
    prepayRequired || /guarantee|credit card|card required/i.test(policyCorpus);

  const acceptedCards: string[] = Array.isArray(terms?.AcceptedCreditCard)
    ? terms.AcceptedCreditCard.map((c: any) => toStr(c?.value || c?.code || c)).filter(Boolean)
    : [];

  return {
    offerIdentifier: toStr(offer?.Identifier?.value || fallbackOfferIdentifier),
    propertyName: toStr(product?.propertyName),
    bookingCode: toStr(product?.bookingCode),
    roomDescription: toStr(roomType?.Description?.value || findBlock(/room detail/i)),
    bedType,
    wifiIncluded: String(roomChars?.wifiIncluded || "").toLowerCase() === "yes",
    maxOccupancy: toNum(roomType?.RoomOccupancy?.[0]?.maxOccupancy ?? roomType?.maxOccupancy),
    currencyCode: toStr(price?.CurrencyCode?.value || price?.CurrencyCode || "USD"),
    basePrice: toNum(price?.Base) ?? 0,
    taxes: toNum(price?.TotalTaxes) ?? 0,
    totalPrice: toNum(price?.TotalPrice) ?? 0,
    cancellationPolicy,
    guaranteePolicy,
    depositPolicy,
    rateDescription,
    promotionalInfo,
    otherInfo,
    checkInTime: toStr(terms?.CheckInOutPolicy?.checkInTime || findBlock(/check.?in/i)) || null,
    checkOutTime: toStr(terms?.CheckInOutPolicy?.checkOutTime || findBlock(/check.?out/i)) || null,
    freeCancellation,
    creditCardRequired,
    prepayRequired,
    acceptedCards,
    textBlocks,
  };
}

function convertPropertyToUsd(
  prop: NormalizedHotelProperty,
  rates: Record<string, number>
): NormalizedHotelProperty {
  const src = prop.currencyCode || "USD";
  return {
    ...prop,
    currencyCode: "USD",
    minNightlyPrice: convertToUsd(prop.minNightlyPrice, src, rates),
    minTotalPrice: convertToUsd(prop.minTotalPrice, src, rates),
    maxNightlyPrice: convertToUsd(prop.maxNightlyPrice, src, rates),
    maxTotalPrice: convertToUsd(prop.maxTotalPrice, src, rates),
  };
}

function convertRoomOfferToUsd(
  offer: NormalizedHotelRoomOffer,
  rates: Record<string, number>,
  nights: number
): NormalizedHotelRoomOffer {
  const src = offer.currencyCode || "USD";
  const totalUsd = convertToUsd(offer.totalPrice, src, rates) ?? 0;
  const baseUsdRaw = convertToUsd(offer.basePrice, src, rates) ?? totalUsd;
  const baseUsd = baseUsdRaw > totalUsd ? totalUsd : baseUsdRaw;
  const taxesUsd = roundUsd(Math.max(0, totalUsd - baseUsd));
  const nightlyBaseUsd =
    convertToUsd(offer.nightlyPrice, src, rates) ??
    roundUsd(baseUsd / Math.max(1, nights));
  const nightlyTotalUsd = roundUsd(totalUsd / Math.max(1, nights));
  const localFeesTotalUsd = convertToUsd(offer.localFeesTotal, src, rates) ?? 0;

  return {
    ...offer,
    currencyCode: "USD",
    basePrice: baseUsd,
    taxes: taxesUsd,
    totalPrice: totalUsd,
    nightlyPrice: nightlyBaseUsd,
    nightlyTotalPrice: nightlyTotalUsd,
    localFeesTotal: localFeesTotalUsd,
    localFeesDetail: (offer.localFeesDetail || []).map((f) => ({
      ...f,
      amount: convertToUsd(f.amount, f.currencyCode || src, rates) ?? 0,
      currencyCode: "USD",
    })),
    taxBreakdown: (offer.taxBreakdown || []).map((t) => ({
      ...t,
      amount: convertToUsd(t.amount, t.currencyCode || src, rates) ?? 0,
      currencyCode: "USD",
    })),
    nightlyRates: (offer.nightlyRates || []).map((nr) => {
      const nrTotal = convertToUsd(nr.total, src, rates) ?? 0;
      const nrBase = Math.min(nrTotal, convertToUsd(nr.base, src, rates) ?? nrTotal);
      return {
        ...nr,
        base: nrBase,
        taxes: roundUsd(Math.max(0, nrTotal - nrBase)),
        total: nrTotal,
      };
    }),
  };
}

function convertRulesToUsd(
  rules: NormalizedHotelRules,
  rates: Record<string, number>
): NormalizedHotelRules {
  const src = rules.currencyCode || "USD";
  const totalUsd = convertToUsd(rules.totalPrice, src, rates) ?? 0;
  const baseUsdRaw = convertToUsd(rules.basePrice, src, rates) ?? totalUsd;
  const baseUsd = baseUsdRaw > totalUsd ? totalUsd : baseUsdRaw;
  const taxesUsd = roundUsd(Math.max(0, totalUsd - baseUsd));
  return {
    ...rules,
    currencyCode: "USD",
    basePrice: baseUsd,
    taxes: taxesUsd,
    totalPrice: totalUsd,
  };
}

export async function normalizeHotelSearchResponseUsd(
  raw: Record<string, unknown>,
  nights = 1
) {
  const baseRates = await getUsdExchangeRates();
  const rates = { ...baseRates, ...extractTravelportUsdRates(raw) };
  const normalized = normalizeHotelSearchResponse(raw, nights);
  return {
    ...normalized,
    properties: normalized.properties.map((p) => convertPropertyToUsd(p, rates)),
  };
}

export async function normalizeHotelDetailsResponseUsd(
  raw: Record<string, unknown>,
  nights = 1
): Promise<NormalizedHotelProperty | null> {
  const prop = normalizeHotelDetailsResponse(raw, nights);
  if (!prop) return null;
  const baseRates = await getUsdExchangeRates();
  const rates = { ...baseRates, ...extractTravelportUsdRates(raw) };
  return convertPropertyToUsd(prop, rates);
}

export async function normalizeHotelAvailabilityResponseUsd(
  raw: Record<string, unknown>,
  nights = 1
) {
  const baseRates = await getUsdExchangeRates();
  const rates = { ...baseRates, ...extractTravelportUsdRates(raw) };
  const normalized = normalizeHotelAvailabilityResponse(raw, nights);
  return {
    ...normalized,
    offers: normalized.offers.map((o) => convertRoomOfferToUsd(o, rates, nights)),
  };
}

export async function normalizeHotelRulesResponseUsd(
  raw: Record<string, unknown>,
  fallbackOfferIdentifier = ""
): Promise<NormalizedHotelRules> {
  const baseRates = await getUsdExchangeRates();
  const rates = { ...baseRates, ...extractTravelportUsdRates(raw) };
  const rules = normalizeHotelRulesResponse(raw, fallbackOfferIdentifier);
  return convertRulesToUsd(rules, rates);
}
