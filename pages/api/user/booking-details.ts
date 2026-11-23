import { withApiHandler } from "@/server/api-handler";
import { publicErrorMessage } from "@/server/public-error";
import type { NextApiRequest, NextApiResponse } from "next";
import { BookingStatus } from "@prisma/client";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { getSessionUser } from "@/server/auth-session";

type ErrorResponse = { message: string };

type SuccessResponse = {
    booking: Record<string, unknown>;
    passengers: Array<Record<string, unknown>>;
    contact: {
        email: string;
        phone: string;
        address: string;
    };
    specialServices: string[];
    brand: {
        code: string;
        name: string;
        features: string[];
        amenities: string[];
    };
    policies: {
        change: string[];
        cancellation: string[];
    };
    source: {
        bookingDbId: number;
        reservationId: string;
        locator: string;
        status: string;
    };
};

function toText(value: unknown, fallback = ""): string {
    const text = String(value ?? "").trim();
    return text || fallback;
}

function normalizeArray(value: unknown): Array<Record<string, unknown>> {
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && typeof item === "object") as Array<Record<string, unknown>>;
}

function getObject(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== "object") return {};
    return value as Record<string, unknown>;
}

function getSelectedAirPricePayload(snapshot: Record<string, unknown>): Record<string, unknown> {
    return getObject(snapshot.selectedAirPrice || snapshot.selectedOffer || snapshot.flightSearchData || snapshot.searchData);
}

function getNested(source: unknown, path: string): unknown {
    const keys = path.split(".");
    let current: unknown = source;
    for (const key of keys) {
        if (!current || typeof current !== "object") return undefined;
        current = (current as Record<string, unknown>)[key];
    }
    return current;
}

