import type { NextApiRequest, NextApiResponse } from "next";
import { getTravelportAccessToken } from "./_token-cache";

type AncillaryAddBody = {
  pnr?: unknown;
  locator?: unknown;
  reservationId?: unknown;
  offerListIdentifier?: unknown;
  offerIdentifier?: unknown;
  productIdentifier?: unknown;
  travelerIdentifier?: unknown;
  travelerIndex?: unknown;
  passengerId?: unknown;
  travelerTypeCode?: unknown;
  travelerNumber?: unknown;
  quantity?: unknown;
  commitReservation?: unknown;
};

type ErrorResponse = {
  message: string;
  details?: string;
  stage?: string;
  requiresLogin?: boolean;
};

type SuccessResponse = {
  success: true;
  message: string;
  pnr: string;
  reservationId: string;
  travelerIdentifier: string;
  addOfferResponse: Record<string, unknown>;
  commitResponse: Record<string, unknown> | null;
};

type TravelerRow = {
  id: string;
  identifier: string;
  passengerTypeCode: string;
  travelerNumber: number;
  index: number;
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
    const row = value as Record<string, unknown>;
    return (
      toText(row.value) ||
      toText(row.Value) ||
      toText(row.id) ||
      toText(row.ID) ||
      toText(row.identifier) ||
      toText(row.Identifier) ||
      ""
    );
  }
  return "";
}

function toIndex(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return -1;
  const integer = Math.trunc(parsed);
  return integer >= 0 ? integer : -1;
}

function toPositiveInteger(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  const integer = Math.trunc(parsed);
  return integer > 0 ? integer : 0;
}

function toBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  if (text === "true") return true;
  if (text === "false") return false;
  return fallback;
}

function normalizeIdentifier(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeIdentifier(item);
      if (normalized) return normalized;
    }
    return "";
  }
  if (typeof value === "object") {
    const row = value as Record<string, unknown>;
    return (
      normalizeIdentifier(row.value) ||
      normalizeIdentifier(row.Value) ||
      normalizeIdentifier(row.id) ||
      normalizeIdentifier(row.ID) ||
      normalizeIdentifier(row.identifier) ||
      normalizeIdentifier(row.Identifier) ||
      normalizeIdentifier(row.offerIdentifier) ||
      normalizeIdentifier(row.OfferIdentifier) ||
      ""
    );
  }
  return "";
}

function normalizePaxTypeCode(value: unknown): string {
  const code = String(value ?? "").trim().toUpperCase();
  if (["ADT", "ADULT"].includes(code)) return "ADT";
  if (["CHD", "CHILD", "CNN"].includes(code)) return "CHD";
  if (["INF", "INFANT"].includes(code)) return "INF";
  return "";
}

function getValueByKeys(
  obj: Record<string, unknown> | null | undefined,
  keys: string[]
): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    const value = obj[key];
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
    const value = obj[key];
    if (Array.isArray(value)) return value;
  }
  return [];
}

async function parseJsonSafe(response: Response): Promise<Record<string, unknown>> {
  return response.json().catch(() => ({}));
}

function extractTravelportErrorMessage(payload: Record<string, unknown>): string {
  const directCandidates: unknown[] = [
    payload?.message,
    payload?.Message,
    payload?.error,
    payload?.error_description,
    payload?.description,
  ];

  for (const candidate of directCandidates) {
    const resolved = toText(candidate);
    if (resolved) return resolved;
  }

  const nestedCandidates: unknown[] = [
    (payload?.Error as Record<string, unknown> | undefined)?.Message,
    (payload?.Error as Record<string, unknown> | undefined)?.message,
    (payload?.ResponseMessage as Record<string, unknown> | undefined)?.value,
  ];

  for (const candidate of nestedCandidates) {
    const resolved = toText(candidate);
    if (resolved) return resolved;
  }

  if (Array.isArray(payload?.Errors)) {
    for (const item of payload.Errors as unknown[]) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const message = toText(row?.message) || toText(row?.Message) || toText(row?.code);
      if (message) return message;
    }
  }

  const reservationResponse =
    payload?.ReservationResponse && typeof payload.ReservationResponse === "object"
      ? (payload.ReservationResponse as Record<string, unknown>)
      : null;
  const resultObj =
    reservationResponse?.Result && typeof reservationResponse.Result === "object"
      ? (reservationResponse.Result as Record<string, unknown>)
      : null;
  const resultErrors = resultObj?.Error;
  if (Array.isArray(resultErrors)) {
    for (const item of resultErrors) {
      if (!item || typeof item !== "object") continue;
      const row = item as Record<string, unknown>;
      const message =
        toText(row.Message) || toText(row.message) || toText(row.Code) || toText(row.code);
      if (message) return message;
    }
  }

  return "";
}

