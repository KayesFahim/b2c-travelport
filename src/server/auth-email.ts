import { isValidPassword } from "@/utils/passwordPolicy";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { cacheDelete, cacheGetJson, cacheSetJson } from "@/server/redis-cache";
import { prisma } from "@/server/prisma";
import { sendEmail } from "@/server/email/mailer";
import {
    buildVerifyEmailTemplate,
    buildForgotPasswordTemplate,
    buildBookingTemplate,
    buildTicketTemplate,
} from "@/server/email/templates";
import {
    createBookingPdf,
    createTicketPdf,
    type PdfFareRow,
    type PdfItineraryRow,
    type PdfPassengerRow,
} from "@/server/email/pdf";

const VERIFY_TOKEN_TTL_SECONDS = 24 * 60 * 60;
const RESET_TOKEN_TTL_SECONDS = 60 * 60;
const VERIFIED_CACHE_TTL_SECONDS = 10 * 365 * 24 * 60 * 60;

function toText(value: unknown): string {
    return String(value ?? "").trim();
}

function appBaseUrl(): string {
    return (
        toText(process.env.NEXT_PUBLIC_APP_URL) ||
        toText(process.env.APP_BASE_URL) ||
        "http://localhost:3000"
    ).replace(/\/$/, "");
}

export function emailVerificationRequired(): boolean {
    const raw = toText(process.env.EMAIL_VERIFICATION_REQUIRED).toLowerCase();
    if (!raw) return true;
    return raw === "true" || raw === "1" || raw === "yes";
}

type VerifyTokenPayload = {
    userId: number;
    email: string;
};

type ResetTokenPayload = {
    userId: number;
    email: string;
};

function verifyTokenKey(token: string): string {
    return `auth:verify:${token}`;
}

function resetTokenKey(token: string): string {
    return `auth:reset:${token}`;
}

function verifiedUserKey(userId: number): string {
    return `auth:verified:user:${userId}`;
}

export async function isUserEmailVerified(userId: number): Promise<boolean> {
    if (!emailVerificationRequired()) return true;
    // Fast path: check cache first to avoid DB round-trip on hot path.
    const cached = await cacheGetJson<{ verified: boolean }>(verifiedUserKey(userId));
    if (cached?.verified) return true;
    // Fall back to DB for durability across cache restarts.
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { emailVerified: true },
        });
        if (user?.emailVerified) {
            await cacheSetJson(verifiedUserKey(userId), { verified: true }, VERIFIED_CACHE_TTL_SECONDS);
            return true;
        }
        return false;
    } catch (err: any) {
        // P2022: column doesn't exist in DB yet (migration pending).
        // Treat all users as verified so login is not blocked before the migration runs.
        if (err?.code === "P2022") return true;
        throw err;
    }
}

