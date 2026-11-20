import sliderData from "../data/sliderData.json";

const HOMEPAGE_CACHE_KEY = "flyjatt:homepage:v1";
const HOMEPAGE_CACHE_TTL_MS = 5 * 60 * 1000;

let inFlightHomepageRequest = null;
let memoryCache = null;
let memoryCacheExpiresAt = 0;

function hasWindow() {
  return typeof window !== "undefined";
}

function normalizeHomepagePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return {
      ...sliderData,
      contactEmail: "info@flyjatt.com",
      contactPhone: "",
      copyright: "",
    };
  }

  return {
    ...sliderData,
    ...payload,
    bannerimage:
      payload.bannerimage && typeof payload.bannerimage === "object"
        ? {
            ...(sliderData.bannerimage || {}),
            ...payload.bannerimage,
          }
        : sliderData.bannerimage,
    sliderimage: Array.isArray(payload.sliderimage)
      ? payload.sliderimage
      : sliderData.sliderimage,
    contactEmail:
      typeof payload.contactEmail === "string" && payload.contactEmail.trim()
        ? payload.contactEmail
        : "info@flyjatt.com",
    contactPhone:
      typeof payload.contactPhone === "string" ? payload.contactPhone : "",
    copyright: typeof payload.copyright === "string" ? payload.copyright : "",
  };
}

function readSessionCache() {
  if (!hasWindow()) return null;

  try {
    const raw = window.sessionStorage.getItem(HOMEPAGE_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    const expiresAt = Number(parsed.expiresAt);
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

    return {
      data: normalizeHomepagePayload(parsed.data),
      expiresAt,
    };
  } catch {
    return null;
  }
}

function writeSessionCache(data, expiresAt) {
  if (!hasWindow()) return;

  try {
    window.sessionStorage.setItem(
      HOMEPAGE_CACHE_KEY,
      JSON.stringify({ data, expiresAt })
    );
  } catch {
    // Ignore storage errors.
  }
}

export function getHomepageFallbackData() {
  return normalizeHomepagePayload(sliderData);
}

export async function getHomepageData() {
  if (inFlightHomepageRequest) {
    return inFlightHomepageRequest;
  }

  inFlightHomepageRequest = fetch("/api/homepage", {
    cache: "no-store",
    headers: { Accept: "application/json" },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Homepage API failed (${response.status})`);
      }
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Homepage API returned non-JSON response");
      }
      return response.json();
    })
    .then((payload) => normalizeHomepagePayload(payload))
    .finally(() => {
      inFlightHomepageRequest = null;
    });

  return inFlightHomepageRequest;
}
