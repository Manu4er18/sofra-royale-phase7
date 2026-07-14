import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { RatingStars } from "@/components/menu/rating-stars";
import { ReviewModeration } from "@/components/admin/review-moderation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Admin — Bewertungen",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const STATUS = {
  PENDING: { label: "In Prüfung", variant: "secondary" as const },
  APPROVED: { label: "Veröffentlicht", variant: "success" as const },
  REJECTED: { label: "Abgelehnt", variant: "destructive" as const },
  HIDDEN: { label: "Ausgeblendet", variant: "outline" as const },
};

const FILTERS = [
  { key: "pending", label: "Zu prüfen" },
  { key: "approved", label: "Veröffentlicht" },
  { key: "all", label: "Alle" },
];

export default async function AdminReviewsPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const filter =
    typeof searchParams.filter === "string" ? searchParams.filter : "pending";

  const where: Prisma.ReviewWhereInput = {};
  if (filter === "pending") where.status = "PENDING";
  else if (filter === "approved") where.status = "APPROVED";

  const reviews = await db.review.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      product: { select: { name: true, slug: true } },
      user: { select: { name: true, email: true } },
      replies: { select: { id: true } },
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Bewertungen</h1>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "gold" : "outline"}
            size="sm"
            asChild
          >
            <Link href={`/admin/reviews?filter=${f.key}`}>{f.label}</Link>
          </Button>
        ))}
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          Keine Bewertungen für diesen Filter.
        </p>
      ) : (
        <ul className="space-y-3">
          {reviews.map((review) => (
            <li key={review.id}>
              <Card>
                <CardContent className="space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Link
                        href={`/menu/${review.product.slug}`}
                        className="font-display font-semibold hover:underline"
                        target="_blank"
                      >
                        {review.product.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {review.user.name ?? "Gast"} · {review.user.email}
                        {review.isVerifiedPurchase
                          ? " · Verifizierter Kauf"
                          : ""}
                      </p>
                    </div>
                    <Badge variant={STATUS[review.status].variant}>
                      {STATUS[review.status].label}
                    </Badge>
                  </div>
                  <RatingStars rating={review.rating} showCount={false} />
                  {review.title ? (
                    <p className="font-medium">{review.title}</p>
                  ) : null}
                  {review.body ? (
                    <p className="text-sm text-muted-foreground">
                      {review.body}
                    </p>
                  ) : null}
                  <ReviewModeration
                    reviewId={review.id}
                    status={review.status}
                    hasReply={review.replies.length > 0}
                  />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
