# Deployment Guide — Sofra Royale

This guide takes the platform from a fresh clone to a live production
deployment on **Vercel** with a managed PostgreSQL database. It is
opinionated toward Vercel + Neon/Supabase but nothing here is
Vercel-specific except `vercel.json`; any Node host that can run
`next build` / `next start` works.

---

## 0. Pre-flight checklist

- [ ] Node.js ≥ 20 and npm ≥ 10 locally
- [ ] A managed PostgreSQL database (Neon, Supabase or Railway)
- [ ] A Stripe account (test + live keys)
- [ ] A domain you control (for canonical URLs, OG tags and Stripe webhooks)
- [ ] Optional: Pusher, Resend, Twilio and Cloudinary accounts

The app runs **without** the optional providers — every one degrades
gracefully (see the README). Stripe is only required for online card
payments; cash-on-delivery / pay-at-pickup work regardless.

---

## 1. Provision the database

Create a Postgres instance and grab **two** connection strings:

| Variable       | Which string                                            |
| -------------- | ------------------------------------------------------- |
| `DATABASE_URL` | the **pooled** connection (PgBouncer) — used at runtime |
| `DIRECT_URL`   | the **direct** connection — used for migrations         |

For Neon/Supabase the pooled string ends in `?pgbouncer=true` (Neon) or
uses port `6543` (Supabase); the direct string uses the standard port
`5432`. Local Postgres can use the same value for both.

---

## 2. Configure environment variables

Copy `.env.example` and fill every value. The ones that **must** be set
for a correct production deployment:

| Variable                             | Notes                                                  |
| ------------------------------------ | ------------------------------------------------------ |
| `DATABASE_URL`, `DIRECT_URL`         | from step 1                                            |
| `AUTH_SECRET`                        | `openssl rand -base64 32`                              |
| `AUTH_URL`                           | your production origin, e.g. `https://sofra-royale.de` |
| `NEXT_PUBLIC_APP_URL`                | same origin — drives canonicals, sitemap, OG           |
| `STRIPE_SECRET_KEY`                  | `sk_live_…`                                            |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_live_…`                                            |
| `STRIPE_WEBHOOK_SECRET`              | from the production webhook (step 5)                   |

> **`NEXT_PUBLIC_APP_URL` is not optional in production.** SEO canonical
> tags, `sitemap.xml`, `robots.txt` and Open Graph URLs are all derived
> from it. If it is wrong, search engines index the wrong host.

Optional providers: `PUSHER_*` / `NEXT_PUBLIC_PUSHER_*` (realtime),
`RESEND_API_KEY` + `EMAIL_FROM` (email), `TWILIO_*` (SMS),
`NEXT_PUBLIC_CLOUDINARY_*` (image uploads), `AUTH_GOOGLE_ID` /
`AUTH_GOOGLE_SECRET` (Google sign-in), and the `SEED_ADMIN_*` /
`SEED_CUSTOMER_*` overrides.

> ⚠️ **Change the seed admin/customer credentials** before seeding a
> public database. Set `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`,
> `SEED_CUSTOMER_EMAIL`, `SEED_CUSTOMER_PASSWORD` first.

---

## 3. Import into Vercel

1. Push the repository to GitHub/GitLab.
2. Vercel → **New Project** → import the repo.
3. Framework preset is detected as **Next.js**; `vercel.json` already
   pins the framework, the `fra1` (Frankfurt) region — closest to the
   German market — and raises the Stripe webhook function timeout to 30 s.
4. Paste every environment variable from step 2 into **Settings →
   Environment Variables** (Production, and Preview if you want preview
   deploys to work).
5. Leave the build command as `npm run build`. Prisma Client is generated
   automatically by the `postinstall` hook.

---

## 4. Run migrations & seed (once)

Migrations are **not** run automatically by the Vercel build (a build
should never mutate a database). Run them once against production, either
from your machine with the production env vars loaded, or from a one-off
CI step:

```bash
# with production DATABASE_URL + DIRECT_URL in your shell/.env
npm run db:deploy      # prisma migrate deploy — applies committed migrations
npm run db:seed        # idempotent: dishes, categories, coupons, zones, admin
```

`db:seed` is safe to re-run; it upserts. For a clean slate on a
throwaway database use `npm run db:reset` (destructive — never in prod).

---

## 5. Register the Stripe production webhook

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://your-domain.com/api/webhooks/stripe`.
3. Events: `payment_intent.succeeded`, `payment_intent.payment_failed`,
   `payment_intent.canceled`.
4. Copy the endpoint's **signing secret** (`whsec_…`) into
   `STRIPE_WEBHOOK_SECRET` in Vercel and redeploy.

The webhook is the source of truth for marking orders paid, so it must be
reachable and its secret correct before taking real orders.

---

## 6. Post-deploy smoke test

- [ ] Home page renders; `/sitemap.xml` and `/robots.txt` return 200
- [ ] `robots.txt` `Sitemap:` line points at your real domain
- [ ] Register a customer, log in, log out
- [ ] Add to cart → checkout → pay with a live/test card → order appears
- [ ] Stripe webhook shows a `200` in the Stripe dashboard; order flips to
      **paid**
- [ ] Admin login works; order shows in `/admin/orders`; advance a status
- [ ] Response headers include `Content-Security-Policy` and
      `Strict-Transport-Security` (check DevTools → Network → the document)
- [ ] Legal pages resolve: `/imprint`, `/privacy`, `/terms`, `/refunds`,
      `/cookies`

---

## 7. Security & compliance notes

- The strict **Content-Security-Policy** in `next.config.ts` allowlists
  only Stripe, Pusher, Cloudinary and Google (for OAuth). If you add a
  script/style/image/connection to another origin, widen the matching
  CSP directive or the browser will block it.
- **HSTS** is sent with a long `max-age`; only enable it once the domain
  is HTTPS-only (Vercel handles TLS automatically).
- The German legal pages (`Impressum`, `Datenschutzerklärung`, `AGB`,
  `Widerrufsbelehrung`, `Cookie-Richtlinie`) are **templates** and carry
  a visible operator notice. **They must be reviewed by a lawyer** and the
  operator's real details filled in (via the admin content settings)
  before going live. This is a legal requirement in Germany, not an
  optional polish step.
- Rotate `AUTH_SECRET` and all provider keys if they were ever committed
  or shared; never commit a real `.env`.

---

## 8. Rolling out updates

```bash
# after committing schema changes:
npm run db:migrate      # locally, creates a new migration
git push                # Vercel builds & deploys the branch
npm run db:deploy       # apply the new migration to production
```

Always deploy code that is backward-compatible with the current schema,
apply the migration, then deploy code that depends on it — the standard
expand/contract pattern — so there is no window where the running code
and the database disagree.
