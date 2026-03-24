import type { NextApiRequest, NextApiResponse } from "next";
import { BookingStatus } from "@prisma/client";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { getSessionUser } from "@/server/auth-session";

type CalendarBooking = {
    id: number;
    bookingId: string;
    bookingStatus: "Booked" | "IssueInProcess" | "Ticketed" | "Cancelled";
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
    stats: {
        total: number;
        hold: number;
        past: number;
        upcoming: number;
    };
    calendarBookings: CalendarBooking[];
};

type ErrorResponse = {
    message: string;
};

function toText(value: unknown, fallback = ""): string {
    if (value === null || value === undefined) return fallback;
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return fallback;
}

function normalizeArray(value: unknown): Record<string, unknown>[] {
    if (!Array.isArray(value)) return [];
    return value.filter((item) => item && typeof item === "object") as Record<string, unknown>[];
}

function mapBookingStatusToTab(status: BookingStatus, locator: string | null): CalendarBooking["bookingStatus"] {
    if (status === BookingStatus.CANCELLED) return "Cancelled";
    if (status === BookingStatus.PREPARED || status === BookingStatus.FAILED) return "IssueInProcess";
    if (status === BookingStatus.COMMITTED || status === BookingStatus.TICKETED) {
        return locator ? "Ticketed" : "Booked";
    }
    return "IssueInProcess";
}

function extractFlightFields(payloadSnapshot: unknown): {
    depFrom: string;
    arrTo: string;
    depDate: string;
    arrDate: string;
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
    const lastSegment = (firstSegments[firstSegments.length - 1] || firstSegment) as Record<string, unknown>;

    const depDate = toText(firstSegment.DepTime || firstSegment.depTime || firstSegment.DepDate);
    const arrDate = toText(lastSegment.ArrTime || lastSegment.arrTime || lastSegment.ArrDate);
    const depFrom = toText(firstSegment.DepFrom || firstSegment.depFrom || firstLeg.DepFrom || "");
    const arrTo = toText(lastSegment.ArrTo || lastSegment.arrTo || firstLeg.ArrTo || "");

    return {
        depFrom: depFrom || "N/A",
        arrTo: arrTo || "N/A",
        depDate: depDate || "",
        arrDate: arrDate || depDate || "",
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

        const rows = await prisma.booking.findMany({
            where: { userId: sessionUser.id },
            orderBy: { travelDate: "asc" },
            select: {
                id: true,
                reservationId: true,
                locator: true,
                status: true,
                payloadSnapshot: true,
                travelDate: true,
                departureCode: true,
                arrivalCode: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const stats = {
            total: rows.length,
            hold: rows.filter((row) =>
                row.status === BookingStatus.PREPARED || row.status === BookingStatus.FAILED
            ).length,
            past: rows.filter((row) => row.travelDate < today).length,
            upcoming: rows.filter((row) => row.travelDate >= today).length,
        };

        const calendarBookings: CalendarBooking[] = rows.map((row) => {
            const details = extractFlightFields(row.payloadSnapshot);
            const depFrom = details.depFrom !== "N/A" ? details.depFrom : toText(row.departureCode, "N/A");
            const arrTo = details.arrTo !== "N/A" ? details.arrTo : toText(row.arrivalCode, "N/A");
            const depDate = details.depDate || row.travelDate.toISOString();
            const arrDate = details.arrDate || depDate;

            return {
                id: row.id,
                bookingId: row.reservationId || row.locator || String(row.id),
                bookingStatus: mapBookingStatusToTab(row.status, row.locator),
                laginfo: [
                    {
                        DepFrom: depFrom,
                        ArrTo: arrTo,
                        DepDate: depDate,
                        ArrDate: arrDate,
                    },
                ],
                createdAt: row.createdAt.toISOString(),
                updatedAt: row.updatedAt.toISOString(),
            };
        });

        return res.status(200).json({
            stats,
            calendarBookings,
        });
    } catch (error) {
        return res.status(500).json({
            message: error instanceof Error ? error.message : "Unable to load dashboard summary",
        });
    }
}
