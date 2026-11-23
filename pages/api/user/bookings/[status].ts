import { withApiHandler } from "@/server/api-handler";
import { publicErrorMessage } from "@/server/public-error";
import type { NextApiRequest, NextApiResponse } from "next";
import { Booking, BookingPassenger, BookingStatus } from "@prisma/client";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { getSessionUser } from "@/server/auth-session";

type BookingStatusTab = "Booked" | "IssueInProcess" | "Ticketed" | "Cancelled";

type BookingRow = {
    id: number;
    bookingId: string;
    bookingStatus: BookingStatusTab;
    reservationId: string | null;
    locator: string | null;
    TripType: string;
    paxCount: number;
    CurrierCode: string;
    Curriername: string;
    flightNumber: string;
    laginfo: Array<{
        DepFrom: string;
        ArrTo: string;
        DepDate: string;
        ArrDate: string;
    }>;
    createdAt: string;
    updatedAt: string;
};

type SuccessResponse = {
    bookings: BookingRow[];
    total: number;
    page: number;
    limit: number;
};

type ErrorResponse = {
    message: string;
};

function toText(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return "";
}

function normalizeArray(value: unknown): Record<string, unknown>[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && typeof item === "object") as Record<string, unknown>[];
}

function resolveFlightPayload(payloadSnapshot: unknown): Record<string, unknown> {
    const payload = (payloadSnapshot && typeof payloadSnapshot === "object"
        ? payloadSnapshot
        : {}) as Record<string, unknown>;
    const selectedAirPrice = payload.selectedAirPrice || payload.selectedOffer || payload.flightSearchData || payload.searchData;
    return selectedAirPrice && typeof selectedAirPrice === "object"
        ? (selectedAirPrice as Record<string, unknown>)
        : payload;
}

function mapBookingStatusToTab(booking: Pick<Booking, "status" | "locator">): BookingStatusTab {
    if (booking.status === BookingStatus.CANCELLED) return "Cancelled";
    if (booking.status === BookingStatus.PREPARED || booking.status === BookingStatus.FAILED) {
        return "IssueInProcess";
    }
    if (booking.status === BookingStatus.COMMITTED || booking.status === BookingStatus.TICKETED) {
        return booking.locator ? "Ticketed" : "Booked";
    }
    return "IssueInProcess";
}

function mapTabToStatuses(tab: string): BookingStatus[] {
    if (tab === "Cancelled") return [BookingStatus.CANCELLED];
    if (tab === "IssueInProcess") return [BookingStatus.PREPARED, BookingStatus.FAILED];
    if (tab === "Ticketed" || tab === "Booked") return [BookingStatus.COMMITTED, BookingStatus.TICKETED];
    return [BookingStatus.PREPARED, BookingStatus.COMMITTED, BookingStatus.FAILED, BookingStatus.CANCELLED, BookingStatus.TICKETED];
}

function extractFlightFields(payloadSnapshot: unknown): {
    depFrom: string;
    arrTo: string;
    depDate: string;
    arrDate: string;
    carrierCode: string;
    flightNumber: string;
    tripType: string;
} {
    const payload = resolveFlightPayload(payloadSnapshot);
    const legs = normalizeArray(
        payload.AllLegsInfo || payload.allLegsInfo || payload.legs || payload.Legs
    );
    const firstLeg = (legs[0] || {}) as Record<string, unknown>;
    const firstSegments = normalizeArray(
        firstLeg.Segments || firstLeg.segments || firstLeg.Segment || firstLeg.segment
    );
    const firstSegment = (firstSegments[0] || {}) as Record<string, unknown>;
    const lastSegment = (firstSegments[firstSegments.length - 1] || firstSegment) as Record<
        string,
        unknown
    >;

    const depDate = toText(firstSegment.DepTime || firstSegment.depTime || firstSegment.DepDate);
    const arrDate = toText(lastSegment.ArrTime || lastSegment.arrTime || lastSegment.ArrDate);
    const depFrom = toText(firstSegment.DepFrom || firstSegment.depFrom || firstLeg.DepFrom || "");
    const arrTo = toText(lastSegment.ArrTo || lastSegment.arrTo || firstLeg.ArrTo || "");
    const carrierCode = toText(
        firstSegment.MarketingCarrier || firstSegment.marketingCarrier || firstSegment.Carrier || ""
    );
    const flightNumber = toText(
        firstSegment.MarketingFlightNumber || firstSegment.flightNumber || firstSegment.FlightNumber || ""
    );

    let tripType = "OneWay";
    if (legs.length > 1) tripType = "RoundWay";

    return {
        depFrom: depFrom || "N/A",
        arrTo: arrTo || "N/A",
        depDate: depDate || "",
        arrDate: arrDate || depDate || "",
        carrierCode: carrierCode || "N/A",
        flightNumber: flightNumber || "N/A",
        tripType,
    };
}

function toBookingRow(
    booking: Booking & { passengers: BookingPassenger[] }
): BookingRow {
    const tabStatus = mapBookingStatusToTab(booking);
    const details = extractFlightFields(booking.payloadSnapshot);
    return {
        id: booking.id,
        bookingId: booking.reservationId || booking.locator || String(booking.id),
        bookingStatus: tabStatus,
        reservationId: booking.reservationId,
        locator: booking.locator,
        TripType: details.tripType,
        paxCount: booking.passengers.length,
        CurrierCode: details.carrierCode,
        Curriername: details.carrierCode,
        flightNumber: details.flightNumber,
        laginfo: [
            {
                DepFrom: details.depFrom,
                ArrTo: details.arrTo,
                DepDate: details.depDate,
                ArrDate: details.arrDate,
            },
        ],
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
    };
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

        const statusTab = toText(req.query?.status).trim() || "Booked";
        const page = Math.max(1, Number(req.query?.page || 1));
        const limit = Math.max(1, Math.min(100, Number(req.query?.limit || 10)));
        const statuses = mapTabToStatuses(statusTab);
        const baseWhere: Record<string, unknown> = {
            userId: sessionUser.id,
            status: {
                in: statuses,
            },
        };

        if (statusTab === "Ticketed") {
            baseWhere.locator = { not: null };
        }
        if (statusTab === "Booked") {
            baseWhere.locator = null;
        }

        const [rows, total] = await Promise.all([
            prisma.booking.findMany({
                where: baseWhere,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                include: { passengers: true },
            }),
            prisma.booking.count({ where: baseWhere }),
        ]);

        const bookings = rows.map(toBookingRow);

        return res.status(200).json({
            bookings,
            total,
            page,
            limit,
        });
    } catch (error) {
        return res.status(500).json({
            message: publicErrorMessage(error, "Unable to load bookings"),
        });
    }
}

export default withApiHandler(handler, { methods: ["GET"] });

export const config = { api: { bodyParser: false } };