function hasTravelportErrors(payload: Record<string, unknown>): boolean {
  return Boolean(extractTravelportErrorMessage(payload));
}

function resolveBookingBaseUrl(version: string): string {
  const directUrl = process.env.TRAVELPORT_AIR_BOOKING || process.env.TRAVELPORT_AIR_BOOKING_URL || "";
  if (directUrl.trim()) return directUrl.trim().replace(/\/+$/, "");

  const baseUrl = process.env.TRAVELPORT_BASE_URL || "https://api.pp.travelport.net";
  return `${baseUrl.replace(/\/+$/, "")}/${version}/air/book`;
}

function resolveReservationFromPayload(payload: Record<string, unknown>): Record<string, unknown> {
  const reservationResponse =
    payload?.ReservationResponse && typeof payload.ReservationResponse === "object"
      ? (payload.ReservationResponse as Record<string, unknown>)
      : payload;
  const reservation =
    reservationResponse?.Reservation && typeof reservationResponse.Reservation === "object"
      ? (reservationResponse.Reservation as Record<string, unknown>)
      : reservationResponse;
  return reservation && typeof reservation === "object"
    ? (reservation as Record<string, unknown>)
    : {};
}

function resolveReservationIdentifier(payload: Record<string, unknown>): string {
  const reservation = resolveReservationFromPayload(payload);
  return normalizeIdentifier(getValueByKeys(reservation, ["Identifier", "identifier", "id", "ID"]));
}

function resolveTravelerRows(reservation: Record<string, unknown>): TravelerRow[] {
  const travelers = getArrayByKeys(reservation, ["Traveler", "traveler"]);
  const countsByType: Record<string, number> = {};

  return travelers
    .map((entry, index) => {
      const row = (entry as Record<string, unknown>) || {};
      const id = normalizeIdentifier(getValueByKeys(row, ["id", "ID"]));
      const identifier = normalizeIdentifier(getValueByKeys(row, ["Identifier", "identifier"]));
      const passengerTypeCode = normalizePaxTypeCode(
        getValueByKeys(row, ["passengerTypeCode", "PassengerTypeCode", "paxType", "PaxType"])
      );
      countsByType[passengerTypeCode] = (countsByType[passengerTypeCode] || 0) + 1;
      const travelerNumber = countsByType[passengerTypeCode];
      if (!id && !identifier) return null;
      return {
        id,
        identifier,
        passengerTypeCode,
        travelerNumber,
        index,
      };
    })
    .filter(Boolean) as TravelerRow[];
}

function resolveTravelerIdentifier(params: {
  explicitTravelerIdentifier: string;
  passengerIndex: number;
  travelerIndex: number;
  travelerTypeCode: string;
  travelerNumber: number;
  travelerRows: TravelerRow[];
}): string {
  const travelers = params.travelerRows;
  if (!travelers.length) return "";

  if (params.explicitTravelerIdentifier) {
    const matched = travelers.find(
      (row) =>
        row.identifier === params.explicitTravelerIdentifier ||
        row.id === params.explicitTravelerIdentifier
    );
    if (matched) {
      return matched.identifier || matched.id;
    }
    return params.explicitTravelerIdentifier;
  }

  if (params.passengerIndex >= 0 && params.passengerIndex < travelers.length) {
    const matched = travelers[params.passengerIndex];
    return matched.identifier || matched.id;
  }

  if (params.travelerIndex >= 0 && params.travelerIndex < travelers.length) {
    const matched = travelers[params.travelerIndex];
    return matched.identifier || matched.id;
  }

  if (params.travelerTypeCode) {
    const typedRows = travelers.filter(
      (row) => normalizePaxTypeCode(row.passengerTypeCode) === params.travelerTypeCode
    );
    if (typedRows.length) {
      if (params.travelerNumber > 0) {
        const byNumber = typedRows.find((row) => row.travelerNumber === params.travelerNumber);
        if (byNumber) return byNumber.identifier || byNumber.id;
      }
      return typedRows[0].identifier || typedRows[0].id;
    }
  }

  return travelers[0].identifier || travelers[0].id;
}

