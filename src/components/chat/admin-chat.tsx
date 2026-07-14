"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Ban, Check, Send } from "lucide-react";
import { toast } from "sonner";

import {
  blockChatUser,
  resolveConversation,
  saveChatNote,
  sendTyping,
  staffReply,
} from "@/actions/chat";
import { getPusherClient, clientChannels } from "@/lib/realtime/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type Message = {
  id: string;
  senderType: "CUSTOMER" | "STAFF" | "SYSTEM";
  body: string | null;
  imageUrl: string | null;
  createdAt: string;
};

export type ConversationListItem = {
  id: string;
  who: string;
  contact: string;
  status: string;
  isBlocked: boolean;
  lastMessage: string;
  updatedAt: string;
  unread: boolean;
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Offen",
  ASSIGNED: "Zugewiesen",
  RESOLVED: "Gelöst",
  ARCHIVED: "Archiviert",
};

/** Two-pane staff chat inbox: conversation list + active thread. */
export function AdminChat({
  conversations,
  initialActive,
  initialMessages,
  initialNote,
  initialStatus,
  initialIsBlocked,
  canBlock,
}: {
  conversations: ConversationListItem[];
  initialActive: string | null;
  initialMessages: Message[];
  initialNote: string;
  initialStatus: string;
  initialIsBlocked: boolean;
  canBlock: boolean;
}) {
  const router = useRouter();
  const [activeId, setActiveId] = React.useState(initialActive);
  const [messages, setMessages] = React.useState<Message[]>(initialMessages);
  const [note, setNote] = React.useState(initialNote);
  const [status, setStatus] = React.useState(initialStatus);
  const [isBlocked, setIsBlocked] = React.useState(initialIsBlocked);
  const [draft, setDraft] = React.useState("");
  const [isPending, startTransition] = React.useTransition();
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Refresh the message pane when switching conversations (server nav).
  function openConversation(id: string) {
    setActiveId(id);
    router.push(`/admin/chat?c=${id}`);
  }

  React.useEffect(() => {
    setMessages(initialMessages);
    setNote(initialNote);
    setStatus(initialStatus);
    setIsBlocked(initialIsBlocked);
    setActiveId(initialActive);
  }, [
    initialMessages,
    initialNote,
    initialStatus,
    initialIsBlocked,
    initialActive,
  ]);

  // Realtime for the active conversation + inbox activity.
  React.useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;
    const staffChannel = pusher.subscribe(clientChannels.staffChat);
    const onActivity = () => router.refresh();
    staffChannel.bind("new-conversation", onActivity);
    staffChannel.bind("activity", onActivity);

    let convChannel: ReturnType<typeof pusher.subscribe> | null = null;
    if (activeId) {
      convChannel = pusher.subscribe(clientChannels.chat(activeId));
      convChannel.bind("message", (msg: Message) => {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
        );
      });
      convChannel.bind(
        "access",
        (data: { isBlocked?: boolean; status?: string }) => {
          if (typeof data.isBlocked === "boolean")
            setIsBlocked(data.isBlocked);
          if (data.status) setStatus(data.status);
        },
      );
    }
    return () => {
      staffChannel.unbind("new-conversation", onActivity);
      staffChannel.unbind("activity", onActivity);
      pusher.unsubscribe(clientChannels.staffChat);
      if (activeId) pusher.unsubscribe(clientChannels.chat(activeId));
    };
  }, [activeId, router]);

  React.useEffect(() => {
    if (!activeId) return;
    const poll = window.setInterval(() => {
      void fetch(`/api/admin/chat/${activeId}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then(
          (data: {
            conversation?: {
              status: string;
              isBlocked: boolean;
              internalNotes: string;
              messages: Message[];
            };
          } | null) => {
            if (!data?.conversation) return;
            setStatus(data.conversation.status);
            setIsBlocked(data.conversation.isBlocked);
            setNote(data.conversation.internalNotes);
            setMessages(data.conversation.messages);
          },
        )
        .catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(poll);
  }, [activeId]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  function reply(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body || !activeId) return;
    setDraft("");
    setMessages((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        senderType: "STAFF",
        body,
        imageUrl: null,
        createdAt: new Date().toISOString(),
      },
    ]);
    startTransition(async () => {
      const result = await staffReply({ conversationId: activeId, body });
      if (!result.success) toast.error(result.error);
    });
  }

  function resolve() {
    if (!activeId) return;
    startTransition(async () => {
      const result = await resolveConversation(activeId);
      if (!result.success) toast.error(result.error);
      else {
        setStatus(result.status ?? "RESOLVED");
        toast.success(result.message);
      }
      router.refresh();
    });
  }

  function block() {
    if (!activeId) return;
    const prompt = isBlocked
      ? "Diesen Nutzer wieder für den Chat freigeben?"
      : "Diesen Nutzer für den Chat sperren?";
    if (!window.confirm(prompt)) return;
    startTransition(async () => {
      const result = await blockChatUser(activeId);
      if (!result.success) toast.error(result.error);
      else {
        if (typeof result.isBlocked === "boolean")
          setIsBlocked(result.isBlocked);
        if (result.status) setStatus(result.status);
        toast.success(result.message);
      }
      router.refresh();
    });
  }

  function persistNote() {
    if (!activeId) return;
    startTransition(async () => {
      const result = await saveChatNote({ conversationId: activeId, note });
      if (!result.success) toast.error(result.error);
      else toast.success(result.message);
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_1fr]">
      {/* Conversation list */}
      <aside className="space-y-1 rounded-lg border bg-card p-2">
        {conversations.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">
            Keine Unterhaltungen.
          </p>
        ) : (
          conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => openConversation(c.id)}
              className={cn(
                "w-full rounded-md p-3 text-left text-sm transition-colors",
                activeId === c.id ? "bg-gold/15" : "hover:bg-accent",
              )}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{c.who}</span>
                <Badge
                  variant={c.status === "OPEN" ? "gold" : "secondary"}
                  className="shrink-0"
                >
                  {STATUS_LABEL[c.status] ?? c.status}
                </Badge>
              </span>
              {c.isBlocked ? (
                <span className="mt-1 inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                  Blockiert
                </span>
              ) : null}
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {c.lastMessage}
              </span>
            </button>
          ))
        )}
      </aside>

      {/* Active thread */}
      <section className="flex min-h-[28rem] flex-col rounded-lg border bg-card">
        {!activeId ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Wählen Sie links eine Unterhaltung.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 border-b p-3">
              <p className="text-sm font-medium">Unterhaltung</p>
              <div className="flex gap-1.5">
                <Badge variant={status === "OPEN" ? "gold" : "secondary"}>
                  {STATUS_LABEL[status] ?? status}
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={resolve}
                >
                  <Check /> Lösen
                </Button>
                {canBlock ? (
                  <Button
                    size="sm"
                    variant={isBlocked ? "outline" : "ghost"}
                    className={cn(
                      !isBlocked && "text-destructive hover:text-destructive",
                    )}
                    disabled={isPending}
                    onClick={block}
                  >
                    <Ban /> {isBlocked ? "Entsperren" : "Blockieren"}
                  </Button>
                ) : null}
              </div>
            </div>

            <div
              ref={scrollRef}
              className="flex-1 space-y-2 overflow-y-auto p-4"
              aria-live="polite"
            >
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.senderType === "STAFF"
                      ? "justify-end"
                      : "justify-start",
                  )}
                >
                  <span
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                      message.senderType === "STAFF"
                        ? "bg-gold text-gold-foreground"
                        : message.senderType === "SYSTEM"
                          ? "bg-muted text-muted-foreground"
                          : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {message.body}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t p-3">
              <form onSubmit={reply} className="flex gap-2">
                <Input
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    void sendTyping(activeId);
                  }}
                  placeholder="Antwort schreiben …"
                  className="h-10"
                  aria-label="Antwort"
                />
                <Button
                  type="submit"
                  variant="gold"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  loading={isPending}
                  aria-label="Senden"
                >
                  {!isPending ? <Send className="h-4 w-4" /> : null}
                </Button>
              </form>
              <div className="mt-2 flex gap-2">
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Interne Notiz (nur Team)"
                  className="h-8 text-xs"
                  aria-label="Interne Notiz"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-8"
                  disabled={isPending}
                  onClick={persistNote}
                >
                  Notiz
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
