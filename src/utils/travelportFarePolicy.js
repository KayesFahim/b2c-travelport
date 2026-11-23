import { fetchWithTimeout, readApiResponse } from "./apiClient";
const TRAVELPORT_FARE_POLICY_PATH = "/api/travelport/fare-policy";
const inFlightFarePolicyRequests = new Map();
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

function shouldUseLegacyFallbackRoutes() {
  if (typeof process === "undefined") {
    return false;
  }
  return (
    String(process.env.NEXT_PUBLIC_TRAVELPORT_ENABLE_LEGACY_FALLBACK || "")
      .trim()
      .toLowerCase() === "true"
  );
}


function getCandidateFarePolicyUrls() {
  const configuredUrl = getConfiguredFarePolicyUrl();
  const configuredBaseUrl = getConfiguredBaseUrl();
  const legacyEnabled = shouldUseLegacyFallbackRoutes();
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

    ...legacyUrls,
  ].filter(Boolean);

  return Array.from(new Set(urls));
}

async function getResponseErrorMessage(response) {
  try { await readApiResponse(response); }
  catch (error) { return error.message; }
  return "The request could not be completed.";
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

  const requestKey = JSON.stringify(payload);
  if (inFlightFarePolicyRequests.has(requestKey)) {
    return inFlightFarePolicyRequests.get(requestKey);
  }

  const executeRequest = (async () => {
    for (const url of urls) {
      try {
        const response = await fetchWithTimeout(url, {
          method: "POST",
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: requestKey,
        });

        if (response.ok) {
          return readApiResponse(response);
        }

        const message = await getResponseErrorMessage(response);
        const currentError = new Error(message);
        currentError.status = response.status;

        if (response.status === 404) {
          lastError = currentError;
          continue;
        }

        throw currentError;
      } catch (error) {
        if (Number(error?.status) !== 404) throw error;
        lastError =
          error instanceof Error
            ? error
            : new Error("Travelport fare policy request failed");
      }
    }

    throw lastError;
  })();

  inFlightFarePolicyRequests.set(requestKey, executeRequest);
  try {
    return await executeRequest;
  } finally {
    inFlightFarePolicyRequests.delete(requestKey);
  }
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
      if (Number(error?.status) !== 404) throw error;
      if ([401, 403, 429].includes(error?.status) || error?.status >= 500 || !error?.status) throw error;
      lastError = error instanceof Error ? error : new Error("Fare policy request failed");
    }
  }

  throw lastError || new Error("Fare policy not available");
}