export async function issueEmailVerification(user: {
    id: number;
    email: string;
    name?: string | null;
}): Promise<void> {
    const token = randomBytes(24).toString("hex");
    const payload: VerifyTokenPayload = { userId: user.id, email: user.email };
    await cacheSetJson(verifyTokenKey(token), payload, VERIFY_TOKEN_TTL_SECONDS);

    const verifyUrl = `${appBaseUrl()}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
    const template = buildVerifyEmailTemplate({
        name: toText(user.name) || "Traveler",
        verifyUrl,
    });

    await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
    });
}

export async function verifyEmailToken(token: string): Promise<VerifyTokenPayload | null> {
    if (!token) return null;
    const payload = await cacheGetJson<VerifyTokenPayload>(verifyTokenKey(token));
    if (!payload?.userId || !payload?.email) return null;

    // Persist to DB for durability across cache restarts.
    try {
        await prisma.user.update({
            where: { id: payload.userId },
            data: { emailVerified: true },
        });
    } catch (err: any) {
        // Swallow P2022 (column not yet migrated) and connectivity errors;
        // cache write below is the durable source of truth until migration runs.
        if (err?.code !== "P2022") console.error("[verifyEmailToken] DB update failed:", err?.message);
    }
    await cacheSetJson(verifiedUserKey(payload.userId), { verified: true }, VERIFIED_CACHE_TTL_SECONDS);
    await cacheDelete(verifyTokenKey(token));
    return payload;
}

export async function issueForgotPassword(emailRaw: string): Promise<void> {
    const email = toText(emailRaw).toLowerCase();
    if (!email) return;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return;

    const token = randomBytes(24).toString("hex");
    const payload: ResetTokenPayload = { userId: user.id, email: user.email };
    await cacheSetJson(resetTokenKey(token), payload, RESET_TOKEN_TTL_SECONDS);

    // /resetpassword is the React SPA route handled by ChangePassword.jsx
    const resetUrl = `${appBaseUrl()}/resetpassword?token=${encodeURIComponent(token)}`;
    const template = buildForgotPasswordTemplate({
        name: toText(user.name) || "Traveler",
        resetUrl,
    });

    await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
    });
}

export async function resetPasswordWithToken(params: {
    token: string;
    newPassword: string;
}): Promise<boolean> {
    const token = toText(params.token);
    const newPassword = String(params.newPassword || "");
    if (!token || !isValidPassword(newPassword)) return false;

    const payload = await cacheGetJson<ResetTokenPayload>(resetTokenKey(token));
    if (!payload?.email || !payload?.userId) return false;

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
        where: { id: payload.userId },
        data: { passwordHash },
    });

    await cacheDelete(resetTokenKey(token));
    return true;
}

function toDisplayDate(value: unknown): string {
    const raw = toText(value);
    if (!raw) return "N/A";
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    return parsed.toISOString().split("T")[0] || raw;
}

function toDisplayDateTime(value: unknown): string {
    const raw = toText(value);
    if (!raw) return "N/A";
    const parsed = new Date(raw);
    if (Number.isNaN(parsed.getTime())) return raw;
    const date = parsed.toISOString().split("T")[0] || "";
    const time = parsed.toISOString().slice(11, 16);
    return date ? `${date} ${time}` : raw;
}

function toNumber(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return value as Record<string, unknown>;
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
): Array<Record<string, unknown>> {
    if (!obj || typeof obj !== "object") return [];
    for (const key of keys) {
        const value = (obj as Record<string, unknown>)[key];
        if (Array.isArray(value)) {
            return value.filter((item) => item && typeof item === "object") as Array<
                Record<string, unknown>
            >;
        }
        if (value && typeof value === "object") {
            return [value as Record<string, unknown>];
        }
    }
    return [];
}

function normalizePaxType(value: unknown): string {
    const code = toText(value).toUpperCase();
    if (["ADT", "ADULT"].includes(code)) return "ADT";
    if (["CHD", "CHILD", "CNN"].includes(code)) return "CHD";
    if (["INF", "INFANT"].includes(code)) return "INF";
    return code || "ADT";
}

function resolveCabinLabel(value: unknown): string {
    const code = toText(value).toUpperCase();
    if (["Y", "M", "ECONOMY"].includes(code)) return "Economy";
    if (["W", "S", "U", "PREMIUMECONOMY", "PREMIUM ECONOMY"].includes(code)) {
        return "Premium Economy";
    }
    if (["C", "I", "J", "BUSINESS"].includes(code)) return "Business";
    if (["F", "P", "FIRST"].includes(code)) return "First";
    return code || "Economy";
}

function formatAmount(value: number, currency: string): string {
    const formatted = Number.isFinite(value)
        ? value.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
          })
        : "0.00";
    return `${currency ? `${currency} ` : ""}${formatted}`;
}

type EmailBookingPassenger = {
    prefix?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    paxType?: string | null;
    gender?: string | null;
    birthDate?: Date | string | null;
    passportNumber?: string | null;
    email?: string | null;
};

function resolveSelectedPayload(snapshotRaw: unknown): Record<string, unknown> {
    const snapshot = getObject(snapshotRaw);
    const candidates = [
        getObject(snapshot.selectedAirPrice),
        getObject(snapshot.selectedOffer),
        getObject(snapshot.flightSearchData),
        getObject(snapshot.searchData),
        snapshot,
    ];
    for (const candidate of candidates) {
        if (candidate && Object.keys(candidate).length) {
            return candidate;
        }
    }
    return {};
}

function extractItineraryRows(snapshotRaw: unknown, fallbackRoute: string, fallbackTravelDate: string): PdfItineraryRow[] {
    const selected = resolveSelectedPayload(snapshotRaw);
    const legs = getArrayByKeys(selected, ["AllLegsInfo", "allLegsInfo", "legs"]);
    const rows: PdfItineraryRow[] = [];

    legs.forEach((leg) => {
        const segments = getArrayByKeys(leg, ["Segments", "segments", "FlightSegment", "flightSegment"]);
        if (!segments.length) {
            const dep = toText(getValueByKeys(leg, ["DepFrom", "depFrom", "from", "From"])) || "N/A";
            const arr = toText(getValueByKeys(leg, ["ArrTo", "arrTo", "to", "To"])) || "N/A";
            rows.push({
                route: `${dep} - ${arr}`,
                airlineFlight: "N/A",
                departure: toDisplayDateTime(getValueByKeys(leg, ["DepTime", "depTime"]) || fallbackTravelDate),
                arrival: toDisplayDateTime(getValueByKeys(leg, ["ArrTime", "arrTime"])),
                terminal: "TBA",
                cabinClass: "Economy",
            });
            return;
        }

        segments.forEach((segment) => {
            const dep = toText(
                getValueByKeys(segment, ["DepFrom", "depFrom", "from", "From"]) ||
                    getValueByKeys(leg, ["DepFrom", "depFrom", "from", "From"])
            ) || "N/A";
            const arr = toText(
                getValueByKeys(segment, ["ArrTo", "arrTo", "to", "To"]) ||
                    getValueByKeys(leg, ["ArrTo", "arrTo", "to", "To"])
            ) || "N/A";
            const carrier = toText(
                getValueByKeys(segment, ["MarketingCarrier", "marketingCarrier", "carrier", "Carrier"])
            );
            const carrierName = toText(
                getValueByKeys(segment, [
                    "MarketingCarrierName",
                    "marketingCarrierName",
                    "operatingCarrierName",
                    "OperatingCarrierName",
                ])
            );
            const flightNo = toText(
                getValueByKeys(segment, ["MarketingFlightNumber", "marketingFlightNumber", "flightNumber", "FlightNumber"])
            );
            const segmentCode = getObject(
                getValueByKeys(segment, ["SegmentCode", "segmentCode"])
            );
            const cabinRaw =
                getValueByKeys(segmentCode, ["cabinCode", "CabinCode"]) ||
                getValueByKeys(segment, ["Cabin", "cabin", "classOfServiceName"]);

            rows.push({
                route: `${dep} - ${arr}`,
                airlineFlight: [carrierName || carrier || "N/A", carrier && flightNo ? `${carrier} ${flightNo}` : flightNo]
                    .filter(Boolean)
                    .join(" | "),
                departure: toDisplayDateTime(
                    getValueByKeys(segment, ["DepTime", "depTime", "departureDateTime"]) || fallbackTravelDate
                ),
                arrival: toDisplayDateTime(
                    getValueByKeys(segment, ["ArrTime", "arrTime", "arrivalDateTime"])
                ),
                terminal:
                    toText(
                        getValueByKeys(segment, [
                            "DepartureGate",
                            "departureGate",
                            "Terminal",
                            "terminal",
                        ])
                    ) || "TBA",
                cabinClass: resolveCabinLabel(cabinRaw),
            });
        });
    });

    if (rows.length) return rows;
    return [
        {
            route: toText(fallbackRoute) || "N/A",
            airlineFlight: "N/A",
            departure: toDisplayDateTime(fallbackTravelDate),
            arrival: "N/A",
            terminal: "TBA",
            cabinClass: "Economy",
        },
    ];
}

function extractFareRows(snapshotRaw: unknown, fallbackAmount: string): PdfFareRow[] {
    const selected = resolveSelectedPayload(snapshotRaw);
    const priceRows =
        getArrayByKeys(selected, ["PriceBreakDown", "priceBreakDown"]).length > 0
            ? getArrayByKeys(selected, ["PriceBreakDown", "priceBreakDown"])
            : getArrayByKeys(getObject(snapshotRaw), ["PriceBreakDown", "priceBreakDown"]);

    const currency =
        toText(
            getValueByKeys(selected, ["CurrencyCode", "currencyCode"]) ||
                getValueByKeys(priceRows[0] || {}, ["CurrencyCode", "currencyCode"])
        ) || toText(fallbackAmount).match(/\b[A-Z]{3}\b/)?.[0] || "";

    const rows: PdfFareRow[] = priceRows.map((row) => {
        const paxType = normalizePaxType(
            getValueByKeys(row, ["PaxType", "paxType", "type", "passengerTypeCode"])
        );
        const count = Math.max(
            1,
            Math.trunc(toNumber(getValueByKeys(row, ["PaxCount", "paxCount", "count"]) || 1))
        );
        const baseFare = toNumber(
            getValueByKeys(row, ["BaseFare", "baseFare", "Base", "base"])
        );
        const taxes = toNumber(getValueByKeys(row, ["Taxes", "taxes"]));
        const serviceFee = toNumber(
            getValueByKeys(row, ["ServiceFee", "serviceFee", "SerViceFee", "serViceFee"])
        );
        const explicitTotal = toNumber(
            getValueByKeys(row, ["TotalFare", "totalFare", "TotalPrice", "totalPrice"])
        );
        const taxesAndFees = taxes + serviceFee;
        const total = explicitTotal > 0 ? explicitTotal : (baseFare + taxesAndFees) * count;

        return {
            paxType,
            count: String(count),
            baseFare: formatAmount(baseFare, currency),
            taxesAndFees: formatAmount(taxesAndFees, currency),
            total: formatAmount(total, currency),
        };
    });

    if (rows.length) return rows;

    const fallbackCurrency = toText(fallbackAmount).match(/\b[A-Z]{3}\b/)?.[0] || "";
    const fallbackTotal = toNumber(toText(fallbackAmount).replace(/[^0-9.-]/g, ""));
    return [
        {
            paxType: "ADT",
            count: "1",
            baseFare: formatAmount(fallbackTotal, fallbackCurrency),
            taxesAndFees: formatAmount(0, fallbackCurrency),
            total: fallbackAmount || formatAmount(fallbackTotal, fallbackCurrency),
        },
    ];
}

function extractPassengerRows(
    snapshotRaw: unknown,
    bookingPassengers: EmailBookingPassenger[] | undefined,
    fallbackName: string,
    ticketInfo = ""
): PdfPassengerRow[] {
    const fromDb = Array.isArray(bookingPassengers) ? bookingPassengers : [];
    if (fromDb.length) {
        return fromDb.map((row) => {
            const name = [toText(row.prefix), toText(row.firstName), toText(row.lastName)]
                .filter(Boolean)
                .join(" ");
            return {
                name: name || fallbackName || "Traveler",
                paxType: normalizePaxType(row.paxType),
                gender: toText(row.gender) || "N/A",
                dob: toDisplayDate(row.birthDate),
                passportNo: toText(row.passportNumber) || "N/A",
                ticketNo: toText(ticketInfo) || "N/A",
            };
        });
    }

    const snapshot = getObject(snapshotRaw);
    const selected = resolveSelectedPayload(snapshotRaw);
    const snapshotPassengers =
        getArrayByKeys(snapshot, ["PassengerList", "passengers", "Passengers"]).length > 0
            ? getArrayByKeys(snapshot, ["PassengerList", "passengers", "Passengers"])
            : getArrayByKeys(getObject(snapshot.bookingBody), ["Passengers", "passengers"]).length > 0
                ? getArrayByKeys(getObject(snapshot.bookingBody), ["Passengers", "passengers"])
                : getArrayByKeys(selected, ["PassengerList", "passengers", "Passengers"]);

    const rows = snapshotPassengers.map((row) => {
        const name = [
            toText(getValueByKeys(row, ["Title", "title", "prefix", "Prefix"])),
            toText(getValueByKeys(row, ["FirstName", "firstName", "fName", "given"])),
            toText(getValueByKeys(row, ["LastName", "lastName", "lName", "surname"])),
        ]
            .filter(Boolean)
            .join(" ");
        return {
            name: name || fallbackName || "Traveler",
            paxType: normalizePaxType(
                getValueByKeys(row, ["PaxType", "paxType", "type", "passengerTypeCode"])
            ),
            gender: toText(getValueByKeys(row, ["Gender", "gender"])) || "N/A",
            dob: toDisplayDate(getValueByKeys(row, ["DateOfBirth", "dateOfBirth", "dob", "birthDate"])),
            passportNo: toText(
                getValueByKeys(row, ["PassportNumber", "passportNumber", "passNo"])
            ) || "N/A",
            ticketNo: toText(getValueByKeys(row, ["TicketNumber", "ticketNumber"])) || toText(ticketInfo) || "N/A",
        };
    });

    if (rows.length) return rows;
    return [
        {
            name: fallbackName || "Traveler",
            paxType: "ADT",
            gender: "N/A",
            dob: "N/A",
            passportNo: "N/A",
            ticketNo: toText(ticketInfo) || "N/A",
        },
    ];
}

function extractTravelMeta(snapshotRaw: unknown): {
    flightType: string;
    airlinesPnr: string;
} {
    const snapshot = getObject(snapshotRaw);
    const selected = resolveSelectedPayload(snapshotRaw);
    const flightType =
        toText(
            getValueByKeys(selected, ["TripType", "tripType", "journeyType"]) ||
            getValueByKeys(snapshot, ["TripType", "tripType", "journeyType"])
        ) || "OneWay";

    const airlinesPnr =
        toText(
            getValueByKeys(selected, [
                "AirlinesPNR",
                "airlinesPnr",
                "AirlinePNR",
                "airlinePnr",
                "PNR",
                "locator",
            ]) ||
            getValueByKeys(snapshot, [
                "AirlinesPNR",
                "airlinesPnr",
                "AirlinePNR",
                "airlinePnr",
                "PNR",
                "locator",
            ])
        ) || "N/A";

    return { flightType, airlinesPnr };
}

export async function sendBookingConfirmationEmail(params: {
    to: string;
    name: string;
    locator: string;
    reservationId: string;
    route: string;
    travelDate: string;
    amount: string;
    payloadSnapshot?: unknown;
    bookingPassengers?: EmailBookingPassenger[];
}): Promise<void> {
    const to = toText(params.to).toLowerCase();
    if (!to || !to.includes("@")) return;

    const template = buildBookingTemplate({
        name: params.name,
        locator: params.locator,
        reservationId: params.reservationId,
        route: params.route,
        travelDate: toDisplayDate(params.travelDate),
        amount: params.amount,
    });

    const itineraryRows = extractItineraryRows(
        params.payloadSnapshot,
        params.route,
        params.travelDate
    );
    const passengerRows = extractPassengerRows(
        params.payloadSnapshot,
        params.bookingPassengers,
        params.name
    );
    const fareRows = extractFareRows(params.payloadSnapshot, params.amount);
    const travelMeta = extractTravelMeta(params.payloadSnapshot);

    const pdf = await createBookingPdf({
        name: params.name,
        locator: params.locator,
        reservationId: params.reservationId,
        route: params.route,
        travelDate: toDisplayDate(params.travelDate),
        flightType: travelMeta.flightType,
        airlinesPnr: travelMeta.airlinesPnr,
        amount: params.amount,
        itineraryRows,
        passengerRows,
        fareRows,
    });

    await sendEmail({
        to,
        sender: "booking",
        subject: template.subject,
        html: template.html,
        text: template.text,
        attachments: [
            {
                filename: `booking-${toText(params.locator) || toText(params.reservationId) || "copy"}.pdf`,
                content: pdf,
            },
        ],
    });
}

export async function sendTicketIssuedEmail(params: {
    to: string;
    name: string;
    locator: string;
    reservationId: string;
    route: string;
    ticketInfo: string;
    amount?: string;
    travelDate?: string;
    payloadSnapshot?: unknown;
    bookingPassengers?: EmailBookingPassenger[];
}): Promise<void> {
    const to = toText(params.to).toLowerCase();
    if (!to || !to.includes("@")) return;

    const template = buildTicketTemplate({
        name: params.name,
        locator: params.locator,
        reservationId: params.reservationId,
        route: params.route,
        ticketInfo: params.ticketInfo,
    });

    const itineraryRows = extractItineraryRows(
        params.payloadSnapshot,
        params.route,
        params.travelDate || new Date().toISOString()
    );
    const passengerRows = extractPassengerRows(
        params.payloadSnapshot,
        params.bookingPassengers,
        params.name,
        params.ticketInfo
    );
    const fareRows = extractFareRows(params.payloadSnapshot, params.amount || "");
    const travelMeta = extractTravelMeta(params.payloadSnapshot);

    const pdf = await createTicketPdf({
        name: params.name,
        locator: params.locator,
        reservationId: params.reservationId,
        route: params.route,
        ticketInfo: params.ticketInfo,
        flightType: travelMeta.flightType,
        airlinesPnr: travelMeta.airlinesPnr,
        amount: params.amount,
        travelDate: params.travelDate,
        itineraryRows,
        passengerRows,
        fareRows,
    });

    await sendEmail({
        to,
        sender: "ticket",
        subject: template.subject,
        html: template.html,
        text: template.text,
        attachments: [
            {
                filename: `ticket-${toText(params.locator) || toText(params.reservationId) || "copy"}.pdf`,
                content: pdf,
            },
        ],
    });
}
