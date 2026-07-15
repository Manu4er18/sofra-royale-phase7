"use client";

import * as React from "react";
import Link from "next/link";
import { Phone, PhoneOff, Video } from "lucide-react";
import { toast } from "sonner";

import { clientChannels, getPusherClient } from "@/lib/realtime/client";
import { Button } from "@/components/ui/button";

type CallSignal = {
  conversationId: string;
  callId: string;
  action: string;
  senderType: "CUSTOMER" | "STAFF" | "SYSTEM";
  senderName?: string | null;
};

export function AdminCallListener() {
  const [incoming, setIncoming] = React.useState<CallSignal | null>(null);

  React.useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe(clientChannels.staffChat);
    const onIncoming = (signal: CallSignal) => {
      if (signal.senderType !== "CUSTOMER" || signal.action !== "request") {
        return;
      }
      setIncoming(signal);
      toast.message("Видео-занги нав", {
        description: `${signal.senderName ?? "Мизоҷ"} занг зада истодааст.`,
      });
    };
    channel.bind("incoming-call", onIncoming);
    return () => {
      channel.unbind("incoming-call", onIncoming);
      pusher.unsubscribe(clientChannels.staffChat);
    };
  }, []);

  if (!incoming) return null;

  return (
    <div className="fixed left-1/2 top-20 z-[90] w-[min(92vw,560px)] -translate-x-1/2 rounded-2xl border border-gold/40 bg-background/95 p-3 shadow-premium-lg backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
          <Video className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            Видео-занги воридшаванда
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {incoming.senderName ?? "Мизоҷ"} ҳоло видео-занг карда истодааст
          </span>
        </span>
        <Button type="button" size="sm" className="bg-green-600 text-white hover:bg-green-700" asChild>
          <Link href={`/admin/messages?c=${incoming.conversationId}`}>
            <Phone className="h-4 w-4" /> Дохил шудан
          </Link>
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-9 w-9"
          onClick={() => setIncoming(null)}
          aria-label="Пӯшидан"
        >
          <PhoneOff className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
