import { fetchWithTimeout, readApiResponse } from "./apiClient";

export const POPULAR_STAY_DESTINATIONS = [
  { code: "DXB", city: "Dubai", country: "United Arab Emirates", label: "Dubai (DXB)" },
  { code: "AUH", city: "Abu Dhabi", country: "United Arab Emirates", label: "Abu Dhabi (AUH)" },
  { code: "SHJ", city: "Sharjah", country: "United Arab Emirates", label: "Sharjah (SHJ)" },
  { code: "LON", city: "London", country: "United Kingdom", label: "London (LON)" },
  { code: "NYC", city: "New York", country: "United States", label: "New York (NYC)" },
  { code: "SFO", city: "San Francisco", country: "United States", label: "San Francisco (SFO)" },
  { code: "KUL", city: "Kuala Lumpur", country: "Malaysia", label: "Kuala Lumpur (KUL)" },
  { code: "PEN", city: "Penang", country: "Malaysia", label: "Penang (PEN)" },
  { code: "SIN", city: "Singapore", country: "Singapore", label: "Singapore (SIN)" },
  { code: "BKK", city: "Bangkok", country: "Thailand", label: "Bangkok (BKK)" },
  { code: "HKT", city: "Phuket", country: "Thailand", label: "Phuket (HKT)" },
  { code: "IST", city: "Istanbul", country: "Turkey", label: "Istanbul (IST)" },
  { code: "AYT", city: "Antalya", country: "Turkey", label: "Antalya (AYT)" },
  { code: "PAR", city: "Paris", country: "France", label: "Paris (PAR)" },
  { code: "DOH", city: "Doha", country: "Qatar", label: "Doha (DOH)" },
  { code: "DAC", city: "Dhaka", country: "Bangladesh", label: "Dhaka (DAC)" },
  { code: "JED", city: "Jeddah", country: "Saudi Arabia", label: "Jeddah (JED)" },
  { code: "RUH", city: "Riyadh", country: "Saudi Arabia", label: "Riyadh (RUH)" },
  { code: "YYZ", city: "Toronto", country: "Canada", label: "Toronto (YYZ)" },
  { code: "MLE", city: "Malé", country: "Maldives", label: "Malé (MLE)" },
];

export const AIRPORT_TO_STAY_CITY_MAP = {
  DXB: { primary: "DXB", label: "Dubai (DXB)", country: "UAE", companions: ["AUH", "SHJ"] },
  DWC: { primary: "DXB", label: "Dubai (DXB)", country: "UAE", companions: ["AUH", "SHJ"] },
  AUH: { primary: "AUH", label: "Abu Dhabi (AUH)", country: "UAE", companions: ["DXB", "SHJ"] },
  SHJ: { primary: "SHJ", label: "Sharjah (SHJ)", country: "UAE", companions: ["DXB", "AUH"] },
  LHR: { primary: "LON", label: "London (LON)", country: "United Kingdom", companions: ["PAR", "IST"] },
  LGW: { primary: "LON", label: "London (LON)", country: "United Kingdom", companions: ["PAR", "IST"] },
  STN: { primary: "LON", label: "London (LON)", country: "United Kingdom", companions: ["PAR", "IST"] },
  JFK: { primary: "NYC", label: "New York (NYC)", country: "United States", companions: ["SFO", "YYZ"] },
  EWR: { primary: "NYC", label: "New York (NYC)", country: "United States", companions: ["SFO", "YYZ"] },
  LGA: { primary: "NYC", label: "New York (NYC)", country: "United States", companions: ["SFO", "YYZ"] },
  KUL: { primary: "KUL", label: "Kuala Lumpur (KUL)", country: "Malaysia", companions: ["PEN", "SIN"] },
  BKK: { primary: "BKK", label: "Bangkok (BKK)", country: "Thailand", companions: ["HKT", "SIN"] },
  DMK: { primary: "BKK", label: "Bangkok (BKK)", country: "Thailand", companions: ["HKT", "SIN"] },
  IST: { primary: "IST", label: "Istanbul (IST)", country: "Turkey", companions: ["AYT", "DXB"] },
  SAW: { primary: "IST", label: "Istanbul (IST)", country: "Turkey", companions: ["AYT", "DXB"] },
  CDG: { primary: "PAR", label: "Paris (PAR)", country: "France", companions: ["LON", "IST"] },
  ORY: { primary: "PAR", label: "Paris (PAR)", country: "France", companions: ["LON", "IST"] },
  JED: { primary: "JED", label: "Jeddah (JED)", country: "Saudi Arabia", companions: ["RUH", "DXB"] },
  RUH: { primary: "RUH", label: "Riyadh (RUH)", country: "Saudi Arabia", companions: ["JED", "DXB"] },
  SIN: { primary: "SIN", label: "Singapore (SIN)", country: "Singapore", companions: ["KUL", "BKK"] },
  DOH: { primary: "DOH", label: "Doha (DOH)", country: "Qatar", companions: ["DXB", "AUH"] },
};

export const HOTEL_CURRENCY_OPTIONS = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "AED", label: "AED" },
  { value: "BDT", label: "BDT (৳)" },
  { value: "MYR", label: "MYR" },
  { value: "SGD", label: "SGD" },
];

export function resolveStayDestinationFromAirport(airportCode) {
  const code = String(airportCode || "").trim().toUpperCase().slice(0, 3);
  if (AIRPORT_TO_STAY_CITY_MAP[code]) {
    return AIRPORT_TO_STAY_CITY_MAP[code];
  }
  const dest = POPULAR_STAY_DESTINATIONS.find((item) => item.code === code);
  if (dest) {
    return {
      primary: dest.code,
      label: dest.label,
      country: dest.country,
      companions: ["DXB", "AUH"].filter((c) => c !== dest.code),
    };
  }
  return {
    primary: code || "DXB",
    label: code ? `${code} (${code})` : "Dubai (DXB)",
    country: "",
    companions: ["DXB", "AUH"],
  };
}

export function getDestinationLabelByCode(code) {
  const upper = String(code || "").trim().toUpperCase();
  const found = POPULAR_STAY_DESTINATIONS.find((item) => item.code === upper);
  return found ? found.label : upper ? `${upper} (${upper})` : "";
}

export function formatIsoDateOffset(daysFromToday = 1) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDaysToIsoDate(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return isoDate;
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
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

async function postHotelApi(endpoint, payload, token = "", timeoutMs = 40000) {
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

export function fetchTravelportHotelDetails(payload, token = "") {
  return postHotelApi("/api/travelport/hotel-details", payload, token);
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
