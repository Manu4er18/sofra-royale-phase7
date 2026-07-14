"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { moderateReview, replyToReview } from "@/actions/admin/moderation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Approve / reject / hide + reply controls for one review. */
export function ReviewModeration({
  reviewId,
  status,
  hasReply,
}: {
  reviewId: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "HIDDEN";
  hasReply: boolean;
}) {
  const router = useRouter();
  const [reply, setReply] = React.useState("");
  const [showReply, setShowReply] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();

  function moderate(next: "APPROVED" | "REJECTED" | "HIDDEN") {
    startTransition(async () => {
      const result = await moderateReview({ reviewId, status: next });
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
      router.refresh();
    });
  }

  function submitReply(event: React.FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await replyToReview({ reviewId, body: reply });
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(result.message);
      setReply("");
      setShowReply(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {status !== "APPROVED" ? (
          <Button
            size="sm"
            variant="gold"
            disabled={isPending}
            onClick={() => moderate("APPROVED")}
          >
            Freigeben
          </Button>
        ) : null}
        {status !== "HIDDEN" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => moderate("HIDDEN")}
          >
            Ausblenden
          </Button>
        ) : null}
        {status !== "REJECTED" ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={() => moderate("REJECTED")}
          >
            Ablehnen
          </Button>
        ) : null}
        {!hasReply ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowReply((s) => !s)}
          >
            Antworten
          </Button>
        ) : null}
      </div>
      {showReply ? (
        <form onSubmit={submitReply} className="flex gap-2">
          <Input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder="Öffentliche Antwort …"
            className="h-9"
            required
          />
          <Button
            type="submit"
            size="sm"
            variant="gold"
            className="h-9"
            loading={isPending}
          >
            Senden
          </Button>
        </form>
      ) : null}
    </div>
  );
}
