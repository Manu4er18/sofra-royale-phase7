"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { createReview, updateReview } from "@/actions/reviews";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RatingInput } from "@/components/shared/rating-input";

type Props = {
  productId: string;
  productName: string;
  orderId?: string;
  /** When set, the dialog edits an existing review. */
  existing?: { reviewId: string; rating: number; title: string; body: string };
  trigger: React.ReactNode;
};

/** Write or edit a review — server action validates + moderates. */
export function ReviewDialog({
  productId,
  productName,
  orderId,
  existing,
  trigger,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState(existing?.rating ?? 0);
  const [title, setTitle] = React.useState(existing?.title ?? "");
  const [body, setBody] = React.useState(existing?.body ?? "");
  const [isPending, startTransition] = React.useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (rating === 0) {
      toast.error("Bitte wählen Sie 1–5 Sterne.");
      return;
    }
    startTransition(async () => {
      const result = existing
        ? await updateReview({
            reviewId: existing.reviewId,
            rating,
            title,
            body,
          })
        : await createReview({ productId, orderId, rating, title, body });

      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {existing ? "Bewertung bearbeiten" : `„${productName}“ bewerten`}
          </DialogTitle>
          <DialogDescription>
            Ihre Bewertung wird vor Veröffentlichung kurz geprüft.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Sterne</Label>
            <RatingInput value={rating} onChange={setRating} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="review-title">
              Titel{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </Label>
            <Input
              id="review-title"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 120))}
              placeholder="Kurz zusammengefasst …"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="review-body">Ihre Erfahrung</Label>
            <textarea
              id="review-body"
              value={body}
              onChange={(e) => setBody(e.target.value.slice(0, 2000))}
              rows={4}
              required
              minLength={10}
              placeholder="Wie hat es geschmeckt?"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button
            type="submit"
            variant="gold"
            className="w-full"
            loading={isPending}
          >
            {existing ? "Änderungen speichern" : "Bewertung absenden"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
