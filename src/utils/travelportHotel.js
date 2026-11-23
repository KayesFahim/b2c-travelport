import { fetchWithTimeout, readApiResponse } from "./apiClient";

export const POPULAR_STAY_DESTINATIONS = [
  { code: "DXB", city: "Dubai", country: "United Arab Emirates", label: "Dubai (DXB)" },
  { code: "LON", city: "London", country: "United Kingdom", label: "London (LON)" },
  { code: "NYC", city: "New York", country: "United States", label: "New York (NYC)" },
  { code: "KUL", city: "Kuala Lumpur", country: "Malaysia", label: "Kuala Lumpur (KUL)" },
  { code: "SIN", city: "Singapore", country: "Singapore", label: "Singapore (SIN)" },
  { code: "BKK", city: "Bangkok", country: "Thailand", label: "Bangkok (BKK)" },
  { code: "IST", city: "Istanbul", country: "Turkey", label: "Istanbul (IST)" },
  { code: "PAR", city: "Paris", country: "France", label: "Paris (PAR)" },
  { code: "DOH", city: "Doha", country: "Qatar", label: "Doha (DOH)" },
  { code: "DAC", city: "Dhaka", country: "Bangladesh", label: "Dhaka (DAC)" },
  { code: "JED", city: "Jeddah", country: "Saudi Arabia", label: "Jeddah (JED)" },
  { code: "YYZ", city: "Toronto", country: "Canada", label: "Toronto (YYZ)" },
];

export const HOTEL_CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "AED", label: "AED" },
  { value: "BDT", label: "BDT (৳)" },
  { value: "MYR", label: "MYR" },
  { value: "SGD", label: "SGD" },
];

export function formatIsoDateOffset(daysFromToday = 1) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function calculateNights(checkIn, checkOut) {
  const start = new Date(`${checkIn}T00:00:00Z`);
  const end = new Date(`${checkOut}T00:00:00Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1;
  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

export function extractDestinationCityCode(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  const parenMatch = raw.match(/\(([A-Z]{3})\)/i);
  if (parenMatch?.[1]) return parenMatch[1].toUpperCase();
  if (/^[A-Za-z]{3}$/.test(raw)) return raw.toUpperCase();
  const found = POPULAR_STAY_DESTINATIONS.find(
    (item) =>
      item.city.toLowerCase() === raw.toLowerCase() ||
      item.label.toLowerCase() === raw.toLowerCase()
  );
  return found ? found.code : "";
}

async function postHotelApi(endpoint, payload, token = "", timeoutMs = 35000) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    },
    timeoutMs
  );

  const data = await readApiResponse(response).catch(() => ({}));
  if (!response.ok) {
    const err = new Error(
      data?.message || `Travelport Stays request failed (${response.status})`
    );
    err.status = response.status;
    err.payload = data;
    err.requiresLogin = Boolean(data?.requiresLogin);
    err.isProvisioningError = Boolean(data?.isProvisioningError);
    err.correlationId = data?.correlationId || "";
    throw err;
  }

  return data;
}

export function searchTravelportHotels(payload, token = "") {
  return postHotelApi("/api/travelport/hotel-search", payload, token);
}

export function fetchTravelportHotelAvailability(payload, token = "") {
  return postHotelApi("/api/travelport/hotel-availability", payload, token);
}

export function fetchTravelportHotelRules(payload, token = "") {
  return postHotelApi("/api/travelport/hotel-rules", payload, token);
}

export function bookTravelportHotel(payload, token = "") {
  return postHotelApi("/api/travelport/hotel-book", payload, token, 45000);
}
