import path from "node:path";
import { Worker } from "node:worker_threads";
import { ApiError } from "../api-handler";

let activeScans = 0;

export async function scanPassport(image: Buffer) {
  if (activeScans >= 2) throw new ApiError(503, "SCANNER_BUSY", "The scanner is busy. Please try again shortly.");
  const configured = Number(process.env.PASSPORT_OCR_TIMEOUT_MS || 55_000);
  const timeout = Number.isFinite(configured) ? Math.min(90_000, Math.max(1000, configured)) : 55_000;
  activeScans++;
  let worker: Worker | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await new Promise<{ line1: string; line2: string; score: number; data: Record<string, string> } | null>((resolve, reject) => {
      worker = new Worker(path.join(process.cwd(), "src/server/passport/ocr-worker.cjs"), {
        workerData: { image, tessdataDir: process.env.PASSPORT_TESSDATA_PATH || path.join(process.cwd(), "tessdata") },
      });
      timer = setTimeout(() => reject(new ApiError(504, "OCR_TIMEOUT", "Scanning took too long. Try a clear, closely cropped photo of the passport details page.")), timeout);
      worker.once("message", (result) => {
        if (result.error) {
          const code = result.error.code;
          const invalid = ["INVALID_IMAGE", "UNSUPPORTED_IMAGE"].includes(code);
          reject(new ApiError(invalid ? 422 : 503, code, invalid ? result.error.message : "The scanner is temporarily unavailable. Please enter the details manually or try again."));
        } else resolve(result.mrz);
      });
      worker.once("error", () => reject(new ApiError(503, "OCR_UNAVAILABLE", "The scanner is temporarily unavailable. Please try again.")));
      worker.once("exit", () => reject(new ApiError(503, "OCR_UNAVAILABLE", "The scanner stopped unexpectedly. Please try again.")));
    });
  } finally {
    if (timer) clearTimeout(timer);
    if (worker) await worker.terminate();
    activeScans--;
  }
}
