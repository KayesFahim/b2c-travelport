import { fetchWithTimeout, readApiResponse } from "./apiClient";
const TRAVELPORT_PRICE_CHECK_PATH = "/api/travelport/price-check";
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
  return (
    process.env.NEXT_PUBLIC_TRAVELPORT_PRICE_CHECK_URL ||
    process.env.NEXT_PUBLIC_TRAVELPORT_BUILD_FROM_PRODUCTS_URL ||
    ""
  );
}

function getConfiguredBaseUrl() {
  if (typeof process === "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || "";
}


function getCandidateBuildFromProductsUrls() {
  const configuredUrl = getConfiguredBuildFromProductsUrl();
  const configuredBaseUrl = getConfiguredBaseUrl();

  const urls = [
    TRAVELPORT_PRICE_CHECK_PATH,
    configuredUrl,
    joinBaseAndPath(configuredBaseUrl, TRAVELPORT_PRICE_CHECK_PATH),

  ].filter(Boolean);

  return Array.from(new Set(urls));
}

async function getResponseErrorMessage(response) {
  try { await readApiResponse(response); }
  catch (error) { return error.message; }
  return "The request could not be completed.";
}

export async function fetchTravelportBuildFromProducts({
  selectedOffer,
  token,
  adultCount,
  childCount,
  infantCount,
  currencyCode,
}) {
  const urls = getCandidateBuildFromProductsUrls();
  let lastError = null;
  const resolvedCurrencyCode =
    String(
      currencyCode ||
        selectedOffer?.CurrencyCode ||
        selectedOffer?.currencyCode ||
        DEFAULT_BUILD_FROM_PRODUCTS_CURRENCY
    )
      .trim()
      .toUpperCase() || DEFAULT_BUILD_FROM_PRODUCTS_CURRENCY;

  const payload = {
    selectedOffer,
    currencyCode: resolvedCurrencyCode,
    adultCount,
    childCount,
    infantCount,
  };

  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(payload),
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
          : new Error("Travelport build-from-products request failed");
      continue;
    }
  }

  throw lastError || new Error("The fare could not be verified. Please search again.");
}
