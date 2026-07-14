# Sofra Royale — Architecture

## 1. Technology stack (pinned in package.json)

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) + React 19 | RSC-first, server actions, edge middleware |
| Language | TypeScript (strict, `noUncheckedIndexedAccess`) | End-to-end type safety |
| Styling | Tailwind CSS 3.4 + CSS-variable design tokens | Light/dark theming from one source of truth |
| UI | shadcn-style components (Radix primitives, in-repo) | Accessible, fully ownable components |
| Motion | Framer Motion | Reduced-motion-aware page/section animation |
| Database | PostgreSQL + Prisma ORM | Relational integrity for orders/payments |
| Auth | Auth.js v5 (JWT strategy + Prisma adapter) | Credentials + Google, edge-safe middleware |
| Validation | Zod (+ React Hook Form on the client) | One schema per boundary, server re-validates |
| Payments | Stripe (Phase 3) | PaymentIntents + webhooks, no card data stored |
| Media | Cloudinary (Phase 5) | Signed uploads, transformations |
| E-mail | Resend (Phase 6) | Transactional templates |
| Realtime | Pusher Channels (Phase 6) | Live chat + order status |
| Cache/limits | In-memory now → Upstash Redis (documented swap) | Rate limiting, cart cache |

## 2. Architectural principles

1. **Server is the source of truth.** Prices, totals, coupons, stock and
   permissions are always recomputed/validated server-side. The client never
   sends a price — only IDs and quantities (`CartItem.selections`).
2. **Layered modules.**
   `app/` (routes, thin) → `actions/` + `app/api/` (transport, Zod-guarded)
   → `lib/` services (business logic) → `lib/db` (Prisma).
   UI never imports Prisma; server-only modules declare `import "server-only"`.
3. **Defense in depth for authz.** Edge middleware gates route groups →
   layouts re-check the session → server actions call `requireRole()` →
   fine-grained Role/Permission checks in services (Phase 5+).
4. **Money is integer cents.** All amounts are `Int` (EUR cents); VAT is
   recorded per order line (`OrderItem.taxRate`, German 7 %/19 % model).
5. **Snapshots over joins for orders.** Order lines denormalize the product
   name/price/options at purchase time; catalog edits or deletions never
   corrupt history (FKs are `SetNull`, snapshots remain).
6. **Translatable by design.** `*Translation` tables (de default; en/tr/ar)
   and a `Locale` enum; no visible strings hardcoded once i18n routing lands
   (Phase 2 groundwork, full switch in later phases; Arabic gets RTL).
7. **Idempotent seeds & migrations** so every environment is reproducible.

## 3. Folder structure

```
sofra-royale/
├── prisma/
│   ├── schema.prisma        # ~55 models — full platform schema (see §4)
│   └── seed.ts              # realistic Dubai/Turkish data, idempotent
├── docs/                    # this file + phase guides
├── src/
│   ├── middleware.ts        # Edge auth gate for /admin + /account
│   ├── app/
│   │   ├── layout.tsx       # fonts, providers, metadata
│   │   ├── page.tsx         # homepage
│   │   ├── loading.tsx / error.tsx / global-error.tsx / not-found.tsx
│   │   ├── (auth)/          # login, register (centered layout)
│   │   ├── account/         # customer area (guarded layout)
│   │   ├── admin/           # staff dashboard (role-guarded layout)
│   │   └── api/auth/[...nextauth]/route.ts
│   ├── actions/             # server actions (Zod-validated, rate-limited)
│   │   └── auth/register.ts
│   ├── components/
│   │   ├── ui/              # design-system primitives (button, form, …)
│   │   ├── layout/          # header, footer, theme toggle, user nav
│   │   ├── auth/            # login/register forms, Google button
│   │   └── shared/          # FadeIn and other cross-cutting pieces
│   ├── config/              # site.ts (brand), nav.ts (single nav source)
│   ├── hooks/               # client hooks (grows in Phase 2)
│   ├── lib/
│   │   ├── db.ts            # Prisma singleton
│   │   ├── utils.ts         # cn, formatPrice, slugify …
│   │   ├── auth/            # config (edge-safe), index (full), rbac, rate-limit
│   │   └── validations/     # Zod schemas per domain
│   └── types/               # next-auth session augmentation
├── .env.example             # every variable, documented
└── tailwind.config.ts       # token-driven theme (gold/coffee/cream)
```

Planned expansions keep the same shape: `src/lib/services/` (cart, order,
payment, coupon, loyalty…), `src/emails/`, `src/i18n/`, `tests/`.

