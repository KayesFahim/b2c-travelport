import type { NextApiRequest, NextApiResponse } from "next";
import { BookingStatus } from "@prisma/client";
import { prisma } from "@/server/prisma";
import { getActor } from "@/server/rbac";

type ErrorResponse = { message: string };

type MonthStat = {
    month: string;
    bookings: number;
    revenue: number;
    customers: number;
};

type RecentBooking = {
    id: string;
    customer: string;
    route: string;
    amount: string;
    currency: string;
    status: string;
    date: string;
    pnr: string;
};

type SuccessResponse = {
    totalBookings: number;
    ticketedBookings: number;
    pendingBookings: number;
    cancelledBookings: number;
    totalCustomers: number;
    totalRevenue: number;
    currency: string;
    monthlyStats: MonthStat[];
    recentBookings: RecentBooking[];
};

function mapStatus(status: BookingStatus): string {
    switch (status) {
        case BookingStatus.TICKETED:
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

export default async function handler(
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
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

        const [
            totalBookings,
            ticketedBookings,
            pendingBookings,
            cancelledBookings,
            totalCustomers,
            revenueAgg,
            recentBookingsRaw,
            monthlyBookingsRaw,
        ] = await Promise.all([
            prisma.booking.count(),
            prisma.booking.count({
                where: { status: { in: [BookingStatus.TICKETED, BookingStatus.COMMITTED] } },
            }),
            prisma.booking.count({
                where: { status: { in: [BookingStatus.BOOKED, BookingStatus.PREPARED] } },
            }),
            prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),
            prisma.user.count(),
            prisma.booking.aggregate({
                _sum: { totalFare: true },
                where: { status: { in: [BookingStatus.TICKETED, BookingStatus.COMMITTED] } },
            }),
            prisma.booking.findMany({
                take: 10,
                orderBy: { createdAt: "desc" },
                include: {
                    user: { select: { name: true, email: true } },
                },
            }),
            prisma.booking.findMany({
                where: { createdAt: { gte: sixMonthsAgo } },
                select: {
                    createdAt: true,
                    totalFare: true,
                    status: true,
                },
            }),
        ]);

        // Build monthly stats
        const monthMap = new Map<string, MonthStat>();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            monthMap.set(key, {
                month: d.toLocaleString("en-US", { month: "short" }),
                bookings: 0,
                revenue: 0,
                customers: 0,
            });
        }

        for (const b of monthlyBookingsRaw) {
            const d = new Date(b.createdAt);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
            const stat = monthMap.get(key);
            if (!stat) continue;
            stat.bookings += 1;
            if (
                b.status === BookingStatus.TICKETED ||
                b.status === BookingStatus.COMMITTED
            ) {
                stat.revenue += Number(b.totalFare ?? 0);
            }
        }

        const monthlyStats = Array.from(monthMap.values());

        // Build recent bookings
        const recentBookings: RecentBooking[] = recentBookingsRaw.map((b) => {
            const dep = b.departureCode || "-";
            const arr = b.arrivalCode || "-";
            return {
                id: `#${b.id}`,
                customer: b.user?.name || b.user?.email || "Unknown",
                route: `${dep} → ${arr}`,
                amount: b.totalFare != null ? String(Math.round(b.totalFare)) : "-",
                currency: b.currencyCode || "BDT",
                status: mapStatus(b.status),
                date: b.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                pnr: b.locator || "-",
            };
        });

        const dominantCurrency =
            recentBookingsRaw.find((b) => b.currencyCode)?.currencyCode || "BDT";

        return res.status(200).json({
            totalBookings,
            ticketedBookings,
            pendingBookings,
            cancelledBookings,
            totalCustomers,
            totalRevenue: Math.round(revenueAgg._sum.totalFare ?? 0),
            currency: dominantCurrency,
            monthlyStats,
            recentBookings,
        });
    } catch (error) {
        return res.status(500).json({
            message: error instanceof Error ? error.message : "Unable to load dashboard stats",
        });
    }
}
