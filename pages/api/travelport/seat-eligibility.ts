import { fetchUpstream } from "@/server/upstream-fetch";
import { withApiHandler } from "@/server/api-handler";
import { publicErrorMessage } from "@/server/public-error";
import type { NextApiRequest, NextApiResponse } from "next";
import { getTravelportAccessToken } from "@/server/travelport-token";

type SeatEligibilityBody = {
  pnr?: unknown;
  locator?: unknown;
  reservationId?: unknown;
  offerIdentifier?: unknown;
  productIdentifier?: unknown;
  productIdentifiers?: unknown;
  segmentId?: unknown;
  segmentSequenceList?: unknown;
  passengerId?: unknown;
};

type SeatRow = {
  rowNumber: number;
  rowLabel: string;
  seats: Array<{
    seatNumber: string;
    status: "available" | "paid" | "unavailable" | "unknown";
    available: boolean;
    price: number;
    currency: string;
    offerListIdentifier: string;
    offerIdentifier: string;
    productIdentifier: string;
    travelerIdentifier: string;
    segmentRef: string;
  }>;
};

type SuccessResponse = {
  success: true;
  eligible: boolean;
  pnr: string;
  reservationId: string;
  travelerIdentifier: string | null;
  offerIdentifier: string;
  productIdentifiers: string[];
  seatMap: {
    rows: SeatRow[];
  };
  requestPayload: Record<string, unknown>;
  seatAvailabilityResponse: Record<string, unknown>;
};

type ErrorResponse = {
  message: string;
  details?: string;
  stage?: string;
  requiresLogin?: boolean;
};

type TravelerRow = {
  id: string;
  identifier: string;
  passengerTypeCode: string;
  travelerNumber: number;
  index: number;
};

type SeatMeta = {
  status: "available" | "paid" | "unavailable" | "unknown";
  price: number;
  currency: string;
  offerListIdentifier: string;
  offerIdentifier: string;
  productIdentifier: string;
  travelerIdentifier: string;
  segmentRef: string;
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
      const text = toText(item);
      if (text) return text;
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

function toNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIndex(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return -1;
  const integer = Math.trunc(parsed);
  return integer >= 0 ? integer : -1;
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

function normalizeIdentifierList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => normalizeIdentifier(item)).filter(Boolean)));
  }
  const single = normalizeIdentifier(value);
  return single ? [single] : [];
}

function normalizePaxTypeCode(value: unknown): string {
  const code = String(value ?? "").trim().toUpperCase();
  if (["ADT", "ADULT"].includes(code)) return "ADT";
  if (["CHD", "CNN", "CHILD"].includes(code)) return "CHD";
  if (["INF", "INFANT"].includes(code)) return "INF";
  return code || "ADT";
}