## 4. Database model map (prisma/schema.prisma)

- **Identity & access:** User, UserProfile, Address, Account, Session,
  VerificationToken, PasswordResetToken, LoginHistory, Role, Permission,
  RolePermission, UserRole2 (assignment; `UserRole` enum handles coarse roles)
- **Catalog:** Cuisine(+Translation), Category(+Translation),
  Product(+Translation, Image, Video, Relation), Ingredient,
  ProductIngredient, Allergen, ProductAllergen, ProductVariation,
  ProductOptionGroup, ProductOption, ProductAddon
- **Commerce:** Cart, CartItem, Favorite, Order, OrderItem,
  OrderStatusHistory, Payment, Refund, Coupon, CouponUsage, DeliveryZone, Tax
- **Engagement:** Review(+Image, Reply), Reservation, RestaurantTable,
  ReservationBlackout, ChatConversation, ChatMessage, Notification,
  LoyaltyAccount, LoyaltyTransaction
- **Content & ops:** BlogPost, BlogCategory, GalleryItem,
  NewsletterSubscriber, SiteSetting, PageContent, Faq, InventoryLog,
  AuditLog, ActivityLog

Key integrity rules: unique slugs/codes everywhere; cascade deletes for
user-owned children; `SetNull` + snapshots for order references; composite
PKs on join tables; indexes on every hot filter (status, category, price,
rating, createdAt, postal code).

## 5. Authentication flow

- **Credentials:** bcrypt (cost 12) verify → constant-time dummy compare for
  unknown emails → LoginHistory row → JWT with `id` + `role`.
- **Google OAuth:** Prisma adapter persists User/Account;
  `events.createUser` provisions UserProfile + LoyaltyAccount.
- **Sessions:** JWT (30 d) so the edge middleware authorizes without DB
  access; `session.user.id/role` typed via module augmentation.
- **Protection:** rate limiting (login 10/15 min per email, register 5/h per
  IP), enumeration-resistant responses, secure cookies (Auth.js defaults),
  CSRF via Auth.js double-submit.

## 6. Roadmap (build phases)

1. ✅ Foundation: schema, auth, design system, seeds, docs
2. ✅ Storefront: DB-driven homepage, menu listings (filters/sort/
   pagination), pretty collection URLs (`/dubai`, `/offers`, `/vegan` …),
   product detail with live configurator, autosuggest search, cart core
   (guest cookie + user carts, server-side pricing)
3. ✅ Commerce: checkout stepper (guest + account), quote engine
   (coupons/zones/VAT/tips/fees) shared by UI and order creation,
   transactional orders (stock, coupon limits, snapshots, history),
   Stripe PaymentIntents + verified webhook, COD/pay-at-pickup, order
   history + timeline, guest tracking, loyalty earn, cart merge on login
4. ✅ Customer experience: account sidebar area (profile/password/
   addresses/deletion), favorites, moderated reviews with verified
   purchase, reservations with capacity + blackout checks, loyalty
   redemption → personal coupons, notification center + header badge
5. ✅ Admin dashboard: role-gated shell + audit log; orders (status
   flow, refunds, notes); menu CRUD (+images, config, duplicate/86);
   customers/staff (activate, role changes); reservations (assign,
   blackouts); review moderation; coupon & zone CRUD; CMS (contact/
   hero/hours/FAQ); analytics (KPIs, revenue chart, breakdowns) + CSV
6. ✅ Realtime & messaging: Pusher (private-channel auth) for live
   chat, order tracking and notification toasts; central notify()
   dispatcher (in-app + realtime + Resend e-mail + Twilio SMS, honoring
   prefs); staff chat inbox; granular Role/Permission layer + admin UI —
   all providers degrade gracefully without keys
7. ✅ Production hardening: SEO (dynamic `sitemap.ts`/`robots.ts`,
   schema.org JSON-LD for restaurant/menu/breadcrumbs/FAQ, OG image,
   PWA manifest); security headers (strict CSP + HSTS/X-Frame-Options/
   X-Content-Type-Options/Referrer-Policy/Permissions-Policy);
   accessibility (skip link, landmark `main` ids); German legal &
   content pages (Impressum, Datenschutz, AGB, Widerruf, Cookies,
   Lieferbedingungen, Allergene, Über uns, Kontakt, FAQ) linked from the
   footer; a Vitest unit suite over the pure pricing/coupon/VAT/order-
   number core (`src/lib/pricing.ts`); `vercel.json` + `docs/DEPLOYMENT.md`
