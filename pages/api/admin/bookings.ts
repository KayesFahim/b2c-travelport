import { withApiHandler } from "@/server/api-handler";
import { publicErrorMessage } from "@/server/public-error";
import type { NextApiRequest, NextApiResponse } from "next";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/server/prisma";
import { getActor } from "@/server/rbac";

type ErrorResponse = { message: string };

type BookingRow = {
    id: number;
    displayId: string;
    customer: string;
    email: string;
    route: string;
    airline: string;
    amount: string;
    currency: string;
    status: string;
    rawStatus: string;
    date: string;
    pnr: string;
    locator: string;
    passengerCount: number;
    tripType: string;
};

type SuccessResponse = {
    bookings: BookingRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

function mapStatus(status: BookingStatus): string {
    switch (status) {
        case BookingStatus.TICKETED:
            return "Ticketed";
        case BookingStatus.COMMITTED:
            return "Completed";
        case BookingStatus.BOOKED:
            return "Booked";
        case BookingStatus.PREPARED:
            return "Processing";
        case BookingStatus.CANCELLED:
            return "Cancelled";
        case BookingStatus.FAILED:
            return "Failed";
        default:
            return String(status);
    }
}

async function handler(
    req: NextApiRequest,
    res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
    if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        return res.status(405).json({ message: "Method not allowed" });
    }

    const actor = await getActor(req);
    if (!actor) {
        return res.status(401).json({ message: "Login required" });
    }

    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const pageSize = Math.max(1, Math.min(100, Number(req.query.pageSize) || 20));
        const search = String(req.query.search || "").trim();
        const statusFilter = String(req.query.status || "").trim().toUpperCase();

        const validStatuses = new Set(Object.keys(BookingStatus));
        const whereStatus =
            statusFilter && validStatuses.has(statusFilter)
                ? { status: statusFilter as BookingStatus }
                : {};

        const whereSearch = search
            ? {
                OR: [
                    { locator: { contains: search } },
                    { user: { name: { contains: search } } },
                    { user: { email: { contains: search } } },
                ],
            }
            : {};

        const where = { ...whereStatus, ...whereSearch };

        const [total, rows] = await Promise.all([
            prisma.booking.count({ where }),
            prisma.booking.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    user: { select: { name: true, email: true } },
                    _count: { select: { passengers: true } },
                },
            }),
        ]);

        const bookings: BookingRow[] = rows.map((b) => ({
            id: b.id,
            displayId: `#${b.id}`,
            customer: b.user?.name || b.user?.email || "Unknown",
            email: b.user?.email || "",
            route: `${b.departureCode || "-"} → ${b.arrivalCode || "-"}`,
            airline: b.airlineCode || "-",
            amount: b.totalFare != null ? String(Math.round(b.totalFare)) : "-",
            currency: b.currencyCode || "BDT",
            status: mapStatus(b.status),
            rawStatus: b.status,
            date: b.createdAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
            pnr: b.locator || "-",
            locator: b.locator || "",
            passengerCount: b._count.passengers,
            tripType: b.tripType || "-",
        }));

        return res.status(200).json({
            bookings,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        });
    } catch (error) {
        return res.status(500).json({
            message: publicErrorMessage(error, "Unable to load bookings"),
        });
    }
}

export default withApiHandler(handler, { methods: ["GET"] });

export const config = { api: { bodyParser: false } };
