const TRAVELPORT_SEARCH_PATH = "/api/travelport/search-flight";
const LEGACY_SEARCH_PATH = "/flights/api2";
const LAST_SEARCH_REQUEST_KEY = "flyjatt:last_search_request";
const LAST_SEARCH_RESPONSE_KEY = "flyjatt:last_search_response";
const LAST_SEARCH_META_KEY = "flyjatt:last_search_meta";

function joinBaseAndPath(baseUrl, path) {
  const base = String(baseUrl || "").trim();
  if (!base) {
    return "";
  }
  return `${base.replace(/\/+$/, "")}${path}`;
}

function getConfiguredTravelportUrl() {
  if (typeof process === "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_TRAVELPORT_SEARCH_URL || "";
}

function getConfiguredBaseUrl() {
  if (typeof process === "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || "";
}

function useLegacyFallbackRoutes() {
  if (typeof process === "undefined") {
    return false;
  }
  return (
    String(process.env.NEXT_PUBLIC_TRAVELPORT_ENABLE_LEGACY_FALLBACK || "")
      .trim()
      .toLowerCase() === "true"
  );
}

function getLocalFallbackTravelportUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  const { protocol, hostname, port } = window.location;
  if (port === "3001") {
    return `${protocol}//${hostname}:3000${TRAVELPORT_SEARCH_PATH}`;
  }
  if (port === "3000") {
    return `${protocol}//${hostname}:3001${TRAVELPORT_SEARCH_PATH}`;
  }
  return "";
}

function getCandidateSearchUrls() {
  const configuredUrl = getConfiguredTravelportUrl();
  const localFallbackUrl = getLocalFallbackTravelportUrl();
  const configuredBaseUrl = getConfiguredBaseUrl();
  const legacyEnabled = useLegacyFallbackRoutes();

  const urls = [
    configuredUrl,
    TRAVELPORT_SEARCH_PATH,
    joinBaseAndPath(configuredBaseUrl, TRAVELPORT_SEARCH_PATH),
    localFallbackUrl,
    legacyEnabled ? joinBaseAndPath(configuredBaseUrl, LEGACY_SEARCH_PATH) : "",
    legacyEnabled ? LEGACY_SEARCH_PATH : "",
  ].filter(Boolean);

  return Array.from(new Set(urls));
}

function persistLastSearchInBrowser({
  url,
  requestPayload,
  responsePayload,
}) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const nowIso = new Date().toISOString();
    window.localStorage.setItem(
      LAST_SEARCH_REQUEST_KEY,
      JSON.stringify(requestPayload)
    );
    window.localStorage.setItem(
      LAST_SEARCH_RESPONSE_KEY,
      JSON.stringify(responsePayload)
    );
    window.localStorage.setItem(
      LAST_SEARCH_META_KEY,
      JSON.stringify({
        savedAt: nowIso,
        endpoint: url,
      })
    );
  } catch (storageError) {
    console.warn("Unable to persist last search response", storageError);
  }
}

async function getResponseErrorPayload(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => ({}));
    return {
      message:
        payload?.message ||
        payload?.details ||
        `Travelport search failed (${response.status})`,
      payload,
    };
  }

  const text = await response.text().catch(() => "");
  return {
    message: text || `Travelport search failed (${response.status})`,
    payload: {},
  };
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function durationIsoToMinutes(value) {
  if (typeof value === "number") return value;
  const text = String(value || "");
  if (!text) return 0;
  const hourMatch = text.match(/(\d+)H/i);
  const minuteMatch = text.match(/(\d+)M/i);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  return hours * 60 + minutes;
}

function normalizePaxTypeLabel(code) {
  const value = String(code || "").toUpperCase();
  if (value === "ADT") return "Adult";
  if (value === "CHD") return "Child";
  if (value === "INF") return "Infant";
  return "Adult";
}

