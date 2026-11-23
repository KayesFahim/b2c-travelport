import { withApiHandler } from "../../src/server/api-handler";
import type { NextApiRequest, NextApiResponse } from "next";
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

function routes(directory = path.join(process.cwd(), "pages/api")): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return routes(full);
    if (entry.name === "[...path].ts") return [];
    return ["/api/" + path.relative(path.join(process.cwd(), "pages/api"), full).replace(/\.ts$/, "").replace("[status]", "upcoming")];
  });
}

test("every API route rejects unsupported methods with JSON and Allow", async ({ request }) => {
  for (const route of routes()) {
    const result = await request.fetch(route, { method: "OPTIONS" });
    expect(result.status(), route).toBe(405);
    const body = await result.json();
    expect(body, route).toMatchObject({ success: false, code: "METHOD_NOT_ALLOWED" });
    expect(body.requestId, route).toBeTruthy();
    expect(result.headers().allow, route).toBeTruthy();
  }
});

test("missing routes and invalid request bodies return safe JSON", async ({ request }) => {
  const missing = await request.get("/api/this-route-does-not-exist");
  expect(missing.status()).toBe(404);
  expect(await missing.json()).toMatchObject({ code: "NOT_FOUND", success: false });
  const headers = { Origin: "http://127.0.0.1:4311", "Content-Type": "application/json" };
  for (const data of ["{broken", "[]", "null"]) {
    const invalid = await request.post("/api/travelport/price-check", { headers, data });
    expect(invalid.status()).toBe(400);
    expect(await invalid.json()).toMatchObject({ code: "INVALID_JSON", success: false });
  }
  const tooLarge = await request.post("/api/travelport/price-check", { headers, data: JSON.stringify({ value: "x".repeat(1024 * 1024) }) });
  expect(tooLarge.status()).toBe(413);
  expect(await tooLarge.json()).toMatchObject({ code: "PAYLOAD_TOO_LARGE" });
  const unsupported = await request.post("/api/travelport/price-check", { headers: { ...headers, "Content-Type": "text/plain" }, data: "plain body" });
  expect(unsupported.status()).toBe(415);
  expect(await unsupported.json()).toMatchObject({ code: "UNSUPPORTED_MEDIA_TYPE" });
});

test("unexpected exceptions and infrastructure failures have safe, traceable errors", async () => {
  for (const [error, status] of [[new Error("private SQL and password details"), 500], [Object.assign(new Error("database unavailable"), { code: "P1001" }), 503], [Object.assign(new Error("internal timeout details"), { name: "TimeoutError" }), 504]] as const) {
    const headers = new Map();
    const res = {
      statusCode: 200, headersSent: false, writableEnded: false, body: null as any,
      setHeader(name: string, value: unknown) { headers.set(name.toLowerCase(), value); },
      status(code: number) { this.statusCode = code; return this; },
      json(body: unknown) { this.body = body; this.headersSent = true; this.writableEnded = true; return this; },
    };
    const handler = withApiHandler(() => { throw error; }, { methods: ["GET"] });
    await handler({ method: "GET", headers: {}, body: {} } as NextApiRequest, res as unknown as NextApiResponse);
    expect(res.statusCode).toBe(status);
    expect(res.body.success).toBe(false);
    expect(res.body.requestId).toBe(headers.get("x-request-id"));
    expect(JSON.stringify(res.body)).not.toContain(error.message);
  }
});
