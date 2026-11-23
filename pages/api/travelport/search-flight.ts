import { fetchUpstream } from "@/server/upstream-fetch";
import { withApiHandler } from "@/server/api-handler";
import { publicErrorMessage } from "@/server/public-error";
import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import { mkdir, readFile, writeFile } from "fs/promises";
import { createHash, randomBytes } from "crypto";
import { getTravelportAccessToken } from "@/server/travelport-token";
import { cacheGetJson, cacheIncr, cacheSetJson } from "@/server/redis-cache";
import { getSessionUser } from "@/server/auth-session";
import { prisma } from "@/server/prisma";
import { logTravelportApi } from "@/utils/travelportLogger";

export type LegacySegment = {
  depfrom: string;
  arrto: string;
  depdate: string;
};

type SearchCriteriaFilterInput = {
  carrierPreferenceType?: string;
  carriers?: unknown;
  connectionType?: string;
  maxConnectionDuration?: string;
  maxOvernightDuration?: string;
  prohibitChangeOfAirportInd?: boolean | string;
  excludeInterlineConnectionsInd?: boolean | string;
  excludeGround?: string;
  excludeGroundTrain?: boolean | string;
  cabinPreferenceType?: string;
  fareType?: string;
  refundableOnlyInd?: boolean | string;
  prohibitMinStayFaresInd?: boolean | string;
  prohibitMaxStayFaresInd?: boolean | string;
  prohibitAdvancePurchaseFaresInd?: boolean | string;
  promotionalCode?: string;
  promotionalCodeSupplier?: string;
  returnBrandedFaresInd?: boolean | string;
  maxNumberOfUpsellsToReturn?: number | string;
  excludeBaggageFeesInd?: boolean | string;
  roundTripSearchMode?: string;
  searchRepresentation?: string;
  SearchRepresentation?: string;
};

type LegacySearchBody = {
  adultcount?: number | string;
  childcount?: number | string;
  infantcount?: number | string;
  cabinclass?: string | number;
  currencyCode?: string;
  segments?: LegacySegment[];
  contentSourceList?: unknown;
  contentSource?: unknown;
  searchFilters?: SearchCriteriaFilterInput;
  searchRepresentation?: string;
  SearchRepresentation?: string;
  responseModel?: "unified";
  saveResponse?: boolean;
};

type ErrorResponse = {
  message: string;
  details?: string;
  code?: string;
  remaining?: number;
  limit?: number;
  requiresLogin?: boolean;
};

const SEARCH_VISITOR_COOKIE = "flyjatt_search_visitor";
const DEFAULT_ANON_SEARCH_LIMIT = 10;
const DEFAULT_LOGGED_SEARCHES_PER_BOOKING = 50;
const DEFAULT_MIN_LOGGED_SEARCH_LIMIT = 50;
const SEARCH_LIMIT_WINDOW_SECONDS = 24 * 60 * 60;
const SEARCH_SETTINGS_CACHE_KEY = "settings:search_control";
const SEARCH_SETTINGS_CACHE_TTL_SECONDS = 60;

type SearchLimitSettings = {
  anonSearchLimit: number;
  loggedSearchesPerBooking: number;
  minimumLoggedSearchLimit: number;
};

type SearchLimitState = {
  limited: boolean;
  requiresLogin: boolean;
  remaining: number;
  limit: number;
  count: number;
  mode: "anonymous" | "authenticated";
  userId?: number;
  bookingCount?: number;
  visitorId?: string;
  ipHash: string;
  browserFingerprint: string;
};

type SearchLogEvent = {
  timestamp: string;
  mode: "anonymous" | "authenticated";
  userId: number | null;
  status: "success" | "failed" | "blocked" | "validation_failed";
  route: string;
  cabinClass: string;
  segments: number;
  ipHash: string;
  browserFingerprint: string;
  visitorId?: string | null;
  count?: number;
  limit?: number;
  remaining?: number;
  bookingCount?: number;
  message?: string;
};

function toPositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

function parseCookies(req: NextApiRequest): Record<string, string> {
  const raw = String(req.headers.cookie || "");
  return raw.split(";").reduce<Record<string, string>>((acc, part) => {
    const [name, ...rest] = part.split("=");
    const key = decodeURIComponent(String(name || "").trim());
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("=").trim());
    return acc;
  }, {});
}

function appendSetCookie(res: NextApiResponse, cookieValue: string) {
  const existing = res.getHeader("Set-Cookie");
  if (!existing) {
    res.setHeader("Set-Cookie", cookieValue);
    return;
  }

  if (Array.isArray(existing)) {
    res.setHeader("Set-Cookie", [...existing, cookieValue]);
    return;
  }

  res.setHeader("Set-Cookie", [String(existing), cookieValue]);
}

function resolveRequestIp(req: NextApiRequest): string {
  const forwarded = String(req.headers["x-forwarded-for"] || "");
  const firstForwarded = forwarded.split(",")[0]?.trim();
  if (firstForwarded) return firstForwarded;
  const realIp = String(req.headers["x-real-ip"] || "").trim();
  if (realIp) return realIp;
  return String(req.socket?.remoteAddress || "").trim() || "unknown-ip";
}

function hashValue(value: string): string {
  return createHash("sha256").update(String(value || "")).digest("hex").slice(0, 24);
}

function buildBrowserFingerprint(req: NextApiRequest): string {
  const pieces = [
    String(req.headers["user-agent"] || ""),
    String(req.headers["accept-language"] || ""),
    String(req.headers["sec-ch-ua-platform"] || ""),
  ];

  return createHash("sha256").update(pieces.join("|")).digest("hex").slice(0, 24);
}

function buildRouteSignature(body: LegacySearchBody): string {
  const segments = Array.isArray(body?.segments) ? body.segments : [];
  return segments
    .map((segment) =>
      [
        String(segment?.depfrom || "").trim().toUpperCase(),
        String(segment?.arrto || "").trim().toUpperCase(),
        String(segment?.depdate || "").trim(),
      ].join("-")
    )
    .filter(Boolean)
    .join("|");
}

async function appendSearchLog(entry: SearchLogEvent) {
  try {
    const timestamp = new Date(entry.timestamp);
    await prisma.searchLog.create({
      data: {
        timestamp: Number.isNaN(timestamp.getTime()) ? new Date() : timestamp,
        mode: entry.mode,
        userId: entry.userId,
        status: entry.status,
        route: entry.route,
        cabinClass: entry.cabinClass,
        segments: entry.segments,
        ipHash: entry.ipHash,
        browserFingerprint: entry.browserFingerprint,
        visitorId: entry.visitorId ?? null,
        count: entry.count ?? null,
        limit: entry.limit ?? null,
        remaining: entry.remaining ?? null,
        bookingCount: entry.bookingCount ?? null,
        message: entry.message ?? null,
        importKey: null,
      },
    });
  } catch (error) {
    console.error("Failed to persist search log", error);
  }
}

async function loadSearchLimitSettings(): Promise<SearchLimitSettings> {
  const cached = await cacheGetJson<SearchLimitSettings>(SEARCH_SETTINGS_CACHE_KEY);
  if (cached) {
    return {
      anonSearchLimit: toPositiveInteger(cached.anonSearchLimit, DEFAULT_ANON_SEARCH_LIMIT),
      loggedSearchesPerBooking: toPositiveInteger(
        cached.loggedSearchesPerBooking,
        DEFAULT_LOGGED_SEARCHES_PER_BOOKING
      ),
      minimumLoggedSearchLimit: toPositiveInteger(
        cached.minimumLoggedSearchLimit,
        DEFAULT_MIN_LOGGED_SEARCH_LIMIT
      ),
    };
  }

  const fallback: SearchLimitSettings = {
    anonSearchLimit: toPositiveInteger(process.env.ANON_SEARCH_LIMIT, DEFAULT_ANON_SEARCH_LIMIT),
    loggedSearchesPerBooking: DEFAULT_LOGGED_SEARCHES_PER_BOOKING,
    minimumLoggedSearchLimit: DEFAULT_MIN_LOGGED_SEARCH_LIMIT,
  };

  try {
    const rows = await prisma.siteSettings.findMany({
      where: { section: "search_control" },
    });
    const kv = rows.reduce<Record<string, string>>((acc, row) => {
      acc[row.key] = String(row.value ?? "").trim();
      return acc;
    }, {});

    const resolved: SearchLimitSettings = {
      anonSearchLimit: toPositiveInteger(kv.anonSearchLimit, fallback.anonSearchLimit),
      loggedSearchesPerBooking: toPositiveInteger(
        kv.loggedSearchesPerBooking,
        fallback.loggedSearchesPerBooking
      ),
      minimumLoggedSearchLimit: toPositiveInteger(
        kv.minimumLoggedSearchLimit,
        fallback.minimumLoggedSearchLimit
      ),
    };

    await cacheSetJson(SEARCH_SETTINGS_CACHE_KEY, resolved, SEARCH_SETTINGS_CACHE_TTL_SECONDS);
    return resolved;
  } catch {
    return fallback;
  }
}

function getOrCreateSearchVisitorId(req: NextApiRequest, res: NextApiResponse): string {
  const cookies = parseCookies(req);
  const existingId = String(cookies[SEARCH_VISITOR_COOKIE] || "").trim();
  if (existingId) return existingId;

  const visitorId = randomBytes(16).toString("hex");
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  appendSetCookie(
    res,
    `${SEARCH_VISITOR_COOKIE}=${encodeURIComponent(
      visitorId
    )}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SEARCH_LIMIT_WINDOW_SECONDS}${secure}`
  );
  return visitorId;
}

async function enforceSearchLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  settings: SearchLimitSettings
): Promise<SearchLimitState> {
  const visitorId = getOrCreateSearchVisitorId(req, res);
  const ip = resolveRequestIp(req);
  const ipHash = hashValue(ip);
  const browserFingerprint = buildBrowserFingerprint(req);
  const user = await getSessionUser(req);

  if (!user?.id) {
    const limit = toPositiveInteger(settings.anonSearchLimit, DEFAULT_ANON_SEARCH_LIMIT);
    const visitorCount = await cacheIncr(
      `search:anon:visitor:${visitorId}`,
      SEARCH_LIMIT_WINDOW_SECONDS
    );
    const ipCount = await cacheIncr(
      `search:anon:ip:${ipHash}`,
      SEARCH_LIMIT_WINDOW_SECONDS
    );
    const browserCount = await cacheIncr(
      `search:anon:browser:${browserFingerprint}`,
      SEARCH_LIMIT_WINDOW_SECONDS
    );

    const maxCount = Math.max(visitorCount, ipCount, browserCount);
    if (maxCount > limit) {
      return {
        limited: true,
        requiresLogin: true,
        limit,
        remaining: 0,
        count: maxCount,
        mode: "anonymous",
        visitorId,
        ipHash,
        browserFingerprint,
      };
    }

    return {
      limited: false,
      requiresLogin: false,
      limit,
      remaining: Math.max(limit - maxCount, 0),
      count: maxCount,
      mode: "anonymous",
      visitorId,
      ipHash,
      browserFingerprint,
    };
  }

  const bookingCount = await prisma.booking.count({
    where: {
      userId: user.id,
      status: {
        in: ["BOOKED", "COMMITTED", "TICKETED"],
      },
    },
  });

  const baseLimit =
    toPositiveInteger(settings.loggedSearchesPerBooking, DEFAULT_LOGGED_SEARCHES_PER_BOOKING) *
    Math.max(bookingCount, 1);
  const minimumLimit = toPositiveInteger(
    settings.minimumLoggedSearchLimit,
    DEFAULT_MIN_LOGGED_SEARCH_LIMIT
  );
  const limit = Math.max(baseLimit, minimumLimit);

  const count = await cacheIncr(`search:user:${user.id}`, SEARCH_LIMIT_WINDOW_SECONDS);
  if (count > limit) {
    return {
      limited: true,
      requiresLogin: false,
      limit,
      remaining: 0,
      count,
      mode: "authenticated",
      userId: user.id,
      bookingCount,
      visitorId,
      ipHash,
      browserFingerprint,
    };
  }

  return {
    limited: false,
    requiresLogin: false,
    remaining: Math.max(limit - count, 0),
    limit,
    count,
    mode: "authenticated",
    userId: user.id,
    bookingCount,
    visitorId,
    ipHash,
    browserFingerprint,
  };
}

function buildSearchCacheKey(body: LegacySearchBody): string {
  const segments = Array.isArray(body?.segments) ? body.segments : [];
  const segmentSignature = segments
    .map((segment) =>
      [
        String(segment?.depfrom || "").trim().toUpperCase(),
        String(segment?.arrto || "").trim().toUpperCase(),
        String(segment?.depdate || "").trim(),
      ].join("-")
    )
    .join("|");

  const tripType = segments.length > 1 ? "ROUND_OR_MULTI" : "ONEWAY";
  const pax = [
    Number(body?.adultcount || 0) || 0,
    Number(body?.childcount || 0) || 0,
    Number(body?.infantcount || 0) || 0,
  ].join("-");

  const contentSources = Array.isArray(body?.contentSourceList)
    ? body.contentSourceList.map((item) => String(item || "").trim().toUpperCase()).join(",")
    : String(body?.contentSource || "").trim().toUpperCase();
  const currencyCode =
    String(body?.currencyCode || process.env.TRAVELPORT_DEFAULT_CURRENCY || "USD")
      .trim()
      .toUpperCase() || "USD";

  return [
    "travelport",
    "search",
    tripType,
    String(body?.cabinclass || "").trim().toUpperCase() || "ANY",
    pax,
    contentSources || "ANY",
    currencyCode,
    segmentSignature || "NA",
  ].join(":");
}

