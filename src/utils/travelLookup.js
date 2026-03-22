import airlinesData from "../data/airlines";
import { airportsData } from "../data/airports";

const toCode = (value) =>
  String(value || "")
    .trim()
    .toUpperCase();

const normalizeAirlineFallbackName = (value) => {
  const text = String(value || "").trim();
  if (!text) return "";

  const compact = text.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (
    compact === "NA" ||
    compact === "NAN" ||
    compact === "NONE" ||
    compact === "NULL" ||
    compact === "UNKNOWN" ||
    compact === "UNAVAILABLE" ||
    compact === "AIRLINE"
  ) {
    return "";
  }

  return text;
};

const isLikelyCodeName = (value) => {
  const normalized = String(value || "").trim();
  if (!normalized) return true;
  return /^[A-Z0-9]{2,4}$/.test(normalized);
};

const airportByCode = new Map(
  (Array.isArray(airportsData) ? airportsData : [])
    .map((item) => ({
      code: toCode(item?.code),
      name: String(item?.name || "").trim(),
      address: String(item?.location || item?.Address || "").trim(),
    }))
    .filter((item) => item.code)
    .map((item) => [item.code, item])
);

const airlineByCode = new Map(
  (Array.isArray(airlinesData) ? airlinesData : [])
    .map((item) => ({
      code: toCode(item?.code),
      name: String(item?.name || "").trim(),
    }))
    .filter((item) => item.code)
    .map((item) => [item.code, item])
);

export const resolveAirportInfo = (
  code,
  fallbackName = "",
  fallbackAddress = ""
) => {
  const normalizedCode = toCode(code);
  const mapped = airportByCode.get(normalizedCode);
  const name = mapped?.name || String(fallbackName || normalizedCode || "").trim();
  const address = mapped?.address || String(fallbackAddress || "").trim();

  return {
    code: normalizedCode || String(code || "").trim(),
    name: name || "Unknown Airport",
    address,
  };
};

export const resolveAirlineName = (code, fallbackName = "") => {
  const normalizedCode = toCode(code);
  const mapped = airlineByCode.get(normalizedCode);
  const normalizedFallback = normalizeAirlineFallbackName(fallbackName);
  const fallbackIsCode = isLikelyCodeName(normalizedFallback);

  if (mapped?.name) return mapped.name;
  if (normalizedFallback && !fallbackIsCode) return normalizedFallback;
  if (normalizedCode) return normalizedCode;
  return normalizedFallback || "Airline";
};
