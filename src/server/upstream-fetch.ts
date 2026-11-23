import { ApiError } from "./api-handler";

/** Bound supplier network waits; never automatically retry booking/payment mutations. */
export async function fetchUpstream(input: string | URL, init: RequestInit = {}): Promise<Response> {
  const configured = Number(process.env.TRAVELPORT_REQUEST_TIMEOUT_MS || 30_000);
  const timeout = AbortSignal.timeout(Number.isFinite(configured) ? Math.min(90_000, Math.max(1000, configured)) : 30_000);
  try {
    return await fetch(input, { ...init, signal: init.signal ? AbortSignal.any([init.signal, timeout]) : timeout });
  } catch (error) {
    if (timeout.aborted || ["TimeoutError", "AbortError"].includes((error as Error)?.name)) {
      throw new ApiError(504, "UPSTREAM_TIMEOUT", "The flight service took too long to respond. Please try again.");
    }
    throw new ApiError(502, "UPSTREAM_UNAVAILABLE", "We could not connect to the flight service. Please try again shortly.");
  }
}