function normalizeSeatCode(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function parseSeatCode(seatCode: unknown): { rowNumber: number; column: string } | null {
  const normalized = normalizeSeatCode(seatCode);
  const match = normalized.match(/^(\d{1,4})([A-Z]{1,2})$/);
  if (!match) return null;
  return {
    rowNumber: Number(match[1]),
    column: match[2],
  };
}

function collectSeatCodesFromValue(value: unknown, depth = 0): string[] {
  if (value === null || value === undefined || depth > 4) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectSeatCodesFromValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const row = value as Record<string, unknown>;
    return [
      ...collectSeatCodesFromValue(row.value, depth + 1),
      ...collectSeatCodesFromValue(row.Value, depth + 1),
      ...collectSeatCodesFromValue(row.seat, depth + 1),
      ...collectSeatCodesFromValue(row.Seat, depth + 1),
      ...collectSeatCodesFromValue(row.seats, depth + 1),
      ...collectSeatCodesFromValue(row.Seats, depth + 1),
    ];
  }

  const text = toText(value);
  if (!text) return [];

  return text
    .split(/[\s,;|/]+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .map((token) => normalizeSeatCode(token))
    .filter(Boolean);
}

function resolveSeatStatus(rawStatus: unknown, price: number):
  | "available"
  | "paid"
  | "unavailable"
  | "unknown" {
  const normalized = String(rawStatus ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  if (!normalized) return price > 0 ? "paid" : "unknown";
  if (/paid|charge|purchase|forsale|fee/.test(normalized)) return "paid";
  if (/occup|unavail|blocked|taken|held|closed|reserved|noseat|notsell/.test(normalized)) {
    return "unavailable";
  }
  if (/avail|open|free|vacant|select/.test(normalized)) {
    return price > 0 ? "paid" : "available";
  }
  return price > 0 ? "paid" : "unknown";
}

function getStatusScore(status: "available" | "paid" | "unavailable" | "unknown") {
  if (status === "unavailable") return 4;
  if (status === "paid") return 3;
  if (status === "available") return 2;
  return 1;
}

function resolveCharacteristicFallbackStatus(space: Record<string, unknown>):
  | "available"
  | "paid"
  | "unavailable"
  | "unknown" {
  const chars = getArrayByKeys(space, ["Characteristic", "characteristic"])
    .flatMap((value) => collectSeatCodesFromValue(value))
    .map((row) => row.toUpperCase());

  if (chars.some((item) => item === "BK" || item.includes("BLOCK"))) {
    return "unavailable";
  }
  if (chars.some((item) => item === "CH" || item.includes("CHARGE") || item.includes("PAY"))) {
    return "paid";
  }
  return "available";
}

function resolveBookingBaseUrl(version: string): string {
  const directUrl = process.env.TRAVELPORT_AIR_BOOKING || process.env.TRAVELPORT_AIR_BOOKING_URL || "";
  if (directUrl.trim()) return directUrl.trim().replace(/\/+$/, "");
  const baseUrl = process.env.TRAVELPORT_BASE_URL || "https://api.pp.travelport.net";
  return `${baseUrl.replace(/\/+$/, "")}/${version}/air/book`;
}

function resolveSeatAvailabilityUrl(version: string): string {
  const directUrl =
    process.env.TRAVELPORT_SEAT_AVAILABILITY_URL ||
    process.env.TRAVELPORT_SEAT_MAP_URL ||
    process.env.TRAVELPORT_VIEW_SEAT_MAP ||
    "";
  if (directUrl.trim()) return directUrl.trim();

  const baseUrl = process.env.TRAVELPORT_BASE_URL || "https://api.pp.travelport.net";
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  if (/\/\d+$/.test(normalizedBase)) {
    return `${normalizedBase}/air/search/seat/catalogofferingsancillaries/seatavailabilities`;
  }
  return `${normalizedBase}/${version}/air/search/seat/catalogofferingsancillaries/seatavailabilities`;
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

  const result = getValueByKeys(payload, ["Result", "result", "ReservationResponse.Result"]) as
    | Record<string, unknown>
    | undefined;
  if (result && typeof result === "object") {
    const errors = getArrayByKeys(result, ["Error", "error"]);
    for (const entry of errors) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      const message =
        toText(row?.Message) || toText(row?.message) || toText(row?.description) || toText(row?.Code);
      if (message) return message;
    }
  }

  return "";
}

function hasTravelportErrors(payload: Record<string, unknown>): boolean {
  return Boolean(extractTravelportErrorMessage(payload));
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

function resolveOfferIdentifierFromReservation(reservation: Record<string, unknown>): string {
  const offers = getArrayByKeys(reservation, ["Offer", "offer"]);
  if (!offers.length) return "";
  return normalizeIdentifier(
    getValueByKeys((offers[0] as Record<string, unknown>) || {}, [
      "Identifier",
      "identifier",
      "id",
      "ID",
    ])
  );
}

function resolveProductIdentifiersFromReservation(
  reservation: Record<string, unknown>,
  segmentSequenceList: string[]
): string[] {
  const offers = getArrayByKeys(reservation, ["Offer", "offer"]);
  if (!offers.length) return [];

  const firstOffer = (offers[0] as Record<string, unknown>) || {};
  const products = getArrayByKeys(firstOffer, ["Product", "product"]);
  if (!products.length) return [];

  if (!segmentSequenceList.length) {
    return Array.from(
      new Set(
        products
          .map((product) =>
            normalizeIdentifier(
              getValueByKeys((product as Record<string, unknown>) || {}, [
                "Identifier",
                "identifier",
                "id",
                "ID",
                "productRef",
                "ProductRef",
              ])
            )
          )
          .filter(Boolean)
      )
    );
  }

  const requested = new Set(segmentSequenceList.map((item) => String(item)));
  const filtered = products
    .filter((product) => {
      const row = (product as Record<string, unknown>) || {};
      const passengerFlights = getArrayByKeys(row, ["PassengerFlight", "passengerFlight"]);
      if (!passengerFlights.length) return false;
      return passengerFlights.some((flight) => {
        const flightRow = (flight as Record<string, unknown>) || {};
        const sequence = toText(
          getValueByKeys(flightRow, [
            "segmentSequence",
            "SegmentSequence",
            "sequence",
            "Sequence",
          ])
        );
        return sequence ? requested.has(sequence) : false;
      });
    })
    .map((product) =>
      normalizeIdentifier(
        getValueByKeys((product as Record<string, unknown>) || {}, [
          "Identifier",
          "identifier",
          "id",
          "ID",
          "productRef",
          "ProductRef",
        ])
      )
    )
    .filter(Boolean);

  return filtered.length
    ? Array.from(new Set(filtered))
    : Array.from(
        new Set(
          products
            .map((product) =>
              normalizeIdentifier(
                getValueByKeys((product as Record<string, unknown>) || {}, [
                  "Identifier",
                  "identifier",
                  "id",
                  "ID",
                  "productRef",
                  "ProductRef",
                ])
              )
            )
            .filter(Boolean)
        )
      );
}

function resolveTravelerRows(reservation: Record<string, unknown>): TravelerRow[] {
  const travelers = getArrayByKeys(reservation, ["Traveler", "traveler"]);
  const counts: Record<string, number> = {};

  return travelers
    .map((entry, index) => {
      const row = (entry as Record<string, unknown>) || {};
      const id = normalizeIdentifier(getValueByKeys(row, ["id", "ID"]));
      const identifier = normalizeIdentifier(getValueByKeys(row, ["Identifier", "identifier"]));
      const passengerTypeCode = normalizePaxTypeCode(
        getValueByKeys(row, ["passengerTypeCode", "PassengerTypeCode", "paxType", "PaxType"])
      );
      counts[passengerTypeCode] = (counts[passengerTypeCode] || 0) + 1;
      const travelerNumber = counts[passengerTypeCode];

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
  const response = await fetchUpstream(url, {
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

function extractSeatMapRows(params: {
  payload: Record<string, unknown>;
  selectedTravelerCandidates: string[];
}): SeatRow[] {
  const root =
    params.payload?.CatalogOfferingsAncillaryListResponse &&
    typeof params.payload.CatalogOfferingsAncillaryListResponse === "object"
      ? (params.payload.CatalogOfferingsAncillaryListResponse as Record<string, unknown>)
      : null;
  if (!root) return [];

  const catalogOfferingsIdentifier = normalizeIdentifier(
    getValueByKeys(root, [
      "CatalogOfferingsIdentifier",
      "catalogOfferingsIdentifier",
      "Identifier",
      "identifier",
      "id",
      "ID",
    ])
  );

  const selectedTravelers = new Set(
    params.selectedTravelerCandidates.map((item) => normalizeIdentifier(item)).filter(Boolean)
  );

  const seatingCharts: Array<Record<string, unknown>> = [];
  const referenceLists = getArrayByKeys(root, ["ReferenceList", "referenceList"]);
  referenceLists.forEach((referenceItem) => {
    const listRow = (referenceItem as Record<string, unknown>) || {};
    const charts = getArrayByKeys(listRow, ["SeatingChart", "seatingChart"]);
    charts.forEach((chart) => {
      if (chart && typeof chart === "object") {
        seatingCharts.push(chart as Record<string, unknown>);
      }
    });
  });

  const seatingChartById = new Map<string, Record<string, unknown>>();
  seatingCharts.forEach((chart, index) => {
    const chartId = normalizeIdentifier(getValueByKeys(chart, ["id", "ID", "Identifier", "identifier"]));
    seatingChartById.set(chartId || `chart-${index + 1}`, chart);
  });

  const seatByChartAndCode = new Map<string, SeatMeta>();
  const travelerBuckets = getArrayByKeys(root, ["CatalogOfferingsID", "catalogOfferingsID"]);

  travelerBuckets.forEach((bucket) => {
    const bucketRow = (bucket as Record<string, unknown>) || {};
    const travelerId = normalizeIdentifier(
      getValueByKeys(bucketRow, ["id", "ID", "Identifier", "identifier"])
    );

    if (selectedTravelers.size && travelerId && !selectedTravelers.has(travelerId)) {
      return;
    }

    const flightRows = getArrayByKeys(bucketRow, ["Flight", "flight"]);
    const segmentRefs = flightRows
      .map((flight) => {
        const flightRow = (flight as Record<string, unknown>) || {};
        const carrier = toText(getValueByKeys(flightRow, ["carrier", "Carrier"]));
        const number = toText(getValueByKeys(flightRow, ["number", "Number"]));
        const from = toText(getValueByKeys((flightRow.Departure as Record<string, unknown>) || {}, ["location", "Location"]));
        const to = toText(getValueByKeys((flightRow.Arrival as Record<string, unknown>) || {}, ["location", "Location"]));
        const code = [carrier, number].filter(Boolean).join(" ");
        const route = [from, to].filter(Boolean).join("-");
        return [code, route].filter(Boolean).join(" • ");
      })
      .filter(Boolean);
    const segmentRef = segmentRefs[0] || "";

    const offerings = getArrayByKeys(bucketRow, ["CatalogOffering", "catalogOffering"]);
    offerings.forEach((offering) => {
      const offeringRow = (offering as Record<string, unknown>) || {};
      const offerIdentifier = normalizeIdentifier(
        getValueByKeys(offeringRow, ["id", "ID", "Identifier", "identifier"])
      );

      const priceRow =
        getValueByKeys(offeringRow, ["Price", "price"]) as Record<string, unknown> | undefined;
      const amount = toNumber(
        getValueByKeys(priceRow || {}, [
          "TotalPrice",
          "totalPrice",
          "ApproximateTotalPrice",
          "approximateTotalPrice",
          "Base",
          "base",
        ])
      );
      const currency =
        toText(getValueByKeys(priceRow || {}, ["CurrencyCode", "currencyCode", "currency"])) ||
        toText(
          getValueByKeys(
            ((priceRow?.CurrencyCode as Record<string, unknown>) ||
              (priceRow?.currencyCode as Record<string, unknown>) ||
              {}) as Record<string, unknown>,
            ["value", "Value", "code", "Code"]
          )
        ) ||
        "USD";

      const productOptions = getArrayByKeys(offeringRow, ["ProductOptions", "productOptions", "ProductOption", "productOption"]);
      const directProducts = getArrayByKeys(offeringRow, ["Product", "product"]);
      const products = [
        ...productOptions.flatMap((option) =>
          getArrayByKeys((option as Record<string, unknown>) || {}, ["Product", "product"])
        ),
        ...directProducts,
      ];

      products.forEach((product) => {
        const productRow = (product as Record<string, unknown>) || {};
        const chartRef = normalizeIdentifier(
          getValueByKeys(productRow, ["SeatingChartRef", "seatingChartRef"])
        );
        const productIdentifier = normalizeIdentifier(
          getValueByKeys(productRow, ["id", "ID", "Identifier", "identifier", "ProductIdentifier", "productIdentifier"])
        );

        const seatAvailabilityRows = getArrayByKeys(productRow, ["SeatAvailability", "seatAvailability"]);
        seatAvailabilityRows.forEach((seatAvailabilityRow) => {
          const availabilityRow = (seatAvailabilityRow as Record<string, unknown>) || {};
          const rawStatus = toText(
            getValueByKeys(availabilityRow, [
              "seatAvailabilityStatus",
              "SeatAvailabilityStatus",
              "status",
              "Status",
            ])
          );
          const status = resolveSeatStatus(rawStatus, amount);
          const seatCodes = collectSeatCodesFromValue(
            getValueByKeys(availabilityRow, ["value", "Value", "seat", "Seat", "seats", "Seats"])
          );

          seatCodes.forEach((seatCodeCandidate) => {
            const parsedSeat = parseSeatCode(seatCodeCandidate);
            if (!parsedSeat) return;
            const seatCode = `${parsedSeat.rowNumber}${parsedSeat.column}`;
            const chartKey = chartRef || "default";
            const mapKey = `${chartKey}::${seatCode}`;
            const current = seatByChartAndCode.get(mapKey);
            const next: SeatMeta = {
              status,
              price: amount > 0 ? amount : 0,
              currency,
              offerListIdentifier: catalogOfferingsIdentifier,
              offerIdentifier,
              productIdentifier,
              travelerIdentifier: travelerId,
              segmentRef,
            };

            if (!current || getStatusScore(next.status) >= getStatusScore(current.status)) {
              seatByChartAndCode.set(mapKey, next);
            }
          });
        });
      });
    });
  });

  const rowsByNumber = new Map<number, SeatRow>();

  const upsertSeat = (rowNumber: number, column: string, seatMeta: SeatMeta | null) => {
    if (!rowNumber || !column) return;
    const seatNumber = `${rowNumber}${column}`;
    const status = seatMeta?.status || "unknown";
    const available = status === "available" || status === "paid";

    if (!rowsByNumber.has(rowNumber)) {
      rowsByNumber.set(rowNumber, {
        rowNumber,
        rowLabel: String(rowNumber),
        seats: [],
      });
    }

    const row = rowsByNumber.get(rowNumber)!;
    const existingIndex = row.seats.findIndex((seat) => seat.seatNumber === seatNumber);
    const seatEntry = {
      seatNumber,
      status,
      available,
      price: seatMeta?.price || 0,
      currency: seatMeta?.currency || "USD",
      offerListIdentifier: seatMeta?.offerListIdentifier || "",
      offerIdentifier: seatMeta?.offerIdentifier || "",
      productIdentifier: seatMeta?.productIdentifier || "",
      travelerIdentifier: seatMeta?.travelerIdentifier || "",
      segmentRef: seatMeta?.segmentRef || "",
    } as const;

    if (existingIndex >= 0) {
      row.seats[existingIndex] = seatEntry;
    } else {
      row.seats.push(seatEntry);
    }
  };

  seatingChartById.forEach((chart, chartId) => {
    const cabins = getArrayByKeys(chart, ["Cabin", "cabin"]);
    cabins.forEach((cabin) => {
      const cabinRow = (cabin as Record<string, unknown>) || {};
      const rows = getArrayByKeys(cabinRow, ["Row", "row", "Rows", "rows"]);

      rows.forEach((rowNode, rowIndex) => {
        const rowObject = (rowNode as Record<string, unknown>) || {};
        const rawRowNumber =
          toText(getValueByKeys(rowObject, ["rowNumber", "RowNumber", "number", "Number"])) ||
          toText(getValueByKeys(rowObject, ["label", "Label", "value", "Value"]));
        const rowNumber = toNumber(rawRowNumber) || rowIndex + 1;

        const spaces = getArrayByKeys(rowObject, ["Space", "space", "Seat", "seat", "Seats", "seats"]);
        spaces.forEach((spaceNode) => {
          const space = (spaceNode as Record<string, unknown>) || {};
          const column = normalizeSeatCode(
            getValueByKeys(space, ["location", "Location", "column", "Column", "seatLetter", "SeatLetter", "value", "Value"])
          )
            .replace(/[^A-Z]/g, "")
            .slice(0, 2);
          if (!column) return;

          const seatCode = `${rowNumber}${column}`;
          const mapKey = `${chartId || "default"}::${seatCode}`;
          const anyMapKey = `default::${seatCode}`;
          const meta = seatByChartAndCode.get(mapKey) || seatByChartAndCode.get(anyMapKey) || null;
          const fallbackStatus = resolveCharacteristicFallbackStatus(space);
          const mergedMeta = meta
            ? meta
            : {
                status: fallbackStatus,
                price: 0,
                currency: "USD",
                offerListIdentifier: "",
                offerIdentifier: "",
                productIdentifier: "",
                travelerIdentifier: "",
                segmentRef: "",
              };

          upsertSeat(rowNumber, column, mergedMeta);
        });
      });
    });
  });

  if (!rowsByNumber.size) {
    seatByChartAndCode.forEach((seatMeta, key) => {
      const parts = key.split("::");
      const parsedSeat = parseSeatCode(parts[1] || "");
      if (!parsedSeat) return;
      upsertSeat(parsedSeat.rowNumber, parsedSeat.column, seatMeta);
    });
  }

  return Array.from(rowsByNumber.values())
    .map((row) => ({
      ...row,
      seats: row.seats
        .sort((a, b) => a.seatNumber.localeCompare(b.seatNumber, undefined, { numeric: true })),
    }))
    .filter((row) => row.seats.length > 0)
    .sort((a, b) => a.rowNumber - b.rowNumber);
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const body = (req.body ?? {}) as SeatEligibilityBody;
    const pnr = toText(body?.pnr || body?.locator);
    let reservationId = toText(body?.reservationId);
    const segmentIndex = toIndex(body?.segmentId);
    const passengerIndex = toIndex(body?.passengerId);

    if (!pnr && !reservationId) {
      return res.status(400).json({
        message: "pnr (or locator) or reservationId is required",
      });
    }

    const version = process.env.TRAVELPORT_VERSION || "11";
    const bookingBaseUrl = resolveBookingBaseUrl(version);
    const seatAvailabilityUrl = resolveSeatAvailabilityUrl(version);
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
    } else if (reservationId) {
      const wbUrl = `${bookingBaseUrl}/session/reservationworkbench/${encodeURIComponent(
        reservationId
      )}`;
      const wbResponse = await fetchUpstream(wbUrl, { method: "GET", headers });
      const wbPayload = (await parseJsonSafe(wbResponse)) as Record<string, unknown>;
      if (!wbResponse.ok || hasTravelportErrors(wbPayload)) {
        return res.status(502).json({
          message: `Workbench retrieval failed (${wbResponse.status})`,
          details:
            extractTravelportErrorMessage(wbPayload) ||
            "Unable to retrieve reservation workbench.",
          stage: "get_workbench",
        });
      }
      buildPayload = wbPayload;
    }

    if (!reservationId) {
      return res.status(502).json({
        message: "No reservationId returned for seat eligibility",
        stage: "build_from_locator",
      });
    }

    const reservation = resolveReservationFromPayload(buildPayload);
    const travelerRows = resolveTravelerRows(reservation);
    const selectedTraveler =
      passengerIndex >= 0 && passengerIndex < travelerRows.length
        ? travelerRows[passengerIndex]
        : travelerRows[0] || null;

    const selectedTravelerCandidates = selectedTraveler
      ? [selectedTraveler.id, selectedTraveler.identifier].filter(Boolean)
      : [];

    const explicitOfferIdentifier = normalizeIdentifier(body?.offerIdentifier);
    const offerIdentifier =
      explicitOfferIdentifier || resolveOfferIdentifierFromReservation(reservation);

    const explicitProductIdentifiers = normalizeIdentifierList(
      body?.productIdentifiers ?? body?.productIdentifier
    );

    const explicitSequenceList = normalizeIdentifierList(body?.segmentSequenceList);
    const derivedSequenceList = segmentIndex >= 0 ? [String(segmentIndex + 1)] : [];
    const segmentSequenceList = explicitSequenceList.length
      ? explicitSequenceList
      : derivedSequenceList;

    const productIdentifiers = explicitProductIdentifiers.length
      ? explicitProductIdentifiers
      : resolveProductIdentifiersFromReservation(reservation, segmentSequenceList);

    if (!offerIdentifier) {
      return res.status(400).json({
        message: "offerIdentifier is required for seat eligibility",
      });
    }

    const requestPayload: Record<string, unknown> = {
      "@type": "CatalogOfferingsQuerySeatAvailability",
      SeatAvailabilityOfferings: {
        "@type": "SeatAvailabilityOfferingsBuildFromReservationWorkbench",
        BuildFromReservationWorkbench: {
          ReservationIdentifier: {
            Identifier: {
              value: reservationId,
            },
          },
          OfferIdentifier: {
            Identifier: {
              value: offerIdentifier,
            },
          },
          ...(productIdentifiers.length
            ? {
                ProductIdentifier: productIdentifiers.map((identifier) => ({
                  Identifier: { value: identifier },
                })),
              }
            : {}),
          ...(segmentSequenceList.length
            ? {
                SegmentSequenceList: segmentSequenceList,
              }
            : {}),
        },
      },
    };

    const seatAvailabilityResponse = await fetchUpstream(seatAvailabilityUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(requestPayload),
    });

    const seatAvailabilityPayload = (await parseJsonSafe(
      seatAvailabilityResponse
    )) as Record<string, unknown>;
    try {
      const { logTravelportApi } = await import("@/utils/travelportLogger");
      logTravelportApi({
        endpoint: seatAvailabilityUrl,
        request: { method: "POST", headers, body: requestPayload },
        response: seatAvailabilityPayload,
        status: seatAvailabilityResponse.status,
        meta: { api: "seat-eligibility", reservationId },
      });
    } catch { }

    if (!seatAvailabilityResponse.ok || hasTravelportErrors(seatAvailabilityPayload)) {
      return res.status(502).json({
        message: `Seat availability failed (${seatAvailabilityResponse.status})`,
        details:
          extractTravelportErrorMessage(seatAvailabilityPayload) ||
          "Unable to fetch seat map for this reservation.",
        stage: "seat_availability",
      });
    }

    const rows = extractSeatMapRows({
      payload: seatAvailabilityPayload,
      selectedTravelerCandidates,
    });

    return res.status(200).json({
      success: true,
      eligible: rows.length > 0,
      pnr: pnr || reservationId,
      reservationId,
      travelerIdentifier:
        selectedTraveler?.identifier || selectedTraveler?.id || null,
      offerIdentifier,
      productIdentifiers,
      seatMap: {
        rows,
      },
      requestPayload,
      seatAvailabilityResponse: seatAvailabilityPayload,
    });
  } catch (error) {
    const message = publicErrorMessage(error, "Unexpected server error");
    return res.status(500).json({ message });
  }
}

export default withApiHandler(handler, { methods: ["POST"] });

export const config = { api: { bodyParser: false } };
