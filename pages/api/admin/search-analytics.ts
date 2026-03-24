import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import { readFile } from "fs/promises";
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

async function readTextFile(filePath: string): Promise<string> {
    try {
        return await readFile(filePath, "utf8");
    } catch {
        return "";
    }
}

function parseJsonLines<T>(raw: string): T[] {
    return String(raw || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
            try {
                return JSON.parse(line) as T;
            } catch {
                return null;
            }
        })
        .filter((row): row is T => Boolean(row));
}

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

        const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));

        const searchLogPath = path.join(process.cwd(), "search_logs.txt");
        const bookingFailurePath = path.join(process.cwd(), "atpn_failed.txt");
        const bookingSharedPath = path.join(process.cwd(), "atpn.txt");

        const [searchRaw, bookingFailureRaw, bookingSharedRaw] = await Promise.all([
            readTextFile(searchLogPath),
            readTextFile(bookingFailurePath),
            readTextFile(bookingSharedPath),
        ]);

        const searchRows = parseJsonLines<SearchLogRow>(searchRaw);
        const bookingFailureRows = parseJsonLines<BookingFailureRow>(bookingFailureRaw);

        const bookingSharedLines = String(bookingSharedRaw || "")
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter(Boolean);

        const totalSearches = searchRows.length;
        const successfulSearches = searchRows.filter((row) => row.status === "success").length;
        const failedSearches = searchRows.filter((row) => row.status === "failed").length;
        const blockedSearches = searchRows.filter((row) => row.status === "blocked").length;

        const bookingAttempts = bookingSharedLines.length;
        const bookingFailed = bookingFailureRows.length;
        const bookingSuccess = Math.max(bookingAttempts - bookingFailed, 0);

        const latestSearchLogs = [...searchRows]
            .sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")))
            .slice(0, limit);

        const latestBookingFailures = [...bookingFailureRows]
            .sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")))
            .slice(0, limit);

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
