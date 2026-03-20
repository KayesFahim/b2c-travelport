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
  if (port !== "3001") {
    return "";
  }

  return `${protocol}//${hostname}:3000${TRAVELPORT_SEARCH_PATH}`;
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

async function getResponseErrorMessage(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => ({}));
    return (
      payload?.message ||
      payload?.details ||
      `Travelport search failed (${response.status})`
    );
  }

  const text = await response.text().catch(() => "");
  return text || `Travelport search failed (${response.status})`;
}

export async function searchTravelportFlights(payload, token) {
  const urls = getCandidateSearchUrls();
  let lastError = new Error("Travelport search route is not reachable");

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
        const data = await response.json();
        persistLastSearchInBrowser({
          url,
          requestPayload: payload,
          responsePayload: data,
        });
        return data;
      }

      const message = await getResponseErrorMessage(response);
      const currentError = new Error(message);

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