async function buildWorkbenchFromLocator(params: {
  bookingBaseUrl: string;
  pnr: string;
  headers: Record<string, string>;
}) {
  const buildFromLocatorPath =
    toText(process.env.TRAVELPORT_ISSUE_TICKET_BUILD_FROM_LOCATOR_PATH) ||
    "/session/reservationworkbench/buildfromlocator?Locator={pnr}";
  const buildFromLocatorMethod =
    toText(process.env.TRAVELPORT_ISSUE_TICKET_BUILD_FROM_LOCATOR_METHOD) || "POST";

  const url = `${params.bookingBaseUrl}${buildFromLocatorPath.replace("{pnr}", encodeURIComponent(params.pnr))}`;
  const response = await fetch(url, {
    method: buildFromLocatorMethod,
    headers: params.headers,
  });
  const payload = (await parseJsonSafe(response)) as Record<string, unknown>;

  return {
    ok: response.ok && !hasTravelportErrors(payload),
    status: response.status,
    payload,
    reservationId: resolveReservationIdentifier(payload),
    errorMessage:
      extractTravelportErrorMessage(payload) ||
      "Unable to build reservation workbench from locator.",
  };
}

async function commitReservation(params: {
  bookingBaseUrl: string;
  reservationId: string;
  headers: Record<string, string>;
}) {
  const commitUrl = `${params.bookingBaseUrl}/reservation/reservations/${encodeURIComponent(
    params.reservationId
  )}`;
  const commitResponse = await fetch(commitUrl, {
    method: "POST",
    headers: params.headers,
    body: JSON.stringify({ "@type": "ReservationQueryCommitReservation" }),
  });

  const commitPayload = (await parseJsonSafe(commitResponse)) as Record<string, unknown>;

  return {
    ok: commitResponse.ok && !hasTravelportErrors(commitPayload),
    status: commitResponse.status,
    payload: commitPayload,
    errorMessage:
      extractTravelportErrorMessage(commitPayload) ||
      "Unable to commit reservation after ancillary add.",
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const body = (req.body ?? {}) as AncillaryAddBody;
    const pnr = toText(body?.pnr || body?.locator);
    let reservationId = toText(body?.reservationId);
    const offerListIdentifier = normalizeIdentifier(body?.offerListIdentifier);
    const offerIdentifier = normalizeIdentifier(body?.offerIdentifier);
    const productIdentifier = normalizeIdentifier(body?.productIdentifier);
    const explicitTravelerIdentifier = normalizeIdentifier(body?.travelerIdentifier);
    const passengerIndex = toIndex(body?.passengerId);
    const travelerIndex = toIndex(body?.travelerIndex);
    const travelerTypeCode = normalizePaxTypeCode(body?.travelerTypeCode);
    const travelerNumber = toPositiveInteger(body?.travelerNumber);
    const quantity = Math.max(1, toPositiveInteger(body?.quantity) || 1);
    const commitReservationInd = toBoolean(body?.commitReservation, true);

    if (!pnr && !reservationId) {
      return res.status(400).json({ message: "pnr/locator or reservationId is required" });
    }
    if (!offerListIdentifier || !offerIdentifier || !productIdentifier) {
      return res.status(400).json({
        message: "offerListIdentifier, offerIdentifier, and productIdentifier are required",
      });
    }

    const version = process.env.TRAVELPORT_VERSION || "11";
    const bookingBaseUrl = resolveBookingBaseUrl(version);
    const accessToken = await getTravelportAccessToken();
    const accessGroup = getRequiredEnv("TRAVELPORT_ACCESS_GROUP");
    const headers: Record<string, string> = {
      Accept: "application/json",
      "Content-Type": "application/json",
      XAUTH_TRAVELPORT_ACCESSGROUP: accessGroup,
      "Accept-Version": version,
      "Content-Version": version,
      Authorization: `Bearer ${accessToken}`,
    };

    let buildPayload: Record<string, unknown> = {};
    if (pnr) {
      const buildResult = await buildWorkbenchFromLocator({
        bookingBaseUrl,
        pnr,
        headers,
      });
      if (!buildResult.ok) {
        return res.status(502).json({
          message: `Build-from-locator failed (${buildResult.status})`,
          details: buildResult.errorMessage,
          stage: "build_from_locator",
        });
      }
      buildPayload = buildResult.payload;
      reservationId = reservationId || buildResult.reservationId;
    }

    if (!reservationId) {
      return res.status(502).json({
        message: "No reservationId returned from build-from-locator",
        stage: "build_from_locator",
      });
    }

    const reservation = resolveReservationFromPayload(buildPayload);
    const travelerRows = resolveTravelerRows(reservation);
    const travelerIdentifier = resolveTravelerIdentifier({
      explicitTravelerIdentifier,
      passengerIndex,
      travelerIndex,
      travelerTypeCode,
      travelerNumber,
      travelerRows,
    });

    if (!travelerIdentifier) {
      return res.status(400).json({
        message: "Unable to resolve traveler identifier for ancillary add",
      });
    }

    const addAncillaryOfferUrl = `${bookingBaseUrl}/airoffer/reservationworkbench/${encodeURIComponent(
      reservationId
    )}/offers/buildancillaryoffersfromcatalogofferings`;

    const addAncillaryPayload = {
      "@type": "OfferQueryBuildAncillaryOffersFromCatalogOfferings",
      BuildAncillaryOffersFromCatalogOfferings: [
        {
          "@type": "BuildAncillaryOffersFromCatalogOfferingsAir",
          CatalogOfferingsIdentifier: {
            Identifier: {
              value: offerListIdentifier,
            },
          },
          CatalogOfferingIdentifier: {
            Identifier: {
              value: offerIdentifier,
            },
          },
          ProductIdentifier: {
            Identifier: {
              value: productIdentifier,
            },
          },
          TravelerIdentifierRef: {
            value: travelerIdentifier,
          },
          Quantity: quantity,
        },
      ],
    };

    const addAncillaryResponse = await fetch(addAncillaryOfferUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(addAncillaryPayload),
    });

    const addAncillaryPayloadResponse = (await parseJsonSafe(
      addAncillaryResponse
    )) as Record<string, unknown>;

    if (!addAncillaryResponse.ok || hasTravelportErrors(addAncillaryPayloadResponse)) {
      return res.status(502).json({
        message: `Ancillary add offer failed (${addAncillaryResponse.status})`,
        details:
          extractTravelportErrorMessage(addAncillaryPayloadResponse) ||
          "Unable to add selected ancillary offer.",
        stage: "add_ancillary_offer",
      });
    }

    let commitPayload: Record<string, unknown> | null = null;
    if (commitReservationInd) {
      const commitResult = await commitReservation({
        bookingBaseUrl,
        reservationId,
        headers,
      });
      if (!commitResult.ok) {
        return res.status(502).json({
          message: `Ancillary add commit failed (${commitResult.status})`,
          details: commitResult.errorMessage,
          stage: "commit",
        });
      }
      commitPayload = commitResult.payload;
    }

    return res.status(200).json({
      success: true,
      message: "Ancillary added successfully.",
      pnr: pnr || reservationId,
      reservationId,
      travelerIdentifier,
      addOfferResponse: addAncillaryPayloadResponse,
      commitResponse: commitPayload,
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Ancillary add failed",
    });
  }
}
