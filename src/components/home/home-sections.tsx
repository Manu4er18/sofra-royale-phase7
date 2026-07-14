import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChefHat, Quote } from "lucide-react";

import {
  getActiveCategories,
  getChefRecommendations,
  getDailySpecials,
  getFeaturedByCuisine,
  getHighlightedReviews,
  getPopularProducts,
} from "@/lib/services/catalog";
import { FadeIn } from "@/components/shared/fade-in";
import { ProductGrid } from "@/components/menu/product-grid";
import { RatingStars } from "@/components/menu/rating-stars";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Section shell with eyebrow, title and optional "see all" link. */
function Section({
  id,
  eyebrow,
  title,
  href,
  hrefLabel,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  href?: string;
  hrefLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="container py-14">
      <FadeIn>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-gold">
              {eyebrow}
            </p>
            <h2
              id={`${id}-heading`}
              className="mt-1 text-3xl font-semibold sm:text-4xl"
            >
              {title}
            </h2>
          </div>
          {href ? (
            <Button variant="ghost" asChild className="text-gold">
              <Link href={href}>
                {hrefLabel ?? "Alle ansehen"} <ArrowRight />
              </Link>
            </Button>
          ) : null}
        </div>
      </FadeIn>
      <FadeIn delay={0.08}>{children}</FadeIn>
    </section>
  );
}

export async function FeaturedDubaiSection() {
  const products = await getFeaturedByCuisine("dubai");
  if (products.length === 0) return null;
  return (
    <Section
      id="dubai"
      eyebrow="Aromen der Golfregion"
      title="Dubai-Highlights"
      href="/dubai"
    >
      <ProductGrid products={products} />
    </Section>
  );
}

export async function FeaturedTurkishSection() {
  const products = await getFeaturedByCuisine("turkish");
  if (products.length === 0) return null;
  return (
    <Section
      id="turkish"
      eyebrow="Türk Mutfağı"
      title="Türkische Klassiker"
      href="/turkish"
    >
      <ProductGrid products={products} />
    </Section>
  );
}

export async function PopularSection() {
  const products = await getPopularProducts(4);
  if (products.length === 0) return null;
  return (
    <Section
      id="popular"
      eyebrow="Von Gästen gewählt"
      title="Beliebteste Gerichte"
      href="/popular"
    >
      <ProductGrid products={products} />
    </Section>
  );
}

export async function ChefPicksSection() {
  const products = await getChefRecommendations(4);
  if (products.length === 0) return null;
  return (
    <div className="border-y bg-secondary/50 dark:bg-card/60">
      <Section
        id="chef"
        eyebrow={"Empfohlen von der Küche"}
        title="Chef-Empfehlungen"
        href="/menu?sort=rating"
        hrefLabel="Bestbewertet ansehen"
      >
        <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <ChefHat className="h-4 w-4 text-gold" aria-hidden />
          Handverlesen von unserem Küchenteam aus Dubai, Istanbul und Gaziantep.
        </div>
        <ProductGrid products={products} />
      </Section>
    </div>
  );
}

export async function DailySpecialsSection() {
  const products = await getDailySpecials(4);
  if (products.length === 0) return null;
  return (
    <Section
      id="specials"
      eyebrow="Nur für kurze Zeit"
      title="Angebote & Tagesgerichte"
      href="/offers"
    >
      <ProductGrid products={products} />
    </Section>
  );
}

export async function CategoriesSection() {
  const categories = await getActiveCategories();
  if (categories.length === 0) return null;
  return (
    <Section id="categories" eyebrow="Schnell finden" title="Kategorien">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/${category.slug}`}
            className="group rounded-lg border bg-card p-5 text-center shadow-premium transition-all hover:-translate-y-0.5 hover:shadow-premium-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <p className="font-display font-semibold group-hover:text-gold">
              {category.name}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {category._count.products}{" "}
              {category._count.products === 1 ? "Gericht" : "Gerichte"}
            </p>
          </Link>
        ))}
      </div>
    </Section>
  );
}

export async function ReviewsSection() {
  const reviews = await getHighlightedReviews();
  if (reviews.length === 0) return null;
  return (
    <div className="border-y bg-secondary/50 dark:bg-card/60">
      <Section
        id="reviews"
        eyebrow="Stimmen unserer Gäste"
        title="Das sagen Gäste"
      >
        <div className="grid gap-5 md:grid-cols-3">
          {reviews.map((review) => (
            <Card key={review.id} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-4 p-6">
                <Quote className="h-6 w-6 text-gold" aria-hidden />
                <p className="flex-1 text-sm text-muted-foreground">
                  {review.body}
                </p>
                <RatingStars rating={review.rating} showCount={false} />
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    {review.user.image ? (
                      <AvatarImage src={review.user.image} alt="" aria-hidden />
                    ) : null}
                    <AvatarFallback>
                      {(review.user.name ?? "G").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-sm">
                    <p className="font-medium">{review.user.name ?? "Gast"}</p>
                    <Link
                      href={`/menu/${review.product.slug}`}
                      className="text-xs text-muted-foreground underline-offset-4 hover:text-gold hover:underline"
                    >
                      zu „{review.product.name}“
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </Section>
    </div>
  );
}

/** Hero image banner with CTA — content aligned with SiteSetting seeds. */
export function HeroSection() {
  return (
    <section className="relative flex min-h-[78vh] items-center justify-center overflow-hidden">
      <Image
        src="https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=2069&auto=format&fit=crop"
        alt="Festlich gedeckte Tafel mit orientalischen Gerichten und gegrilltem Fleisch"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="hero-overlay absolute inset-0" aria-hidden />
      <div className="container relative z-10 py-24 text-center text-white">
        <FadeIn>
          <p className="mb-4 text-sm uppercase tracking-[0.35em] text-gold">
            Dubai & Turkish Fine Dining
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
            Wo Dubai auf den Bosporus trifft
          </h1>
        </FadeIn>
        <FadeIn delay={0.2}>
          <p className="mx-auto mt-6 max-w-xl text-balance text-base text-white/85 sm:text-lg">
            Premium-Gerichte aus der Golfregion und Anatolien — 100 % halal,
            frisch zubereitet, elegant serviert.
          </p>
        </FadeIn>
        <FadeIn delay={0.3}>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="gold" asChild>
              <Link href="/menu">Jetzt bestellen</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/40 bg-white/5 text-white hover:bg-white/15 hover:text-white"
            >
              <Link href="/offers">Aktuelle Angebote</Link>
            </Button>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
