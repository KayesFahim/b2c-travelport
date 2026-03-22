import type { NextApiRequest, NextApiResponse } from "next";
import { appendFile } from "fs/promises";
import path from "path";
import { getTravelportAccessToken } from "./_token-cache";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { getSessionUser } from "@/server/auth-session";

type BookHoldBody = {
  selectedAirPrice?: Record<string, unknown>;
  selectedOffer?: Record<string, unknown>;
  offer?: Record<string, unknown>;
  data?: Record<string, unknown>;
  reservationId?: string;
  commit?: boolean | string;
  commitOnly?: boolean | string;
  bookingFlowKey?: string;
  bookingOfferKey?: string;
  bookingFlowExpiresAt?: number | string;
  seatSelections?: unknown;
  adultCount?: number | string;
  childCount?: number | string;
  infantCount?: number | string;
  passengers?:
  | Array<Record<string, unknown>>
  | {
    adult?: number | string;
    child?: number | string;
    infant?: number | string;
  };
};

type ErrorResponse = {
  message: string;
  details?: string;
  warnings?: string[];
  requiresLogin?: boolean;
  previousBooking?: Record<string, unknown>;
  dailyCommittedCount?: number;
};

type SuccessResponse = {
  success: true;
  bookingStage: "prepared" | "committed";
  reservationId: string;
  offerIdentifiers: string[];
  addOfferMode: "catalogOfferings" | "products" | null;
  travelerIdentifiers: string[];
  primaryContactIdentifier: string | null;
  locator: string | null;
  warnings: string[];
  workbenchResponse: Record<string, unknown> | null;
  addOfferResponse: Record<string, unknown> | null;
  travelerResponse: Record<string, unknown> | null;
  seatOfferResponse: Record<string, unknown> | null;
  primaryContactResponse: Record<string, unknown> | null;
  commitResponse: Record<string, unknown> | null;
  bookingFlowKey?: string | null;
  bookingOfferKey?: string | null;
  bookingFlowExpiresAt?: number | null;
};

type BookingFlowRecord = {
  key: string;
  offerKey: string;
  createdAt: number;
  expiresAt: number;
  reservationId: string | null;
  status: "active" | "prepared";
};

const BOOKING_FLOW_TTL_MS = 10 * 60 * 1000;

function getBookingFlowStore(): Map<string, BookingFlowRecord> {
  const storeHost = globalThis as typeof globalThis & {
    __flyjattBookingFlowStore?: Map<string, BookingFlowRecord>;
  };
  if (!storeHost.__flyjattBookingFlowStore) {
    storeHost.__flyjattBookingFlowStore = new Map<string, BookingFlowRecord>();
  }
  return storeHost.__flyjattBookingFlowStore;
}

function purgeExpiredBookingFlows(now = Date.now()) {
  const store = getBookingFlowStore();
  for (const [key, record] of store.entries()) {
    if (!record || record.expiresAt <= now) {
      store.delete(key);
    }
  }
}

function resolveFlowExpiry(rawExpiresAt: unknown, now = Date.now()): number {
  const requested = toNumber(rawExpiresAt, 0);
  if (!Number.isFinite(requested) || requested <= now) {
    return now + BOOKING_FLOW_TTL_MS;
  }
  return Math.min(requested, now + BOOKING_FLOW_TTL_MS);
}

function ensureBookingFlow(params: {
  flowKey: string;
  offerKey: string;
  reservationId?: string | null;
  expiresAt: number;
  now?: number;
  status: "active" | "prepared";
}) {
  const now = Number.isFinite(params.now) ? Number(params.now) : Date.now();
  const store = getBookingFlowStore();
  const existing = store.get(params.flowKey);
  store.set(params.flowKey, {
    key: params.flowKey,
    offerKey: params.offerKey || existing?.offerKey || "",
    createdAt: existing?.createdAt || now,
    expiresAt: params.expiresAt,
    reservationId:
      params.reservationId !== undefined
        ? params.reservationId
        : existing?.reservationId || null,
    status: params.status,
  });
}

function clearBookingFlow(flowKey: string) {
  const normalizedKey = toText(flowKey);
  if (!normalizedKey) return;
  getBookingFlowStore().delete(normalizedKey);
}

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseBooleanFlag(value: unknown, defaultValue: boolean): boolean {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  if (text === "true") return true;
  if (text === "false") return false;
  return defaultValue;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
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
      toText(source.code) ||
      toText(source.Code) ||
      ""
    );
  }
  return "";
}

