"use client";

import * as React from "react";
import { Video } from "lucide-react";

import { cn } from "@/lib/utils";

export type CallIndicatorState = {
  conversationId: string;
  callId: string;
  callerName?: string | null;
  active: boolean;
  direction?: "incoming" | "outgoing";
};

const CALL_INDICATOR_EVENT = "sofra:video-call-indicator";
let currentCallIndicator: CallIndicatorState | null = null;

export function publishCallIndicator(next: CallIndicatorState) {
  currentCallIndicator = next;
  window.dispatchEvent(
    new CustomEvent<CallIndicatorState>(CALL_INDICATOR_EVENT, {
      detail: next,
    }),
  );
}

export function clearCallIndicator(conversationId?: string | null) {
  if (
    conversationId &&
    currentCallIndicator &&
    currentCallIndicator.conversationId !== conversationId
  ) {
    return;
  }
  currentCallIndicator = null;
  window.dispatchEvent(
    new CustomEvent<CallIndicatorState | null>(CALL_INDICATOR_EVENT, {
      detail: null,
    }),
  );
}

export function useCallIndicator() {
  const [indicator, setIndicator] =
    React.useState<CallIndicatorState | null>(currentCallIndicator);

  React.useEffect(() => {
    const sync = (event: Event) => {
      setIndicator(
        (event as CustomEvent<CallIndicatorState | null>).detail ?? null,
      );
    };
    window.addEventListener(CALL_INDICATOR_EVENT, sync);
    return () => window.removeEventListener(CALL_INDICATOR_EVENT, sync);
  }, []);

  return indicator;
}

export function VideoCallBadge({
  count,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-green-600 px-1 text-[10px] font-bold text-white shadow-lg ring-2 ring-background",
        className,
      )}
      aria-hidden
    >
      {typeof count === "number" ? count : <Video className="h-3.5 w-3.5" />}
    </span>
  );
}
