import { fetchWithTimeout, readApiResponse } from "./apiClient";
const TRAVELPORT_ANCILLARY_SHOP_PATH = "/api/travelport/ancillary-shop";

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
      normalizeIdentifier(value.identifier) ||
      normalizeIdentifier(value.Identifier) ||
      normalizeIdentifier(value.offerIdentifier) ||
      normalizeIdentifier(value.OfferIdentifier) ||
      ""
    );
  }
  return "";
}

function normalizeIdentifierList(value) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((item) => normalizeIdentifier(item)).filter(Boolean))
    );
  }
  const single = normalizeIdentifier(value);
  return single ? [single] : [];
}

function normalizeMode(value) {
  const mode = normalizeIdentifier(value).toLowerCase();
  if (mode === "offer") return "offer";
  if (mode === "offerlist" || mode === "offer_list") return "offerList";
  if (mode === "reservationworkbench" || mode === "reservation_workbench") {
    return "reservationWorkbench";
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

function getConfiguredAncillaryShopUrl() {
  if (typeof process === "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_TRAVELPORT_ANCILLARY_SHOP_URL || "";
}

function getConfiguredBaseUrl() {
  if (typeof process === "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || "";
}


function getCandidateAncillaryShopUrls() {
  const configuredUrl = getConfiguredAncillaryShopUrl();
  const configuredBaseUrl = getConfiguredBaseUrl();

  const urls = [
    configuredUrl,
    TRAVELPORT_ANCILLARY_SHOP_PATH,
    joinBaseAndPath(configuredBaseUrl, TRAVELPORT_ANCILLARY_SHOP_PATH),

  ].filter(Boolean);

  return Array.from(new Set(urls));
}

async function getResponseErrorMessage(response) {
  try { await readApiResponse(response); }
  catch (error) { return error.message; }
  return "The request could not be completed.";
}

export async function fetchTravelportAncillaryShop({
  ancillaryRequest,
  offerListIdentifier,
  offerIdentifier,
  productIdentifiers,
  reservationId,
  mode,
  token,
}) {
  const urls = getCandidateAncillaryShopUrls();
  let lastError = new Error("Travelport ancillary shop route is not reachable");

  const normalizedOfferListIdentifier = normalizeIdentifier(
    offerListIdentifier ?? ancillaryRequest?.offerListIdentifier
  );
  const normalizedOfferIdentifier = normalizeIdentifier(
    offerIdentifier ?? ancillaryRequest?.offerIdentifier
  );
  const normalizedProductIdentifiers = normalizeIdentifierList(
    productIdentifiers ??
      ancillaryRequest?.productIdentifiers ??
      ancillaryRequest?.productIdentifier
  );
  const normalizedReservationId = normalizeIdentifier(
    reservationId ?? ancillaryRequest?.reservationId
  );
  const explicitMode = normalizeMode(mode ?? ancillaryRequest?.mode);
  const gdsOnly =
    String(process.env.NEXT_PUBLIC_TRAVELPORT_GDS_ONLY || "").toLowerCase() ===
    "true";
  const resolvedMode =
    explicitMode ||
    (gdsOnly
      ? "offerList"
      : normalizedReservationId
      ? "reservationWorkbench"
      : normalizedProductIdentifiers.length > 0
        ? "offer"
        : "offerList");

  if (resolvedMode === "reservationWorkbench" && !normalizedReservationId) {
    throw new Error("reservationId is required for reservationWorkbench mode.");
  }

  if (
    resolvedMode === "offer" &&
    (!normalizedProductIdentifiers.length ||
      (!normalizedOfferListIdentifier && !normalizedOfferIdentifier))
  ) {
    throw new Error(
      "offer mode requires productIdentifiers and offerListIdentifier/offerIdentifier."
    );
  }

  if (
    resolvedMode === "offerList" &&
    (!normalizedOfferListIdentifier || !normalizedOfferIdentifier)
  ) {
    throw new Error(
      "offerList mode requires offerListIdentifier and offerIdentifier."
    );
  }

  const payload = {
    mode: resolvedMode,
    ...(normalizedOfferListIdentifier && {
      offerListIdentifier: normalizedOfferListIdentifier,
    }),
    ...(normalizedOfferIdentifier && { offerIdentifier: normalizedOfferIdentifier }),
    ...(normalizedProductIdentifiers.length > 0 && {
      productIdentifiers: normalizedProductIdentifiers,
    }),
    ...(normalizedReservationId && { reservationId: normalizedReservationId }),
  };

  for (const url of urls) {
    try {
      const response = await fetchWithTimeout(url, {
        method: "POST",
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
          : new Error("Travelport ancillary shop request failed");
    }
  }

  throw lastError;
}
