import type { NextApiRequest, NextApiResponse } from "next";
import { getTravelportAccessToken } from "./_token-cache";
import { getSessionUser } from "@/server/auth-session";

type ErrorResponse = {
    message: string;
    details?: string;
    stage?: string;
    reservationId?: string;
    requiresLogin?: boolean;
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
            ""
        );
    }
    return "";
}

async function parseJsonSafe(response: Response): Promise<Record<string, unknown>> {
    return response.json().catch(() => ({}));
}

function extractTravelportErrorMessage(payload: Record<string, unknown>): string {
    const candidates: unknown[] = [
        payload?.message,
        payload?.Message,
        payload?.error,
        payload?.error_description,
        payload?.description,
    ];
    for (const c of candidates) {
        const t = toText(c);
        if (t) return t;
    }
    const nestedCandidates: unknown[] = [
        (payload?.Error as Record<string, unknown> | undefined)?.Message,
        (payload?.Error as Record<string, unknown> | undefined)?.message,
    ];
    for (const c of nestedCandidates) {
        const t = toText(c);
        if (t) return t;
    }
    if (Array.isArray(payload?.Errors)) {
        for (const item of payload.Errors as unknown[]) {
            const t = toText(item);
            if (t) return t;
            if (item && typeof item === "object") {
                const asObj = item as Record<string, unknown>;
                const d = toText(asObj.message) || toText(asObj.Message) || toText(asObj.code);
                if (d) return d;
            }
        }
    }
    return "";
}

function hasTravelportErrors(payload: Record<string, unknown>): boolean {
    return Boolean(extractTravelportErrorMessage(payload));
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

function resolveBookingBaseUrl(version: string): string {
    const directUrl =
        process.env.TRAVELPORT_AIR_BOOKING ||
        process.env.TRAVELPORT_AIR_BOOKING_URL ||
        "";
    if (directUrl.trim()) return directUrl.trim().replace(/\/+$/, "");
    const baseUrl = process.env.TRAVELPORT_BASE_URL || "https://api.pp.travelport.net";
    return `${baseUrl.replace(/\/+$/, "")}/${version}/air/book`;
}

function resolveAncillaryShopUrl(version: string): string {
    const directUrl = toText(process.env.TRAVELPORT_ANCILLARY_SHOP_URL);
    if (directUrl) return directUrl;
    const baseUrl = process.env.TRAVELPORT_BASE_URL || "https://api.pp.travelport.net";
    return `${baseUrl.replace(/\/+$/, "")}/${version}/air/ancillaryshop/catalogofferingsancillaries`;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Record<string, unknown> | ErrorResponse>
) {
    if (!["GET", "POST"].includes(req.method || "")) {
        res.setHeader("Allow", "GET, POST");
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        const sessionUser = await getSessionUser(req);
        if (!sessionUser) {
            return res.status(401).json({
                message: "Login required. Please sign in again.",
                requiresLogin: true,
            });
        }

        const queryOrBody =
            req.method === "GET" ? req.query : ((req.body ?? {}) as Record<string, unknown>);
        const pnr =
            toText(queryOrBody?.pnr) ||
            toText(queryOrBody?.locator) ||
            toText(queryOrBody?.reservationId);

        if (!pnr) {
            return res.status(400).json({ message: "pnr is required" });
        }

        const version = process.env.TRAVELPORT_VERSION || "11";
        const bookingBaseUrl = resolveBookingBaseUrl(version);
        const accessGroup = getRequiredEnv("TRAVELPORT_ACCESS_GROUP");
        const accessToken = await getTravelportAccessToken();

        const commonHeaders: Record<string, string> = {
            Accept: "application/json",
            "Content-Type": "application/json",
            XAUTH_TRAVELPORT_ACCESSGROUP: accessGroup,
            "Accept-Version": version,
            "Content-Version": version,
            Authorization: `Bearer ${accessToken}`,
        };

        // Step 1: Build reservation workbench from locator
        const buildFromLocatorPath =
            toText(process.env.TRAVELPORT_ISSUE_TICKET_BUILD_FROM_LOCATOR_PATH) ||
            "/session/reservationworkbench/buildfromlocator?Locator={pnr}";
        const buildUrl =
            `${bookingBaseUrl}${buildFromLocatorPath.replace("{pnr}", encodeURIComponent(pnr))}`;

        const buildResponse = await fetch(buildUrl, {
            method: "POST",
            headers: commonHeaders,
        });
        const buildPayload = await parseJsonSafe(buildResponse);

        if (!buildResponse.ok || hasTravelportErrors(buildPayload)) {
            return res.status(502).json({
                message: `Build-from-locator failed (${buildResponse.status})`,
                details:
                    extractTravelportErrorMessage(buildPayload) ||
                    "Unable to build reservation workbench from locator.",
                stage: "build_from_locator",
            });
        }

        const reservationId = resolveReservationIdentifier(buildPayload);
        if (!reservationId) {
            return res.status(502).json({
                message: "No reservationId returned from build-from-locator",
                stage: "build_from_locator",
            });
        }

        // Step 2: Shop ancillaries using the reservation workbench
        const ancillaryShopUrl = resolveAncillaryShopUrl(version);
        const ancillaryRequestPayload = {
            "@type": "CatalogOfferingsQueryAncillaries",
            AncillaryOfferings: {
                "@type": "AncillaryOfferingsBuildFromReservationWorkbench",
                BuildFromReservationWorkbench: {
                    ReservationIdentifier: {
                        Identifier: { value: reservationId },
                    },
                },
            },
        };

        const ancillaryResponse = await fetch(ancillaryShopUrl, {
            method: "POST",
            headers: commonHeaders,
            body: JSON.stringify(ancillaryRequestPayload),
        });
        const ancillaryData = await parseJsonSafe(ancillaryResponse);

        if (!ancillaryResponse.ok) {
            return res.status(502).json({
                message: `Ancillary shop failed (${ancillaryResponse.status})`,
                details:
                    extractTravelportErrorMessage(ancillaryData) ||
                    "Unable to fetch ancillary offerings.",
                stage: "ancillary_shop",
                reservationId,
            });
        }

        return res.status(200).json({
            success: true,
            pnr,
            reservationId,
            ...ancillaryData,
        });
    } catch (error) {
        return res.status(500).json({
            message: error instanceof Error ? error.message : "Unexpected server error",
        });
    }
}
