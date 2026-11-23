import { randomUUID } from "node:crypto";
import type { NextApiHandler, NextApiRequest, NextApiResponse } from "next";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

const codes: Record<number, string> = {
  400: "INVALID_REQUEST", 401: "AUTH_REQUIRED", 403: "FORBIDDEN", 404: "NOT_FOUND",
  405: "METHOD_NOT_ALLOWED", 409: "CONFLICT", 413: "PAYLOAD_TOO_LARGE", 415: "UNSUPPORTED_MEDIA_TYPE",
  422: "VALIDATION_FAILED", 429: "RATE_LIMITED", 500: "INTERNAL_ERROR", 502: "UPSTREAM_ERROR",
  503: "SERVICE_UNAVAILABLE", 504: "UPSTREAM_TIMEOUT",
};

export function apiErrorBody(status: number, message: string, code = codes[status] || "REQUEST_FAILED", requestId = randomUUID()) {
  return { success: false, code, message, requestId, ...(status === 401 ? { requiresLogin: true } : {}) };
}

function readBody(req: NextApiRequest, limit: number): Promise<Record<string, unknown>> {
  if (Number(req.headers["content-length"]) > limit) {
    throw new ApiError(413, "PAYLOAD_TOO_LARGE", "The request is too large.");
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const cleanup = () => {
      clearTimeout(timer);
      req.off("data", onData); req.off("end", onEnd); req.off("error", onError); req.off("aborted", onAborted);
    };
    const fail = (error: Error) => { cleanup(); req.pause(); reject(error); };
    const onError = () => fail(new ApiError(400, "INVALID_REQUEST", "The request could not be read."));
    const onAborted = () => fail(new ApiError(400, "REQUEST_ABORTED", "The request was interrupted."));
    const onData = (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) return fail(new ApiError(413, "PAYLOAD_TOO_LARGE", "The request is too large."));
      chunks.push(chunk);
    };
    const onEnd = () => {
      cleanup();
      if (size === 0) return resolve({});
      if (!/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] || "")) {
        return reject(new ApiError(415, "UNSUPPORTED_MEDIA_TYPE", "Send the request as application/json."));
      }
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
        resolve(parsed);
      } catch { reject(new ApiError(400, "INVALID_JSON", "Send a valid JSON object.")); }
    };
    const timer = setTimeout(() => fail(new ApiError(408, "REQUEST_TIMEOUT", "The request took too long to upload.")), 15_000);
    req.on("data", onData); req.once("end", onEnd); req.once("error", onError); req.once("aborted", onAborted);
  });
}

function classify(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  const value = error as { code?: string; name?: string; message?: string };
  if (value?.code === "P2002") return new ApiError(409, "CONFLICT", "This record already exists.");
  if (value?.code === "P2025") return new ApiError(404, "NOT_FOUND", "The requested record was not found.");
  if (/^P10|^P202[124]$/.test(value?.code || "") || /redis|database_url|database server|econnrefused|enotfound/i.test(value?.message || "")) {
    return new ApiError(503, "SERVICE_UNAVAILABLE", "This service is temporarily unavailable. Please try again shortly.");
  }
  if (["TimeoutError", "AbortError"].includes(value?.name || "")) return new ApiError(504, "UPSTREAM_TIMEOUT", "The service took too long to respond. Please try again.");
  return new ApiError(500, "INTERNAL_ERROR", "Something went wrong. Please try again.");
}

/** Preserve successful/legacy payloads, while giving every API failure a safe JSON contract. */
export function withApiHandler(handler: NextApiHandler, options: { methods: string[]; bodyLimit?: number }): NextApiHandler {
  return async (req, res) => {
    const requestId = randomUUID();
    res.setHeader("X-Request-ID", requestId);
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    const originalJson = res.json.bind(res);
    res.json = ((payload: unknown) => {
      if (res.statusCode < 400 && payload && typeof payload === "object" && (payload as Record<string, unknown>).success === false) res.statusCode = 422;
      if (res.statusCode < 400) {
        if (process.env.NODE_ENV === "production" && payload && typeof payload === "object" && !Array.isArray(payload)) {
          const safe = { ...(payload as Record<string, unknown>) };
          if ("apiFlowLogs" in safe) safe.apiFlowLogs = [];
          delete safe.formOfPaymentResponse;
          delete safe.applyPaymentResponse;
          return originalJson(safe);
        }
        return originalJson(payload);
      }
      const body = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
      const message = res.statusCode >= 500 && !body.code
        ? ({ 502: "The flight service could not complete the request. Please try again.", 503: "This service is temporarily unavailable. Please try again shortly.", 504: "The service took too long to respond. Please try again." }[res.statusCode] || "Something went wrong. Please try again.")
        : String(body.message || "The request could not be completed.");
      const { details: _details, apiFlowLogs: _logs, ...safeBody } = body;
      return originalJson({ ...(res.statusCode >= 500 ? {} : safeBody), ...apiErrorBody(res.statusCode, message, typeof body.code === "string" ? body.code : undefined, requestId) });
    }) as typeof res.json;
    try {
      if (!options.methods.includes(req.method || "")) {
        res.setHeader("Allow", options.methods.join(", "));
        throw new ApiError(405, "METHOD_NOT_ALLOWED", "Method not allowed.");
      }
      if (!["GET", "HEAD", "OPTIONS"].includes(req.method || "") && req.body === undefined) {
        req.body = await readBody(req, options.bodyLimit || 1024 * 1024);
      }
      await handler(req, res);
      if (!res.writableEnded && !res.headersSent) throw new Error("Handler did not send a response");
    } catch (error) {
      if (res.headersSent || res.writableEnded) return;
      const failure = classify(error);
      if (failure.status === 413 || failure.status === 408) res.setHeader("Connection", "close");
      if (failure.status >= 500) console.error("[api] request failed", { requestId, code: failure.code, method: req.method });
      res.status(failure.status).json(apiErrorBody(failure.status, failure.message, failure.code, requestId));
    }
  };
}