function generateServerFlowKey(prefix: string): string {
  const seed = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${seed}`;
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

function splitDateTime(value: unknown): { date: string; time: string } {
  const raw = toText(value);
  if (!raw) {
    return { date: "", time: "00:00:00" };
  }

  const normalized = raw.replace(" ", "T");
  const isoMatch = normalized.match(
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

  return {
    date: `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}-${String(parsed.getUTCDate()).padStart(2, "0")}`,
    time: `${String(parsed.getUTCHours()).padStart(2, "0")}:${String(
      parsed.getUTCMinutes()
    ).padStart(2, "0")}:${String(parsed.getUTCSeconds()).padStart(2, "0")}`,
  };
}

function formatDateOnlyUtc(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function getRelativeBirthDateFromNow(yearsAgo: number): string {
  const now = new Date();
  const target = new Date(
    Date.UTC(
      now.getUTCFullYear() - yearsAgo,
      now.getUTCMonth(),
      now.getUTCDate(),
      0,
      0,
      0
    )
  );
  return formatDateOnlyUtc(target);
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

function normalizeSegments(leg: Record<string, unknown>): Record<string, unknown>[] {
  const segments = getArrayByKeys(leg, [
    "Segments",
    "segments",
    "FlightSegment",
    "flightSegment",
    "segmentList",
    "SegmentList",
  ]);
  if (segments.length) {
    if (Array.isArray(segments[0])) {
      return (segments as unknown[]).flat() as Record<string, unknown>[];
    }
    return segments as Record<string, unknown>[];
  }

  const segmentObject = getValueByKeys(leg, ["Segment", "segment"]);
  if (segmentObject && typeof segmentObject === "object") {
    return [segmentObject as Record<string, unknown>];
  }
  return [];
}

function resolveSelectedOffer(body: BookHoldBody): Record<string, unknown> {
  const candidates = [
    body?.selectedAirPrice,
    body?.selectedOffer,
    body?.offer,
    body?.data,
  ];
  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      const resolved = candidate as Record<string, unknown>;
      if (
        getArrayByKeys(resolved, ["AllLegsInfo", "allLegsInfo", "legs"]).length > 0
      ) {
        return resolved;
      }

      const combination = getArrayByKeys(resolved, ["combination", "Combination"]);
      const firstCombination = combination.find(
        (item) =>
          item &&
          typeof item === "object" &&
          getArrayByKeys(item as Record<string, unknown>, [
            "AllLegsInfo",
            "allLegsInfo",
            "legs",
          ]).length > 0
      );
      if (firstCombination && typeof firstCombination === "object") {
        return firstCombination as Record<string, unknown>;
      }

      return resolved;
    }
  }
  return {};
}

type BookingFingerprint = {
  routeKey: string;
  airlineCode: string;
  travelDate: Date;
  flightSignature: string;
  departureCode: string;
  arrivalCode: string;
  totalFare: number;
  currencyCode: string;
};

function resolveBookingFingerprint(offer: Record<string, unknown>): BookingFingerprint {
  const legs = getArrayByKeys(offer, ["AllLegsInfo", "allLegsInfo", "legs", "Legs"]);
  const allSegments = legs
    .map((leg) => normalizeSegments((leg ?? {}) as Record<string, unknown>))
    .flat();

  const firstSegment =
    (allSegments[0] as Record<string, unknown> | undefined) || ({} as Record<string, unknown>);
  const lastSegment =
    (allSegments[allSegments.length - 1] as Record<string, unknown> | undefined) ||
    ({} as Record<string, unknown>);

  const depFrom =
    toText(getValueByKeys(firstSegment, ["DepFrom", "depFrom", "from", "From"])) ||
    toText(getValueByKeys(offer, ["DepFrom", "depFrom"])) ||
    "NA";
  const arrTo =
    toText(getValueByKeys(lastSegment, ["ArrTo", "arrTo", "to", "To"])) ||
    toText(getValueByKeys(offer, ["ArrTo", "arrTo"])) ||
    "NA";
  const firstDepDate = splitDateTime(
    getValueByKeys(firstSegment, ["DepTime", "depTime", "departureDateTime"])
  ).date;

  const travelDate = firstDepDate
    ? new Date(`${firstDepDate}T00:00:00.000Z`)
    : new Date(Date.now());
  const airlineCode =
    toText(
      getValueByKeys(firstSegment, [
        "MarketingCarrier",
        "marketingCarrier",
        "carrier",
        "Carrier",
      ])
    ) || toText(getValueByKeys(offer, ["Carrier", "carrier"])) || "NA";

  const signatureRows = allSegments.map((segmentRaw) => {
    const segment = (segmentRaw ?? {}) as Record<string, unknown>;
    const dep = splitDateTime(getValueByKeys(segment, ["DepTime", "depTime"]));
    return [
      toText(
        getValueByKeys(segment, [
          "MarketingCarrier",
          "marketingCarrier",
          "carrier",
          "Carrier",
        ])
      ) || "NA",
      toText(
        getValueByKeys(segment, [
          "MarketingFlightNumber",
          "marketingFlightNumber",
          "flightNumber",
        ])
      ) || "NA",
      dep.date || "NA",
      toText(getValueByKeys(segment, ["DepFrom", "depFrom", "from"])) || "NA",
      toText(getValueByKeys(segment, ["ArrTo", "arrTo", "to"])) || "NA",
    ].join("_");
  });

  const fallbackSignature = [
    airlineCode || "NA",
    depFrom || "NA",
    arrTo || "NA",
    firstDepDate || "NA",
  ].join("_");

  return {
    routeKey: `${depFrom}-${arrTo}`,
    airlineCode,
    travelDate,
    flightSignature: signatureRows.length ? signatureRows.join("|") : fallbackSignature,
    departureCode: depFrom,
    arrivalCode: arrTo,
    totalFare: toNumber(
      getValueByKeys(offer, [
        "NetFare",
        "netFare",
        "GrossFare",
        "grossFare",
        "TotalPrice",
        "totalPrice",
      ]),
      0
    ),
    currencyCode:
      toText(getValueByKeys(offer, ["CurrencyCode", "currencyCode"])) || "USD",
  };
}

function normalizePassengerRows(body: BookHoldBody): Array<Record<string, unknown>> {
  if (!Array.isArray(body?.passengers)) return [];
  return (body.passengers as Array<Record<string, unknown>>).filter(
    (passenger) => passenger && typeof passenger === "object"
  );
}

function toUtcDayBounds(date = new Date()): { start: Date; end: Date } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

function getBookingSummaryRow(booking: {
  id: number;
  locator: string | null;
  reservationId: string | null;
  routeKey: string;
  airlineCode: string;
  travelDate: Date;
  createdAt: Date;
}) {
  return {
    id: booking.id,
    locator: booking.locator,
    reservationId: booking.reservationId,
    routeKey: booking.routeKey,
    airlineCode: booking.airlineCode,
    travelDate: booking.travelDate.toISOString().slice(0, 10),
    createdAt: booking.createdAt.toISOString(),
  };
}

function countPassengersFromList(passengers: Array<Record<string, unknown>>) {
  let adt = 0;
  let chd = 0;
  let inf = 0;

  passengers.forEach((passenger) => {
    const paxType = String(
      getValueByKeys(passenger, [
        "PaxType",
        "paxType",
        "type",
        "passengerTypeCode",
        "PassengerTypeCode",
      ]) ?? ""
    )
      .trim()
      .toUpperCase();

    if (["ADT", "ADULT"].includes(paxType)) adt += 1;
    if (["CHD", "CHILD", "CNN"].includes(paxType)) chd += 1;
    if (["INF", "INFANT"].includes(paxType)) inf += 1;
  });

  return { adt, chd, inf };
}

function resolvePassengerCounts(
  offer: Record<string, unknown>,
  body: BookHoldBody
): { adt: number; chd: number; inf: number } {
  const listPassengers = Array.isArray(body?.passengers)
    ? (body.passengers as Array<Record<string, unknown>>)
    : [];
  if (listPassengers.length > 0) {
    const counts = countPassengersFromList(listPassengers);
    if (counts.adt || counts.chd || counts.inf) {
      return {
        adt: Math.max(1, counts.adt),
        chd: Math.max(0, counts.chd),
        inf: Math.max(0, counts.inf),
      };
    }
  }

  const bodyPassengerCounts =
    body?.passengers && !Array.isArray(body.passengers)
      ? (body.passengers as {
        adult?: number | string;
        child?: number | string;
        infant?: number | string;
      })
      : {};

  const adtFromBody = toNumber(body?.adultCount ?? bodyPassengerCounts?.adult ?? 0, 0);
  const chdFromBody = toNumber(body?.childCount ?? bodyPassengerCounts?.child ?? 0, 0);
  const infFromBody = toNumber(
    body?.infantCount ?? bodyPassengerCounts?.infant ?? 0,
    0
  );
  if (adtFromBody || chdFromBody || infFromBody) {
    return {
      adt: Math.max(1, adtFromBody || 1),
      chd: Math.max(0, chdFromBody),
      inf: Math.max(0, infFromBody),
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
  body: BookHoldBody
) {
  const counts = resolvePassengerCounts(offer, body);
  const criteria: Array<Record<string, unknown>> = [];

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

  return criteria.length
    ? criteria
    : [{ "@type": "PassengerCriteria", number: 1, age: 25, passengerTypeCode: "ADT" }];
}

function buildProductCriteriaAir(offer: Record<string, unknown>) {
  const legs = getArrayByKeys(offer, ["AllLegsInfo", "allLegsInfo", "legs", "Legs"]);
  let segmentSequence = 1;

  return legs
    .map((leg, legIndex) => {
      const legObj = (leg ?? {}) as Record<string, unknown>;
      const segments = normalizeSegments(legObj);
      if (!segments.length) return null;

      const brandFeatures =
        (getValueByKeys(legObj, ["BrandFeatures", "brandFeatures"]) as
          | Record<string, unknown>
          | undefined) || {};

      const specificFlightCriteria = segments
        .map((segmentRaw) => {
          const segment = (segmentRaw ?? {}) as Record<string, unknown>;
          const segmentCode =
            (getValueByKeys(segment, ["SegmentCode", "segmentCode"]) as
              | Record<string, unknown>
              | undefined) || {};
          const dep = splitDateTime(getValueByKeys(segment, ["DepTime", "depTime"]));
          const arr = splitDateTime(getValueByKeys(segment, ["ArrTime", "arrTime"]));

          const derivedSequence = toNumber(
            getValueByKeys(segment, [
              "segmentSequence",
              "SegmentSequence",
              "sequence",
              "Sequence",
            ]),
            0
          );
          const depFrom =
            toText(getValueByKeys(segment, ["DepFrom", "depFrom", "from", "From"])) ||
            toText(getValueByKeys(legObj, ["DepFrom", "depFrom", "departureFrom"]));
          const arrTo =
            toText(getValueByKeys(segment, ["ArrTo", "arrTo", "to", "To"])) ||
            toText(getValueByKeys(legObj, ["ArrTo", "arrTo", "arrivalTo"]));

          const criteria: Record<string, unknown> = {
            flightNumber: toText(
              getValueByKeys(segment, [
                "MarketingFlightNumber",
                "marketingFlightNumber",
                "flightNumber",
                "FlightNumber",
                "number",
                "Number",
              ])
            ),
            carrier: toText(
              getValueByKeys(segment, [
                "MarketingCarrier",
                "marketingCarrier",
                "carrier",
                "Carrier",
              ])
            ),
            departureDate: dep.date,
            departureTime: dep.time,
            arrivalDate: arr.date,
            arrivalTime: arr.time,
            from: depFrom,
            to: arrTo,
            classOfService: toText(
              getValueByKeys(segmentCode, [
                "bookingCode",
                "BookingCode",
                "classOfService",
                "ClassOfService",
                "code",
                "Code",
              ]) || "Y"
            ),
            cabin: normalizeCabin(
              getValueByKeys(segmentCode, [
                "cabinCode",
                "CabinCode",
                "cabin",
                "Cabin",
                "classOfServiceName",
              ])
            ),
            segmentSequence: derivedSequence > 0 ? derivedSequence : segmentSequence,
            brandTier: toText(
              getValueByKeys(segment, ["brandTier", "BrandTier"]) ??
              getValueByKeys(brandFeatures, ["tier", "Tier"]) ??
              "1"
            ),
            AvailabilitySourceCode:
              toText(
                getValueByKeys(segment, [
                  "AvailabilitySourceCode",
                  "availabilitySourceCode",
                ])
              ) || "A",
            ContentSource:
              toText(getValueByKeys(segment, ["ContentSource", "contentSource"])) ||
              "GDS",
          };

          const boundFlightsInd = getValueByKeys(segment, [
            "boundFlightsInd",
            "BoundFlightsInd",
          ]);
          if (typeof boundFlightsInd === "boolean") {
            criteria.boundFlightsInd = boundFlightsInd;
          }

          segmentSequence += 1;
          return criteria;
        })
        .filter(
          (criteria) =>
            toText(criteria.flightNumber) &&
            toText(criteria.carrier) &&
            toText(criteria.from) &&
            toText(criteria.to) &&
            toText(criteria.departureDate)
        );

      if (!specificFlightCriteria.length) return null;
      return {
        sequence: legIndex + 1,
        SpecificFlightCriteria: specificFlightCriteria,
      };
    })
    .filter(Boolean);
}

function buildAddOfferPayload(
  offer: Record<string, unknown>,
  body: BookHoldBody,
  options?: {
    validateInventoryInd?: boolean;
    relaxSpecificFlightCriteria?: boolean;
  }
) {
  const productCriteriaAir = buildProductCriteriaAir(offer);
  if (options?.relaxSpecificFlightCriteria) {
    productCriteriaAir.forEach((legCriteria) => {
      const specificFlights = Array.isArray(legCriteria?.SpecificFlightCriteria)
        ? legCriteria.SpecificFlightCriteria
        : [];
      specificFlights.forEach((criteria) => {
        if (!criteria || typeof criteria !== "object") return;
        delete criteria.classOfService;
        delete criteria.brandTier;
        if (typeof criteria.cabin === "string" && !criteria.cabin.trim()) {
          delete criteria.cabin;
        }
      });
    });
  }

  return {
    "@type": "OfferQueryBuildFromProducts",
    BuildFromProductsRequest: {
      "@type": "BuildFromProductsRequestAir",
      PassengerCriteria: buildPassengerCriteria(offer, body),
      ProductCriteriaAir: productCriteriaAir,
    },
    validateInventoryInd: options?.validateInventoryInd ?? true,
  };
}

function resolveBookingBaseUrl(version: string): string {
  const directUrl =
    process.env.TRAVELPORT_AIR_BOOKING ||
    process.env.TRAVELPORT_AIR_BOOKING_URL ||
    "";
  if (directUrl.trim()) {
    return directUrl.trim().replace(/\/+$/, "");
  }

  const baseUrl = process.env.TRAVELPORT_BASE_URL || "https://api.pp.travelport.net";
  return `${baseUrl.replace(/\/+$/, "")}/${version}/air/book`;
}

async function createToken(): Promise<string> {
  return getTravelportAccessToken();
}

function resolveReservationId(payload: Record<string, unknown>): string {
  const reservationResponse =
    (getValueByKeys(payload, ["ReservationResponse", "reservationResponse"]) as
      | Record<string, unknown>
      | undefined) || payload;
  const reservation =
    (getValueByKeys(reservationResponse, ["Reservation", "reservation"]) as
      | Record<string, unknown>
      | undefined) || reservationResponse;
  return toText(
    getValueByKeys(reservation, ["Identifier", "identifier", "id", "ID"]) ??
    getValueByKeys(payload, ["reservationId", "ReservationId"])
  );
}

function resolveOfferIdentifiers(payload: Record<string, unknown>): string[] {
  const offerListResponse =
    (getValueByKeys(payload, ["OfferListResponse", "offerListResponse"]) as
      | Record<string, unknown>
      | undefined) || payload;
  const offerRows = getArrayByKeys(offerListResponse, ["OfferID", "offerId", "offerID"]);
  const identifiers = offerRows
    .map((row) =>
      toText(
        getValueByKeys(row as Record<string, unknown>, [
          "Identifier",
          "identifier",
          "id",
          "ID",
        ])
      )
    )
    .filter(Boolean);
  return Array.from(new Set(identifiers));
}

function resolveIdentifierList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((entry) => toText(entry)).filter(Boolean)));
  }
  const single = toText(value);
  return single ? [single] : [];
}

function resolveCatalogOfferingsRequest(offer: Record<string, unknown>) {
  const directSources: Array<Record<string, unknown> | null> = [
    offer,
    offer?.farePolicyRequest && typeof offer.farePolicyRequest === "object"
      ? (offer.farePolicyRequest as Record<string, unknown>)
      : null,
    offer?.seatAvailabilityRequest && typeof offer.seatAvailabilityRequest === "object"
      ? (offer.seatAvailabilityRequest as Record<string, unknown>)
      : null,
    offer?.sourceUnified && typeof offer.sourceUnified === "object"
      ? (offer.sourceUnified as Record<string, unknown>)
      : null,
  ];

  let offerListIdentifier = "";
  let offerIdentifier = "";
  let productIdentifiers: string[] = [];

  for (const source of directSources) {
    if (!source) continue;

    if (!offerListIdentifier) {
      offerListIdentifier = toText(
        getValueByKeys(source, [
          "offerListIdentifier",
          "OfferListIdentifier",
          "catalogOfferingsIdentifier",
          "CatalogOfferingsIdentifier",
          "catalogProductOfferingsIdentifier",
          "CatalogProductOfferingsIdentifier",
        ])
      );
    }

    if (!offerIdentifier) {
      offerIdentifier = toText(
        getValueByKeys(source, [
          "offerIdentifier",
          "OfferIdentifier",
          "catalogOfferingIdentifier",
          "CatalogOfferingIdentifier",
        ])
      );
    }

    if (!productIdentifiers.length) {
      productIdentifiers = resolveIdentifierList(
        getValueByKeys(source, [
          "productIdentifiers",
          "ProductIdentifiers",
          "productIdentifier",
          "ProductIdentifier",
        ])
      );
    }
  }

  if (!offerListIdentifier || !offerIdentifier || !productIdentifiers.length) {
    return null;
  }

  return {
    offerListIdentifier,
    offerIdentifier,
    productIdentifiers,
  };
}

function buildCatalogOfferingsPayload(params: {
  offerListIdentifier: string;
  offerIdentifier: string;
  productIdentifiers: string[];
}) {
  return {
    "@type": "OfferQueryBuildFromCatalogOfferings",
    BuildFromCatalogOfferingsRequest: {
      "@type": "BuildFromCatalogOfferingsRequestAir",
      CatalogOfferingsIdentifier: {
        Identifier: {
          value: params.offerListIdentifier,
          authority: "Travelport",
        },
      },
      CatalogOfferingIdentifier: {
        Identifier: {
          value: params.offerIdentifier,
          authority: "Travelport",
        },
      },
      ProductIdentifier: params.productIdentifiers.map((identifier) => ({
        Identifier: {
          value: identifier,
        },
      })),
    },
    reCheckInventoryInd: true,
    lowFareFinderInd: false,
    returnBrandedFaresInd: true,
  };
}

type SeatSelectionResolved = {
  offerListIdentifier: string;
  offerIdentifier: string;
  productIdentifier: string;
  travelerIdentifier?: string;
  travelerIndex?: number;
  travelerTypeCode?: string;
  travelerNumber?: number;
  segmentRef?: string;
  seatAssignment: string;
};

type TravelerReference = {
  identifier: string;
  paxTypeCode: string;
  travelerIndex: number;
  travelerNumber: number;
};

function toIndex(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const integer = Math.trunc(parsed);
  return integer >= 0 ? integer : undefined;
}

function toPositiveInteger(value: unknown): number | undefined {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const integer = Math.trunc(parsed);
  return integer > 0 ? integer : undefined;
}

function parseTravelerCodeAndNumber(value: unknown): {
  travelerTypeCode?: string;
  travelerNumber?: number;
} {
  const text = String(value ?? "").trim().toUpperCase();
  if (!text) return {};
  const match = text.match(
    /(ADT|ADULT|CHD|CNN|CHILD|INF|INFANT)[^0-9]*([0-9]{1,2})?/
  );
  if (!match) return {};
  const travelerTypeCode = normalizePaxTypeCode(match[1]);
  const travelerNumber = toPositiveInteger(match[2]);
  return {
    ...(travelerTypeCode ? { travelerTypeCode } : {}),
    ...(travelerNumber ? { travelerNumber } : {}),
  };
}

function normalizeSeatAssignment(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function resolveSeatSelections(
  body: BookHoldBody,
  selectedOffer: Record<string, unknown>
): SeatSelectionResolved[] {
  const rawSelections = Array.isArray(body?.seatSelections)
    ? body.seatSelections
    : Array.isArray((selectedOffer as Record<string, unknown>)?.seatSelections)
      ? ((selectedOffer as Record<string, unknown>).seatSelections as unknown[])
      : [];
  if (!rawSelections.length) return [];

  const defaultCatalogRequest = resolveCatalogOfferingsRequest(selectedOffer);
  const resolved: SeatSelectionResolved[] = [];

  for (const selection of rawSelections) {
    if (!selection || typeof selection !== "object") continue;
    const item = selection as Record<string, unknown>;

    const seatAssignment = normalizeSeatAssignment(
      getValueByKeys(item, [
        "seatAssignment",
        "SeatAssignment",
        "seat",
        "Seat",
        "seatCode",
        "SeatCode",
        "seatNumber",
        "SeatNumber",
      ])
    );
    const productIdentifier = toText(
      getValueByKeys(item, [
        "productIdentifier",
        "ProductIdentifier",
        "productId",
        "ProductId",
        "productRef",
        "ProductRef",
        "segmentProductIdentifier",
      ])
    );
    const offerListIdentifier =
      toText(
        getValueByKeys(item, [
          "offerListIdentifier",
          "OfferListIdentifier",
          "catalogOfferingsIdentifier",
          "CatalogOfferingsIdentifier",
        ])
      ) || toText(defaultCatalogRequest?.offerListIdentifier);
    const offerIdentifier =
      toText(
        getValueByKeys(item, [
          "offerIdentifier",
          "OfferIdentifier",
          "catalogOfferingIdentifier",
          "CatalogOfferingIdentifier",
        ])
      ) || toText(defaultCatalogRequest?.offerIdentifier);
    const travelerIdentifier = toText(
      getValueByKeys(item, [
        "travelerIdentifier",
        "TravelerIdentifier",
        "travelerIdentifierRef",
        "TravelerIdentifierRef",
      ])
    );
    const travelerIndex = toIndex(
      getValueByKeys(item, [
        "travelerIndex",
        "TravelerIndex",
        "passengerIndex",
        "PassengerIndex",
        "paxIndex",
      ])
    );
    const travelerTypeRaw = toText(
      getValueByKeys(item, [
        "travelerTypeCode",
        "TravelerTypeCode",
        "passengerTypeCode",
        "PassengerTypeCode",
        "paxType",
        "PaxType",
        "travelerType",
        "TravelerType",
      ])
    );
    const travelerTypeCode = travelerTypeRaw
      ? normalizePaxTypeCode(travelerTypeRaw)
      : undefined;
    const travelerNumber = toPositiveInteger(
      getValueByKeys(item, [
        "travelerNumber",
        "TravelerNumber",
        "passengerNumber",
        "PassengerNumber",
        "paxNumber",
        "PaxNumber",
        "travelerSequence",
        "TravelerSequence",
        "passengerSequence",
        "PassengerSequence",
      ])
    );
    const travelerCodeAndNumberFallback = parseTravelerCodeAndNumber(
      getValueByKeys(item, [
        "travelerKey",
        "TravelerKey",
        "traveler",
        "Traveler",
        "travelerLabel",
        "TravelerLabel",
      ])
    );
    const segmentRef = toText(
      getValueByKeys(item, ["segmentRef", "SegmentRef", "flightRef", "FlightRef"])
    );

    if (!seatAssignment || !productIdentifier || !offerListIdentifier || !offerIdentifier) {
      continue;
    }

    resolved.push({
      offerListIdentifier,
      offerIdentifier,
      productIdentifier,
      ...(travelerIdentifier ? { travelerIdentifier } : {}),
      ...(travelerIndex !== undefined ? { travelerIndex } : {}),
      ...(travelerTypeCode
        ? { travelerTypeCode }
        : travelerCodeAndNumberFallback.travelerTypeCode
          ? { travelerTypeCode: travelerCodeAndNumberFallback.travelerTypeCode }
          : {}),
      ...(travelerNumber
        ? { travelerNumber }
        : travelerCodeAndNumberFallback.travelerNumber
          ? { travelerNumber: travelerCodeAndNumberFallback.travelerNumber }
          : {}),
      ...(segmentRef ? { segmentRef } : {}),
      seatAssignment,
    });
  }

  return resolved;
}

function buildSeatAncillaryOffersPayload(params: {
  seatSelections: SeatSelectionResolved[];
  travelerIdentifiers: string[];
  travelerReferences: TravelerReference[];
}) {
  const referencesByType = new Map<string, TravelerReference[]>();
  params.travelerReferences.forEach((reference) => {
    const typeCode = normalizePaxTypeCode(reference.paxTypeCode);
    const list = referencesByType.get(typeCode) || [];
    list.push(reference);
    referencesByType.set(typeCode, list);
  });

  const offers = params.seatSelections
    .map((selection, index) => {
      let travelerIdentifier = selection.travelerIdentifier;

      if (!travelerIdentifier && selection.travelerTypeCode) {
        const normalizedTypeCode = normalizePaxTypeCode(selection.travelerTypeCode);
        const typedReferences = referencesByType.get(normalizedTypeCode) || [];
        if (selection.travelerNumber && selection.travelerNumber > 0) {
          const matched = typedReferences.find(
            (reference) => reference.travelerNumber === selection.travelerNumber
          );
          travelerIdentifier = matched?.identifier;
        }
        if (!travelerIdentifier && typedReferences.length > 0) {
          travelerIdentifier = typedReferences[0].identifier;
        }
      }

      if (!travelerIdentifier && selection.travelerIndex !== undefined) {
        const fromReferences = params.travelerReferences[selection.travelerIndex];
        travelerIdentifier =
          fromReferences?.identifier || params.travelerIdentifiers[selection.travelerIndex];
      }

      const fallbackTravelerIdentifier =
        selection.travelerIndex !== undefined
          ? params.travelerIdentifiers[selection.travelerIndex]
          : params.travelerIdentifiers[index] || params.travelerIdentifiers[0];
      travelerIdentifier = travelerIdentifier || fallbackTravelerIdentifier;
      if (!travelerIdentifier) return null;

      return {
        "@type": "BuildAncillaryOffersFromCatalogOfferingsAirSeat",
        CatalogOfferingsIdentifier: {
          Identifier: {
            value: selection.offerListIdentifier,
          },
        },
        CatalogOfferingIdentifier: {
          Identifier: {
            value: selection.offerIdentifier,
          },
        },
        ProductIdentifier: {
          Identifier: {
            value: selection.productIdentifier,
          },
        },
        TravelerIdentifierRef: {
          value: travelerIdentifier,
        },
        SeatAssignment: selection.seatAssignment,
      };
    })
    .filter(Boolean);

  if (!offers.length) return null;

  return {
    "@type": "OfferQueryBuildAncillaryOffersFromCatalogOfferings",
    BuildAncillaryOffersFromCatalogOfferings: offers,
  };
}

async function persistLocatorToLocalFile(params: {
  locator: string;
  reservationId: string;
  offerIdentifiers: string[];
}) {
  const normalizedLocator = toText(params.locator);
  if (!normalizedLocator) return;

  const filePath = path.join(process.cwd(), "atpn.txt");
  const line = `${new Date().toISOString()} | Locator=${normalizedLocator} | ReservationId=${params.reservationId
    } | OfferIdentifiers=${params.offerIdentifiers.join(",") || "N/A"}\n`;
  await appendFile(filePath, line, "utf8");
}

function truncateForLog(value: unknown, maxLength: number): string {
  const text = toText(value).replace(/\s+/g, " ").trim();
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

async function persistBookingFailureToLocalFile(params: {
  stage: string;
  status: number;
  message: string;
  details?: string;
  reservationId?: string | null;
  offerIdentifiers?: string[];
  bookingFlowKey?: string;
  bookingOfferKey?: string;
  warnings?: string[];
  commitRequested?: boolean;
  commitOnlyRequested?: boolean;
}) {
  const filePath = path.join(process.cwd(), "atpn_failed.txt");
  const sharedLogPath = path.join(process.cwd(), "atpn.txt");
  const logEntry = {
    timestamp: new Date().toISOString(),
    stage: params.stage,
    status: params.status,
    message: truncateForLog(params.message, 500),
    details: truncateForLog(params.details, 1200),
    reservationId: toText(params.reservationId) || "N/A",
    bookingFlowKey: toText(params.bookingFlowKey) || "N/A",
    bookingOfferKey: toText(params.bookingOfferKey) || "N/A",
    offerIdentifiers: Array.isArray(params.offerIdentifiers)
      ? params.offerIdentifiers.filter(Boolean)
      : [],
    warnings: (params.warnings || [])
      .map((warning) => truncateForLog(warning, 300))
      .filter(Boolean),
    commitRequested: Boolean(params.commitRequested),
    commitOnlyRequested: Boolean(params.commitOnlyRequested),
  };
  const serialized = JSON.stringify(logEntry);
  await appendFile(filePath, `${serialized}\n`, "utf8");
  await appendFile(
    sharedLogPath,
    `${logEntry.timestamp} | FAILED | Stage=${logEntry.stage} | Status=${logEntry.status
    } | ReservationId=${logEntry.reservationId} | FlowKey=${logEntry.bookingFlowKey
    } | OfferKey=${logEntry.bookingOfferKey} | Message=${logEntry.message} | Details=${logEntry.details || "N/A"
    }\n`,
    "utf8"
  );
}

async function respondWithLoggedError(
  res: NextApiResponse<SuccessResponse | ErrorResponse>,
  params: {
    status: number;
    message: string;
    details?: string;
    warnings?: string[];
    stage: string;
    reservationId?: string | null;
    offerIdentifiers?: string[];
    bookingFlowKey?: string;
    bookingOfferKey?: string;
    commitRequested?: boolean;
    commitOnlyRequested?: boolean;
  }
) {
  try {
    await persistBookingFailureToLocalFile({
      stage: params.stage,
      status: params.status,
      message: params.message,
      details: params.details,
      reservationId: params.reservationId,
      offerIdentifiers: params.offerIdentifiers,
      bookingFlowKey: params.bookingFlowKey,
      bookingOfferKey: params.bookingOfferKey,
      warnings: params.warnings,
      commitRequested: params.commitRequested,
      commitOnlyRequested: params.commitOnlyRequested,
    });
  } catch {
    // Do not block API response when local logging fails.
  }

  const responseBody: ErrorResponse = {
    message: params.message,
    ...(params.details ? { details: params.details } : {}),
    ...(params.warnings?.length ? { warnings: params.warnings } : {}),
  };
  return res.status(params.status).json(responseBody);
}

async function parseJsonSafe(response: Response) {
  return response.json().catch(() => ({}));
}

function extractTravelportErrorMessage(payload: Record<string, unknown>): string {
  const roots: Array<Record<string, unknown> | null> = [
    payload,
    getValueByKeys(payload, ["OfferListResponse", "offerListResponse"]) as
    | Record<string, unknown>
    | null,
    getValueByKeys(payload, ["ReservationResponse", "reservationResponse"]) as
    | Record<string, unknown>
    | null,
  ];

  for (const root of roots) {
    if (!root || typeof root !== "object") continue;
    const result = getValueByKeys(root, ["Result", "result"]) as
      | Record<string, unknown>
      | undefined;
    if (!result || typeof result !== "object") continue;

    const errors = getArrayByKeys(result, ["Error", "error"]);
    if (!errors.length) continue;

    for (const errorEntry of errors) {
      const message = toText(
        getValueByKeys(errorEntry as Record<string, unknown>, [
          "Message",
          "message",
          "description",
          "Description",
        ])
      );
      if (message) return message;
    }
    return "Travelport returned an error result.";
  }

  return "";
}

function hasTravelportErrors(payload: Record<string, unknown>): boolean {
  return Boolean(extractTravelportErrorMessage(payload));
}

function normalizePaxTypeCode(value: unknown): string {
  const code = String(value ?? "")
    .trim()
    .toUpperCase();
  if (["ADT", "ADULT"].includes(code)) return "ADT";
  if (["CHD", "CHILD", "CNN"].includes(code)) return "CHD";
  if (["INF", "INFANT"].includes(code)) return "INF";
  return "ADT";
}

function isInventoryAvailabilityMessage(message: string): boolean {
  const normalized = String(message || "").toLowerCase();
  if (!normalized) return false;
  return (
    normalized.includes("avail/wl open") ||
    normalized.includes("waitlist") ||
    normalized.includes("wait list") ||
    normalized.includes("inventory") ||
    normalized.includes("sell class") ||
    normalized.includes("class unavailable") ||
    normalized.includes("no availability")
  );
}

function normalizeGender(value: unknown): "MALE" | "FEMALE" | undefined {
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!text) return undefined;
  if (["m", "male"].includes(text)) return "MALE";
  if (["f", "female"].includes(text)) return "FEMALE";
  return undefined;
}

function normalizeTravelerPrefix(
  rawTitle: unknown,
  paxTypeCode: string,
  gender?: "MALE" | "FEMALE"
): string {
  const title = toText(rawTitle).toUpperCase();
  if (title) {
    if (title === "MSTR" || title === "MASTER") return "MSTR";
    if (title === "MR") return "MR";
    if (title === "MRS") return "MRS";
    if (title === "MISS") return "MISS";
    if (title === "MS") return "MS";
    return title;
  }

  if (paxTypeCode === "CHD" || paxTypeCode === "INF") {
    return gender === "FEMALE" ? "MISS" : "MSTR";
  }

  if (gender === "FEMALE") return "MS";
  return "MR";
}

function toDateOnly(value: unknown): string | undefined {
  const text = toText(value);
  if (!text) return undefined;
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(parsed.getUTCDate()).padStart(2, "0")}`;
}

