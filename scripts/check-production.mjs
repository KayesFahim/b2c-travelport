import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
require("@next/env").loadEnvConfig(process.cwd(), false);

const problems = [];
const required = ["DATABASE_URL", "REDIS_URL", "JWT_SESSION_SECRET", "APP_URL", "TRAVELPORT_AUTH_URL", "TRAVELPORT_FLIGHTS_URL", "TRAVELPORT_CLIENT_ID", "TRAVELPORT_CLIENT_SECRET", "TRAVELPORT_USERNAME", "TRAVELPORT_PASSWORD", "TRAVELPORT_ACCESS_GROUP", "SMTP_HOST", "NOREPLY_EMAIL", "NOREPLY_PASSWORD"];
for (const name of required) if (!process.env[name]?.trim()) problems.push(`${name} is missing`);
if ((process.env.JWT_SESSION_SECRET || "").trim().length < 32) problems.push("JWT_SESSION_SECRET must contain at least 32 characters");
if (process.env.NEXT_PUBLIC_API_KEY) problems.push("Remove NEXT_PUBLIC_API_KEY and rotate the previously exposed API_KEY");
if (!process.env.APP_URL?.startsWith("https://")) problems.push("APP_URL must use HTTPS");
if (process.env.EMAIL_VERIFICATION_REQUIRED === "false") problems.push("Email verification must be enabled");
for (const name of ["TRAVELPORT_AUTH_URL", "TRAVELPORT_FLIGHTS_URL", "TRAVELPORT_BASE_URL", "TRAVELPORT_AIR_BOOKING"]) {
  const value = process.env[name] || "";
  if (value && (!value.startsWith("https://") || /\.pp\./i.test(value))) problems.push(`${name} must use an approved production HTTPS endpoint`);
}
if (process.env.TRUST_PROXY !== "true") problems.push("Configure an ingress that overwrites X-Forwarded-For, then set TRUST_PROXY=true");
if (problems.length) {
  console.error("Production configuration requires attention:\n" + problems.map((value) => `- ${value}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Production configuration checks passed. Validate connectivity and approved ticket/payment flows in staging before release.");
}
