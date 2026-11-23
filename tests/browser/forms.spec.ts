import { test, expect } from "@playwright/test";
import sharp from "sharp";

const offer = {
  ResultId: "test-offer", SearchId: "test-search", CurrencyCode: "USD", NetFare: 120, IsBookable: true, PassportMandatory: true,
  PriceBreakDown: [{ PaxType: "Adult", PaxCount: 1, BaseFare: 100, Tax: 20, TotalFare: 120 }],
  AllLegsInfo: [{ DepFrom: "DAC", ArrTo: "DXB", DepDate: "2027-02-01T10:00:00", Segments: [] }],
};

test("sign-in and password recovery use local API routes and show useful feedback", async ({ page }) => {
  await page.route("**/api/auth/login", (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ success: false, message: "Invalid email or password." }) }));
  await page.goto("/signIn");
  await page.getByLabel("Email address").fill("test@example.invalid");
  await page.getByLabel("Password", { exact: true }).fill("incorrect-password");
  await page.getByRole("button", { name: "Sign In", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Invalid email or password.");
  await page.route("**/api/auth/forgot-password", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, message: "If this email exists, a password reset link has been sent." }) }));
  await page.getByText("Forgot password?").click();
  await page.getByLabel("Email address").fill("test@example.invalid");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("alert")).toContainText("password reset link");
});

test("passport scanner displays failure, allows retry and autofills the correct traveler", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript((value) => sessionStorage.setItem("flyjatt:selected_offer", JSON.stringify({ selectedOffer: value })), offer);
  await page.route("**/api/travelport/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([offer]) }));
  let attempt = 0;
  await page.route("**/api/passport/extract-local", (route) => {
    attempt++;
    return route.fulfill({ status: attempt === 1 ? 422 : 200, contentType: "application/json", body: JSON.stringify(attempt === 1
      ? { success: false, code: "MRZ_NOT_FOUND", message: "We could not read the passport. Try a clearer photo." }
      : { success: true, extractedData: { firstName: "ANNA MARIA", lastName: "ERIKSSON", passportNumber: "L898902C3", nationality: "BGD", passportIssuingCountry: "BGD", gender: "Female", dateOfBirth: "1974-08-12", passportExpiryDate: "2030-04-15" } }) });
  });
  await page.goto("/bookingdetails");
  const input = page.getByLabel("Scan passport for adult 1");
  await expect(input).toBeAttached();
  const image = await sharp({ create: { width: 100, height: 60, channels: 3, background: "white" } }).png().toBuffer();
  await page.getByLabel("First name for adult 1", { exact: true }).fill("MANUAL");
  await input.setInputFiles({ name: "synthetic-passport.png", mimeType: "image/png", buffer: image });
  await expect(page.getByText("We could not read the passport. Try a clearer photo.")).toBeVisible();
  await expect(page.getByLabel("First name for adult 1", { exact: true })).toHaveValue("MANUAL");
  await input.setInputFiles({ name: "synthetic-passport.png", mimeType: "image/png", buffer: image });
  await expect(page.getByLabel("First name for adult 1", { exact: true })).toHaveValue("ANNA MARIA");
  await expect(page.getByLabel("Last name for adult 1", { exact: true })).toHaveValue("ERIKSSON");
  await expect(page.getByText("Details filled in. Please check every field against your passport before continuing.")).toBeVisible();
  expect(errors).toEqual([]);
  await page.screenshot({ path: `artifacts/passport-form-${test.info().project.name}.png`, fullPage: true });
});

test("failed fare verification blocks booking and offers a retry", async ({ page }) => {
  await page.addInitScript((value) => sessionStorage.setItem("flyjatt:selected_offer", JSON.stringify({ selectedOffer: value })), offer);
  await page.route("**/api/travelport/**", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ success: false, message: "The fare service is temporarily unavailable." }) }));
  await page.goto("/bookingdetails");
  await expect(page.getByRole("alert")).toContainText("Your booking has not been submitted.");
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
  const preview = page.getByRole("button", { name: "Preview Booking", exact: true });
  if (await preview.isVisible()) await expect(preview).toBeDisabled();
});
