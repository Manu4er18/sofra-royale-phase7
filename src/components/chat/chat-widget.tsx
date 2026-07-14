"use client";

import * as React from "react";
import { MessageCircle, Send, X } from "lucide-react";
import { toast } from "sonner";

import { sendMessage, sendTyping, startChat } from "@/actions/chat";
import { getPusherClient, clientChannels } from "@/lib/realtime/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = {
  id: string;
  senderType: "CUSTOMER" | "STAFF" | "SYSTEM";
  body: string | null;
  imageUrl: string | null;
  createdAt: string;
};

/**
 * Floating live-chat widget (site-wide). Realtime via Pusher when
 * configured; otherwise messages still send and appear on the next open
 * (graceful degradation). Guests supply name/email; logged-in users
 * chat directly. Offline note is shown outside opening hours-agnostic —
 * staff reply asynchronously either way.
 */
export function ChatWidget({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [conversationId, setConversationId] = React.useState<string | null>(
    null,
  );
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [draft, setDraft] = React.useState("");
  const [guestName, setGuestName] = React.useState("");
  const [guestEmail, setGuestEmail] = React.useState("");
  const [staffTyping, setStaffTyping] = React.useState(false);
  const [isBlocked, setIsBlocked] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [loaded, setLoaded] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const syncConversation = React.useCallback(async () => {
    const data: {
      conversation: {
        id: string;
        status: string;
        isBlocked: boolean;
        messages: Message[];
      } | null;
    } = await fetch("/api/chat", { cache: "no-store" }).then((r) =>
      r.ok ? r.json() : { conversation: null },
    );
    if (data.conversation) {
      setConversationId(data.conversation.id);
      setMessages(data.conversation.messages);
      setIsBlocked(data.conversation.isBlocked);
    } else {
      setConversationId(null);
      setMessages([]);
      setIsBlocked(false);
    }
    setLoaded(true);
  }, []);

  React.useEffect(() => {
    const openChat = () => {
      setOpen(true);
      setLoaded(false);
    };
    const checkUrl = () => {
      if (new URLSearchParams(window.location.search).get("chat") === "1") {
        openChat();
      }
    };

    checkUrl();
    window.addEventListener("popstate", checkUrl);
    window.addEventListener("sofra:open-chat", openChat);
    return () => {
      window.removeEventListener("popstate", checkUrl);
      window.removeEventListener("sofra:open-chat", openChat);
    };
  }, []);

  // Hydrate existing conversation on first open.
  React.useEffect(() => {
    if (!open || loaded) return;
    void syncConversation()
      .catch(() => setLoaded(true));
  }, [open, loaded, syncConversation]);

  React.useEffect(() => {
    if (!open || !conversationId) return;
    const poll = window.setInterval(() => {
      void syncConversation().catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(poll);
  }, [conversationId, open, syncConversation]);

  // Realtime subscription for the active conversation.
  React.useEffect(() => {
    if (!conversationId) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe(clientChannels.chat(conversationId));

    const onMessage = (msg: Message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
      if (msg.senderType === "STAFF") setStaffTyping(false);
    };
    const onTyping = (data: { who: string }) => {
      if (data.who === "STAFF") {
        setStaffTyping(true);
        window.setTimeout(() => setStaffTyping(false), 3000);
      }
    };
    const onAccess = (data: { isBlocked?: boolean }) => {
      if (typeof data.isBlocked === "boolean") setIsBlocked(data.isBlocked);
    };
    channel.bind("message", onMessage);
    channel.bind("typing", onTyping);
    channel.bind("access", onAccess);
    return () => {
      channel.unbind("message", onMessage);
      channel.unbind("typing", onTyping);
      channel.unbind("access", onAccess);
      pusher.unsubscribe(clientChannels.chat(conversationId));
    };
  }, [conversationId]);

  // Auto-scroll to newest.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, staffTyping]);

  function optimisticAppend(body: string) {
    setMessages((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        senderType: "CUSTOMER",
        body,
        imageUrl: null,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    if (isBlocked) {
      toast.error("Chat ist für dieses Konto deaktiviert.");
      return;
    }
    if (!isLoggedIn && !conversationId && !guestEmail.trim()) {
      toast.error("Bitte E-Mail angeben, damit wir antworten können.");
      return;
    }
    setDraft("");
    optimisticAppend(body);
    startTransition(async () => {
      const result = conversationId
        ? await sendMessage({ conversationId, body })
        : await startChat({
            message: body,
            guestName: guestName || undefined,
            guestEmail: guestEmail || undefined,
          });
      if (!result.success) {
        toast.error(result.error);
        if (result.error.includes("deaktiviert")) setIsBlocked(true);
        return;
      }
      if (!conversationId) setConversationId(result.conversationId);
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Chat schließen" : "Chat öffnen"}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-premium-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-gold dark:text-gold-foreground"
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
      </button>

      {open ? (
        <div className="fixed bottom-24 right-5 z-50 flex h-[30rem] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-xl border bg-background shadow-premium-lg">
          <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground dark:bg-card dark:text-foreground">
            <div>
              <p className="font-display font-semibold">Sofra Royale — Chat</p>
              <p className="text-xs opacity-80">
                Wir antworten so schnell wie möglich
              </p>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="flex-1 space-y-2 overflow-y-auto p-4"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                Stellen Sie uns Ihre Frage — zu Bestellungen, Zutaten,
                Reservierungen oder allem anderen.
              </p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.senderType === "CUSTOMER"
                      ? "justify-end"
                      : "justify-start",
                  )}
                >
                  <span
                    className={cn(
                      "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                      message.senderType === "CUSTOMER"
                        ? "bg-gold text-gold-foreground"
                        : message.senderType === "SYSTEM"
                          ? "bg-muted text-muted-foreground"
                          : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    {message.body}
                  </span>
                </div>
              ))
            )}
            {staffTyping ? (
              <p className="text-xs italic text-muted-foreground">
                Team schreibt …
              </p>
            ) : null}
          </div>

          <form onSubmit={submit} className="space-y-2 border-t p-3">
            {isBlocked ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                Chat ist für dieses Konto deaktiviert.
              </p>
            ) : null}
            {!isLoggedIn && !conversationId ? (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Name (optional)"
                  className="h-9"
                  aria-label="Ihr Name"
                />
                <Input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="E-Mail"
                  className="h-9"
                  aria-label="Ihre E-Mail"
                />
              </div>
            ) : null}
            <div className="flex gap-2">
              <Input
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  if (conversationId) void sendTyping(conversationId);
                }}
                placeholder="Nachricht schreiben …"
                className="h-10"
                aria-label="Nachricht"
                disabled={isBlocked}
              />
              <Button
                type="submit"
                variant="gold"
                size="icon"
                className="h-10 w-10 shrink-0"
                disabled={isBlocked}
                loading={isPending}
                aria-label="Senden"
              >
                {!isPending ? <Send className="h-4 w-4" /> : null}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
