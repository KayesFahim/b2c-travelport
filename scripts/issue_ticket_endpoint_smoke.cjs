const fs = require("fs");
const path = require("path");

const base = "http://127.0.0.1:3000";
const pnr = process.argv[2] || "FRCT9H";
function loadEnvFile(filePath) {
  const result = {};
  if (!fs.existsSync(filePath)) return result;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, "");
    result[key] = value;
  }
  return result;
}

const envFromFile = loadEnvFile(path.join(process.cwd(), ".env"));
const email = process.env.USER_EMAIL || envFromFile.USER_EMAIL || "";
const password = process.env.USER_PASSWORD || envFromFile.USER_PASSWORD || "";

function pickCookie(setCookieHeader, name) {
  if (!setCookieHeader) return "";
  const parts = String(setCookieHeader).split(/,(?=[^;]+=[^;]+)/g);
  for (const c of parts) {
    const first = c.split(";")[0].trim();
    if (first.startsWith(`${name}=`)) return first;
  }
  return "";
}

(async () => {
  const report = {
    meta: {
      base,
      endpoint: `/api/travelport/issue-ticket?pnr=${encodeURIComponent(pnr)}`,
      pnr,
      startedAt: new Date().toISOString(),
    },
    steps: {},
  };

  if (!email || !password) {
    report.steps.login = {
      ok: false,
      message: "Missing USER_EMAIL/USER_PASSWORD in environment",
    };
    report.meta.finishedAt = new Date().toISOString();
    report.meta.ok = false;
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginJson = await loginRes.json().catch(() => ({}));
  const sessionCookie = pickCookie(
    loginRes.headers.get("set-cookie") || "",
    "flyjatt_booking_session"
  );

  report.steps.login = {
    ok: loginRes.ok && Boolean(sessionCookie),
    status: loginRes.status,
    message: loginJson?.message || null,
    hasSessionCookie: Boolean(sessionCookie),
  };

  if (!report.steps.login.ok) {
    report.meta.finishedAt = new Date().toISOString();
    report.meta.ok = false;
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const issueRes = await fetch(
    `${base}/api/travelport/issue-ticket?pnr=${encodeURIComponent(pnr)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: sessionCookie,
      },
      body: JSON.stringify({ pnr }),
    }
  );

  const issueJson = await issueRes.json().catch(() => ({}));

  report.steps.issueTicket = {
    ok: issueRes.ok,
    status: issueRes.status,
    success: issueJson?.success === true,
    reservationId: issueJson?.reservationId || null,
    locator: issueJson?.locator || null,
    stage: issueJson?.stage || null,
    message: issueJson?.message || null,
    details: issueJson?.details || null,
    warnings: Array.isArray(issueJson?.warnings) ? issueJson.warnings : [],
  };

  report.meta.finishedAt = new Date().toISOString();
  report.meta.ok = Object.values(report.steps).every((step) => step && step.ok === true);

  fs.writeFileSync(
    "sample/issueTicketEndpointSmokeResult.json",
    JSON.stringify(report, null, 2)
  );

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.meta.ok ? 0 : 1);
})();
