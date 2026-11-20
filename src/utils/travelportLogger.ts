import fs from "fs";
import os from "os";
import path from "path";

const REDACTED_KEYS = new Set([
  "authorization",
  "client_secret",
  "password",
  "access_token",
  "refresh_token",
  "x-api-key",
  "api_key",
]);

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 8 || value === null || value === undefined) return value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
      (trimmed.startsWith("[") && trimmed.endsWith("]"))
    ) {
      try {
        return sanitizeValue(JSON.parse(trimmed), depth + 1);
      } catch {
        return value;
      }
    }
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const normalizedKey = key.toLowerCase();
      if (REDACTED_KEYS.has(normalizedKey)) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = sanitizeValue(val, depth + 1);
      }
    }
    return out;
  }

  return value;
}

/**
 * Appends a sanitized JSON log entry to travelport-api-logs/YYYY-MM-DD.log.
 */
export function logTravelportApi({
  endpoint,
  request,
  response,
  status,
  meta = {},
}: {
  endpoint: string;
  request: any;
  response: any;
  status: number;
  meta?: Record<string, any>;
}) {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const entryLine = `${JSON.stringify({
    timestamp: new Date().toISOString(),
    endpoint,
    status,
    meta: sanitizeValue(meta),
    request: sanitizeValue(request),
    response: sanitizeValue(response),
  })}\n`;

  const candidateDirs = [
    process.env.TRAVELPORT_LOG_DIR?.trim(),
    path.resolve(process.cwd(), "travelport-api-logs"),
    path.join(os.tmpdir(), "travelport-api-logs"),
  ].filter(Boolean) as string[];

  for (const logDir of candidateDirs) {
    try {
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logFile = path.join(logDir, `${dateStamp}.log`);
      fs.appendFileSync(logFile, entryLine, "utf8");
      return;
    } catch {
      continue;
    }
  }
}
