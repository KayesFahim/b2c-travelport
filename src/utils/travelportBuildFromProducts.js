const TRAVELPORT_BUILD_FROM_PRODUCTS_PATH = "/api/travelport/build-from-products";
const DEFAULT_BUILD_FROM_PRODUCTS_CURRENCY = "USD";

function joinBaseAndPath(baseUrl, path) {
  const base = String(baseUrl || "").trim();
  if (!base) {
    return "";
  }
  return `${base.replace(/\/+$/, "")}${path}`;
}

function getConfiguredBuildFromProductsUrl() {
  if (typeof process === "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_TRAVELPORT_BUILD_FROM_PRODUCTS_URL || "";
}

function getConfiguredBaseUrl() {
  if (typeof process === "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || "";
}

function getLocalFallbackBuildFromProductsUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  const { protocol, hostname, port } = window.location;
  if (port === "3001") {
    return `${protocol}//${hostname}:3000${TRAVELPORT_BUILD_FROM_PRODUCTS_PATH}`;
  }
  if (port === "3000") {
    return `${protocol}//${hostname}:3001${TRAVELPORT_BUILD_FROM_PRODUCTS_PATH}`;
  }
  return "";
}

function getCandidateBuildFromProductsUrls() {
  const configuredUrl = getConfiguredBuildFromProductsUrl();
  const localFallbackUrl = getLocalFallbackBuildFromProductsUrl();
  const configuredBaseUrl = getConfiguredBaseUrl();

  const urls = [
    configuredUrl,
    TRAVELPORT_BUILD_FROM_PRODUCTS_PATH,
    joinBaseAndPath(configuredBaseUrl, TRAVELPORT_BUILD_FROM_PRODUCTS_PATH),
    localFallbackUrl,
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
      `Travelport build-from-products failed (${response.status})`
    );
  }

  const text = await response.text().catch(() => "");
  return text || `Travelport build-from-products failed (${response.status})`;
}

export async function fetchTravelportBuildFromProducts({
  selectedOffer,
  token,
  adultCount,
  childCount,
  infantCount,
}) {
  const urls = getCandidateBuildFromProductsUrls();
  let lastError = new Error("Travelport build-from-products route is not reachable");

  const payload = {
    selectedOffer,
    currencyCode: DEFAULT_BUILD_FROM_PRODUCTS_CURRENCY,
    adultCount,
    childCount,
    infantCount,
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
          : new Error("Travelport build-from-products request failed");
    }
  }

  throw lastError;
}
