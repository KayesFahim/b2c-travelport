import airlinesData from "../data/airlines";

export const TRAVELPORT_CONTENT_SOURCES = ["GDS", "NDC"];

export const CONNECTION_TYPE_OPTIONS = [
  { value: "Any", label: "Any Stops", hint: "All routings" },
  { value: "NonStopDirect", label: "Non-Stop", hint: "Direct without stops" },
  { value: "StopDirect", label: "Direct w/ Stop", hint: "Same flight number" },
  { value: "SingleConnection", label: "Max 1 Stop", hint: "Single connection" },
  { value: "DoubleConnection", label: "Max 2 Stops", hint: "Double connection" },
];

export const CARRIER_PREFERENCE_OPTIONS = [
  { value: "Permitted", label: "Only Selected", hint: "Restrict to checked airlines" },
  { value: "Preferred", label: "Prefer Selected", hint: "Prioritize checked airlines" },
  { value: "Prohibited", label: "Exclude Selected", hint: "Block checked airlines" },
];

export const CABIN_PREFERENCE_OPTIONS = [
  { value: "Permitted", label: "Exact Cabin Only" },
  { value: "Preferred", label: "Preferred (Or Lower)" },
  { value: "PreferredWithUpgrade", label: "Preferred + Upgrade" },
];

export const FARE_TYPE_OPTIONS = [
  { value: "", label: "All Fares (Default)" },
  { value: "PublicFaresOnly", label: "Public Fares Only" },
  { value: "PrivateFaresOnly", label: "Private / Contract Fares" },
  { value: "PublicAndPrivateFares", label: "Public & Private Fares" },
];

export const MAX_CONNECTION_DURATION_OPTIONS = [
  { value: "", label: "No Layover Cap" },
  { value: "PT2H", label: "Up to 2 hours" },
  { value: "PT4H", label: "Up to 4 hours" },
  { value: "PT6H", label: "Up to 6 hours" },
  { value: "PT8H", label: "Up to 8 hours" },
  { value: "PT12H", label: "Up to 12 hours" },
];

export const MAX_OVERNIGHT_DURATION_OPTIONS = [
  { value: "", label: "No Overnight Cap" },
  { value: "PT6H", label: "Max 6h overnight" },
  { value: "PT8H", label: "Max 8h overnight" },
  { value: "PT12H", label: "Max 12h overnight" },
];

export const UPSELL_COUNT_OPTIONS = [
  { value: "", label: "Server Default" },
  { value: "0", label: "0 (Lowest fare only)" },
  { value: "2", label: "Up to 2 upsells" },
  { value: "4", label: "Up to 4 upsells (GDS max)" },
];

export const CURRENCY_OPTIONS = [
  { value: "", label: "Default (USD)" },
  { value: "USD", label: "USD ($)" },
  { value: "BDT", label: "BDT (৳)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "AED", label: "AED" },
  { value: "SAR", label: "SAR" },
  { value: "MYR", label: "MYR" },
  { value: "SGD", label: "SGD" },
];

export const POPULAR_AIRLINE_OPTIONS = Array.isArray(airlinesData) ? airlinesData : [];

export function getDefaultContentSources() {
  if (
    typeof process !== "undefined" &&
    String(process.env.NEXT_PUBLIC_TRAVELPORT_GDS_ONLY || "")
      .trim()
      .toLowerCase() === "false"
  ) {
    return ["GDS", "NDC"];
  }
  return ["GDS"];
}

export function createDefaultTravelportSearchFilters(overrides = {}) {
  const defaultSources = getDefaultContentSources();
  return normalizeTravelportSearchFilters({
    contentSources: defaultSources,
    carrierPreferenceType: "Permitted",
    carriers: [],
    connectionType: "Any",
    maxConnectionDuration: "",
    maxOvernightDuration: "",
    prohibitChangeOfAirportInd: false,
    excludeInterlineConnectionsInd: false,
    excludeGroundTrain: false,
    cabinPreferenceType: "Permitted",
    fareType: "",
    refundableOnlyInd: false,
    prohibitMinStayFaresInd: false,
    prohibitMaxStayFaresInd: false,
    prohibitAdvancePurchaseFaresInd: false,
    promotionalCode: "",
    promotionalCodeSupplier: "",
    currencyCode: "",
    returnBrandedFaresInd: true,
    maxNumberOfUpsellsToReturn: "",
    excludeBaggageFeesInd: true,
    ...overrides,
  });
}

export function normalizeContentSourcesList(value, fallback = ["GDS"]) {
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  const normalized = Array.from(
    new Set(
      list
        .map((item) => String(item || "").trim().toUpperCase())
        .filter((item) => item === "GDS" || item === "NDC")
    )
  );
  return normalized.length ? normalized : fallback;
}

export function normalizeCarrierCodes(value) {
  const list = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\s,;]+/)
      : [];
  return Array.from(
    new Set(
      list
        .map((code) => String(code || "").trim().toUpperCase())
        .filter((code) => /^[A-Z0-9]{2}$/.test(code))
    )
  );
}

