const fs = require("fs");

function loadEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, "");
    out[k] = v;
  }
  return out;
}

function pickCookie(setCookieHeader, name) {
  if (!setCookieHeader) return "";
  const parts = String(setCookieHeader).split(/,(?=[^;]+=[^;]+)/g);
  for (const c of parts) {
    const first = c.split(";")[0].trim();
    if (first.startsWith(`${name}=`)) return first;
  }
  return "";
}

function toText(v) {
  if (v == null) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return toText(v[0]);
  if (typeof v === "object") return toText(v.value) || toText(v.Value) || toText(v.id);
  return "";
}

function reservationFromPayload(payload) {
  const rr = payload?.ReservationResponse && typeof payload.ReservationResponse === "object"
    ? payload.ReservationResponse
    : payload;
  return rr?.Reservation && typeof rr.Reservation === "object" ? rr.Reservation : rr;
}

(async () => {
  const env = loadEnvFile(".env");
  const baseUrl = env.TRAVELPORT_AIR_BOOKING || env.TRAVELPORT_AIR_BOOKING_URL || `${(env.TRAVELPORT_BASE_URL || "https://api.pp.travelport.net").replace(/\/+$/, "")}/${env.TRAVELPORT_VERSION || "11"}/air/book`;
  const version = env.TRAVELPORT_VERSION || "11";
  const pnr = process.argv[2] || "FRCT9H";

  const loginRes = await fetch("http://127.0.0.1:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: env.USER_EMAIL || process.env.USER_EMAIL,
      password: env.USER_PASSWORD || process.env.USER_PASSWORD,
    }),
  });
  const cookie = pickCookie(loginRes.headers.get("set-cookie") || "", "flyjatt_booking_session");
  if (!loginRes.ok || !cookie) {
    console.log("LOGIN FAILED", loginRes.status, await loginRes.text());
    process.exit(1);
  }

  const appRes = await fetch("http://127.0.0.1:3000/api/travelport/reservation-by-pnr?pnr=" + encodeURIComponent(pnr), {
    headers: { Cookie: cookie, Accept: "application/json" },
  });
  console.log("APP_CHECK", appRes.status);

  const tokenRes = await fetch(env.TRAVELPORT_AUTH_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: env.TRAVELPORT_AUTH_GRANT_TYPE || "password",
      username: env.TRAVELPORT_USERNAME,
      password: env.TRAVELPORT_PASSWORD,
      client_id: env.TRAVELPORT_CLIENT_ID,
      client_secret: env.TRAVELPORT_CLIENT_SECRET,
    }).toString(),
  });
  const tokenJson = await tokenRes.json();
  const token = tokenJson?.access_token;

  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    XAUTH_TRAVELPORT_ACCESSGROUP: env.TRAVELPORT_ACCESS_GROUP,
    "Accept-Version": version,
    "Content-Version": version,
    Authorization: `Bearer ${token}`,
  };

  const bUrl = `${baseUrl.replace(/\/+$/, "")}/session/reservationworkbench/buildfromlocator?Locator=${encodeURIComponent(pnr)}`;
  const bRes = await fetch(bUrl, { method: "POST", headers });
  const bBody = await bRes.text();
  console.log("BUILD", bRes.status, bBody.slice(0, 1200));

  let buildJson = {};
  try { buildJson = JSON.parse(bBody); } catch {}
  const reservation = reservationFromPayload(buildJson);
  const reservationId = toText(reservation?.Identifier?.value) || toText(reservation?.Identifier);
  const offer = Array.isArray(reservation?.Offer) ? reservation.Offer[0] : {};
  const traveler = Array.isArray(reservation?.Traveler) ? reservation.Traveler[0] : {};
  const amount = Array.isArray(offer?.Price?.PriceBreakdown)
    ? offer.Price.PriceBreakdown.find((row) => String(row?.Amount?.currencySource || "").toLowerCase() === "charged")?.Amount
    : null;

  const fopPayload = {
    Reservation: {
      ...reservation,
      FormOfPayment: [{ "@type": "FormOfPaymentCash", id: "formOfPayment_1" }],
    },
  };
  const fopUrl = `${baseUrl.replace(/\/+$/, "")}/payment/reservationworkbench/${encodeURIComponent(reservationId)}/formofpayment`;
  const fopRes = await fetch(fopUrl, { method: "POST", headers, body: JSON.stringify(fopPayload) });
  const fopBody = await fopRes.text();
  console.log("FOP", fopRes.status, fopBody.slice(0, 1200));

  const payPayload = {
    Reservation: {
      ...reservation,
      Payment: [
        {
          "@type": "Payment",
          id: "payment_1",
          PaymentRef: "payment_1",
          Amount: {
            code: toText(amount?.CurrencyCode?.value) || toText(offer?.Price?.CurrencyCode?.value) || "USD",
            value: Number(amount?.Total) || Number(offer?.Price?.TotalPrice) || 0,
          },
          FormOfPaymentIdentifier: { FormOfPaymentRef: "formOfPayment_1" },
          OfferIdentifier: [
            {
              id: toText(offer?.id) || "offer_1",
              offerRef: toText(offer?.id) || "offer_1",
              Identifier: { authority: "Travelport", value: toText(offer?.Identifier?.value) },
            },
          ],
          TravelerIdentifierRef: [
            {
              id: toText(traveler?.id) || "travelerRefId_1",
              passengerTypeCode: toText(traveler?.passengerTypeCode) || "ADT",
            },
          ],
        },
      ],
    },
  };
  const payUrl = `${baseUrl.replace(/\/+$/, "")}/paymentoffer/reservationworkbench/${encodeURIComponent(reservationId)}/payments`;
  const payRes = await fetch(payUrl, { method: "POST", headers, body: JSON.stringify(payPayload) });
  const payBody = await payRes.text();
  console.log("APPLY", payRes.status, payBody.slice(0, 1200));
})();
