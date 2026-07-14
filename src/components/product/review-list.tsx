import Image from "next/image";
import { BadgeCheck } from "lucide-react";

import type { ProductDetail } from "@/lib/services/catalog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RatingStars } from "@/components/menu/rating-stars";
import { Card, CardContent } from "@/components/ui/card";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium" }).format(date);
}

/** Approved reviews with rating distribution summary. */
export function ReviewList({
  reviews,
  averageRating,
  reviewCount,
}: {
  reviews: ProductDetail["reviews"];
  averageRating: number;
  reviewCount: number;
}) {
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
  }));
  const maxCount = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <section aria-labelledby="reviews-heading" className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 id="reviews-heading" className="text-2xl font-semibold">
            Bewertungen
          </h2>
          <div className="mt-1">
            <RatingStars rating={averageRating} reviewCount={reviewCount} />
          </div>
        </div>
        {reviewCount > 0 ? (
          <div className="w-full max-w-xs space-y-1" aria-hidden>
            {distribution.map((d) => (
              <div key={d.stars} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-muted-foreground">{d.stars}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gold"
                    style={{ width: `${(d.count / maxCount) * 100}%` }}
                  />
                </div>
                <span className="w-4 text-right text-muted-foreground">
                  {d.count}
                </span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
          Noch keine Bewertungen — seien Sie nach Ihrer ersten Bestellung die
          erste Stimme! (Bewertungen schreiben kommt in Phase 4.)
        </p>
      ) : (
        <ul className="space-y-4">
          {reviews.map((review) => (
            <li key={review.id}>
              <Card>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        {review.user.image ? (
                          <AvatarImage
                            src={review.user.image}
                            alt=""
                            aria-hidden
                          />
                        ) : null}
                        <AvatarFallback>
                          {(review.user.name ?? "Gast")
                            .slice(0, 2)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="flex items-center gap-1.5 text-sm font-medium">
                          {review.user.name ?? "Gast"}
                          {review.isVerifiedPurchase ? (
                            <span className="inline-flex items-center gap-0.5 text-xs font-normal text-success">
                              <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                              Verifizierter Kauf
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(review.createdAt)}
                        </p>
                      </div>
                    </div>
                    <RatingStars rating={review.rating} showCount={false} />
                  </div>

                  {review.title ? (
                    <p className="font-medium">{review.title}</p>
                  ) : null}
                  {review.body ? (
                    <p className="text-sm text-muted-foreground">
                      {review.body}
                    </p>
                  ) : null}

                  {review.images.length > 0 ? (
                    <div className="flex gap-2">
                      {review.images.map((image) => (
                        <span
                          key={image.id}
                          className="relative h-16 w-16 overflow-hidden rounded-md"
                        >
                          <Image
                            src={image.url}
                            alt={image.altText ?? "Bewertungsfoto"}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {review.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="rounded-md bg-secondary/60 p-3 text-sm"
                    >
                      <p className="mb-1 text-xs font-semibold text-gold">
                        Antwort von {reply.author.name ?? "Sofra Royale"}
                      </p>
                      <p className="text-muted-foreground">{reply.body}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
