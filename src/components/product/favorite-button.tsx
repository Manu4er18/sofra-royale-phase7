"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";

import { toggleFavorite } from "@/actions/favorites";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/** Heart toggle — optimistic UI, server state via toggleFavorite. */
export function FavoriteButton({
  productId,
  initialIsFavorite,
  isLoggedIn,
  className,
}: {
  productId: string;
  initialIsFavorite: boolean;
  isLoggedIn: boolean;
  className?: string;
}) {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = React.useState(initialIsFavorite);
  const [isPending, startTransition] = React.useTransition();

  function handleClick() {
    if (!isLoggedIn) {
      toast("Bitte anmelden", {
        description: "Favoriten sind mit einem Konto verknüpft.",
        action: { label: "Anmelden", onClick: () => router.push("/login") },
      });
      return;
    }
    const next = !isFavorite;
    setIsFavorite(next); // optimistic
    startTransition(async () => {
      const result = await toggleFavorite(productId);
      if (!result.success) {
        setIsFavorite(!next); // rollback
        toast.error(result.error);
        return;
      }
      toast.success(
        result.isFavorite
          ? "Zu Favoriten hinzugefügt"
          : "Aus Favoriten entfernt",
      );
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={isFavorite}
      aria-label={
        isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"
      }
      className={className}
    >
      <Heart
        className={cn(
          "h-5 w-5 transition-colors",
          isFavorite && "fill-destructive text-destructive",
        )}
      />
    </Button>
  );
}
