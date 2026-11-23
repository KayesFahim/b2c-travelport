import { test, expect } from "@playwright/test";

test("home renders the booking form and retains its sections", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeAttached();
  await expect(page.getByRole("button", { name: /search/i }).first()).toBeVisible();
  await expect(page.locator("footer")).toBeAttached();
  await expect(page.locator("#main-content")).toHaveCount(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  expect(await page.locator(".flyjatt-home-sections > *").evaluateAll((sections) =>
    sections.every((section) => section.getBoundingClientRect().right <= window.innerWidth + 1)
  )).toBe(true);
  expect(errors).toEqual([]);
  await page.screenshot({ path: `artifacts/home-${test.info().project.name}.png`, fullPage: true });
});

test("public routes load without client exceptions", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of ["/about", "/contact", "/privacypolicy", "/terms", "/signIn", "/admin/login", "/missing-page"]) {
    await page.goto(route);
    if (!["/signIn", "/admin/login"].includes(route)) {
      await expect(page.locator("header")).toBeVisible();
    } else {
      await expect(page.getByRole("button", { name: route === "/admin/login" ? "Login to admin" : /sign in/i }).first()).toBeVisible();
    }
    await expect(page.locator("footer")).toBeAttached();
  }
  expect(errors).toEqual([]);
});

test("keyboard users can skip navigation", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();
});

test("reservation and passport APIs require a real session", async ({ request }) => {
  for (const path of ["/api/travelport/reservation-by-pnr?pnr=INVALID"]) {
    const response = await request.get(path);
    expect(response.status()).toBe(401);
  }
  expect((await request.get("/api/travelport/issue-ticket")).status()).toBe(405);
  const response = await request.post("/api/passport/extract-local", {
    headers: { Origin: "http://127.0.0.1:4311" }, data: {},
  });
  expect(response.status()).toBe(401);
});

test("cross-site mutations fail before touching supplier or email services", async ({ request }) => {
  for (const path of ["/api/contact", "/api/auth/login", "/api/travelport/book-hold", "/api/travelport/issue-ticket"]) {
    const response = await request.post(path, { headers: { Origin: "https://untrusted.example" }, data: {} });
    expect(response.status()).toBe(403);
  }
});

test("public API and security headers work without a browser API key", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(await response.json()).toEqual({ status: "ok" });
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
  expect(response.headers()["content-security-policy"]).toContain("object-src 'none'");
  expect(response.headers()["x-powered-by"]).toBeUndefined();
});
