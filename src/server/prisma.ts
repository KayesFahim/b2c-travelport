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
