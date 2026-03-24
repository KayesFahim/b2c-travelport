import type { NextApiRequest, NextApiResponse } from "next";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { canManageCms, deny, getActor } from "@/server/rbac";

type SearchLogRow = {
    timestamp?: string;
    mode?: string;
    userId?: number | null;
    status?: string;
    route?: string;
    cabinClass?: string;
    segments?: number;
    ipHash?: string;
    browserFingerprint?: string;
    visitorId?: string | null;
    count?: number;
    limit?: number;
    remaining?: number;
    bookingCount?: number;
    message?: string;
};

type BookingFailureRow = {
    timestamp?: string;
    stage?: string;
    status?: number;
    message?: string;
    details?: string;
    reservationId?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        const actor = await getActor(req);
        if (!canManageCms(actor)) {
            return deny(res, "Only admin roles can view search analytics");
        }

        assertDatabaseConfigured();

        const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));

        const [searchLogRows, bookingFailureRows, totalSearches, successfulSearches, failedSearches, blockedSearches, bookingAttempts, bookingFailed, bookingSuccess] = await Promise.all([
            prisma.searchLog.findMany({
                orderBy: { timestamp: "desc" },
                take: limit,
            }),
            prisma.bookingLog.findMany({
                where: { outcome: "FAILED" },
                orderBy: { timestamp: "desc" },
                take: limit,
            }),
            prisma.searchLog.count(),
            prisma.searchLog.count({ where: { status: "success" } }),
            prisma.searchLog.count({ where: { status: "failed" } }),
            prisma.searchLog.count({ where: { status: "blocked" } }),
            prisma.bookingLog.count(),
            prisma.bookingLog.count({ where: { outcome: "FAILED" } }),
            prisma.bookingLog.count({ where: { outcome: "SUCCESS" } }),
        ]);

        const latestSearchLogs: SearchLogRow[] = searchLogRows.map((row) => ({
            timestamp: row.timestamp.toISOString(),
            mode: row.mode,
            userId: row.userId,
            status: row.status,
            route: row.route,
            cabinClass: row.cabinClass,
            segments: row.segments,
            ipHash: row.ipHash,
            browserFingerprint: row.browserFingerprint,
            visitorId: row.visitorId,
            count: row.count,
            limit: row.limit,
            remaining: row.remaining,
            bookingCount: row.bookingCount,
            message: row.message,
        }));

        const latestBookingFailures: BookingFailureRow[] = bookingFailureRows.map((row) => ({
            timestamp: row.timestamp.toISOString(),
            stage: row.stage || undefined,
            status: row.status ?? undefined,
            message: row.message || undefined,
            details: row.details || undefined,
            reservationId: row.reservationId || undefined,
        }));

        return res.status(200).json({
            stats: {
                searches: {
                    total: totalSearches,
                    successful: successfulSearches,
                    failed: failedSearches,
                    blocked: blockedSearches,
                },
                bookings: {
                    attempts: bookingAttempts,
                    failed: bookingFailed,
                    successful: bookingSuccess,
                },
            },
            latestSearchLogs,
            latestBookingFailures,
        });
    } catch (error) {
        return res.status(500).json({
            message: error instanceof Error ? error.message : "Unable to load analytics",
        });
    }
}
