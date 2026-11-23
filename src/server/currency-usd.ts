// Server-side live USD exchange-rate converter with cached live fetch + accurate fallback table.
// Ensures all Travelport Stays hotel prices (which Travelport returns in property local currency)
// are consistently converted and displayed in USD.

const FALLBACK_UNITS_PER_USD: Record<string, number> = {
  USD: 1,
  AED: 3.6725, // Pegged to USD
  SAR: 3.75, // Pegged to USD
  QAR: 3.64, // Pegged to USD
  OMR: 0.3845, // Pegged to USD
  BHD: 0.376, // Pegged to USD
  KWD: 0.307,
  JOD: 0.709, // Pegged to USD
  EUR: 0.92,
  GBP: 0.785,
  CHF: 0.88,
  CAD: 1.38,
  AUD: 1.52,
  NZD: 1.66,
  MYR: 4.42,
  SGD: 1.34,
  THB: 34.5,
  TRY: 34.5,
  BDT: 119.5,
  INR: 84.3,
  PKR: 278.0,
  LKR: 295.0,
  MVR: 15.42,
  JPY: 153.0,
  KRW: 1385.0,
  CNY: 7.22,
  HKD: 7.78,
  TWD: 32.3,
  IDR: 15750.0,
  PHP: 58.2,
  VND: 25300.0,
  EGP: 49.2,
  MAD: 9.85,
  ZAR: 17.8,
  BRL: 5.75,
  MXN: 20.1,
  PLN: 4.02,
  SEK: 10.65,
  NOK: 10.95,
  DKK: 6.88,
  CZK: 23.4,
  HUF: 375.0,
  ILS: 3.72,
};

type CachedRates = {
  rates: Record<string, number>;
  fetchedAt: number;
};

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
let cachedUsdRates: CachedRates | null = null;
let inflightFetch: Promise<Record<string, number>> | null = null;

async function fetchLiveUsdRates(): Promise<Record<string, number>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`FX API HTTP ${res.status}`);
    }
    const data = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
    };
    if (data?.rates && typeof data.rates === "object" && Number(data.rates.AED) > 0) {
      const merged: Record<string, number> = { ...FALLBACK_UNITS_PER_USD };
      for (const [code, val] of Object.entries(data.rates)) {
        const num = Number(val);
        if (/^[A-Z]{3}$/.test(code) && Number.isFinite(num) && num > 0) {
          merged[code] = num;
        }
      }
      merged.USD = 1;
      return merged;
    }
    return { ...FALLBACK_UNITS_PER_USD };
  } catch {
    return { ...FALLBACK_UNITS_PER_USD };
  } finally {
    clearTimeout(timeout);
  }
}

export async function getUsdExchangeRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (cachedUsdRates && now - cachedUsdRates.fetchedAt < CACHE_TTL_MS) {
    return cachedUsdRates.rates;
  }
  if (!inflightFetch) {
    inflightFetch = fetchLiveUsdRates()
      .then((rates) => {
        cachedUsdRates = { rates, fetchedAt: Date.now() };
        return rates;
      })
      .finally(() => {
        inflightFetch = null;
      });
  }
  return inflightFetch;
}

export function extractTravelportUsdRates(
  rawPayload: Record<string, unknown>
): Record<string, number> {
  const list: any[] =
    (rawPayload as any)?.PropertiesResponse?.CurrencyRateConversion ??
    (rawPayload as any)?.CatalogOfferingsHospitalityResponse?.CurrencyRateConversion ??
    (rawPayload as any)?.OfferHospitalityResponse?.CurrencyRateConversion ??
    [];
  if (!Array.isArray(list)) return {};

  // Map sourceCurrency -> unitsPerUsd (so amount / unitsPerUsd = USD)
  const overrides: Record<string, number> = {};
  for (const item of list) {
    const src = String(item?.SourceCurrency?.value || "").trim().toUpperCase();
    const tgt = String(item?.TargetCurrency?.value || "").trim().toUpperCase();
    const rate = Number(item?.ConversionRate?.value);
    if (!src || !tgt || !Number.isFinite(rate) || rate <= 0) continue;
    if (tgt === "USD") {
      // 1 SRC = rate USD => 1 USD = (1 / rate) SRC
      overrides[src] = 1 / rate;
    } else if (src === "USD") {
      // 1 USD = rate TGT
      overrides[tgt] = rate;
    }
  }
  return overrides;
}

export function roundUsd(value: number): number {
  return Math.round(value * 100) / 100;
}

export function convertToUsd(
  amount: number | null | undefined,
  sourceCurrency: string,
  rates: Record<string, number>
): number | null {
  if (amount === null || amount === undefined) return null;
  const num = Number(amount);
  if (!Number.isFinite(num)) return null;

  const code = String(sourceCurrency || "USD").trim().toUpperCase();
  if (!code || code === "USD") {
    return roundUsd(num);
  }

  const unitsPerUsd = rates[code] ?? FALLBACK_UNITS_PER_USD[code];
  if (!Number.isFinite(unitsPerUsd) || unitsPerUsd <= 0) {
    // Unknown currency fallback: keep numeric value safely rounded
    return roundUsd(num);
  }

  return roundUsd(num / unitsPerUsd);
}
