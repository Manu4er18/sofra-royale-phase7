import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

import { siteConfig } from "@/config/site";

/**
 * Minimal, centered layout for auth pages — no full site chrome, just a
 * compact branded frame for login, registration and recovery flows.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{
        position: "relative",
        display: "flex",
        minHeight: "100vh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        padding: "28px 16px 24px",
        background:
          "radial-gradient(circle at top, rgba(214,168,61,.14), transparent 34%), #11100f",
        color: "#f8efe3",
      }}
    >
      <Link
        href="/"
        className="mb-8 flex flex-col items-center gap-3"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          marginBottom: 22,
          color: "inherit",
          textAlign: "center",
          textDecoration: "none",
        }}
        aria-label={`${siteConfig.name} — Startseite`}
      >
        <span
          className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-premium"
          style={{
            display: "flex",
            width: 48,
            height: 48,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 9999,
            background: "rgba(255,255,255,.04)",
            color: "#f8efe3",
            boxShadow: "0 18px 40px rgba(0,0,0,.28)",
          }}
        >
          <UtensilsCrossed className="h-6 w-6" aria-hidden />
        </span>
        <span className="text-center">
          <span
            className="block font-display text-2xl font-semibold"
            style={{
              display: "block",
              fontFamily: "Georgia, serif",
              fontSize: 36,
              fontWeight: 700,
              lineHeight: 1.1,
            }}
          >
            {siteConfig.name}
          </span>
          <span
            className="text-xs uppercase tracking-[0.25em] text-gold"
            style={{
              display: "block",
              marginTop: 6,
              color: "#f2e0bd",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
            }}
          >
            {siteConfig.tagline}
          </span>
        </span>
      </Link>

      <main className="w-full max-w-md" style={{ width: "100%", maxWidth: 448 }}>
        {children}
      </main>
    </div>
  );
}
