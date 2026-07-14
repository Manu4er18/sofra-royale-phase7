import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";

/**
 * Default Open Graph image (rendered at the edge). Product pages can add
 * their own; this is the site-wide fallback for social shares.
 */
export const runtime = "edge";
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg,#241a10 0%,#3b2a17 100%)",
          color: "#f3ead9",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 34,
            letterSpacing: 8,
            textTransform: "uppercase",
            color: "#c9a24b",
          }}
        >
          {siteConfig.tagline}
        </div>
        <div style={{ fontSize: 96, fontWeight: 700, marginTop: 12 }}>
          {siteConfig.name}
        </div>
        <div style={{ fontSize: 30, marginTop: 20, opacity: 0.8 }}>
          Wo Dubai auf den Bosporus trifft
        </div>
      </div>
    ),
    size,
  );
}
