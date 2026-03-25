import nodemailer from "nodemailer";
import { cacheGetJson, cacheSetJson } from "@/server/redis-cache";

// Each named sender uses its own SMTP account and cached transporter.
export type SenderType = "noreply" | "booking" | "ticket" | "contact";

const transporterCache = new Map<string, nodemailer.Transporter>();
const EMAIL_QUEUE_KEY = "email:queue:v1";
const EMAIL_QUEUE_FAILED_KEY = "email:queue:failed:v1";
const EMAIL_QUEUE_MAX_RETRIES = 3;
const EMAIL_QUEUE_FAILED_HISTORY_LIMIT = 25;

let activeQueueProcessor: Promise<void> | null = null;

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
        case "contact":
            return {
                user: toText(process.env.CONTACT_EMAIL) || toText(process.env.NOREPLY_EMAIL),
                pass: toText(process.env.CONTACT_PASSWORD) || toText(process.env.NOREPLY_PASSWORD),
                fromName: "FlyJatt Contact",
                fromAddress: toText(process.env.CONTACT_EMAIL) || "contact@flyjatt.com",
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

type SerializedEmailAttachment = {
    filename: string;
    contentBase64: string;
    contentType?: string;
};

type QueuedEmailJob = {
    id: string;
    to: string;
    subject: string;
    html: string;
    text: string;
    replyTo?: string;
    sender: SenderType;
    attachments: SerializedEmailAttachment[];
    attempts: number;
    createdAt: string;
    nextAttemptAt: number;
    lastError?: string;
};

export type EmailQueueFailedJob = QueuedEmailJob & {
    failedAt: string;
};

export type EmailQueueStats = {
    pending: number;
    dueNow: number;
    retrying: number;
    oldestCreatedAt: string | null;
    nextAttemptAt: string | null;
    processing: boolean;
    recentFailures: Array<{
        id: string;
        to: string;
        subject: string;
        sender: SenderType;
        attempts: number;
        failedAt: string;
        lastError?: string;
    }>;
};

function createEmailJobId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function serializeAttachments(attachments?: EmailAttachment[]): SerializedEmailAttachment[] {
    return (attachments || []).map((item) => ({
        filename: item.filename,
        contentBase64: item.content.toString("base64"),
        contentType: item.contentType || "application/pdf",
    }));
}

function deserializeAttachments(attachments: SerializedEmailAttachment[]): EmailAttachment[] {
    return (attachments || []).map((item) => ({
        filename: item.filename,
        content: Buffer.from(item.contentBase64, "base64"),
        contentType: item.contentType || "application/pdf",
    }));
}

async function readEmailQueue(): Promise<QueuedEmailJob[]> {
    const jobs = await cacheGetJson<QueuedEmailJob[]>(EMAIL_QUEUE_KEY);
    return Array.isArray(jobs) ? jobs : [];
}

async function writeEmailQueue(jobs: QueuedEmailJob[]): Promise<void> {
    await cacheSetJson(EMAIL_QUEUE_KEY, jobs);
}

async function readFailedEmailJobs(): Promise<EmailQueueFailedJob[]> {
    const jobs = await cacheGetJson<EmailQueueFailedJob[]>(EMAIL_QUEUE_FAILED_KEY);
    return Array.isArray(jobs) ? jobs : [];
}

async function writeFailedEmailJobs(jobs: EmailQueueFailedJob[]): Promise<void> {
    await cacheSetJson(EMAIL_QUEUE_FAILED_KEY, jobs);
}

async function recordFailedEmailJob(job: QueuedEmailJob, error: unknown): Promise<void> {
    const failures = await readFailedEmailJobs();
    failures.unshift({
        ...job,
        failedAt: new Date().toISOString(),
        lastError: error instanceof Error ? error.message : "Email delivery failed",
    });
    await writeFailedEmailJobs(failures.slice(0, EMAIL_QUEUE_FAILED_HISTORY_LIMIT));
}

async function enqueueEmailJob(job: QueuedEmailJob): Promise<void> {
    const jobs = await readEmailQueue();
    jobs.push(job);
    await writeEmailQueue(jobs);
}

async function dispatchEmailDirect(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    replyTo?: string;
    sender: SenderType;
    attachments?: EmailAttachment[];
}): Promise<void> {
    const transporter = getTransporter(params.sender);
    if (!transporter) {
        // Keep runtime resilient when SMTP is not configured.
        return;
    }

    const creds = getSenderCredentials(params.sender);
    if (!creds) return;

    await transporter.sendMail({
        from: `${creds.fromName} <${creds.fromAddress}>`,
        to: params.to,
        replyTo: params.replyTo,
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

async function processEmailQueueInternal(): Promise<void> {
    while (true) {
        const jobs = await readEmailQueue();
        const now = Date.now();
        const nextIndex = jobs.findIndex((job) => Number(job?.nextAttemptAt || 0) <= now);
        if (nextIndex === -1) return;

        const [job] = jobs.splice(nextIndex, 1);
        await writeEmailQueue(jobs);
        if (!job) return;

        try {
            await dispatchEmailDirect({
                to: job.to,
                subject: job.subject,
                html: job.html,
                text: job.text,
                replyTo: job.replyTo,
                sender: job.sender,
                attachments: deserializeAttachments(job.attachments),
            });
        } catch (error) {
            if (job.attempts + 1 >= EMAIL_QUEUE_MAX_RETRIES) {
                await recordFailedEmailJob({
                    ...job,
                    attempts: job.attempts + 1,
                }, error);
                continue;
            }

            const retryDelayMs = Math.min(60_000, 5_000 * (job.attempts + 1));
            const retryJob: QueuedEmailJob = {
                ...job,
                attempts: job.attempts + 1,
                nextAttemptAt: Date.now() + retryDelayMs,
                lastError: error instanceof Error ? error.message : "Email delivery failed",
            };
            await enqueueEmailJob(retryJob);
        }
    }
}

export async function processEmailQueue(): Promise<void> {
    if (activeQueueProcessor) {
        await activeQueueProcessor;
        return;
    }

    activeQueueProcessor = processEmailQueueInternal().finally(() => {
        activeQueueProcessor = null;
    });

    await activeQueueProcessor;
}

export async function getEmailQueueStats(): Promise<EmailQueueStats> {
    const jobs = await readEmailQueue();
    const failures = await readFailedEmailJobs();
    const now = Date.now();
    const sortedByCreatedAt = [...jobs].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const sortedByNextAttempt = [...jobs].sort((a, b) => a.nextAttemptAt - b.nextAttemptAt);

    return {
        pending: jobs.length,
        dueNow: jobs.filter((job) => job.nextAttemptAt <= now).length,
        retrying: jobs.filter((job) => job.attempts > 0).length,
        oldestCreatedAt: sortedByCreatedAt[0]?.createdAt || null,
        nextAttemptAt: sortedByNextAttempt[0]?.nextAttemptAt
            ? new Date(sortedByNextAttempt[0].nextAttemptAt).toISOString()
            : null,
        processing: Boolean(activeQueueProcessor),
        recentFailures: failures.map((job) => ({
            id: job.id,
            to: job.to,
            subject: job.subject,
            sender: job.sender,
            attempts: job.attempts,
            failedAt: job.failedAt,
            lastError: job.lastError,
        })),
    };
}

export async function sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    replyTo?: string;
    sender?: SenderType;
    attachments?: EmailAttachment[];
}): Promise<void> {
    const senderType: SenderType = params.sender ?? "noreply";
    await enqueueEmailJob({
        id: createEmailJobId(),
        to: params.to,
        subject: params.subject,
        html: params.html,
        text: params.text,
        replyTo: params.replyTo,
        sender: senderType,
        attachments: serializeAttachments(params.attachments),
        attempts: 0,
        createdAt: new Date().toISOString(),
        nextAttemptAt: Date.now(),
    });

    void processEmailQueue();
}
