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

async function getResponseErrorMessage(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => ({}));
    return (
      payload?.message ||
      payload?.details ||
      `Travelport book-hold failed (${response.status})`
    );
  }

  const text = await response.text().catch(() => "");
  return text || `Travelport book-hold failed (${response.status})`;
}

export async function createTravelportBookHold({
  selectedAirPrice,
  selectedOffer,
  passengers = [],
  seatSelections = [],
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
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
