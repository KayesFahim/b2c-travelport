import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  __flyjattPrisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.__flyjattPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__flyjattPrisma = prisma;
}

export function assertDatabaseConfigured() {
  if (!String(process.env.DATABASE_URL || "").trim()) {
    throw new Error("DATABASE_URL is not configured. Set MySQL connection in environment.");
  }
}

export function isDatabaseConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const asRecord = error as Record<string, unknown>;
  const code = String(asRecord.code ?? "").trim().toUpperCase();
  if (code === "P1001" || code === "P1002") return true;

  const message = String(asRecord.message ?? "").toLowerCase();
  return (
    message.includes("can't reach database server") ||
    message.includes("cant reach database server") ||
    message.includes("database server") && message.includes("timed out") ||
    message.includes("connect etimedout") ||
    message.includes("connect econnrefused") ||
    message.includes("enotfound")
  );
}

export function getDatabaseUnavailableMessage(): string {
  return "Database is temporarily unavailable. Please try again shortly.";
}
