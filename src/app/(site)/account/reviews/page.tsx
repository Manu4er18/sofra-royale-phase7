import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareText, Pencil } from "lucide-react";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { RatingStars } from "@/components/menu/rating-stars";
import { ReviewDialog } from "@/components/account/review-dialog";
import { DeleteReviewButton } from "@/components/account/delete-review-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Meine Bewertungen",
  robots: { index: false },
};
export const dynamic = "force-dynamic";

const STATUS_LABEL = {
  PENDING: { label: "In Prüfung", variant: "secondary" as const },
  APPROVED: { label: "Veröffentlicht", variant: "success" as const },
  REJECTED: { label: "Abgelehnt", variant: "destructive" as const },
  HIDDEN: { label: "Ausgeblendet", variant: "outline" as const },
};

export default async function MyReviewsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const reviews = await db.review.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { product: { select: { name: true, slug: true } } },
  });

  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 py-16 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-muted-foreground">
          <MessageSquareText className="h-7 w-7" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-semibold">Noch keine Bewertungen</h1>
          <p className="mt-2 max-w-md text-muted-foreground">
            Nach einer Bestellung können Sie Ihre Gerichte direkt aus den
            Bestelldetails bewerten.
          </p>
        </div>
        <Button variant="gold" asChild>
          <Link href="/account/orders">Zu meinen Bestellungen</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold">Meine Bewertungen</h1>
      <ul className="space-y-3">
        {reviews.map((review) => {
          const status = STATUS_LABEL[review.status];
          return (
            <li key={review.id}>
              <Card>
                <CardContent className="space-y-2 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      href={`/menu/${review.product.slug}`}
                      className="font-display font-semibold hover:underline"
                    >
                      {review.product.name}
                    </Link>
                    <span className="flex items-center gap-2">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      {review.isVerifiedPurchase ? (
                        <Badge variant="outline">Verifizierter Kauf</Badge>
                      ) : null}
                    </span>
                  </div>
                  <RatingStars rating={review.rating} showCount={false} />
                  {review.title ? (
                    <p className="font-medium">{review.title}</p>
                  ) : null}
                  <p className="text-sm text-muted-foreground">{review.body}</p>
                  <div className="flex gap-2 pt-1">
                    <ReviewDialog
                      productId={review.productId}
                      productName={review.product.name}
                      existing={{
                        reviewId: review.id,
                        rating: review.rating,
                        title: review.title ?? "",
                        body: review.body ?? "",
                      }}
                      trigger={
                        <Button variant="outline" size="sm">
                          <Pencil /> Bearbeiten
                        </Button>
                      }
                    />
                    <DeleteReviewButton reviewId={review.id} />
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
