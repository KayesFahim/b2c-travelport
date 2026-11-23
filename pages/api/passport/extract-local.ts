import type { NextApiRequest, NextApiResponse } from "next";
import { ApiError, withApiHandler } from "@/server/api-handler";
import { withCustomerSession } from "@/server/with-customer-session";
import { scanPassport } from "@/server/passport/scan";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

function decodeImage(value: unknown): Buffer | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(value);
  if (value.startsWith("data:") && (!match || !["image/jpeg", "image/png", "image/webp"].includes(match[1]))) {
    throw new ApiError(415, "UNSUPPORTED_IMAGE", "Choose a JPEG, PNG or WebP photo of the passport details page.");
  }
  const raw = (match ? match[2] : value).replace(/\s/g, "");
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw) || raw.length % 4 === 1) throw new ApiError(400, "INVALID_IMAGE", "The image could not be read. Please choose it again.");
  if (raw.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) throw new ApiError(413, "IMAGE_TOO_LARGE", "Choose an image smaller than 8 MB.");
  const buffer = Buffer.from(raw, "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) throw new ApiError(413, "IMAGE_TOO_LARGE", "Choose an image smaller than 8 MB.");
  return buffer;
}

async function remoteImage(value: unknown): Promise<Buffer | null> {
  if (!value) return null;
  let url: URL;
  try { url = new URL(String(value)); }
  catch { throw new ApiError(400, "INVALID_IMAGE_URL", "The document link is invalid. Choose a photo directly instead."); }
  const allowed = (process.env.PASSPORT_IMAGE_ORIGINS || "").split(",").map((origin) => origin.trim()).filter(Boolean);
  if (url.protocol !== "https:" || url.username || url.password || !allowed.includes(url.origin)) {
    throw new ApiError(400, "IMAGE_ORIGIN_NOT_ALLOWED", "Choose a photo directly to scan this passport.");
  }
  const response = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new ApiError(502, "IMAGE_DOWNLOAD_FAILED", "The passport photo could not be downloaded. Choose it directly instead.");
  if (!/^image\/(jpeg|png|webp)(;|$)/i.test(response.headers.get("content-type") || "")) throw new ApiError(415, "UNSUPPORTED_IMAGE", "Choose a JPEG, PNG or WebP photo.");
  const reader = response.body?.getReader();
  if (!reader) throw new ApiError(422, "INVALID_IMAGE", "The passport photo is empty.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value: chunk, done } = await reader.read();
      if (done) break;
      size += chunk.length;
      if (size > MAX_IMAGE_BYTES) throw new ApiError(413, "IMAGE_TOO_LARGE", "Choose an image smaller than 8 MB.");
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } finally { await reader.cancel().catch(() => {}); }
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const image = decodeImage(req.body.imageBase64) || await remoteImage(req.body.fileUrl || req.body.passportUrl);
  if (!image) throw new ApiError(400, "IMAGE_REQUIRED", "Choose a clear photo of the passport details page.");
  const mrz = await scanPassport(image);
  if (!mrz) throw new ApiError(422, "MRZ_NOT_FOUND", "We could not read the passport. Keep both lines of letters and numbers at the bottom visible, avoid glare, and try again. You can also enter the details manually.");
  return res.status(200).json({ success: true, source: "local-sharp-tesseract-mrz", extractedData: mrz.data, mrz: `${mrz.line1}\n${mrz.line2}`, mrzLines: [mrz.line1, mrz.line2], message: "Details read. Please check every field against the passport before continuing." });
}

export default withApiHandler(withCustomerSession(handler), { methods: ["POST"], bodyLimit: 12 * 1024 * 1024 });
export const config = { api: { bodyParser: false } };
