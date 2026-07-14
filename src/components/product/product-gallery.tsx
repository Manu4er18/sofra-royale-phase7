"use client";

import * as React from "react";
import Image from "next/image";
import { ImageOff, PlayCircle } from "lucide-react";

import { cn } from "@/lib/utils";

type GalleryImage = { id: string; url: string; altText: string };
type GalleryVideo = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
};

/**
 * Product media gallery: large stage + thumbnail strip.
 * Videos render as HTML5 <video> with controls when selected.
 */
export function ProductGallery({
  images,
  videos,
  productName,
}: {
  images: GalleryImage[];
  videos: GalleryVideo[];
  productName: string;
}) {
  type Slide =
    | { kind: "image"; id: string; url: string; alt: string }
    | {
        kind: "video";
        id: string;
        url: string;
        poster: string | null;
        title: string;
      };

  const slides: Slide[] = [
    ...images.map((img) => ({
      kind: "image" as const,
      id: img.id,
      url: img.url,
      alt: img.altText,
    })),
    ...videos.map((video) => ({
      kind: "video" as const,
      id: video.id,
      url: video.url,
      poster: video.thumbnailUrl,
      title: video.title ?? `${productName} — Video`,
    })),
  ];

  const [activeIndex, setActiveIndex] = React.useState(0);
  const active = slides[activeIndex] ?? slides[0];

  if (!active) {
    return (
      <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <ImageOff className="h-10 w-10" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted shadow-premium">
        {active.kind === "image" ? (
          <Image
            src={active.url}
            alt={active.alt}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <video
            key={active.id}
            src={active.url}
            poster={active.poster ?? undefined}
            controls
            playsInline
            className="h-full w-full object-cover"
            aria-label={active.title}
          />
        )}
      </div>

      {slides.length > 1 ? (
        <div
          className="flex gap-2 overflow-x-auto pb-1"
          role="tablist"
          aria-label="Produktbilder"
        >
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={
                slide.kind === "video"
                  ? slide.title
                  : `Bild ${index + 1} anzeigen`
              }
              onClick={() => setActiveIndex(index)}
              className={cn(
                "relative h-16 w-20 shrink-0 overflow-hidden rounded-md border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                index === activeIndex
                  ? "border-gold"
                  : "border-transparent opacity-70 hover:opacity-100",
              )}
            >
              {slide.kind === "image" ? (
                <Image
                  src={slide.url}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-coffee-deep text-cream">
                  <PlayCircle className="h-6 w-6" aria-hidden />
                </span>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
