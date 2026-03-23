const fs = require("fs");

const base = process.env.SMOKE_BASE_URL || "http://127.0.0.1:3000";
const inputPath = process.env.ISSUE_TICKET_SMOKE_INPUT || "sample/issueTicketLiveSmokeInput.json";
const outputPath = process.env.ISSUE_TICKET_SMOKE_OUTPUT || "sample/issueTicketLiveSmokeResult.json";

function nowIso() {
    return new Date().toISOString();
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

(async () => {
    const input = toJson(fs.readFileSync(inputPath, "utf8")) || {};

    const email = process.env.SMOKE_EMAIL || input?.credentials?.email || "";
    const password = process.env.SMOKE_PASSWORD || input?.credentials?.password || "";

    const report = {
        meta: {
            base,
            startedAt: nowIso(),
            scenario: input?.scenario || "issue-ticket-e2e-live-smoke",
            inputPath,
            smokeText: Array.isArray(input?.smokeText) ? input.smokeText : [],
            passengers: input?.passengers || {},
        },
        steps: {},
    };

    try {
        if (!email || !password) {
            throw new Error("Missing email or password in input/env.");
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
        report.steps.login = {
            ok: loginRes.ok && !!sessionCookie,
            status: loginRes.status,
            message: loginJson?.message || (loginRes.ok ? "ok" : loginText.slice(0, 200)),
            hasSessionCookie: Boolean(sessionCookie),
        };

        if (!report.steps.login.ok) {
            report.meta.finishedAt = nowIso();
            report.meta.ok = false;
            fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
            console.log(JSON.stringify(report, null, 2));
            process.exit(1);
        }

        const meRes = await fetch(`${base}/api/auth/me`, {
            headers: { Cookie: sessionCookie },
        });
        const meText = await meRes.text();
        const meJson = toJson(meText) || {};
        report.steps.me = {
            ok: meRes.ok && meJson?.authenticated === true,
            status: meRes.status,
            user: meJson?.user?.email || null,
        };

        if (!report.steps.me.ok) {
            report.meta.finishedAt = nowIso();
            report.meta.ok = false;
            fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
            console.log(JSON.stringify(report, null, 2));
            process.exit(1);
        }

        // ---- Passport OCR step (optional — skipped if no ocrImagePath) ----
        const ocrImagePath =
            process.env.SMOKE_PASSPORT_IMAGE || input?.ocrImagePath || "";
        if (ocrImagePath) {
            try {
                const imgBuffer = fs.readFileSync(ocrImagePath);
                const ext = ocrImagePath.split(".").pop().toLowerCase();
                const mime =
                    ext === "png"
                        ? "image/png"
                        : ext === "jpg" || ext === "jpeg"
                          ? "image/jpeg"
                          : "application/octet-stream";
                const imageBase64 = `data:${mime};base64,${imgBuffer.toString("base64")}`;

                const ocrRes = await fetch(`${base}/api/passport/extract-local`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Cookie: sessionCookie },
                    body: JSON.stringify({ imageBase64 }),
                });
                const ocrText = await ocrRes.text();
                const ocrJson = toJson(ocrText) || {};

                report.steps.passportOcr = {
                    ok: ocrRes.ok && ocrJson?.success === true,
                    status: ocrRes.status,
                    source: ocrJson?.source || null,
                    message: ocrJson?.message || null,
                    mrzLines: ocrJson?.mrzLines || null,
                    extractedData: ocrJson?.extractedData || null,
                    ocrImagePath,
                };
            } catch (ocrErr) {
                report.steps.passportOcr = {
                    ok: false,
                    status: 0,
                    message: ocrErr instanceof Error ? ocrErr.message : String(ocrErr),
                    ocrImagePath,
                };
            }
        }

        const sample = toJson(fs.readFileSync("sample/allFlowSmokeResult.json", "utf8")) || {};
        const searchBody = sample?.steps?.search?.body;
        const preTemplate = sample?.steps?.bookHoldPrecommit?.body || {};
        const maxOfferAttempts = Number(
            process.env.SMOKE_MAX_OFFER_ATTEMPTS || input?.retry?.maxOfferAttempts || 25
        );
        const maxSearchCycles = Number(
            process.env.SMOKE_MAX_SEARCH_CYCLES || input?.retry?.maxSearchCycles || 2
        );

        if (!searchBody) {
            throw new Error("sample/allFlowSmokeResult.json missing steps.search.body");
        }

        let searchOk = false;
        let totalOffersSeen = 0;
        let selectedOfferIdentifier = null;
        let winningCommit = null;
        let winningPrecommit = null;
        let lastPrecommitStep = null;
        let lastCommitStep = null;
        const attemptTrace = [];

        for (let cycle = 0; cycle < maxSearchCycles && !winningCommit; cycle += 1) {
            const searchRes = await fetch(`${base}/api/travelport/search-flight`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Cookie: sessionCookie },
                body: JSON.stringify(searchBody),
            });
            const searchText = await searchRes.text();
            const searchJson = toJson(searchText);
            const offers = Array.isArray(searchJson) ? searchJson : [];

            if (searchRes.ok && offers.length > 0) {
                searchOk = true;
            }
            totalOffersSeen += offers.length;

            const candidates = offers
                .filter((o) => o?.isBookable !== false)
                .filter((o) => o?.issuePermit !== false)
                .slice(0, maxOfferAttempts);

            if (candidates.length === 0) {
                continue;
            }

            selectedOfferIdentifier =
                candidates[0]?.offerIdentifier || candidates[0]?.OfferIdentifier || null;

            for (let i = 0; i < candidates.length; i += 1) {
                const selected = candidates[i];
                const now = Date.now();

                const preBody = {
                    ...preTemplate,
                    selectedAirPrice: selected,
                    selectedOffer: selected,
                    bookingFlowKey: `flow_smoke_${now}_${cycle}_${i}`,
                    bookingOfferKey: `offer_smoke_${now}_${cycle}_${i}`,
                    bookingFlowExpiresAt: now + 10 * 60 * 1000,
                    commit: false,
                    commitOnly: false,
                };

                const preRes = await fetch(`${base}/api/travelport/book-hold`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json", Cookie: sessionCookie },
                    body: JSON.stringify(preBody),
                });
                const preText = await preRes.text();
                const preJson = toJson(preText) || {};

                const preStep = {
                    ok: preRes.ok && !!preJson?.reservationId,
                    status: preRes.status,
                    reservationId: preJson?.reservationId || null,
                    bookingFlowKey: preJson?.bookingFlowKey || null,
                    bookingOfferKey: preJson?.bookingOfferKey || null,
                    bookingStage: preJson?.bookingStage || preJson?.stage || null,
                    error: preJson?.message || preJson?.details || null,
                    offerIdentifier:
                        selected?.offerIdentifier || selected?.OfferIdentifier || `offer-${cycle}-${i}`,
                };
                lastPrecommitStep = preStep;

                if (!preStep.ok) {
                    attemptTrace.push({ phase: "precommit", cycle, index: i, ...preStep });
                    continue;
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
                    headers: { "Content-Type": "application/json", Cookie: sessionCookie },
                    body: JSON.stringify(commitBody),
                });
                const commitText = await commitRes.text();
                const commitJson = toJson(commitText) || {};

                const commitStep = {
                    ok: commitRes.ok && !!commitJson?.locator,
                    status: commitRes.status,
                    reservationId: commitJson?.reservationId || null,
                    locator: commitJson?.locator || null,
                    bookingStage: commitJson?.bookingStage || commitJson?.stage || null,
                    error: commitJson?.message || commitJson?.details || null,
                    offerIdentifier:
                        selected?.offerIdentifier || selected?.OfferIdentifier || `offer-${cycle}-${i}`,
                };
                lastCommitStep = commitStep;

                if (!commitStep.ok) {
                    attemptTrace.push({ phase: "commit", cycle, index: i, ...commitStep });
                    continue;
                }

                winningPrecommit = preJson;
                winningCommit = commitJson;
                lastPrecommitStep = preStep;
                lastCommitStep = commitStep;
                break;
            }
        }

        report.steps.search = {
            ok: searchOk,
            status: searchOk ? 200 : 500,
            offers: totalOffersSeen,
            selectedOfferIdentifier,
            maxOfferAttempts,
            maxSearchCycles,
        };

        if (!report.steps.search.ok) {
            report.meta.finishedAt = nowIso();
            report.meta.ok = false;
            fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
            console.log(JSON.stringify(report, null, 2));
            process.exit(1);
        }

        report.steps.bookHoldPrecommit = lastPrecommitStep || {
            ok: false,
            status: 500,
            reservationId: null,
            bookingFlowKey: null,
            bookingOfferKey: null,
            bookingStage: null,
            error: "Precommit was not attempted.",
        };

        report.steps.bookHoldCommit = lastCommitStep || {
            ok: false,
            status: 500,
            reservationId: null,
            locator: null,
            bookingStage: null,
            error: "Commit was not attempted.",
        };

        report.steps.attemptTrace = attemptTrace.slice(0, 50);

        if (!report.steps.bookHoldCommit.ok || !winningCommit) {
            report.meta.finishedAt = nowIso();
            report.meta.ok = false;
            fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
            console.log(JSON.stringify(report, null, 2));
            process.exit(1);
        }

        const pnr = encodeURIComponent(winningCommit.locator);
        const rsvRes = await fetch(
            `${base}/api/travelport/reservation-by-pnr?pnr=${pnr}&detailViewInd=true&viewBrandCompleteInfoInd=true`,
            {
                method: "GET",
                headers: { Accept: "application/json", Cookie: sessionCookie },
            }
        );

        const rsvText = await rsvRes.text();
        const rsvJson = toJson(rsvText) || {};
        const resolvedPnr =
            rsvJson?.ReservationResponse?.Reservation?.Locator?.value ||
            rsvJson?.ReservationResponse?.Reservation?.Locator ||
            null;

        report.steps.reservationByPnr = {
            ok: rsvRes.ok && !!rsvJson?.ReservationResponse?.Reservation,
            status: rsvRes.status,
            locatorReturned: resolvedPnr,
            error: rsvJson?.message || rsvJson?.details || null,
        };

        report.meta.finishedAt = nowIso();
        report.meta.ok = Object.values(report.steps)
            .filter((step) => step && typeof step === "object" && "ok" in step)
            .every((step) => step.ok === true);

        fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
        console.log(JSON.stringify(report, null, 2));
        process.exit(report.meta.ok ? 0 : 1);
    } catch (error) {
        report.meta.finishedAt = nowIso();
        report.meta.ok = false;
        report.steps.fatal = {
            ok: false,
            message: error instanceof Error ? error.message : String(error),
        };
        fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
        console.log(JSON.stringify(report, null, 2));
        process.exit(1);
    }
})();
