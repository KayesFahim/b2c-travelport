const fs = require("fs");

function loadEnvFile(filePath) {
  const out = {};
  if (!fs.existsSync(filePath)) return out;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
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

(async () => {
  const base = "http://127.0.0.1:3000";
  const pnr = process.argv[2] || "FRCT9H";
  const env = loadEnvFile(".env");

  const email = process.env.USER_EMAIL || env.USER_EMAIL || "";
  const password = process.env.USER_PASSWORD || env.USER_PASSWORD || "";

  const loginRes = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const loginBody = await loginRes.text();
  const cookie = pickCookie(
    loginRes.headers.get("set-cookie") || "",
    "flyjatt_booking_session"
  );

  if (!loginRes.ok || !cookie) {
    console.log("LOGIN_STATUS", loginRes.status);
    console.log("LOGIN_BODY", loginBody);
    process.exit(1);
  }

  const issueRes = await fetch(
    `${base}/api/travelport/issue-ticket?pnr=${encodeURIComponent(pnr)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: cookie,
      },
      body: JSON.stringify({ pnr }),
    }
  );

  const issueBody = await issueRes.text();
  console.log("ISSUE_STATUS", issueRes.status);
  console.log("ISSUE_BODY", issueBody);
})();
