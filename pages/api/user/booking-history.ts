import type { NextApiRequest, NextApiResponse } from "next";
import { Booking, BookingPassenger, BookingStatus } from "@prisma/client";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { getSessionUser } from "@/server/auth-session";

type BookingHistoryRow = {
    id: number;
    bookingId: string;
    bookingStatus: "Booked" | "IssueInProcess" | "Ticketed" | "Cancelled";
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
    totalFare: number | null;
    TotalFare: number | null;
    currencyCode: string | null;
    CurrencyCode: string | null;
    createdAt: string;
    updatedAt: string;
};

type SuccessResponse = {
    bookings: BookingHistoryRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
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

function mapBookingStatusToTab(booking: Pick<Booking, "status" | "locator">): BookingHistoryRow["bookingStatus"] {
    if (booking.status === BookingStatus.CANCELLED) return "Cancelled";
    if (booking.status === BookingStatus.PREPARED || booking.status === BookingStatus.FAILED) {
        return "IssueInProcess";
    }
    if (booking.status === BookingStatus.COMMITTED || booking.status === BookingStatus.TICKETED) {
        return booking.locator ? "Ticketed" : "Booked";
    }
    return "IssueInProcess";
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
    const payload = (payloadSnapshot && typeof payloadSnapshot === "object"
        ? payloadSnapshot
        : {}) as Record<string, unknown>;
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
): BookingHistoryRow {
    const details = extractFlightFields(booking.payloadSnapshot);
    return {
        id: booking.id,
        bookingId: booking.reservationId || booking.locator || String(booking.id),
        bookingStatus: mapBookingStatusToTab(booking),
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
        totalFare: booking.totalFare,
        TotalFare: booking.totalFare,
        currencyCode: booking.currencyCode,
        CurrencyCode: booking.currencyCode,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
    };
}

export default async function handler(
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

        const page = Math.max(1, Number(req.query?.page || 1));
        const limit = Math.max(1, Math.min(100, Number(req.query?.limit || 100)));

        const [rows, total] = await Promise.all([
            prisma.booking.findMany({
                where: { userId: sessionUser.id },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
                include: { passengers: true },
            }),
            prisma.booking.count({ where: { userId: sessionUser.id } }),
        ]);

        const bookings = rows.map(toBookingRow);
        const totalPages = Math.max(1, Math.ceil(total / limit));

        return res.status(200).json({
            bookings,
            total,
            page,
            limit,
            totalPages,
        });
    } catch (error) {
        return res.status(500).json({
            message: error instanceof Error ? error.message : "Unable to load booking history",
        });
    }
}