function parseDate(value: unknown): string {
    const raw = toText(value);
    if (!raw) return "";
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function mapBookingStatus(status: BookingStatus, locator: string | null): string {
    if (status === BookingStatus.CANCELLED) return "Cancelled";
    if (status === BookingStatus.PREPARED || status === BookingStatus.FAILED) return "IssueInProcess";
    if (status === BookingStatus.COMMITTED || status === BookingStatus.TICKETED) {
        return locator ? "Ticketed" : "Booked";
    }
    return "IssueInProcess";
}

function extractPriceRows(snapshot: Record<string, unknown>): Array<Record<string, unknown>> {
    const selectedAirPrice = getSelectedAirPricePayload(snapshot);
    const rows = normalizeArray(
        snapshot.PriceBreakDown ||
        snapshot.priceBreakDown ||
        selectedAirPrice.PriceBreakDown ||
        selectedAirPrice.priceBreakDown
    );
    return rows;
}

function extractPassengerRows(snapshot: Record<string, unknown>): Array<Record<string, unknown>> {
    const direct = normalizeArray(snapshot.PassengerList || snapshot.passengers || snapshot.Passengers);
    if (direct.length) return direct;

    const bookingBodyPassengers = normalizeArray(getNested(snapshot, "bookingBody.Passengers"));
    if (bookingBodyPassengers.length) return bookingBodyPassengers;

    const reservationTravelers = normalizeArray(
        getNested(snapshot, "ReservationResponse.Reservation.Traveler") ||
        getNested(snapshot, "Reservation.Traveler")
    );
    return reservationTravelers;
}

function extractContact(snapshot: Record<string, unknown>): { email: string; phone: string; address: string } {
    const email = toText(
        snapshot.contactEmail ||
        snapshot.Email ||
        snapshot.email ||
        getNested(snapshot, "bookingBody.Email") ||
        getNested(snapshot, "bookingBody.Contact.Email") ||
        getNested(snapshot, "Contact.Email")
    );

    const phone = toText(
        snapshot.contactPhone ||
        snapshot.phone ||
        snapshot.Phone ||
        getNested(snapshot, "bookingBody.Phone") ||
        getNested(snapshot, "bookingBody.Contact.Phone") ||
        getNested(snapshot, "Contact.Phone")
    );

    const address = toText(
        snapshot.address ||
        snapshot.Address ||
        getNested(snapshot, "bookingBody.Address") ||
        getNested(snapshot, "bookingBody.Contact.Address")
    );

    return { email, phone, address };
}

function extractSpecialServices(snapshot: Record<string, unknown>, passengers: Array<Record<string, unknown>>): string[] {
    const bag: string[] = [];
    const push = (value: unknown) => {
        const text = toText(value);
        if (text) bag.push(text);
    };

    const globalRows = normalizeArray(
        snapshot.SpecialServiceRequest ||
        snapshot.specialServiceRequest ||
        snapshot.SpecialServices ||
        snapshot.specialServices ||
        getNested(snapshot, "bookingBody.SpecialServices")
    );
    globalRows.forEach((row) => {
        push((row as Record<string, unknown>).Code);
        push((row as Record<string, unknown>).code);
        push((row as Record<string, unknown>).Description);
        push((row as Record<string, unknown>).description);
    });

    passengers.forEach((p) => {
        const perPassenger = normalizeArray(
            p.SpecialServiceRequest || p.specialServiceRequest || p.specialServices || p.SpecialServices
        );
        perPassenger.forEach((row) => {
            push(row.Code);
            push(row.code);
            push(row.Description);
            push(row.description);
        });
    });

    return Array.from(new Set(bag));
}

function extractBrand(snapshot: Record<string, unknown>): { code: string; name: string; features: string[]; amenities: string[] } {
    const offer = getObject(snapshot.selectedAirPrice || snapshot.selectedOffer || snapshot);

    const brandCode = toText(
        offer.BrandCode || offer.brandCode || getNested(offer, "Brand.Code") || getNested(offer, "brand.code")
    );
    const brandName = toText(
        offer.BrandName || offer.brandName || getNested(offer, "Brand.Name") || getNested(offer, "brand.name")
    );

    const featuresRows = normalizeArray(
        offer.BrandFeatures || offer.brandFeatures || getNested(offer, "Brand.Features") || getNested(offer, "brand.features")
    );
    const amenitiesRows = normalizeArray(
        offer.Amenities || offer.amenities || getNested(offer, "Brand.Amenities") || getNested(offer, "brand.amenities")
    );

    const features = Array.from(
        new Set(
            featuresRows
                .map((f) => toText(f.Name || f.name || f.Description || f.description || f.Value || f.value))
                .filter(Boolean)
        )
    );

    const amenities = Array.from(
        new Set(
            amenitiesRows
                .map((a) => toText(a.Name || a.name || a.Description || a.description || a.Value || a.value))
                .filter(Boolean)
        )
    );

    return {
        code: brandCode,
        name: brandName,
        features,
        amenities,
    };
}

function collectPolicyLikeTexts(source: unknown): string[] {
    const bag: string[] = [];

    const visit = (node: unknown, depth = 0) => {
        if (!node || depth > 6) return;

        if (Array.isArray(node)) {
            node.forEach((item) => visit(item, depth + 1));
            return;
        }

        if (typeof node !== "object") return;

        const entries = Object.entries(node as Record<string, unknown>);
        entries.forEach(([key, value]) => {
            const normalizedKey = String(key || "").toLowerCase();
            if (
                normalizedKey.includes("policy") ||
                normalizedKey.includes("penalt") ||
                normalizedKey.includes("cancel") ||
                normalizedKey.includes("refund") ||
                normalizedKey.includes("change") ||
                normalizedKey.includes("reissue")
            ) {
                const text = toText(value);
                if (text) bag.push(text);
            }
            if (value && typeof value === "object") {
                visit(value, depth + 1);
            }
        });
    };

    visit(source, 0);
    return Array.from(new Set(bag.filter(Boolean)));
}

function extractPolicies(snapshot: Record<string, unknown>): { change: string[]; cancellation: string[] } {
    const policies = collectPolicyLikeTexts(snapshot);

    const change = policies.filter((line) => {
        const text = line.toLowerCase();
        return text.includes("change") || text.includes("reissue") || text.includes("exchange");
    });

    const cancellation = policies.filter((line) => {
        const text = line.toLowerCase();
        return text.includes("cancel") || text.includes("refund") || text.includes("void");
    });

    return {
        change: Array.from(new Set(change)),
        cancellation: Array.from(new Set(cancellation)),
    };
}

function buildDisplayBooking(
    dbRow: {
        id: number;
        reservationId: string | null;
        locator: string | null;
        status: BookingStatus;
        payloadSnapshot: unknown;
        rawPreview: unknown;
        rawCommit: unknown;
        totalFare: number | null;
        currencyCode: string | null;
        createdAt: Date;
        updatedAt: Date;
    },
    passengerRows: Array<Record<string, unknown>>
): Record<string, unknown> {
    const snapshot = getObject(dbRow.payloadSnapshot);
    const preview = getObject(dbRow.rawPreview);
    const commit = getObject(dbRow.rawCommit);
    const selectedAirPrice = getSelectedAirPricePayload(snapshot);
    const merged = {
        ...selectedAirPrice,
        ...preview,
        ...commit,
        ...snapshot,
    } as Record<string, unknown>;

    const pnr = toText(dbRow.locator || getNested(merged, "PNR") || getNested(merged, "locator"));

    const priceBreakDown = extractPriceRows(merged);
    const grossFare = Number(toText(merged.GrossFare || merged.grossFare || dbRow.totalFare || 0));
    const netFare = Number(toText(merged.NetFare || merged.netFare || dbRow.totalFare || grossFare || 0));

    return {
        ...merged,
        BookingId: dbRow.reservationId || dbRow.locator || String(dbRow.id),
        bookingId: dbRow.reservationId || dbRow.locator || String(dbRow.id),
        BookingStatus: mapBookingStatus(dbRow.status, dbRow.locator),
        bookingStatus: mapBookingStatus(dbRow.status, dbRow.locator),
        PNR: pnr || "N/A",
        locator: dbRow.locator,
        reservationId: dbRow.reservationId,
        PassengerList: passengerRows,
        PriceBreakDown: priceBreakDown,
        GrossFare: Number.isFinite(grossFare) ? grossFare : 0,
        NetFare: Number.isFinite(netFare) ? netFare : 0,
        CurrencyCode: toText(merged.CurrencyCode || merged.currencyCode || dbRow.currencyCode, "BDT"),
        bookingDate: dbRow.createdAt.toISOString(),
        createdAt: dbRow.createdAt.toISOString(),
        updatedAt: dbRow.updatedAt.toISOString(),
    };
}

function mapPassengerDetails(
    apiPassengers: Array<Record<string, unknown>>,
    dbPassengers: Array<{
        paxType: string;
        prefix: string | null;
        firstName: string | null;
        lastName: string | null;
        birthDate: Date | null;
        passportNumber: string | null;
        passportIssuingCountry: string | null;
        passportExpiryDate: Date | null;
        nationality: string | null;
        gender: string | null;
        phone: string | null;
        email: string | null;
    }>
): Array<Record<string, unknown>> {
    return dbPassengers.map((dbPassenger, idx) => {
        const api = apiPassengers[idx] || {};
        const specialServices = normalizeArray(
            api.SpecialServiceRequest || api.specialServiceRequest || api.specialServices || api.SpecialServices
        )
            .map((entry) =>
                toText(
                    entry.Code || entry.code || entry.Description || entry.description || entry.Name || entry.name
                )
            )
            .filter(Boolean);

        return {
            title: toText(api.Title || api.title || dbPassenger.prefix),
            firstName: toText(api.FirstName || api.firstName || dbPassenger.firstName),
            lastName: toText(api.LastName || api.lastName || dbPassenger.lastName),
            paxType: toText(api.PaxType || api.paxType || dbPassenger.paxType),
            gender: toText(api.Gender || api.gender || dbPassenger.gender),
            dateOfBirth: parseDate(api.DateOfBirth || api.dateOfBirth || dbPassenger.birthDate),
            passportNumber: toText(api.PassportNumber || api.passportNumber || dbPassenger.passportNumber),
            passportIssuingCountry: toText(
                api.PassportIssuingCountry || api.passportIssuingCountry || dbPassenger.passportIssuingCountry
            ),
            passportExpiryDate: parseDate(
                api.PassportExpiryDate || api.passportExpiryDate || dbPassenger.passportExpiryDate
            ),
            nationality: toText(api.PassportNationality || api.nationality || dbPassenger.nationality),
            phone: toText(api.Phone || api.phone || dbPassenger.phone),
            email: toText(api.Email || api.email || dbPassenger.email),
            specialServices,
        };
    });
}

async function handler(
    req: NextApiRequest,
    res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        assertDatabaseConfigured();

        const sessionUser = await getSessionUser(req);
        if (!sessionUser?.id) {
            return res.status(401).json({ message: "Login required" });
        }

        const queryId = toText(req.query?.id);
        if (!queryId) {
            return res.status(400).json({ message: "Booking id is required" });
        }

        const numericId = Number(queryId);
        const row = await prisma.booking.findFirst({
            where: {
                userId: sessionUser.id,
                OR: [
                    ...(Number.isFinite(numericId) ? [{ id: numericId }] : []),
                    { reservationId: queryId },
                    { locator: queryId },
                    { bookingFlowKey: queryId },
                ],
            },
            include: {
                passengers: true,
            },
        });

        if (!row) {
            return res.status(404).json({ message: "Booking details not found" });
        }

        const snapshot = getObject(row.payloadSnapshot);
        const passengerRows = extractPassengerRows(snapshot);
        const displayBooking = buildDisplayBooking(row, passengerRows);
        const passengers = mapPassengerDetails(passengerRows, row.passengers);
        const contact = extractContact(snapshot);
        const specialServices = extractSpecialServices(snapshot, passengerRows);
        const brand = extractBrand(snapshot);
        const policies = extractPolicies(snapshot);

        return res.status(200).json({
            booking: displayBooking,
            passengers,
            contact,
            specialServices,
            brand,
            policies,
            source: {
                bookingDbId: row.id,
                reservationId: toText(row.reservationId),
                locator: toText(row.locator),
                status: row.status,
            },
        });
    } catch (error) {
        return res.status(500).json({
            message: publicErrorMessage(error, "Unable to load booking details"),
        });
    }
}

export default withApiHandler(handler, { methods: ["GET"] });

export const config = { api: { bodyParser: false } };
