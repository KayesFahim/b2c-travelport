const TRAVELPORT_FARE_POLICY_PATH = "/api/travelport/fare-policy";
const LEGACY_PREBOOKING_PATHS = [
  "/flights/api2/preBookingFares",
  "/flights/api2/preBookingFareRules",
  "/flights/api2/prebookingfare",
  "/flights/api2/fareRules",
];

function normalizeIdentifier(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeIdentifier(item);
      if (normalized) return normalized;
    }
    return "";
  }
  if (typeof value === "object") {
    return (
      normalizeIdentifier(value.value) ||
      normalizeIdentifier(value.Value) ||
      normalizeIdentifier(value.id) ||
      normalizeIdentifier(value.ID) ||
      normalizeIdentifier(value.code) ||
      normalizeIdentifier(value.Code) ||
      normalizeIdentifier(value.offerIdentifier) ||
      normalizeIdentifier(value.OfferIdentifier) ||
      normalizeIdentifier(value.identifier) ||
      normalizeIdentifier(value.Identifier) ||
      ""
    );
  }
  return "";
}

function joinBaseAndPath(baseUrl, path) {
  const base = String(baseUrl || "").trim();
  if (!base) {
    return "";
  }
  return `${base.replace(/\/+$/, "")}${path}`;
}

function getConfiguredFarePolicyUrl() {
  if (typeof process === "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_TRAVELPORT_FARE_POLICY_URL || "";
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

function getLocalFallbackFarePolicyUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  const { protocol, hostname, port } = window.location;
  if (port !== "3001") {
    return "";
  }

  return `${protocol}//${hostname}:3000${TRAVELPORT_FARE_POLICY_PATH}`;
}

function getCandidateFarePolicyUrls() {
  const configuredUrl = getConfiguredFarePolicyUrl();
  const localFallbackUrl = getLocalFallbackFarePolicyUrl();
  const configuredBaseUrl = getConfiguredBaseUrl();
  const legacyEnabled = useLegacyFallbackRoutes();
  const legacyUrls = legacyEnabled
    ? LEGACY_PREBOOKING_PATHS.flatMap((path) => [
        joinBaseAndPath(configuredBaseUrl, path),
        path,
      ])
    : [];

  const urls = [
    configuredUrl,
    TRAVELPORT_FARE_POLICY_PATH,
    joinBaseAndPath(configuredBaseUrl, TRAVELPORT_FARE_POLICY_PATH),
    localFallbackUrl,
    ...legacyUrls,
  ].filter(Boolean);

  return Array.from(new Set(urls));
}

async function getResponseErrorMessage(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => ({}));
    return (
      payload?.message ||
      payload?.details ||
      `Travelport fare policy failed (${response.status})`
    );
  }

  const text = await response.text().catch(() => "");
  return text || `Travelport fare policy failed (${response.status})`;
}

export async function fetchTravelportFarePolicy({
  searchId,
  resultId,
  offerIdentifier,
  offerListIdentifier,
  productIdentifiers,
  fareRuleType = "Structured",
  token,
}) {
  const urls = getCandidateFarePolicyUrls();
  let lastError = new Error("Travelport fare policy route is not reachable");

  const normalizedResultId = normalizeIdentifier(resultId);
  const normalizedOfferIdentifier = normalizeIdentifier(offerIdentifier);
  const normalizedOfferListIdentifier = normalizeIdentifier(offerListIdentifier);
  const normalizedProductIdentifiers = Array.isArray(productIdentifiers)
    ? productIdentifiers
        .map((item) => normalizeIdentifier(item))
        .filter(Boolean)
    : [];

  const payload = {
    SearchId: searchId,
    ResultId: normalizedResultId,
    offerIdentifier: normalizedOfferIdentifier || normalizedResultId,
    offerListIdentifier: normalizedOfferListIdentifier,
    productIdentifiers: normalizedProductIdentifiers,
    fareRuleType,
  };

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return response.json();
      }

      const message = await getResponseErrorMessage(response);
      const currentError = new Error(message);

      if (response.status === 404) {
        lastError = currentError;
        continue;
      }

      throw currentError;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error
          : new Error("Travelport fare policy request failed");
    }
  }

  throw lastError;
}

function hasMeaningfulFarePolicy(payload) {
  const fareRules = Array.isArray(payload?.fareRules) ? payload.fareRules : [];
  const penalties = payload?.penaltiesCancellation || {};
  const change = Array.isArray(penalties?.change) ? penalties.change : [];
  const cancel = Array.isArray(penalties?.cancel) ? penalties.cancel : [];
  return fareRules.length > 0 || change.length > 0 || cancel.length > 0;
}

export async function fetchTravelportFarePolicyWithFallback({
  fareRuleTypes = ["LongText", "ShortText", "Structured"],
  ...params
}) {
  const orderedTypes = Array.isArray(fareRuleTypes)
    ? fareRuleTypes.map((item) => String(item || "").trim()).filter(Boolean)
    : ["LongText", "ShortText", "Structured"];

  const uniqueTypes = Array.from(new Set(orderedTypes));
  if (!uniqueTypes.length) {
    uniqueTypes.push("LongText", "ShortText", "Structured");
  }

  let lastError = null;

  for (let index = 0; index < uniqueTypes.length; index += 1) {
    const fareRuleType = uniqueTypes[index];
    try {
      const payload = await fetchTravelportFarePolicy({
        ...params,
        fareRuleType,
      });

      if (
        hasMeaningfulFarePolicy(payload) ||
        index === uniqueTypes.length - 1
      ) {
        return payload;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Fare policy request failed");
    }
  }

  throw lastError || new Error("Fare policy not available");
}
