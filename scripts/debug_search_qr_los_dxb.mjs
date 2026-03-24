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

function pickCookie(setCookieHeader, name) {
    if (!setCookieHeader) return '';
    const parts = String(setCookieHeader).split(/,(?=[^;]+=[^;]+)/g);
    for (const c of parts) {
        const first = c.split(';')[0].trim();
        if (first.startsWith(`${name}=`)) return first;
    }
    return '';
}

const env = loadEnv('.env');
const email = process.env.USER_EMAIL || process.env.SMOKE_EMAIL || env.USER_EMAIL || env.SMOKE_EMAIL || '';
const password = process.env.USER_PASSWORD || process.env.SMOKE_PASSWORD || env.USER_PASSWORD || env.SMOKE_PASSWORD || '';

const loginRes = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
});
const sessionCookie = pickCookie(loginRes.headers.get('set-cookie') || '', 'flyjatt_booking_session');

const searchBody = {
    adultcount: 1,
    childcount: 1,
    infantcount: 1,
    cabinclass: 1,
    contentSourceList: ['GDS'],
    responseModel: 'unified',
    segments: [{ depfrom: 'LOS', arrto: 'DXB', depdate: '2026-04-17' }],
};

const res = await fetch(`${base}/api/travelport/search-flight`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: sessionCookie },
    body: JSON.stringify(searchBody),
});

const text = await res.text();
let parsed = null;
try {
    parsed = JSON.parse(text);
} catch {
    parsed = null;
}

if (!res.ok || !Array.isArray(parsed)) {
    console.log(JSON.stringify({ status: res.status, ok: res.ok, body: text }, null, 2));
    process.exit(0);
}

const offers = parsed;
const first = offers[0] || {};
const carrierCodeCounts = {};
let qrBySegmentCount = 0;

for (const o of offers) {
    const cc = String(o?.carrierCode || '').toUpperCase();
    if (cc) {
        carrierCodeCounts[cc] = (carrierCodeCounts[cc] || 0) + 1;
    }

    const allLegs = Array.isArray(o?.allLegsInfo) ? o.allLegsInfo : [];
    const hasQrSeg = allLegs.some((leg) => {
        const segs = Array.isArray(leg?.Segments) ? leg.Segments : [];
        return segs.some((s) => String(s?.marketingCarrier || s?.MarketingCarrier || '').toUpperCase() === 'QR');
    });
    if (hasQrSeg) qrBySegmentCount += 1;
}

const carrierSamples = offers.slice(0, 10).map((o) => ({
    CurrierCode: o?.CurrierCode,
    carrier: o?.carrier,
    validatingCarrierCode: o?.validatingCarrierCode,
    carrierCode: o?.carrierCode,
    firstLegCarrier: o?.legs?.[0]?.segments?.[0]?.marketingCarrier,
    firstLegCarrierName: o?.legs?.[0]?.segments?.[0]?.marketingCarrierName,
}));

console.log(JSON.stringify({
    status: res.status,
    ok: res.ok,
    offers: offers.length,
    qrCarrierCodeCount: carrierCodeCounts.QR || 0,
    qrBySegmentCount,
    topCarrierCodes: Object.entries(carrierCodeCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10),
    firstOfferKeys: Object.keys(first),
    carrierSamples,
}, null, 2));
