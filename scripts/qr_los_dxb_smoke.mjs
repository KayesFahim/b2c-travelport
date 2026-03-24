import fs from 'fs';

const base = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';

function loadEnv(filePath) {
    const out = {};
    if (!fs.existsSync(filePath)) return out;
    for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const i = t.indexOf('=');
        if (i <= 0) continue;
        out[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
    }
    return out;
}

function toJson(text) {
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function pickCookie(setCookieHeader, name) {
    if (!setCookieHeader) return '';
    const raw = String(setCookieHeader);
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = raw.match(new RegExp(`${escaped}=([^;]+)`));
    return match ? `${name}=${match[1]}` : '';
}

const env = loadEnv('.env');
const email = process.env.USER_EMAIL || process.env.SMOKE_EMAIL || env.USER_EMAIL || env.SMOKE_EMAIL || '';
const password = process.env.USER_PASSWORD || process.env.SMOKE_PASSWORD || env.USER_PASSWORD || env.SMOKE_PASSWORD || '';
if (!email || !password) {
    console.log(JSON.stringify({ ok: false, stage: 'login', message: 'Missing USER_EMAIL/USER_PASSWORD or SMOKE_EMAIL/SMOKE_PASSWORD' }, null, 2));
    process.exit(1);
}

const report = {
    meta: {
        startedAt: new Date().toISOString(),
        route: 'LOS-DXB',
        airline: 'QR',
        pax: { ADT: 1, CHD: 1, INF: 1 },
        base,
    },
    steps: {},
};

const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
});
const loginText = await loginRes.text();
const loginJson = toJson(loginText) || {};
const sessionCookie = pickCookie(loginRes.headers.get('set-cookie') || '', 'flyjatt_booking_session');
report.steps.login = { ok: loginRes.ok && !!sessionCookie, status: loginRes.status, message: loginJson?.message || null };
if (!report.steps.login.ok) {
    report.meta.ok = false;
    report.meta.finishedAt = new Date().toISOString();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
}

const meRes = await fetch(`${base}/api/auth/me`, {
    method: 'GET',
    headers: { Cookie: sessionCookie },
});
const meText = await meRes.text();
const meJson = toJson(meText) || {};
report.steps.session = {
    ok: meRes.ok && !!meJson?.authenticated,
    status: meRes.status,
    authenticated: !!meJson?.authenticated,
};
if (!report.steps.session.ok) {
    report.meta.ok = false;
    report.meta.finishedAt = new Date().toISOString();
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
}

const searchBody = {
    adultcount: 1,
    childcount: 1,
    infantcount: 1,
    cabinclass: 1,
    contentSourceList: ['GDS'],
    responseModel: 'unified',
    segments: [
        {
            depfrom: 'LOS',
            arrto: 'DXB',
            depdate: '2026-04-17',
        },
    ],
};

