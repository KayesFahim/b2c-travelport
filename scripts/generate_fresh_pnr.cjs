const fs = require("fs");

const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";

function loadEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i <= 0) continue;
    const key = t.slice(0, i).trim();
    const value = t.slice(i + 1).trim().replace(/^['\"]|['\"]$/g, "");
    out[key] = value;
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

function toJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function buildSearchBody({ from, to, date, cabin, currency }) {
  return {
    adultcount: 1,
    childcount: 0,
    infantcount: 0,
    cabinclass: cabin,
    contentSourceList: ["GDS"],
    currencyCode: currency,
    segments: [
      {
        depfrom: from,
        arrto: to,
        depdate: date,
      },
    ],
  };
}

async function searchOffers(sessionCookie, searchBody) {
  const res = await fetch(`${base}/api/travelport/search-flight`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
    },
    body: JSON.stringify(searchBody),
  });
  const text = await res.text();
  const json = toJson(text);
  const offers = Array.isArray(json) ? json : [];
  return { status: res.status, offers, raw: json || text };
}

async function createPnr(sessionCookie, offer) {
  const now = Date.now();
  const preBody = {
    selectedAirPrice: offer,
    selectedOffer: offer,
    bookingFlowKey: `flow_smoke_${now}`,
    bookingOfferKey: `offer_smoke_${now}`,
    bookingFlowExpiresAt: now + 10 * 60 * 1000,
    commit: false,
    commitOnly: false,
  };

  const preRes = await fetch(`${base}/api/travelport/book-hold`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
    },
    body: JSON.stringify(preBody),
  });
  const preText = await preRes.text();
  const preJson = toJson(preText) || {};

  if (!(preRes.ok && preJson?.reservationId)) {
    return {
      ok: false,
      stage: "precommit",
      status: preRes.status,
      details: preJson?.message || preJson?.details || preText.slice(0, 300),
    };
  }

  const commitBody = {
    reservationId: preJson.reservationId,
    bookingFlowKey: preJson.bookingFlowKey,
    bookingOfferKey: preJson.bookingOfferKey,
    bookingFlowExpiresAt: preJson.bookingFlowExpiresAt,
    commit: true,
    commitOnly: true,
  };

  const commitRes = await fetch(`${base}/api/travelport/book-hold`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: sessionCookie,
    },
    body: JSON.stringify(commitBody),
  });
  const commitText = await commitRes.text();
  const commitJson = toJson(commitText) || {};

  if (!(commitRes.ok && commitJson?.locator)) {
    return {
      ok: false,
      stage: "commit",
      status: commitRes.status,
      details: commitJson?.message || commitJson?.details || commitText.slice(0, 300),
    };
  }

  return {
    ok: true,
    locator: commitJson.locator,
    reservationId: commitJson.reservationId || null,
  };
}

(async () => {
  const envFile = loadEnvFile(`${process.cwd()}/.env`);
  const email = process.env.USER_EMAIL || envFile.USER_EMAIL || "";
  const password = process.env.USER_PASSWORD || envFile.USER_PASSWORD || "";

  if (!email || !password) {
    console.error("Missing USER_EMAIL/USER_PASSWORD");
    process.exit(1);
  }

  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginText = await loginRes.text();
  const loginJson = toJson(loginText) || {};
  const setCookie = loginRes.headers.get("set-cookie") || "";
  const sessionCookie = pickCookie(setCookie, "flyjatt_booking_session");

  if (!(loginRes.ok && sessionCookie)) {
    console.error(JSON.stringify({ stage: "login", status: loginRes.status, details: loginJson || loginText }, null, 2));
    process.exit(1);
  }

  const candidates = [
    { from: "LOS", to: "DXB", date: "2026-04-17", cabin: "Business", currency: "NGN" },
    { from: "LOS", to: "CAI", date: "2026-04-17", cabin: "Business", currency: "NGN" },
    { from: "LOS", to: "JED", date: "2026-04-30", cabin: "Economy", currency: "USD" },
    { from: "LOS", to: "DXB", date: "2026-04-30", cabin: "Economy", currency: "USD" },
    { from: "LOS", to: "IST", date: "2026-04-30", cabin: "Economy", currency: "USD" },
  ];

  for (const c of candidates) {
    const searchBody = buildSearchBody(c);
    const search = await searchOffers(sessionCookie, searchBody);
    const offers = search.offers
      .filter((o) => o?.isBookable !== false)
      .filter((o) => o?.issuePermit !== false);

    if (!offers.length) {
      console.log(JSON.stringify({ stage: "search", candidate: c, status: search.status, offers: 0 }, null, 2));
      continue;
    }

    for (let i = 0; i < Math.min(offers.length, 8); i += 1) {
      const result = await createPnr(sessionCookie, offers[i]);
      if (result.ok) {
        console.log(JSON.stringify({ stage: "done", candidate: c, locator: result.locator, reservationId: result.reservationId }, null, 2));
        process.exit(0);
      }
      console.log(JSON.stringify({ stage: result.stage, candidate: c, status: result.status, details: result.details }, null, 2));
    }
  }

  console.error(JSON.stringify({ stage: "failed", message: "Could not generate a fresh PNR from tested candidates." }, null, 2));
  process.exit(1);
})();
