import type { Metadata, Viewport } from "next";

import { siteConfig } from "@/config/site";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  applicationName: siteConfig.name,
  category: "restaurant",
  title: {
    default: `${siteConfig.name} | Dubai & Turkish Fine Dining`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  keywords: [
    "Sofra Royale",
    "Sofra Royale Restaurant",
    "Dubai Restaurant",
    "Turkish Restaurant",
    "tuerkisches Restaurant",
    "Dubai Küche",
    "türkische Küche",
    "Halal Restaurant",
    "Fine Dining",
    "Grill Spezialitäten",
    "Mezze",
    "Baklava",
    "Restaurant Lieferung",
    "Online bestellen",
    "Reservierung",
  ],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  alternates: {
    canonical: "/",
    languages: {
      de: "/",
      en: "/",
      tr: "/",
      ar: "/",
    },
  },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: `${siteConfig.name} | Dubai & Turkish Fine Dining`,
    description: siteConfig.description,
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} — ${siteConfig.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.name} | Dubai & Turkish Fine Dining`,
    description: siteConfig.description,
    images: ["/opengraph-image"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf6ef" },
    { media: "(prefers-color-scheme: dark)", color: "#17110c" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: next-themes mutates <html> class pre-paint.
    <html lang="de" suppressHydrationWarning>
      <body
        className="min-h-screen font-sans"
        style={{
          ["--font-sans" as string]:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          ["--font-display" as string]: 'Georgia, "Times New Roman", serif',
        }}
      >
        {/* Keyboard skip link — first focusable element (accessibility). */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground focus:shadow-premium-lg"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            borderWidth: 0,
          }}
        >
          Zum Inhalt springen
        </a>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
