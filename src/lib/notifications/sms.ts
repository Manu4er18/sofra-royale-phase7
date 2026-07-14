import "server-only";

import twilio from "twilio";

/**
 * Optional SMS via Twilio, with graceful degradation.
 * Without TWILIO_* config, sends are logged and skipped.
 */
let client: ReturnType<typeof twilio> | null = null;

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER,
  );
}

function getTwilio() {
  if (!isSmsConfigured()) return null;
  if (!client) {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!,
    );
  }
  return client;
}

export async function sendSms(params: {
  to: string;
  body: string;
}): Promise<{ ok: boolean }> {
  const c = getTwilio();
  if (!c) {
    console.info(
      `[sms] (skipped — Twilio unset) → ${params.to}: ${params.body}`,
    );
    return { ok: false };
  }
  try {
    await c.messages.create({
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: params.to,
      body: params.body,
    });
    return { ok: true };
  } catch (error) {
    console.error("[sms] send failed", error);
    return { ok: false };
  }
}
