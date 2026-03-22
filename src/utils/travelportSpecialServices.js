const TRAVELPORT_SPECIAL_SERVICES_PATH = "/api/travelport/special-services";

function joinBaseAndPath(baseUrl, path) {
  const base = String(baseUrl || "").trim();
  if (!base) return "";
  return `${base.replace(/\/+$/, "")}${path}`;
}

function getConfiguredSpecialServicesUrl() {
  if (typeof process === "undefined") return "";
  return process.env.NEXT_PUBLIC_TRAVELPORT_SPECIAL_SERVICES_URL || "";
}

function getConfiguredBaseUrl() {
  if (typeof process === "undefined") return "";
  return process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || "";
}

function getLocalFallbackSpecialServicesUrl() {
  if (typeof window === "undefined") return "";
  const { protocol, hostname, port } = window.location;
  if (port === "3001") {
    return `${protocol}//${hostname}:3000${TRAVELPORT_SPECIAL_SERVICES_PATH}`;
  }
  if (port === "3000") {
    return `${protocol}//${hostname}:3001${TRAVELPORT_SPECIAL_SERVICES_PATH}`;
  }
  return "";
}

function getCandidateSpecialServicesUrls() {
  const configuredUrl = getConfiguredSpecialServicesUrl();
  const configuredBaseUrl = getConfiguredBaseUrl();
  const localFallbackUrl = getLocalFallbackSpecialServicesUrl();

  return Array.from(
    new Set(
      [
        configuredUrl,
        TRAVELPORT_SPECIAL_SERVICES_PATH,
        joinBaseAndPath(configuredBaseUrl, TRAVELPORT_SPECIAL_SERVICES_PATH),
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
      `Travelport special services failed (${response.status})`
    );
  }

  const text = await response.text().catch(() => "");
  return text || `Travelport special services failed (${response.status})`;
}

export async function addTravelportSpecialServices({
  reservationId,
  specialRequests = [],
  offerIdentifier = "",
  token = "",
}) {
  const urls = getCandidateSpecialServicesUrls();
  let lastError = new Error("Travelport special-services route is not reachable");

  const payload = {
    reservationId,
    offerIdentifier,
    specialRequests,
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
          : new Error("Travelport special services request failed");
    }
  }

  throw lastError;
}

