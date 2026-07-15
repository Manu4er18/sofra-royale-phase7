"use client";

import Link from "next/link";
import { Video } from "lucide-react";

import { cn } from "@/lib/utils";
import { useLanguage } from "@/components/i18n/language-provider";
import { useCallIndicator } from "@/components/chat/call-indicator";

export function StaffCallShortcut({ className }: { className?: string }) {
  const call = useCallIndicator();
  const { t } = useLanguage();

  if (!call?.active) return null;

  return (
    <Link
      href={`/admin/messages?c=${call.conversationId}`}
      className={cn(
        "relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-white shadow-lg ring-2 ring-green-400/30 transition-transform hover:scale-105 hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      aria-label={t("call.active")}
      title={t("call.active")}
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-green-500/30" />
      <Video className="relative h-4 w-4" />
    </Link>
  );
}
