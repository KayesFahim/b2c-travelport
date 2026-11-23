import { fetchWithTimeout, readApiResponse } from "./apiClient";
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


function getCandidateSpecialServicesUrls() {
  const configuredUrl = getConfiguredSpecialServicesUrl();
  const configuredBaseUrl = getConfiguredBaseUrl();

  return Array.from(
    new Set(
      [
        configuredUrl,
        TRAVELPORT_SPECIAL_SERVICES_PATH,
        joinBaseAndPath(configuredBaseUrl, TRAVELPORT_SPECIAL_SERVICES_PATH),

      ].filter(Boolean)
    )
  );
}

async function getResponseErrorMessage(response) {
  try { await readApiResponse(response); }
  catch (error) { return error.message; }
  return "The request could not be completed.";
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
      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
          : new Error("Travelport special services request failed");
    }
  }

  throw lastError;
}

