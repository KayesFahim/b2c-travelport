import type { NextApiRequest, NextApiResponse } from "next";
import { getTravelportAccessToken } from "./_token-cache";
import { getSessionUser } from "@/server/auth-session";

type ApiFlowLog = {
    timestamp: string;
    step: string;
    request: {
        method: string;
        url: string;
        body?: Record<string, unknown> | null;
    };
    response: {
        status: number;
        ok: boolean;
        body?: Record<string, unknown> | null;
    };
};

type ErrorResponse = {
    message: string;
    details?: string;
    warnings?: string[];
    requiresLogin?: boolean;
    stage?: string;
    apiFlowLogs?: ApiFlowLog[];
};

type SuccessResponse = {
    success: true;
    pnr: string;
    reservationId: string;
    locator: string | null;
    warnings: string[];
    buildFromLocatorResponse: Record<string, unknown> | null;
    documentOverrideResponse: Record<string, unknown> | null;
    formOfPaymentResponse: Record<string, unknown> | null;
    applyPaymentResponse: Record<string, unknown> | null;
    previewTicketResponse: Record<string, unknown> | null;
    commitResponse: Record<string, unknown> | null;
    apiFlowLogs: ApiFlowLog[];
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
            ""
        );
    }
    return "";
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
    if (typeof value === "boolean") return value;
    const text = String(value ?? "")
        .trim()
        .toLowerCase();
    if (text === "true") return true;
    if (text === "false") return false;
    return fallback;
}

function parseJsonEnvObject(name: string): Record<string, unknown> | null {
    const raw = toText(process.env[name]);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            return parsed as Record<string, unknown>;
        }
    } catch {
        return null;
    }
    return null;
}

function pushApiFlowLog(params: {
    logs: ApiFlowLog[];
    step: string;
    method: string;
    url: string;
    requestBody?: Record<string, unknown> | null;
    status: number;
    ok: boolean;
    responseBody?: Record<string, unknown> | null;
}) {
    params.logs.push({
        timestamp: new Date().toISOString(),
        step: params.step,
        request: {
            method: params.method,
            url: params.url,
            ...(params.requestBody !== undefined ? { body: params.requestBody } : {}),
        },
        response: {
            status: params.status,
            ok: params.ok,
            ...(params.responseBody !== undefined ? { body: params.responseBody } : {}),
        },
    });
}

