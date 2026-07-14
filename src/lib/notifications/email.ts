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

function getSmtpPort(): number {
  const port = Number(process.env.EMAIL_SERVER_PORT ?? 465);
  return Number.isFinite(port) ? port : 465;
}

function getSmtpSecure(port: number): boolean {
  const explicit = process.env.EMAIL_SERVER_SECURE;
  if (explicit) return explicit === "true";
  return port === 465;
}

function getTransporter(): nodemailer.Transporter | null {
  if (!isEmailConfigured()) return null;
  if (!transporter) {
    const port = getSmtpPort();
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_SERVER_HOST ?? "smtp.gmail.com",
      port,
      secure: getSmtpSecure(port),
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
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const client = getTransporter();
  if (!client) {
    const error =
      "SMTP is not configured: EMAIL_SERVER_USER or EMAIL_SERVER_PASSWORD is missing.";
    console.error(`[email] ${error}`, {
      to: params.to,
      subject: params.subject,
      hasUser: Boolean(process.env.EMAIL_SERVER_USER),
      hasPassword: Boolean(process.env.EMAIL_SERVER_PASSWORD),
    });
    return { ok: false, error };
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
    const message = error instanceof Error ? error.message : String(error);
    console.error("[email] send failed", {
      message,
      name: error instanceof Error ? error.name : "UnknownError",
      code:
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : undefined,
      command:
        typeof error === "object" && error && "command" in error
          ? String(error.command)
          : undefined,
      response:
        typeof error === "object" && error && "response" in error
          ? String(error.response)
          : undefined,
      to: params.to,
      subject: params.subject,
      host: process.env.EMAIL_SERVER_HOST ?? "smtp.gmail.com",
      port: getSmtpPort(),
      user: process.env.EMAIL_SERVER_USER,
    });
    return { ok: false, error: message };
  }
}
