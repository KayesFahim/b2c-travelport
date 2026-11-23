import { test, expect } from "@playwright/test";
import sharp from "sharp";
import type { NextApiRequest, NextApiResponse } from "next";
import passportHandler from "../../pages/api/passport/extract-local";
import { createSession } from "../../src/server/auth-session";
import mrzParser from "../../src/server/passport/mrz.cjs";

const line1 = "P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<";
const line2 = "L898902C36UTO7408122F1204159ZE184226B<<<<<10";

function response() {
  const headers = new Map<string, unknown>();
  return {
    statusCode: 200, headersSent: false, writableEnded: false, body: null as any,
    setHeader(name: string, value: unknown) { headers.set(name.toLowerCase(), value); return this; },
    getHeader(name: string) { return headers.get(name.toLowerCase()); },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; this.headersSent = true; this.writableEnded = true; return this; },
  };
}

async function syntheticPhoto() {
  const escape = (text: string) => text.replaceAll("<", "&lt;");
  return sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1800" height="1000"><rect width="100%" height="100%" fill="white"/><text x="60" y="160" font-size="44" font-family="monospace">SYNTHETIC PASSPORT TEST</text><text x="48" y="810" font-size="56" font-family="monospace">${escape(line1)}</text><text x="48" y="890" font-size="56" font-family="monospace">${escape(line2)}</text></svg>`)).png().toBuffer();
}

test("MRZ checks reject incorrect document numbers, dates and truncated lines", () => {
  expect(mrzParser.parseMrzPair(line1, line2)?.data.passportNumber).toBe("L898902C3");
  expect(mrzParser.parseMrzPair(line1, "X" + line2.slice(1))).toBeNull();
  expect(mrzParser.parseMrzPair(line1, line2.slice(0, 40))).toBeNull();
  expect(mrzParser.parseDate("740231", "dob")).toBe("");
  expect(mrzParser.parseDate("240229", "dob", new Date("2026-01-01"))).toBe("2024-02-29");
});

test("authenticated scanner reads a synthetic photo and survives invalid uploads", async () => {
  const previous = { node: process.env.NODE_ENV, redis: process.env.REDIS_URL, secret: process.env.JWT_SESSION_SECRET, lang: process.env.PASSPORT_TESSDATA_PATH };
  Object.assign(process.env, { NODE_ENV: "test" });
  process.env.REDIS_URL = "";
  process.env.JWT_SESSION_SECRET = "passport-test-session-secret-longer-than-thirty-two";
  delete process.env.PASSPORT_TESSDATA_PATH;
  try {
    const req = { method: "POST", headers: {}, query: {} } as NextApiRequest;
    const login = response();
    await createSession(req, login as unknown as NextApiResponse, { id: 91001, email: "test@example.invalid", name: "Synthetic Test", role: "CUSTOMER", admin: false });
    const cookie = String(login.getHeader("set-cookie")).split(";")[0];
    const invoke = async (imageBase64: string) => {
      const res = response();
      await passportHandler({ ...req, headers: { cookie }, body: { imageBase64 } } as NextApiRequest, res as unknown as NextApiResponse);
      return res;
    };
    const invalid = await invoke("data:image/png;base64," + Buffer.from("not an image").toString("base64"));
    expect(invalid.statusCode).toBe(422);
    expect(invalid.body.code).toBe("INVALID_IMAGE");
    const scanned = await invoke("data:image/png;base64," + (await syntheticPhoto()).toString("base64"));
    expect(scanned.statusCode).toBe(200);
    expect(scanned.body.extractedData).toMatchObject({ firstName: "ANNA MARIA", lastName: "ERIKSSON", passportNumber: "L898902C3", dateOfBirth: "1974-08-12", nationality: "UTO" });
    expect(scanned.body.ocrText).toBeUndefined();
    const empty = await invoke("");
    expect(empty.statusCode).toBe(400);
    expect(empty.body.code).toBe("IMAGE_REQUIRED");
    const unsupported = await invoke("data:image/svg+xml;base64," + Buffer.from("<svg/>").toString("base64"));
    expect(unsupported.statusCode).toBe(415);
  } finally {
    for (const [key, value] of Object.entries({ NODE_ENV: previous.node, REDIS_URL: previous.redis, JWT_SESSION_SECRET: previous.secret, PASSPORT_TESSDATA_PATH: previous.lang })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