function sanitizePhone(value: unknown): string {
  return String(value ?? "").replace(/[^0-9]/g, "");
}

function sanitizeTravelerNamePart(value: unknown, fallback: string): string {
  const raw = String(value ?? "");
  const ascii = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const normalized = ascii.toUpperCase();
  if (!normalized) return fallback;
  return normalized.slice(0, 60).trim() || fallback;
}

function resolvePassengersForTravelerPayload(
  offer: Record<string, unknown>,
  body: BookHoldBody
): Array<Record<string, unknown>> {
  const listPassengers = Array.isArray(body?.passengers)
    ? (body.passengers as Array<Record<string, unknown>>).filter(
      (item) => item && typeof item === "object"
    )
    : [];
  if (listPassengers.length) return listPassengers;

  const counts = resolvePassengerCounts(offer, body);
  const generated: Array<Record<string, unknown>> = [];
  for (let index = 0; index < counts.adt; index += 1) {
    generated.push({
      PaxType: "ADT",
      FirstName: "ADULT",
      LastName: "TRAVELER",
      Gender: "Male",
      DateOfBirth: getRelativeBirthDateFromNow(30),
    });
  }
  for (let index = 0; index < counts.chd; index += 1) {
    generated.push({
      PaxType: "CHD",
      FirstName: "CHILD",
      LastName: "TRAVELER",
      Gender: "Male",
      DateOfBirth: getRelativeBirthDateFromNow(8),
    });
  }
  for (let index = 0; index < counts.inf; index += 1) {
    generated.push({
      PaxType: "INF",
      FirstName: "INFANT",
      LastName: "TRAVELER",
      Gender: "Male",
      DateOfBirth: getRelativeBirthDateFromNow(1),
    });
  }
  return generated;
}

