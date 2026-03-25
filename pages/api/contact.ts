import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "../../src/server/prisma";
import { sendEmail } from "../../src/server/email/mailer";
import { buildContactSubmissionTemplate } from "../../src/server/email/templates";

type ContactBody = {
  name?: string;
  email?: string;
  phone?: string;
  subject?: string;
  message?: string;
};

type ContactResponse = {
  message: string;
  receivedAt?: string;
  email?: string;
  phone?: string;
  address?: string;
  supportHours?: string;
};

type ContactSettings = {
  email: string;
  phone: string;
  address: string;
  supportHours: string;
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string): boolean {
  const cleaned = value.replace(/[\s()+-]/g, "");
  return /^\d{7,15}$/.test(cleaned);
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ContactResponse>
) {
  if (req.method === "GET") {
    return handleGet(req, res);
  }

  if (req.method === "POST") {
    return handlePost(req, res);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ message: "Method not allowed" });
}

async function readContactSettings(): Promise<ContactSettings> {
  try {
    const rows = await prisma.siteSettings.findMany({
      where: {
        OR: [{ section: "contact" }, { section: "homepage" }],
      },
    });

    const settings: Record<string, string> = {};
    rows.forEach((row) => {
      settings[`${row.section}.${row.key}`] = String(row.value ?? "");
    });

    return {
      email:
        settings["contact.email"] ||
        settings["homepage.contactEmail"] ||
        String(process.env.CONTACT_EMAIL || "info@flyjatt.com"),
      phone:
        settings["contact.phone"] ||
        settings["homepage.contactPhone"] ||
        "+88 01736-987906",
      address:
        settings["contact.address"] ||
        "DCC7, North Ibrahimpur, Kafrul, Dhaka-1206, Bangladesh",
      supportHours:
        settings["contact.supportHours"] ||
        "24/7 online support",
    };
  } catch {
    return {
      email: String(process.env.CONTACT_EMAIL || "info@flyjatt.com"),
      phone: "+88 01736-987906",
      address: "DCC7, North Ibrahimpur, Kafrul, Dhaka-1206, Bangladesh",
      supportHours: "24/7 online support",
    };
  }
}

async function handleGet(
  _req: NextApiRequest,
  res: NextApiResponse<ContactResponse>
) {
  const contact = await readContactSettings();
  return res.status(200).json({
    message: "Contact info loaded.",
    email: contact.email,
    phone: contact.phone,
    address: contact.address,
    supportHours: contact.supportHours,
  });
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ContactResponse>
) {
  const contact = await readContactSettings();

  const body = (req.body ?? {}) as ContactBody;
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const subject = String(body.subject ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (!name || name.length < 2) {
    return res.status(400).json({ message: "Name must be at least 2 characters." });
  }
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ message: "Please provide a valid email address." });
  }
  if (!subject) {
    return res.status(400).json({ message: "Subject is required." });
  }
  if (!message || message.length < 10) {
    return res
      .status(400)
      .json({ message: "Message must be at least 10 characters." });
  }
  if (phone && !isValidPhone(phone)) {
    return res.status(400).json({ message: "Please provide a valid phone number." });
  }

  // Keep contact submissions in server logs for now.
  // If needed later, this can be forwarded to email/CRM from here.
  console.info("[contact] submission received", {
    name,
    email,
    phone: phone || null,
    subject,
    message,
    receivedAt: new Date().toISOString(),
  });

  const template = buildContactSubmissionTemplate({
    name,
    email,
    phone,
    subjectLine: subject,
    message,
  });

  await sendEmail({
    to: contact.email,
    sender: "contact",
    replyTo: email,
    subject: template.subject,
    html: template.html,
    text: template.text,
  });

  return res.status(200).json({
    message: "Thanks for contacting Fly Jatt. Our team will reply shortly.",
    receivedAt: new Date().toISOString(),
  });
}
