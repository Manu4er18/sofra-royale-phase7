"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { deleteReview } from "@/actions/reviews";
import { Button } from "@/components/ui/button";

export function DeleteReviewButton({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function remove() {
    startTransition(async () => {
      const result = await deleteReview(reviewId);
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
      router.refresh();
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-destructive hover:text-destructive"
      loading={isPending}
      onClick={remove}
    >
      <Trash2 /> Löschen
    </Button>
  );
}