function buildTravelersPayload(
  offer: Record<string, unknown>,
  body: BookHoldBody
): Array<Record<string, unknown>> {
  const passengers = resolvePassengersForTravelerPayload(offer, body);
  return passengers.map((passenger, index) => {
    const paxTypeCode = normalizePaxTypeCode(
      getValueByKeys(passenger, [
        "PaxType",
        "paxType",
        "type",
        "passengerTypeCode",
        "PassengerTypeCode",
      ])
    );
    const gender = normalizeGender(
      getValueByKeys(passenger, ["Gender", "gender", "Sex", "sex"])
    );
    const prefix = normalizeTravelerPrefix(
      getValueByKeys(passenger, ["Title", "title", "Prefix", "prefix"]),
      paxTypeCode,
      gender
    );
    const given = sanitizeTravelerNamePart(
      toText(
        getValueByKeys(passenger, [
          "FirstName",
          "firstName",
          "fName",
          "Given",
          "given",
        ])
      ),
      "TRAVELER"
    );
    const surname = sanitizeTravelerNamePart(
      toText(
        getValueByKeys(passenger, [
          "LastName",
          "lastName",
          "lName",
          "Surname",
          "surname",
        ])
      ),
      "TEST"
    );
    const birthDate = toDateOnly(
      getValueByKeys(passenger, ["DateOfBirth", "dateOfBirth", "dob", "birthDate"])
    );
    const email = toText(
      getValueByKeys(passenger, ["Email", "email", "emailAddress"])
    );
    const phone = sanitizePhone(
      getValueByKeys(passenger, ["ContactNumber", "contactNumber", "phone", "Phone"])
    );
    const passportNumber = toText(
      getValueByKeys(passenger, ["PassportNumber", "passportNumber", "passNo"])
    );
    const passportExpiryDate = toDateOnly(
      getValueByKeys(passenger, [
        "PassportExpiryDate",
        "passportExpiryDate",
        "passEx",
        "expireDate",
      ])
    );
    const passportIssueCountry = toText(
      getValueByKeys(passenger, [
        "PassportIssuingCountry",
        "passportIssuingCountry",
        "passIssueCountry",
      ])
    ).toUpperCase();
    const birthCountry = toText(
      getValueByKeys(passenger, [
        "PassportNationality",
        "passportNationality",
        "Nationality",
        "nationality",
        "CountryCode",
        "countryCode",
        "passNation",
      ])
    ).toUpperCase();
    const isLeadPassenger = parseBooleanFlag(
      getValueByKeys(passenger, [
        "IsLeadPassenger",
        "isLeadPassenger",
        "LeadPassenger",
        "leadPassenger",
      ]),
      index === 0
    );

    const traveler: Record<string, unknown> = {
      "@type": "Traveler",
      id: `trav_${index + 1}`,
      passengerTypeCode: paxTypeCode,
      PersonName: {
        "@type": "PersonNameDetail",
        ...(prefix ? { Prefix: prefix } : {}),
        Given: given,
        Surname: surname,
        Suffix: paxTypeCode,
      },
      ...(gender ? { gender } : {}),
      ...(birthDate ? { birthDate } : {}),
    };

    if (phone && isLeadPassenger) {
      traveler.Telephone = [
        {
          "@type": "Telephone",
          role: "Mobile",
          phoneNumber: phone,
        },
      ];
    }
    if (email && isLeadPassenger) {
      traveler.Email = [{ comment: "Primary Email Id", value: email }];
    }
    if (
      passportNumber ||
      passportExpiryDate ||
      passportIssueCountry ||
      birthCountry
    ) {
      traveler.TravelDocument = [
        {
          "@type": "TravelDocument",
          ...(passportNumber ? { docNumber: passportNumber } : {}),
          docType: "Passport",
          ...(passportExpiryDate ? { expireDate: passportExpiryDate } : {}),
          ...(passportIssueCountry ? { issueCountry: passportIssueCountry } : {}),
          ...(birthDate ? { birthDate } : {}),
          ...(birthCountry ? { birthCountry } : {}),
          ...(gender ? { Gender: gender } : {}),
          PersonName: {
            "@type": "PersonName",
            Given: given,
            Surname: surname,
          },
        },
      ];
    }

    return traveler;
  });
}

