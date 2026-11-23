import { test, expect } from "@playwright/test";
import { SignJWT } from "jose";
import { parseCookies } from "../../src/server/request-cookies";
import { issueSessionJwt, verifySessionJwt } from "../../src/server/jwt-session";
import { isValidPassword } from "../../src/utils/passwordPolicy";

test("malformed cookie encoding cannot crash session parsing", () => {
  const cookies = parseCookies({ headers: { cookie: "broken=%ZZ; flyjatt_booking_session=valid; __proto__=ignored" } });
  expect(cookies.flyjatt_booking_session).toBe("valid");
  expect(cookies.broken).toBeUndefined();
  expect(Object.getPrototypeOf(cookies)).toBeNull();
});

test("password policy protects bcrypt's byte limit", () => {
  expect(isValidPassword("short1")).toBe(false);
  expect(isValidPassword("a correct long passphrase")).toBe(true);
  expect(isValidPassword("a".repeat(73))).toBe(false);
  expect(isValidPassword("a" + "界".repeat(24))).toBe(false);
  expect(isValidPassword("123456789012")).toBe(false);
});

test("JWT verification rejects expired, tampered and wrong-audience tokens", async () => {
  const previousSecret = process.env.JWT_SESSION_SECRET;
  const secret = "test-secret-that-is-long-enough-for-validation";
  process.env.JWT_SESSION_SECRET = secret;
  try {
    const user = { id: 1, email: "test@example.invalid", name: "Test", role: "CUSTOMER", admin: false };
    const valid = await issueSessionJwt(user, "test-session");
    expect((await verifySessionJwt(valid))?.sid).toBe("test-session");
    const parts = valid.split(".");
    parts[1] = Buffer.from(JSON.stringify({ sub: "another-user" })).toString("base64url");
    expect(await verifySessionJwt(parts.join("."))).toBeNull();
    const key = new TextEncoder().encode(secret);
    const expired = await new SignJWT({ sid: "test-session" }).setProtectedHeader({ alg: "HS256" })
      .setSubject("1").setIssuer("flyjatt-api").setAudience("flyjatt-client").setExpirationTime(1).sign(key);
    expect(await verifySessionJwt(expired)).toBeNull();
    const wrongAudience = await new SignJWT({ sid: "test-session" }).setProtectedHeader({ alg: "HS256" })
      .setSubject("1").setIssuer("flyjatt-api").setAudience("another-client").setExpirationTime("1h").sign(key);
    expect(await verifySessionJwt(wrongAudience)).toBeNull();
    process.env.JWT_SESSION_SECRET = "short";
    expect(await verifySessionJwt(valid)).toBeNull();
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SESSION_SECRET;
    else process.env.JWT_SESSION_SECRET = previousSecret;
  }
});
