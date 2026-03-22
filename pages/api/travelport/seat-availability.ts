import type { NextApiRequest, NextApiResponse } from "next";
import fs from "fs/promises";
import path from "path";
import { getTravelportAccessToken } from "./_token-cache";

type SeatAvailabilityBody = {
  seatAvailabilityRequest?: {
    offerListIdentifier?: unknown;
    offerIdentifier?: unknown;
    productIdentifiers?: unknown;
  };
  offerListIdentifier?: unknown;
  OfferListIdentifier?: unknown;
  offerIdentifier?: unknown;
  OfferIdentifier?: unknown;
  productIdentifiers?: unknown;
  ProductIdentifiers?: unknown;
  productIdentifier?: unknown;
  ProductIdentifier?: unknown;
  useSampleData?: unknown;
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

function normalizeIdentifier(value: unknown): string {
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
    const source = value as Record<string, unknown>;
    return (
      normalizeIdentifier(source.value) ||
      normalizeIdentifier(source.Value) ||
      normalizeIdentifier(source.id) ||
      normalizeIdentifier(source.ID) ||
      normalizeIdentifier(source.identifier) ||
      normalizeIdentifier(source.Identifier) ||
      normalizeIdentifier(source.offerIdentifier) ||
      normalizeIdentifier(source.OfferIdentifier) ||
      ""
    );
  }
  return "";
}

function normalizeIdentifierList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => normalizeIdentifier(item))
          .filter((item) => item.length > 0)
      )
    );
  }

  const single = normalizeIdentifier(value);
  return single ? [single] : [];
}

function resolveSeatAvailabilityInput(body: SeatAvailabilityBody) {
  const source =
    body?.seatAvailabilityRequest && typeof body.seatAvailabilityRequest === "object"
      ? (body.seatAvailabilityRequest as Record<string, unknown>)
      : (body as Record<string, unknown>);

  const offerListIdentifier = normalizeIdentifier(
    getValueByKeys(source, ["offerListIdentifier", "OfferListIdentifier"])
  );
  const offerIdentifier = normalizeIdentifier(
    getValueByKeys(source, ["offerIdentifier", "OfferIdentifier"])
  );
  const productIdentifiers = normalizeIdentifierList(
    getValueByKeys(source, [
      "productIdentifiers",
      "ProductIdentifiers",
      "productIdentifier",
      "ProductIdentifier",
    ])
  );

  return {
    offerListIdentifier,
    offerIdentifier,
    productIdentifiers,
  };
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  if (typeof value === "number") return value === 1;
  return false;
}

async function loadSampleSeatMapData(): Promise<Record<string, unknown> | null> {
  try {
    const samplePath = path.join(process.cwd(), "sample", "seatMapDta.json");
    const content = await fs.readFile(samplePath, "utf8");
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch (error) {
    return null;
  }
}

function resolveSeatAvailabilityUrl(version: string): string {
  const directUrl =
    process.env.TRAVELPORT_SEAT_AVAILABILITY_URL ||
    process.env.TRAVELPORT_SEAT_MAP_URL ||
    "";
  if (directUrl.trim()) {
    return directUrl.trim();
  }

  const baseUrl = process.env.TRAVELPORT_BASE_URL || "https://api.pp.travelport.net";
  const normalizedBase = baseUrl.replace(/\/+$/, "");

  if (/\/\d+$/.test(normalizedBase)) {
    return `${normalizedBase}/air/search/seat/catalogofferingsancillaries/seatavailabilities`;
  }

  return `${normalizedBase}/${version}/air/search/seat/catalogofferingsancillaries/seatavailabilities`;
}

async function createToken(): Promise<string> {
  return getTravelportAccessToken();
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Record<string, unknown> | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const body = (req.body ?? {}) as SeatAvailabilityBody;
    const sampleModeEnabled =
      process.env.TRAVELPORT_USE_SAMPLE_SEAT_MAP === "true" ||
      toBoolean(body?.useSampleData);

    if (sampleModeEnabled) {
      const samplePayload = await loadSampleSeatMapData();
      if (samplePayload) {
        return res.status(200).json(samplePayload);
      }
    }

    const {
      offerListIdentifier,
      offerIdentifier,
      productIdentifiers,
    } = resolveSeatAvailabilityInput(body);

    if (!offerListIdentifier || !offerIdentifier || productIdentifiers.length === 0) {
      return res.status(400).json({
        message:
          "offerListIdentifier, offerIdentifier, and productIdentifiers are required",
      });
    }

    const requestPayload = {
      "@type": "CatalogOfferingsQuerySeatAvailability",
      SeatAvailabilityOfferings: {
        "@type": "SeatAvailabilityOfferingsBuildFromOfferList",
        BuildFromOfferList: {
          OfferListIdentifier: offerListIdentifier,
          OfferIdentifier: [{ id: offerIdentifier }],
          ProductIdentifier: productIdentifiers.map((id) => ({ id })),
        },
      },
    };

    const accessToken = await createToken();
    const accessGroup = getRequiredEnv("TRAVELPORT_ACCESS_GROUP");
    const version = process.env.TRAVELPORT_VERSION || "11";
    const seatAvailabilityUrl = resolveSeatAvailabilityUrl(version);

    const response = await fetch(seatAvailabilityUrl, {
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

    const responsePayload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      return res.status(502).json({
        message: `Travelport seat availability failed (${response.status})`,
        details:
          (responsePayload?.message as string) ||
          (responsePayload?.error_description as string) ||
          "Unable to fetch seat availability for this offer.",
      });
    }

    return res.status(200).json(responsePayload);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return res.status(500).json({ message });
  }
}
