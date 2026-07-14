"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  addProductImage,
  removeProductImage,
  setFeaturedImage,
} from "@/actions/admin/products";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type ImageRow = {
  id: string;
  url: string;
  altText: string;
  isFeatured: boolean;
};

/**
 * Image manager (URL-based). With Cloudinary keys configured, the
 * recommended flow is: upload in the Cloudinary console → paste the
 * delivery URL here. (Direct signed uploads land with the media phase.)
 */
export function ProductImages({
  productId,
  images,
}: {
  productId: string;
  images: ImageRow[];
}) {
  const router = useRouter();
  const [url, setUrl] = React.useState("");
  const [altText, setAltText] = React.useState("");
  const [isPending, startTransition] = React.useTransition();

  function run(
    action: () => Promise<{
      success: boolean;
      error?: string;
      message?: string;
    }>,
  ) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) toast.error(result.error ?? "Fehlgeschlagen");
      else toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Bilder</CardTitle>
        <CardDescription>
          Cloudinary-/Unsplash-URLs; das Titelbild erscheint auf Karten und
          Listen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {images.length > 0 ? (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {images.map((image) => (
              <li key={image.id} className="space-y-1.5">
                <span className="relative block h-28 overflow-hidden rounded-md border bg-muted">
                  <Image
                    src={image.url}
                    alt={image.altText}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                  {image.isFeatured ? (
                    <Badge variant="gold" className="absolute left-1.5 top-1.5">
                      Titelbild
                    </Badge>
                  ) : null}
                </span>
                <span className="flex gap-1">
                  {!image.isFeatured ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 flex-1 text-xs"
                      disabled={isPending}
                      onClick={() => run(() => setFeaturedImage(image.id))}
                    >
                      <Star className="h-3 w-3" /> Titelbild
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    disabled={isPending}
                    onClick={() => run(() => removeProductImage(image.id))}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Noch keine Bilder — Gerichte ohne Bild wirken auf der Karte deutlich
            schwächer.
          </p>
        )}

        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"
          onSubmit={(e) => {
            e.preventDefault();
            const currentUrl = url;
            const currentAlt = altText;
            run(() =>
              addProductImage({
                productId,
                url: currentUrl,
                altText: currentAlt,
              }),
            );
            setUrl("");
            setAltText("");
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="img-url" className="text-xs">
              Bild-URL
            </Label>
            <Input
              id="img-url"
              required
              type="url"
              placeholder="https://res.cloudinary.com/…"
              className="h-9"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="img-alt" className="text-xs">
              Alt-Text (Barrierefreiheit/SEO)
            </Label>
            <Input
              id="img-alt"
              required
              placeholder="Beschreibung des Bildes"
              className="h-9"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" variant="secondary" size="sm" className="h-9">
              <Plus /> Hinzufügen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
