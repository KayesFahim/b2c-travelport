import { withApiHandler } from "@/server/api-handler";
import type { NextApiRequest, NextApiResponse } from "next";

/** Liveness only. No secrets, infrastructure details, or supplier requests. */
function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET, HEAD");
    return res.status(405).json({ message: "Method not allowed" });
  }
  return res.status(200).json({ status: "ok" });
}

export default withApiHandler(handler, { methods: ["GET", "HEAD"] });

export const config = { api: { bodyParser: false } };
