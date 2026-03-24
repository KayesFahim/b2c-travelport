import nodemailer from "nodemailer";

// Each named sender uses its own SMTP account and cached transporter.
export type SenderType = "noreply" | "booking" | "ticket";

const transporterCache = new Map<string, nodemailer.Transporter>();

function toText(value: unknown): string {
    return String(value ?? "").trim();
}

type SmtpBase = { host: string; port: number; secure: boolean };
type SenderCredentials = { user: string; pass: string; fromName: string; fromAddress: string };

function getSmtpBase(): SmtpBase | null {
    const host = toText(process.env.SMTP_HOST);
    const port = Number(process.env.SMTP_PORT || 465);
    if (!host || !Number.isFinite(port) || port <= 0) return null;
    // Port 465 uses implicit SSL (secure: true). Port 587/25 uses STARTTLS (secure: false).
    const secureEnvRaw = toText(process.env.SMTP_SECURE).toLowerCase();
    const secure = secureEnvRaw === "true" || port === 465;
    return { host, port, secure };
}

function getSenderCredentials(senderType: SenderType): SenderCredentials | null {
    switch (senderType) {
        case "booking":
            return {
                user: toText(process.env.BOOKING_EMAIL),
                pass: toText(process.env.BOOKING_PASSWORD),
                fromName: "FlyJatt Bookings",
                fromAddress: toText(process.env.BOOKING_EMAIL) || "booking@flyjatt.com",
            };
        case "ticket":
            return {
                user: toText(process.env.TICKET_EMAIL),
                pass: toText(process.env.TICKET_PASSWORD),
                fromName: "FlyJatt Tickets",
                fromAddress: toText(process.env.TICKET_EMAIL) || "ticket@flyjatt.com",
            };
        case "noreply":
        default:
            return {
                user: toText(process.env.NOREPLY_EMAIL),
                pass: toText(process.env.NOREPLY_PASSWORD),
                fromName: "FlyJatt",
                fromAddress:
                    toText(process.env.NOREPLY_EMAIL) ||
                    toText(process.env.NO_REPLY_EMAIL) ||
                    "noreply@flyjatt.com",
            };
    }
}

function getTransporter(senderType: SenderType): nodemailer.Transporter | null {
    const cached = transporterCache.get(senderType);
    if (cached) return cached;

    const base = getSmtpBase();
    if (!base) return null;

    const creds = getSenderCredentials(senderType);
    if (!creds?.user || !creds?.pass) return null;

    const transporter = nodemailer.createTransport({
        host: base.host,
        port: base.port,
        secure: base.secure,
        auth: { user: creds.user, pass: creds.pass },
    });
    transporterCache.set(senderType, transporter);
    return transporter;
}

export type EmailAttachment = {
    filename: string;
    content: Buffer;
    contentType?: string;
};

export async function sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    sender?: SenderType;
    attachments?: EmailAttachment[];
}): Promise<void> {
    const senderType: SenderType = params.sender ?? "noreply";
    const transporter = getTransporter(senderType);
    if (!transporter) {
        // Keep runtime resilient when SMTP is not configured.
        return;
    }

    const creds = getSenderCredentials(senderType);
    if (!creds) return;

    await transporter.sendMail({
        from: `${creds.fromName} <${creds.fromAddress}>`,
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        attachments: (params.attachments || []).map((item) => ({
            filename: item.filename,
            content: item.content,
            contentType: item.contentType || "application/pdf",
        })),
    });
}
