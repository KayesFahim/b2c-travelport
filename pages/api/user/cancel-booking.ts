import { withApiHandler } from "@/server/api-handler";
import type { NextApiRequest, NextApiResponse } from "next";
import { BookingStatus } from "@prisma/client";
import { assertDatabaseConfigured, prisma } from "@/server/prisma";
import { getSessionUser } from "@/server/auth-session";

type ErrorResponse = { message: string };

type SuccessResponse = {
    message: string;
    booking: {
        id: number;
        locator: string | null;
        reservationId: string | null;
        status: "Cancelled";
        updatedAt: string;
    };
};

function toText(value: unknown): string {
    return String(value ?? "").trim();
}

function toNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function handler(
    req: NextApiRequest,
    res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({ message: "Method not allowed" });
    }

    try {
        assertDatabaseConfigured();

        const sessionUser = await getSessionUser(req);
        if (!sessionUser?.id) {
            return res.status(401).json({ message: "Login required" });
        }

        const id =
            toNumber(req.body?.id) ||
            toNumber(req.body?.bookingId) ||
            toNumber(req.query.id) ||
            toNumber(req.query.bookingId);
        const locator = toText(req.body?.locator || req.query.locator);
        const reservationId = toText(req.body?.reservationId || req.query.reservationId);

        if (!id && !locator && !reservationId) {
            return res.status(400).json({
                message: "Booking identifier is required (id, locator, or reservationId)",
            });
        }

        const candidate = await prisma.booking.findFirst({
            where: {
                userId: sessionUser.id,
                OR: [
                    ...(id ? [{ id }] : []),
                    ...(locator ? [{ locator }] : []),
                    ...(reservationId ? [{ reservationId }] : []),
                ],
            },
            select: {
                id: true,
                locator: true,
                reservationId: true,
                status: true,
                updatedAt: true,
            },
        });

        if (!candidate) {
            return res.status(404).json({ message: "Booking not found" });
        }

        if (candidate.status === BookingStatus.CANCELLED) {
            return res.status(409).json({ message: "Booking is already cancelled" });
        }

        if (candidate.status === BookingStatus.TICKETED) {
            return res.status(409).json({ message: "Ticketed booking cannot be cancelled from this panel" });
        }

        const updated = await prisma.booking.update({
            where: { id: candidate.id },
            data: { status: BookingStatus.CANCELLED },
            select: {
                id: true,
                locator: true,
                reservationId: true,
                updatedAt: true,
            },
        });

        return res.status(200).json({
            message: "Booking cancelled successfully",
            booking: {
                id: updated.id,
                locator: updated.locator,
                reservationId: updated.reservationId,
                status: "Cancelled",
                updatedAt: updated.updatedAt.toISOString(),
            },
        });
    } catch (error) {
        return res.status(500).json({
            message:
                error instanceof Error
                    ? error.message
                    : "Unable to cancel booking at this time",
        });
    }
}

export default withApiHandler(handler, { methods: ["POST"] });

export const config = { api: { bodyParser: false } };
