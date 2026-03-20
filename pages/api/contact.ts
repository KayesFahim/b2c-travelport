import type { NextApiRequest, NextApiResponse } from "next";

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
};

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidPhone(value: string): boolean {
  const cleaned = value.replace(/[\s()+-]/g, "");
  return /^\d{7,15}$/.test(cleaned);
}

export default function handler(
  req: NextApiRequest,
  res: NextApiResponse<ContactResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

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

  return res.status(200).json({
    message: "Thanks for contacting Fly Jatt. Our team will reply shortly.",
    receivedAt: new Date().toISOString(),
  });
}
