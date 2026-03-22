import type { NextApiRequest, NextApiResponse } from "next";
import {
  type LegacySegment,
} from "./search-flight";
import { getTravelportAccessToken } from "./_token-cache";

type BuildFromProductsBody = {
  selectedOffer?: Record<string, unknown>;
  offer?: Record<string, unknown>;
  data?: Record<string, unknown>;
  currencyCode?: string;
  currency?: string;
  adultCount?: number | string;
  childCount?: number | string;
  infantCount?: number | string;
  passengers?: {
    adult?: number | string;
    child?: number | string;
    infant?: number | string;
  };
};

type ErrorResponse = {
  message: string;
  details?: string;
};

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

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map((item) => toText(item)).find(Boolean) || "";
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    return (
      toText(source.value) ||
      toText(source.Value) ||
      toText(source.code) ||
      toText(source.Code) ||
      toText(source.id) ||
      toText(source.ID) ||
      ""
    );
  }
  return "";
}

function getValueByKeys(
  obj: Record<string, unknown> | null | undefined,
  keys: string[]
): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function getArrayByKeys(
  obj: Record<string, unknown> | null | undefined,
  keys: string[]
): unknown[] {
  if (!obj || typeof obj !== "object") return [];
  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normalizeCabin(value: unknown): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "Economy";
  if (["y", "m", "economy"].includes(normalized)) return "Economy";
  if (["w", "s", "u", "premiumeconomy", "premium economy"].includes(normalized)) {
    return "PremiumEconomy";
  }
  if (["c", "i", "j", "business"].includes(normalized)) return "Business";
  if (["f", "p", "first"].includes(normalized)) return "First";
  return "Economy";
}

function normalizeCurrencyCode(value: unknown): string {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : "USD";
}