export function normalizeTravelportSearchFilters(input = {}) {
  const source = input && typeof input === "object" ? input : {};
  const defaultSources = getDefaultContentSources();

  const contentSources = normalizeContentSourcesList(
    source.contentSources ?? source.contentSourceList,
    defaultSources
  );

  const carrierPreferenceType = ["Permitted", "Preferred", "Prohibited", "Only"].includes(
    String(source.carrierPreferenceType || "").trim()
  )
    ? String(source.carrierPreferenceType).trim()
    : "Permitted";

  const connectionType = [
    "Any",
    "NonStopDirect",
    "StopDirect",
    "SingleConnection",
    "DoubleConnection",
  ].includes(String(source.connectionType || "").trim())
    ? String(source.connectionType).trim()
    : "Any";

  const cabinPreferenceType = ["Permitted", "Preferred", "PreferredWithUpgrade"].includes(
    String(source.cabinPreferenceType || "").trim()
  )
    ? String(source.cabinPreferenceType).trim()
    : "Permitted";

  const fareType = [
    "",
    "PublicFaresOnly",
    "PrivateFaresOnly",
    "PublicAndPrivateFares",
  ].includes(String(source.fareType || "").trim())
    ? String(source.fareType || "").trim()
    : "";

  return {
    contentSources,
    carrierPreferenceType,
    carriers: normalizeCarrierCodes(source.carriers),
    connectionType,
    maxConnectionDuration: String(source.maxConnectionDuration || "").trim(),
    maxOvernightDuration: String(source.maxOvernightDuration || "").trim(),
    prohibitChangeOfAirportInd: Boolean(source.prohibitChangeOfAirportInd),
    excludeInterlineConnectionsInd: Boolean(source.excludeInterlineConnectionsInd),
    excludeGroundTrain: Boolean(source.excludeGroundTrain),
    cabinPreferenceType,
    fareType,
    refundableOnlyInd: Boolean(source.refundableOnlyInd),
    prohibitMinStayFaresInd: Boolean(source.prohibitMinStayFaresInd),
    prohibitMaxStayFaresInd: Boolean(source.prohibitMaxStayFaresInd),
    prohibitAdvancePurchaseFaresInd: Boolean(source.prohibitAdvancePurchaseFaresInd),
    promotionalCode: String(source.promotionalCode || "")
      .trim()
      .toUpperCase()
      .slice(0, 24),
    promotionalCodeSupplier: String(source.promotionalCodeSupplier || "")
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 2),
    currencyCode: String(source.currencyCode || "").trim().toUpperCase(),
    returnBrandedFaresInd: source.returnBrandedFaresInd !== false,
    maxNumberOfUpsellsToReturn: String(source.maxNumberOfUpsellsToReturn ?? "").trim(),
    excludeBaggageFeesInd: source.excludeBaggageFeesInd !== false,
  };
}

export function buildTravelportSearchRequestModifiers(filtersInput) {
  const filters = normalizeTravelportSearchFilters(filtersInput);
  return {
    contentSourceList: filters.contentSources,
    searchFilters: {
      carrierPreferenceType: filters.carrierPreferenceType,
      carriers: filters.carriers,
      connectionType: filters.connectionType,
      maxConnectionDuration: filters.maxConnectionDuration,
      maxOvernightDuration: filters.maxOvernightDuration,
      prohibitChangeOfAirportInd: filters.prohibitChangeOfAirportInd,
      excludeInterlineConnectionsInd: filters.excludeInterlineConnectionsInd,
      excludeGround: filters.excludeGroundTrain ? "Train" : "",
      cabinPreferenceType: filters.cabinPreferenceType,
      fareType: filters.fareType,
      refundableOnlyInd: filters.refundableOnlyInd,
      prohibitMinStayFaresInd: filters.prohibitMinStayFaresInd,
      prohibitMaxStayFaresInd: filters.prohibitMaxStayFaresInd,
      prohibitAdvancePurchaseFaresInd: filters.prohibitAdvancePurchaseFaresInd,
      promotionalCode: filters.promotionalCode,
      promotionalCodeSupplier: filters.promotionalCodeSupplier,
      returnBrandedFaresInd: filters.returnBrandedFaresInd,
      ...(filters.maxNumberOfUpsellsToReturn !== ""
        ? { maxNumberOfUpsellsToReturn: Number(filters.maxNumberOfUpsellsToReturn) }
        : {}),
      excludeBaggageFeesInd: filters.excludeBaggageFeesInd,
    },
    ...(filters.currencyCode ? { currencyCode: filters.currencyCode } : {}),
  };
}

export function countActiveTravelportFilters(filtersInput) {
  const f = normalizeTravelportSearchFilters(filtersInput);
  let count = 0;
  const defaultSources = getDefaultContentSources();
  if (
    f.contentSources.length !== defaultSources.length ||
    f.contentSources.some((src) => !defaultSources.includes(src))
  ) {
    count += 1;
  }
  if (f.carriers.length > 0) count += 1;
  if (f.connectionType !== "Any") count += 1;
  if (f.maxConnectionDuration) count += 1;
  if (f.maxOvernightDuration) count += 1;
  if (f.prohibitChangeOfAirportInd) count += 1;
  if (f.excludeInterlineConnectionsInd) count += 1;
  if (f.excludeGroundTrain) count += 1;
  if (f.cabinPreferenceType !== "Permitted") count += 1;
  if (f.fareType) count += 1;
  if (f.refundableOnlyInd) count += 1;
  if (f.prohibitMinStayFaresInd) count += 1;
  if (f.prohibitMaxStayFaresInd) count += 1;
  if (f.prohibitAdvancePurchaseFaresInd) count += 1;
  if (f.promotionalCode) count += 1;
  if (f.promotionalCodeSupplier) count += 1;
  if (f.currencyCode) count += 1;
  if (!f.returnBrandedFaresInd) count += 1;
  if (f.maxNumberOfUpsellsToReturn !== "") count += 1;
  if (!f.excludeBaggageFeesInd) count += 1;
  return count;
}

export function formatContentSourceSummary(contentSources) {
  const list = normalizeContentSourcesList(contentSources, ["GDS"]);
  if (list.includes("GDS") && list.includes("NDC")) return "GDS + NDC";
  return list.join(", ");
}