function resolveTravelerIdentifiers(payload: Record<string, unknown>): string[] {
  const identifiers: string[] = [];
  const travelerListResponse = getValueByKeys(payload, [
    "TravelerListResponse",
    "travelerListResponse",
  ]) as Record<string, unknown> | undefined;
  const referenceLists = getArrayByKeys(travelerListResponse || payload, [
    "ReferenceList",
    "referenceList",
  ]);

  for (const list of referenceLists) {
    const travelers = getArrayByKeys(list as Record<string, unknown>, [
      "Traveler",
      "traveler",
    ]);
    for (const traveler of travelers) {
      const identifier = toText(
        getValueByKeys(traveler as Record<string, unknown>, [
          "Identifier",
          "identifier",
          "id",
        ])
      );
      if (identifier) identifiers.push(identifier);
    }
  }

  const travelerResponse = getValueByKeys(payload, [
    "TravelerResponse",
    "travelerResponse",
  ]) as Record<string, unknown> | undefined;
  const travelerFromResponse = getValueByKeys(travelerResponse, [
    "Traveler",
    "traveler",
  ]) as Record<string, unknown> | undefined;
  const singleTravelerIdentifier = toText(
    getValueByKeys(travelerFromResponse, ["Identifier", "identifier", "id"])
  );
  if (singleTravelerIdentifier) {
    identifiers.push(singleTravelerIdentifier);
  }

  return Array.from(new Set(identifiers.filter(Boolean)));
}

function resolveTravelerReferences(payload: Record<string, unknown>): TravelerReference[] {
  const baseRows: Array<{ identifier: string; paxTypeCode: string }> = [];
  const pushTraveler = (traveler: Record<string, unknown> | null | undefined) => {
    if (!traveler || typeof traveler !== "object") return;
    const identifier = toText(
      getValueByKeys(traveler, ["Identifier", "identifier", "id", "ID"])
    );
    if (!identifier) return;
    const paxTypeCode = normalizePaxTypeCode(
      getValueByKeys(traveler, [
        "passengerTypeCode",
        "PassengerTypeCode",
        "paxType",
        "PaxType",
        "travelerType",
        "TravelerType",
      ])
    );
    baseRows.push({ identifier, paxTypeCode });
  };

  const travelerListResponse = getValueByKeys(payload, [
    "TravelerListResponse",
    "travelerListResponse",
  ]) as Record<string, unknown> | undefined;
  const referenceLists = getArrayByKeys(travelerListResponse || payload, [
    "ReferenceList",
    "referenceList",
  ]);
  referenceLists.forEach((list) => {
    getArrayByKeys(list as Record<string, unknown>, ["Traveler", "traveler"]).forEach(
      (traveler) => pushTraveler(traveler as Record<string, unknown>)
    );
  });

  const travelerResponse = getValueByKeys(payload, [
    "TravelerResponse",
    "travelerResponse",
  ]) as Record<string, unknown> | undefined;
  const travelerFromResponse = getValueByKeys(travelerResponse, [
    "Traveler",
    "traveler",
  ]) as Record<string, unknown> | undefined;
  pushTraveler(travelerFromResponse || null);

  const travelerResponseList = getArrayByKeys(payload, [
    "TravelerResponseList",
    "travelerResponseList",
  ]);
  travelerResponseList.forEach((entry) => {
    const nestedTravelerResponse = getValueByKeys(entry as Record<string, unknown>, [
      "TravelerResponse",
      "travelerResponse",
    ]) as Record<string, unknown> | undefined;
    const nestedTraveler = getValueByKeys(nestedTravelerResponse, [
      "Traveler",
      "traveler",
    ]) as Record<string, unknown> | undefined;
    pushTraveler(nestedTraveler || null);
  });

  const dedupedRows: Array<{ identifier: string; paxTypeCode: string }> = [];
  const seenIdentifiers = new Set<string>();
  baseRows.forEach((row) => {
    if (seenIdentifiers.has(row.identifier)) return;
    seenIdentifiers.add(row.identifier);
    dedupedRows.push(row);
  });

  const typeCounters: Record<string, number> = {
    ADT: 0,
    CHD: 0,
    INF: 0,
  };
  return dedupedRows.map((row, travelerIndex) => {
    const normalizedTypeCode = normalizePaxTypeCode(row.paxTypeCode);
    typeCounters[normalizedTypeCode] = (typeCounters[normalizedTypeCode] || 0) + 1;
    return {
      identifier: row.identifier,
      paxTypeCode: normalizedTypeCode,
      travelerIndex,
      travelerNumber: typeCounters[normalizedTypeCode],
    };
  });
}

function resolvePrimaryContactInput(
  offer: Record<string, unknown>,
  body: BookHoldBody
): { email?: string; phone?: string } {
  const passengers = resolvePassengersForTravelerPayload(offer, body);
  for (const passenger of passengers) {
    const email = toText(
      getValueByKeys(passenger, ["Email", "email", "emailAddress"])
    );
    const phone = sanitizePhone(
      getValueByKeys(passenger, ["ContactNumber", "contactNumber", "phone", "Phone"])
    );
    if (email || phone) {
      return {
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
      };
    }
  }
  return {};
}

function buildPrimaryContactPayload(params: {
  email?: string;
  phone?: string;
  travelerIdentifier?: string;
}) {
  const payload: Record<string, unknown> = {
    "@type": "PrimaryContact",
    shareWithSupplier: ["YY"],
  };

  if (params.email) {
    payload.Email = { value: params.email };
  }
  if (params.phone) {
    payload.Telephone = {
      "@type": "Telephone",
      role: "Mobile",
      phoneNumber: params.phone,
    };
  }
  if (params.travelerIdentifier) {
    payload.TravelerIdentifier = {
      Identifier: {
        value: params.travelerIdentifier,
      },
    };
  }
  return payload;
}

function resolvePrimaryContactIdentifier(payload: Record<string, unknown>): string | null {
  const identifier = toText(
    getValueByKeys(payload, [
      "PrimaryContactResponse",
      "primaryContactResponse",
      "PrimaryContact",
      "primaryContact",
      "Identifier",
      "identifier",
      "id",
    ])
  );
  return identifier || null;
}

function resolveLocator(payload: Record<string, unknown>): string | null {
  const reservationResponse = getValueByKeys(payload, [
    "ReservationResponse",
    "reservationResponse",
  ]) as Record<string, unknown> | undefined;
  const reservation = getValueByKeys(reservationResponse || payload, [
    "Reservation",
    "reservation",
  ]) as Record<string, unknown> | undefined;
  const receiptRows = getArrayByKeys(reservation || payload, ["Receipt", "receipt"]);
  for (const receipt of receiptRows) {
    const confirmation = getValueByKeys(receipt as Record<string, unknown>, [
      "Confirmation",
      "confirmation",
    ]) as Record<string, unknown> | undefined;
    const locator = toText(
      getValueByKeys(confirmation || (receipt as Record<string, unknown>), [
        "Locator",
        "locator",
      ])
    );
    if (locator) return locator;
  }

  const directLocator = toText(
    getValueByKeys(reservation || payload, ["Locator", "locator"])
  );
  return directLocator || null;
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
  const commitPayloadResponse = (await parseJsonSafe(commitResponse)) as Record<
    string,
    unknown
  >;

  return {
    ok: commitResponse.ok && !hasTravelportErrors(commitPayloadResponse),
    status: commitResponse.status,
    payload: commitPayloadResponse,
    locator: resolveLocator(commitPayloadResponse),
    errorMessage:
      extractTravelportErrorMessage(commitPayloadResponse) ||
      "Unable to commit reservation.",
  };
}

