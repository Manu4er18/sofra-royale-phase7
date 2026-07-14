import "server-only";

import * as nodemailer from "nodemailer";

import { siteConfig } from "@/config/site";

/**
 * Transactional email via SMTP, with graceful degradation.
 * Without EMAIL_SERVER_USER / EMAIL_SERVER_PASSWORD the send is logged and
 * skipped — the rest of the flow (DB notification, realtime) is unaffected.
 */
let transporter: nodemailer.Transporter | null = null;

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD,
  );
}

function getTransporter(): nodemailer.Transporter | null {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST ?? "smtp.gmail.com",
      port: Number(process.env.EMAIL_SERVER_PORT ?? 465),
      secure: (process.env.EMAIL_SERVER_SECURE ?? "true") === "true",
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
    });
  }
  return transporter;
}

const FROM =
  process.env.EMAIL_FROM ??
  `${siteConfig.name} <${process.env.EMAIL_SERVER_USER ?? "no-reply@example.com"}>`;

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean }> {
  const client = getTransporter();
  if (!client) {
    console.info(
      `[email] (skipped — SMTP env unset) → ${params.to}: ${params.subject}`,
    );
    return { ok: false };
  }
  try {
    await client.sendMail({
      from: FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
    return { ok: true };
  } catch (error) {
    console.error("[email] send failed", error);
    return { ok: false };
  }
}
