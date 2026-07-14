# Sofra Royale — Premium Dubai & Turkish Restaurant Platform

A production-grade restaurant e-commerce platform: customer storefront,
online ordering with Stripe, reservations, live chat, loyalty program and a
full admin dashboard.

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS ·
shadcn-style UI · Framer Motion · PostgreSQL · Prisma · Auth.js v5 · Zod ·
React Hook Form · Stripe · Cloudinary · Resend · Pusher

> **Current status: Phase 7 complete — the build is feature-complete.**
> The final phase adds SEO (dynamic `sitemap.xml`, `robots.txt`,
> schema.org JSON-LD for the restaurant, menu items, breadcrumbs and
> FAQ, Open Graph image, PWA manifest), security hardening (a strict
> Content-Security-Policy plus HSTS, `X-Frame-Options`, `X-Content-Type-Options`,
> `Referrer-Policy` and `Permissions-Policy` headers), accessibility
> (skip-to-content link, landmark `main` ids), the German legal &
> content pages every shop needs (Impressum, Datenschutz, AGB,
> Widerruf, Cookie-Richtlinie, Lieferbedingungen, Allergene, Über uns,
> Kontakt, FAQ), a Vitest unit-test suite for the pricing/coupon/VAT/
> order-number core, and deployment tooling (`vercel.json`,
> `docs/DEPLOYMENT.md`). Phases 1–6 delivered the storefront, ordering,
> Stripe payments, accounts, admin dashboard, realtime chat/tracking and
> notifications. See `docs/ARCHITECTURE.md` for the full roadmap.

---

## 1. Requirements

- Node.js ≥ 20
- PostgreSQL ≥ 14 (local, or Supabase / Neon / Railway)
- npm ≥ 10

## 2. Installation

```bash
# 1. Install dependencies (also runs `prisma generate` via postinstall)
npm install

# 2. Configure environment
cp .env.example .env
# → edit .env: set DATABASE_URL, DIRECT_URL and AUTH_SECRET (see below)

# 3. Create the database schema
npm run db:migrate        # creates + applies migrations (dev)

# 4. Seed realistic demo data (dishes, users, coupons, zones …)
npm run db:seed

# 5. Start the dev server
npm run dev               # http://localhost:3000
```

### Generate AUTH_SECRET

```bash
openssl rand -base64 32
```

### Local PostgreSQL (quick start)

```bash
createdb sofra_royale
# DATABASE_URL="postgresql://<user>@localhost:5432/sofra_royale?schema=public"
# DIRECT_URL   — same value as DATABASE_URL for local Postgres
```

For **Supabase/Neon**: use the *pooled* connection string as `DATABASE_URL`
and the *direct* connection string as `DIRECT_URL`.

## 3. Development logins (from seed)

| Role         | E-mail                        | Password         |
| ------------ | ----------------------------- | ---------------- |
| Super Admin  | `admin@sofra-royale.example`  | `Admin!Sofra2026`|
| Customer     | `demo@sofra-royale.example`   | `Demo!Sofra2026` |

Override via `SEED_ADMIN_*` / `SEED_CUSTOMER_*` env vars **before** seeding.
⚠️ Change these before any non-local deployment.

## 4. Commands

| Command                | Purpose                                    |
| ---------------------- | ------------------------------------------ |
| `npm run dev`          | Development server                         |
| `npm run build`        | Production build                           |
| `npm run start`        | Serve the production build                 |
| `npm run typecheck`    | TypeScript check (`tsc --noEmit`)          |
| `npm run test`         | Run the Vitest unit suite once             |
| `npm run test:watch`   | Vitest in watch mode                       |
| `npm run test:coverage`| Vitest with a V8 coverage report           |
| `npm run lint`         | ESLint                                     |
| `npm run format`       | Prettier write                             |
| `npm run db:migrate`   | Create/apply dev migrations                |
| `npm run db:deploy`    | Apply migrations in production             |
| `npm run db:seed`      | Seed demo data (idempotent)                |
| `npm run db:studio`    | Prisma Studio (DB browser)                 |
| `npm run db:reset`     | Drop, re-migrate and re-seed               |

