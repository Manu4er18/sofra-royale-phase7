import type { Metadata } from "next";

import { db } from "@/lib/db";
import {
  ContactForm,
  FaqManager,
  HeroForm,
  HoursForm,
  type FaqRow,
} from "@/components/admin/content-forms";

export const metadata: Metadata = {
  title: "Admin — Inhalte & Einstellungen",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export default async function AdminContentPage() {
  const [settings, faqs] = await Promise.all([
    db.siteSetting.findMany({
      where: {
        key: {
          in: ["restaurant.contact", "homepage.hero", "restaurant.hoursText"],
        },
      },
    }),
    db.faq.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  const byKey = new Map(settings.map((s) => [s.key, asRecord(s.value)]));
  const contact = byKey.get("restaurant.contact") ?? {};
  const hero = byKey.get("homepage.hero") ?? {};
  const hours = byKey.get("restaurant.hoursText") ?? {};

  const faqRows: FaqRow[] = faqs.map((f) => ({
    id: f.id,
    question: f.question,
    answer: f.answer,
    category: f.category,
    isVisible: f.isVisible,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Inhalte & Einstellungen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Website-Inhalte ohne Code bearbeiten — Änderungen sind sofort live.
        </p>
      </div>

      <ContactForm
        initial={{
          address: String(contact.address ?? ""),
          phone: String(contact.phone ?? ""),
          email: String(contact.email ?? ""),
        }}
      />
      <HeroForm
        initial={{
          title: String(hero.title ?? ""),
          subtitle: String(hero.subtitle ?? ""),
          imageUrl: String(hero.imageUrl ?? ""),
        }}
      />
      <HoursForm
        initial={{
          weekdays: String(hours.weekdays ?? "Mo–Do: 11:30 – 22:30 Uhr"),
          weekend: String(hours.weekend ?? "Fr–Sa: 11:30 – 23:30 Uhr"),
          sunday: String(hours.sunday ?? "So: 12:00 – 22:00 Uhr"),
        }}
      />
      <FaqManager faqs={faqRows} />
    </div>
  );
}
