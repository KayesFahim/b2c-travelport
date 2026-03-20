import type { NextApiRequest, NextApiResponse } from "next";
import {
  toLegacySearchResult,
  type LegacySegment,
} from "./search-flight";

type BuildFromProductsBody = {
  selectedOffer?: Record<string, unknown>;
  offer?: Record<string, unknown>;
  data?: Record<string, unknown>;
  adultCount?: number | string;
  childCount?: number | string;
  infantCount?: number | string;
  passengers?: {
    adult?: number | string;
    child?: number | string;
    infant?: number | string;
  };
};

type ErrorResponse = {
  message: string;
  details?: string;
};

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

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function getValueByKeys(
  obj: Record<string, unknown> | null | undefined,
  keys: string[]
): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function getArrayByKeys(
  obj: Record<string, unknown> | null | undefined,
  keys: string[]
): unknown[] {
  if (!obj || typeof obj !== "object") return [];
  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

function normalizeCabin(value: unknown): string {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return "Economy";
  if (["y", "m", "economy"].includes(normalized)) return "Economy";
  if (["w", "s", "u", "premiumeconomy", "premium economy"].includes(normalized)) {
    return "PremiumEconomy";
  }
  if (["c", "i", "j", "business"].includes(normalized)) return "Business";
  if (["f", "p", "first"].includes(normalized)) return "First";
  return "Economy";
}

function splitDateTime(value: unknown): { date: string; time: string } {
  const raw = toText(value);
  if (!raw) {
    return { date: "", time: "00:00:00" };
  }

  const normalizedIso = raw.replace(" ", "T");
  const isoMatch = normalizedIso.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}(?::\d{2})?)/
  );

  if (isoMatch) {
    return {
      date: isoMatch[1],
      time: isoMatch[2].length === 5 ? `${isoMatch[2]}:00` : isoMatch[2],
    };
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return { date: raw.slice(0, 10), time: "00:00:00" };
  }

  const year = parsed.getUTCFullYear();
  const month = String(parsed.getUTCMonth() + 1).padStart(2, "0");
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  const hour = String(parsed.getUTCHours()).padStart(2, "0");
  const minute = String(parsed.getUTCMinutes()).padStart(2, "0");
  const second = String(parsed.getUTCSeconds()).padStart(2, "0");

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}:${second}`,
  };
}

function normalizeSegments(leg: Record<string, unknown>): Record<string, unknown>[] {
  const segments = getArrayByKeys(leg, ["Segments", "segments"]);
  if (!segments.length) return [];
  if (Array.isArray(segments[0])) {
    return (segments as unknown[]).flat() as Record<string, unknown>[];
  }
  return segments as Record<string, unknown>[];
}

function resolveOffer(body: BuildFromProductsBody): Record<string, unknown> {
  const candidates = [body?.selectedOffer, body?.offer, body?.data];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") return candidate;
  }
  return {};
}

function buildPayloadSegments(offer: Record<string, unknown>): LegacySegment[] {
  const allLegsInfo = getArrayByKeys(offer, ["AllLegsInfo", "allLegsInfo"]);
  if (!allLegsInfo.length) return [];

  return allLegsInfo
    .map((leg) => {
      const legObj = (leg ?? {}) as Record<string, unknown>;
      const segments = normalizeSegments(legObj);
      const firstSegment = (segments[0] ?? {}) as Record<string, unknown>;
      const lastSegment = (segments[segments.length - 1] ??
        {}) as Record<string, unknown>;
      const depDate = splitDateTime(
        getValueByKeys(legObj, ["DepDate", "depDate"]) ??
          getValueByKeys(firstSegment, ["DepTime", "depTime"])
      ).date;
      const depfrom = toText(
        getValueByKeys(legObj, ["DepFrom", "depFrom"]) ??
          getValueByKeys(firstSegment, ["DepFrom", "depFrom"])
      );
      const arrto = toText(
        getValueByKeys(legObj, ["ArrTo", "arrTo"]) ??
          getValueByKeys(lastSegment, ["ArrTo", "arrTo"])
      );

      return {
        depfrom,
        arrto,
        depdate: depDate,
      };
    })
    .filter((item) => item.depfrom && item.arrto && item.depdate);
}

function resolvePassengerCounts(
  offer: Record<string, unknown>,
  body: BuildFromProductsBody
): { adt: number; chd: number; inf: number } {
  const bodyAdult = toNumber(
    body?.adultCount ?? body?.passengers?.adult ?? 0,
    0
  );
  const bodyChild = toNumber(
    body?.childCount ?? body?.passengers?.child ?? 0,
    0
  );
  const bodyInfant = toNumber(
    body?.infantCount ?? body?.passengers?.infant ?? 0,
    0
  );

  if (bodyAdult || bodyChild || bodyInfant) {
    return {
      adt: Math.max(bodyAdult, 0),
      chd: Math.max(bodyChild, 0),
      inf: Math.max(bodyInfant, 0),
    };
  }

  const breakdown = getArrayByKeys(offer, ["PriceBreakDown", "priceBreakDown"]);
  let adt = 0;
  let chd = 0;
  let inf = 0;

  for (const row of breakdown) {
    const item = (row ?? {}) as Record<string, unknown>;
    const paxType = String(
      getValueByKeys(item, ["PaxType", "paxType"]) ?? ""
    ).toUpperCase();
    const count = Math.max(
      toNumber(getValueByKeys(item, ["PaxCount", "paxCount"]), 0),
      0
    );

    if (["ADT", "ADULT"].includes(paxType)) adt += count;
    if (["CHD", "CHILD", "CNN"].includes(paxType)) chd += count;
    if (["INF", "INFANT"].includes(paxType)) inf += count;
  }

  return {
    adt: adt || 1,
    chd,
    inf,
  };
}

function buildPassengerCriteria(
  offer: Record<string, unknown>,
  body: BuildFromProductsBody
) {
  const counts = resolvePassengerCounts(offer, body);
  const criteria = [];

  if (counts.adt > 0) {
    criteria.push({
      "@type": "PassengerCriteria",
      number: counts.adt,
      age: 25,
      passengerTypeCode: "ADT",
    });
  }
  if (counts.chd > 0) {
    criteria.push({
      "@type": "PassengerCriteria",
      number: counts.chd,
      age: 10,
      passengerTypeCode: "CHD",
    });
  }
  if (counts.inf > 0) {
    criteria.push({
      "@type": "PassengerCriteria",
      number: counts.inf,
      age: 1,
      passengerTypeCode: "INF",
    });
  }

  return criteria.length ? criteria : [{ "@type": "PassengerCriteria", number: 1, age: 25, passengerTypeCode: "ADT" }];
}

function buildProductCriteriaAir(offer: Record<string, unknown>) {
  const allLegsInfo = getArrayByKeys(offer, ["AllLegsInfo", "allLegsInfo"]);
  const productCriteriaAir: Array<Record<string, unknown>> = [];
  let segmentSequence = 1;

  for (const leg of allLegsInfo) {
    const legObj = (leg ?? {}) as Record<string, unknown>;
    const segments = normalizeSegments(legObj);
    if (!segments.length) continue;

    const specificFlightCriteria = segments.map((rawSegment) => {
      const segment = (rawSegment ?? {}) as Record<string, unknown>;
      const dep = splitDateTime(getValueByKeys(segment, ["DepTime", "depTime"]));
      const arr = splitDateTime(getValueByKeys(segment, ["ArrTime", "arrTime"]));
      const segmentCode =
        (getValueByKeys(segment, ["SegmentCode", "segmentCode"]) as
          | Record<string, unknown>
          | undefined) || {};
      const brandFeatures =
        (getValueByKeys(legObj, ["BrandFeatures", "brandFeatures"]) as
          | Record<string, unknown>
          | undefined) || {};

      const criteria = {
        flightNumber: toText(
          getValueByKeys(segment, ["MarketingFlightNumber", "marketingFlightNumber"])
        ),
        carrier: toText(
          getValueByKeys(segment, ["MarketingCarrier", "marketingCarrier"])
        ),
        departureDate: dep.date,
        departureTime: dep.time,
        arrivalDate: arr.date,
        arrivalTime: arr.time,
        from: toText(getValueByKeys(segment, ["DepFrom", "depFrom"])),
        to: toText(getValueByKeys(segment, ["ArrTo", "arrTo"])),
        classOfService: toText(
          getValueByKeys(segmentCode, ["bookingCode", "BookingCode"]) || "Y"
        ),
        cabin: normalizeCabin(
          getValueByKeys(segmentCode, ["cabinCode", "CabinCode"])
        ),
        segmentSequence,
        brandTier: toText(
          getValueByKeys(segment, ["brandTier", "BrandTier"]) ??
            getValueByKeys(brandFeatures, ["tier", "Tier"]) ??
            "1"
        ),
        AvailabilitySourceCode: toText(
          getValueByKeys(segment, ["AvailabilitySourceCode"])
        ) || "A",
        ContentSource:
          toText(getValueByKeys(segment, ["ContentSource"])) || "GDS",
      };

      segmentSequence += 1;
      return criteria;
    });

    productCriteriaAir.push({
      SpecificFlightCriteria: specificFlightCriteria,
    });
  }

  return productCriteriaAir;
}

function buildBuildFromProductsPayload(
  offer: Record<string, unknown>,
  body: BuildFromProductsBody
) {
  return {
    "@type": "OfferQueryBuildFromProducts",
    BuildFromProductsRequest: {
      "@type": "BuildFromProductsRequestAir",
      PassengerCriteria: buildPassengerCriteria(offer, body),
      ProductCriteriaAir: buildProductCriteriaAir(offer),
    },
    validateInventoryInd: true,
  };
}

function resolveBuildFromProductsUrl(version: string): string {
  const directUrl =
    process.env.TRAVELPORT_BUILD_FROM_PRODUCTS_URL ||
    process.env.TRAVELPORT_BUILD_FROM_PRODUCTS ||
    "";
  if (directUrl.trim()) {
    return directUrl.trim();
  }

  const baseUrl = process.env.TRAVELPORT_BASE_URL || "https://api.pp.travelport.net";
  const normalizedBase = baseUrl.replace(/\/+$/, "");

  if (/\/\d+$/.test(normalizedBase)) {
    return `${normalizedBase}/air/price/offers/buildfromproducts`;
  }

  return `${normalizedBase}/${version}/air/price/offers/buildfromproducts`;
}

async function createToken(): Promise<string> {
  const authUrl = getRequiredEnv("TRAVELPORT_AUTH_URL");
  const clientId = getRequiredEnv("TRAVELPORT_CLIENT_ID");
  const clientSecret = getRequiredEnv("TRAVELPORT_CLIENT_SECRET");
  const username = getRequiredEnv("TRAVELPORT_USERNAME");
  const password = getRequiredEnv("TRAVELPORT_PASSWORD");
  const grantType = process.env.TRAVELPORT_AUTH_GRANT_TYPE || "password";
  const useBasicAuth = process.env.TRAVELPORT_USE_BASIC_AUTH === "true";

  const body = new URLSearchParams();
  body.append("grant_type", grantType);
  body.append("username", username);
  body.append("password", password);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (useBasicAuth) {
    const basicToken = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );
    headers.Authorization = `Basic ${basicToken}`;
  } else {
    body.append("client_id", clientId);
    body.append("client_secret", clientSecret);
  }

  const response = await fetch(authUrl, {
    method: "POST",
    headers,
    body: body.toString(),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.access_token) {
    throw new Error(
      payload?.error_description ||
        payload?.message ||
        `Travelport auth failed (${response.status})`
    );
  }

  return payload.access_token as string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<unknown[] | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const body = (req.body ?? {}) as BuildFromProductsBody;
    const selectedOffer = resolveOffer(body);
    if (!Object.keys(selectedOffer).length) {
      return res.status(400).json({ message: "selectedOffer is required" });
    }

    const payloadSegments = buildPayloadSegments(selectedOffer);
    if (!payloadSegments.length) {
      return res
        .status(400)
        .json({ message: "selectedOffer does not contain flight segments" });
    }

    const requestPayload = buildBuildFromProductsPayload(selectedOffer, body);
    const accessToken = await createToken();
    const accessGroup = getRequiredEnv("TRAVELPORT_ACCESS_GROUP");
    const version = process.env.TRAVELPORT_VERSION || "11";
    const buildFromProductsUrl = resolveBuildFromProductsUrl(version);

    const response = await fetch(buildFromProductsUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        XAUTH_TRAVELPORT_ACCESSGROUP: accessGroup,
        "Accept-Version": version,
        "Content-Version": version,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(requestPayload),
    });

    const responsePayload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(502).json({
        message: `Travelport build-from-products failed (${response.status})`,
        details:
          responsePayload?.message ||
          responsePayload?.error_description ||
          "Unable to build priced offer from selected products.",
      });
    }

    const mapped = toLegacySearchResult(
      payloadSegments as LegacySegment[],
      responsePayload
    ) as Record<string, unknown>[];

    const fallbackResultId = toText(
      getValueByKeys(selectedOffer, ["ResultId", "resultId", "identifier"])
    );
    const fallbackSearchId = toText(
      getValueByKeys(selectedOffer, ["SearchId", "searchId", "transactionId"])
    );

    const normalized = (mapped.length ? mapped : [selectedOffer]).map(
      (item, index) => {
        const source = (item ?? {}) as Record<string, unknown>;
        const sourceResultId = toText(source.ResultId);
        const sourceOfferIdentifier =
          toText(
            getValueByKeys(source, [
              "offerIdentifier",
              "OfferIdentifier",
              "identifier",
              "Identifier",
            ])
          ) ||
          sourceResultId ||
          fallbackResultId;

        return {
          ...source,
          ResultId:
            sourceResultId ||
            (fallbackResultId ? `${fallbackResultId}_${index + 1}` : `BFP_${index + 1}`),
          offerIdentifier: sourceOfferIdentifier,
          SearchId: toText(source.SearchId) || fallbackSearchId || "TRAVELPORT-BFP",
          RePriceStatus: toText(source.RePriceStatus) || "Success",
          sourceBuildFromProducts: true,
        };
      }
    );

    return res.status(200).json(normalized);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return res.status(500).json({ message });
  }
}
