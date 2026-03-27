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

type StatusBreakdown = {
    booked: number;
    processing: number;
    ticketed: number;
    completed: number;
    cancelled: number;
    failed: number;
};

type TopRoute = {
    route: string;
    bookings: number;
    passengers: number;
    revenue: number;
    currency: string;
};

type TopAirline = {
    airline: string;
    bookings: number;
    passengers: number;
    revenue: number;
    currency: string;
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
    statusBreakdown: StatusBreakdown;
    topRoutes: TopRoute[];
    topAirlines: TopAirline[];
    today: {
        bookings: number;
        revenue: number;
    };
    growth: {
        bookingsPct: number;
        revenuePct: number;
        customersPct: number;
    };
};

const REVENUE_STATUSES: BookingStatus[] = [BookingStatus.TICKETED, BookingStatus.COMMITTED];

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

function roundMoney(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.round(parsed) : 0;
}

function growthPercent(current: number, previous: number): number {
    if (!previous && !current) return 0;
    if (!previous) return 100;
    return Number((((current - previous) / previous) * 100).toFixed(1));
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
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

        const currentPeriodStart = new Date(now);
        currentPeriodStart.setHours(0, 0, 0, 0);
        currentPeriodStart.setDate(currentPeriodStart.getDate() - 29);

        const previousPeriodStart = new Date(currentPeriodStart);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);

        const [
            totalBookings,
            ticketedBookings,
            pendingBookings,
            cancelledBookings,
            totalCustomers,
            revenueAgg,
            recentBookingsRaw,
            monthlyBookingsRaw,
            statusGroups,
            routeGroups,
            airlineGroups,
            passengerCountRows,
            todayBookings,
            todayRevenueAgg,
            currentPeriodBookings,
            previousPeriodBookings,
            currentPeriodRevenueAgg,
            previousPeriodRevenueAgg,
            currentPeriodCustomers,
            previousPeriodCustomers,
        ] = await Promise.all([
            prisma.booking.count(),
            prisma.booking.count({
                where: { status: { in: REVENUE_STATUSES } },
            }),
            prisma.booking.count({
                where: { status: { in: [BookingStatus.BOOKED, BookingStatus.PREPARED] } },
            }),
            prisma.booking.count({ where: { status: BookingStatus.CANCELLED } }),
            prisma.user.count(),
            prisma.booking.aggregate({
                _sum: { totalFare: true },
                where: { status: { in: REVENUE_STATUSES } },
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
            prisma.booking.groupBy({
                by: ["status"],
                _count: { _all: true },
            }),
            prisma.booking.groupBy({
                by: ["departureCode", "arrivalCode"],
                where: { createdAt: { gte: sixMonthsAgo } },
                _count: { _all: true },
                _sum: { totalFare: true },
            }),
            prisma.booking.groupBy({
                by: ["airlineCode"],
                where: { createdAt: { gte: sixMonthsAgo } },
                _count: { _all: true },
                _sum: { totalFare: true },
            }),
            prisma.booking.findMany({
                where: { createdAt: { gte: sixMonthsAgo } },
                select: {
                    departureCode: true,
                    arrivalCode: true,
                    airlineCode: true,
                    _count: { select: { passengers: true } },
                },
            }),
            prisma.booking.count({
                where: { createdAt: { gte: todayStart, lt: tomorrowStart } },
            }),
            prisma.booking.aggregate({
                _sum: { totalFare: true },
                where: {
                    createdAt: { gte: todayStart, lt: tomorrowStart },
                    status: { in: REVENUE_STATUSES },
                },
            }),
            prisma.booking.count({
                where: { createdAt: { gte: currentPeriodStart } },
            }),
            prisma.booking.count({
                where: { createdAt: { gte: previousPeriodStart, lt: currentPeriodStart } },
            }),
            prisma.booking.aggregate({
                _sum: { totalFare: true },
                where: {
                    createdAt: { gte: currentPeriodStart },
                    status: { in: REVENUE_STATUSES },
                },
            }),
            prisma.booking.aggregate({
                _sum: { totalFare: true },
                where: {
                    createdAt: { gte: previousPeriodStart, lt: currentPeriodStart },
                    status: { in: REVENUE_STATUSES },
                },
            }),
            prisma.user.count({
                where: { createdAt: { gte: currentPeriodStart } },
            }),
            prisma.user.count({
                where: { createdAt: { gte: previousPeriodStart, lt: currentPeriodStart } },
            }),
        ]);

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
            if (REVENUE_STATUSES.includes(b.status)) {
                stat.revenue += Number(b.totalFare ?? 0);
            }
        }

        const monthlyStats = Array.from(monthMap.values()).map((item) => ({
            ...item,
            revenue: roundMoney(item.revenue),
        }));

        const recentBookings: RecentBooking[] = recentBookingsRaw.map((b) => {
            const dep = b.departureCode || "-";
            const arr = b.arrivalCode || "-";
            return {
                id: `#${b.id}`,
                customer: b.user?.name || b.user?.email || "Unknown",
                route: `${dep} → ${arr}`,
                amount: b.totalFare != null ? String(roundMoney(b.totalFare)) : "-",
                currency: b.currencyCode || "BDT",
                status: mapStatus(b.status),
                date: b.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
                pnr: b.locator || "-",
            };
        });

        const dominantCurrency =
            recentBookingsRaw.find((b) => b.currencyCode)?.currencyCode || "BDT";

        const statusBreakdown: StatusBreakdown = {
            booked: 0,
            processing: 0,
            ticketed: 0,
            completed: 0,
            cancelled: 0,
            failed: 0,
        };

        statusGroups.forEach((row) => {
            const count = Number(row._count._all || 0);
            switch (row.status) {
                case BookingStatus.BOOKED:
                    statusBreakdown.booked = count;
                    break;
                case BookingStatus.PREPARED:
                    statusBreakdown.processing = count;
                    break;
                case BookingStatus.TICKETED:
                    statusBreakdown.ticketed = count;
                    break;
                case BookingStatus.COMMITTED:
                    statusBreakdown.completed = count;
                    break;
                case BookingStatus.CANCELLED:
                    statusBreakdown.cancelled = count;
                    break;
                case BookingStatus.FAILED:
                    statusBreakdown.failed = count;
                    break;
                default:
                    break;
            }
        });

        const routePassengerMap = new Map<string, number>();
        const airlinePassengerMap = new Map<string, number>();

        passengerCountRows.forEach((row) => {
            const routeLabel = `${row.departureCode || "-"} → ${row.arrivalCode || "-"}`;
            routePassengerMap.set(
                routeLabel,
                (routePassengerMap.get(routeLabel) || 0) + Number(row._count.passengers || 0)
            );

            const airlineCode = row.airlineCode || "Unknown";
            airlinePassengerMap.set(
                airlineCode,
                (airlinePassengerMap.get(airlineCode) || 0) + Number(row._count.passengers || 0)
            );
        });

        const topRoutes: TopRoute[] = routeGroups
            .map((row) => {
                const route = `${row.departureCode || "-"} → ${row.arrivalCode || "-"}`;
                return {
                    route,
                    bookings: Number(row._count._all || 0),
                    passengers: routePassengerMap.get(route) || 0,
                    revenue: roundMoney(row._sum.totalFare),
                    currency: dominantCurrency,
                };
            })
            .sort((a, b) => {
                if (b.revenue !== a.revenue) return b.revenue - a.revenue;
                return b.bookings - a.bookings;
            })
            .slice(0, 5);

        const topAirlines: TopAirline[] = airlineGroups
            .map((row) => {
                const airline = row.airlineCode || "Unknown";
                return {
                    airline,
                    bookings: Number(row._count._all || 0),
                    passengers: airlinePassengerMap.get(airline) || 0,
                    revenue: roundMoney(row._sum.totalFare),
                    currency: dominantCurrency,
                };
            })
            .sort((a, b) => {
                if (b.revenue !== a.revenue) return b.revenue - a.revenue;
                return b.bookings - a.bookings;
            })
            .slice(0, 5);

        const currentRevenue = roundMoney(currentPeriodRevenueAgg._sum.totalFare);
        const previousRevenue = roundMoney(previousPeriodRevenueAgg._sum.totalFare);

        return res.status(200).json({
            totalBookings,
            ticketedBookings,
            pendingBookings,
            cancelledBookings,
            totalCustomers,
            totalRevenue: roundMoney(revenueAgg._sum.totalFare),
            currency: dominantCurrency,
            monthlyStats,
            recentBookings,
            statusBreakdown,
            topRoutes,
            topAirlines,
            today: {
                bookings: todayBookings,
                revenue: roundMoney(todayRevenueAgg._sum.totalFare),
            },
            growth: {
                bookingsPct: growthPercent(currentPeriodBookings, previousPeriodBookings),
                revenuePct: growthPercent(currentRevenue, previousRevenue),
                customersPct: growthPercent(currentPeriodCustomers, previousPeriodCustomers),
            },
        });
    } catch (error) {
        return res.status(500).json({
            message: error instanceof Error ? error.message : "Unable to load dashboard stats",
        });
    }
}
