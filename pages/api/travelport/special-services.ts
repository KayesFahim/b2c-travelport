import { fetchUpstream } from "@/server/upstream-fetch";
import { withApiHandler } from "@/server/api-handler";
import { requireWorkbenchAccess } from "@/server/booking-access";
import { publicErrorMessage } from "@/server/public-error";
import { withCustomerSession } from "@/server/with-customer-session";
import type { NextApiRequest, NextApiResponse } from "next";
import { getTravelportAccessToken } from "@/server/travelport-token";

type SpecialServiceRequestBody = {
  reservationId?: unknown;
  ReservationId?: unknown;
  offerIdentifier?: unknown;
  OfferIdentifier?: unknown;
  specialRequests?: unknown;
  SpecialRequests?: unknown;
  requests?: unknown;
};

type ErrorResponse = {
  message: string;
  details?: string;
};

type NormalizedSpecialRequest = {
  travelerIdentifier: string;
  offerIdentifier: string;
  ssrCode: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = toText(item);
      if (parsed) return parsed;
    }
    return "";
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    return (
      toText(source.value) ||
      toText(source.Value) ||
      toText(source.id) ||
      toText(source.ID) ||
      toText(source.identifier) ||
      toText(source.Identifier) ||
      toText(source.code) ||
      toText(source.Code) ||
      ""
    );
  }
  return "";
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
  return toText(value);
}

function normalizeSsrCode(value: unknown): string {
  const code = toText(value).toUpperCase();
  if (!code) return "";
  return /^[A-Z0-9]{3,5}$/.test(code) ? code : "";
}

function getArrayInput(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => item && typeof item === "object") as Record<string, unknown>[];
}

function resolveSpecialRequests(body: SpecialServiceRequestBody): NormalizedSpecialRequest[] {
  const bodyObj = (body || {}) as Record<string, unknown>;
  const fallbackOfferIdentifier = normalizeIdentifier(
    getValueByKeys(bodyObj, ["offerIdentifier", "OfferIdentifier"])
  );

  const requestItems = [
    ...getArrayInput(bodyObj.specialRequests),
    ...getArrayInput(bodyObj.SpecialRequests),
    ...getArrayInput(bodyObj.requests),
  ];

  const uniqueKeySet = new Set<string>();
  const output: NormalizedSpecialRequest[] = [];

  requestItems.forEach((item) => {
    const travelerIdentifier = normalizeIdentifier(
      getValueByKeys(item, [
        "travelerIdentifier",
        "TravelerIdentifier",
        "travelerIdentifierRef",
        "TravelerIdentifierRef",
      ])
    );
    const offerIdentifier =
      normalizeIdentifier(
        getValueByKeys(item, [
          "offerIdentifier",
          "OfferIdentifier",
          "offerRef",
          "OfferRef",
        ])
      ) || fallbackOfferIdentifier;
    const ssrCode = normalizeSsrCode(
      getValueByKeys(item, ["ssrCode", "SSRCode", "code", "Code"])
    );

    if (!travelerIdentifier || !offerIdentifier || !ssrCode) return;
    const dedupeKey = `${travelerIdentifier}::${offerIdentifier}::${ssrCode}`;
    if (uniqueKeySet.has(dedupeKey)) return;
    uniqueKeySet.add(dedupeKey);

    output.push({
      travelerIdentifier,
      offerIdentifier,
      ssrCode,
    });
  });

  return output;
}

function resolveSpecialServicesUrl(version: string, reservationId: string): string {
  const directUrl = process.env.TRAVELPORT_SPECIAL_SERVICES_URL || "";
  if (directUrl.trim()) {
    return directUrl
      .replace(/\{\{reservationIdDevKit\}\}/g, encodeURIComponent(reservationId))
      .replace(/\{reservationId\}/g, encodeURIComponent(reservationId))
      .replace(/\{\{version\}\}/g, version);
  }

  const baseUrl = process.env.TRAVELPORT_BASE_URL || "https://api.pp.travelport.net";
  const normalizedBase = baseUrl.replace(/\/+$/, "");

  if (/\/\d+$/.test(normalizedBase)) {
    return `${normalizedBase}/air/book/specialservices/reservationworkbench/${encodeURIComponent(
      reservationId
    )}/specialservices/list`;
  }

  return `${normalizedBase}/${version}/air/book/specialservices/reservationworkbench/${encodeURIComponent(
    reservationId
  )}/specialservices/list`;
}

