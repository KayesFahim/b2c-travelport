import type { NextApiHandler } from "next";
import { getSessionUser } from "./auth-session";

/** Route-level authentication remains enforced even if ingress rules change. */
export function withCustomerSession(handler: NextApiHandler): NextApiHandler {
  return async (req, res) => {
    try {
      if (!(await getSessionUser(req))) {
        return res.status(401).json({ message: "Please sign in to continue." });
      }
    } catch {
      return res.status(503).json({ message: "Session service temporarily unavailable." });
    }
    return handler(req, res);
  };
}
