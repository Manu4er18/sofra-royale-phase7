"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
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
  const [imageUrls, setImageUrls] = React.useState<string[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function uploadReviewImage(file: File) {
    if (imageUrls.length >= 4) {
      toast.error("Maximal 4 Fotos.");
      return;
    }
    const formData = new FormData();
    formData.set("media", file);
    formData.set("kind", "image");
    setIsUploading(true);
    try {
      const response = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        imageUrl?: string;
        error?: string;
      };
      if (!response.ok || !result.imageUrl) {
        toast.error(result.error ?? "Foto konnte nicht hochgeladen werden.");
        return;
      }
      setImageUrls((current) => [...current, result.imageUrl!].slice(0, 4));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

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
        : await createReview({
            productId,
            orderId,
            rating,
            title,
            body,
            imageUrls,
          });

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
          {!existing ? (
            <div className="space-y-2">
              <Label>Fotos</Label>
              <div className="flex flex-wrap gap-2">
                {imageUrls.map((url) => (
                  <span
                    key={url}
                    className="relative h-16 w-16 overflow-hidden rounded-md border"
                  >
                    <Image src={url} alt="" fill sizes="64px" className="object-cover" />
                    <button
                      type="button"
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white"
                      onClick={() =>
                        setImageUrls((current) =>
                          current.filter((item) => item !== url),
                        )
                      }
                      aria-label="Foto entfernen"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {imageUrls.length < 4 ? (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadReviewImage(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="h-16 w-16 p-0"
                      loading={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      {!isUploading ? <ImagePlus className="h-5 w-5" /> : null}
                    </Button>
                  </>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Bis zu 4 Fotos direkt unter dem Produkt anzeigen.
              </p>
            </div>
          ) : null}
          <Button
            type="submit"
            variant="gold"
            className="w-full"
            loading={isPending || isUploading}
          >
            {existing ? "Änderungen speichern" : "Bewertung absenden"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