function parseBooleanFlag(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return null;
}

function shouldSaveSearchResponse(body: LegacySearchBody): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const bodyFlag = parseBooleanFlag(body?.saveResponse);
  if (bodyFlag !== null) {
    return bodyFlag;
  }

  const envFlag = parseBooleanFlag(process.env.TRAVELPORT_SAVE_SEARCH_RESPONSE);
  if (envFlag !== null) {
    return envFlag;
  }

  return true;
}

async function persistSearchResponseSamples(params: {
  requestPayload: Record<string, unknown>;
  travelportRawResponse: Record<string, unknown>;
  unifiedResults: Record<string, unknown>[];
}) {
  const sampleDir = path.join(process.cwd(), "sample");
  await mkdir(sampleDir, { recursive: true });

  const writeJson = (filename: string, payload: unknown) =>
    writeFile(path.join(sampleDir, filename), `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  const firstUnified = params.unifiedResults[0] ?? {};

  await Promise.all([
    writeJson("searchRequestPayload.json", params.requestPayload),
    writeJson("flightsearchresponse.json", params.travelportRawResponse),
    writeJson("flightResponseUnifiedModel.json", firstUnified),
    writeJson("flightResponseUnifiedModelList.json", params.unifiedResults),
    writeJson("LatestUnifiedModel.json", params.unifiedResults),
  ]);
}

async function readSampleJson<T>(filename: string): Promise<T | null> {
  const candidatePaths = [
    path.join(process.cwd(), "sample", filename),
    path.join(process.cwd(), "Sample", filename),
    path.join(__dirname, "..", "..", "sample", filename),
    path.join(__dirname, "..", "..", "Sample", filename),
  ];
  for (const filePath of candidatePaths) {
    try {
      const raw = await readFile(filePath, "utf8");
      return JSON.parse(raw) as T;
    } catch {
      continue;
    }
  }
  return null;
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    const normalized = String(value ?? "").trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }
  return "";
}

function resolveCarrierCodeFromTerms(terms: Record<string, unknown>): string {
  const validatingAirline = (terms as any)?.ValidatingAirline;
  if (Array.isArray(validatingAirline)) {
    for (const entry of validatingAirline) {
      const fromEntry = firstNonEmptyString(
        (entry as any)?.ValidatingAirline,
        (entry as any)?.code,
        (entry as any)?.value
      );
      if (fromEntry) {
        return fromEntry;
      }
    }
  } else {
    const fromObject = firstNonEmptyString(
      (validatingAirline as any)?.ValidatingAirline,
      (validatingAirline as any)?.code,
      validatingAirline
    );
    if (fromObject) {
      return fromObject;
    }
  }

  const baggageAllowance = Array.isArray((terms as any)?.BaggageAllowance)
    ? (terms as any).BaggageAllowance
    : [];

  for (const allowance of baggageAllowance) {
    const allowanceCarrier = firstNonEmptyString(
      (allowance as any)?.validatingAirlineCode,
      (allowance as any)?.ValidatingAirlineCode,
      (allowance as any)?.carrier,
      (allowance as any)?.Carrier
    );
    if (allowanceCarrier) {
      return allowanceCarrier;
    }

    const baggageItems = Array.isArray((allowance as any)?.BaggageItem)
      ? (allowance as any).BaggageItem
      : [];

    for (const bagItem of baggageItems) {
      const itemCarrier = firstNonEmptyString(
        (bagItem as any)?.validatingAirlineCode,
        (bagItem as any)?.ValidatingAirlineCode,
        (bagItem as any)?.carrier,
        (bagItem as any)?.Carrier,
        (bagItem as any)?.airline,
        (bagItem as any)?.Airline
      );
      if (itemCarrier) {
        return itemCarrier;
      }
    }
  }

  return "";
}

function resolveCarrierNameFromSegments(
  mappedSegments: Array<Record<string, unknown>>,
  fallbackCode: string
): string {
  for (const segment of mappedSegments) {
    const marketingCarrier = firstNonEmptyString(
      segment?.marketingCarrier,
      segment?.MarketingCarrier
    );
    const operatingCarrier = firstNonEmptyString(
      segment?.operatingCarrier,
      segment?.OperatingCarrier
    );
    const marketingCarrierName = firstNonEmptyString(
      segment?.marketingCarrierName,
      segment?.MarketingCarrierName
    );
    const operatingCarrierName = firstNonEmptyString(
      segment?.operatingCarrierName,
      segment?.OperatingCarrierName
    );

    if (
      marketingCarrierName &&
      marketingCarrierName.toUpperCase() !== marketingCarrier.toUpperCase()
    ) {
      return marketingCarrierName;
    }
    if (
      operatingCarrierName &&
      operatingCarrierName.toUpperCase() !== operatingCarrier.toUpperCase()
    ) {
      return operatingCarrierName;
    }
    if (marketingCarrierName) {
      return marketingCarrierName;
    }
    if (operatingCarrierName) {
      return operatingCarrierName;
    }
  }

  return fallbackCode || "N/A";
}

function normalizeCabinClass(value: unknown): string {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "1" || normalized === "economy" || normalized === "y") {
    return "Economy";
  }
  if (
    normalized === "2" ||
    normalized === "premium economy" ||
    normalized === "premiumeconomy" ||
    normalized === "w"
  ) {
    return "PremiumEconomy";
  }
  if (normalized === "3" || normalized === "business" || normalized === "c") {
    return "Business";
  }
  if (
    normalized === "4" ||
    normalized === "first class" ||
    normalized === "first" ||
    normalized === "f"
  ) {
    return "First";
  }

  return "Economy";
}

function resolveContentSourceList(body: LegacySearchBody): string[] {
  const normalizeList = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      const expanded = value.flatMap((entry) =>
        String(entry ?? "").trim().toUpperCase() === "ALL"
          ? ["GDS", "NDC"]
          : [String(entry ?? "").trim().toUpperCase()]
      );
      return Array.from(
        new Set(expanded.filter((entry) => entry === "GDS" || entry === "NDC"))
      );
    }
    const rawText = String(value ?? "").trim().toUpperCase();
    if (rawText === "ALL" || rawText === "BOTH") {
      return ["GDS", "NDC"];
    }
    const text = rawText
      .split(",")
      .map((entry) => entry.trim().toUpperCase())
      .filter((entry) => entry === "GDS" || entry === "NDC");
    return Array.from(new Set(text));
  };

  const bodyRaw = Array.isArray(body?.contentSourceList)
    ? body.contentSourceList
    : String(body?.contentSource || "").trim()
      ? String(body?.contentSource)
      : "";
  const fromBody = normalizeList(bodyRaw);
  if (fromBody.length) {
    return fromBody;
  }

  const gdsOnly = parseBooleanFlag(process.env.TRAVELPORT_GDS_ONLY);
  if (gdsOnly !== false) {
    return ["GDS"];
  }

  const envRaw = process.env.TRAVELPORT_CONTENT_SOURCE_LIST || "GDS";
  const fromEnv = normalizeList(envRaw);
  if (fromEnv.length) return fromEnv;
  return ["GDS"];
}

function removeAtType<T>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      removeAtType(item);
    }
    return obj;
  }

  const mutable = obj as Record<string, unknown>;
  delete mutable["@type"];

  for (const key of Object.keys(mutable)) {
    removeAtType(mutable[key]);
  }
  return obj;
}

function parseDurationToMinutes(duration: unknown): number {
  if (typeof duration === "number") {
    return duration;
  }
  if (typeof duration !== "string" || duration.length === 0) {
    return 0;
  }

  const hourMatch = duration.match(/(\d+)H/i);
  const minuteMatch = duration.match(/(\d+)M/i);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  return hours * 60 + minutes;
}

function extractBaggageAllowance(text: unknown, quantity = 0): string {
  const value = typeof text === "string" ? text : "";
  const match = value.match(/(\d+)\s*KG/i);
  if (match) {
    return `${match[1]}Kg`;
  }
  if (quantity > 0) {
    return `${quantity}Pc`;
  }
  return "0Kg";
}

function mapPaxType(code: unknown): string {
  const value = String(code ?? "").toUpperCase();
  if (value === "ADT") return "Adult";
  if (value === "CHD") return "Child";
  if (value === "INF") return "Infant";
  return "Adult";
}

function formatDateTime(date: unknown, time: unknown): string {
  const dateValue = typeof date === "string" ? date : "";
  const timeValue = typeof time === "string" ? time : "";

  if (dateValue && timeValue) {
    return `${dateValue}T${timeValue}`;
  }
  if (dateValue) {
    return `${dateValue}T00:00:00`;
  }
  return "";
}

function durationMinutesToIso(minutes: unknown): string {
  const safeMinutes = Math.max(0, toNumber(minutes, 0));
  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `PT${hours}H${remainingMinutes}M`;
  }
  if (hours > 0) {
    return `PT${hours}H`;
  }
  return `PT${remainingMinutes}M`;
}

function extractTextValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    typeof (value as Record<string, unknown>).value === "string"
  ) {
    return (value as Record<string, string>).value;
  }

  return "";
}

function extractUrlByType(urlCollection: unknown, preferredTypes: string[]): string | null {
  if (!Array.isArray(urlCollection)) {
    return null;
  }

  for (const preferredType of preferredTypes) {
    const matched = urlCollection.find(
      (entry) =>
        entry &&
        typeof entry === "object" &&
        String((entry as Record<string, unknown>).urlType || "")
          .toLowerCase()
          .trim() === preferredType.toLowerCase()
    ) as Record<string, unknown> | undefined;

    if (matched && typeof matched.value === "string" && matched.value.length > 0) {
      return matched.value;
    }
  }

  const fallback = urlCollection.find(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      typeof (entry as Record<string, unknown>).value === "string"
  ) as Record<string, unknown> | undefined;

  return fallback?.value ? String(fallback.value) : null;
}

function toAmenityItem(amenity: unknown) {
  const source = (amenity ?? {}) as Record<string, unknown>;
  return {
    id: String(source.id ?? ""),
    category: String(source.Category ?? ""),
    text: extractTextValue(source.Text),
  };
}

function toUniversalProductAttributeItem(attribute: unknown) {
  const source = (attribute ?? {}) as Record<string, unknown>;
  const iconURL = Array.isArray(source.IconURL) ? source.IconURL : [];

  return {
    id: String(source.id ?? ""),
    headline: String(source.headline ?? ""),
    description: String(source.description ?? ""),
    iconSmall: extractUrlByType(iconURL, ["smallurl", "smallURL"]),
    iconLarge: extractUrlByType(iconURL, ["largeurl", "largeURL"]),
  };
}

function toAmenityCollectionFromBrand(brandDetails: Record<string, unknown> | null) {
  const mapped = {
    basic: [] as Array<{ classification: string; inclusion: string }>,
    additional: [] as Array<{ classification: string; inclusion: string }>,
  };

  const basicRows = Array.isArray(brandDetails?.BrandAttribute)
    ? (brandDetails?.BrandAttribute as Array<Record<string, unknown>>)
    : [];
  const additionalRows = Array.isArray(brandDetails?.AdditionalBrandAttribute)
    ? (brandDetails?.AdditionalBrandAttribute as Array<Record<string, unknown>>)
    : [];

  const normalizeAmenity = (item: Record<string, unknown>) => ({
    classification: String(item?.classification ?? item?.Classification ?? "").trim(),
    inclusion: String(item?.inclusion ?? item?.Inclusion ?? "").trim(),
  });

  for (const row of basicRows) {
    const normalized = normalizeAmenity(row);
    if (normalized.classification && normalized.inclusion) {
      mapped.basic.push(normalized);
    }
  }

  for (const row of additionalRows) {
    const normalized = normalizeAmenity(row);
    if (normalized.classification && normalized.inclusion) {
      mapped.additional.push(normalized);
    }
  }

  return mapped;
}

function toPaxTypeCode(value: unknown): string {
  const code = String(value ?? "").trim().toUpperCase();
  if (["ADT", "ADULT"].includes(code)) return "ADT";
  if (["CHD", "CNN", "CHILD"].includes(code)) return "CHD";
  if (["INF", "INFANT"].includes(code)) return "INF";
  return code || "ADT";
}

function findWeightFromText(text: unknown): string | null {
  const raw = typeof text === "string" ? text : "";
  const weightMatch = raw.match(/(\d+\s*KG)/i);
  if (!weightMatch) return null;
  return weightMatch[1].replace(/\s+/g, "").toUpperCase();
}

function resolveBaggageType(item: Record<string, unknown>): "Checked" | "CarryOn" {
  const explicit = String(
    item?.type ?? item?.Type ?? item?.baggageType ?? item?.BaggageType ?? ""
  )
    .trim()
    .toLowerCase();

  if (explicit.includes("carry")) return "CarryOn";
  if (explicit.includes("checked")) return "Checked";

  const text = extractTextValue(item?.Text ?? item?.text).toLowerCase();
  if (text.includes("carry")) return "CarryOn";
  return "Checked";
}

function mapUnifiedBaggageAllowances(
  terms: Record<string, unknown>,
  paxTypeCode: string,
  carrierCode: string
) {
  const allAllowances = Array.isArray(terms?.BaggageAllowance)
    ? (terms.BaggageAllowance as Array<Record<string, unknown>>)
    : [];

  const scopedAllowances = allAllowances.filter((allowance) => {
    const passengerTypeCodes = Array.isArray(allowance?.passengerTypeCodes)
      ? allowance.passengerTypeCodes.map((code) => String(code ?? "").toUpperCase())
      : [];
    if (!passengerTypeCodes.length) return true;
    return passengerTypeCodes.includes(paxTypeCode);
  });

  const baggageItems = scopedAllowances.flatMap((allowance) =>
    Array.isArray(allowance?.BaggageItem)
      ? (allowance.BaggageItem as Array<Record<string, unknown>>)
      : []
  );

  const normalizedAllowances = baggageItems.map((item) => {
    const text = extractTextValue(item?.Text ?? item?.text);
    const quantity = Math.max(0, toNumber(item?.quantity ?? item?.Quantity, 0));
    const weight =
      String(item?.weight ?? item?.Weight ?? "").trim() || findWeightFromText(text);

    return {
      type: resolveBaggageType(item),
      quantity,
      weight: weight || null,
      text: text || (quantity > 0 ? `${quantity}Pc` : "BAGGAGE CHARGES DATA NOT AVAILABLE"),
    };
  });

  if (!normalizedAllowances.length) {
    return {
      airline: carrierCode,
      allowance: [
        {
          type: "Checked",
          quantity: 0,
          weight: null,
          text: "BAGGAGE CHARGES DATA NOT AVAILABLE",
        },
      ],
    };
  }

  return {
    airline: carrierCode,
    allowance: normalizedAllowances,
  };
}

function normalizeTripType(legacyTripType: unknown): "ONE_WAY" | "ROUND_TRIP" {
  const value = String(legacyTripType ?? "").toLowerCase();
  return value === "return" ? "ROUND_TRIP" : "ONE_WAY";
}

function normalizePaxCode(value: unknown): string {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "adult") return "ADT";
  if (normalized === "child") return "CHD";
  if (normalized === "infant") return "INF";
  return String(value ?? "").toUpperCase();
}

function toNullableNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toStringList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter((item) => item.length > 0);
  }

  const text = String(value ?? "").trim();
  return text ? [text] : [];
}

function normalizePenaltyAmountFromTravelport(penaltyRule: any) {
  const penalties = Array.isArray(penaltyRule?.Penalty) ? penaltyRule.Penalty : [];
  const amountPenalty = penalties.find(
    (item: any) => item && typeof item === "object" && item?.Amount
  );

  if (!amountPenalty?.Amount || typeof amountPenalty.Amount !== "object") {
    return null;
  }

  const amount = amountPenalty.Amount;
  const currencyCode =
    String(
      amount?.currencyCode ??
      amount?.CurrencyCode ??
      amount?.code ??
      amount?.Code ??
      ""
    ).trim() || null;
  const value = toNullableNumber(amount?.value ?? amount?.Value);

  if (value === null && !currencyCode) {
    return null;
  }

  return {
    value,
    currencyCode,
  };
}

function mapPenaltyEntry(penaltyRule: any, fallbackPassengerTypes: string[]) {
  const passengerTypeCodes = fallbackPassengerTypes.length
    ? fallbackPassengerTypes
    : ["ALL"];
  const penaltyTypes = toStringList(penaltyRule?.penaltyTypes);
  const appliesTo =
    String(
      penaltyRule?.PenaltyAppliesTo ??
      penaltyRule?.penaltyAppliesTo ??
      penaltyRule?.AppliesTo ??
      ""
    ).trim() || null;

  return {
    passengerTypeCodes,
    penaltyTypes: penaltyTypes.length ? penaltyTypes : ["Anytime"],
    appliesTo,
    amount: normalizePenaltyAmountFromTravelport(penaltyRule),
  };
}

function mapPenaltiesCancellationFromTerms(penalties: any[]) {
  const result = {
    change: [] as Array<{
      passengerTypeCodes: string[];
      penaltyTypes: string[];
      appliesTo: string | null;
      amount: { value: number | null; currencyCode: string | null } | null;
    }>,
    cancel: [] as Array<{
      passengerTypeCodes: string[];
      penaltyTypes: string[];
      appliesTo: string | null;
      amount: { value: number | null; currencyCode: string | null } | null;
    }>,
  };

  for (const penaltyGroup of penalties) {
    const passengerTypeCodes = toStringList(
      penaltyGroup?.PassengerTypeCodes ?? penaltyGroup?.passengerTypeCodes
    );
    const changeItems = Array.isArray(penaltyGroup?.Change)
      ? penaltyGroup.Change
      : [];
    const cancelItems = Array.isArray(penaltyGroup?.Cancel)
      ? penaltyGroup.Cancel
      : [];

    for (const changeItem of changeItems) {
      result.change.push(mapPenaltyEntry(changeItem, passengerTypeCodes));
    }
    for (const cancelItem of cancelItems) {
      result.cancel.push(mapPenaltyEntry(cancelItem, passengerTypeCodes));
    }
  }

  return result;
}

function normalizeLegacyPenaltyEntry(entry: unknown) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const source = entry as Record<string, unknown>;
  const passengerTypeCodes = toStringList(
    source.passengerTypeCodes ?? source.PassengerTypeCodes
  );
  const penaltyTypes = toStringList(source.penaltyTypes ?? source.PenaltyTypes);
  const appliesTo =
    String(
      source.appliesTo ??
      source.AppliesTo ??
      source.PenaltyAppliesTo ??
      source.penaltyAppliesTo ??
      ""
    ).trim() || null;
  const amountSource = source.amount ?? source.Amount ?? null;

  let amount: { value: number | null; currencyCode: string | null } | null = null;
  if (amountSource && typeof amountSource === "object") {
    const amountObject = amountSource as Record<string, unknown>;
    const value = toNullableNumber(
      amountObject.value ?? amountObject.Value ?? amountObject.amount ?? amountObject.Amount
    );
    const currencyCode =
      String(
        amountObject.currencyCode ??
        amountObject.CurrencyCode ??
        amountObject.code ??
        amountObject.Code ??
        ""
      ).trim() || null;
    if (value !== null || currencyCode) {
      amount = { value, currencyCode };
    }
  }

  return {
    passengerTypeCodes: passengerTypeCodes.length ? passengerTypeCodes : ["ALL"],
    penaltyTypes: penaltyTypes.length ? penaltyTypes : ["Anytime"],
    appliesTo,
    amount,
  };
}

function normalizePenaltiesCancellationFromLegacy(value: unknown) {
  const source = (value ?? {}) as Record<string, unknown>;
  const changeRaw = Array.isArray(source.change)
    ? source.change
    : Array.isArray(source.Change)
      ? source.Change
      : [];
  const cancelRaw = Array.isArray(source.cancel)
    ? source.cancel
    : Array.isArray(source.Cancel)
      ? source.Cancel
      : [];

  return {
    change: changeRaw
      .map((entry) => normalizeLegacyPenaltyEntry(entry))
      .filter(Boolean),
    cancel: cancelRaw
      .map((entry) => normalizeLegacyPenaltyEntry(entry))
      .filter(Boolean),
  };
}

function mergePenaltiesCancellation(legs: Array<Record<string, unknown>>) {
  const merged = {
    change: [] as unknown[],
    cancel: [] as unknown[],
  };

  for (const leg of legs) {
    const penalties = normalizePenaltiesCancellationFromLegacy(
      (leg as Record<string, unknown>)?.penaltiesCancellation ??
      (leg as Record<string, unknown>)?.PenaltiesCancellation
    );
    merged.change.push(...penalties.change);
    merged.cancel.push(...penalties.cancel);
  }

  return merged;
}

function toUnifiedFlightResult(legacy: Record<string, unknown>) {
  const allLegsInfo = Array.isArray(legacy?.AllLegsInfo)
    ? (legacy.AllLegsInfo as Array<Record<string, unknown>>)
    : [];

  const firstSegment = Array.isArray(allLegsInfo[0]?.Segments)
    ? (allLegsInfo[0]?.Segments as Array<Record<string, unknown>>)[0]
    : undefined;
  const firstSegmentCode = (firstSegment?.SegmentCode ?? {}) as Record<
    string,
    unknown
  >;

  const unifiedLegs = allLegsInfo.map((leg) => {
    const segments = Array.isArray(leg?.Segments)
      ? (leg.Segments as Array<Record<string, unknown>>)
      : [];

    return {
      departureDate: String(leg?.DepDate ?? "").split("T")[0] || "",
      departureFrom: String(leg?.DepFrom ?? ""),
      arrivalTo: String(leg?.ArrTo ?? ""),
      totalDuration:
        typeof leg?.TotalDurationISO === "string" && leg.TotalDurationISO.length > 0
          ? String(leg.TotalDurationISO)
          : durationMinutesToIso(leg?.Duration),
      brandName:
        typeof leg?.BrandName === "string" && leg.BrandName.length > 0
          ? leg.BrandName
          : null,
      brandFeatures: leg?.BrandFeatures ?? null,
      segments: segments.map((segment) => {
        const amenities = (segment?.Amenities ?? {}) as Record<string, unknown>;
        const amenityItems = Array.isArray(amenities?.items)
          ? (amenities.items as Array<Record<string, unknown>>)
          : [];
        const universalProductAttributes = Array.isArray(
          amenities?.universalProductAttributes
        )
          ? (amenities.universalProductAttributes as Array<Record<string, unknown>>)
          : [];
        const segmentCode = (segment?.SegmentCode ?? {}) as Record<string, unknown>;

        return {
          marketingCarrier: String(segment?.MarketingCarrier ?? ""),
          marketingCarrierName: String(segment?.MarketingCarrierName ?? ""),
          marketingFlightNumber: String(segment?.MarketingFlightNumber ?? ""),
          operatingCarrier: String(segment?.OperatingCarrier ?? ""),
          operatingCarrierName: String(segment?.OperatingCarrierName ?? ""),
          operatingFlightNumber: String(segment?.OperatingFlightNumber ?? ""),
          availabilitySourceCode: String(segment?.AvailabilitySourceCode ?? "N/A"),
          depFrom: String(segment?.DepFrom ?? ""),
          depAirport: String(segment?.DepAirPort ?? ""),
          depLocation: String(segment?.DepLocation ?? ""),
          depDateAdjustment: toNumber(segment?.DepDateAdjustment, 0),
          depTime: String(segment?.DepTime ?? ""),
          arrTo: String(segment?.ArrTo ?? ""),
          arrAirport: String(segment?.ArrAirPort ?? ""),
          arrLocation: String(segment?.ArrLocation ?? ""),
          arrDateAdjustment: toNumber(segment?.ArrDateAdjustment, 0),
          arrTime: String(segment?.ArrTime ?? ""),
          operatedBy: String(segment?.OperatedBy ?? ""),
          stopCount: toNumber(segment?.StopCount, 0),
          duration:
            typeof segment?.DurationIso === "string" && segment.DurationIso.length > 0
              ? String(segment.DurationIso)
              : durationMinutesToIso(segment?.Duration),
          aircraftTypeName: String(segment?.AircraftTypeName ?? ""),
          departureGate: String(segment?.DepartureGate ?? ""),
          arrivalGate: String(segment?.ArrivalGate ?? ""),
          hiddenStops: Array.isArray(segment?.HiddenStops) ? segment.HiddenStops : [],
          segmentCode: {
            bookingCode: String(segmentCode?.bookingCode ?? ""),
            cabinCode: String(segmentCode?.cabinCode ?? ""),
            seatsAvailable: toNumber(segmentCode?.seatsAvailable, 0),
            fareBasisCode: String(segmentCode?.fareBasisCode ?? ""),
            fareTypeCode: String(segmentCode?.fareTypeCode ?? ""),
          },
          amenities: amenityItems,
          amenityRefs: Array.isArray(amenities?.amenityRefs)
            ? amenities.amenityRefs
            : [],
          universalProductAttributeRefs: Array.isArray(
            amenities?.universalProductAttributeRefs
          )
            ? amenities.universalProductAttributeRefs
            : [],
          universalProductAttributes,
        };
      }),
    };
  });

  const totalSegments = unifiedLegs.reduce((sum, leg) => {
    const segments = Array.isArray(leg?.segments) ? leg.segments : [];
    return sum + segments.length;
  }, 0);

  const grossFare = toNumber(legacy?.GrossFare, 0);
  const netFare = toNumber(legacy?.NetFare, 0);
  const unifiedPenaltiesCancellation = normalizePenaltiesCancellationFromLegacy(
    (legacy as Record<string, unknown>)?.penaltiesCancellation ??
    (legacy as Record<string, unknown>)?.PenaltiesCancellation
  );
  const unifiedPriceBreakDown = Array.isArray(legacy?.PriceBreakDown)
    ? (legacy.PriceBreakDown as Array<Record<string, unknown>>).map((item) => {
      const bagItems = Array.isArray(item?.Bag)
        ? (item.Bag as Array<Record<string, unknown>>)
        : [];

      return {
        paxType: normalizePaxCode(item?.PaxType),
        baseFare: toNumber(item?.BaseFare, 0),
        taxes: toNumber(item?.Taxes, 0),
        totalFare: toNumber(item?.TotalFare, 0),
        paxCount: toNumber(item?.PaxCount, 1),
        bag: {
          airline: String(bagItems[0]?.Airline ?? legacy?.Carrier ?? ""),
          allowance: bagItems.map((bag) => ({
            type: "Checked",
            quantity: 0,
            weight: String(bag?.Allowance ?? ""),
            text: String(bag?.Allowance ?? ""),
          })),
        },
        fareComponent: {},
      };
    })
    : [];

  return {
    provider: "Travelport",
    transactionId: String(legacy?.SearchId ?? ""),
    identifier: String(legacy?.ResultId ?? ""),
    instantPayment: Boolean(legacy?.InstantPayment),
    issuePermit: true,
    isBookable: Boolean(legacy?.IsBookable),
    journeyType: normalizeTripType(legacy?.TripType),
    tripType: normalizeTripType(legacy?.TripType),
    fareType: String(legacy?.FareType ?? ""),
    carrierCode: String(legacy?.Carrier ?? ""),
    carrierName: String(legacy?.CarrierName ?? ""),
    cabinClass: String(firstSegmentCode?.cabinCode ?? "Economy"),
    currencyCode: String(legacy?.CurrencyCode ?? ""),
    baseFare: toNumber(legacy?.BaseFare, 0),
    taxes: toNumber(legacy?.Taxes, 0),
    netFare,
    grossFare,
    markUp: String(Math.max(grossFare - netFare, 0)),
    timeLimit: legacy?.TimeLimit ?? null,
    refundable: Boolean(legacy?.Refundable),
    totalSegments,
    penaltiesCancellation: unifiedPenaltiesCancellation,
    priceBreakDown: unifiedPriceBreakDown,
    allLegsInfo: unifiedLegs,
    sourceLegacy: legacy,
  };
}

async function createToken(): Promise<string> {
  return getTravelportAccessToken();
}

function normalizeIsoDuration(value: unknown): string {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return "";
  return /^PT(?:\d+H)?(?:\d+M)?$/.test(raw) && raw !== "PT" ? raw : "";
}

function resolveCarrierCodes(value: unknown): string[] {
  const rawList = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(/[\s,;]+/)
      : [];
  return Array.from(
    new Set(
      rawList
        .map((code) => String(code ?? "").trim().toUpperCase())
        .filter((code) => /^[A-Z0-9]{2}$/.test(code))
    )
  );
}

function buildTravelportPayload(body: LegacySearchBody) {
  const adultCount = Math.max(0, toNumber(body.adultcount, 1));
  const childCount = Math.max(0, toNumber(body.childcount, 0));
  const infantCount = Math.max(0, toNumber(body.infantcount, 0));
  const cabinClass = normalizeCabinClass(body.cabinclass);
  const currencyCode =
    String(body.currencyCode || "")
      .trim()
      .toUpperCase() ||
    process.env.TRAVELPORT_DEFAULT_CURRENCY ||
    "USD";
  const contentSourceList = resolveContentSourceList(body);
  const hasNdc = contentSourceList.includes("NDC");
  const isNdcOnly = contentSourceList.length === 1 && contentSourceList[0] === "NDC";
  const searchFilters =
    body.searchFilters && typeof body.searchFilters === "object"
      ? body.searchFilters
      : {};

  const rawSearchRepresentation = String(
    body.searchRepresentation ||
    body.SearchRepresentation ||
    searchFilters.searchRepresentation ||
    searchFilters.SearchRepresentation ||
    (searchFilters.roundTripSearchMode === "leg_based" ? "Leg" : "") ||
    ""
  ).trim();
  const searchRepresentation = ["Leg", "Journey"].includes(rawSearchRepresentation)
    ? rawSearchRepresentation
    : "";

  const requestedUpsells = searchFilters.maxNumberOfUpsellsToReturn;
  const parsedRequestedUpsells =
    requestedUpsells !== undefined && requestedUpsells !== null && String(requestedUpsells).trim() !== ""
      ? toNumber(requestedUpsells, -1)
      : -1;
  const envUpsellsToReturn = Math.max(
    0,
    toNumber(process.env.TRAVELPORT_MAX_UPSELLS_TO_RETURN, 20)
  );
  const maxUpsellsToReturn =
    parsedRequestedUpsells >= 0
      ? Math.min(hasNdc ? 99 : 4, Math.max(0, Math.floor(parsedRequestedUpsells)))
      : envUpsellsToReturn;

  const returnBrandedFaresFlag = parseBooleanFlag(searchFilters.returnBrandedFaresInd);
  const excludeBaggageFeesFlag = parseBooleanFlag(searchFilters.excludeBaggageFeesInd);
  const carrierCodes = resolveCarrierCodes(searchFilters.carriers);
  const rawCarrierPrefType = String(searchFilters.carrierPreferenceType || "").trim();
  const carrierPreferenceType = ["Permitted", "Preferred", "Prohibited", "Only"].includes(
    rawCarrierPrefType
  )
    ? rawCarrierPrefType
    : "Permitted";

  const rawConnectionType = String(searchFilters.connectionType || "").trim();
  const connectionType = [
    "Any",
    "NonStopDirect",
    "StopDirect",
    "SingleConnection",
    "DoubleConnection",
  ].includes(rawConnectionType)
    ? rawConnectionType
    : "Any";

  const rawCabinPrefType = String(searchFilters.cabinPreferenceType || "").trim();
  const cabinPreferenceType = ["Permitted", "Preferred", "PreferredWithUpgrade"].includes(
    rawCabinPrefType
  )
    ? rawCabinPrefType
    : "Permitted";

  const maxConnectionDuration = normalizeIsoDuration(searchFilters.maxConnectionDuration);
  const maxOvernightDuration = normalizeIsoDuration(searchFilters.maxOvernightDuration);
  const prohibitChangeOfAirportInd =
    parseBooleanFlag(searchFilters.prohibitChangeOfAirportInd) === true;
  const excludeInterlineConnectionsInd =
    !isNdcOnly && parseBooleanFlag(searchFilters.excludeInterlineConnectionsInd) === true;
  const excludeGroundValue =
    String(searchFilters.excludeGround || "").trim() === "Train" ||
    parseBooleanFlag(searchFilters.excludeGroundTrain) === true
      ? "Train"
      : "";

  const rawFareType = String(searchFilters.fareType || "").trim();
  const fareType = [
    "PublicFaresOnly",
    "PrivateFaresOnly",
    "PublicAndPrivateFares",
  ].includes(rawFareType)
    ? rawFareType
    : "";
  const refundableOnlyInd = parseBooleanFlag(searchFilters.refundableOnlyInd) === true;
  const prohibitMinStayFaresInd =
    parseBooleanFlag(searchFilters.prohibitMinStayFaresInd) === true;
  const prohibitMaxStayFaresInd =
    parseBooleanFlag(searchFilters.prohibitMaxStayFaresInd) === true;
  const prohibitAdvancePurchaseFaresInd =
    parseBooleanFlag(searchFilters.prohibitAdvancePurchaseFaresInd) === true;
  const hasFareSelectionConstraint = Boolean(
    fareType ||
    refundableOnlyInd ||
    prohibitMinStayFaresInd ||
    prohibitMaxStayFaresInd ||
    prohibitAdvancePurchaseFaresInd
  );

  const promotionalCode = String(searchFilters.promotionalCode || "")
    .trim()
    .toUpperCase()
    .slice(0, 24);
  const explicitPromoSupplier = String(searchFilters.promotionalCodeSupplier || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 2);
  const promoSupplier =
    explicitPromoSupplier.length === 2
      ? explicitPromoSupplier
      : carrierCodes.length === 1
        ? carrierCodes[0]
        : "";

  const passengerCriteria: Array<Record<string, unknown>> = [];
  if (adultCount > 0) {
    passengerCriteria.push({
      "@type": "PassengerCriteria",
      passengerTypeCode: "ADT",
      age: 25,
      number: adultCount,
    });
  }
  if (childCount > 0) {
    passengerCriteria.push({
      "@type": "PassengerCriteria",
      passengerTypeCode: "CHD",
      age: 8,
      number: childCount,
    });
  }
  if (infantCount > 0) {
    passengerCriteria.push({
      "@type": "PassengerCriteria",
      passengerTypeCode: "INF",
      age: 1,
      number: infantCount,
    });
  }

  const searchSegments =
    body.segments?.map((segment) => ({
      "@type": "SearchCriteriaFlight",
      departureDate: segment.depdate,
      From: { value: String(segment.depfrom).toUpperCase() },
      To: { value: String(segment.arrto).toUpperCase() },
    })) ?? [];

  const shouldApplyCabinPreference = cabinClass !== "ALL";

  return {
    contentSourceList,
    payloadSegments: body.segments ?? [],
    searchRepresentation,
    request: {
      "@type": "CatalogProductOfferingsQueryRequest",
      CatalogProductOfferingsRequest: {
        "@type": "CatalogProductOfferingsRequestAir",
        maxNumberOfUpsellsToReturn: maxUpsellsToReturn,
        offersPerPage: 20,
        contentSourceList,
        ...(returnBrandedFaresFlag !== null
          ? { returnBrandedFaresInd: returnBrandedFaresFlag }
          : {}),
        PassengerCriteria: passengerCriteria,
        SearchCriteriaFlight: searchSegments,
        CustomResponseModifiersAir: {
          "@type": "CustomResponseModifiersAir",
          includeFlightAmenitiesInd: true,
          includeUniversalProductAttributesInd: true,
          excludeBaggageFeesInd: excludeBaggageFeesFlag !== false,
          includeCo2EmissionsDataInd: true,
          ...(searchRepresentation ? { SearchRepresentation: searchRepresentation } : {}),
        },
        SearchModifiersAir: {
          "@type": "SearchModifiersAir",
          ...(shouldApplyCabinPreference
            ? {
              CabinPreference: [
                {
                  "@type": "CabinPreference",
                  preferenceType: cabinPreferenceType,
                  cabins: [cabinClass],
                },
              ],
            }
            : {}),
          ...(carrierCodes.length > 0
            ? {
              CarrierPreference: [
                {
                  "@type": "CarrierPreference",
                  preferenceType: carrierPreferenceType,
                  carriers: carrierCodes,
                },
              ],
            }
            : {}),
          ConnectionPreferences: [
            {
              "@type": "ConnectionPreferencesAir",
              FlightType: {
                connectionType,
              },
            },
          ],
          ...(excludeGroundValue ? { excludeGround: excludeGroundValue } : {}),
          ...(prohibitChangeOfAirportInd ? { prohibitChangeOfAirportInd: true } : {}),
          ...(excludeInterlineConnectionsInd
            ? { excludeInterlineConnectionsInd: true }
            : {}),
          ...(maxConnectionDuration ? { maxConnectionDuration } : {}),
          ...(maxOvernightDuration ? { maxOvernightDuration } : {}),
        },
        PricingModifiersAir: {
          "@type": "PricingModifiersAir",
          currencyCode,
          ...(hasFareSelectionConstraint
            ? {
              FareSelection: {
                "@type": "FareSelectionDetail",
                ...(fareType ? { fareType } : {}),
                ...(refundableOnlyInd ? { refundableOnlyInd: true } : {}),
                ...(prohibitMinStayFaresInd ? { prohibitMinStayFaresInd: true } : {}),
                ...(prohibitMaxStayFaresInd ? { prohibitMaxStayFaresInd: true } : {}),
                ...(prohibitAdvancePurchaseFaresInd
                  ? { prohibitAdvancePurchaseFaresInd: true }
                  : {}),
              },
            }
            : {}),
          ...(hasNdc && promotionalCode && promoSupplier
            ? {
              PromotionalCode: {
                value: promotionalCode,
                supplier: promoSupplier,
              },
            }
            : {}),
        },
      },
    },
  };
}

export function toUnifiedSearchResult(
  payloadSegments: LegacySegment[],
  rawResponse: unknown,
  allowedContentSources?: string[]
): Record<string, unknown>[] {
  const data = removeAtType(rawResponse as Record<string, unknown>);

  const catalogResponse =
    (data as any)?.CatalogProductOfferingsResponse ??
    (data as any)?.CatalogProductOfferingResponse;

  const transactionId = String(catalogResponse?.transactionId ?? "");
  const catalogProductOfferingsIdentifier = String(
    catalogResponse?.CatalogProductOfferings?.Identifier?.value ?? ""
  ).trim();
  const catalogOfferings = Array.isArray(
    catalogResponse?.CatalogProductOfferings?.CatalogProductOffering
  )
    ? catalogResponse.CatalogProductOfferings.CatalogProductOffering
    : [];
  const referenceList = Array.isArray(catalogResponse?.ReferenceList)
    ? catalogResponse.ReferenceList
    : [];

  const flights =
    referenceList.find((item: any) => Array.isArray(item?.Flight))?.Flight ?? [];
  const products =
    referenceList.find((item: any) => Array.isArray(item?.Product))?.Product ??
    [];
  const termsList =
    referenceList.find((item: any) => Array.isArray(item?.TermsAndConditions))
      ?.TermsAndConditions ?? [];
  const brands =
    referenceList.find((item: any) => Array.isArray(item?.Brand))?.Brand ?? [];
  const amenities =
    referenceList.find((item: any) => Array.isArray(item?.Amenity))?.Amenity ?? [];
  const universalProductAttributes =
    referenceList.find((item: any) =>
      Array.isArray(item?.UniversalProductAttribute)
    )?.UniversalProductAttribute ?? [];

  const flightMap = new Map<string, any>(flights.map((f: any) => [f.id, f]));
  const productMap = new Map<string, any>(products.map((p: any) => [p.id, p]));
  const termsMap = new Map<string, any>(
    termsList.map((t: any) => [t.id, t as Record<string, unknown>])
  );
  const brandMap = new Map<string, any>(brands.map((brand: any) => [brand.id, brand]));
  const amenityMap = new Map<string, any>(
    amenities.map((amenity: any) => [amenity.id, amenity])
  );
  const universalProductAttributeMap = new Map<string, any>(
    universalProductAttributes.map((attribute: any) => [attribute.id, attribute])
  );

  const productBrandOfferings: Array<{
    offering: any;
    sequence: number;
    index: number;
    catalogOfferingId: string;
    contentSource: string;
  }> = [];
  const allowedSourcesSet = new Set(
    Array.isArray(allowedContentSources) && allowedContentSources.length > 0
      ? allowedContentSources
          .map((item) => String(item || "").trim().toUpperCase())
          .filter(Boolean)
      : parseBooleanFlag(process.env.TRAVELPORT_GDS_ONLY) !== false
        ? ["GDS"]
        : ["GDS", "NDC"]
  );
  const defaultSourceLabel =
    allowedSourcesSet.size === 1 ? Array.from(allowedSourcesSet)[0] : "GDS";

  for (const catalog of catalogOfferings) {
    const sequence = toNumber(catalog?.sequence, 1);
    const catalogOfferingId = String(catalog?.id ?? "").trim();
    for (const brandOption of catalog?.ProductBrandOptions ?? []) {
      for (const offering of brandOption?.ProductBrandOffering ?? []) {
        const offeringSource = String(
          (offering as any)?.ContentSource ?? (catalog as any)?.ContentSource ?? ""
        )
          .trim()
          .toUpperCase();
        if (offeringSource && !allowedSourcesSet.has(offeringSource)) {
          continue;
        }
        productBrandOfferings.push({
          offering,
          sequence,
          index: productBrandOfferings.length,
          catalogOfferingId,
          contentSource: offeringSource || defaultSourceLabel,
        });
      }
    }
  }

  const seenUnifiedIdentifiers = new Map<string, number>();

  const mappedOfferings = productBrandOfferings.map(
    ({ offering, sequence, index, catalogOfferingId, contentSource }) => {
      const bestPrice = (offering?.BestCombinablePrice ?? {}) as Record<string, unknown>;
      const termsRef = offering?.TermsAndConditions?.termsAndConditionsRef;
      const terms = (termsMap.get(termsRef) ?? {}) as Record<string, unknown>;
      const carrierCode = firstNonEmptyString(resolveCarrierCodeFromTerms(terms), "N/A");

      const penalties = Array.isArray((terms as any)?.Penalties)
        ? ((terms as any).Penalties as Array<Record<string, unknown>>)
        : [];
      const penaltiesCancellation = mapPenaltiesCancellationFromTerms(penalties as any[]);
      const refundable = penalties.some(
        (entry) => Array.isArray((entry as any)?.Cancel) && (entry as any).Cancel.length > 0
      );

      const productRef = offering?.Product?.[0]?.productRef;
      const product = (productMap.get(productRef) ?? {}) as Record<string, unknown>;
      const productSegments = Array.isArray(product?.FlightSegment)
        ? (product.FlightSegment as Array<Record<string, unknown>>)
        : [];

      const firstPassengerFlight = Array.isArray((product as any)?.PassengerFlight)
        ? (product as any).PassengerFlight[0]
        : {};
      const firstFlightProduct =
        Array.isArray(firstPassengerFlight?.FlightProduct) &&
          firstPassengerFlight.FlightProduct.length > 0
          ? (firstPassengerFlight.FlightProduct[0] as Record<string, unknown>)
          : {};
      const brandRef =
        (firstFlightProduct as any)?.Brand?.BrandRef ??
        (firstFlightProduct as any)?.Brand?.brandRef ??
        (offering as any)?.Brand?.BrandRef ??
        (offering as any)?.Brand?.brandRef ??
        (product as any)?.Brand?.BrandRef ??
        (product as any)?.Brand?.brandRef;
      const brandDetails = (brandMap.get(brandRef) ?? null) as
        | Record<string, unknown>
        | null;

      const mappedSegments = productSegments.map((segment) => {
        const flightRef = (segment as any)?.Flight?.FlightRef;
        const flight = (flightMap.get(flightRef) ?? {}) as Record<string, unknown>;
        const amenityRefs = Array.isArray((segment as any)?.amenityRefs)
          ? (segment as any).amenityRefs.map((ref: unknown) => String(ref))
          : [];
        const universalAttributeRefs = Array.isArray(
          (segment as any)?.universalProductAttributeRefs
        )
          ? (segment as any).universalProductAttributeRefs.map((ref: unknown) =>
            String(ref)
          )
          : [];

        const mappedAmenities = amenityRefs
          .map((ref) => amenityMap.get(ref))
          .filter(Boolean)
          .map((item: any) => toAmenityItem(item));

        const mappedUniversalAttributes = universalAttributeRefs
          .map((ref) => universalProductAttributeMap.get(ref))
          .filter(Boolean)
          .map((item: any) => toUniversalProductAttributeItem(item));

        const marketingCarrierCode = firstNonEmptyString(
          (flight as any)?.carrier,
          carrierCode
        );
        const operatingCarrierCode = firstNonEmptyString(
          (flight as any)?.operatingCarrier,
          marketingCarrierCode,
          carrierCode
        );
        const marketingCarrierName = firstNonEmptyString(
          (flight as any)?.carrierName,
          (flight as any)?.marketingCarrierName,
          operatingCarrierCode === marketingCarrierCode
            ? (flight as any)?.operatingCarrierName
            : "",
          marketingCarrierCode
        );
        const operatingCarrierName = firstNonEmptyString(
          (flight as any)?.operatingCarrierName,
          (flight as any)?.carrierName,
          operatingCarrierCode
        );

        return {
          marketingCarrier: marketingCarrierCode,
          marketingCarrierName,
          marketingFlightNumber: String((flight as any)?.number ?? "N/A"),
          operatingCarrier: operatingCarrierCode,
          operatingFlightNumber: String(
            (flight as any)?.operatingCarrierNumber ??
            (flight as any)?.number ??
            "N/A"
          ),
          operatingCarrierName,
          depFrom: String((flight as any)?.Departure?.location ?? ""),
          depAirport: String((flight as any)?.Departure?.location ?? ""),
          depLocation: String((flight as any)?.Departure?.location ?? ""),
          depDateAdjustment: 0,
          depTime: formatDateTime(
            (flight as any)?.Departure?.date,
            (flight as any)?.Departure?.time
          ),
          arrTo: String((flight as any)?.Arrival?.location ?? ""),
          arrAirport: String((flight as any)?.Arrival?.location ?? ""),
          arrLocation: String((flight as any)?.Arrival?.location ?? ""),
          arrDateAdjustment: 0,
          arrTime: formatDateTime(
            (flight as any)?.Arrival?.date,
            (flight as any)?.Arrival?.time
          ),
          operatedBy: operatingCarrierCode,
          stopCount: toNumber((flight as any)?.stopCount, 0),
          duration:
            typeof (flight as any)?.duration === "string" && (flight as any).duration
              ? String((flight as any).duration)
              : durationMinutesToIso(parseDurationToMinutes((flight as any)?.duration)),
          aircraftTypeName: String((flight as any)?.equipment ?? "N/A"),
          departureGate: String((flight as any)?.Departure?.terminal ?? "TBA"),
          arrivalGate: String((flight as any)?.Arrival?.terminal ?? "TBA"),
          hiddenStops: Array.isArray((flight as any)?.hiddenStops)
            ? (flight as any).hiddenStops
            : [],
          totalMilesFlown: toNumber(
            (segment as any)?.distance ??
            (segment as any)?.Distance ??
            (flight as any)?.distance ??
            0,
            0
          ),
          availabilitySourceCode: firstNonEmptyString(
            (flight as any)?.AvailabilitySourceCode,
            (flight as any)?.availabilitySourceCode,
            (segment as any)?.AvailabilitySourceCode,
            (segment as any)?.availabilitySourceCode,
            "N/A"
          ),
          contentSource: firstNonEmptyString(
            (segment as any)?.ContentSource,
            (segment as any)?.contentSource,
            (flight as any)?.ContentSource,
            (flight as any)?.contentSource,
            contentSource
          ),
          brandTier:
            brandDetails?.tier !== undefined && brandDetails?.tier !== null
              ? String(brandDetails.tier)
              : null,
          segmentCode: {
            bookingCode: String((firstFlightProduct as any)?.classOfService ?? ""),
            cabinCode: String((firstFlightProduct as any)?.cabin ?? "Economy"),
            seatsAvailable: toNumber((product as any)?.Quantity, 9),
            fareBasisCode: String((firstFlightProduct as any)?.fareBasisCode ?? ""),
            fareTypeCode: String((firstFlightProduct as any)?.fareType ?? ""),
          },
          amenities: mappedAmenities,
          amenityRefs,
          universalProductAttributeRefs: universalAttributeRefs,
          universalProductAttributes: mappedUniversalAttributes,
        };
      });

      const firstMappedSegment = mappedSegments[0] as Record<string, unknown> | undefined;
      const lastMappedSegment = mappedSegments[mappedSegments.length - 1] as
        | Record<string, unknown>
        | undefined;
      const resolvedCarrierCode = firstNonEmptyString(
        carrierCode,
        firstMappedSegment?.marketingCarrier,
        firstMappedSegment?.operatingCarrier,
        "N/A"
      );
      const resolvedCarrierName = resolveCarrierNameFromSegments(
        mappedSegments as Array<Record<string, unknown>>,
        resolvedCarrierCode
      );
      const requestedSegment = (payloadSegments[sequence - 1] ??
        payloadSegments[0] ??
        {}) as Partial<LegacySegment>;

      const allLegsInfo = [
        {
          departureDate:
            String(firstMappedSegment?.depTime ?? "").split("T")[0] ||
            String(requestedSegment?.depdate ?? ""),
          departureFrom:
            String(requestedSegment?.depfrom ?? "") ||
            String(firstMappedSegment?.depFrom ?? ""),
          arrivalTo:
            String(requestedSegment?.arrto ?? "") ||
            String(lastMappedSegment?.arrTo ?? ""),
          totalDuration:
            typeof (product as any)?.totalDuration === "string" &&
              (product as any).totalDuration
              ? String((product as any).totalDuration)
              : durationMinutesToIso(
                parseDurationToMinutes((product as any)?.totalDuration)
              ),
          brandName: brandDetails?.name ? String(brandDetails.name) : null,
          brandCode: brandDetails?.code ? String(brandDetails.code) : null,
          brandTier:
            brandDetails?.tier !== undefined && brandDetails?.tier !== null
              ? String(brandDetails.tier)
              : null,
          brandFeatures: brandDetails,
          segments: mappedSegments,
        },
      ];

      const fallbackCurrency =
        String(
          (bestPrice as any)?.CurrencyCode?.value ??
          (bestPrice as any)?.CurrencyCode ??
          process.env.TRAVELPORT_DEFAULT_CURRENCY ??
          "USD"
        ) || "USD";

      const priceBreakDown = Array.isArray((bestPrice as any)?.PriceBreakdown)
        ? ((bestPrice as any).PriceBreakdown as Array<Record<string, unknown>>).map(
          (paxRow) => {
            const paxTypeCode = toPaxTypeCode((paxRow as any)?.requestedPassengerType);
            return {
              paxType: paxTypeCode,
              baseFare: toNumber((paxRow as any)?.Amount?.Base, 0),
              taxes: toNumber((paxRow as any)?.Amount?.Taxes?.TotalTaxes, 0),
              totalFare: toNumber((paxRow as any)?.Amount?.Total, 0),
              paxCount: Math.max(1, toNumber((paxRow as any)?.quantity, 1)),
              bag: mapUnifiedBaggageAllowances(
                terms,
                paxTypeCode,
                resolvedCarrierCode
              ),
              fareComponent: {},
            };
          }
        )
        : [];

      const offeringId = String((offering as any)?.id ?? "").trim();
      const offeringIdentifierValue = String(
        (offering as any)?.Identifier?.value ?? ""
      ).trim();
      const mappedOfferIdentifier =
        catalogOfferingId || offeringId || offeringIdentifierValue;
      const mappedProductIdentifiers = Array.isArray((offering as any)?.Product)
        ? (offering as any).Product
          .map((item: any) => String(item?.productRef ?? item?.id ?? "").trim())
          .filter(Boolean)
        : [];

      const grossFare = toNumber((bestPrice as any)?.TotalPrice, 0);
      const netFare = grossFare;
      const baseIdentifier =
        mappedOfferIdentifier ||
        `${transactionId || "TP"}-${sequence}-${String(index + 1).padStart(3, "0")}`;
      const identifierOccurrence = (seenUnifiedIdentifiers.get(baseIdentifier) ?? 0) + 1;
      seenUnifiedIdentifiers.set(baseIdentifier, identifierOccurrence);
      const identifier =
        identifierOccurrence === 1
          ? baseIdentifier
          : offeringId && offeringId !== baseIdentifier
            ? `${baseIdentifier}__${offeringId}__${identifierOccurrence}`
            : `${baseIdentifier}__${identifierOccurrence}`;
      const firstSegmentCode = (firstMappedSegment?.segmentCode ??
        {}) as Record<string, unknown>;
      const amenityCollection = toAmenityCollectionFromBrand(brandDetails);

      const unified = {
        provider: "Travelport",
        contentSource,
        transactionId,
        identifier,
        offerIdentifier: mappedOfferIdentifier || identifier,
        OfferIdentifier: mappedOfferIdentifier || identifier,
        offerListIdentifier: catalogProductOfferingsIdentifier,
        productIdentifiers: mappedProductIdentifiers,
        farePolicyRequest:
          mappedOfferIdentifier || identifier
            ? {
              offerIdentifier: mappedOfferIdentifier || identifier,
              offerListIdentifier: catalogProductOfferingsIdentifier,
              productIdentifiers: mappedProductIdentifiers,
            }
            : null,
        instantPayment: false,
        issuePermit: true,
        isBookable: true,
        journeyType: payloadSegments.length > 1 ? "ROUND_TRIP" : "ONE_WAY",
        tripType: payloadSegments.length > 1 ? "ROUND_TRIP" : "ONE_WAY",
        fareType: String((firstFlightProduct as any)?.fareType ?? "PublicFare"),
        carrierCode: resolvedCarrierCode,
        carrierName: resolvedCarrierName,
        cabinClass: String((firstSegmentCode as any)?.cabinCode ?? "Economy"),
        currencyCode: fallbackCurrency,
        baseFare: toNumber((bestPrice as any)?.Base, 0),
        taxes: toNumber((bestPrice as any)?.TotalTaxes, 0),
        netFare,
        grossFare,
        markUp: String(Math.max(grossFare - netFare, 0)),
        timeLimit: (terms as any)?.PaymentTimeLimit ?? null,
        refundable,
        totalSegments: mappedSegments.length,
        amenities: amenityCollection,
        penaltiesCancellation,
        priceBreakDown,
        allLegsInfo,
        combination: Array.isArray((offering as any)?.CombinabilityCode)
          ? (offering as any).CombinabilityCode.map((value: unknown) => String(value)).join(" x ")
          : "",
      };

      return {
        unified,
        sequence,
        combinabilityCodes: Array.isArray((offering as any)?.CombinabilityCode)
          ? (offering as any).CombinabilityCode.map((item: unknown) => String(item))
          : [],
      };
    }
  );

  if (payloadSegments.length <= 1) {
    return mappedOfferings
      .map((item) => item.unified)
      .sort((a, b) => toNumber((a as any)?.netFare, 0) - toNumber((b as any)?.netFare, 0));
  }

  const requiredSequences = Array.from(
    { length: payloadSegments.length },
    (_, idx) => idx + 1
  );
  const groupedByCode = new Map<string, Map<number, Array<Record<string, unknown>>>>();

  for (const option of mappedOfferings) {
    const combinationCodes =
      option.combinabilityCodes.length > 0
        ? option.combinabilityCodes
        : ["__NO_COMBINABILITY__"];

    for (const code of combinationCodes) {
      if (!groupedByCode.has(code)) {
        groupedByCode.set(code, new Map<number, Array<Record<string, unknown>>>());
      }
      const sequenceMap = groupedByCode.get(code)!;
      if (!sequenceMap.has(option.sequence)) {
        sequenceMap.set(option.sequence, []);
      }
      sequenceMap.get(option.sequence)!.push(option.unified);
    }
  }

  const combinedOptions: Array<Record<string, unknown>> = [];

  for (const [combinabilityCode, sequenceMap] of groupedByCode) {
    const hasAllSequences = requiredSequences.every((seq) => sequenceMap.has(seq));
    if (!hasAllSequences) {
      continue;
    }

    const currentSelection: Array<Record<string, unknown>> = [];
    const maxCombinedOptions = 500;

    const buildCombinations = (index: number) => {
      if (combinedOptions.length >= maxCombinedOptions) {
        return;
      }
      if (index >= requiredSequences.length) {
        const selectedLegs = [...currentSelection];
        const firstLeg = selectedLegs[0] ?? {};
        const primaryOfferIdentifier =
          String(
            (firstLeg as any)?.offerIdentifier ??
            (firstLeg as any)?.OfferIdentifier ??
            (firstLeg as any)?.identifier ??
            ""
          ).trim() || "";
        const combinedProductIdentifiers = Array.from(
          new Set(
            selectedLegs.flatMap((item) => {
              if (Array.isArray((item as any)?.productIdentifiers)) {
                return (item as any).productIdentifiers
                  .map((value: unknown) => String(value ?? "").trim())
                  .filter(Boolean);
              }
              const nested = (item as any)?.farePolicyRequest;
              if (nested && Array.isArray(nested.productIdentifiers)) {
                return nested.productIdentifiers
                  .map((value: unknown) => String(value ?? "").trim())
                  .filter(Boolean);
              }
              return [];
            })
          )
        );
        const mergedLegs = selectedLegs.flatMap((item) =>
          Array.isArray((item as any)?.allLegsInfo)
            ? ((item as any).allLegsInfo as Array<Record<string, unknown>>)
            : []
        );
        const mergedPenalties = selectedLegs.reduce<{
          change: unknown[];
          cancel: unknown[];
        }>((acc, item) => {
          const penalties = ((item as any)?.penaltiesCancellation ?? {}) as Record<
            string,
            unknown
          >;
          if (Array.isArray(penalties.change)) {
            acc.change.push(...(penalties.change as unknown[]));
          }
          if (Array.isArray(penalties.cancel)) {
            acc.cancel.push(...(penalties.cancel as unknown[]));
          }
          return acc;
        },
          { change: [] as unknown[], cancel: [] as unknown[] }
        );

        combinedOptions.push({
          ...firstLeg,
          identifier: selectedLegs
            .map((item) => String((item as any)?.identifier ?? ""))
            .filter(Boolean)
            .join("_"),
          offerIdentifier: primaryOfferIdentifier || null,
          OfferIdentifier: primaryOfferIdentifier || null,
          productIdentifiers: combinedProductIdentifiers,
          farePolicyRequest: primaryOfferIdentifier
            ? {
              offerIdentifier: primaryOfferIdentifier,
              offerListIdentifier:
                String((firstLeg as any)?.offerListIdentifier ?? "").trim() ||
                catalogProductOfferingsIdentifier,
              productIdentifiers: combinedProductIdentifiers,
            }
            : null,
          journeyType: "ROUND_TRIP",
          tripType: "ROUND_TRIP",
          allLegsInfo: mergedLegs,
          totalSegments: mergedLegs.reduce((sum, leg) => {
            const segments = Array.isArray((leg as any)?.segments)
              ? ((leg as any).segments as unknown[])
              : [];
            return sum + segments.length;
          }, 0),
          penaltiesCancellation: mergedPenalties,
          combination: combinabilityCode,
        });
        return;
      }

      const sequence = requiredSequences[index];
      const sequenceItems = sequenceMap.get(sequence) ?? [];
      for (const item of sequenceItems) {
        currentSelection.push(item);
        buildCombinations(index + 1);
        currentSelection.pop();
      }
    };

    buildCombinations(0);
  }

  const deduped = Array.from(
    combinedOptions.reduce((map, item) => {
      const key = String((item as any)?.identifier ?? "");
      if (key && !map.has(key)) {
        map.set(key, item);
      }
      return map;
    }, new Map<string, Record<string, unknown>>()).values()
  );

  return deduped.sort((a, b) => {
    const fareDiff =
      toNumber((a as any)?.netFare, Number.MAX_SAFE_INTEGER) -
      toNumber((b as any)?.netFare, Number.MAX_SAFE_INTEGER);
    if (fareDiff !== 0) return fareDiff;

    const durationA = ((a as any)?.allLegsInfo ?? []).reduce(
      (sum: number, leg: Record<string, unknown>) =>
        sum + parseDurationToMinutes((leg as any)?.totalDuration),
      0
    );
    const durationB = ((b as any)?.allLegsInfo ?? []).reduce(
      (sum: number, leg: Record<string, unknown>) =>
        sum + parseDurationToMinutes((leg as any)?.totalDuration),
      0
    );
    return durationA - durationB;
  });
}

export function toLegacySearchResult(
  payloadSegments: LegacySegment[],
  rawResponse: unknown
): unknown[] {
  const data = removeAtType(rawResponse as Record<string, unknown>);

  const catalogResponse =
    (data as any)?.CatalogProductOfferingsResponse ??
    (data as any)?.CatalogProductOfferingResponse;

  const transactionId = catalogResponse?.transactionId || "";
  const catalogProductOfferingsIdentifierRaw = String(
    catalogResponse?.CatalogProductOfferings?.Identifier?.value ?? ""
  ).trim();
  const catalogProductOfferingsIdentifier = catalogProductOfferingsIdentifierRaw
    ? /_PC$/i.test(catalogProductOfferingsIdentifierRaw)
      ? catalogProductOfferingsIdentifierRaw
      : `${catalogProductOfferingsIdentifierRaw}_PC`
    : "";
  const catalogOfferings = Array.isArray(
    catalogResponse?.CatalogProductOfferings?.CatalogProductOffering
  )
    ? catalogResponse.CatalogProductOfferings.CatalogProductOffering
    : [];
  const referenceList = Array.isArray(catalogResponse?.ReferenceList)
    ? catalogResponse.ReferenceList
    : [];

  const flights =
    referenceList.find((item: any) => Array.isArray(item?.Flight))?.Flight ?? [];
  const products =
    referenceList.find((item: any) => Array.isArray(item?.Product))?.Product ??
    [];
  const termsList =
    referenceList.find((item: any) => Array.isArray(item?.TermsAndConditions))
      ?.TermsAndConditions ?? [];
  const brands =
    referenceList.find((item: any) => Array.isArray(item?.Brand))?.Brand ?? [];
  const amenities =
    referenceList.find((item: any) => Array.isArray(item?.Amenity))?.Amenity ?? [];
  const universalProductAttributes =
    referenceList.find((item: any) =>
      Array.isArray(item?.UniversalProductAttribute)
    )?.UniversalProductAttribute ?? [];

  const flightMap = new Map<string, any>(flights.map((f: any) => [f.id, f]));
  const productMap = new Map<string, any>(products.map((p: any) => [p.id, p]));
  const termsMap = new Map<string, any>(
    termsList.map((t: any) => [t.id, t as Record<string, unknown>])
  );
  const brandMap = new Map<string, any>(brands.map((brand: any) => [brand.id, brand]));
  const amenityMap = new Map<string, any>(
    amenities.map((amenity: any) => [amenity.id, amenity])
  );
  const universalProductAttributeMap = new Map<string, any>(
    universalProductAttributes.map((attribute: any) => [attribute.id, attribute])
  );

  const productBrandOfferings: Array<{
    offering: any;
    sequence: number;
    index: number;
    catalogOfferingId: string;
  }> = [];
  const gdsOnly = parseBooleanFlag(process.env.TRAVELPORT_GDS_ONLY) !== false;
  for (const catalog of catalogOfferings) {
    const sequence = toNumber(catalog?.sequence, 1);
    const catalogOfferingId = String(catalog?.id ?? "").trim();
    for (const brandOption of catalog?.ProductBrandOptions ?? []) {
      for (const offering of brandOption?.ProductBrandOffering ?? []) {
        const offeringSource = String(
          (offering as any)?.ContentSource ?? (catalog as any)?.ContentSource ?? ""
        )
          .trim()
          .toUpperCase();
        if (gdsOnly && offeringSource && offeringSource !== "GDS") {
          continue;
        }
        productBrandOfferings.push({
          offering,
          sequence,
          index: productBrandOfferings.length,
          catalogOfferingId,
        });
      }
    }
  }

  const seenLegacyResultIds = new Map<string, number>();

  const baseResults = productBrandOfferings.map(
    ({ offering, sequence, index, catalogOfferingId }: any) => {
      const bestPrice = offering?.BestCombinablePrice ?? {};
      const termsRef = offering?.TermsAndConditions?.termsAndConditionsRef;
      const terms = termsMap.get(termsRef) ?? {};
      const carrierCode = firstNonEmptyString(
        resolveCarrierCodeFromTerms(terms),
        "N/A"
      );

      const penalties = Array.isArray(terms?.Penalties) ? terms.Penalties : [];
      const penaltiesCancellation = mapPenaltiesCancellationFromTerms(penalties);
      const refundable = penalties.some(
        (p: any) => Array.isArray(p?.Cancel) && p.Cancel.length > 0
      );

      const productRef = offering?.Product?.[0]?.productRef;
      const product = productMap.get(productRef) ?? {};
      const productSegments = Array.isArray(product?.FlightSegment)
        ? product.FlightSegment
        : [];

      const firstPassengerFlight = Array.isArray(product?.PassengerFlight)
        ? product.PassengerFlight[0]
        : {};
      const firstFlightProduct = firstPassengerFlight?.FlightProduct?.[0] ?? {};
      const brandRef = firstFlightProduct?.Brand?.BrandRef;
      const brandDetails = brandMap.get(brandRef) ?? null;

      const mappedSegments = productSegments.map((segment: any) => {
        const flightRef = segment?.Flight?.FlightRef;
        const flight = flightMap.get(flightRef) ?? {};
        const amenityRefs = Array.isArray(segment?.amenityRefs)
          ? segment.amenityRefs.map((ref: unknown) => String(ref))
          : [];
        const universalAttributeRefs = Array.isArray(
          segment?.universalProductAttributeRefs
        )
          ? segment.universalProductAttributeRefs.map((ref: unknown) => String(ref))
          : [];

        const mappedAmenities = amenityRefs
          .map((ref: string) => amenityMap.get(ref))
          .filter(Boolean)
          .map((item: any) => toAmenityItem(item));

        const amenitiesByCategory = mappedAmenities.reduce(
          (acc: Record<string, string[]>, item: any) => {
            const category = String(item?.category || "Other");
            if (!acc[category]) {
              acc[category] = [];
            }
            if (item?.text) {
              acc[category].push(String(item.text));
            }
            return acc;
          },
          {}
        );

        const mappedUniversalAttributes = universalAttributeRefs
          .map((ref: string) => universalProductAttributeMap.get(ref))
          .filter(Boolean)
          .map((item: any) => toUniversalProductAttributeItem(item));

        const marketingCarrierCode = firstNonEmptyString(flight?.carrier, carrierCode);
        const operatingCarrierCode = firstNonEmptyString(
          flight?.operatingCarrier,
          marketingCarrierCode,
          carrierCode
        );
        const marketingCarrierName = firstNonEmptyString(
          flight?.carrierName,
          flight?.marketingCarrierName,
          operatingCarrierCode === marketingCarrierCode
            ? flight?.operatingCarrierName
            : "",
          marketingCarrierCode
        );
        const operatingCarrierName = firstNonEmptyString(
          flight?.operatingCarrierName,
          flight?.carrierName,
          operatingCarrierCode
        );

        return {
          MarketingCarrier: marketingCarrierCode,
          MarketingCarrierName: marketingCarrierName,
          MarketingFlightNumber: flight?.number ?? "N/A",
          OperatingCarrier: operatingCarrierCode,
          OperatingFlightNumber:
            flight?.operatingCarrierNumber ?? flight?.number ?? "N/A",
          OperatingCarrierName: operatingCarrierName,
          DepFrom: flight?.Departure?.location ?? "",
          DepAirPort: flight?.Departure?.location ?? "",
          DepLocation: flight?.Departure?.location ?? "",
          DepDateAdjustment: 0,
          DepTime: formatDateTime(flight?.Departure?.date, flight?.Departure?.time),
          ArrTo: flight?.Arrival?.location ?? "",
          ArrAirPort: flight?.Arrival?.location ?? "",
          ArrLocation: flight?.Arrival?.location ?? "",
          ArrDateAdjustment: 0,
          ArrTime: formatDateTime(flight?.Arrival?.date, flight?.Arrival?.time),
          OperatedBy: operatingCarrierCode,
          StopCount: flight?.stopCount ?? 0,
          Duration: parseDurationToMinutes(flight?.duration),
          DurationIso: flight?.duration ?? durationMinutesToIso(parseDurationToMinutes(flight?.duration)),
          ConnectionDuration: parseDurationToMinutes(segment?.connectionDuration),
          ConnectionDurationIso: segment?.connectionDuration ?? null,
          AircraftTypeName: flight?.equipment ?? "N/A",
          Amenities: {
            amenityRefs,
            universalProductAttributeRefs: universalAttributeRefs,
            items: mappedAmenities,
            byCategory: amenitiesByCategory,
            universalProductAttributes: mappedUniversalAttributes,
          },
          DepartureGate: flight?.Departure?.terminal ?? "TBA",
          ArrivalGate: flight?.Arrival?.terminal ?? "TBA",
          HiddenStops: flight?.hiddenStops ?? [],
          SegmentCode: {
            bookingCode: firstFlightProduct?.classOfService ?? "",
            cabinCode: firstFlightProduct?.cabin ?? "Economy",
            seatsAvailable: product?.Quantity || 9,
          },
        };
      });

      const requestedSegment = (payloadSegments[sequence - 1] ??
        payloadSegments[0] ??
        {}) as Partial<LegacySegment>;
      const firstMappedSegment = mappedSegments[0];
      const lastMappedSegment = mappedSegments[mappedSegments.length - 1];
      const resolvedCarrierCode = firstNonEmptyString(
        carrierCode,
        firstMappedSegment?.MarketingCarrier,
        firstMappedSegment?.OperatingCarrier,
        "N/A"
      );
      const resolvedCarrierName = resolveCarrierNameFromSegments(
        mappedSegments as Array<Record<string, unknown>>,
        resolvedCarrierCode
      );

      const priceBreakDown =
        bestPrice?.PriceBreakdown?.map((pax: any) => {
          const paxType = pax?.requestedPassengerType;
          const passengerAllowance = Array.isArray(terms?.BaggageAllowance)
            ? terms.BaggageAllowance.filter((item: any) =>
              Array.isArray(item?.passengerTypeCodes)
                ? item.passengerTypeCodes.includes(paxType)
                : false
            )
            : [];

          const bagItem = passengerAllowance
            .flatMap((allowance: any) => allowance?.BaggageItem ?? [])
            .find((item: any) => item?.includedInOfferPrice === "Yes");

          const bagAllowance = extractBaggageAllowance(
            bagItem?.Text,
            toNumber(bagItem?.quantity, 0)
          );

          return {
            PaxType: mapPaxType(paxType),
            CurrencyCode:
              pax?.Amount?.CurrencyCode?.value ||
              pax?.Amount?.CurrencyCode ||
              bestPrice?.CurrencyCode?.value ||
              bestPrice?.CurrencyCode ||
              process.env.TRAVELPORT_DEFAULT_CURRENCY ||
              "USD",
            BaseFare: toNumber(pax?.Amount?.Base, 0),
            Taxes: toNumber(pax?.Amount?.Taxes?.TotalTaxes, 0),
            ServiceFee: 0,
            OtherCharges: 0,
            TotalFare: toNumber(pax?.Amount?.Total, 0),
            PaxCount: toNumber(pax?.quantity, 1),
            Bag: [
              {
                Airline: resolvedCarrierCode,
                Allowance: bagAllowance,
              },
            ],
            FareComponent: [],
          };
        }) ?? [];

      const allLegsInfo = [
        {
          DepDate:
            firstMappedSegment?.DepTime ||
            formatDateTime(requestedSegment?.depdate, "00:00:00"),
          DepFrom:
            requestedSegment?.depfrom || firstMappedSegment?.DepFrom || "",
          ArrTo: requestedSegment?.arrto || lastMappedSegment?.ArrTo || "",
          Duration: parseDurationToMinutes(product?.totalDuration),
          TotalDurationISO:
            product?.totalDuration ??
            durationMinutesToIso(parseDurationToMinutes(product?.totalDuration)),
          BrandName: brandDetails?.name ?? null,
          BrandCode: brandDetails?.code ?? null,
          BrandFeatures: brandDetails,
          Segments: mappedSegments,
        },
      ];

      const grossFare = toNumber(bestPrice?.TotalPrice, 0);
      const mappedProductIdentifiers = Array.isArray(offering?.Product)
        ? offering.Product
          .map((item: any) => String(item?.productRef ?? item?.id ?? "").trim())
          .filter(Boolean)
        : [];
      const legacyOfferIdentifier =
        String(catalogOfferingId ?? "").trim() ||
        String(offering?.id ?? "").trim() ||
        offering?.Identifier?.value ||
        `${transactionId || "TP"}-${sequence}-${String(index + 1).padStart(
          3,
          "0"
        )}`;
      const legacyOfferingId = String(offering?.id ?? "").trim();
      const legacyOccurrence = (seenLegacyResultIds.get(legacyOfferIdentifier) ?? 0) + 1;
      seenLegacyResultIds.set(legacyOfferIdentifier, legacyOccurrence);
      const resultId =
        legacyOccurrence === 1
          ? legacyOfferIdentifier
          : legacyOfferingId && legacyOfferingId !== legacyOfferIdentifier
            ? `${legacyOfferIdentifier}__${legacyOfferingId}__${legacyOccurrence}`
            : `${legacyOfferIdentifier}__${legacyOccurrence}`;

      return {
        legacy: {
          System: "travelport",
          ResultId: resultId,
          SearchId: transactionId || "TRAVELPORT-SEARCH",
          InstantPayment: false,
          IsBookable: true,
          TripType: payloadSegments.length === 1 ? "Oneway" : "Return",
          FareType: firstFlightProduct?.fareType || "NET",
          Carrier: resolvedCarrierCode,
          CarrierName: resolvedCarrierName,
          CurrencyCode:
            bestPrice?.CurrencyCode?.value ||
            bestPrice?.CurrencyCode ||
            process.env.TRAVELPORT_DEFAULT_CURRENCY ||
            "USD",
          BaseFare: toNumber(bestPrice?.Base, 0),
          Taxes: toNumber(bestPrice?.TotalTaxes, 0),
          SerViceFee: 0,
          NetFare: grossFare,
          GrossFare: grossFare,
          PartialOption: false,
          PartialFare: 0,
          TimeLimit: terms?.PaymentTimeLimit || null,
          Refundable: refundable,
          penaltiesCancellation,
          ExtraService: null,
          PriceBreakDown: priceBreakDown,
          AllLegsInfo: allLegsInfo,
          offerIdentifier: legacyOfferIdentifier,
          OfferIdentifier: legacyOfferIdentifier,
          offerListIdentifier: catalogProductOfferingsIdentifier,
          productIdentifiers: mappedProductIdentifiers,
          farePolicyRequest: {
            offerIdentifier: legacyOfferIdentifier,
            offerListIdentifier: catalogProductOfferingsIdentifier,
            productIdentifiers: mappedProductIdentifiers,
          },
        },
        sequence,
        combinabilityCodes: Array.isArray(offering?.CombinabilityCode)
          ? offering.CombinabilityCode.map((item: unknown) => String(item))
          : [],
      };
    }
  );

  if (payloadSegments.length <= 1) {
    return baseResults
      .map((item: any) => item.legacy)
      .sort((a: any, b: any) => a.NetFare - b.NetFare);
  }

  const requiredSequences = Array.from(
    { length: payloadSegments.length },
    (_, idx) => idx + 1
  );
  const groupedByCode = new Map<string, Map<number, any[]>>();

  for (const option of baseResults) {
    const combinationCodes =
      option.combinabilityCodes.length > 0
        ? option.combinabilityCodes
        : ["__NO_COMBINABILITY__"];

    for (const code of combinationCodes) {
      if (!groupedByCode.has(code)) {
        groupedByCode.set(code, new Map<number, any[]>());
      }
      const sequenceMap = groupedByCode.get(code)!;
      if (!sequenceMap.has(option.sequence)) {
        sequenceMap.set(option.sequence, []);
      }
      sequenceMap.get(option.sequence)!.push(option);
    }
  }

  const combinedOptions: any[] = [];
  for (const [, sequenceMap] of groupedByCode) {
    const hasAllSequences = requiredSequences.every((seq) => sequenceMap.has(seq));
    if (!hasAllSequences) {
      continue;
    }

    const currentSelection: any[] = [];
    const buildCombinations = (index: number) => {
      if (index >= requiredSequences.length) {
        const selectedLegs = currentSelection.map((item) => item.legacy);
        const firstLeg = selectedLegs[0];
        const mergedLegs = selectedLegs.flatMap((item: any) =>
          Array.isArray(item?.AllLegsInfo) ? item.AllLegsInfo : []
        );

        combinedOptions.push({
          ...firstLeg,
          ResultId: selectedLegs.map((item: any) => item.ResultId).join("_"),
          TripType: "Return",
          AllLegsInfo: mergedLegs,
          penaltiesCancellation: mergePenaltiesCancellation(
            selectedLegs as Array<Record<string, unknown>>
          ),
        });
        return;
      }

      const sequence = requiredSequences[index];
      const sequenceItems = sequenceMap.get(sequence) ?? [];
      for (const item of sequenceItems) {
        currentSelection.push(item);
        buildCombinations(index + 1);
        currentSelection.pop();
      }
    };

    buildCombinations(0);
  }

  const deduped = Array.from(
    combinedOptions.reduce((map: Map<string, any>, item: any) => {
      if (!map.has(item.ResultId)) {
        map.set(item.ResultId, item);
      }
      return map;
    }, new Map<string, any>()).values()
  );

  return deduped.sort((a: any, b: any) => {
    const netFareDiff = toNumber(a?.NetFare, Number.MAX_SAFE_INTEGER) -
      toNumber(b?.NetFare, Number.MAX_SAFE_INTEGER);
    if (netFareDiff !== 0) {
      return netFareDiff;
    }

    const durationA = (a?.AllLegsInfo ?? []).reduce(
      (sum: number, leg: any) => sum + toNumber(leg?.Duration, 0),
      0
    );
    const durationB = (b?.AllLegsInfo ?? []).reduce(
      (sum: number, leg: any) => sum + toNumber(leg?.Duration, 0),
      0
    );
    return durationA - durationB;
  });
}

async function loadSampleUnifiedFallback(
  payloadSegments: LegacySegment[]
): Promise<{ source: string; results: unknown[] } | null> {
  const isRoundTripRequest = payloadSegments.length > 1;
  const filterByRequestedTripType = (
    items: Array<Record<string, unknown>>
  ): Array<Record<string, unknown>> => {
    if (!isRoundTripRequest) {
      return items;
    }

    return items.filter((item) => {
      const tripType = normalizeTripType(item?.tripType ?? item?.journeyType);
      const legs = Array.isArray(item?.allLegsInfo) ? item.allLegsInfo : [];
      return tripType === "ROUND_TRIP" || legs.length > 1;
    });
  };

  const candidateRawFiles = ["roundtripdata.json", "flightsearchresponse.json"];

  for (const filename of candidateRawFiles) {
    const rawSample = await readSampleJson<Record<string, unknown>>(filename);
    if (!rawSample || typeof rawSample !== "object") {
      continue;
    }

    const mapped = toUnifiedSearchResult(payloadSegments, rawSample).filter(
      (item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === "object"
    );
    const filtered = filterByRequestedTripType(mapped);
    if (filtered.length > 0) {
      return { source: `sample/${filename}`, results: filtered };
    }
  }

  const latestUnifiedList = await readSampleJson<Record<string, unknown>[]>(
    "LatestUnifiedModel.json"
  );
  if (Array.isArray(latestUnifiedList) && latestUnifiedList.length > 0) {
    const filtered = filterByRequestedTripType(
      latestUnifiedList.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object"
      )
    );
    if (filtered.length > 0) {
      return { source: "sample/LatestUnifiedModel.json", results: filtered };
    }
  }

  const unifiedListSample = await readSampleJson<Record<string, unknown>[]>(
    "flightResponseUnifiedModelList.json"
  );
  if (Array.isArray(unifiedListSample) && unifiedListSample.length > 0) {
    const filtered = filterByRequestedTripType(
      unifiedListSample.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object"
      )
    );
    if (filtered.length > 0) {
      return {
        source: "sample/flightResponseUnifiedModelList.json",
        results: filtered,
      };
    }
  }

  const unifiedSingleSample = await readSampleJson<unknown>("flightResponseUnifiedModel.json");
  if (unifiedSingleSample && typeof unifiedSingleSample === "object") {
    const single = unifiedSingleSample as Record<string, unknown>;
    const filtered = filterByRequestedTripType([single]);
    if (filtered.length > 0) {
      return {
        source: "sample/flightResponseUnifiedModel.json",
        results: filtered,
      };
    }
  }

  const legacyListSample = await readSampleJson<unknown[]>(
    "flightResponseLegacyModel.json"
  );
  if (Array.isArray(legacyListSample) && legacyListSample.length > 0) {
    const converted = legacyListSample
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object"
      )
      .slice(0, 300)
      .map((item) => toUnifiedFlightResult(item))
      .filter(Boolean) as Array<Record<string, unknown>>;
    const filtered = filterByRequestedTripType(converted);
    if (filtered.length > 0) {
      return {
        source: "sample/flightResponseLegacyModel.json",
        results: filtered,
      };
    }
  }

  if (!isRoundTripRequest && unifiedSingleSample && typeof unifiedSingleSample === "object") {
    return {
      source: "sample/flightResponseUnifiedModel.json",
      results: [unifiedSingleSample as Record<string, unknown>],
    };
  }

  return null;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<unknown[] | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  try {
    const body = (req.body ?? {}) as LegacySearchBody;
    const routeSignature = buildRouteSignature(body);
    const settings = await loadSearchLimitSettings();
    let searchLimitState: SearchLimitState;
    try {
      searchLimitState = await enforceSearchLimit(req, res, settings);
    } catch (limitErr) {
      console.warn("[search-flight] Rate limit check bypassed due to temporary store error:", limitErr);
      searchLimitState = {
        limited: false,
        requiresLogin: false,
        limit: 100,
        remaining: 100,
        count: 1,
        mode: "anonymous",
      };
    }

    if (searchLimitState.limited) {
      await appendSearchLog({
        timestamp: new Date().toISOString(),
        mode: searchLimitState.mode,
        userId: searchLimitState.userId ?? null,
        status: "blocked",
        route: routeSignature,
        cabinClass: String(body?.cabinclass || "ANY").trim().toUpperCase() || "ANY",
        segments: Array.isArray(body?.segments) ? body.segments.length : 0,
        ipHash: searchLimitState.ipHash,
        browserFingerprint: searchLimitState.browserFingerprint,
        visitorId: searchLimitState.visitorId || null,
        count: searchLimitState.count,
        limit: searchLimitState.limit,
        remaining: searchLimitState.remaining,
        bookingCount: searchLimitState.bookingCount,
        message: searchLimitState.requiresLogin
          ? "Guest limit exceeded. Login required to continue searching."
          : "Authenticated search limit exceeded for current search window.",
      });

      return res.status(429).json({
        message: searchLimitState.requiresLogin
          ? "Guest search limit reached"
          : "User search limit reached",
        details: searchLimitState.requiresLogin
          ? `Maximum ${searchLimitState.limit} searches allowed per 24 hours without login. Please login to continue.`
          : `You reached your search quota (${searchLimitState.limit}) for this 24-hour window. Current bookings: ${searchLimitState.bookingCount || 0}.`,
        code: searchLimitState.requiresLogin
          ? "ANON_SEARCH_LIMIT_REACHED_LOGIN_REQUIRED"
          : "USER_SEARCH_LIMIT_REACHED",
        limit: searchLimitState.limit,
        remaining: searchLimitState.remaining,
        requiresLogin: searchLimitState.requiresLogin,
      });
    }

    if (!Array.isArray(body.segments) || body.segments.length === 0) {
      await appendSearchLog({
        timestamp: new Date().toISOString(),
        mode: searchLimitState.mode,
        userId: searchLimitState.userId ?? null,
        status: "validation_failed",
        route: routeSignature,
        cabinClass: String(body?.cabinclass || "ANY").trim().toUpperCase() || "ANY",
        segments: 0,
        ipHash: searchLimitState.ipHash,
        browserFingerprint: searchLimitState.browserFingerprint,
        visitorId: searchLimitState.visitorId || null,
        count: searchLimitState.count,
        limit: searchLimitState.limit,
        remaining: searchLimitState.remaining,
        bookingCount: searchLimitState.bookingCount,
        message: "segments is required for flight search",
      });
      return res
        .status(400)
        .json({ message: "segments is required for flight search" });
    }

    const accessToken = await createToken();
    const flightsUrl = getRequiredEnv("TRAVELPORT_FLIGHTS_URL");
    const accessGroup = getRequiredEnv("TRAVELPORT_ACCESS_GROUP");
    const version = process.env.TRAVELPORT_VERSION || "11";

    const { request, payloadSegments, contentSourceList, searchRepresentation } =
      buildTravelportPayload(body);

    let responsePayload: Record<string, unknown> = {};
    let liveSearchFailed = false;
    let liveSearchErrorMessage = "";
    let unifiedResults: Record<string, unknown>[] = [];

    try {
      const requestHeaders = {
        Accept: "application/json",
        "Content-Type": "application/json",
        XAUTH_TRAVELPORT_ACCESSGROUP: accessGroup,
        "Accept-Version": version,
        "Content-Version": version,
        taxBreakDown: "true",
        Authorization: `Bearer ${accessToken}`,
      };
      const response = await fetchUpstream(flightsUrl, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(request),
      });

      responsePayload = await response.json().catch(() => ({}));
      if (response.ok) {
        unifiedResults = toUnifiedSearchResult(
          payloadSegments,
          responsePayload,
          contentSourceList
        );
        if (unifiedResults.length === 0) {
          const catalogErrs = (
            (responsePayload as any)?.CatalogProductOfferingsResponse?.Result?.Error ??
            (responsePayload as any)?.Result?.Error
          ) as Array<Record<string, unknown>> | undefined;
          if (Array.isArray(catalogErrs) && catalogErrs.length > 0) {
            liveSearchErrorMessage = catalogErrs
              .map((err) => String(err?.Message || err?.message || err?.code || ""))
              .filter(Boolean)
              .join("; ");
            console.warn(
              `[search-flight] Travelport returned 0 offers with Result.Error:`,
              liveSearchErrorMessage
            );
          }
        }
        console.log(
          `[search-flight] Live Travelport status ${response.status}: parsed ${unifiedResults.length} offers`
        );
      } else {
        liveSearchFailed = true;
        liveSearchErrorMessage =
          (responsePayload?.message as string) ||
          (responsePayload?.error_description as string) ||
          (Array.isArray((responsePayload as any)?.CatalogProductOfferingsResponse?.Result?.Error)
            ? (responsePayload as any).CatalogProductOfferingsResponse.Result.Error
              .map((err: any) => String(err?.Message || err?.message || ""))
              .filter(Boolean)
              .join("; ")
            : "") ||
          `Travelport flight search failed (${response.status})`;
        console.warn(
          `[search-flight] Live Travelport failed (${response.status}):`,
          liveSearchErrorMessage
        );
      }

      logTravelportApi({
        endpoint: flightsUrl,
        request: {
          method: "POST",
          headers: requestHeaders,
          body: request,
        },
        response: responsePayload,
        status: response.status,
        meta: {
          api: "search-flight",
          route: routeSignature,
          parsedOffers: unifiedResults.length,
          liveSearchFailed,
          liveSearchErrorMessage: liveSearchErrorMessage || undefined,
        },
      });
    } catch (liveSearchError) {
      liveSearchFailed = true;
      liveSearchErrorMessage =
        liveSearchError instanceof Error
          ? liveSearchError.message
          : "Travelport flight search failed";
      console.error("[search-flight] Live Travelport error:", liveSearchErrorMessage);
      logTravelportApi({
        endpoint: flightsUrl,
        request: {
          method: "POST",
          body: request,
        },
        response: { error: liveSearchErrorMessage },
        status: 0,
        meta: {
          api: "search-flight",
          route: routeSignature,
          liveSearchFailed: true,
        },
      });
    }

    if (payloadSegments.length > 1 && searchRepresentation !== "Leg") {
      const roundTripOnly = unifiedResults.filter((item) => {
        const tripType = normalizeTripType(item?.tripType ?? item?.journeyType);
        const allLegsInfo = Array.isArray(item?.allLegsInfo) ? item.allLegsInfo : [];
        return tripType === "ROUND_TRIP" || allLegsInfo.length > 1;
      });
      if (roundTripOnly.length > 0) {
        unifiedResults = roundTripOnly;
      }
    } else if (searchRepresentation === "Leg") {
      unifiedResults = unifiedResults.map((item) => ({
        ...item,
        isLegBased: true,
        searchRepresentation: "Leg",
      }));
    }

    if (!Array.isArray(unifiedResults) || unifiedResults.length === 0) {
      if (liveSearchFailed) {
        await appendSearchLog({
          timestamp: new Date().toISOString(),
          mode: searchLimitState.mode,
          userId: searchLimitState.userId ?? null,
          status: "failed",
          route: routeSignature,
          cabinClass: String(body?.cabinclass || "ANY").trim().toUpperCase() || "ANY",
          segments: Array.isArray(body?.segments) ? body.segments.length : 0,
          ipHash: searchLimitState.ipHash,
          browserFingerprint: searchLimitState.browserFingerprint,
          visitorId: searchLimitState.visitorId || null,
          count: searchLimitState.count,
          limit: searchLimitState.limit,
          remaining: searchLimitState.remaining,
          bookingCount: searchLimitState.bookingCount,
          message: liveSearchErrorMessage || "Travelport flight search failed",
        });
        return res.status(502).json({
          message: "Travelport flight search failed",
          details:
            liveSearchErrorMessage ||
            "Unable to complete live flight search with Travelport.",
        });
      }

      await appendSearchLog({
        timestamp: new Date().toISOString(),
        mode: searchLimitState.mode,
        userId: searchLimitState.userId ?? null,
        status: "success",
        route: routeSignature,
        cabinClass: String(body?.cabinclass || "ANY").trim().toUpperCase() || "ANY",
        segments: Array.isArray(body?.segments) ? body.segments.length : 0,
        ipHash: searchLimitState.ipHash,
        browserFingerprint: searchLimitState.browserFingerprint,
        visitorId: searchLimitState.visitorId || null,
        count: searchLimitState.count,
        limit: searchLimitState.limit,
        remaining: searchLimitState.remaining,
        bookingCount: searchLimitState.bookingCount,
        message: "No results",
      });

      return res.status(200).json([]);
    }

    if (
      shouldSaveSearchResponse(body) &&
      Array.isArray(unifiedResults) &&
      unifiedResults.length > 0
    ) {
      try {
        await persistSearchResponseSamples({
          requestPayload: request as Record<string, unknown>,
          travelportRawResponse: responsePayload as Record<string, unknown>,
          unifiedResults: unifiedResults as Record<string, unknown>[],
        });
      } catch (persistError) {
        console.error("Failed to persist search response samples", persistError);
      }
    }

    const responseModel = String(body.responseModel ?? "unified")
      .toLowerCase()
      .trim();

    if (responseModel && responseModel !== "unified") {
      return res.status(400).json({
        message:
          "Legacy and mixed response models are removed. Use responseModel='unified' or omit the field.",
      });
    }

    await appendSearchLog({
      timestamp: new Date().toISOString(),
      mode: searchLimitState.mode,
      userId: searchLimitState.userId ?? null,
      status: "success",
      route: routeSignature,
      cabinClass: String(body?.cabinclass || "ANY").trim().toUpperCase() || "ANY",
      segments: Array.isArray(body?.segments) ? body.segments.length : 0,
      ipHash: searchLimitState.ipHash,
      browserFingerprint: searchLimitState.browserFingerprint,
      visitorId: searchLimitState.visitorId || null,
      count: searchLimitState.count,
      limit: searchLimitState.limit,
      remaining: searchLimitState.remaining,
      bookingCount: searchLimitState.bookingCount,
      message: "Live search success",
    });

    return res.status(200).json(unifiedResults);
  } catch (error) {
    const message = publicErrorMessage(error, "Unexpected server error");
    return res.status(500).json({ message });
  }
}

export default withApiHandler(handler, { methods: ["POST"] });

export const config = { api: { bodyParser: false } };
