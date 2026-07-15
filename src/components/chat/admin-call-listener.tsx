"use client";

import * as React from "react";
import { toast } from "sonner";

import { clientChannels, getPusherClient } from "@/lib/realtime/client";
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

  React.useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe(clientChannels.staffChat);
    const onIncoming = (signal: CallSignal) => {
      if (signal.senderType !== "CUSTOMER" || signal.action !== "request") {
        return;
      }
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

  return null;
}
