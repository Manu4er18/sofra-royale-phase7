import type { NextConfig } from "next";

/**
 * Next.js configuration for Sofra Royale.
 *
 * - Remote image patterns cover Cloudinary (media CDN) and Unsplash
 *   (development/seed imagery only — replace with your own food
 *   photography in production).
 * - Security headers (incl. a Content-Security-Policy) are applied
 *   globally; route-level auth protection lives in `src/middleware.ts`.
 */

/**
 * Content-Security-Policy.
 *
 * Notes on the allowances:
 * - 'unsafe-inline' on script/style is required by Next.js's inline
 *   bootstrap and Tailwind's injected styles; scripts are otherwise
 *   locked to self + the payment/realtime SDKs.
 * - Stripe (js.stripe.com + api), Pusher (ws + sockjs), Cloudinary and
 *   Unsplash images, Google Fonts, and Google OAuth are allow-listed.
 */
const isProduction = process.env.NODE_ENV === "production";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://*.pusher.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://*.stripe.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://accounts.google.com",
  "connect-src 'self' https://api.stripe.com https://*.pusher.com wss://*.pusher.com https://*.cloudinary.com",
  "form-action 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  isProduction ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(self), microphone=(self), geolocation=(self), payment=(self)",
  },
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "10.19.163.84",
    "*.local",
  ],
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24,
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
