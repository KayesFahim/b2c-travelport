import { fetchUpstream } from "@/server/upstream-fetch";
import { withApiHandler } from "@/server/api-handler";
import { publicErrorMessage } from "@/server/public-error";
import { withCustomerSession } from "@/server/with-customer-session";
import { requireBookingAccess } from "@/server/booking-access";
import type { NextApiRequest, NextApiResponse } from "next";
import { getTravelportAccessToken } from "@/server/travelport-token";

type ErrorResponse = {
  message: string;
  details?: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = toText(item);
      if (parsed) return parsed;
    }
    return "";
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    return (
      toText(source.value) ||
      toText(source.Value) ||
      toText(source.id) ||
      toText(source.ID) ||
      ""
    );
  }
  return "";
}

function parseBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "")
    .trim()
    .toLowerCase();
  if (text === "true") return true;
  if (text === "false") return false;
  return fallback;
}

function resolveBookingBaseUrl(version: string): string {
  const directUrl =
    process.env.TRAVELPORT_AIR_BOOKING ||
    process.env.TRAVELPORT_AIR_BOOKING_URL ||
    "";
  if (directUrl.trim()) {
    return directUrl.trim().replace(/\/+$/, "");
  }

  const baseUrl = process.env.TRAVELPORT_BASE_URL || "https://api.pp.travelport.net";
  return `${baseUrl.replace(/\/+$/, "")}/${version}/air/book`;
}

async function createToken(): Promise<string> {
  return getTravelportAccessToken();
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Record<string, unknown> | ErrorResponse>
) {
  if (!["GET", "POST"].includes(req.method || "")) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const queryOrBody = req.method === "GET" ? req.query : (req.body ?? {});
    const pnr =
      toText((queryOrBody as Record<string, unknown>)?.pnr) ||
      toText((queryOrBody as Record<string, unknown>)?.locator) ||
      toText((queryOrBody as Record<string, unknown>)?.reservationId);

    if (!pnr) {
      return res.status(400).json({
        message: "pnr (or locator/reservationId) is required",
      });
    }

    if (!(await requireBookingAccess(req, res, pnr))) return;

    const detailViewInd = parseBoolean(
      (queryOrBody as Record<string, unknown>)?.detailViewInd,
      true
    );
    const viewBrandCompleteInfoInd = parseBoolean(
      (queryOrBody as Record<string, unknown>)?.viewBrandCompleteInfoInd,
      true
    );

    const version = process.env.TRAVELPORT_VERSION || "11";
    const bookingBaseUrl = resolveBookingBaseUrl(version);
    const accessGroup = getRequiredEnv("TRAVELPORT_ACCESS_GROUP");
    const accessToken = await createToken();

    const endpoint = new URL(
      `${bookingBaseUrl}/reservation/reservations/${encodeURIComponent(pnr)}`
    );
    if (detailViewInd) endpoint.searchParams.set("detailViewInd", "true");
    if (viewBrandCompleteInfoInd) {
      endpoint.searchParams.set("viewBrandCompleteInfoInd", "true");
    }

    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
      XAUTH_TRAVELPORT_ACCESSGROUP: accessGroup,
      "Accept-Version": version,
      "Content-Version": version,
      Authorization: `Bearer ${accessToken}`,
    };
    const response = await fetchUpstream(endpoint.toString(), {
      method: "GET",
      headers,
    });

    const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    try {
      const { logTravelportApi } = await import("@/utils/travelportLogger");
      logTravelportApi({
        endpoint: endpoint.toString(),
        request: { method: "GET", headers },
        response: payload,
        status: response.status,
        meta: { api: "reservation-by-pnr", pnr },
      });
    } catch { }
    if (!response.ok) {
      return res.status(502).json({
        message: `Travelport reservation retrieve failed (${response.status})`,
        details:
          toText((payload as Record<string, unknown>)?.message) ||
          toText((payload as Record<string, unknown>)?.error_description) ||
          "Unable to fetch reservation by PNR/locator.",
      });
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      message: publicErrorMessage(error, "Unexpected server error"),
    });
  }
}

export default withApiHandler(withCustomerSession(handler), { methods: ["GET", "POST"] });

export const config = { api: { bodyParser: false } };
