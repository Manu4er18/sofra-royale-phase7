import { siteConfig } from "@/config/site";

/**
 * Minimal, inline-styled HTML email templates (email clients ignore
 * external CSS). Warm brand palette to match the site.
 */

const BRAND = "#b8860b";
const INK = "#241a10";
const MUTED = "#6b5d4d";

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#faf6ef;font-family:Helvetica,Arial,sans-serif;color:${INK}">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px">
    <div style="text-align:center;margin-bottom:24px">
      <span style="font-size:22px;font-weight:700;letter-spacing:.5px">${siteConfig.name}</span>
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${BRAND}">${siteConfig.tagline}</div>
    </div>
    <div style="background:#fff;border:1px solid #eadfce;border-radius:12px;padding:28px">
      <h1 style="font-size:20px;margin:0 0 16px">${title}</h1>
      ${body}
    </div>
    <p style="text-align:center;font-size:12px;color:${MUTED};margin-top:24px">
      ${siteConfig.name} · Königsallee 42, 40212 Düsseldorf
    </p>
  </div></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:0 0 16px"><a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:${BRAND};color:#241a10;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;margin-top:8px">${label}</a></p>
  <p style="margin:12px 0 0;font-size:12px;color:${MUTED};word-break:break-all">Falls der Button nicht funktioniert, öffnen Sie diesen Link:<br><a href="${href}" target="_blank" rel="noopener noreferrer" style="color:${BRAND}">${href}</a></p>`;
}

export function orderConfirmationEmail(params: {
  name: string;
  orderNumber: string;
  total: string;
  trackUrl: string;
  isPrepaid: boolean;
}): { subject: string; html: string } {
  return {
    subject: `Bestellbestätigung ${params.orderNumber} — ${siteConfig.name}`,
    html: layout(
      "Vielen Dank für Ihre Bestellung!",
      `<p style="margin:0 0 12px">Hallo ${params.name},</p>
       <p style="margin:0 0 12px">wir haben Ihre Bestellung <strong>${params.orderNumber}</strong> erhalten${
         params.isPrepaid ? " und Ihre Zahlung ist eingegangen" : ""
       }. Gesamtbetrag: <strong>${params.total}</strong>.</p>
       <p style="margin:0 0 16px">Sie können den Status jederzeit verfolgen:</p>
       ${button(params.trackUrl, "Bestellung verfolgen")}`,
    ),
  };
}

export function orderStatusEmail(params: {
  name: string;
  orderNumber: string;
  statusLabel: string;
  message: string;
  trackUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `${params.orderNumber}: ${params.statusLabel}`,
    html: layout(
      params.statusLabel,
      `<p style="margin:0 0 12px">Hallo ${params.name},</p>
       <p style="margin:0 0 16px">${params.message}</p>
       ${button(params.trackUrl, "Bestellung ansehen")}`,
    ),
  };
}

export function reservationConfirmedEmail(params: {
  name: string;
  dateLabel: string;
  guests: number;
}): { subject: string; html: string } {
  return {
    subject: `Reservierung bestätigt — ${siteConfig.name}`,
    html: layout(
      "Ihre Reservierung ist bestätigt",
      `<p style="margin:0 0 12px">Hallo ${params.name},</p>
       <p style="margin:0 0 12px">wir freuen uns auf Sie am <strong>${params.dateLabel}</strong> für ${params.guests} ${
         params.guests === 1 ? "Person" : "Personen"
       }.</p>
       <p style="margin:0">Bis bald bei ${siteConfig.name}!</p>`,
    ),
  };
}

export function emailVerificationEmail(params: {
  name: string;
  verifyUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `E-Mail-Adresse bestätigen — ${siteConfig.name}`,
    html: layout(
      "Bitte bestätigen Sie Ihre E-Mail-Adresse",
      `<p style="margin:0 0 12px">Hallo ${params.name},</p>
       <p style="margin:0 0 16px">willkommen bei ${siteConfig.name}. Bitte bestätigen Sie Ihre E-Mail-Adresse, damit Ihr Konto vollständig aktiviert ist.</p>
       ${button(params.verifyUrl, "E-Mail bestätigen")}
       <p style="font-size:12px;color:${MUTED};margin:18px 0 0">Dieser Link ist 24 Stunden gültig.</p>`,
    ),
  };
}

export function passwordResetEmail(params: {
  name: string;
  resetUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `Passwort zurücksetzen — ${siteConfig.name}`,
    html: layout(
      "Passwort zurücksetzen",
      `<p style="margin:0 0 12px">Hallo ${params.name},</p>
       <p style="margin:0 0 16px">wir haben eine Anfrage erhalten, Ihr Passwort zurückzusetzen. Wenn Sie das waren, wählen Sie bitte ein neues Passwort.</p>
       ${button(params.resetUrl, "Neues Passwort wählen")}
       <p style="font-size:12px;color:${MUTED};margin:18px 0 0">Dieser Link ist 60 Minuten gültig. Wenn Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.</p>`,
    ),
  };
}

export function genericEmail(params: {
  title: string;
  name: string;
  message: string;
  href?: string;
  hrefLabel?: string;
}): { subject: string; html: string } {
  return {
    subject: params.title,
    html: layout(
      params.title,
      `<p style="margin:0 0 12px">Hallo ${params.name},</p>
       <p style="margin:0 0 16px">${params.message}</p>
       ${params.href ? button(params.href, params.hrefLabel ?? "Ansehen") : ""}`,
    ),
  };
}
