import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { db } from "@/lib/db";
import { ProsePage } from "@/components/shared/prose-page";
import { JsonLd } from "@/components/shared/json-ld";

export const metadata: Metadata = {
  title: "Häufige Fragen (FAQ)",
  description:
    "Antworten auf häufige Fragen zu Halal, Lieferung, Reservierung und mehr bei Sofra Royale.",
  alternates: { canonical: `${siteConfig.url}/faq` },
};

export const dynamic = "force-dynamic";

export default async function FaqPage() {
  const faqs = await db.faq.findMany({
    where: { isVisible: true },
    orderBy: { sortOrder: "asc" },
  });

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };

  return (
    <>
      {faqs.length > 0 ? <JsonLd data={jsonLd} /> : null}
      <ProsePage
        title="Häufige Fragen"
        eyebrow="FAQ"
        intro="Das Wichtigste auf einen Blick. Ihre Frage ist nicht dabei? Nutzen Sie den Live-Chat oder schreiben Sie uns."
      >
        {faqs.length === 0 ? (
          <p>Derzeit sind keine FAQ hinterlegt.</p>
        ) : (
          <dl className="not-prose space-y-4">
            {faqs.map((faq) => (
              <div key={faq.id} className="rounded-lg border bg-card p-5">
                <dt className="font-semibold text-foreground">
                  {faq.question}
                </dt>
                <dd className="mt-1.5 text-sm text-muted-foreground">
                  {faq.answer}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </ProsePage>
    </>
  );
}