function splitDateTime(value: unknown): { date: string; time: string } {
  const raw = toText(value);
  if (!raw) {
    return { date: "", time: "00:00:00" };
  }

  const normalizedIso = raw.replace(" ", "T");
  const isoMatch = normalizedIso.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)/
  );

  if (isoMatch) {
    return {
      date: isoMatch[1],
      time: isoMatch[2].length === 5 ? `${isoMatch[2]}:00` : isoMatch[2],
    };
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { date: raw.slice(0, 10), time: "00:00:00" };
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  const hour = String(parsed.getUTCHours()).padStart(2, "0");
  const minute = String(parsed.getUTCMinutes()).padStart(2, "0");
  const second = String(parsed.getUTCSeconds()).padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}:${second}`,
  };
}

function normalizeSegments(leg: Record<string, unknown>): Record<string, unknown>[] {
  const segments = getArrayByKeys(leg, ["Segments", "segments"]);
  if (!segments.length) return [];
  if (Array.isArray(segments[0])) {
    return (segments as unknown[]).flat() as Record<string, unknown>[];
  }
  return segments as Record<string, unknown>[];
}

function resolveOffer(body: BuildFromProductsBody): Record<string, unknown> {
  const candidates = [body?.selectedOffer, body?.offer, body?.data];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") return candidate;
  }
  return {};
}

function buildPayloadSegments(offer: Record<string, unknown>): LegacySegment[] {
  const allLegsInfo = getArrayByKeys(offer, ["AllLegsInfo", "allLegsInfo"]);
  if (!allLegsInfo.length) return [];

  return allLegsInfo
    .map((leg) => {
      const legObj = (leg ?? {}) as Record<string, unknown>;
      const segments = normalizeSegments(legObj);
      const firstSegment = (segments[0] ?? {}) as Record<string, unknown>;
      const lastSegment = (segments[segments.length - 1] ??
        {}) as Record<string, unknown>;
      const depDate = splitDateTime(
        getValueByKeys(legObj, ["DepDate", "depDate"]) ??
          getValueByKeys(firstSegment, ["DepTime", "depTime"])
      ).date;
      const depfrom = toText(
        getValueByKeys(legObj, ["DepFrom", "depFrom"]) ??
          getValueByKeys(firstSegment, ["DepFrom", "depFrom"])
      );
      const arrto = toText(
        getValueByKeys(legObj, ["ArrTo", "arrTo"]) ??
          getValueByKeys(lastSegment, ["ArrTo", "arrTo"])
      );

      return {
        depfrom,
        arrto,
        depdate: depDate,
      };
    })
    .filter((item) => item.depfrom && item.arrto && item.depdate);
}

function resolvePassengerCounts(
  offer: Record<string, unknown>,
  body: BuildFromProductsBody
): { adt: number; chd: number; inf: number } {
  const bodyAdult = toNumber(
    body?.adultCount ?? body?.passengers?.adult ?? 0,
    0
  );
  const bodyChild = toNumber(
    body?.childCount ?? body?.passengers?.child ?? 0,
    0
  );
  const bodyInfant = toNumber(
    body?.infantCount ?? body?.passengers?.infant ?? 0,
    0
  );

  if (bodyAdult || bodyChild || bodyInfant) {
    return {
      adt: Math.max(bodyAdult, 0),
      chd: Math.max(bodyChild, 0),
      inf: Math.max(bodyInfant, 0),
    };
  }

  const breakdown = getArrayByKeys(offer, ["PriceBreakDown", "priceBreakDown"]);
  let adt = 0;
  let chd = 0;
  let inf = 0;

  for (const row of breakdown) {
    const item = (row ?? {}) as Record<string, unknown>;
    const paxType = String(
      getValueByKeys(item, ["PaxType", "paxType"]) ?? ""
    ).toUpperCase();
    const count = Math.max(
      toNumber(getValueByKeys(item, ["PaxCount", "paxCount"]), 0),
      0
    );

    if (["ADT", "ADULT"].includes(paxType)) adt += count;
    if (["CHD", "CHILD", "CNN"].includes(paxType)) chd += count;
    if (["INF", "INFANT"].includes(paxType)) inf += count;
  }

  return {
    adt: adt || 1,
    chd,
    inf,
  };
}

function buildPassengerCriteria(
  offer: Record<string, unknown>,
  body: BuildFromProductsBody
) {
  const counts = resolvePassengerCounts(offer, body);
  const criteria = [];

  if (counts.adt > 0) {
    criteria.push({
      "@type": "PassengerCriteria",
      number: counts.adt,
      age: 25,
      passengerTypeCode: "ADT",
    });
  }
  if (counts.chd > 0) {
    criteria.push({
      "@type": "PassengerCriteria",
      number: counts.chd,
      age: 10,
      passengerTypeCode: "CHD",
    });
  }
  if (counts.inf > 0) {
    criteria.push({
      "@type": "PassengerCriteria",
      number: counts.inf,
      age: 1,
      passengerTypeCode: "INF",
    });
  }

  return criteria.length ? criteria : [{ "@type": "PassengerCriteria", number: 1, age: 25, passengerTypeCode: "ADT" }];
}

function buildProductCriteriaAir(offer: Record<string, unknown>) {
  const allLegsInfo = getArrayByKeys(offer, ["AllLegsInfo", "allLegsInfo"]);
  const productCriteriaAir: Array<Record<string, unknown>> = [];
  let segmentSequence = 1;

  for (const leg of allLegsInfo) {
    const legObj = (leg ?? {}) as Record<string, unknown>;
    const segments = normalizeSegments(legObj);
    if (!segments.length) continue;

    const specificFlightCriteria = segments.map((rawSegment) => {
      const segment = (rawSegment ?? {}) as Record<string, unknown>;
      const dep = splitDateTime(getValueByKeys(segment, ["DepTime", "depTime"]));
      const arr = splitDateTime(getValueByKeys(segment, ["ArrTime", "arrTime"]));
      const segmentCode =
        (getValueByKeys(segment, ["SegmentCode", "segmentCode"]) as
          | Record<string, unknown>
          | undefined) || {};
      const brandFeatures =
        (getValueByKeys(legObj, ["BrandFeatures", "brandFeatures"]) as
          | Record<string, unknown>
          | undefined) || {};

      const criteria = {
        flightNumber: toText(
          getValueByKeys(segment, ["MarketingFlightNumber", "marketingFlightNumber"])
        ),
        carrier: toText(
          getValueByKeys(segment, ["MarketingCarrier", "marketingCarrier"])
        ),
        departureDate: dep.date,
        departureTime: dep.time,
        arrivalDate: arr.date,
        arrivalTime: arr.time,
        from: toText(getValueByKeys(segment, ["DepFrom", "depFrom"])),
        to: toText(getValueByKeys(segment, ["ArrTo", "arrTo"])),
        classOfService: toText(
          getValueByKeys(segmentCode, ["bookingCode", "BookingCode"]) || "Y"
        ),
        cabin: normalizeCabin(
          getValueByKeys(segmentCode, ["cabinCode", "CabinCode"])
        ),
        segmentSequence,
        brandTier: toText(
          getValueByKeys(segment, ["brandTier", "BrandTier"]) ??
            getValueByKeys(brandFeatures, ["tier", "Tier"]) ??
            "1"
        ),
        AvailabilitySourceCode: toText(
          getValueByKeys(segment, ["AvailabilitySourceCode"])
        ) || "A",
        ContentSource:
          toText(getValueByKeys(segment, ["ContentSource"])) || "GDS",
      };

      segmentSequence += 1;
      return criteria;
    });

    productCriteriaAir.push({
      SpecificFlightCriteria: specificFlightCriteria,
    });
  }

  return productCriteriaAir;
}

function buildBuildFromProductsPayload(
  offer: Record<string, unknown>,
  body: BuildFromProductsBody,
  requestedCurrencyCode: string
) {
  return {
    "@type": "OfferQueryBuildFromProducts",
    returnBrandedFaresInd: true,
    BuildFromProductsRequest: {
      "@type": "BuildFromProductsRequestAir",
      PassengerCriteria: buildPassengerCriteria(offer, body),
      CustomResponseModifiersAir: {
        "@type": "CustomResponseModifiersAir",
        includeFlightAmenitiesInd: true,
        includeUniversalProductAttributesInd: true,
      },
      PricingModifiersAir: {
        "@type": "PricingModifiersAirDetail",
        currencyCode: requestedCurrencyCode,
      },
      ProductCriteriaAir: buildProductCriteriaAir(offer),
    },
    validateInventoryInd: true,
    lowFareFinderInd: true,
    reCheckInventoryInd: true
  };
}

function parseDurationToMinutes(duration: unknown): number {
  if (typeof duration === "number") return duration;
  if (typeof duration !== "string" || !duration) return 0;
  const hourMatch = duration.match(/(\d+)H/i);
  const minuteMatch = duration.match(/(\d+)M/i);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  return hours * 60 + minutes;
}

function durationMinutesToIso(minutes: unknown): string {
  const safeMinutes = Math.max(0, toNumber(minutes, 0));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  if (hours > 0 && remainingMinutes > 0) return `PT${hours}H${remainingMinutes}M`;
  if (hours > 0) return `PT${hours}H`;
  return `PT${remainingMinutes}M`;
}

function formatDateTime(date: unknown, time: unknown): string {
  const dateValue = toText(date);
  const timeValue = toText(time);
  if (dateValue && timeValue) return `${dateValue}T${timeValue}`;
  if (dateValue) return `${dateValue}T00:00:00`;
  return "";
}

function mapPaxType(code: unknown): string {
  const value = String(code ?? "").toUpperCase();
  if (value === "ADT") return "Adult";
  if (value === "CHD") return "Child";
  if (value === "INF") return "Infant";
  return "Adult";
}

function extractTextValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const entry of value) {
      const item = extractTextValue(entry);
      if (item) return item;
    }
    return "";
  }
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    if (typeof source.value === "string") return source.value;
    if (typeof source.Text === "string") return source.Text;
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
    category: String(source.Category ?? source.category ?? "").trim(),
    text: extractTextValue(source.Text ?? source.text),
  };
}

function toUniversalProductAttributeItem(attribute: unknown) {
  const source = (attribute ?? {}) as Record<string, unknown>;
  const iconURL = Array.isArray(source.IconURL) ? source.IconURL : [];

  return {
    id: String(source.id ?? ""),
    headline: String(source.headline ?? source.Headline ?? "").trim(),
    description: String(source.description ?? source.Description ?? "").trim(),
    iconSmall: extractUrlByType(iconURL, ["smallurl", "smallURL"]),
    iconLarge: extractUrlByType(iconURL, ["largeurl", "largeURL"]),
  };
}

function mapInlineAmenityItems(value: unknown): Array<{ id: string; category: string; text: string }> {
  const rows = Array.isArray(value) ? value : [];
  return rows
    .map((item) => toAmenityItem(item))
    .filter((item) => item.category || item.text);
}

function mapInlineUniversalAttributes(
  value: unknown
): Array<{
  id: string;
  headline: string;
  description: string;
  iconSmall: string | null;
  iconLarge: string | null;
}> {
  const rows = Array.isArray(value) ? value : [];
  return rows
    .map((item) => toUniversalProductAttributeItem(item))
    .filter((item) => item.headline || item.description || item.id);
}

function normalizeAmenityInclusion(value: unknown): string {
  const normalized = String(toText(value) || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  if (normalized === "included") return "Included";
  if (normalized === "chargeable") return "Chargeable";
  if (normalized === "notoffered") return "Not Offered";
  return toText(value) || "Info";
}

function buildUnifiedAmenitiesFromLegs(legs: Array<Record<string, unknown>>) {
  const basic: Array<{ classification: string; inclusion: string }> = [];
  const additional: Array<{ classification: string; inclusion: string }> = [];
  const legWise: Array<{
    leg: number;
    route: string;
    items: Array<{ category: string; text: string }>;
  }> = [];

  const dedupeByKey = <T>(rows: T[], toKey: (row: T) => string): T[] =>
    Array.from(new Map(rows.map((row) => [toKey(row), row])).values());

  legs.forEach((leg, legIndex) => {
    const features =
      (getValueByKeys(leg, ["BrandFeatures", "brandFeatures"]) as
        | Record<string, unknown>
        | undefined) || {};

    const primary = getArrayByKeys(features, ["BrandAttribute", "brandAttribute"]);
    const extra = getArrayByKeys(features, [
      "AdditionalBrandAttribute",
      "additionalBrandAttribute",
    ]);

    primary.forEach((item) => {
      const row = item as Record<string, unknown>;
      const classification = toText(
        getValueByKeys(row, ["classification", "Classification", "name", "Name"])
      );
      if (!classification) return;
      basic.push({
        classification,
        inclusion: normalizeAmenityInclusion(
          getValueByKeys(row, ["inclusion", "Inclusion"])
        ),
      });
    });

    extra.forEach((item) => {
      const row = item as Record<string, unknown>;
      const classification = toText(
        getValueByKeys(row, ["classification", "Classification", "name", "Name"])
      );
      if (!classification) return;
      additional.push({
        classification,
        inclusion: normalizeAmenityInclusion(
          getValueByKeys(row, ["inclusion", "Inclusion"])
        ),
      });
    });

    const dep =
      toText(getValueByKeys(leg, ["DepFrom", "depFrom", "departureFrom"])) || "DEP";
    const arr =
      toText(getValueByKeys(leg, ["ArrTo", "arrTo", "arrivalTo"])) || "ARR";
    const segments = getArrayByKeys(leg, ["Segments", "segments"]);
    const legItems: Array<{ category: string; text: string }> = [];

    segments.forEach((segment) => {
      const segmentObj = (segment ?? {}) as Record<string, unknown>;
      const amenityContainer = getValueByKeys(segmentObj, ["Amenities", "amenities"]);
      const containerObj =
        amenityContainer && typeof amenityContainer === "object"
          ? (amenityContainer as Record<string, unknown>)
          : null;

      const byCategoryItems: unknown[] = [];
      const byCategory = containerObj
        ? getValueByKeys(containerObj, ["byCategory", "ByCategory"])
        : null;
      if (byCategory && typeof byCategory === "object") {
        Object.values(byCategory as Record<string, unknown>).forEach((items) => {
          if (Array.isArray(items)) {
            byCategoryItems.push(...items);
          }
        });
      }

      const amenityItems = [
        ...getArrayByKeys(segmentObj, ["Amenities", "amenities"]),
        ...(containerObj ? getArrayByKeys(containerObj, ["items", "Items"]) : []),
        ...byCategoryItems,
      ];

      amenityItems.forEach((item) => {
        const row = (item ?? {}) as Record<string, unknown>;
        const category =
          toText(
            getValueByKeys(row, [
              "category",
              "Category",
              "classification",
              "Classification",
            ])
          ) || "General";
        const text =
          toText(
            getValueByKeys(row, [
              "text",
              "Text",
              "headline",
              "Headline",
              "classification",
              "Classification",
            ])
          ) || toText(item);
        if (!text) return;
        legItems.push({ category, text: text.replace(/\s+/g, " ").trim() });
      });
    });

    const dedupLegItems = dedupeByKey(
      legItems.filter((item) => item.text),
      (item) => `${item.category}-${item.text}`.toLowerCase()
    );
    if (dedupLegItems.length > 0) {
      legWise.push({
        leg: legIndex + 1,
        route: `${dep}-${arr}`,
        items: dedupLegItems,
      });
    }
  });

  return {
    basic: dedupeByKey(
      basic,
      (item) => `${item.classification}-${item.inclusion}`.toLowerCase()
    ),
    additional: dedupeByKey(
      additional,
      (item) => `${item.classification}-${item.inclusion}`.toLowerCase()
    ),
    legWise,
  };
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

function toNullableNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function resolveOfferIdentifier(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const resolved = resolveOfferIdentifier(item);
      if (resolved) return resolved;
    }
    return "";
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    return (
      resolveOfferIdentifier(source.value) ||
      resolveOfferIdentifier(source.Value) ||
      resolveOfferIdentifier(source.Identifier) ||
      resolveOfferIdentifier(source.identifier) ||
      resolveOfferIdentifier(source.offerIdentifier) ||
      resolveOfferIdentifier(source.OfferIdentifier) ||
      resolveOfferIdentifier(source.id) ||
      resolveOfferIdentifier(source.ID) ||
      ""
    );
  }
  return "";
}

function resolveProductIdentifiers(offer: Record<string, unknown>): string[] {
  const products = Array.isArray(offer?.Product)
    ? (offer.Product as Array<Record<string, unknown>>)
    : [];
  const identifiers = products
    .map((product) =>
      resolveOfferIdentifier(
        getValueByKeys(product, [
          "id",
          "ID",
          "Identifier",
          "identifier",
          "ProductIdentifier",
          "productIdentifier",
          "productRef",
          "ProductRef",
        ])
      )
    )
    .filter(Boolean);

  return Array.from(new Set(identifiers));
}

function resolveIdentifierList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => resolveOfferIdentifier(item))
          .filter((item) => item.length > 0)
      )
    );
  }
  const single = resolveOfferIdentifier(value);
  return single ? [single] : [];
}

function resolveFarePolicyRequestFromOffer(offer: Record<string, unknown>) {
  const directSource =
    offer?.farePolicyRequest && typeof offer.farePolicyRequest === "object"
      ? (offer.farePolicyRequest as Record<string, unknown>)
      : offer;
  const unifiedSource =
    offer?.sourceUnified && typeof offer.sourceUnified === "object"
      ? (offer.sourceUnified as Record<string, unknown>)
      : null;

  const offerIdentifier =
    resolveOfferIdentifier(
      getValueByKeys(directSource, [
        "offerIdentifier",
        "OfferIdentifier",
        "ResultId",
        "resultId",
        "identifier",
        "Identifier",
      ])
    ) ||
    resolveOfferIdentifier(
      getValueByKeys(unifiedSource, [
        "offerIdentifier",
        "OfferIdentifier",
        "identifier",
        "Identifier",
      ])
    );
  const offerListIdentifier =
    resolveOfferIdentifier(
      getValueByKeys(directSource, [
        "offerListIdentifier",
        "OfferListIdentifier",
        "catalogProductOfferingsIdentifier",
        "CatalogProductOfferingsIdentifier",
      ])
    ) ||
    resolveOfferIdentifier(
      getValueByKeys(unifiedSource, [
        "offerListIdentifier",
        "OfferListIdentifier",
        "catalogProductOfferingsIdentifier",
        "CatalogProductOfferingsIdentifier",
      ])
    );
  const productIdentifiers = resolveIdentifierList(
    getValueByKeys(directSource, [
      "productIdentifiers",
      "ProductIdentifiers",
      "productIdentifier",
      "ProductIdentifier",
    ]) ??
      getValueByKeys(unifiedSource, [
        "productIdentifiers",
        "ProductIdentifiers",
        "productIdentifier",
        "ProductIdentifier",
      ])
  );

  if (!offerIdentifier) {
    return null;
  }

  return {
    offerIdentifier,
    offerListIdentifier,
    productIdentifiers,
  };
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

  if (value === null && !currencyCode) return null;

  return { value, currencyCode };
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

function findBaggageAllowanceText(detail: Record<string, unknown>): string {
  const textArray = Array.isArray(detail?.Text) ? detail.Text : [];
  const textFromArray = textArray.find((entry) => typeof entry === "string");
  if (typeof textFromArray === "string" && textFromArray.trim()) {
    return textFromArray.trim().replace(/K$/i, "Kg");
  }

  const baggageItem = Array.isArray(detail?.BaggageItem)
    ? (detail.BaggageItem as Array<Record<string, unknown>>)[0]
    : null;

  const measurement = Array.isArray(baggageItem?.Measurement)
    ? (baggageItem?.Measurement as Array<Record<string, unknown>>)[0]
    : null;

  const measurementValue = toNumber(measurement?.value, 0);
  const measurementUnit = String(measurement?.unit ?? "").toLowerCase();
  if (measurementValue > 0) {
    if (measurementUnit.startsWith("kilo")) return `${measurementValue}Kg`;
    return `${measurementValue}${measurement?.unit ?? ""}`;
  }

  const baggageText = extractTextValue(baggageItem?.Text);
  if (baggageText) return baggageText;

  return "0Kg";
}

function mapOfferListToLegacyResults(params: {
  payloadSegments: LegacySegment[];
  selectedOffer: Record<string, unknown>;
  requestedCurrencyCode: string;
  rawResponse: unknown;
}) {
  const source = (params.rawResponse ?? {}) as Record<string, unknown>;
  const offerListResponse =
    (source?.OfferListResponse as Record<string, unknown>) || source;
  const offerListIdentifier = resolveOfferIdentifier(
    getValueByKeys(offerListResponse, [
      "OfferListIdentifier",
      "offerListIdentifier",
      "Identifier",
      "identifier",
      "id",
      "ID",
    ])
  );
  const transactionId = toText(offerListResponse?.transactionId) || "TRAVELPORT-BFP";
  const offers = Array.isArray(offerListResponse?.OfferID)
    ? (offerListResponse.OfferID as Array<Record<string, unknown>>)
    : [];
  const referenceList = Array.isArray(offerListResponse?.ReferenceList)
    ? (offerListResponse.ReferenceList as Array<Record<string, unknown>>)
    : [];
  const amenities =
    referenceList.find((item) => Array.isArray(item?.Amenity))?.Amenity ?? [];
  const universalProductAttributes =
    referenceList.find((item) => Array.isArray(item?.UniversalProductAttribute))
      ?.UniversalProductAttribute ?? [];
  const amenityMap = new Map<string, Record<string, unknown>>(
    (Array.isArray(amenities) ? amenities : [])
      .filter((item) => item && typeof item === "object")
      .map(
        (item) =>
          [
            String((item as Record<string, unknown>).id ?? ""),
            item as Record<string, unknown>,
          ] as [string, Record<string, unknown>]
      )
      .filter(([id]) => Boolean(id))
  );
  const universalProductAttributeMap = new Map<string, Record<string, unknown>>(
    (Array.isArray(universalProductAttributes) ? universalProductAttributes : [])
      .filter((item) => item && typeof item === "object")
      .map(
        (item) =>
          [
            String((item as Record<string, unknown>).id ?? ""),
            item as Record<string, unknown>,
          ] as [string, Record<string, unknown>]
      )
      .filter(([id]) => Boolean(id))
  );

  if (!offers.length) return [];

  const selectedOfferLegs = getArrayByKeys(params.selectedOffer, [
    "AllLegsInfo",
    "allLegsInfo",
  ]) as Array<Record<string, unknown>>;
  const selectedFarePolicyRequest = resolveFarePolicyRequestFromOffer(
    params.selectedOffer
  );

  return offers.map((offer, offerIndex) => {
    const price = (offer?.Price ?? {}) as Record<string, unknown>;
    const currencyCode =
      toText(
        getValueByKeys(price, ["CurrencyCode", "currencyCode", "Currency"]) &&
          (getValueByKeys(price, ["CurrencyCode", "currencyCode", "Currency"]) as any)
            ?.value
      ) ||
      toText(getValueByKeys(price, ["CurrencyCode", "currencyCode", "Currency"])) ||
      normalizeCurrencyCode(params.requestedCurrencyCode) ||
      toText(getValueByKeys(params.selectedOffer, ["CurrencyCode", "currencyCode"])) ||
      "USD";

    const termsList = Array.isArray(offer?.TermsAndConditionsFull)
      ? (offer.TermsAndConditionsFull as Array<Record<string, unknown>>)
      : [];
    const terms = (termsList[0] ?? {}) as Record<string, unknown>;
    const validatingAirline = Array.isArray(terms?.ValidatingAirline)
      ? (terms.ValidatingAirline as Array<Record<string, unknown>>)[0]
      : null;

    const productList = Array.isArray(offer?.Product)
      ? (offer.Product as Array<Record<string, unknown>>)
      : [];

    const allLegsInfo = productList.map((product, legIndex) => {
      const productSegments = Array.isArray(product?.FlightSegment)
        ? (product.FlightSegment as Array<Record<string, unknown>>)
        : [];

      const passengerFlights = Array.isArray(product?.PassengerFlight)
        ? (product.PassengerFlight as Array<Record<string, unknown>>)
        : [];

      const segmentFlightProductMap = new Map<number, Record<string, unknown>>();
      for (const passengerFlight of passengerFlights) {
        const flightProducts = Array.isArray(passengerFlight?.FlightProduct)
          ? (passengerFlight.FlightProduct as Array<Record<string, unknown>>)
          : [];
        for (const flightProduct of flightProducts) {
          const segmentSequences = Array.isArray(flightProduct?.segmentSequence)
            ? (flightProduct.segmentSequence as Array<number>)
            : [];
          if (!segmentSequences.length) {
            if (!segmentFlightProductMap.has(1)) {
              segmentFlightProductMap.set(1, flightProduct);
            }
            continue;
          }
          for (const sequence of segmentSequences) {
            segmentFlightProductMap.set(toNumber(sequence, 0), flightProduct);
          }
        }
      }

      const mappedSegments = productSegments.map((segment, segmentIndex) => {
        const flight = (segment?.Flight ?? {}) as Record<string, unknown>;
        const departure = (flight?.Departure ?? {}) as Record<string, unknown>;
        const arrival = (flight?.Arrival ?? {}) as Record<string, unknown>;
        const sequence = toNumber(segment?.sequence, segmentIndex + 1);
        const flightProduct =
          segmentFlightProductMap.get(sequence) || segmentFlightProductMap.get(1) || {};
        const amenityRefs = Array.isArray((segment as any)?.amenityRefs)
          ? (segment as any).amenityRefs.map((ref: unknown) => String(ref))
          : [];
        const universalAttributeRefs = Array.isArray(
          (segment as any)?.universalProductAttributeRefs
        )
          ? (segment as any).universalProductAttributeRefs.map((ref: unknown) =>
              String(ref)
            )
          : [];

        const refAmenities = amenityRefs
          .map((ref) => amenityMap.get(ref))
          .filter(Boolean)
          .map((item) => toAmenityItem(item));
        const refUniversalAttributes = universalAttributeRefs
          .map((ref) => universalProductAttributeMap.get(ref))
          .filter(Boolean)
          .map((item) => toUniversalProductAttributeItem(item));
        const inlineAmenities = mapInlineAmenityItems(
          (segment as any)?.Amenities?.items ??
            (segment as any)?.Amenities ??
            (segment as any)?.amenities
        );
        const inlineUniversalAttributes = mapInlineUniversalAttributes(
          (segment as any)?.Amenities?.universalProductAttributes ??
            (segment as any)?.universalProductAttributes
        );

        const mappedAmenities = [...refAmenities, ...inlineAmenities];
        const mappedUniversalAttributes = [
          ...refUniversalAttributes,
          ...inlineUniversalAttributes,
        ];

        const amenitiesByCategory = mappedAmenities.reduce(
          (acc, amenity) => {
            const category = String(amenity?.category || "General").trim() || "General";
            if (!acc[category]) {
              acc[category] = [];
            }
            acc[category].push(amenity);
            return acc;
          },
          {} as Record<string, Array<{ id: string; category: string; text: string }>>
        );

        return {
          MarketingCarrier: toText(flight?.carrier),
          MarketingCarrierName: toText(flight?.carrier),
          MarketingFlightNumber: toText(flight?.number),
          OperatingCarrier: toText(flight?.operatingCarrier || flight?.carrier),
          OperatingFlightNumber: toText(flight?.number),
          OperatingCarrierName: toText(
            flight?.operatingCarrierName || flight?.operatingCarrier || flight?.carrier
          ),
          DepFrom: toText(departure?.location),
          DepAirPort: toText(departure?.location),
          DepLocation: toText(departure?.location),
          DepDateAdjustment: 0,
          DepTime: formatDateTime(departure?.date, departure?.time),
          ArrTo: toText(arrival?.location),
          ArrAirPort: toText(arrival?.location),
          ArrLocation: toText(arrival?.location),
          ArrDateAdjustment: 0,
          ArrTime: formatDateTime(arrival?.date, arrival?.time),
          OperatedBy: toText(flight?.operatingCarrier || flight?.carrier),
          StopCount: 0,
          Duration: parseDurationToMinutes(flight?.duration),
          DurationIso: toText(flight?.duration) || durationMinutesToIso(0),
          ConnectionDuration: 0,
          ConnectionDurationIso: null,
          AircraftTypeName: toText(flight?.equipment),
          Amenities: {
            amenityRefs,
            universalProductAttributeRefs: universalAttributeRefs,
            items: mappedAmenities,
            byCategory: amenitiesByCategory,
            universalProductAttributes: mappedUniversalAttributes,
          },
          DepartureGate: toText(departure?.terminal),
          ArrivalGate: toText(arrival?.terminal),
          HiddenStops: [],
          SegmentCode: {
            bookingCode: toText(flightProduct?.classOfService),
            cabinCode: toText(flightProduct?.cabin) || "Economy",
            seatsAvailable: 0,
            fareBasisCode: toText(flightProduct?.fareBasisCode),
            fareTypeCode: toText(flightProduct?.fareTypeCode),
          },
        };
      });

      const firstSegment = mappedSegments[0] ?? {};
      const lastSegment = mappedSegments[mappedSegments.length - 1] ?? {};
      const selectedLeg = selectedOfferLegs[legIndex] ?? {};

      return {
        DepDate:
          toText((firstSegment as Record<string, unknown>)?.DepTime) ||
          formatDateTime(
            getValueByKeys(selectedLeg, ["DepDate", "departureDate"]),
            "00:00:00"
          ),
        DepFrom:
          toText((firstSegment as Record<string, unknown>)?.DepFrom) ||
          toText(getValueByKeys(selectedLeg, ["DepFrom", "departureFrom"])),
        ArrTo:
          toText((lastSegment as Record<string, unknown>)?.ArrTo) ||
          toText(getValueByKeys(selectedLeg, ["ArrTo", "arrivalTo"])),
        Duration: parseDurationToMinutes(product?.totalDuration),
        TotalDurationISO:
          toText(product?.totalDuration) ||
          durationMinutesToIso(parseDurationToMinutes(product?.totalDuration)),
        BrandName: toText(getValueByKeys(selectedLeg, ["BrandName", "brandName"])) || null,
        BrandCode: toText(getValueByKeys(selectedLeg, ["BrandCode", "brandCode"])) || null,
        BrandFeatures:
          (getValueByKeys(selectedLeg, ["BrandFeatures", "brandFeatures"]) as Record<
            string,
            unknown
          >) || null,
        Segments: mappedSegments,
      };
    });

    const unifiedAmenities = buildUnifiedAmenitiesFromLegs(allLegsInfo);

    const baggageAllowance = Array.isArray(terms?.BaggageAllowance)
      ? (terms.BaggageAllowance as Array<Record<string, unknown>>)
      : [];

    const priceBreakdown = Array.isArray(price?.PriceBreakdown)
      ? (price.PriceBreakdown as Array<Record<string, unknown>>)
      : [];

    const mappedPriceBreakDown = priceBreakdown.map((row) => {
      const requestedPassengerType = toText(row?.requestedPassengerType).toUpperCase();
      const paxAllowances = baggageAllowance.filter((allowance) => {
        const paxCodes = Array.isArray(allowance?.passengerTypeCodes)
          ? allowance.passengerTypeCodes.map((code) => toText(code).toUpperCase())
          : [];
        return paxCodes.length ? paxCodes.includes(requestedPassengerType) : true;
      });

      const checkedAllowance =
        paxAllowances.find((allowance) =>
          toText(allowance?.baggageType).toLowerCase().includes("checked")
        ) || paxAllowances[0];

      return {
        PaxType: mapPaxType(requestedPassengerType),
        CurrencyCode:
          toText((row?.Amount as any)?.CurrencyCode?.value) ||
          toText((row?.Amount as any)?.CurrencyCode) ||
          normalizeCurrencyCode(params.requestedCurrencyCode) ||
          currencyCode,
        BaseFare: toNumber((row?.Amount as any)?.Base, 0),
        Taxes: toNumber((row?.Amount as any)?.Taxes?.TotalTaxes, 0),
        ServiceFee: 0,
        OtherCharges: 0,
        TotalFare: toNumber((row?.Amount as any)?.Total, 0),
        PaxCount: toNumber(row?.quantity, 1),
        Bag: [
          {
            Airline:
              toText(validatingAirline?.ValidatingAirline) ||
              toText(allLegsInfo[0]?.Segments?.[0]?.MarketingCarrier),
            Allowance: checkedAllowance
              ? findBaggageAllowanceText(checkedAllowance)
              : "0Kg",
          },
        ],
        FareComponent: [],
      };
    });

    const penalties = Array.isArray(terms?.Penalties) ? terms.Penalties : [];
    const penaltiesCancellation = mapPenaltiesCancellationFromTerms(penalties as any[]);
    const refundable = penaltiesCancellation.cancel.length > 0;

    const grossFare = toNumber(price?.TotalPrice, 0);
    const selectedNetFare = toNumber(
      getValueByKeys(params.selectedOffer, ["NetFare", "netFare", "GrossFare", "grossFare"]),
      0
    );
    const fareChanged =
      selectedNetFare > 0 && grossFare > 0 && Math.abs(grossFare - selectedNetFare) > 0.01;

    const selectedResultId = toText(
      getValueByKeys(params.selectedOffer, ["ResultId", "resultId", "identifier", "Identifier"])
    );
    const selectedSearchId = toText(
      getValueByKeys(params.selectedOffer, ["SearchId", "searchId", "transactionId"])
    );
    const buildOfferIdentifier = resolveOfferIdentifier(
      getValueByKeys(offer, [
        "Identifier",
        "identifier",
        "OfferIdentifier",
        "offerIdentifier",
        "id",
      ])
    );
    const selectedOfferIdentifier = resolveOfferIdentifier(
      getValueByKeys(params.selectedOffer, [
        "offerIdentifier",
        "OfferIdentifier",
        "Identifier",
        "identifier",
        "ResultId",
      ])
    );
    const resolvedOfferIdentifier =
      buildOfferIdentifier || selectedOfferIdentifier || selectedResultId;
    const seatOfferIdentifier = buildOfferIdentifier || resolvedOfferIdentifier;
    const seatProductIdentifiers = resolveProductIdentifiers(offer);

    return {
      System: "travelport",
      ResultId: selectedResultId
        ? `${selectedResultId}_${offerIndex + 1}`
        : `BFP_${offerIndex + 1}`,
      SearchId: selectedSearchId || transactionId || "TRAVELPORT-BFP",
      InstantPayment: false,
      IsBookable: true,
      TripType: allLegsInfo.length > 1 ? "Return" : "Oneway",
      FareType: "PublicFare",
      Carrier:
        toText(validatingAirline?.ValidatingAirline) ||
        toText(allLegsInfo[0]?.Segments?.[0]?.MarketingCarrier),
      CarrierName:
        toText(validatingAirline?.ValidatingAirline) ||
        toText(allLegsInfo[0]?.Segments?.[0]?.MarketingCarrier),
      CurrencyCode: currencyCode,
      BaseFare: toNumber(price?.Base, 0),
      Taxes: toNumber(price?.TotalTaxes, 0),
      SerViceFee: 0,
      NetFare: grossFare,
      GrossFare: grossFare,
      PartialOption: false,
      PartialFare: 0,
      TimeLimit: toText(terms?.PaymentTimeLimit) || null,
      Refundable: refundable,
      amenities: unifiedAmenities,
      penaltiesCancellation,
      ExtraService: null,
      PriceBreakDown: mappedPriceBreakDown,
      AllLegsInfo: allLegsInfo,
      offerIdentifier: resolvedOfferIdentifier,
      OfferIdentifier: resolvedOfferIdentifier,
      Identifier: resolvedOfferIdentifier
        ? {
            value: resolvedOfferIdentifier,
          }
        : null,
      farePolicyRequest: selectedFarePolicyRequest,
      seatAvailabilityRequest:
        offerListIdentifier && seatOfferIdentifier && seatProductIdentifiers.length > 0
          ? {
              offerListIdentifier,
              offerIdentifier: seatOfferIdentifier,
              productIdentifiers: seatProductIdentifiers,
            }
          : null,
      RePriceStatus: fareChanged ? "PriceChanged" : "Success",
      sourceBuildFromProducts: true,
    };
  });
}

function resolveBuildFromProductsUrl(version: string): string {
  const directUrl =
    process.env.TRAVELPORT_BUILD_FROM_PRODUCTS_URL ||
    process.env.TRAVELPORT_BUILD_FROM_PRODUCTS ||
    "";
  if (directUrl.trim()) {
    return directUrl.trim();
  }

  const baseUrl = process.env.TRAVELPORT_BASE_URL || "https://api.pp.travelport.net";
  const normalizedBase = baseUrl.replace(/\/+$/, "");

  if (/\/\d+$/.test(normalizedBase)) {
    return `${normalizedBase}/air/price/offers/buildfromproducts`;
  }

  return `${normalizedBase}/${version}/air/price/offers/buildfromproducts`;
}

async function createToken(): Promise<string> {
  return getTravelportAccessToken();
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
    const body = (req.body ?? {}) as BuildFromProductsBody;
    const requestedCurrencyCode = normalizeCurrencyCode(
      body?.currencyCode ||
        body?.currency ||
        process.env.TRAVELPORT_BUILD_FROM_PRODUCTS_CURRENCY ||
        process.env.TRAVELPORT_DEFAULT_CURRENCY ||
        "USD"
    );
    const selectedOffer = resolveOffer(body);
    if (!Object.keys(selectedOffer).length) {
      return res.status(400).json({ message: "selectedOffer is required" });
    }

    const payloadSegments = buildPayloadSegments(selectedOffer);
    if (!payloadSegments.length) {
      return res
        .status(400)
        .json({ message: "selectedOffer does not contain flight segments" });
    }

    const requestPayload = buildBuildFromProductsPayload(
      selectedOffer,
      body,
      requestedCurrencyCode
    );
    const accessToken = await createToken();
    const accessGroup = getRequiredEnv("TRAVELPORT_ACCESS_GROUP");
    const version = process.env.TRAVELPORT_VERSION || "11";
    const buildFromProductsUrl = resolveBuildFromProductsUrl(version);

    const response = await fetch(buildFromProductsUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        XAUTH_TRAVELPORT_ACCESSGROUP: accessGroup,
        "Accept-Version": version,
        "Content-Version": version,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestPayload),
    });

    const responsePayload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(502).json({
        message: `Travelport build-from-products failed (${response.status})`,
        details:
          responsePayload?.message ||
          responsePayload?.error_description ||
          "Unable to build priced offer from selected products.",
      });
    }

    const mapped = mapOfferListToLegacyResults({
      payloadSegments: payloadSegments as LegacySegment[],
      selectedOffer,
      requestedCurrencyCode,
      rawResponse: responsePayload,
    });

    if (mapped.length > 0) {
      return res.status(200).json(mapped);
    }

    const fallbackResultId = toText(
      getValueByKeys(selectedOffer, ["ResultId", "resultId", "identifier"])
    );
    const fallbackSearchId = toText(
      getValueByKeys(selectedOffer, ["SearchId", "searchId", "transactionId"])
    );

    return res.status(200).json([
      {
        ...selectedOffer,
        ResultId: fallbackResultId || "BFP_1",
        offerIdentifier:
          toText(
            getValueByKeys(selectedOffer, [
              "offerIdentifier",
              "OfferIdentifier",
              "identifier",
              "Identifier",
              "ResultId",
            ])
          ) || fallbackResultId,
        SearchId: fallbackSearchId || "TRAVELPORT-BFP",
        RePriceStatus: "Success",
        sourceBuildFromProducts: true,
        sourceBuildFromProductsFallback: true,
      },
    ]);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return res.status(500).json({ message });
  }
}
