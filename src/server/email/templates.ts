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
    <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;border:1px solid #dbe7ff;overflow:hidden;">
      <div style="padding:16px 20px;background:#0ea5e9;color:#fff;font-weight:700;font-size:18px;">${esc(title)}</div>
      <div style="padding:20px;line-height:1.55;font-size:14px;">${bodyHtml}</div>
      <div style="padding:12px 20px;background:#f8fafc;color:#475569;font-size:12px;">
        This mailbox is not monitored. Please do not reply to this email.
      </div>
    </div>
  </div>`;
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
    const html = wrapEmail(
        "Booking Confirmed",
        `<p>Hi ${esc(params.name || "Traveler")},</p>
     <p>Your booking has been confirmed.</p>
     <table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <tr><td style="padding:6px 0;color:#475569;">Locator</td><td style="padding:6px 0;font-weight:600;">${esc(params.locator || "N/A")}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Reservation ID</td><td style="padding:6px 0;font-weight:600;">${esc(params.reservationId || "N/A")}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Route</td><td style="padding:6px 0;font-weight:600;">${esc(params.route || "N/A")}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Travel Date</td><td style="padding:6px 0;font-weight:600;">${esc(params.travelDate || "N/A")}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Amount</td><td style="padding:6px 0;font-weight:600;">${esc(params.amount || "N/A")}</td></tr>
     </table>
     <p style="margin-top:10px;">A PDF copy is attached for your records.</p>`
    );
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
    const subject = `Ticket Issued - ${params.locator || params.reservationId || "FlyJatt"}`;
    const html = wrapEmail(
        "Ticket Issued",
        `<p>Hi ${esc(params.name || "Traveler")},</p>
     <p>Your ticket has been issued successfully.</p>
     <table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <tr><td style="padding:6px 0;color:#475569;">Locator</td><td style="padding:6px 0;font-weight:600;">${esc(params.locator || "N/A")}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Reservation ID</td><td style="padding:6px 0;font-weight:600;">${esc(params.reservationId || "N/A")}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Route</td><td style="padding:6px 0;font-weight:600;">${esc(params.route || "N/A")}</td></tr>
      <tr><td style="padding:6px 0;color:#475569;">Ticket Info</td><td style="padding:6px 0;font-weight:600;">${esc(params.ticketInfo || "N/A")}</td></tr>
     </table>
     <p style="margin-top:10px;">Your ticket PDF is attached.</p>`
    );
    const text = `Ticket issued. Locator: ${params.locator || "N/A"}, Reservation: ${params.reservationId || "N/A"}, Route: ${params.route || "N/A"}, Ticket info: ${params.ticketInfo || "N/A"}`;
    return { html, text, subject };
}
