"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { cancelReservation } from "@/actions/reservations";
import { Button } from "@/components/ui/button";

export function CancelReservationButton({
  reservationId,
}: {
  reservationId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  function cancel() {
    startTransition(async () => {
      const result = await cancelReservation(reservationId);
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
      onClick={cancel}
    >
      Stornieren
    </Button>
  );
}
