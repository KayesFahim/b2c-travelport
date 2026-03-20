import type { NextApiRequest, NextApiResponse } from "next";
import sliderData from "../../src/data/sliderData.json";

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<Record<string, unknown>>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  return res.status(200).json(sliderData as Record<string, unknown>);
}