function resolveIssueTicketCommissionPercent(): number {
    const fromEnv = Number(process.env.TRAVELPORT_DEFAULT_COMMISSION_PERCENT);
    if (Number.isFinite(fromEnv) && fromEnv > 0) {
        return Math.min(fromEnv, 100);
    }
    return 5;
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

function resolveTravelportVersionBaseUrl(version: string): string {
    const baseUrl = process.env.TRAVELPORT_BASE_URL || "https://api.pp.travelport.net";
    return `${baseUrl.replace(/\/+$/, "")}/${version}`;
}

async function parseJsonSafe(response: Response) {
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

    const errorsList = payload?.Errors;
    if (Array.isArray(errorsList)) {
        for (const item of errorsList) {
            const text = toText(item);
            if (text) return text;
            if (item && typeof item === "object") {
                const asObj = item as Record<string, unknown>;
                const details = toText(asObj.message) || toText(asObj.Message) || toText(asObj.code);
                if (details) return details;
            }
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
            const asObj = item as Record<string, unknown>;
            const details =
                toText(asObj.Message) ||
                toText(asObj.message) ||
                toText(asObj.Code) ||
                toText(asObj.code);
            if (details) return details;
        }
    }

    return "";
}

function hasTravelportErrors(payload: Record<string, unknown>): boolean {
    return Boolean(extractTravelportErrorMessage(payload));
}

function resolveLocator(payload: Record<string, unknown>): string | null {
    const reservationResponse =
        payload?.ReservationResponse && typeof payload.ReservationResponse === "object"
            ? (payload.ReservationResponse as Record<string, unknown>)
            : payload;
    const reservation =
        reservationResponse?.Reservation && typeof reservationResponse.Reservation === "object"
            ? (reservationResponse.Reservation as Record<string, unknown>)
            : reservationResponse;

    const candidates: unknown[] = [
        reservation?.Locator,
        reservation?.locator,
        payload?.Locator,
        payload?.locator,
    ];
    for (const candidate of candidates) {
        const text = toText(candidate);
        if (text) return text;
    }
    return null;
}

function resolveReservationIdentifier(payload: Record<string, unknown>): string {
    const reservationResponse =
        payload?.ReservationResponse && typeof payload.ReservationResponse === "object"
            ? (payload.ReservationResponse as Record<string, unknown>)
            : payload;
    const reservation =
        reservationResponse?.Reservation && typeof reservationResponse.Reservation === "object"
            ? (reservationResponse.Reservation as Record<string, unknown>)
            : reservationResponse;

    const identifier = reservation?.Identifier;
    if (identifier && typeof identifier === "object") {
        const idObj = identifier as Record<string, unknown>;
        return toText(idObj?.value) || toText(idObj?.Value) || toText(idObj?.id) || "";
    }
    return toText(identifier);
}

function resolveReservationObject(payload: Record<string, unknown>): Record<string, unknown> {
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

function resolveIssueTicketRuntimeContext(payload: Record<string, unknown>) {
    const reservation = resolveReservationObject(payload);
    const offers = Array.isArray(reservation?.Offer) ? (reservation.Offer as Record<string, unknown>[]) : [];
    const firstOffer = offers[0] || {};
    const firstTraveler = Array.isArray(reservation?.Traveler)
        ? ((reservation.Traveler as Record<string, unknown>[])[0] || {})
        : {};

    const offerId = toText(firstOffer?.id) || "offer_1";
    const offerIdentifier =
        toText((firstOffer?.Identifier as Record<string, unknown> | undefined)?.value) ||
        toText((firstOffer?.Identifier as Record<string, unknown> | undefined)?.Value);
    const travelerRef = toText(firstTraveler?.id) || "travelerRefId_1";
    const travelerType = toText(firstTraveler?.passengerTypeCode) || "ADT";

    const price =
        firstOffer?.Price && typeof firstOffer.Price === "object"
            ? (firstOffer.Price as Record<string, unknown>)
            : {};
    const chargedRow = Array.isArray(price?.PriceBreakdown)
        ? (price.PriceBreakdown as Record<string, unknown>[]).find((row) => {
            const amount = row?.Amount as Record<string, unknown> | undefined;
            return toText(amount?.currencySource).toLowerCase() === "charged";
        })
        : null;
    const chargedAmount =
        chargedRow?.Amount && typeof chargedRow.Amount === "object"
            ? (chargedRow.Amount as Record<string, unknown>)
            : {};

    const currencyCode =
        toText((chargedAmount?.CurrencyCode as Record<string, unknown> | undefined)?.value) ||
        toText((price?.CurrencyCode as Record<string, unknown> | undefined)?.value) ||
        "USD";

    const totalValueRaw =
        Number(chargedAmount?.Total) || Number(price?.TotalPrice) || Number(price?.Total) || 0;
    const totalValue = Number.isFinite(totalValueRaw) ? totalValueRaw : 0;

    return {
        offerId,
        offerIdentifier,
        travelerRef,
        travelerType,
        currencyCode,
        totalValue,
    };
}

function buildDefaultFormOfPaymentPayload(_buildPayload: Record<string, unknown>) {
    return {
        "@type": "FormOfPaymentCash",
        id: "formOfPayment_1",
        FormOfPaymentRef: "formOfPayment_1",
    } as Record<string, unknown>;
}

function buildDefaultApplyPaymentPayload(
    buildPayload: Record<string, unknown>,
    fopIdentifier?: { authority: string; value: string }
) {
    const ctx = resolveIssueTicketRuntimeContext(buildPayload);

    return {
        "@type": "Payment",
        id: "payment_1",
        PaymentRef: "payment_1",
        Amount: {
            code: ctx.currencyCode,
            value: ctx.totalValue,
        },
        FormOfPaymentIdentifier: {
            id: "formOfPayment_1",
            ...(fopIdentifier ? { Identifier: fopIdentifier } : {}),
        },
        OfferIdentifier: [
            {
                id: ctx.offerId,
                offerRef: ctx.offerId,
                ...(ctx.offerIdentifier
                    ? { Identifier: { authority: "Travelport", value: ctx.offerIdentifier } }
                    : {}),
            },
        ],
        TravelerIdentifierRef: [
            {
                passengerTypeCode: ctx.travelerType,
                id: ctx.travelerRef,
            },
        ],
    } as Record<string, unknown>;
}

function resolveStepUrl(params: {
    bookingBaseUrl: string;
    reservationId: string;
    pnr?: string;
    template: string;
}): string {
    const withReservationId = params.template.replace(
        /\{reservationId\}/g,
        encodeURIComponent(params.reservationId || "")
    );
    const resolvedTemplate = withReservationId.replace(
        /\{pnr\}/g,
        encodeURIComponent(params.pnr || "")
    );

    if (/^https?:\/\//i.test(resolvedTemplate)) {
        return resolvedTemplate;
    }

    const normalizedBase = params.bookingBaseUrl.replace(/\/+$/, "");
    const normalizedPath = `/${resolvedTemplate.replace(/^\/+/, "")}`;
    return `${normalizedBase}${normalizedPath}`;
}

async function runIssueTicketPaymentStep(params: {
    bookingBaseUrl: string;
    reservationId: string;
    pnr?: string;
    headers: Record<string, string>;
    stepName: string;
    logs: ApiFlowLog[];
    enabled: boolean;
    pathTemplate: string;
    payloadEnvName: string;
    defaultPayload: Record<string, unknown>;
    method?: string;
    defaultErrorMessage: string;
}) {
    if (!params.enabled || !toText(params.pathTemplate)) {
        return {
            attempted: false,
            ok: true,
            status: 0,
            payload: null,
            errorMessage: "",
        };
    }

    const url = resolveStepUrl({
        bookingBaseUrl: params.bookingBaseUrl,
        reservationId: params.reservationId,
        pnr: params.pnr,
        template: params.pathTemplate,
    });
    const payloadBody =
        parseJsonEnvObject(params.payloadEnvName) || params.defaultPayload;
    const httpMethod = toText(params.method).toUpperCase() || "POST";

    const requestInit: RequestInit = {
        method: httpMethod,
        headers: params.headers,
    };

    if (httpMethod !== "GET" && httpMethod !== "HEAD") {
        requestInit.body = JSON.stringify(payloadBody);
    }

    const response = await fetch(url, requestInit);
    const payload = (await parseJsonSafe(response)) as Record<string, unknown>;

    pushApiFlowLog({
        logs: params.logs,
        step: params.stepName,
        method: httpMethod,
        url,
        requestBody:
            httpMethod !== "GET" && httpMethod !== "HEAD"
                ? (payloadBody as Record<string, unknown>)
                : null,
        status: response.status,
        ok: response.ok && !hasTravelportErrors(payload),
        responseBody: payload,
    });

    return {
        attempted: true,
        ok: response.ok && !hasTravelportErrors(payload),
        status: response.status,
        payload,
        errorMessage:
            extractTravelportErrorMessage(payload) || params.defaultErrorMessage,
    };
}

// ── Traveler demographic helpers ──────────────────────────────────────────────

function getRelativeBirthDateFromNow(yearsAgo: number): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() - yearsAgo);
    return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

function fallbackBirthDateByPaxType(paxTypeCode: string): string {
    const code = (paxTypeCode || "").toUpperCase();
    if (code === "CHD" || code === "C") return getRelativeBirthDateFromNow(8);
    if (code === "INF" || code === "I") return getRelativeBirthDateFromNow(1);
    return getRelativeBirthDateFromNow(30);
}

function extractAllTravelersFromWorkbench(
    payload: Record<string, unknown>
): Record<string, unknown>[] {
    const reservation = resolveReservationObject(payload);
    const travelers = reservation?.Traveler;
    if (Array.isArray(travelers)) return travelers as Record<string, unknown>[];
    if (travelers && typeof travelers === "object")
        return [travelers as Record<string, unknown>];
    return [];
}

function defaultPrefixByPaxType(paxTypeCode: string, gender: string): string {
    const code = (paxTypeCode || "").toUpperCase();
    const isMale = (gender || "").toUpperCase() !== "FEMALE";
    if (code === "ADT") return isMale ? "MR" : "MS";
    return isMale ? "MSTR" : "MISS";
}

function buildEnrichedTraveler(traveler: Record<string, unknown>): Record<string, unknown> {
    const travelerId = toText(traveler?.id);
    const paxTypeCode = toText(traveler?.passengerTypeCode) || "ADT";
    const gender = toText(traveler?.gender) || "MALE";
    const birthDate =
        toText(traveler?.birthDate) || fallbackBirthDateByPaxType(paxTypeCode);

    // Resolve PersonName from any shape the workbench may use
    const rawName = (
        traveler?.PersonName ?? traveler?.PersonNameDetail
    ) as Record<string, unknown> | undefined;
    const given =
        toText(rawName?.Given) ||
        toText(rawName?.GivenName) ||
        toText((traveler as Record<string, unknown>)?.firstName) ||
        "TRAVELER";
    const surname =
        toText(rawName?.Surname) ||
        toText(rawName?.SurName) ||
        toText((traveler as Record<string, unknown>)?.lastName) ||
        "GUEST";
    const prefix =
        toText(rawName?.Prefix) || defaultPrefixByPaxType(paxTypeCode, gender);

    const enriched: Record<string, unknown> = {
        "@type": "Traveler",
        id: travelerId,
        passengerTypeCode: paxTypeCode,
        gender,
        birthDate,
        PersonName: {
            "@type": "PersonNameDetail",
            Prefix: prefix,
            Given: given,
            Surname: surname,
            Suffix: paxTypeCode,
        },
    };

    // Carry over Telephone array if present
    const telephone = traveler?.Telephone;
    if (Array.isArray(telephone) && telephone.length > 0) {
        enriched.Telephone = telephone;
    }

    // Carry over Email array if present
    const email = traveler?.Email;
    if (Array.isArray(email) && email.length > 0) {
        enriched.Email = email;
    }

    // Carry over TravelDocument array exactly as received
    const travelDocArr = traveler?.TravelDocument;
    if (Array.isArray(travelDocArr) && travelDocArr.length > 0) {
        enriched.TravelDocument = travelDocArr as Record<string, unknown>[];
    }

    return enriched;
}

/**
 * Sends a TravelerListRequest with all travelers in the workbench, ensuring
 * every traveler has birthDate, gender, and a full PersonName structure.
 * This prevents Travelport's "TRAVEL DOCUMENT REQUIRES CURRENT PASSPORT OR
 * NAME, DATE OF BIRTH, AND GENDER" error at commit time.
 * The step is non-fatal – failures are collected as warnings only.
 */
async function enrichWorkbenchTravelers(params: {
    bookingBaseUrl: string;
    reservationId: string;
    headers: Record<string, string>;
    travelers: Record<string, unknown>[];
    logs: ApiFlowLog[];
}): Promise<string[]> {
    const validTravelers = params.travelers.filter((t) => Boolean(toText(t?.id)));
    if (validTravelers.length === 0) return [];

    const pathTemplate =
        toText(process.env.TRAVELPORT_ISSUE_TICKET_ENRICH_TRAVELER_PATH) ||
        "/traveler/reservationworkbench/{reservationId}/travelers/list";
    const method =
        toText(
            process.env.TRAVELPORT_ISSUE_TICKET_ENRICH_TRAVELER_METHOD
        ).toUpperCase() || "POST";

    const url = resolveStepUrl({
        bookingBaseUrl: params.bookingBaseUrl,
        reservationId: params.reservationId,
        template: pathTemplate,
    });

    const body = {
        TravelerListRequest: {
            "@type": "TravelerListRequest",
            Traveler: validTravelers.map(buildEnrichedTraveler),
        },
    };

    try {
        const response = await fetch(url, {
            method,
            headers: params.headers,
            body: JSON.stringify(body),
        });
        const responsePayload = (await parseJsonSafe(response)) as Record<
            string,
            unknown
        >;
        pushApiFlowLog({
            logs: params.logs,
            step: "issue_ticket_traveler_list",
            method,
            url,
            requestBody: body,
            status: response.status,
            ok: response.ok && !hasTravelportErrors(responsePayload),
            responseBody: responsePayload,
        });
        if (!response.ok || hasTravelportErrors(responsePayload)) {
            const msg =
                extractTravelportErrorMessage(responsePayload) ||
                `Traveler list enrich failed (HTTP ${response.status})`;
            return [`Traveler enrichment: ${msg}`];
        }
    } catch (e) {
        return [
            `Traveler enrichment fetch error: ${e instanceof Error ? e.message : String(e)}`,
        ];
    }

    return [];
}

async function applyIssueTicketDocumentOverrides(params: {
    bookingBaseUrl: string;
    reservationId: string;
    headers: Record<string, string>;
    travelerRefIds: string[];
    commissionPercent: number;
    logs: ApiFlowLog[];
}) {
    const travelerRefs = Array.from(new Set((params.travelerRefIds || []).filter(Boolean))).map(
        (id) => ({ id })
    );

    if (!travelerRefs.length) {
        return {
            ok: false,
            status: 400,
            payload: { message: "No traveler refs available for commission override." },
            errorMessage: "No traveler refs available for commission override.",
        };
    }

    const overrideUrl = `${params.bookingBaseUrl}/documentoverride/Reservation/${encodeURIComponent(
        params.reservationId
    )}/documentoverrides`;
    const overrideBody = {
        "@type": "DocumentOverrides",
        id: "documentOverrides_1",
        DocumentOverridesRef: "documentOverrides_1",
        Commissions: [
            {
                TravelerIdentifierRef: travelerRefs,
                Commission: {
                    "@type": "CommissionPercent",
                    Percent: params.commissionPercent,
                },
            },
        ],
    };

    const overrideResponse = await fetch(overrideUrl, {
        method: "POST",
        headers: params.headers,
        body: JSON.stringify(overrideBody),
    });
    const overridePayload = (await parseJsonSafe(overrideResponse)) as Record<string, unknown>;

    pushApiFlowLog({
        logs: params.logs,
        step: "issue_ticket_document_override",
        method: "POST",
        url: overrideUrl,
        requestBody: overrideBody,
        status: overrideResponse.status,
        ok: overrideResponse.ok && !hasTravelportErrors(overridePayload),
        responseBody: overridePayload,
    });

    return {
        ok: overrideResponse.ok && !hasTravelportErrors(overridePayload),
        status: overrideResponse.status,
        payload: overridePayload,
        errorMessage:
            extractTravelportErrorMessage(overridePayload) ||
            "Unable to apply document override commission.",
    };
}

// ── Workbench build / commit ───────────────────────────────────────────────────

async function buildWorkbenchFromLocator(params: {
    bookingBaseUrl: string;
    pnr: string;
    headers: Record<string, string>;
    logs: ApiFlowLog[];
}) {
    const buildFromLocatorPath =
        toText(process.env.TRAVELPORT_ISSUE_TICKET_BUILD_FROM_LOCATOR_PATH) ||
        "/session/reservationworkbench/buildfromlocator?Locator={pnr}";
    const buildFromLocatorMethod =
        toText(process.env.TRAVELPORT_ISSUE_TICKET_BUILD_FROM_LOCATOR_METHOD) || "POST";

    const url = resolveStepUrl({
        bookingBaseUrl: params.bookingBaseUrl,
        reservationId: "",
        pnr: params.pnr,
        template: buildFromLocatorPath,
    });

    const response = await fetch(url, {
        method: buildFromLocatorMethod,
        headers: params.headers,
    });
    const payload = (await parseJsonSafe(response)) as Record<string, unknown>;

    pushApiFlowLog({
        logs: params.logs,
        step: "issue_ticket_build_from_locator",
        method: buildFromLocatorMethod,
        url,
        requestBody: null,
        status: response.status,
        ok: response.ok && !hasTravelportErrors(payload),
        responseBody: payload,
    });

    return {
        ok: response.ok && !hasTravelportErrors(payload),
        status: response.status,
        payload,
        reservationId: resolveReservationIdentifier(payload),
        locator: resolveLocator(payload),
        errorMessage:
            extractTravelportErrorMessage(payload) ||
            "Unable to build reservation workbench from locator.",
    };
}

async function commitReservation(params: {
    bookingBaseUrl: string;
    reservationId: string;
    headers: Record<string, string>;
    logs: ApiFlowLog[];
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

    pushApiFlowLog({
        logs: params.logs,
        step: "issue_ticket_commit",
        method: "POST",
        url: commitUrl,
        requestBody: { "@type": "ReservationQueryCommitReservation" },
        status: commitResponse.status,
        ok: commitResponse.ok && !hasTravelportErrors(commitPayloadResponse),
        responseBody: commitPayloadResponse,
    });

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

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
    if (!["GET", "POST"].includes(req.method || "")) {
        res.setHeader("Allow", "GET, POST");
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        const sessionUser = await getSessionUser(req);
        if (!sessionUser) {
            return res.status(401).json({
                message: "Login required for Issue Ticket. Please sign in again and retry.",
                requiresLogin: true,
                apiFlowLogs: [],
            });
        }

        const apiFlowLogs: ApiFlowLog[] = [];

        const queryOrBody = req.method === "GET" ? req.query : (req.body ?? {});
        const pnr =
            toText((queryOrBody as Record<string, unknown>)?.pnr) ||
            toText((queryOrBody as Record<string, unknown>)?.locator) ||
            toText((queryOrBody as Record<string, unknown>)?.reservationId);

        if (!pnr) {
            return res.status(400).json({
                message: "pnr (or locator/reservationId) is required",
                apiFlowLogs,
            });
        }

        const version = process.env.TRAVELPORT_VERSION || "11";
        const bookingBaseUrl = resolveBookingBaseUrl(version);
        const versionBaseUrl = resolveTravelportVersionBaseUrl(version);
        const accessGroup = getRequiredEnv("TRAVELPORT_ACCESS_GROUP");
        const accessToken = await getTravelportAccessToken();
        const commonHeaders = {
            Accept: "application/json",
            "Content-Type": "application/json",
            XAUTH_TRAVELPORT_ACCESSGROUP: accessGroup,
            "Accept-Version": version,
            "Content-Version": version,
            Authorization: `Bearer ${accessToken}`,
        };

        const strictPaymentFlow = parseBoolean(
            process.env.TRAVELPORT_ISSUE_TICKET_PAYMENT_STRICT,
            false
        );
        const enableFormOfPayment = parseBoolean(
            process.env.TRAVELPORT_ISSUE_TICKET_ENABLE_FORM_OF_PAYMENT,
            false
        );
        const enableApplyPayment = parseBoolean(
            process.env.TRAVELPORT_ISSUE_TICKET_ENABLE_APPLY_PAYMENT,
            false
        );

        const warnings: string[] = [];
        let buildFromLocatorResponse: Record<string, unknown> | null = null;
        let documentOverrideResponse: Record<string, unknown> | null = null;
        let formOfPaymentResponse: Record<string, unknown> | null = null;
        let applyPaymentResponse: Record<string, unknown> | null = null;
        let previewTicketResponse: Record<string, unknown> | null = null;

        const buildFromLocator = await buildWorkbenchFromLocator({
            bookingBaseUrl,
            pnr,
            headers: commonHeaders,
            logs: apiFlowLogs,
        });
        buildFromLocatorResponse = buildFromLocator.payload;

        if (!buildFromLocator.ok) {
            return res.status(502).json({
                message: `Travelport build-from-locator failed (${buildFromLocator.status})`,
                details: buildFromLocator.errorMessage,
                stage: "issue_ticket_build_from_locator",
                apiFlowLogs,
            });
        }

        const reservationIdForCommit = toText(buildFromLocator.reservationId);
        if (!reservationIdForCommit) {
            return res.status(502).json({
                message: "Reservation identifier not found for provided PNR.",
                details:
                    "Travelport build-from-locator response did not include a valid reservation workbench identifier.",
                stage: "issue_ticket_missing_reservation_id",
                apiFlowLogs,
            });
        }

        const allTravelers = extractAllTravelersFromWorkbench(
            buildFromLocator.payload
        );

        // Traveler enrichment flow removed from issue-ticket process by requirement.

        // Apply commission override before commit to avoid:
        // "COMMISSION PERCENTAGE MUST BE ENTERED"
        const travelerRefIds = allTravelers
            .map((traveler) => toText(traveler?.id))
            .filter(Boolean);
        const commissionPercent = resolveIssueTicketCommissionPercent();
        const overrideStep = await applyIssueTicketDocumentOverrides({
            bookingBaseUrl,
            reservationId: reservationIdForCommit,
            headers: commonHeaders,
            travelerRefIds,
            commissionPercent,
            logs: apiFlowLogs,
        });

        documentOverrideResponse =
            (overrideStep.payload as Record<string, unknown>) || null;

        if (!overrideStep.ok) {
            return res.status(502).json({
                message: `Travelport document override failed (${overrideStep.status})`,
                details: overrideStep.errorMessage,
                warnings,
                stage: "issue_ticket_document_override",
                apiFlowLogs,
            });
        }
        // ───────────────────────────────────────────────────────────────────────

        if (enableFormOfPayment) {
            const step = await runIssueTicketPaymentStep({
                bookingBaseUrl,
                reservationId: reservationIdForCommit,
                pnr,
                headers: commonHeaders,
                stepName: "issue_ticket_form_of_payment",
                logs: apiFlowLogs,
                enabled: true,
                pathTemplate:
                    toText(process.env.TRAVELPORT_ISSUE_TICKET_FORM_OF_PAYMENT_PATH) ||
                    `${versionBaseUrl}/air/payment/reservationworkbench/{reservationId}/formofpayment`,
                payloadEnvName: "TRAVELPORT_ISSUE_TICKET_FORM_OF_PAYMENT_PAYLOAD",
                defaultPayload: buildDefaultFormOfPaymentPayload(buildFromLocator.payload),
                method: toText(process.env.TRAVELPORT_ISSUE_TICKET_FORM_OF_PAYMENT_METHOD) || "POST",
                defaultErrorMessage: "Unable to set form of payment.",
            });

            formOfPaymentResponse = (step.payload as Record<string, unknown>) || null;
            if (!step.ok) {
                if (strictPaymentFlow) {
                    return res.status(502).json({
                        message: `Travelport form of payment failed (${step.status})`,
                        details: step.errorMessage,
                        stage: "issue_ticket_form_of_payment",
                        apiFlowLogs,
                    });
                }
                warnings.push(`Form of payment step warning: ${step.errorMessage}`);
            }
        }

        // Extract FOP Identifier (UUID) from the FOP response, fallback to workbench FormOfPayment
        let resolvedFopIdentifier: { authority: string; value: string } | undefined;
        const fopRespAny = formOfPaymentResponse as Record<string, unknown> | null;
        const fopIdFromResponse = (fopRespAny?.FormOfPaymentResponse as Record<string, unknown> | undefined)
            ?.FormOfPayment as Record<string, unknown> | undefined;
        if (fopIdFromResponse?.Identifier) {
            resolvedFopIdentifier = fopIdFromResponse.Identifier as { authority: string; value: string };
        }
        if (!resolvedFopIdentifier) {
            const foPs = ((buildFromLocator.payload as Record<string, unknown>
            )?.ReservationResponse as Record<string, unknown> | undefined
            )?.Reservation as Record<string, unknown> | undefined;
            const fopArr = foPs?.FormOfPayment as Array<Record<string, unknown>> | undefined;
            if (Array.isArray(fopArr) && fopArr[0]?.Identifier) {
                resolvedFopIdentifier = fopArr[0].Identifier as { authority: string; value: string };
            }
        }

        if (enableApplyPayment) {
            const step = await runIssueTicketPaymentStep({
                bookingBaseUrl,
                reservationId: reservationIdForCommit,
                pnr,
                headers: commonHeaders,
                stepName: "issue_ticket_apply_payment",
                logs: apiFlowLogs,
                enabled: true,
                pathTemplate:
                    toText(process.env.TRAVELPORT_ISSUE_TICKET_APPLY_PAYMENT_PATH) ||
                    `${versionBaseUrl}/air/paymentoffer/reservationworkbench/{reservationId}/payments`,
                payloadEnvName: "TRAVELPORT_ISSUE_TICKET_APPLY_PAYMENT_PAYLOAD",
                defaultPayload: buildDefaultApplyPaymentPayload(buildFromLocator.payload, resolvedFopIdentifier),
                method: toText(process.env.TRAVELPORT_ISSUE_TICKET_APPLY_PAYMENT_METHOD) || "POST",
                defaultErrorMessage: "Unable to apply payment.",
            });

            applyPaymentResponse = (step.payload as Record<string, unknown>) || null;
            if (!step.ok) {
                if (strictPaymentFlow) {
                    return res.status(502).json({
                        message: `Travelport apply payment failed (${step.status})`,
                        details: step.errorMessage,
                        stage: "issue_ticket_apply_payment",
                        apiFlowLogs,
                    });
                }
                warnings.push(`Apply payment step warning: ${step.errorMessage}`);
            }
        }

        const enablePreviewTicket = parseBoolean(
            process.env.TRAVELPORT_ISSUE_TICKET_ENABLE_PREVIEW,
            true
        );
        if (enablePreviewTicket) {
            const step = await runIssueTicketPaymentStep({
                bookingBaseUrl,
                reservationId: reservationIdForCommit,
                pnr,
                headers: commonHeaders,
                stepName: "issue_ticket_preview",
                logs: apiFlowLogs,
                enabled: true,
                pathTemplate:
                    toText(process.env.TRAVELPORT_ISSUE_TICKET_PREVIEW_PATH) ||
                    "/session/reservationworkbench/{reservationId}",
                payloadEnvName: "TRAVELPORT_ISSUE_TICKET_PREVIEW_PAYLOAD",
                defaultPayload: {},
                method: toText(process.env.TRAVELPORT_ISSUE_TICKET_PREVIEW_METHOD) || "GET",
                defaultErrorMessage: "Unable to preview ticket before issue commit.",
            });

            previewTicketResponse = (step.payload as Record<string, unknown>) || null;
            if (!step.ok) {
                if (strictPaymentFlow) {
                    return res.status(502).json({
                        message: `Travelport preview ticket failed (${step.status})`,
                        details: step.errorMessage,
                        stage: "issue_ticket_preview",
                        apiFlowLogs,
                    });
                }
                warnings.push(`Preview ticket step warning: ${step.errorMessage}`);
            }
        }

        const commitResult = await commitReservation({
            bookingBaseUrl,
            reservationId: reservationIdForCommit,
            headers: commonHeaders,
            logs: apiFlowLogs,
        });

        if (!commitResult.ok) {
            return res.status(502).json({
                message: `Travelport issue ticket commit failed (${commitResult.status})`,
                details: commitResult.errorMessage,
                warnings,
                stage: "issue_ticket_commit",
                apiFlowLogs,
            });
        }

        return res.status(200).json({
            success: true,
            pnr,
            reservationId: reservationIdForCommit,
            locator: commitResult.locator || pnr,
            warnings,
            buildFromLocatorResponse,
            documentOverrideResponse,
            formOfPaymentResponse,
            applyPaymentResponse,
            previewTicketResponse,
            commitResponse: commitResult.payload,
            apiFlowLogs,
        });
    } catch (error) {
        return res.status(500).json({
            message: error instanceof Error ? error.message : "Unexpected server error",
            apiFlowLogs: [],
        });
    }
}