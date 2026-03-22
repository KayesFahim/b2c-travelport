const TRAVELPORT_SEAT_AVAILABILITY_PATH = "/api/travelport/seat-availability";

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

function joinBaseAndPath(baseUrl, path) {
  const base = String(baseUrl || "").trim();
  if (!base) {
    return "";
  }
  return `${base.replace(/\/+$/, "")}${path}`;
}

function getConfiguredSeatAvailabilityUrl() {
  if (typeof process === "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_TRAVELPORT_SEAT_AVAILABILITY_URL || "";
}

function getConfiguredBaseUrl() {
  if (typeof process === "undefined") {
    return "";
  }
  return process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || "";
}

function getLocalFallbackSeatAvailabilityUrl() {
  if (typeof window === "undefined") {
    return "";
  }

  const { protocol, hostname, port } = window.location;
  if (port === "3001") {
    return `${protocol}//${hostname}:3000${TRAVELPORT_SEAT_AVAILABILITY_PATH}`;
  }
  if (port === "3000") {
    return `${protocol}//${hostname}:3001${TRAVELPORT_SEAT_AVAILABILITY_PATH}`;
  }
  return "";
}

function getCandidateSeatAvailabilityUrls() {
  const configuredUrl = getConfiguredSeatAvailabilityUrl();
  const localFallbackUrl = getLocalFallbackSeatAvailabilityUrl();
  const configuredBaseUrl = getConfiguredBaseUrl();

  const urls = [
    configuredUrl,
    TRAVELPORT_SEAT_AVAILABILITY_PATH,
    joinBaseAndPath(configuredBaseUrl, TRAVELPORT_SEAT_AVAILABILITY_PATH),
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
      `Travelport seat availability failed (${response.status})`
    );
  }

  const text = await response.text().catch(() => "");
  return text || `Travelport seat availability failed (${response.status})`;
}

export async function fetchTravelportSeatAvailability({
  seatAvailabilityRequest,
  offerListIdentifier,
  offerIdentifier,
  productIdentifiers,
  token,
  useSampleData = false,
}) {
  const urls = getCandidateSeatAvailabilityUrls();
  let lastError = new Error(
    "Travelport seat availability route is not reachable"
  );

  const normalizedOfferListIdentifier = normalizeIdentifier(
    offerListIdentifier ?? seatAvailabilityRequest?.offerListIdentifier
  );
  const normalizedOfferIdentifier = normalizeIdentifier(
    offerIdentifier ?? seatAvailabilityRequest?.offerIdentifier
  );
  const normalizedProductIdentifiers = normalizeIdentifierList(
    productIdentifiers ?? seatAvailabilityRequest?.productIdentifiers
  );
  const sampleModeEnabled =
    Boolean(useSampleData) ||
    String(process.env.NEXT_PUBLIC_USE_SAMPLE_SEAT_MAP || "").toLowerCase() ===
      "true";

  if (
    !sampleModeEnabled &&
    (!normalizedOfferListIdentifier ||
      !normalizedOfferIdentifier ||
      normalizedProductIdentifiers.length === 0)
  ) {
    throw new Error(
      "offerListIdentifier, offerIdentifier, and productIdentifiers are required for seat availability."
    );
  }

  const payload = {
    offerListIdentifier: normalizedOfferListIdentifier,
    offerIdentifier: normalizedOfferIdentifier,
    productIdentifiers: normalizedProductIdentifiers,
    useSampleData: sampleModeEnabled,
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
          : new Error("Travelport seat availability request failed");
    }
  }

  throw lastError;
}
