"use client";

import * as React from "react";
import Link from "next/link";
import { Phone, PhoneOff, Video } from "lucide-react";
import { toast } from "sonner";

import { clientChannels, getPusherClient } from "@/lib/realtime/client";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/i18n/language-provider";
import {
  clearCallIndicator,
  publishCallIndicator,
} from "@/components/chat/call-indicator";

type CallSignal = {
  conversationId: string;
  callId: string;
  action: string;
  senderType: "CUSTOMER" | "STAFF" | "SYSTEM";
  senderName?: string | null;
};

export function AdminCallListener() {
  const { t } = useLanguage();
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
      publishCallIndicator({
        conversationId: signal.conversationId,
        callId: signal.callId,
        callerName: signal.senderName,
        active: true,
        direction: "incoming",
      });
      toast.message(t("call.incomingTitle"), {
        description: t("call.incomingFrom").replace(
          "{name}",
          signal.senderName ?? "Мизоҷ",
        ),
      });
    };
    const onStatus = (signal: CallSignal) => {
      if (signal.senderType !== "CUSTOMER") return;
      if (signal.action === "request") {
        publishCallIndicator({
          conversationId: signal.conversationId,
          callId: signal.callId,
          callerName: signal.senderName,
          active: true,
          direction: "incoming",
        });
        return;
      }
      if (signal.action === "decline" || signal.action === "end") {
        clearCallIndicator(signal.conversationId);
        setIncoming((current) =>
          current?.conversationId === signal.conversationId ? null : current,
        );
      }
    };
    channel.bind("incoming-call", onIncoming);
    channel.bind("call-status", onStatus);
    return () => {
      channel.unbind("incoming-call", onIncoming);
      channel.unbind("call-status", onStatus);
      pusher.unsubscribe(clientChannels.staffChat);
    };
  }, [t]);

  if (!incoming) return null;

  return (
    <div className="fixed left-1/2 top-20 z-[90] w-[min(92vw,560px)] -translate-x-1/2 rounded-2xl border border-gold/40 bg-background/95 p-3 shadow-premium-lg backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-white">
          <Video className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">
            {t("call.incomingTitle")}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {t("call.incomingFrom").replace(
              "{name}",
              incoming.senderName ?? "Мизоҷ",
            )}
          </span>
        </span>
        <Button type="button" size="sm" className="bg-green-600 text-white hover:bg-green-700" asChild>
          <Link href={`/admin/messages?c=${incoming.conversationId}`}>
            <Phone className="h-4 w-4" /> {t("call.join")}
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
