export class ApiClientError extends Error {
  constructor(message, { status = 0, code = "REQUEST_FAILED", requestId = "", payload = {} } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.payload = payload;
    this.requiresLogin = status === 401;
  }
}

export async function fetchWithTimeout(input, init = {}, timeoutMs = 45_000) {
  try {
    return await fetch(input, { ...init, signal: init.signal || AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (["TimeoutError", "AbortError"].includes(error?.name)) throw new ApiClientError("The request took too long. Please try again.", { code: "REQUEST_TIMEOUT" });
    throw new ApiClientError("We could not connect. Check your connection and try again.", { code: "NETWORK_ERROR" });
  }
}

export async function readApiResponse(response, fallback = "The request could not be completed.") {
  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json().catch(() => null) : null;
  if (!response.ok || payload?.success === false) {
    const messages = { 401: "Please sign in again to continue.", 403: "You do not have permission to do this.", 404: "The requested information was not found.", 413: "The selected file is too large.", 429: "Too many requests. Please wait a minute and try again.", 502: "The service is temporarily unavailable. Please try again.", 503: "The service is temporarily unavailable. Please try again.", 504: "The request took too long. Please try again." };
    throw new ApiClientError(typeof payload?.message === "string" ? payload.message : messages[response.status] || fallback, {
      status: response.status, code: payload?.code, requestId: payload?.requestId || response.headers.get("x-request-id") || "", payload: payload || {},
    });
  }
  if (payload === null) throw new ApiClientError("The service returned an unreadable response. Please try again.", { status: response.status, code: "INVALID_RESPONSE" });
  return payload;
}
