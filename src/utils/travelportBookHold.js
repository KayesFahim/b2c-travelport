const TRAVELPORT_BOOK_HOLD_PATH = "/api/travelport/book-hold";

function joinBaseAndPath(baseUrl, path) {
  const base = String(baseUrl || "").trim();
  if (!base) return "";
  return `${base.replace(/\/+$/, "")}${path}`;
}

function getConfiguredBookHoldUrl() {
  if (typeof process === "undefined") return "";
  return process.env.NEXT_PUBLIC_TRAVELPORT_BOOK_HOLD_URL || "";
}

function getConfiguredBaseUrl() {
  if (typeof process === "undefined") return "";
  return process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || "";
}

function getLocalFallbackBookHoldUrl() {
  if (typeof window === "undefined") return "";
  const { protocol, hostname, port } = window.location;
  if (port === "3001") {
    return `${protocol}//${hostname}:3000${TRAVELPORT_BOOK_HOLD_PATH}`;
  }
  if (port === "3000") {
    return `${protocol}//${hostname}:3001${TRAVELPORT_BOOK_HOLD_PATH}`;
  }
  return "";
}

function getCandidateBookHoldUrls() {
  const configuredUrl = getConfiguredBookHoldUrl();
  const configuredBaseUrl = getConfiguredBaseUrl();
  const localFallbackUrl = getLocalFallbackBookHoldUrl();

  return Array.from(
    new Set(
      [
        configuredUrl,
        TRAVELPORT_BOOK_HOLD_PATH,
        joinBaseAndPath(configuredBaseUrl, TRAVELPORT_BOOK_HOLD_PATH),
        localFallbackUrl,
      ].filter(Boolean)
    )
  );
}

async function getResponseErrorPayload(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => ({}));
    return {
      message:
        payload?.message ||
        payload?.details ||
        `Travelport book-hold failed (${response.status})`,
      payload,
      requiresLogin: Boolean(payload?.requiresLogin),
    };
  }

  const text = await response.text().catch(() => "");
  return {
    message: text || `Travelport book-hold failed (${response.status})`,
    payload: {},
    requiresLogin: false,
  };
}

export async function createTravelportBookHold({
  selectedAirPrice,
  selectedOffer,
  passengers = [],
  seatSelections = [],
  ancillarySelections = [],
  adultCount = 0,
  childCount = 0,
  infantCount = 0,
  reservationId = "",
  bookingFlowKey = "",
  bookingOfferKey = "",
  bookingFlowExpiresAt = 0,
  commit = true,
  commitOnly = false,
  token = "",
}) {
  const urls = getCandidateBookHoldUrls();
  let lastError = new Error("Travelport book-hold route is not reachable");

  const payload = {
    selectedAirPrice,
    selectedOffer,
    passengers,
    seatSelections,
    ancillarySelections,
    adultCount,
    childCount,
    infantCount,
    reservationId,
    bookingFlowKey,
    bookingOfferKey,
    bookingFlowExpiresAt,
    commit,
    commitOnly,
  };

  for (const url of urls) {
    try {
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        return response.json();
      }

      const errorPayload = await getResponseErrorPayload(response);
      const currentError = new Error(errorPayload.message);
      currentError.status = response.status;
      currentError.requiresLogin =
        errorPayload.requiresLogin || response.status === 401;
      currentError.payload = errorPayload.payload;
      if (response.status === 404) {
        lastError = currentError;
        continue;
      }
      throw currentError;
    } catch (error) {
      const status = Number(error?.status);
      if (Number.isFinite(status) && status !== 404) {
        throw error;
      }
      lastError =
        error instanceof Error
          ? error
          : new Error("Travelport book-hold request failed");
    }
  }

  throw lastError;
}

export async function prepareTravelportBookHold(params = {}) {
  return createTravelportBookHold({
    ...params,
    commit: false,
    commitOnly: false,
  });
}

export async function commitTravelportBookHold({
  reservationId,
  bookingFlowKey = "",
  bookingOfferKey = "",
  bookingFlowExpiresAt = 0,
  token = "",
}) {
  return createTravelportBookHold({
    reservationId,
    bookingFlowKey,
    bookingOfferKey,
    bookingFlowExpiresAt,
    commit: true,
    commitOnly: true,
    token,
  });
}