function mapUnifiedSegmentToLegacy(segment) {
  const amenityItems = Array.isArray(segment?.amenities) ? segment.amenities : [];
  const amenityByCategory = amenityItems.reduce((acc, item) => {
    const category = String(item?.category || "Other");
    if (!acc[category]) {
      acc[category] = [];
    }
    if (item?.text) {
      acc[category].push(String(item.text));
    }
    return acc;
  }, {});

  return {
    MarketingCarrier: segment?.marketingCarrier || "",
    MarketingCarrierName: segment?.marketingCarrierName || "",
    MarketingFlightNumber: segment?.marketingFlightNumber || "",
    OperatingCarrier: segment?.operatingCarrier || "",
    OperatingFlightNumber: segment?.operatingFlightNumber || "",
    OperatingCarrierName: segment?.operatingCarrierName || segment?.operatingCarrier || "",
    AvailabilitySourceCode:
      segment?.availabilitySourceCode || segment?.AvailabilitySourceCode || "N/A",
    brandTier: segment?.brandTier ?? null,
    DepFrom: segment?.depFrom || "",
    DepAirPort: segment?.depAirport || "",
    DepLocation: segment?.depLocation || "",
    DepDateAdjustment: toNumber(segment?.depDateAdjustment, 0),
    DepTime: segment?.depTime || "",
    ArrTo: segment?.arrTo || "",
    ArrAirPort: segment?.arrAirport || "",
    ArrLocation: segment?.arrLocation || "",
    ArrDateAdjustment: toNumber(segment?.arrDateAdjustment, 0),
    ArrTime: segment?.arrTime || "",
    OperatedBy: segment?.operatedBy || "",
    StopCount: toNumber(segment?.stopCount, 0),
    Duration: durationIsoToMinutes(segment?.duration),
    DurationIso: segment?.duration || "",
    ConnectionDuration: durationIsoToMinutes(segment?.connectionDuration),
    ConnectionDurationIso: segment?.connectionDuration || null,
    AircraftTypeName: segment?.aircraftTypeName || "",
    DepartureGate: segment?.departureGate || "",
    ArrivalGate: segment?.arrivalGate || "",
    HiddenStops: Array.isArray(segment?.hiddenStops) ? segment.hiddenStops : [],
    SegmentCode: {
      bookingCode: segment?.segmentCode?.bookingCode || "",
      cabinCode: segment?.segmentCode?.cabinCode || "Economy",
      seatsAvailable: toNumber(segment?.segmentCode?.seatsAvailable, 0),
      fareBasisCode: segment?.segmentCode?.fareBasisCode || "",
      fareTypeCode: segment?.segmentCode?.fareTypeCode || "",
    },
    Amenities: {
      amenityRefs: Array.isArray(segment?.amenityRefs) ? segment.amenityRefs : [],
      universalProductAttributeRefs: Array.isArray(segment?.universalProductAttributeRefs)
        ? segment.universalProductAttributeRefs
        : [],
      items: amenityItems,
      byCategory: amenityByCategory,
      universalProductAttributes: Array.isArray(segment?.universalProductAttributes)
        ? segment.universalProductAttributes
        : [],
    },
  };
}

