function esc(value: unknown): string {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function wrapEmail(title: string, bodyHtml: string): string {
    return `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f5f8ff;padding:24px;color:#0f172a;">
        <div style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #dbe7ff;overflow:hidden;">
            <div style="padding:16px 20px;background:#0ea5e9;color:#fff;font-weight:700;font-size:18px;">${esc(title)}</div>
            <div style="padding:20px;line-height:1.55;font-size:14px;">${bodyHtml}</div>
            <div style="padding:12px 20px;background:#f8fafc;color:#475569;font-size:12px;">
                This mailbox is not monitored. Please do not reply to this email.
            </div>
        </div>
    </div>`;
}

function renderInfoCell(label: string, value: string, options?: { accent?: boolean }): string {
    const fontSize = options?.accent ? "20px" : "13px";
    const color = options?.accent ? "#0f4b7d" : "#15324f";
    const letterSpacing = options?.accent ? "1.5px" : "normal";
    return `
            <td style="padding:14px 16px;border-right:1px solid #dfe7ef;vertical-align:top;background:#f9fbfc;">
                <div style="font-size:11px;line-height:1.3;color:#607890;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">${esc(label)}</div>
                <div style="font-size:${fontSize};line-height:1.25;color:${color};font-weight:700;letter-spacing:${letterSpacing};">${esc(value || "N/A")}</div>
            </td>`;
}

function renderCard(title: string, bodyHtml: string): string {
    return `
            <div style="background:#ffffff;border:1px solid #dfe7ef;border-radius:8px;overflow:hidden;margin-top:16px;">
                <div style="background:#0f4b7d;padding:9px 16px;color:#ffffff;font-size:12px;font-weight:700;letter-spacing:.04em;">${esc(title)}</div>
                <div style="padding:16px;">${bodyHtml}</div>
            </div>`;
}

function buildTravelEmailTemplate(params: {
    emailTitle: string;
    heroTitle: string;
    heroText: string;
    badgeText: string;
    statusText: string;
    locator: string;
    reservationId: string;
    route: string;
    travelDate?: string;
    amount?: string;
    ticketInfo?: string;
    passengerName: string;
    attachmentLabel: string;
}): string {
    const summaryCells = [
        renderInfoCell("PNR", params.locator || "N/A", { accent: true }),
        renderInfoCell("Reservation ID", params.reservationId || "N/A"),
        renderInfoCell("Route", params.route || "N/A"),
        renderInfoCell("Status", params.statusText || "N/A"),
    ].join("");

    const tripRows = [
        params.travelDate
            ? `<tr><td style="padding:8px 0;color:#607890;width:150px;">Travel Date</td><td style="padding:8px 0;font-weight:700;color:#15324f;">${esc(params.travelDate)}</td></tr>`
            : "",
        params.amount
            ? `<tr><td style="padding:8px 0;color:#607890;width:150px;">Total Amount</td><td style="padding:8px 0;font-weight:700;color:#15324f;">${esc(params.amount)}</td></tr>`
            : "",
        params.ticketInfo
            ? `<tr><td style="padding:8px 0;color:#607890;width:150px;">Ticket Info</td><td style="padding:8px 0;font-weight:700;color:#15324f;">${esc(params.ticketInfo)}</td></tr>`
            : "",
    ].join("");

    return wrapEmail(
        params.emailTitle,
        `
                <div style="background:#f1f7fc;border-radius:10px;padding:24px;">
                    <table role="presentation" style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                        <tr>
                            <td style="vertical-align:top;">
                                <div style="display:inline-block;background:#0f4b7d;color:#ffffff;padding:10px 18px;border-radius:6px;font-size:24px;font-weight:700;letter-spacing:.02em;">Fly Jatt</div>
                                <div style="margin-top:10px;font-size:12px;line-height:1.55;color:#607890;">
                                    Mirpur-14, Dhaka 1216<br />
                                    Email: info@flyjatt.com | Phone: +8801736-987906
                                </div>
                            </td>
                            <td style="vertical-align:top;text-align:right;">
                                <div style="display:inline-block;background:#e8f3ff;border:1px solid #bfe0ff;color:#15488c;padding:6px 12px;border-radius:4px;font-size:11px;font-weight:700;">${esc(params.badgeText)}</div>
                                <div style="margin-top:8px;display:inline-block;background:#e6f9ee;border:1px solid #c9ead7;color:#1a7a41;padding:6px 12px;border-radius:4px;font-size:11px;font-weight:700;">${esc(params.statusText)}</div>
                            </td>
                        </tr>
                    </table>

                    <div style="margin-bottom:18px;color:#15324f;">
                        <div style="font-size:24px;line-height:1.2;font-weight:700;color:#0f4b7d;margin-bottom:8px;">${esc(params.heroTitle)}</div>
                        <div style="font-size:14px;line-height:1.6;color:#4b637a;">${esc(params.heroText)}</div>
                    </div>

                    <div style="background:#ffffff;border:1px solid #dfe7ef;border-radius:8px;overflow:hidden;">
                        <table role="presentation" style="width:100%;border-collapse:collapse;">
                            <tr>
                                ${summaryCells}
                            </tr>
                        </table>
                    </div>

                    ${renderCard(
            "TRAVELER DETAILS",
            `<table role="presentation" style="width:100%;border-collapse:collapse;">
                                <tr><td style="padding:8px 0;color:#607890;width:150px;">Passenger</td><td style="padding:8px 0;font-weight:700;color:#15324f;">${esc(params.passengerName || "Traveler")}</td></tr>
                                <tr><td style="padding:8px 0;color:#607890;width:150px;">Route</td><td style="padding:8px 0;font-weight:700;color:#15324f;">${esc(params.route || "N/A")}</td></tr>
                                ${tripRows}
                            </table>`
        )}

                    ${renderCard(
            "IMPORTANT INFORMATION",
            `<div style="font-size:13px;line-height:1.65;color:#607890;">
                                Your ${esc(params.attachmentLabel)} is attached with this email for your records. Please review the booking information carefully and contact Fly Jatt support if you need any changes.
                            </div>`
        )}
                </div>`
    );
}

export function buildVerifyEmailTemplate(params: {
    name: string;
    verifyUrl: string;
}): { html: string; text: string; subject: string } {
    const subject = "Verify your FlyJatt account";
    const html = wrapEmail(
        "Email Verification",
        `<p>Hi ${esc(params.name || "Traveler")},</p>
         <p>Welcome to FlyJatt. Please verify your email address to secure your account.</p>
         <p><a href="${esc(params.verifyUrl)}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">Verify Email</a></p>
         <p>If the button does not work, use this link:</p>
         <p style="word-break:break-all;color:#0369a1;">${esc(params.verifyUrl)}</p>`
    );
    const text = `Hi ${params.name || "Traveler"},\nVerify your FlyJatt email: ${params.verifyUrl}`;
    return { html, text, subject };
}

export function buildForgotPasswordTemplate(params: {
    name: string;
    resetUrl: string;
}): { html: string; text: string; subject: string } {
    const subject = "Reset your FlyJatt password";
    const html = wrapEmail(
        "Password Reset",
        `<p>Hi ${esc(params.name || "Traveler")},</p>
         <p>We received a request to reset your password.</p>
         <p><a href="${esc(params.resetUrl)}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:10px 14px;border-radius:8px;font-weight:600;">Reset Password</a></p>
         <p>If you did not request this, you can ignore this email.</p>
         <p style="word-break:break-all;color:#0369a1;">${esc(params.resetUrl)}</p>`
    );
    const text = `Hi ${params.name || "Traveler"},\nReset your FlyJatt password: ${params.resetUrl}`;
    return { html, text, subject };
}

export function buildBookingTemplate(params: {
    name: string;
    locator: string;
    reservationId: string;
    route: string;
    travelDate: string;
    amount: string;
}): { html: string; text: string; subject: string } {
    const subject = `Booking Confirmation - ${params.locator || params.reservationId || "FlyJatt"}`;
    const html = buildTravelEmailTemplate({
        emailTitle: "Booking Confirmed",
        heroTitle: "Booking Confirmation",
        heroText: "Your itinerary has been recorded successfully. Review the summary below. The attached PDF copy follows the same structure for your reference.",
        badgeText: "Booking Copy",
        statusText: "Booked",
        locator: params.locator,
        reservationId: params.reservationId,
        route: params.route,
        travelDate: params.travelDate,
        amount: params.amount,
        passengerName: params.name,
        attachmentLabel: "booking copy",
    });
    const text = `Booking confirmed. Locator: ${params.locator || "N/A"}, Reservation: ${params.reservationId || "N/A"}, Route: ${params.route || "N/A"}, Travel date: ${params.travelDate || "N/A"}, Amount: ${params.amount || "N/A"}`;
    return { html, text, subject };
}

export function buildTicketTemplate(params: {
    name: string;
    locator: string;
    reservationId: string;
    route: string;
    ticketInfo: string;
}): { html: string; text: string; subject: string } {
    const subject = `Ticket Copy - ${params.locator || params.reservationId || "FlyJatt"}`;
    const html = buildTravelEmailTemplate({
        emailTitle: "Ticket Copy",
        heroTitle: "Ticket Copy",
        heroText: "Your ticket has been issued successfully. The summary below mirrors the attached ticket copy layout so the email and PDF stay visually consistent.",
        badgeText: "Ticket Copy",
        statusText: "Ticketed",
        locator: params.locator,
        reservationId: params.reservationId,
        route: params.route,
        ticketInfo: params.ticketInfo,
        passengerName: params.name,
        attachmentLabel: "ticket copy",
    });
    const text = `Ticket copy issued. Locator: ${params.locator || "N/A"}, Reservation: ${params.reservationId || "N/A"}, Route: ${params.route || "N/A"}, Ticket info: ${params.ticketInfo || "N/A"}`;
    return { html, text, subject };
}

export function buildContactSubmissionTemplate(params: {
    name: string;
    email: string;
    phone?: string;
    subjectLine: string;
    message: string;
}): { html: string; text: string; subject: string } {
    const subject = `Contact Form - ${params.subjectLine || "FlyJatt"}`;
    const html = wrapEmail(
        "New Contact Request",
        `
        <div style="background:#f1f7fc;border-radius:10px;padding:24px;">
            <div style="margin-bottom:18px;color:#15324f;">
                <div style="font-size:24px;line-height:1.2;font-weight:700;color:#0f4b7d;margin-bottom:8px;">New contact message received</div>
                <div style="font-size:14px;line-height:1.6;color:#4b637a;">A customer submitted the contact form from the Fly Jatt website.</div>
            </div>

            <div style="background:#ffffff;border:1px solid #dfe7ef;border-radius:8px;overflow:hidden;">
                <table role="presentation" style="width:100%;border-collapse:collapse;">
                    <tr>
                        ${renderInfoCell("Name", params.name || "N/A")}
                        ${renderInfoCell("Email", params.email || "N/A")}
                        ${renderInfoCell("Phone", params.phone || "N/A")}
                        ${renderInfoCell("Subject", params.subjectLine || "N/A")}
                    </tr>
                </table>
            </div>

            ${renderCard(
            "MESSAGE",
            `<div style="font-size:14px;line-height:1.7;color:#15324f;white-space:pre-wrap;">${esc(params.message || "N/A")}</div>`
        )}
        </div>`
    );
    const text = `New contact form submission. Name: ${params.name || "N/A"}, Email: ${params.email || "N/A"}, Phone: ${params.phone || "N/A"}, Subject: ${params.subjectLine || "N/A"}, Message: ${params.message || "N/A"}`;
    return { html, text, subject };
}
