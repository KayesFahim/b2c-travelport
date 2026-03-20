import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";

export type LegacySegment = {
  depfrom: string;
  arrto: string;
  depdate: string;
};

type LegacySearchBody = {
  adultcount?: number | string;
  childcount?: number | string;
  infantcount?: number | string;
  cabinclass?: string | number;
  segments?: LegacySegment[];
  responseModel?: "legacy" | "unified" | "both";
  saveResponse?: boolean;
};

type ErrorResponse = {
  message: string;
  details?: string;
};

function parseBooleanFlag(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
}

function shouldSaveSearchResponse(body: LegacySearchBody): boolean {
  const bodyFlag = parseBooleanFlag(body?.saveResponse);
  if (bodyFlag !== null) {
    return bodyFlag;
  }

  const envFlag = parseBooleanFlag(process.env.TRAVELPORT_SAVE_SEARCH_RESPONSE);
  if (envFlag !== null) {
    return envFlag;
  }

  return process.env.NODE_ENV !== "production";
}

async function persistSearchResponseSamples(params: {
  requestPayload: Record<string, unknown>;
  travelportRawResponse: Record<string, unknown>;
  legacyResults: Record<string, unknown>[];
  unifiedResults: Record<string, unknown>[];
}) {
  const sampleDir = path.join(process.cwd(), "sample");
  await mkdir(sampleDir, { recursive: true });

  const writeJson = (filename: string, payload: unknown) =>
    writeFile(path.join(sampleDir, filename), `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const firstUnified = params.unifiedResults[0] ?? {};

  await Promise.all([
    writeJson("searchRequestPayload.json", params.requestPayload),
    writeJson("flightsearchresponse.json", params.travelportRawResponse),
    writeJson("flightResponseLegacyModel.json", params.legacyResults),
    writeJson("flightResponseUnifiedModel.json", firstUnified),
    writeJson("flightResponseUnifiedModelList.json", params.unifiedResults),
  ]);
}

async function readSampleJson<T>(filename: string): Promise<T | null> {
  try {
    const filePath = path.join(process.cwd(), "sample", filename);
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCabinClass(value: unknown): string {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "1" || normalized === "economy" || normalized === "y") {
    return "Economy";
  }
  if (
    normalized === "2" ||
    normalized === "premium economy" ||
    normalized === "premiumeconomy" ||
    normalized === "w"
  ) {
    return "PremiumEconomy";
  }
  if (normalized === "3" || normalized === "business" || normalized === "c") {
    return "Business";
  }
  if (
    normalized === "4" ||
    normalized === "first class" ||
    normalized === "first" ||
    normalized === "f"
  ) {
    return "First";
  }

  return "Economy";
}

function removeAtType<T>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      removeAtType(item);
    }
    return obj;
  }

  const mutable = obj as Record<string, unknown>;
  delete mutable["@type"];

  for (const key of Object.keys(mutable)) {
    removeAtType(mutable[key]);
  }
  return obj;
}

function parseDurationToMinutes(duration: unknown): number {
  if (typeof duration === "number") {
    return duration;
  }
  if (typeof duration !== "string" || duration.length === 0) {
    return 0;
  }

  const hourMatch = duration.match(/(\d+)H/i);
  const minuteMatch = duration.match(/(\d+)M/i);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  return hours * 60 + minutes;
}

function extractBaggageAllowance(text: unknown, quantity = 0): string {
  const value = typeof text === "string" ? text : "";
  const match = value.match(/(\d+)\s*KG/i);
  if (match) {
    return `${match[1]}Kg`;
  }
  if (quantity > 0) {
    return `${quantity}Pc`;
  }
  return "0Kg";
}

function mapPaxType(code: unknown): string {
  const value = String(code ?? "").toUpperCase();
  if (value === "ADT") return "Adult";
  if (value === "CHD") return "Child";
  if (value === "INF") return "Infant";
  return "Adult";
}

function formatDateTime(date: unknown, time: unknown): string {
  const dateValue = typeof date === "string" ? date : "";
  const timeValue = typeof time === "string" ? time : "";

  if (dateValue && timeValue) {
    return `${dateValue}T${timeValue}`;
  }
  if (dateValue) {
    return `${dateValue}T00:00:00`;
  }
  return "";
}

function durationMinutesToIso(minutes: unknown): string {
  const safeMinutes = Math.max(0, toNumber(minutes, 0));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `PT${hours}H${remainingMinutes}M`;
  }
  if (hours > 0) {
    return `PT${hours}H`;
  }
  return `PT${remainingMinutes}M`;
}

function extractTextValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).value === "string"
  ) {
    return (value as Record<string, string>).value;
  }

  return "";
}

function extractUrlByType(urlCollection: unknown, preferredTypes: string[]): string | null {
  if (!Array.isArray(urlCollection)) {
    return null;
  }

  for (const preferredType of preferredTypes) {
    const matched = urlCollection.find(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        String((entry as Record<string, unknown>).urlType || "")
          .toLowerCase()
          .trim() === preferredType.toLowerCase()
    ) as Record<string, unknown> | undefined;

    if (matched && typeof matched.value === "string" && matched.value.length > 0) {
      return matched.value;
    }
  }

  const fallback = urlCollection.find(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      typeof (entry as Record<string, unknown>).value === "string"
  ) as Record<string, unknown> | undefined;

  return fallback?.value ? String(fallback.value) : null;
}

function toAmenityItem(amenity: unknown) {
  const source = (amenity ?? {}) as Record<string, unknown>;
  return {
    id: String(source.id ?? ""),
    category: String(source.Category ?? ""),
    text: extractTextValue(source.Text),
  };
}

function toUniversalProductAttributeItem(attribute: unknown) {
  const source = (attribute ?? {}) as Record<string, unknown>;
  const iconURL = Array.isArray(source.IconURL) ? source.IconURL : [];

  return {
    id: String(source.id ?? ""),
    headline: String(source.headline ?? ""),
    description: String(source.description ?? ""),
    iconSmall: extractUrlByType(iconURL, ["smallurl", "smallURL"]),
    iconLarge: extractUrlByType(iconURL, ["largeurl", "largeURL"]),
  };
}

function normalizeTripType(legacyTripType: unknown): "ONE_WAY" | "ROUND_TRIP" {
  const value = String(legacyTripType ?? "").toLowerCase();
  return value === "return" ? "ROUND_TRIP" : "ONE_WAY";
}

function normalizePaxCode(value: unknown): string {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "adult") return "ADT";
  if (normalized === "child") return "CHD";
  if (normalized === "infant") return "INF";
  return String(value ?? "").toUpperCase();
}

function toNullableNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter((item) => item.length > 0);
  }

  const text = String(value ?? "").trim();
  return text ? [text] : [];
}

function normalizePenaltyAmountFromTravelport(penaltyRule: any) {
  const penalties = Array.isArray(penaltyRule?.Penalty) ? penaltyRule.Penalty : [];
  const amountPenalty = penalties.find(
    (item: any) => item && typeof item === "object" && item?.Amount
  );

  if (!amountPenalty?.Amount || typeof amountPenalty.Amount !== "object") {
    return null;
  }

  const amount = amountPenalty.Amount;
  const currencyCode =
    String(
      amount?.currencyCode ??
        amount?.CurrencyCode ??
        amount?.code ??
        amount?.Code ??
        ""
    ).trim() || null;
  const value = toNullableNumber(amount?.value ?? amount?.Value);

  if (value === null && !currencyCode) {
    return null;
  }

  return {
    value,
    currencyCode,
  };
}

function mapPenaltyEntry(penaltyRule: any, fallbackPassengerTypes: string[]) {
  const passengerTypeCodes = fallbackPassengerTypes.length
    ? fallbackPassengerTypes
    : ["ALL"];
  const penaltyTypes = toStringList(penaltyRule?.penaltyTypes);
  const appliesTo =
    String(
      penaltyRule?.PenaltyAppliesTo ??
        penaltyRule?.penaltyAppliesTo ??
        penaltyRule?.AppliesTo ??
        ""
    ).trim() || null;

  return {
    passengerTypeCodes,
    penaltyTypes: penaltyTypes.length ? penaltyTypes : ["Anytime"],
    appliesTo,
    amount: normalizePenaltyAmountFromTravelport(penaltyRule),
  };
}

function mapPenaltiesCancellationFromTerms(penalties: any[]) {
  const result = {
    change: [] as Array<{
      passengerTypeCodes: string[];
      penaltyTypes: string[];
      appliesTo: string | null;
      amount: { value: number | null; currencyCode: string | null } | null;
    }>,
    cancel: [] as Array<{
      passengerTypeCodes: string[];
      penaltyTypes: string[];
      appliesTo: string | null;
      amount: { value: number | null; currencyCode: string | null } | null;
    }>,
  };

  for (const penaltyGroup of penalties) {
    const passengerTypeCodes = toStringList(
      penaltyGroup?.PassengerTypeCodes ?? penaltyGroup?.passengerTypeCodes
    );
    const changeItems = Array.isArray(penaltyGroup?.Change)
      ? penaltyGroup.Change
      : [];
    const cancelItems = Array.isArray(penaltyGroup?.Cancel)
      ? penaltyGroup.Cancel
      : [];

    for (const changeItem of changeItems) {
      result.change.push(mapPenaltyEntry(changeItem, passengerTypeCodes));
    }
    for (const cancelItem of cancelItems) {
      result.cancel.push(mapPenaltyEntry(cancelItem, passengerTypeCodes));
    }
  }

  return result;
}

function normalizeLegacyPenaltyEntry(entry: unknown) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const source = entry as Record<string, unknown>;
  const passengerTypeCodes = toStringList(
    source.passengerTypeCodes ?? source.PassengerTypeCodes
  );
  const penaltyTypes = toStringList(source.penaltyTypes ?? source.PenaltyTypes);
  const appliesTo =
    String(
      source.appliesTo ??
        source.AppliesTo ??
        source.PenaltyAppliesTo ??
        source.penaltyAppliesTo ??
        ""
    ).trim() || null;
  const amountSource = source.amount ?? source.Amount ?? null;

  let amount: { value: number | null; currencyCode: string | null } | null = null;
  if (amountSource && typeof amountSource === "object") {
    const amountObject = amountSource as Record<string, unknown>;
    const value = toNullableNumber(
      amountObject.value ?? amountObject.Value ?? amountObject.amount ?? amountObject.Amount
    );
    const currencyCode =
      String(
        amountObject.currencyCode ??
          amountObject.CurrencyCode ??
          amountObject.code ??
          amountObject.Code ??
          ""
      ).trim() || null;
    if (value !== null || currencyCode) {
      amount = { value, currencyCode };
    }
  }

  return {
    passengerTypeCodes: passengerTypeCodes.length ? passengerTypeCodes : ["ALL"],
    penaltyTypes: penaltyTypes.length ? penaltyTypes : ["Anytime"],
    appliesTo,
    amount,
  };
}

function normalizePenaltiesCancellationFromLegacy(value: unknown) {
  const source = (value ?? {}) as Record<string, unknown>;
  const changeRaw = Array.isArray(source.change)
    ? source.change
    : Array.isArray(source.Change)
      ? source.Change
      : [];
  const cancelRaw = Array.isArray(source.cancel)
    ? source.cancel
    : Array.isArray(source.Cancel)
      ? source.Cancel
      : [];

  return {
    change: changeRaw
      .map((entry) => normalizeLegacyPenaltyEntry(entry))
      .filter(Boolean),
    cancel: cancelRaw
      .map((entry) => normalizeLegacyPenaltyEntry(entry))
      .filter(Boolean),
  };
}

function mergePenaltiesCancellation(legs: Array<Record<string, unknown>>) {
  const merged = {
    change: [] as unknown[],
    cancel: [] as unknown[],
  };

  for (const leg of legs) {
    const penalties = normalizePenaltiesCancellationFromLegacy(
      (leg as Record<string, unknown>)?.penaltiesCancellation ??
        (leg as Record<string, unknown>)?.PenaltiesCancellation
    );
    merged.change.push(...penalties.change);
    merged.cancel.push(...penalties.cancel);
  }

  return merged;
}

function toUnifiedFlightResult(legacy: Record<string, unknown>) {
  const allLegsInfo = Array.isArray(legacy?.AllLegsInfo)
    ? (legacy.AllLegsInfo as Array<Record<string, unknown>>)
    : [];

  const firstSegment = Array.isArray(allLegsInfo[0]?.Segments)
    ? (allLegsInfo[0]?.Segments as Array<Record<string, unknown>>)[0]
    : undefined;
  const firstSegmentCode = (firstSegment?.SegmentCode ?? {}) as Record<
    string,
    unknown
  >;

  const unifiedLegs = allLegsInfo.map((leg) => {
    const segments = Array.isArray(leg?.Segments)
      ? (leg.Segments as Array<Record<string, unknown>>)
      : [];

    return {
      departureDate: String(leg?.DepDate ?? "").split("T")[0] || "",
      departureFrom: String(leg?.DepFrom ?? ""),
      arrivalTo: String(leg?.ArrTo ?? ""),
      totalDuration:
        typeof leg?.TotalDurationISO === "string" && leg.TotalDurationISO.length > 0
          ? String(leg.TotalDurationISO)
          : durationMinutesToIso(leg?.Duration),
      brandName:
        typeof leg?.BrandName === "string" && leg.BrandName.length > 0
          ? leg.BrandName
          : null,
      brandFeatures: leg?.BrandFeatures ?? null,
      segments: segments.map((segment) => {
        const amenities = (segment?.Amenities ?? {}) as Record<string, unknown>;
        const amenityItems = Array.isArray(amenities?.items)
          ? (amenities.items as Array<Record<string, unknown>>)
          : [];
        const universalProductAttributes = Array.isArray(
          amenities?.universalProductAttributes
        )
          ? (amenities.universalProductAttributes as Array<Record<string, unknown>>)
          : [];
        const segmentCode = (segment?.SegmentCode ?? {}) as Record<string, unknown>;

        return {
          marketingCarrier: String(segment?.MarketingCarrier ?? ""),
          marketingCarrierName: String(segment?.MarketingCarrierName ?? ""),
          marketingFlightNumber: String(segment?.MarketingFlightNumber ?? ""),
          operatingCarrier: String(segment?.OperatingCarrier ?? ""),
          operatingFlightNumber: String(segment?.OperatingFlightNumber ?? ""),
          depFrom: String(segment?.DepFrom ?? ""),
          depAirport: String(segment?.DepAirPort ?? ""),
          depLocation: String(segment?.DepLocation ?? ""),
          depDateAdjustment: toNumber(segment?.DepDateAdjustment, 0),
          depTime: String(segment?.DepTime ?? ""),
          arrTo: String(segment?.ArrTo ?? ""),
          arrAirport: String(segment?.ArrAirPort ?? ""),
          arrLocation: String(segment?.ArrLocation ?? ""),
          arrDateAdjustment: toNumber(segment?.ArrDateAdjustment, 0),
          arrTime: String(segment?.ArrTime ?? ""),
          operatedBy: String(segment?.OperatedBy ?? ""),
          stopCount: toNumber(segment?.StopCount, 0),
          duration:
            typeof segment?.DurationIso === "string" && segment.DurationIso.length > 0
              ? String(segment.DurationIso)
              : durationMinutesToIso(segment?.Duration),
          aircraftTypeName: String(segment?.AircraftTypeName ?? ""),
          departureGate: String(segment?.DepartureGate ?? ""),
          arrivalGate: String(segment?.ArrivalGate ?? ""),
          hiddenStops: Array.isArray(segment?.HiddenStops) ? segment.HiddenStops : [],
          segmentCode: {
            bookingCode: String(segmentCode?.bookingCode ?? ""),
            cabinCode: String(segmentCode?.cabinCode ?? ""),
            seatsAvailable: toNumber(segmentCode?.seatsAvailable, 0),
            fareBasisCode: String(segmentCode?.fareBasisCode ?? ""),
            fareTypeCode: String(segmentCode?.fareTypeCode ?? ""),
          },
          amenities: amenityItems,
          amenityRefs: Array.isArray(amenities?.amenityRefs)
            ? amenities.amenityRefs
            : [],
          universalProductAttributeRefs: Array.isArray(
            amenities?.universalProductAttributeRefs
          )
            ? amenities.universalProductAttributeRefs
            : [],
          universalProductAttributes,
        };
      }),
    };
  });

  const totalSegments = unifiedLegs.reduce((sum, leg) => {
    const segments = Array.isArray(leg?.segments) ? leg.segments : [];
    return sum + segments.length;
  }, 0);

  const grossFare = toNumber(legacy?.GrossFare, 0);
  const netFare = toNumber(legacy?.NetFare, 0);
  const unifiedPenaltiesCancellation = normalizePenaltiesCancellationFromLegacy(
    (legacy as Record<string, unknown>)?.penaltiesCancellation ??
      (legacy as Record<string, unknown>)?.PenaltiesCancellation
  );
  const unifiedPriceBreakDown = Array.isArray(legacy?.PriceBreakDown)
    ? (legacy.PriceBreakDown as Array<Record<string, unknown>>).map((item) => {
        const bagItems = Array.isArray(item?.Bag)
          ? (item.Bag as Array<Record<string, unknown>>)
          : [];

        return {
          paxType: normalizePaxCode(item?.PaxType),
          baseFare: toNumber(item?.BaseFare, 0),
          taxes: toNumber(item?.Taxes, 0),
          totalFare: toNumber(item?.TotalFare, 0),
          paxCount: toNumber(item?.PaxCount, 1),
          bag: {
            airline: String(bagItems[0]?.Airline ?? legacy?.Carrier ?? ""),
            allowance: bagItems.map((bag) => ({
              type: "Checked",
              quantity: 0,
              weight: String(bag?.Allowance ?? ""),
              text: String(bag?.Allowance ?? ""),
            })),
          },
          fareComponent: {},
        };
      })
    : [];

  return {
    provider: "Travelport",
    transactionId: String(legacy?.SearchId ?? ""),
    identifier: String(legacy?.ResultId ?? ""),
    instantPayment: Boolean(legacy?.InstantPayment),
    issuePermit: true,
    isBookable: Boolean(legacy?.IsBookable),
    journeyType: normalizeTripType(legacy?.TripType),
    tripType: normalizeTripType(legacy?.TripType),
    fareType: String(legacy?.FareType ?? ""),
    carrierCode: String(legacy?.Carrier ?? ""),
    carrierName: String(legacy?.CarrierName ?? ""),
    cabinClass: String(firstSegmentCode?.cabinCode ?? "Economy"),
    currencyCode: String(legacy?.CurrencyCode ?? ""),
    baseFare: toNumber(legacy?.BaseFare, 0),
    taxes: toNumber(legacy?.Taxes, 0),
    netFare,
    grossFare,
    markUp: String(Math.max(grossFare - netFare, 0)),
    timeLimit: legacy?.TimeLimit ?? null,
    refundable: Boolean(legacy?.Refundable),
    totalSegments,
    penaltiesCancellation: unifiedPenaltiesCancellation,
    priceBreakDown: unifiedPriceBreakDown,
    allLegsInfo: unifiedLegs,
    sourceLegacy: legacy,
  };
}

async function createToken(): Promise<string> {
  const authUrl = getRequiredEnv("TRAVELPORT_AUTH_URL");
  const clientId = getRequiredEnv("TRAVELPORT_CLIENT_ID");
  const clientSecret = getRequiredEnv("TRAVELPORT_CLIENT_SECRET");
  const username = getRequiredEnv("TRAVELPORT_USERNAME");
  const password = getRequiredEnv("TRAVELPORT_PASSWORD");
  const grantType = process.env.TRAVELPORT_AUTH_GRANT_TYPE || "password";
  const useBasicAuth = process.env.TRAVELPORT_USE_BASIC_AUTH === "true";

  const body = new URLSearchParams();
  body.append("grant_type", grantType);
  body.append("username", username);
  body.append("password", password);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (useBasicAuth) {
    const basicToken = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );
    headers.Authorization = `Basic ${basicToken}`;
  } else {
    body.append("client_id", clientId);
    body.append("client_secret", clientSecret);
  }

  const response = await fetch(authUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok || !payload?.access_token) {
    throw new Error(
      payload?.error_description ||
        payload?.message ||
        `Travelport auth failed (${response.status})`
    );
  }

  return payload.access_token as string;
}

function buildTravelportPayload(body: LegacySearchBody) {
  const adultCount = Math.max(0, toNumber(body.adultcount, 1));
  const childCount = Math.max(0, toNumber(body.childcount, 0));
  const infantCount = Math.max(0, toNumber(body.infantcount, 0));
  const cabinClass = normalizeCabinClass(body.cabinclass);
  const currencyCode = process.env.TRAVELPORT_DEFAULT_CURRENCY || "USD";
  const maxUpsellsToReturn = Math.max(
    0,
    toNumber(process.env.TRAVELPORT_MAX_UPSELLS_TO_RETURN, 20)
  );

  const passengerCriteria: Array<Record<string, unknown>> = [];
  if (adultCount > 0) {
    passengerCriteria.push({
      "@type": "PassengerCriteria",
      passengerTypeCode: "ADT",
      number: adultCount,
    });
  }
  if (childCount > 0) {
    passengerCriteria.push({
      "@type": "PassengerCriteria",
      passengerTypeCode: "CHD",
      number: childCount,
    });
  }
  if (infantCount > 0) {
    passengerCriteria.push({
      "@type": "PassengerCriteria",
      passengerTypeCode: "INF",
      number: infantCount,
    });
  }

  const searchSegments =
    body.segments?.map((segment) => ({
      "@type": "SearchCriteriaFlight",
      departureDate: segment.depdate,
      From: { value: String(segment.depfrom).toUpperCase() },
      To: { value: String(segment.arrto).toUpperCase() },
    })) ?? [];

  const shouldApplyCabinPreference = cabinClass !== "ALL";

  return {
    payloadSegments: body.segments ?? [],
    request: {
      "@type": "CatalogProductOfferingsQueryRequest",
      CatalogProductOfferingsRequest: {
        "@type": "CatalogProductOfferingsRequestAir",
        maxNumberOfUpsellsToReturn: maxUpsellsToReturn,
        offersPerPage: 20,
        contentSourceList: ["NDC", "GDS"],
        PassengerCriteria: passengerCriteria,
        SearchCriteriaFlight: searchSegments,
        CustomResponseModifiersAir:{
            "@type": "CustomResponseModifiersAir",
            includeFlightAmenitiesInd: true,
            includeUniversalProductAttributesInd: true,
            excludeBaggageFeesInd: true,
            includeCo2EmissionsDataInd: true
        },
        SearchModifiersAir: {
          "@type": "SearchModifiersAir",
          ...(shouldApplyCabinPreference
            ? {
                CarrierPreference: [
                  {
                    preferenceType: "PreferredWithUpgrade",
                    cabins: [cabinClass],
                  },
                ],
              }
            : {}),
        },
        PricingModifiersAir: {
          "@type": "PricingModifiersAir",
          currencyCode,
        },
      },
    },
  };
}

export function toLegacySearchResult(
  payloadSegments: LegacySegment[],
  rawResponse: unknown
): unknown[] {
  const data = removeAtType(rawResponse as Record<string, unknown>);

  const catalogResponse =
    (data as any)?.CatalogProductOfferingsResponse ??
    (data as any)?.CatalogProductOfferingResponse;

  const transactionId = catalogResponse?.transactionId || "";
  const catalogOfferings = Array.isArray(
    catalogResponse?.CatalogProductOfferings?.CatalogProductOffering
  )
    ? catalogResponse.CatalogProductOfferings.CatalogProductOffering
    : [];
  const referenceList = Array.isArray(catalogResponse?.ReferenceList)
    ? catalogResponse.ReferenceList
    : [];

  const flights =
    referenceList.find((item: any) => Array.isArray(item?.Flight))?.Flight ?? [];
  const products =
    referenceList.find((item: any) => Array.isArray(item?.Product))?.Product ??
    [];
  const termsList =
    referenceList.find((item: any) => Array.isArray(item?.TermsAndConditions))
      ?.TermsAndConditions ?? [];
  const brands =
    referenceList.find((item: any) => Array.isArray(item?.Brand))?.Brand ?? [];
  const amenities =
    referenceList.find((item: any) => Array.isArray(item?.Amenity))?.Amenity ?? [];
  const universalProductAttributes =
    referenceList.find((item: any) =>
      Array.isArray(item?.UniversalProductAttribute)
    )?.UniversalProductAttribute ?? [];

  const flightMap = new Map<string, any>(flights.map((f: any) => [f.id, f]));
  const productMap = new Map<string, any>(products.map((p: any) => [p.id, p]));
  const termsMap = new Map<string, any>(
    termsList.map((t: any) => [t.id, t as Record<string, unknown>])
  );
  const brandMap = new Map<string, any>(brands.map((brand: any) => [brand.id, brand]));
  const amenityMap = new Map<string, any>(
    amenities.map((amenity: any) => [amenity.id, amenity])
  );
  const universalProductAttributeMap = new Map<string, any>(
    universalProductAttributes.map((attribute: any) => [attribute.id, attribute])
  );

  const productBrandOfferings: Array<{
    offering: any;
    sequence: number;
    index: number;
  }> = [];
  for (const catalog of catalogOfferings) {
    const sequence = toNumber(catalog?.sequence, 1);
    for (const brandOption of catalog?.ProductBrandOptions ?? []) {
      for (const offering of brandOption?.ProductBrandOffering ?? []) {
        productBrandOfferings.push({
          offering,
          sequence,
          index: productBrandOfferings.length,
        });
      }
    }
  }

  const baseResults = productBrandOfferings.map(
    ({ offering, sequence, index }: any) => {
      const bestPrice = offering?.BestCombinablePrice ?? {};
      const termsRef = offering?.TermsAndConditions?.termsAndConditionsRef;
      const terms = termsMap.get(termsRef) ?? {};
      const carrierCode =
        terms?.ValidatingAirline?.ValidatingAirline ||
        terms?.BaggageAllowance?.[0]?.validatingAirlineCode ||
        "N/A";

      const penalties = Array.isArray(terms?.Penalties) ? terms.Penalties : [];
      const penaltiesCancellation = mapPenaltiesCancellationFromTerms(penalties);
      const refundable = penalties.some(
        (p: any) => Array.isArray(p?.Cancel) && p.Cancel.length > 0
      );

      const productRef = offering?.Product?.[0]?.productRef;
      const product = productMap.get(productRef) ?? {};
      const productSegments = Array.isArray(product?.FlightSegment)
        ? product.FlightSegment
        : [];

      const firstPassengerFlight = Array.isArray(product?.PassengerFlight)
        ? product.PassengerFlight[0]
        : {};
      const firstFlightProduct = firstPassengerFlight?.FlightProduct?.[0] ?? {};
      const brandRef = firstFlightProduct?.Brand?.BrandRef;
      const brandDetails = brandMap.get(brandRef) ?? null;

      const mappedSegments = productSegments.map((segment: any) => {
        const flightRef = segment?.Flight?.FlightRef;
        const flight = flightMap.get(flightRef) ?? {};
        const amenityRefs = Array.isArray(segment?.amenityRefs)
          ? segment.amenityRefs.map((ref: unknown) => String(ref))
          : [];
        const universalAttributeRefs = Array.isArray(
          segment?.universalProductAttributeRefs
        )
          ? segment.universalProductAttributeRefs.map((ref: unknown) => String(ref))
          : [];

        const mappedAmenities = amenityRefs
          .map((ref: string) => amenityMap.get(ref))
          .filter(Boolean)
          .map((item: any) => toAmenityItem(item));

        const amenitiesByCategory = mappedAmenities.reduce(
          (acc: Record<string, string[]>, item: any) => {
            const category = String(item?.category || "Other");
            if (!acc[category]) {
              acc[category] = [];
            }
            if (item?.text) {
              acc[category].push(String(item.text));
            }
            return acc;
          },
          {}
        );

        const mappedUniversalAttributes = universalAttributeRefs
          .map((ref: string) => universalProductAttributeMap.get(ref))
          .filter(Boolean)
          .map((item: any) => toUniversalProductAttributeItem(item));

        return {
          MarketingCarrier: flight?.carrier ?? carrierCode,
          MarketingCarrierName: flight?.carrier ?? carrierCode,
          MarketingFlightNumber: flight?.number ?? "N/A",
          OperatingCarrier:
            flight?.operatingCarrier ?? flight?.carrier ?? carrierCode,
          OperatingFlightNumber:
            flight?.operatingCarrierName ?? flight?.number ?? "N/A",
          OperatingCarrierName:
            flight?.operatingCarrierName ?? flight?.carrier ?? carrierCode,
          DepFrom: flight?.Departure?.location ?? "",
          DepAirPort: flight?.Departure?.location ?? "",
          DepLocation: flight?.Departure?.location ?? "",
          DepDateAdjustment: 0,
          DepTime: formatDateTime(flight?.Departure?.date, flight?.Departure?.time),
          ArrTo: flight?.Arrival?.location ?? "",
          ArrAirPort: flight?.Arrival?.location ?? "",
          ArrLocation: flight?.Arrival?.location ?? "",
          ArrDateAdjustment: 0,
          ArrTime: formatDateTime(flight?.Arrival?.date, flight?.Arrival?.time),
          OperatedBy: flight?.operatingCarrier ?? flight?.carrier ?? carrierCode,
          StopCount: flight?.stopCount ?? 0,
          Duration: parseDurationToMinutes(flight?.duration),
          DurationIso: flight?.duration ?? durationMinutesToIso(parseDurationToMinutes(flight?.duration)),
          ConnectionDuration: parseDurationToMinutes(segment?.connectionDuration),
          ConnectionDurationIso: segment?.connectionDuration ?? null,
          AircraftTypeName: flight?.equipment ?? "N/A",
          Amenities: {
            amenityRefs,
            universalProductAttributeRefs: universalAttributeRefs,
            items: mappedAmenities,
            byCategory: amenitiesByCategory,
            universalProductAttributes: mappedUniversalAttributes,
          },
          DepartureGate: flight?.Departure?.terminal ?? "TBA",
          ArrivalGate: flight?.Arrival?.terminal ?? "TBA",
          HiddenStops: flight?.hiddenStops ?? [],
          SegmentCode: {
            bookingCode: firstFlightProduct?.classOfService ?? "",
            cabinCode: firstFlightProduct?.cabin ?? "Economy",
            seatsAvailable: product?.Quantity || 9,
          },
        };
      });

      const priceBreakDown =
        bestPrice?.PriceBreakdown?.map((pax: any) => {
          const paxType = pax?.requestedPassengerType;
          const passengerAllowance = Array.isArray(terms?.BaggageAllowance)
            ? terms.BaggageAllowance.filter((item: any) =>
                Array.isArray(item?.passengerTypeCodes)
                  ? item.passengerTypeCodes.includes(paxType)
                  : false
              )
            : [];

          const bagItem = passengerAllowance
            .flatMap((allowance: any) => allowance?.BaggageItem ?? [])
            .find((item: any) => item?.includedInOfferPrice === "Yes");

          const bagAllowance = extractBaggageAllowance(
            bagItem?.Text,
            toNumber(bagItem?.quantity, 0)
          );

          return {
            PaxType: mapPaxType(paxType),
            CurrencyCode:
              pax?.Amount?.CurrencyCode?.value ||
              pax?.Amount?.CurrencyCode ||
              bestPrice?.CurrencyCode?.value ||
              bestPrice?.CurrencyCode ||
              process.env.TRAVELPORT_DEFAULT_CURRENCY ||
              "USD",
            BaseFare: toNumber(pax?.Amount?.Base, 0),
            Taxes: toNumber(pax?.Amount?.Taxes?.TotalTaxes, 0),
            ServiceFee: 0,
            OtherCharges: 0,
            TotalFare: toNumber(pax?.Amount?.Total, 0),
            PaxCount: toNumber(pax?.quantity, 1),
            Bag: [
              {
                Airline: carrierCode,
                Allowance: bagAllowance,
              },
            ],
            FareComponent: [],
          };
        }) ?? [];

      const requestedSegment = (payloadSegments[sequence - 1] ??
        payloadSegments[0] ??
        {}) as Partial<LegacySegment>;
      const firstMappedSegment = mappedSegments[0];
      const lastMappedSegment = mappedSegments[mappedSegments.length - 1];

      const allLegsInfo = [
        {
          DepDate:
            firstMappedSegment?.DepTime ||
            formatDateTime(requestedSegment?.depdate, "00:00:00"),
          DepFrom:
            requestedSegment?.depfrom || firstMappedSegment?.DepFrom || "",
          ArrTo: requestedSegment?.arrto || lastMappedSegment?.ArrTo || "",
          Duration: parseDurationToMinutes(product?.totalDuration),
          TotalDurationISO:
            product?.totalDuration ??
            durationMinutesToIso(parseDurationToMinutes(product?.totalDuration)),
          BrandName: brandDetails?.name ?? null,
          BrandCode: brandDetails?.code ?? null,
          BrandFeatures: brandDetails,
          Segments: mappedSegments,
        },
      ];

      const grossFare = toNumber(bestPrice?.TotalPrice, 0);
      const resultId =
        offering?.Identifier?.value ||
        `${transactionId || "TP"}-${sequence}-${String(index + 1).padStart(
          3,
          "0"
        )}`;

      return {
        legacy: {
          System: "travelport",
          ResultId: resultId,
          SearchId: transactionId || "TRAVELPORT-SEARCH",
          InstantPayment: false,
          IsBookable: true,
          TripType: payloadSegments.length === 1 ? "Oneway" : "Return",
          FareType: firstFlightProduct?.fareType || "NET",
          Carrier: carrierCode,
          CarrierName: carrierCode,
          CurrencyCode:
            bestPrice?.CurrencyCode?.value ||
            bestPrice?.CurrencyCode ||
            process.env.TRAVELPORT_DEFAULT_CURRENCY ||
            "USD",
          BaseFare: toNumber(bestPrice?.Base, 0),
          Taxes: toNumber(bestPrice?.TotalTaxes, 0),
          SerViceFee: 0,
          NetFare: grossFare,
          GrossFare: grossFare,
          PartialOption: false,
          PartialFare: 0,
          TimeLimit: terms?.PaymentTimeLimit || null,
          Refundable: refundable,
          penaltiesCancellation,
          ExtraService: null,
          PriceBreakDown: priceBreakDown,
          AllLegsInfo: allLegsInfo,
        },
        sequence,
        combinabilityCodes: Array.isArray(offering?.CombinabilityCode)
          ? offering.CombinabilityCode.map((item: unknown) => String(item))
          : [],
      };
    }
  );

  if (payloadSegments.length <= 1) {
    return baseResults
      .map((item: any) => item.legacy)
      .sort((a: any, b: any) => a.NetFare - b.NetFare);
  }

  const requiredSequences = Array.from(
    { length: payloadSegments.length },
    (_, idx) => idx + 1
  );
  const groupedByCode = new Map<string, Map<number, any[]>>();

  for (const option of baseResults) {
    const combinationCodes =
      option.combinabilityCodes.length > 0
        ? option.combinabilityCodes
        : ["__NO_COMBINABILITY__"];

    for (const code of combinationCodes) {
      if (!groupedByCode.has(code)) {
        groupedByCode.set(code, new Map<number, any[]>());
      }
      const sequenceMap = groupedByCode.get(code)!;
      if (!sequenceMap.has(option.sequence)) {
        sequenceMap.set(option.sequence, []);
      }
      sequenceMap.get(option.sequence)!.push(option);
    }
  }

  const combinedOptions: any[] = [];
  for (const [, sequenceMap] of groupedByCode) {
    const hasAllSequences = requiredSequences.every((seq) => sequenceMap.has(seq));
    if (!hasAllSequences) {
      continue;
    }

    const currentSelection: any[] = [];
    const buildCombinations = (index: number) => {
      if (index >= requiredSequences.length) {
        const selectedLegs = currentSelection.map((item) => item.legacy);
        const firstLeg = selectedLegs[0];
        const mergedLegs = selectedLegs.flatMap((item: any) =>
          Array.isArray(item?.AllLegsInfo) ? item.AllLegsInfo : []
        );

        combinedOptions.push({
          ...firstLeg,
          ResultId: selectedLegs.map((item: any) => item.ResultId).join("_"),
          TripType: "Return",
          AllLegsInfo: mergedLegs,
          penaltiesCancellation: mergePenaltiesCancellation(
            selectedLegs as Array<Record<string, unknown>>
          ),
        });
        return;
      }

      const sequence = requiredSequences[index];
      const sequenceItems = sequenceMap.get(sequence) ?? [];
      for (const item of sequenceItems) {
        currentSelection.push(item);
        buildCombinations(index + 1);
        currentSelection.pop();
      }
    };

    buildCombinations(0);
  }

  const deduped = Array.from(
    combinedOptions.reduce((map: Map<string, any>, item: any) => {
      if (!map.has(item.ResultId)) {
        map.set(item.ResultId, item);
      }
      return map;
    }, new Map<string, any>()).values()
  );

  return deduped.sort((a: any, b: any) => {
    const netFareDiff = toNumber(a?.NetFare, Number.MAX_SAFE_INTEGER) -
      toNumber(b?.NetFare, Number.MAX_SAFE_INTEGER);
    if (netFareDiff !== 0) {
      return netFareDiff;
    }

    const durationA = (a?.AllLegsInfo ?? []).reduce(
      (sum: number, leg: any) => sum + toNumber(leg?.Duration, 0),
      0
    );
    const durationB = (b?.AllLegsInfo ?? []).reduce(
      (sum: number, leg: any) => sum + toNumber(leg?.Duration, 0),
      0
    );
    return durationA - durationB;
  });
}

async function loadSampleLegacyFallback(
  payloadSegments: LegacySegment[]
): Promise<{ source: string; results: unknown[] } | null> {
  const candidateRawFiles = ["roundtripdata.json", "flightsearchresponse.json"];

  for (const filename of candidateRawFiles) {
    const rawSample = await readSampleJson<Record<string, unknown>>(filename);
    if (!rawSample || typeof rawSample !== "object") {
      continue;
    }

    const mapped = toLegacySearchResult(payloadSegments, rawSample);
    if (Array.isArray(mapped) && mapped.length > 0) {
      return { source: `sample/${filename}`, results: mapped };
    }
  }

  const legacySample = await readSampleJson<unknown>("flightResponseLegacyModel.json");
  if (Array.isArray(legacySample) && legacySample.length > 0) {
    return { source: "sample/flightResponseLegacyModel.json", results: legacySample };
  }

  if (legacySample && typeof legacySample === "object") {
    const legacyObject = legacySample as Record<string, unknown>;
    if (Object.keys(legacyObject).length > 0) {
      return {
        source: "sample/flightResponseLegacyModel.json",
        results: [legacyObject],
      };
    }
  }

  const unifiedListSample = await readSampleJson<unknown[]>(
    "flightResponseUnifiedModelList.json"
  );
  if (Array.isArray(unifiedListSample) && unifiedListSample.length > 0) {
    const legacyFromUnified = unifiedListSample
      .map((item) =>
        item && typeof item === "object"
          ? (item as Record<string, unknown>).sourceLegacy
          : null
      )
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object"
      );

    if (legacyFromUnified.length > 0) {
      return {
        source: "sample/flightResponseUnifiedModelList.json",
        results: legacyFromUnified,
      };
    }
  }

  const unifiedSingleSample = await readSampleJson<unknown>("flightResponseUnifiedModel.json");
  if (unifiedSingleSample && typeof unifiedSingleSample === "object") {
    const sourceLegacy = (unifiedSingleSample as Record<string, unknown>).sourceLegacy;
    if (sourceLegacy && typeof sourceLegacy === "object") {
      return {
        source: "sample/flightResponseUnifiedModel.json",
        results: [sourceLegacy as Record<string, unknown>],
      };
    }
  }

  return null;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<unknown[] | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const body = (req.body ?? {}) as LegacySearchBody;
    if (!Array.isArray(body.segments) || body.segments.length === 0) {
      return res
        .status(400)
        .json({ message: "segments is required for flight search" });
    }

    const accessToken = await createToken();
    const flightsUrl = getRequiredEnv("TRAVELPORT_FLIGHTS_URL");
    const accessGroup = getRequiredEnv("TRAVELPORT_ACCESS_GROUP");
    const version = process.env.TRAVELPORT_VERSION || "11";

    const { request, payloadSegments } = buildTravelportPayload(body);

    let responsePayload: Record<string, unknown> = {};
    let liveSearchFailed = false;
    let liveSearchErrorMessage = "";
    let results: unknown[] = [];
    let fallbackSource: string | null = null;

    try {
      const response = await fetch(flightsUrl, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          XAUTH_TRAVELPORT_ACCESSGROUP: accessGroup,
          "Accept-Version": version,
          "Content-Version": version,
          taxBreakDown: "true",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(request),
      });

      responsePayload = await response.json().catch(() => ({}));
      if (response.ok) {
        results = toLegacySearchResult(payloadSegments, responsePayload);
      } else {
        liveSearchFailed = true;
        liveSearchErrorMessage =
          (responsePayload?.message as string) ||
          (responsePayload?.error_description as string) ||
          `Travelport flight search failed (${response.status})`;
      }
    } catch (liveSearchError) {
      liveSearchFailed = true;
      liveSearchErrorMessage =
        liveSearchError instanceof Error
          ? liveSearchError.message
          : "Travelport flight search failed";
    }

    if (!Array.isArray(results) || results.length === 0) {
      const fallback = await loadSampleLegacyFallback(payloadSegments);
      if (fallback && fallback.results.length > 0) {
        results = fallback.results;
        fallbackSource = fallback.source;
        console.warn(
          `[search-flight] Returned sample fallback data from ${fallback.source}`
        );
      }
    }

    if (!Array.isArray(results) || results.length === 0) {
      if (liveSearchFailed) {
        return res.status(502).json({
          message: "Travelport flight search failed",
          details:
            liveSearchErrorMessage ||
            "Live API failed and no non-empty sample fallback is available.",
        });
      }

      return res.status(200).json([]);
    }

    const unifiedResults = results.map((item: unknown) =>
      toUnifiedFlightResult(item as Record<string, unknown>)
    );

    if (
      shouldSaveSearchResponse(body) &&
      !fallbackSource &&
      Array.isArray(results) &&
      results.length > 0
    ) {
      try {
        await persistSearchResponseSamples({
          requestPayload: request as Record<string, unknown>,
          travelportRawResponse: responsePayload as Record<string, unknown>,
          legacyResults: results as Record<string, unknown>[],
          unifiedResults: unifiedResults as Record<string, unknown>[],
        });
      } catch (persistError) {
        console.error("Failed to persist search response samples", persistError);
      }
    }

    const responseModel = String(body.responseModel ?? "legacy")
      .toLowerCase()
      .trim();

    if (responseModel === "unified") {
      return res.status(200).json(unifiedResults);
    }

    if (responseModel === "both") {
      const bothModels = results.map((item: unknown) => {
        const legacy = item as Record<string, unknown>;
        return {
          legacy,
          unified: toUnifiedFlightResult(legacy),
        };
      });
      return res.status(200).json(bothModels);
    }

    return res.status(200).json(results);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return res.status(500).json({ message });
  }
}