async function createToken(): Promise<string> {
  return getTravelportAccessToken();
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Record<string, unknown> | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const body = (req.body || {}) as SpecialServiceRequestBody;
    const reservationId = normalizeIdentifier(
      getValueByKeys(body as Record<string, unknown>, ["reservationId", "ReservationId"])
    );
    if (!reservationId) {
      return res.status(400).json({
        message: "reservationId is required",
      });
    }

    if (!(await requireWorkbenchAccess(req, res, reservationId))) return;

    const normalizedRequests = resolveSpecialRequests(body);
    if (!normalizedRequests.length) {
      return res.status(400).json({
        message:
          "specialRequests are required with travelerIdentifier, offerIdentifier and ssrCode",
      });
    }

    const specialServicePayload = {
      "@type": "SpecialServiceListRequest",
      SpecialServiceID: normalizedRequests.map((item, index) => ({
        "@type": "SpecialService",
        id: `specialService_${index + 1}`,
        Identifier: {
          authority: "Travelport",
          value: `${reservationId}_specialService_${index + 1}`,
        },
        AppliesTo: {
          "@type": "AppliesToOffer",
          OfferIdentifier: [
            {
              id: `offer_${index + 1}`,
              offerRef: `offer_${index + 1}`,
              Identifier: {
                authority: "Travelport",
                value: item.offerIdentifier,
              },
            },
          ],
        },
        TravelerIdentifier: {
          id: `trav_${index + 1}`,
          TravelerRef: `trav_${index + 1}`,
          Identifier: {
            authority: "Travelport",
            value: item.travelerIdentifier,
          },
        },
        SSRCode: item.ssrCode,
      })),
    };

    const version = process.env.TRAVELPORT_VERSION || "11";
    const accessGroup = getRequiredEnv("TRAVELPORT_ACCESS_GROUP");
    const token = await createToken();
    const url = resolveSpecialServicesUrl(version, reservationId);

    const requestHeaders = {
      Accept: "application/json",
      "Content-Type": "application/json",
      XAUTH_TRAVELPORT_ACCESSGROUP: accessGroup,
      "Content-Version": version,
      "Accept-Version": version,
      Authorization: `Bearer ${token}`,
    };
    const response = await fetchUpstream(url, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(specialServicePayload),
    });

    const responsePayload = await response.json().catch(() => ({}));
    try {
      const { logTravelportApi } = await import("@/utils/travelportLogger");
      logTravelportApi({
        endpoint: url,
        request: { method: "POST", headers: requestHeaders, body: specialServicePayload },
        response: responsePayload,
        status: response.status,
        meta: { api: "special-services", reservationId },
      });
    } catch { }
    if (!response.ok) {
      return res.status(502).json({
        message: `Travelport special services failed (${response.status})`,
        details:
          toText(
            getValueByKeys(responsePayload, [
              "message",
              "Message",
              "error_description",
              "error",
            ])
          ) || "Unable to add special service requests.",
        travelportResponse: responsePayload,
      });
    }

    return res.status(200).json({
      success: true,
      reservationId,
      requestCount: normalizedRequests.length,
      requests: normalizedRequests,
      response: responsePayload,
    });
  } catch (error) {
    return res.status(500).json({
      message: publicErrorMessage(error, "Unexpected server error"),
    });
  }
}

export default withApiHandler(withCustomerSession(handler), { methods: ["POST"] });

export const config = { api: { bodyParser: false } };