async function persistPreparedBooking(params: {
  userId: number;
  body: BookHoldBody;
  bookingFlowKey: string;
  bookingOfferKey: string;
  reservationId: string;
  selectedOffer: Record<string, unknown>;
  preCommitResponse: Record<string, unknown>;
}) {
  const fingerprint = resolveBookingFingerprint(params.selectedOffer);
  const booking = await prisma.booking.upsert({
    where: {
      bookingFlowKey: params.bookingFlowKey,
    },
    update: {
      bookingOfferKey: params.bookingOfferKey || null,
      reservationId: params.reservationId || null,
      status: "PREPARED",
      routeKey: fingerprint.routeKey,
      airlineCode: fingerprint.airlineCode,
      travelDate: fingerprint.travelDate,
      flightSignature: fingerprint.flightSignature,
      departureCode: fingerprint.departureCode || null,
      arrivalCode: fingerprint.arrivalCode || null,
      totalFare: fingerprint.totalFare || null,
      currencyCode: fingerprint.currencyCode || null,
      payloadSnapshot: params.selectedOffer as unknown as object,
      rawPreview: params.preCommitResponse as unknown as object,
    },
    create: {
      userId: params.userId,
      bookingFlowKey: params.bookingFlowKey || null,
      bookingOfferKey: params.bookingOfferKey || null,
      reservationId: params.reservationId || null,
      status: "PREPARED",
      routeKey: fingerprint.routeKey,
      airlineCode: fingerprint.airlineCode,
      travelDate: fingerprint.travelDate,
      flightSignature: fingerprint.flightSignature,
      departureCode: fingerprint.departureCode || null,
      arrivalCode: fingerprint.arrivalCode || null,
      totalFare: fingerprint.totalFare || null,
      currencyCode: fingerprint.currencyCode || null,
      payloadSnapshot: params.selectedOffer as unknown as object,
      rawPreview: params.preCommitResponse as unknown as object,
    },
  });

  const passengers = normalizePassengerRows(params.body).map((passenger) => ({
    paxType: normalizePaxTypeCode(
      getValueByKeys(passenger, [
        "PaxType",
        "paxType",
        "type",
        "passengerTypeCode",
        "PassengerTypeCode",
      ])
    ),
    firstName:
      toText(
        getValueByKeys(passenger, [
          "FirstName",
          "firstName",
          "fName",
          "Given",
          "given",
        ])
      ) || null,
    lastName:
      toText(
        getValueByKeys(passenger, [
          "LastName",
          "lastName",
          "lName",
          "Surname",
          "surname",
        ])
      ) || null,
    birthDate:
      (() => {
        const dateOnly = toDateOnly(
          getValueByKeys(passenger, ["DateOfBirth", "dateOfBirth", "dob", "birthDate"])
        );
        return dateOnly ? new Date(`${dateOnly}T00:00:00.000Z`) : null;
      })() || null,
    passportNumber:
      toText(
        getValueByKeys(passenger, ["PassportNumber", "passportNumber", "passNo"])
      ) || null,
  }));

  await prisma.bookingPassenger.deleteMany({
    where: { bookingId: booking.id },
  });

  if (passengers.length > 0) {
    await prisma.bookingPassenger.createMany({
      data: passengers.map((passenger) => ({
        bookingId: booking.id,
        paxType: passenger.paxType || "ADT",
        firstName: passenger.firstName,
        lastName: passenger.lastName,
        birthDate: passenger.birthDate,
        passportNumber: passenger.passportNumber,
      })),
    });
  }

  return booking;
}