## 5. Google OAuth setup (optional in dev)

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   → Create OAuth client (Web application).
2. Authorized redirect URI:
   `http://localhost:3000/api/auth/callback/google`
   (plus your production URL later).
3. Set `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` in `.env`.

Credentials login works without any OAuth configuration.

## 6. Stripe setup (required for online payments)

1. Create a Stripe account → [dashboard.stripe.com](https://dashboard.stripe.com)
   → Developers → API keys (use **test mode** keys in development).
2. In `.env` set:
   - `STRIPE_SECRET_KEY=sk_test_…`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…`
3. Webhook (local development):
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   # copy the printed whsec_… into STRIPE_WEBHOOK_SECRET
   ```
4. Webhook (production): Dashboard → Developers → Webhooks → add endpoint
   `https://your-domain.com/api/webhooks/stripe` with events
   `payment_intent.succeeded`, `payment_intent.payment_failed`,
   `payment_intent.canceled`; put its signing secret into
   `STRIPE_WEBHOOK_SECRET`.
5. Test card: `4242 4242 4242 4242`, any future date, any CVC.

Without Stripe keys the shop still works — customers can order with cash
on delivery / pay at pickup; the online-payment option explains it is
unavailable.

Cloudinary (Phase 5) and Resend/Twilio/Pusher (Phase 6) activate later;
`.env.example` already lists every variable.

## 7. Realtime, e-mail & SMS setup (Phase 6, all optional)

Every provider below degrades gracefully — without keys the feature
falls back (chat/tracking update on refresh; e-mail/SMS are logged and
skipped) and the rest of the app is unaffected.

**Pusher (live chat + realtime tracking + notification toasts)**
1. Create an app at [pusher.com](https://pusher.com) → Channels.
2. Set `PUSHER_APP_ID`, `PUSHER_SECRET`, `NEXT_PUBLIC_PUSHER_KEY`,
   `NEXT_PUBLIC_PUSHER_CLUSTER` in `.env`.
3. Enable client events is NOT required — the app uses server triggers +
   authenticated private channels (`/api/pusher/auth`).

**Resend (transactional e-mail)**
1. Get an API key at [resend.com](https://resend.com), verify a sending
   domain.
2. Set `RESEND_API_KEY` and `EMAIL_FROM` (e.g. `Sofra Royale <no-reply@yourdomain>`).

**Twilio (optional SMS)**
1. From the [Twilio console](https://console.twilio.com): `TWILIO_ACCOUNT_SID`,
   `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`.

## 8. Testing

Unit tests live in `tests/` and cover the pure, framework-free core in
`src/lib` — coupon discount math, contained-VAT extraction, VAT-rate
selection, loyalty-point accrual, order-number formatting/validation,
price formatting, slugification and the order-status transition table.
These modules intentionally avoid `server-only`/database imports so the
suite runs in a plain Node environment with no mocking or database:

```bash
npm run test            # one-shot
npm run test:watch      # watch mode
npm run test:coverage   # with coverage
```

## 9. Deployment (target: Vercel + managed Postgres)

A full, checklist-driven guide lives in **`docs/DEPLOYMENT.md`**; the short
version:

1. Push the repo to GitHub and import into Vercel (`vercel.json` is
   included and pins the framework, regions and function limits).
2. Set all environment variables from `.env.example` in Vercel — in
   particular `NEXT_PUBLIC_APP_URL` must be your real domain so SEO
   canonicals, `sitemap.xml`, `robots.txt` and Open Graph tags resolve
   correctly.
3. Build command: `npm run build` (default). Prisma client is generated by
   the `postinstall` hook.
4. Run `npm run db:deploy && npm run db:seed` once against the production
   database, then register the Stripe production webhook (see §6).

## 10. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `PrismaClientInitializationError` | Check `DATABASE_URL` / DB is running |
| `Invalid AUTH_SECRET` / JWT errors | Set a 32-byte `AUTH_SECRET`, restart |
| Google fonts fail in offline envs | Build machines need network for `next/font` |
| Migrations fail on Supabase | Ensure `DIRECT_URL` uses the non-pooled port |
| Seed fails with FK errors | `npm run db:reset` for a clean slate |

## 11. Project structure

See `docs/ARCHITECTURE.md` for the annotated folder layout, database model
map, security model and the phase-by-phase roadmap.
