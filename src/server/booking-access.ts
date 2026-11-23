import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "./auth-session";
import { prisma } from "./prisma";
import { cacheGetJson, cacheSetJson } from "./redis-cache";

export async function bindWorkbenchOwner(reference: string, userId: number) {
  await cacheSetJson(`booking:workbench-owner:${reference}`, { userId }, 3600);
}

export async function requireWorkbenchAccess(
  req: NextApiRequest, res: NextApiResponse, reference: string,
): Promise<boolean> {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ message: "Please sign in to manage your booking." });
    return false;
  }
  const owner = await cacheGetJson<{ userId: number }>(`booking:workbench-owner:${reference}`);
  if (owner?.userId === user.id) return true;
  return requireBookingAccess(req, res, reference);
}

/** Check ownership before retrieving or changing any supplier reservation. */
export async function requireBookingAccess(
  req: NextApiRequest,
  res: NextApiResponse,
  reference: string,
): Promise<boolean> {
  const user = await getSessionUser(req);
  if (!user) {
    res.status(401).json({ message: "Please sign in to manage your booking." });
    return false;
  }
  if (!reference || reference.length > 128) {
    res.status(400).json({ message: "A valid booking reference is required." });
    return false;
  }
  const booking = await prisma.booking.findFirst({
    where: {
      userId: user.id,
      OR: [{ locator: reference }, { reservationId: reference }],
    },
    select: { id: true },
  });
  if (!booking) {
    res.status(404).json({ message: "Booking not found." });
    return false;
  }
  return true;
}
