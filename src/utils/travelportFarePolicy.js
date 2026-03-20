const TRAVELPORT_FARE_POLICY_PATH = "/api/travelport/fare-policy";
const LEGACY_PREBOOKING_PATHS = [
  "/flights/api2/preBookingFares",
  "/flights/api2/preBookingFareRules",
  "/flights/api2/prebookingfare",
  "/flights/api2/fareRules",
];

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
  fareRuleType = "Structured",
  token,
}) {
  const urls = getCandidateFarePolicyUrls();
  let lastError = new Error("Travelport fare policy route is not reachable");

  const payload = {
    SearchId: searchId,
    ResultId: resultId,
    offerIdentifier: offerIdentifier || resultId,
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