async function getPreparedBookingForCommit(params: {
  userId: number;
  bookingFlowKey: string;
  reservationId: string;
}) {
  if (params.bookingFlowKey) {
    const row = await prisma.booking.findFirst({
      where: {
        userId: params.userId,
        bookingFlowKey: params.bookingFlowKey,
      },
      orderBy: { createdAt: "desc" },
    });
    if (row) return row;
  }

  if (!params.reservationId) return null;
  return prisma.booking.findFirst({
    where: {
      userId: params.userId,
      reservationId: params.reservationId,
    },
    orderBy: { createdAt: "desc" },
  });
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
    assertDatabaseConfigured();

    const body = (req.body ?? {}) as BookHoldBody;
    const sessionUser = await getSessionUser(req);
    if (!sessionUser) {
      return res.status(401).json({
        message: "Login is required before booking. Please sign in or register.",
        requiresLogin: true,
      });
    }

    const commitRequested = parseBooleanFlag(body.commit, true);
    const commitOnlyRequested = parseBooleanFlag(body.commitOnly, false);
    const explicitReservationId = toText(body.reservationId);
    const nowEpoch = Date.now();
    purgeExpiredBookingFlows(nowEpoch);

    const requestedFlowKey = toText(body.bookingFlowKey);
    const requestedOfferKey = toText(body.bookingOfferKey);
    const requestedFlowExpiry = resolveFlowExpiry(body.bookingFlowExpiresAt, nowEpoch);
    let activeReservationId: string | null = explicitReservationId || null;
    let activeOfferIdentifiers: string[] = [];
    let activeBookingFlowKey =
      requestedFlowKey || (commitOnlyRequested ? "" : generateServerFlowKey("flow"));
    let activeBookingOfferKey =
      requestedOfferKey || (commitOnlyRequested ? "" : generateServerFlowKey("offer"));
    let activeBookingFlowExpiresAt = requestedFlowExpiry;

    if (activeBookingFlowKey && commitOnlyRequested) {
      const existingFlow = getBookingFlowStore().get(activeBookingFlowKey);
      if (!existingFlow) {
        return respondWithLoggedError(res, {
          status: 409,
          message: "Booking flow key is missing or expired. Start booking preview again.",
          stage: "commit_only_flow_expired",
          reservationId: activeReservationId,
          bookingFlowKey: activeBookingFlowKey,
          bookingOfferKey: activeBookingOfferKey,
          commitRequested,
          commitOnlyRequested,
        });
      }
      if (existingFlow.status !== "prepared") {
        return respondWithLoggedError(res, {
          status: 409,
          message:
            "Booking preview is not prepared yet. Complete pre-commit add traveler/offer steps first.",
          stage: "commit_only_not_prepared",
          reservationId: existingFlow.reservationId || activeReservationId,
          bookingFlowKey: activeBookingFlowKey,
          bookingOfferKey: activeBookingOfferKey,
          commitRequested,
          commitOnlyRequested,
        });
      }
      if (
        explicitReservationId &&
        existingFlow.reservationId &&
        existingFlow.reservationId !== explicitReservationId
      ) {
        return respondWithLoggedError(res, {
          status: 409,
          message: "Reservation does not match active booking flow key.",
          stage: "commit_only_flow_mismatch",
          reservationId: activeReservationId,
          bookingFlowKey: activeBookingFlowKey,
          bookingOfferKey: activeBookingOfferKey,
          commitRequested,
          commitOnlyRequested,
        });
      }
      activeBookingOfferKey = activeBookingOfferKey || existingFlow.offerKey || "";
      activeBookingFlowExpiresAt = existingFlow.expiresAt || activeBookingFlowExpiresAt;
      activeReservationId = activeReservationId || existingFlow.reservationId || null;
    }

    const logAndRespondError = async (params: {
      status: number;
      message: string;
      details?: string;
      warnings?: string[];
      stage?: string;
      reservationId?: string | null;
      offerIdentifiers?: string[];
      destroyFlowKey?: boolean;
    }) =>
      (async () => {
        const resolvedStage =
          params.stage ||
          (commitOnlyRequested
            ? "commit_only"
            : commitRequested
              ? "precommit_before_commit"
              : "precommit");

        if (params.destroyFlowKey && activeBookingFlowKey) {
          clearBookingFlow(activeBookingFlowKey);
        }

        return respondWithLoggedError(res, {
          status: params.status,
          message: params.message,
          details: params.details,
          warnings: params.warnings,
          stage: resolvedStage,
          reservationId: params.reservationId ?? activeReservationId,
          offerIdentifiers: params.offerIdentifiers ?? activeOfferIdentifiers,
          bookingFlowKey: activeBookingFlowKey,
          bookingOfferKey: activeBookingOfferKey,
          commitRequested,
          commitOnlyRequested,
        });
      })();

    const version = process.env.TRAVELPORT_VERSION || "11";
    const bookingBaseUrl = resolveBookingBaseUrl(version);
    const accessGroup = getRequiredEnv("TRAVELPORT_ACCESS_GROUP");
    const accessToken = await createToken();
    const commonHeaders = {
      Accept: "application/json",
      "Content-Type": "application/json",
      XAUTH_TRAVELPORT_ACCESSGROUP: accessGroup,
      "Accept-Version": version,
      "Content-Version": version,
      Authorization: `Bearer ${accessToken}`,
    };

    if (activeBookingFlowKey && !commitOnlyRequested) {
      ensureBookingFlow({
        flowKey: activeBookingFlowKey,
        offerKey: activeBookingOfferKey,
        reservationId: activeReservationId,
        expiresAt: activeBookingFlowExpiresAt,
        now: nowEpoch,
        status: "active",
      });
    }

    if (commitOnlyRequested) {
      const commitReservationId = explicitReservationId || activeReservationId;
      if (!commitReservationId) {
        return logAndRespondError({
          status: 400,
          message: "reservationId is required for booking confirmation",
          stage: "commit_only",
        });
      }

      const preparedBooking = await getPreparedBookingForCommit({
        userId: sessionUser.id,
        bookingFlowKey: activeBookingFlowKey,
        reservationId: commitReservationId,
      });

      if (!preparedBooking || preparedBooking.status !== "PREPARED") {
        return logAndRespondError({
          status: 409,
          message:
            "Booking preview is missing in database. Run Preview Booking again before final commit.",
          stage: "commit_only_missing_prepared_booking",
          reservationId: commitReservationId,
          destroyFlowKey: true,
        });
      }

      const { start: dayStart, end: dayEnd } = toUtcDayBounds(new Date());
      const committedTodayCount = await prisma.booking.count({
        where: {
          userId: sessionUser.id,
          status: "COMMITTED",
          createdAt: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
      });

      if (committedTodayCount >= 10) {
        return res.status(429).json({
          message: "Daily booking limit reached. Maximum 10 committed bookings per day.",
          details: "Try again tomorrow or contact support for exception handling.",
          dailyCommittedCount: committedTodayCount,
        });
      }

      const duplicateBooking = await prisma.booking.findFirst({
        where: {
          userId: sessionUser.id,
          status: "COMMITTED",
          flightSignature: preparedBooking.flightSignature,
          routeKey: preparedBooking.routeKey,
          airlineCode: preparedBooking.airlineCode,
          travelDate: preparedBooking.travelDate,
        },
        orderBy: { createdAt: "desc" },
      });

      if (duplicateBooking) {
        return res.status(409).json({
          message:
            "Duplicate booking blocked. Same flight/route/airline/date was already booked.",
          details: "Previous booking returned instead of creating a duplicate booking.",
          previousBooking: getBookingSummaryRow(duplicateBooking),
          dailyCommittedCount: committedTodayCount,
        });
      }

      const commitResult = await commitReservation({
        bookingBaseUrl,
        reservationId: commitReservationId,
        headers: commonHeaders,
      });
      if (!commitResult.ok) {
        await prisma.booking.update({
          where: { id: preparedBooking.id },
          data: {
            status: "FAILED",
            rawCommit: commitResult.payload as unknown as object,
          },
        });
        return logAndRespondError({
          status: 502,
          message: `Travelport commit reservation failed (${commitResult.status})`,
          details: commitResult.errorMessage,
          stage: "commit_only",
          reservationId: commitReservationId,
        });
      }

      await prisma.booking.update({
        where: { id: preparedBooking.id },
        data: {
          status: "COMMITTED",
          reservationId: commitReservationId,
          locator: commitResult.locator || null,
          rawCommit: commitResult.payload as unknown as object,
        },
      });

      const locatorWarnings: string[] = [];
      if (commitResult.locator) {
        try {
          await persistLocatorToLocalFile({
            locator: commitResult.locator,
            reservationId: commitReservationId,
            offerIdentifiers: [],
          });
        } catch {
          locatorWarnings.push("Unable to save locator in local atpn.txt");
        }
      }
      if (activeBookingFlowKey) {
        clearBookingFlow(activeBookingFlowKey);
      }

      return res.status(200).json({
        success: true,
        bookingStage: "committed",
        reservationId: commitReservationId,
        offerIdentifiers: [],
        addOfferMode: null,
        travelerIdentifiers: [],
        primaryContactIdentifier: null,
        locator: commitResult.locator,
        warnings: locatorWarnings,
        workbenchResponse: null,
        addOfferResponse: null,
        travelerResponse: null,
        seatOfferResponse: null,
        primaryContactResponse: null,
        commitResponse: commitResult.payload,
        bookingFlowKey: activeBookingFlowKey || null,
        bookingOfferKey: activeBookingOfferKey || null,
        bookingFlowExpiresAt: activeBookingFlowExpiresAt || null,
      });
    }

    const selectedOffer = resolveSelectedOffer(body);
    if (!Object.keys(selectedOffer).length) {
      return logAndRespondError({
        status: 400,
        message: "selectedAirPrice or selectedOffer is required",
        stage: "precommit_validation",
        destroyFlowKey: true,
      });
    }

    const productCriteriaAir = buildProductCriteriaAir(selectedOffer);
    if (!productCriteriaAir.length) {
      return logAndRespondError({
        status: 400,
        message: "Selected flight does not contain valid product criteria",
        stage: "precommit_validation",
        destroyFlowKey: true,
      });
    }

    const sessionUrl = `${bookingBaseUrl}/session/reservationworkbench`;
    const addOfferPayload = buildAddOfferPayload(selectedOffer, body, {
      validateInventoryInd: true,
    });
    const catalogOfferingsRequest = resolveCatalogOfferingsRequest(selectedOffer);

    const sessionResponse = await fetch(sessionUrl, {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify({ "@type": "ReservationID" }),
    });
    const sessionPayload = (await parseJsonSafe(sessionResponse)) as Record<
      string,
      unknown
    >;
    if (!sessionResponse.ok) {
      return logAndRespondError({
        status: 502,
        message: `Travelport reservation workbench failed (${sessionResponse.status})`,
        details:
          toText(
            getValueByKeys(sessionPayload, [
              "message",
              "Message",
              "error_description",
              "error",
            ])
          ) || "Unable to start booking session.",
        stage: "precommit_session",
        destroyFlowKey: true,
      });
    }

    const reservationId = resolveReservationId(sessionPayload);
    if (!reservationId) {
      return logAndRespondError({
        status: 502,
        message: "Travelport reservation id missing in workbench response",
        stage: "precommit_session",
        destroyFlowKey: true,
      });
    }
    activeReservationId = reservationId;

    const warnings: string[] = [];

    const travelers = buildTravelersPayload(selectedOffer, body);
    if (!travelers.length) {
      return logAndRespondError({
        status: 400,
        message: "At least one traveler is required to continue booking.",
        stage: "precommit_validation",
        destroyFlowKey: true,
      });
    }

    const travelerListUrl = `${bookingBaseUrl}/traveler/reservationworkbench/${encodeURIComponent(
      reservationId
    )}/travelers/list`;
    const travelerListPayload = {
      TravelerListRequest: {
        "@type": "TravelerListRequest",
        Traveler: travelers,
      },
    };
    let travelerPayloadResponse: Record<string, unknown> = {};
    let travelerIdentifiers: string[] = [];

    const travelerListResponse = await fetch(travelerListUrl, {
      method: "POST",
      headers: commonHeaders,
      body: JSON.stringify(travelerListPayload),
    });
    const travelerListResponsePayload = (await parseJsonSafe(travelerListResponse)) as Record<
      string,
      unknown
    >;
    if (travelerListResponse.ok && !hasTravelportErrors(travelerListResponsePayload)) {
      travelerPayloadResponse = travelerListResponsePayload;
      travelerIdentifiers = resolveTravelerIdentifiers(travelerListResponsePayload);
    } else {
      const travelerSingleUrl = `${bookingBaseUrl}/traveler/reservationworkbench/${encodeURIComponent(
        reservationId
      )}/travelers`;
      const travelerResults: Array<Record<string, unknown>> = [];

      for (const traveler of travelers) {
        const travelerResponse = await fetch(travelerSingleUrl, {
          method: "POST",
          headers: commonHeaders,
          body: JSON.stringify(traveler),
        });
        const travelerResponsePayload = (await parseJsonSafe(travelerResponse)) as Record<
          string,
          unknown
        >;
        travelerResults.push(travelerResponsePayload);

        if (!travelerResponse.ok || hasTravelportErrors(travelerResponsePayload)) {
          return logAndRespondError({
            status: 502,
            message: `Travelport add traveler failed (${travelerResponse.status})`,
            details:
              extractTravelportErrorMessage(travelerResponsePayload) ||
              "Unable to add traveler information.",
            warnings,
            stage: "precommit_add_traveler",
            destroyFlowKey: true,
          });
        }

        const singleIdentifiers = resolveTravelerIdentifiers(travelerResponsePayload);
        travelerIdentifiers.push(...singleIdentifiers);
      }

      travelerIdentifiers = Array.from(new Set(travelerIdentifiers.filter(Boolean)));
      travelerPayloadResponse = {
        TravelerResponseList: travelerResults,
      };
    }

    if (!travelerIdentifiers.length) {
      warnings.push("Traveler identifiers were not returned by Travelport.");
    }
    let travelerReferences = resolveTravelerReferences(travelerPayloadResponse);
    if (!travelerReferences.length && travelerIdentifiers.length) {
      travelerReferences = travelerIdentifiers.map((identifier, travelerIndex) => ({
        identifier,
        paxTypeCode: "ADT",
        travelerIndex,
        travelerNumber: travelerIndex + 1,
      }));
    }

    const addOfferUrl = `${bookingBaseUrl}/airoffer/reservationworkbench/${encodeURIComponent(
      reservationId
    )}/offers/buildfromproducts`;
    let addOfferMode: "catalogOfferings" | "products" = "products";
    let addOfferResponse: Response | null = null;
    let addOfferPayloadResponse: Record<string, unknown> = {};
    let catalogOfferingsFailureMessage = "";

    if (catalogOfferingsRequest) {
      const addCatalogOfferingsUrl = `${bookingBaseUrl}/offer/reservationworkbench/${encodeURIComponent(
        reservationId
      )}/offers/buildfromcatalogofferings`;
      const addCatalogOfferingsPayload =
        buildCatalogOfferingsPayload(catalogOfferingsRequest);

      const addCatalogOfferingsResponse = await fetch(addCatalogOfferingsUrl, {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify(addCatalogOfferingsPayload),
      });
      const addCatalogOfferingsPayloadResponse = (await parseJsonSafe(
        addCatalogOfferingsResponse
      )) as Record<string, unknown>;

      if (
        addCatalogOfferingsResponse.ok &&
        !hasTravelportErrors(addCatalogOfferingsPayloadResponse)
      ) {
        addOfferMode = "catalogOfferings";
        addOfferResponse = addCatalogOfferingsResponse;
        addOfferPayloadResponse = addCatalogOfferingsPayloadResponse;
      } else {
        catalogOfferingsFailureMessage =
          extractTravelportErrorMessage(addCatalogOfferingsPayloadResponse) ||
          toText(
            getValueByKeys(addCatalogOfferingsPayloadResponse, [
              "message",
              "Message",
              "error_description",
              "error",
            ])
          );
      }
    }

    let productsFailureMessage = "";
    if (!addOfferResponse) {
      addOfferResponse = await fetch(addOfferUrl, {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify(addOfferPayload),
      });
      addOfferPayloadResponse = (await parseJsonSafe(addOfferResponse)) as Record<
        string,
        unknown
      >;
      addOfferMode = "products";
    }

    if (
      addOfferResponse &&
      (!addOfferResponse.ok || hasTravelportErrors(addOfferPayloadResponse))
    ) {
      productsFailureMessage =
        extractTravelportErrorMessage(addOfferPayloadResponse) ||
        toText(
          getValueByKeys(addOfferPayloadResponse, [
            "message",
            "Message",
            "error_description",
            "error",
          ])
        );

      if (isInventoryAvailabilityMessage(productsFailureMessage)) {
        const relaxedAddOfferPayload = buildAddOfferPayload(selectedOffer, body, {
          validateInventoryInd: false,
          relaxSpecificFlightCriteria: true,
        });
        warnings.push(
          "Initial add-offer inventory/class check failed. Retrying with relaxed criteria."
        );

        const relaxedAddOfferResponse = await fetch(addOfferUrl, {
          method: "POST",
          headers: commonHeaders,
          body: JSON.stringify(relaxedAddOfferPayload),
        });
        const relaxedAddOfferPayloadResponse = (await parseJsonSafe(
          relaxedAddOfferResponse
        )) as Record<string, unknown>;

        if (
          relaxedAddOfferResponse.ok &&
          !hasTravelportErrors(relaxedAddOfferPayloadResponse)
        ) {
          addOfferResponse = relaxedAddOfferResponse;
          addOfferPayloadResponse = relaxedAddOfferPayloadResponse;
          addOfferMode = "products";
          productsFailureMessage = "";
          warnings.push("Add-offer succeeded after relaxed inventory retry.");
        } else {
          const relaxedFailureMessage =
            extractTravelportErrorMessage(relaxedAddOfferPayloadResponse) ||
            toText(
              getValueByKeys(relaxedAddOfferPayloadResponse, [
                "message",
                "Message",
                "error_description",
                "error",
              ])
            );
          if (relaxedFailureMessage) {
            productsFailureMessage = productsFailureMessage
              ? `${productsFailureMessage} | Retry: ${relaxedFailureMessage}`
              : relaxedFailureMessage;
          }
        }
      }
    }

    if (!addOfferResponse.ok || hasTravelportErrors(addOfferPayloadResponse)) {
      if (!productsFailureMessage) {
        productsFailureMessage =
          extractTravelportErrorMessage(addOfferPayloadResponse) ||
          toText(
            getValueByKeys(addOfferPayloadResponse, [
              "message",
              "Message",
              "error_description",
              "error",
            ])
          );
      }
      const fallbackHint = catalogOfferingsFailureMessage
        ? `Catalog-offerings add-offer also failed: ${catalogOfferingsFailureMessage}`
        : "";
      return logAndRespondError({
        status: 502,
        message: `Travelport add offer failed (${addOfferResponse.status})`,
        details:
          productsFailureMessage ||
          fallbackHint ||
          "Unable to add offer in reservation workbench.",
        warnings,
        stage: "precommit_add_offer",
        destroyFlowKey: true,
      });
    }
    activeOfferIdentifiers = resolveOfferIdentifiers(addOfferPayloadResponse);

    let seatOfferPayloadResponse: Record<string, unknown> | null = null;
    const seatSelections = resolveSeatSelections(body, selectedOffer);
    if (seatSelections.length && !commitRequested) {
      const seatAncillaryPayload = buildSeatAncillaryOffersPayload({
        seatSelections,
        travelerIdentifiers,
        travelerReferences,
      });
      if (!seatAncillaryPayload) {
        warnings.push(
          "Seat selections were provided but traveler mapping is missing — proceeding without seat assignment."
        );
      } else {
        const addSeatOfferUrl = `${bookingBaseUrl}/airoffer/reservationworkbench/${encodeURIComponent(
          reservationId
        )}/offers/buildancillaryoffersfromcatalogofferings`;
        const addSeatOfferResponse = await fetch(addSeatOfferUrl, {
          method: "POST",
          headers: commonHeaders,
          body: JSON.stringify(seatAncillaryPayload),
        });
        const addSeatOfferPayloadResponse = (await parseJsonSafe(
          addSeatOfferResponse
        )) as Record<string, unknown>;

        if (
          !addSeatOfferResponse.ok ||
          hasTravelportErrors(addSeatOfferPayloadResponse)
        ) {
          const seatOfferErrorDetail =
            extractTravelportErrorMessage(addSeatOfferPayloadResponse) ||
            `Add seat offer failed with status ${addSeatOfferResponse.status}`;
          warnings.push(
            `Seat offer could not be added — proceeding without seat assignment. (${seatOfferErrorDetail})`
          );
        } else {
          seatOfferPayloadResponse = addSeatOfferPayloadResponse;
        }
      }
    }

    const primaryContactInput = resolvePrimaryContactInput(selectedOffer, body);
    let primaryContactPayloadResponse: Record<string, unknown> | null = null;
    let primaryContactIdentifier: string | null = null;

    if (
      primaryContactInput.email ||
      primaryContactInput.phone ||
      travelerIdentifiers.length > 0
    ) {
      const primaryContactUrl = `${bookingBaseUrl}/primarycontact/reservationworkbench/${encodeURIComponent(
        reservationId
      )}/primarycontacts`;
      const primaryContactPayload = buildPrimaryContactPayload({
        ...primaryContactInput,
        travelerIdentifier: travelerIdentifiers[0],
      });

      const primaryContactResponse = await fetch(primaryContactUrl, {
        method: "POST",
        headers: commonHeaders,
        body: JSON.stringify(primaryContactPayload),
      });
      const primaryContactResponsePayload = (await parseJsonSafe(
        primaryContactResponse
      )) as Record<string, unknown>;

      if (
        primaryContactResponse.ok &&
        !hasTravelportErrors(primaryContactResponsePayload)
      ) {
        primaryContactPayloadResponse = primaryContactResponsePayload;
        primaryContactIdentifier =
          resolvePrimaryContactIdentifier(primaryContactResponsePayload);
      } else {
        warnings.push(
          extractTravelportErrorMessage(primaryContactResponsePayload) ||
          "Primary contact was not added."
        );
      }
    }

    let preparedBookingRecord:
      | {
        id: number;
        routeKey: string;
        airlineCode: string;
        travelDate: Date;
        flightSignature: string;
      }
      | null = null;

    try {
      preparedBookingRecord = await persistPreparedBooking({
        userId: sessionUser.id,
        body,
        bookingFlowKey: activeBookingFlowKey,
        bookingOfferKey: activeBookingOfferKey,
        reservationId,
        selectedOffer,
        preCommitResponse: {
          reservationId,
          offerIdentifiers: activeOfferIdentifiers,
          addOfferResponse: addOfferPayloadResponse,
          travelerResponse: travelerPayloadResponse,
          seatOfferResponse: seatOfferPayloadResponse,
          primaryContactResponse: primaryContactPayloadResponse,
          warnings,
        },
      });
    } catch (persistError) {
      return logAndRespondError({
        status: 500,
        message: "Unable to save booking preview data in database.",
        details:
          persistError instanceof Error
            ? persistError.message
            : "Database persistence failed during pre-commit stage.",
        warnings,
        stage: "precommit_db_persist",
        destroyFlowKey: true,
      });
    }

    if (!commitRequested) {
      if (activeBookingFlowKey) {
        ensureBookingFlow({
          flowKey: activeBookingFlowKey,
          offerKey: activeBookingOfferKey,
          reservationId,
          expiresAt: activeBookingFlowExpiresAt,
          status: "prepared",
        });
      }
      return res.status(200).json({
        success: true,
        bookingStage: "prepared",
        reservationId,
        offerIdentifiers: activeOfferIdentifiers,
        addOfferMode,
        travelerIdentifiers,
        primaryContactIdentifier,
        locator: null,
        warnings,
        workbenchResponse: sessionPayload,
        addOfferResponse: addOfferPayloadResponse,
        travelerResponse: travelerPayloadResponse,
        seatOfferResponse: seatOfferPayloadResponse,
        primaryContactResponse: primaryContactPayloadResponse,
        commitResponse: null,
        bookingFlowKey: activeBookingFlowKey || null,
        bookingOfferKey: activeBookingOfferKey || null,
        bookingFlowExpiresAt: activeBookingFlowExpiresAt || null,
      });
    }

    const { start: dayStart, end: dayEnd } = toUtcDayBounds(new Date());
    const committedTodayCount = await prisma.booking.count({
      where: {
        userId: sessionUser.id,
        status: "COMMITTED",
        createdAt: {
          gte: dayStart,
          lt: dayEnd,
        },
      },
    });

    if (committedTodayCount >= 10) {
      return res.status(429).json({
        message: "Daily booking limit reached. Maximum 10 committed bookings per day.",
        details: "Try again tomorrow or contact support for exception handling.",
        dailyCommittedCount: committedTodayCount,
      });
    }

    if (preparedBookingRecord) {
      const duplicateBooking = await prisma.booking.findFirst({
        where: {
          userId: sessionUser.id,
          status: "COMMITTED",
          flightSignature: preparedBookingRecord.flightSignature,
          routeKey: preparedBookingRecord.routeKey,
          airlineCode: preparedBookingRecord.airlineCode,
          travelDate: preparedBookingRecord.travelDate,
        },
        orderBy: { createdAt: "desc" },
      });

      if (duplicateBooking) {
        return res.status(409).json({
          message:
            "Duplicate booking blocked. Same flight/route/airline/date was already booked.",
          details: "Previous booking returned instead of creating a duplicate booking.",
          previousBooking: getBookingSummaryRow(duplicateBooking),
          dailyCommittedCount: committedTodayCount,
        });
      }
    }

    const commitResult = await commitReservation({
      bookingBaseUrl,
      reservationId,
      headers: commonHeaders,
    });
    if (!commitResult.ok) {
      return logAndRespondError({
        status: 502,
        message: `Travelport commit reservation failed (${commitResult.status})`,
        details: commitResult.errorMessage,
        warnings,
        stage: "commit",
      });
    }

    if (preparedBookingRecord) {
      await prisma.booking.update({
        where: { id: preparedBookingRecord.id },
        data: {
          status: "COMMITTED",
          locator: commitResult.locator || null,
          reservationId,
          rawCommit: commitResult.payload as unknown as object,
        },
      });
    }

    if (commitResult.locator) {
      try {
        await persistLocatorToLocalFile({
          locator: commitResult.locator,
          reservationId,
          offerIdentifiers: activeOfferIdentifiers,
        });
      } catch {
        warnings.push("Unable to save locator in local atpn.txt");
      }
    }
    if (activeBookingFlowKey) {
      clearBookingFlow(activeBookingFlowKey);
    }

    return res.status(200).json({
      success: true,
      bookingStage: "committed",
      reservationId,
      offerIdentifiers: activeOfferIdentifiers,
      addOfferMode,
      travelerIdentifiers,
      primaryContactIdentifier,
      locator: commitResult.locator,
      warnings,
      workbenchResponse: sessionPayload,
      addOfferResponse: addOfferPayloadResponse,
      travelerResponse: travelerPayloadResponse,
      seatOfferResponse: seatOfferPayloadResponse,
      primaryContactResponse: primaryContactPayloadResponse,
      commitResponse: commitResult.payload,
      bookingFlowKey: activeBookingFlowKey || null,
      bookingOfferKey: activeBookingOfferKey || null,
      bookingFlowExpiresAt: activeBookingFlowExpiresAt || null,
    });
  } catch (error) {
    return respondWithLoggedError(res, {
      status: 500,
      message: error instanceof Error ? error.message : "Unexpected server error",
      stage: "unexpected",
    });
  }
}
