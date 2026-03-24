import type { NextApiRequest, NextApiResponse } from "next";
import { getSessionUser } from "@/server/auth-session";

type ErrorResponse = {
  message: string;
};

type SuccessResponse = {
  authenticated: true;
  user: {
    id: number;
    email: string;
    name: string;
    admin: boolean;
    role: string;
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const user = await getSessionUser(req);
    if (!user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    return res.status(200).json({
      authenticated: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Unable to load session",
    });
  }
}