const searchRes = await fetch(`${base}/api/travelport/search-flight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify(searchBody),
});
const searchText = await searchRes.text();
const searchJson = toJson(searchText);
const offers = Array.isArray(searchJson) ? searchJson : [];
const qrOffers = offers.filter(
    (o) => String(o?.carrierCode || o?.CurrierCode || o?.carrier || '').toUpperCase() === 'QR'
);
report.steps.search = { ok: searchRes.ok && qrOffers.length > 0, status: searchRes.status, offers: offers.length, qrOffers: qrOffers.length };
if (!report.steps.search.ok) {
    report.meta.ok = false;
    report.meta.finishedAt = new Date().toISOString();
    report.steps.searchPreview = Array.isArray(offers)
        ? offers.slice(0, 2).map((o) => ({ CurrierCode: o?.CurrierCode, offerIdentifier: o?.offerIdentifier }))
        : null;
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
}

const selected = qrOffers.find((o) => o?.isBookable !== false && o?.issuePermit !== false) || qrOffers[0];
const now = Date.now();

const preBody = {
    selectedAirPrice: selected,
    selectedOffer: selected,
    bookingFlowKey: `flow_smoke_qr_${now}`,
    bookingOfferKey: `offer_smoke_qr_${now}`,
    bookingFlowExpiresAt: now + 10 * 60 * 1000,
    commit: false,
    commitOnly: false,
    passengers: [
        {
            PaxType: 'ADT',
            Title: 'MR',
            FirstName: 'KAYES',
            LastName: 'FAHIM',
            Gender: 'MALE',
            DateOfBirth: '1995-01-01',
            PassportNumber: 'A20932903',
            PassportExpiryDate: '2032-01-01',
            PassportNationality: 'BD',
            PassportIssueCountry: 'BD',
            BirthCountry: 'BD',
            Email: email,
            ContactNumber: '08801685370455',
        },
        {
            PaxType: 'CHD',
            Title: 'MSTR',
            FirstName: 'KAYES',
            LastName: 'JR',
            Gender: 'MALE',
            DateOfBirth: '2018-01-01',
            PassportNumber: 'A20932903',
            PassportExpiryDate: '2032-01-01',
            PassportNationality: 'BD',
            PassportIssueCountry: 'BD',
            BirthCountry: 'BD',
        },
        {
            PaxType: 'INF',
            Title: 'MSTR',
            FirstName: 'BABY',
            LastName: 'FAHIM',
            Gender: 'MALE',
            DateOfBirth: '2025-01-01',
            PassportNumber: 'A20932903',
            PassportExpiryDate: '2032-01-01',
            PassportNationality: 'BD',
            PassportIssueCountry: 'BD',
            BirthCountry: 'BD',
        },
    ],
    adultCount: 1,
    childCount: 1,
    infantCount: 1,
};

const preRes = await fetch(`${base}/api/travelport/book-hold`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify(preBody),
});
const preText = await preRes.text();
const preJson = toJson(preText) || {};
report.steps.precommit = {
    ok: preRes.ok && !!preJson?.reservationId,
    status: preRes.status,
    reservationId: preJson?.reservationId || null,
    message: preJson?.message || null,
    details: preJson?.details || null,
};
if (!report.steps.precommit.ok) {
    report.meta.ok = false;
    report.meta.finishedAt = new Date().toISOString();
    report.steps.precommitApiFlowLogs = preJson?.apiFlowLogs || null;
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
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
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify(commitBody),
});
const commitText = await commitRes.text();
const commitJson = toJson(commitText) || {};
report.steps.commit = {
    ok: commitRes.ok && !!commitJson?.locator,
    status: commitRes.status,
    locator: commitJson?.locator || null,
    reservationId: commitJson?.reservationId || null,
    message: commitJson?.message || null,
    details: commitJson?.details || null,
};
if (!report.steps.commit.ok) {
    report.meta.ok = false;
    report.meta.finishedAt = new Date().toISOString();
    report.steps.commitApiFlowLogs = commitJson?.apiFlowLogs || null;
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
}

const pnr = commitJson.locator;
const issueRes = await fetch(`${base}/api/travelport/issue-ticket?pnr=${encodeURIComponent(pnr)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Cookie: sessionCookie },
    body: JSON.stringify({ pnr }),
});
const issueText = await issueRes.text();
const issueJson = toJson(issueText) || {};
report.steps.issueTicket = {
    ok: issueRes.ok && issueJson?.success === true,
    status: issueRes.status,
    pnr,
    locator: issueJson?.locator || null,
    stage: issueJson?.stage || null,
    message: issueJson?.message || null,
    details: issueJson?.details || null,
    warnings: issueJson?.warnings || [],
};
if (!report.steps.issueTicket.ok) {
    report.steps.issueApiFlowLogs = issueJson?.apiFlowLogs || null;
}

report.meta.finishedAt = new Date().toISOString();
report.meta.ok =
    report.steps.login.ok &&
    report.steps.search.ok &&
    report.steps.precommit.ok &&
    report.steps.commit.ok &&
    report.steps.issueTicket.ok;

console.log(JSON.stringify(report, null, 2));
process.exit(report.meta.ok ? 0 : 1);
