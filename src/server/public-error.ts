import { ApiError } from "./api-handler";
/** Preserve local diagnostics without disclosing database, file or supplier internals. */
export function publicErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) throw error;
  if (process.env.NODE_ENV === "production") return fallback;
  return error instanceof Error ? error.message : fallback;
}