function mapUnifiedFlightToLegacyCompat(unified) {
  const allLegsInfo = Array.isArray(unified?.allLegsInfo) ? unified.allLegsInfo : [];
  const priceBreakDown = Array.isArray(unified?.priceBreakDown)
    ? unified.priceBreakDown
    : [];
  const offerIdentifier =
    unified?.offerIdentifier || unified?.OfferIdentifier || unified?.identifier || "";
  const offerListIdentifier = unified?.offerListIdentifier || "";
  const productIdentifiers = Array.isArray(unified?.productIdentifiers)
    ? unified.productIdentifiers
    : [];
  const farePolicyRequest =
    unified?.farePolicyRequest && typeof unified.farePolicyRequest === "object"
      ? {
        offerIdentifier:
          unified.farePolicyRequest.offerIdentifier || offerIdentifier || "",
        offerListIdentifier:
          unified.farePolicyRequest.offerListIdentifier || offerListIdentifier || "",
        productIdentifiers: Array.isArray(
          unified.farePolicyRequest.productIdentifiers
        )
          ? unified.farePolicyRequest.productIdentifiers
          : productIdentifiers,
      }
      : {
        offerIdentifier: offerIdentifier || "",
        offerListIdentifier: offerListIdentifier || "",
        productIdentifiers,
      };

  return {
    System: "travelport",
    ResultId: unified?.identifier || "",
    SearchId: unified?.transactionId || "",
    offerIdentifier,
    OfferIdentifier: offerIdentifier,
    offerListIdentifier,
    productIdentifiers,
    farePolicyRequest,
    InstantPayment: Boolean(unified?.instantPayment),
    IsBookable: Boolean(unified?.isBookable),
    TripType:
      String(unified?.tripType || unified?.journeyType || "").toUpperCase() ===
        "ROUND_TRIP"
        ? "Return"
        : "Oneway",
    FareType: unified?.fareType || "PublicFare",
    Carrier: unified?.carrierCode || "",
    CarrierName: unified?.carrierName || unified?.carrierCode || "",
    CurrencyCode: unified?.currencyCode || "USD",
    BaseFare: toNumber(unified?.baseFare, 0),
    Taxes: toNumber(unified?.taxes, 0),
    SerViceFee: 0,
    NetFare: toNumber(unified?.netFare, 0),
    GrossFare: toNumber(unified?.grossFare, 0),
    PartialOption: false,
    PartialFare: 0,
    TimeLimit: unified?.timeLimit || null,
    Refundable: Boolean(unified?.refundable),
    penaltiesCancellation: unified?.penaltiesCancellation || { change: [], cancel: [] },
    ExtraService: null,
    PriceBreakDown: priceBreakDown.map((item) => {
      const allowances = Array.isArray(item?.bag?.allowance)
        ? item.bag.allowance
        : [];
      const firstAllowance = allowances[0] || {};
      const allowanceText =
        firstAllowance?.weight || firstAllowance?.text || "0Kg";

      return {
        PaxType: normalizePaxTypeLabel(item?.paxType),
        CurrencyCode: unified?.currencyCode || "USD",
        BaseFare: toNumber(item?.baseFare, 0),
        Taxes: toNumber(item?.taxes, 0),
        ServiceFee: 0,
        OtherCharges: 0,
        TotalFare: toNumber(item?.totalFare, 0),
        PaxCount: toNumber(item?.paxCount, 1),
        Bag: [
          {
            Airline: item?.bag?.airline || unified?.carrierCode || "",
            Allowance: allowanceText,
          },
        ],
        FareComponent: [],
      };
    }),
    AllLegsInfo: allLegsInfo.map((leg) => {
      const segments = Array.isArray(leg?.segments) ? leg.segments : [];
      const firstSegment = segments[0] || {};
      return {
        DepDate: firstSegment?.depTime || `${leg?.departureDate || ""}T00:00:00`,
        DepFrom: leg?.departureFrom || firstSegment?.depFrom || "",
        ArrTo:
          leg?.arrivalTo || (segments[segments.length - 1] || {})?.arrTo || "",
        Duration: durationIsoToMinutes(leg?.totalDuration),
        TotalDurationISO: leg?.totalDuration || "",
        BrandName: leg?.brandName || null,
        BrandCode: leg?.brandCode || leg?.brandFeatures?.code || null,
        brandTier: leg?.brandTier ?? leg?.brandFeatures?.tier ?? null,
        BrandFeatures: leg?.brandFeatures || null,
        Segments: segments.map(mapUnifiedSegmentToLegacy),
      };
    }),
    sourceUnified: unified,
  };
}

function normalizeSearchResponseForApp(responseData) {
  if (!Array.isArray(responseData) || responseData.length === 0) {
    return responseData;
  }

  const looksUnified = responseData.some(
    (item) =>
      item &&
      typeof item === "object" &&
      Array.isArray(item?.allLegsInfo) &&
      !Object.prototype.hasOwnProperty.call(item, "AllLegsInfo")
  );

  if (!looksUnified) {
    return responseData;
  }

  return responseData.map((item) => mapUnifiedFlightToLegacyCompat(item));
}

export async function searchTravelportFlights(payload, token) {
  const urls = getCandidateSearchUrls();
  let lastError = new Error("Travelport search route is not reachable");
  const requestPayload = {
    ...(payload || {}),
    responseModel: "unified",
  };

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(requestPayload),
      });

      if (response.ok) {
        const data = await response.json();
        const normalizedData = normalizeSearchResponseForApp(data);
        persistLastSearchInBrowser({
          url,
          requestPayload,
          responsePayload: normalizedData,
        });
        return normalizedData;
      }

      const errorData = await getResponseErrorPayload(response);
      const currentError = new Error(errorData.message);
      currentError.status = response.status;
      currentError.payload = errorData.payload;
      currentError.requiresLogin = Boolean(errorData?.payload?.requiresLogin);

      // Try next candidate for missing route, stop early for other response errors.
      if (response.status === 404) {
        lastError = currentError;
        continue;
      }

      throw currentError;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("Travelport search request failed");
    }
  }

  throw lastError;
}
