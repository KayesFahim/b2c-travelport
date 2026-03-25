import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/server/prisma";
import { getActor } from "@/server/rbac";

type ErrorResponse = { message: string };

type CustomerRow = {
    id: number;
    name: string;
    email: string;
    phone: string;
    country: string;
    bookings: number;
    totalSpent: number;
    currency: string;
    joinDate: string;
    status: string;
};

type SuccessResponse = {
    customers: CustomerRow[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
};

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
        const page = Math.max(1, Number(req.query.page) || 1);
        const pageSize = Math.max(1, Math.min(100, Number(req.query.pageSize) || 20));
        const search = String(req.query.search || "").trim();

        const whereSearch = search
            ? {
                OR: [
                    { name: { contains: search } },
                    { email: { contains: search } },
                    { phone: { contains: search } },
                ],
            }
            : {};

        const [total, rows] = await Promise.all([
            prisma.user.count({ where: whereSearch }),
            prisma.user.findMany({
                where: whereSearch,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    name: true,
                    givenName: true,
                    surName: true,
                    email: true,
                    phone: true,
                    nationality: true,
                    createdAt: true,
                    emailVerified: true,
                    bookings: {
                        select: {
                            totalFare: true,
                            currencyCode: true,
                        },
                    },
                },
            }),
        ]);

        const customers: CustomerRow[] = rows.map((u) => {
            const displayName =
                u.name ||
                [u.givenName, u.surName].filter(Boolean).join(" ") ||
                u.email;
            const bookingCount = u.bookings.length;
            const totalSpent = u.bookings.reduce(
                (sum, b) => sum + Number(b.totalFare ?? 0),
                0
            );
            const currency = u.bookings.find((b) => b.currencyCode)?.currencyCode || "BDT";

            return {
                id: u.id,
                name: displayName || "Unknown",
                email: u.email,
                phone: u.phone || "-",
                country: u.nationality || "-",
                bookings: bookingCount,
                totalSpent: Math.round(totalSpent),
                currency,
                joinDate: u.createdAt.toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                }),
                status: u.emailVerified ? "Active" : "Unverified",
            };
        });

        return res.status(200).json({
            customers,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        });
    } catch (error) {
        return res.status(500).json({
            message: error instanceof Error ? error.message : "Unable to load customers",
        });
    }
}
