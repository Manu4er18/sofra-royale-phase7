"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/i18n/language-provider";
import {
  useCallIndicator,
  VideoCallBadge,
} from "@/components/chat/call-indicator";

export function AdminMessageButton({ unread = 0 }: { unread?: number }) {
  const { t } = useLanguage();
  const call = useCallIndicator();
  const count = call?.active ? Math.max(1, unread) : unread;
  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      asChild
      aria-label={`${t("site.nav.messages")}, ${count} ${t("common.unread")}`}
    >
      <Link href={call?.conversationId ? `/admin/messages?c=${call.conversationId}` : "/admin/messages"}>
        <MessageCircle className="h-5 w-5" />
        {call?.active ? (
          <VideoCallBadge />
        ) : unread > 0 ? (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-600 px-1 text-[0.7rem] font-bold text-white">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}
