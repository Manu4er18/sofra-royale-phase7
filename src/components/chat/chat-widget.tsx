"use client";

import * as React from "react";
import Image from "next/image";
import {
  FileVideo,
  ImagePlus,
  MessageCircle,
  Mic,
  Send,
  Square,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { sendMessage, sendTyping, startChat } from "@/actions/chat";
import type { AppLocale } from "@/lib/i18n";
import { getPusherClient, clientChannels } from "@/lib/realtime/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LanguageSelect,
  useLanguage,
} from "@/components/i18n/language-provider";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AudioMessagePlayer } from "@/components/chat/audio-message-player";
import { VideoCallPanel } from "@/components/chat/video-call-panel";

type Message = {
  id: string;
  senderType: "CUSTOMER" | "STAFF" | "SYSTEM";
  type?: "TEXT" | "IMAGE";
  body: string | null;
  imageUrl: string | null;
  senderName?: string | null;
  senderImage?: string | null;
  createdAt: string;
  readAt?: string | null;
};

type AttachmentKind = "image" | "video" | "audio";

const CHAT_COPY: Record<
  AppLocale,
  {
    chatTitle: string;
    subtitle: string;
    messages: string;
    empty: string;
    name: string;
    email: string;
    placeholder: string;
    imageReady: string;
    videoReady: string;
    voiceReady: string;
    videoCallReady: string;
    end: string;
    recording: string;
    blocked: string;
    emailRequired: string;
  }
> = {
  de: {
    chatTitle: "Sofra Royale — Chat",
    subtitle: "Wir antworten so schnell wie möglich",
    messages: "Messages",
    empty:
      "Stellen Sie uns Ihre Frage — zu Bestellungen, Zutaten, Reservierungen oder allem anderen.",
    name: "Name (optional)",
    email: "E-Mail",
    placeholder: "Nachricht schreiben ...",
    imageReady: "Bild bereit zum Senden",
    videoReady: "Video bereit zum Senden",
    voiceReady: "Sprachnachricht bereit zum Senden",
    videoCallReady: "Videoanruf bereit",
    end: "Beenden",
    recording: "Sprachnachricht aufnehmen",
    blocked: "Chat ist für dieses Konto deaktiviert.",
    emailRequired: "Bitte E-Mail angeben, damit wir antworten können.",
  },
  ru: {
    chatTitle: "Sofra Royale — Чат",
    subtitle: "Мы ответим как можно быстрее",
    messages: "Сообщения",
    empty: "Задайте вопрос о заказах, блюдах, бронировании или другом.",
    name: "Имя (необязательно)",
    email: "E-mail",
    placeholder: "Написать сообщение ...",
    imageReady: "Фото готово к отправке",
    videoReady: "Видео готово к отправке",
    voiceReady: "Голосовое готово к отправке",
    videoCallReady: "Видеозвонок готов",
    end: "Завершить",
    recording: "Запись голосового сообщения",
    blocked: "Чат для этого аккаунта отключен.",
    emailRequired: "Укажите e-mail, чтобы мы могли ответить.",
  },
  en: {
    chatTitle: "Sofra Royale — Chat",
    subtitle: "We reply as quickly as possible",
    messages: "Messages",
    empty: "Ask us about orders, ingredients, reservations, or anything else.",
    name: "Name (optional)",
    email: "Email",
    placeholder: "Write a message ...",
    imageReady: "Image ready to send",
    videoReady: "Video ready to send",
    voiceReady: "Voice message ready to send",
    videoCallReady: "Video call ready",
    end: "End",
    recording: "Recording voice message",
    blocked: "Chat is disabled for this account.",
    emailRequired: "Please enter an email so we can reply.",
  },
  tg: {
    chatTitle: "Sofra Royale — Чат",
    subtitle: "Мо ҳарчи зудтар ҷавоб медиҳем",
    messages: "Паёмҳо",
    empty: "Саволатонро дар бораи фармоиш, меню, брон ё дигар чиз нависед.",
    name: "Ном (ихтиёрӣ)",
    email: "E-mail",
    placeholder: "Паём нависед ...",
    imageReady: "Сурат барои фиристодан омода",
    videoReady: "Видео барои фиристодан омода",
    voiceReady: "Овоз барои фиристодан омода",
    videoCallReady: "Видео-занг омода аст",
    end: "Қатъ",
    recording: "Сабти паёми овозӣ",
    blocked: "Chat барои ин аккаунт ғайрифаъол аст.",
    emailRequired: "E-mail нависед, то ҷавоб дода тавонем.",
  },
};

function getAttachmentKind(url: string): AttachmentKind {
  if (url.includes("/chat/audio/") || url.includes("/audio/")) {
    return "audio";
  }
  if (url.includes("/chat/video/") || url.includes("/video/")) return "video";
  if (/\.(m4a|mp3|ogg|wav|aac)$/i.test(url)) {
    return "audio";
  }
  if (/\.(mp4|mov|webm)$/i.test(url)) return "video";
  return "image";
}

function mergeMessage(prev: Message[], msg: Message) {
  if (prev.some((message) => message.id === msg.id)) return prev;
  const tempIndex = prev.findIndex(
    (message) =>
      message.id.startsWith("tmp-") &&
      message.senderType === msg.senderType &&
      (message.body ?? null) === (msg.body ?? null) &&
      (message.imageUrl ?? null) === (msg.imageUrl ?? null),
  );
  if (tempIndex === -1) return [...prev, msg];
  return prev.map((message, index) => (index === tempIndex ? msg : message));
}

function attachmentLabel(
  kind: AttachmentKind,
  copy: (typeof CHAT_COPY)[AppLocale],
) {
  if (kind === "video") return copy.videoReady;
  if (kind === "audio") return copy.voiceReady;
  return copy.imageReady;
}

function getSupportedAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/mp4",
  ];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function audioExtension(type: string) {
  const mimeType = type.split(";")[0]?.toLowerCase() ?? "";
  if (mimeType === "audio/mp4" || mimeType === "audio/x-m4a") return "m4a";
  if (mimeType === "audio/mpeg") return "mp3";
  if (mimeType === "audio/ogg") return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

function initials(name: string | null | undefined) {
  const value = name?.trim() || "SR";
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatMessageTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getMediaErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof DOMException)) return fallback;
  if (error.name === "NotAllowedError" || error.name === "SecurityError") {
    return "Браузер ё система камера/микрофонро иҷозат надод.";
  }
  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "Камера ё микрофон ёфт нашуд.";
  }
  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "Камера ё микрофон дар барномаи дигар истифода мешавад.";
  }
  if (error.name === "OverconstrainedError") {
    return "Камера/микрофон бо ин танзимот дастрас нест.";
  }
  return fallback;
}

function canUseMediaDevices() {
  return Boolean(
    window.isSecureContext && navigator.mediaDevices?.getUserMedia,
  );
}

function showSecureContextToast() {
  toast.error("Камера/микрофон дар HTTP маҳдуд аст.", {
    description:
      "Барои тест HTTPS истифода баред: npm run dev:https. Ё дар Chrome flag-и Insecure origins treated as secure-ро барои http://localhost:3001 фаъол кунед.",
    duration: 9000,
  });
}

function ChatAttachmentPreview({
  url,
  compact = false,
  mine = false,
}: {
  url: string;
  compact?: boolean;
  mine?: boolean;
}) {
  const kind = getAttachmentKind(url);
  if (kind === "video") {
    return (
      <video
        src={url}
        controls
        className={cn(
          "mb-2 w-full rounded-lg",
          compact ? "h-12 max-w-32" : "max-h-56",
        )}
      />
    );
  }
  if (kind === "audio") {
    return (
      <div className="mb-2">
        <AudioMessagePlayer src={url} mine={mine} />
      </div>
    );
  }
  return (
    <Image
      src={url}
      alt=""
      width={compact ? 48 : 320}
      height={compact ? 48 : 224}
      className={cn(
        "mb-2 rounded-lg object-cover",
        compact ? "h-12 w-12" : "max-h-56 w-full",
      )}
    />
  );
}

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
  const { locale } = useLanguage();
  const [attachmentUrl, setAttachmentUrl] = React.useState<string | null>(null);
  const [attachmentKind, setAttachmentKind] =
    React.useState<AttachmentKind>("image");
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);
  const [callStream, setCallStream] = React.useState<MediaStream | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [loaded, setLoaded] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const callVideoRef = React.useRef<HTMLVideoElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);
  const audioInputRef = React.useRef<HTMLInputElement>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const lastTypingAtRef = React.useRef(0);
  const copy = CHAT_COPY[locale];

  const syncConversation = React.useCallback(async (markRead = false) => {
    const data: {
      conversation: {
        id: string;
        status: string;
        isBlocked: boolean;
        unreadCount: number;
        messages: Message[];
      } | null;
    } = await fetch(`/api/chat${markRead ? "?markRead=1" : ""}`, {
      cache: "no-store",
    }).then((r) => (r.ok ? r.json() : { conversation: null }));
    if (data.conversation) {
      setConversationId(data.conversation.id);
      setMessages(data.conversation.messages);
      setIsBlocked(data.conversation.isBlocked);
      setUnreadCount(data.conversation.unreadCount);
    } else {
      setConversationId(null);
      setMessages([]);
      setIsBlocked(false);
      setUnreadCount(0);
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

  React.useEffect(() => {
    void syncConversation(false).catch(() => setLoaded(true));
  }, [syncConversation]);

  // Hydrate existing conversation on first open.
  React.useEffect(() => {
    if (!open || loaded) return;
    void syncConversation(true).catch(() => setLoaded(true));
  }, [open, loaded, syncConversation]);

  React.useEffect(() => {
    if (!open || !conversationId) return;
    const poll = window.setInterval(() => {
      if (document.hidden) return;
      void syncConversation(true).catch(() => undefined);
    }, 10000);
    return () => window.clearInterval(poll);
  }, [conversationId, open, syncConversation]);

  // Realtime subscription for the active conversation.
  React.useEffect(() => {
    if (!conversationId) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    const channel = pusher.subscribe(clientChannels.chat(conversationId));

    const onMessage = (msg: Message) => {
      setMessages((prev) => mergeMessage(prev, msg));
      if (msg.senderType === "STAFF") setStaffTyping(false);
      if (!open && msg.senderType === "STAFF") {
        setUnreadCount((count) => count + 1);
      }
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
  }, [conversationId, open]);

  // Auto-scroll to newest.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    if (open) setUnreadCount(0);
  }, [messages, staffTyping, open]);

  React.useEffect(() => {
    if (!callVideoRef.current) return;
    callVideoRef.current.srcObject = callStream;
  }, [callStream]);

  React.useEffect(() => {
    if (!isRecording) return;
    setRecordingSeconds(0);
    const tick = window.setInterval(() => {
      setRecordingSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(tick);
  }, [isRecording]);

  React.useEffect(() => {
    return () => {
      callStream?.getTracks().forEach((track) => track.stop());
      mediaRecorderRef.current?.stream
        .getTracks()
        .forEach((track) => track.stop());
    };
  }, [callStream]);

  function optimisticAppend(body: string | null, image: string | null) {
    setMessages((prev) => [
      ...prev,
      {
        id: `tmp-${Date.now()}`,
        senderType: "CUSTOMER",
        type: image ? "IMAGE" : "TEXT",
        body,
        imageUrl: image,
        senderName: guestName || "You",
        senderImage: null,
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function notifyTyping() {
    if (!conversationId) return;
    const now = Date.now();
    if (now - lastTypingAtRef.current < 2000) return;
    lastTypingAtRef.current = now;
    void sendTyping(conversationId);
  }

  async function uploadMedia(
    file: File,
    kind: AttachmentKind,
    options: { attach?: boolean } = {},
  ) {
    const shouldAttach = options.attach ?? true;
    const formData = new FormData();
    formData.set("media", file);
    formData.set("kind", kind);
    if (conversationId) formData.set("conversationId", conversationId);

    setIsUploading(true);
    try {
      const response = await fetch("/api/chat/upload", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as {
        imageUrl?: string;
        kind?: AttachmentKind;
        error?: string;
      };
      if (!response.ok || !result.imageUrl) {
        toast.error(result.error ?? "Datei konnte nicht hochgeladen werden.");
        return null;
      }
      if (shouldAttach) {
        setAttachmentUrl(result.imageUrl);
        setAttachmentKind(result.kind ?? kind);
      }
      return { url: result.imageUrl, kind: result.kind ?? kind };
    } finally {
      setIsUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (videoInputRef.current) videoInputRef.current.value = "";
      if (audioInputRef.current) audioInputRef.current.value = "";
    }
  }

  function sendCustomerMessage(body: string | null, imageUrl: string | null) {
    if (isBlocked) {
      toast.error(copy.blocked);
      return;
    }
    if (!isLoggedIn && !conversationId && !guestEmail.trim()) {
      toast.error(copy.emailRequired);
      setAttachmentUrl(imageUrl);
      if (imageUrl) setAttachmentKind(getAttachmentKind(imageUrl));
      return;
    }
    optimisticAppend(body, imageUrl);
    startTransition(async () => {
      const result = conversationId
        ? await sendMessage({
            conversationId,
            body: body ?? "",
            imageUrl: imageUrl ?? undefined,
          })
        : await startChat({
            message: body ?? "",
            imageUrl: imageUrl ?? undefined,
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

  async function toggleVoiceRecording() {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    if (!canUseMediaDevices()) {
      showSecureContextToast();
      audioInputRef.current?.click();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mimeType = getSupportedAudioMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        setIsRecording(false);
        if (audioChunksRef.current.length === 0) {
          toast.error("Keine Sprachnachricht aufgenommen.");
          return;
        }
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const audioFile = new File(
          [audioBlob],
          `voice-${Date.now()}.${audioExtension(audioBlob.type)}`,
          { type: audioBlob.type },
        );
        void uploadMedia(audioFile, "audio", { attach: false }).then(
          (uploaded) => {
            if (!uploaded?.url) return;
            sendCustomerMessage(null, uploaded.url);
          },
        );
      };
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      toast.error(getMediaErrorMessage(error, "Микрофон фаъол нашуд."));
    }
  }

  async function toggleVideoCall() {
    if (callStream) {
      callStream.getTracks().forEach((track) => track.stop());
      setCallStream(null);
      return;
    }
    if (!canUseMediaDevices()) {
      showSecureContextToast();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: true,
      });
      setCallStream(stream);
      toast.success("Камера ва микрофон фаъол шуд.");
    } catch (firstError) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
        setCallStream(stream);
        toast.success("Камера фаъол шуд. Микрофон дастрас нест.");
      } catch (secondError) {
        toast.error(
          getMediaErrorMessage(
            secondError instanceof DOMException ? secondError : firstError,
            "Камера ё микрофон фаъол нашуд.",
          ),
        );
      }
    }
  }

  function formatRecordingTime(seconds: number) {
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return `${minutes}:${rest.toString().padStart(2, "0")}`;
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if (!body && !attachmentUrl) return;
    if (isBlocked) {
      toast.error(copy.blocked);
      return;
    }
    if (!isLoggedIn && !conversationId && !guestEmail.trim()) {
      toast.error(copy.emailRequired);
      return;
    }
    setDraft("");
    const attachedImageUrl = attachmentUrl;
    setAttachmentUrl(null);
    sendCustomerMessage(body || null, attachedImageUrl);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Chat schließen" : "Chat öffnen"}
        aria-expanded={open}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-premium-lg transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-gold dark:text-gold-foreground",
          open && "hidden sm:flex",
        )}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
        {!open && unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-semibold text-destructive-foreground ring-2 ring-background">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex h-[100dvh] w-screen flex-col overflow-hidden border bg-background shadow-premium-lg sm:inset-auto sm:bottom-24 sm:right-5 sm:h-[30rem] sm:w-[calc(100vw-2.5rem)] sm:max-w-sm sm:rounded-xl">
          <div className="flex items-center justify-between border-b bg-primary px-4 py-3 text-primary-foreground dark:bg-card dark:text-foreground">
            <div>
              <p className="font-display font-semibold">{copy.chatTitle}</p>
              <p className="text-xs opacity-80">{copy.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSelect compact />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground dark:text-foreground"
                onClick={() => setOpen(false)}
                aria-label="Chat schließen"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div
            ref={scrollRef}
            className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4"
            aria-live="polite"
          >
            {messages.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground">
                {copy.empty}
              </p>
            ) : (
              messages.map((message) => {
                const mine = message.senderType === "CUSTOMER";
                const isSystem = message.senderType === "SYSTEM";
                return (
                  <div
                    key={message.id}
                    className={cn(
                      "flex items-end gap-2",
                      mine ? "justify-end" : "justify-start",
                    )}
                  >
                    {!mine && !isSystem ? (
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage
                          src={message.senderImage ?? undefined}
                          alt=""
                        />
                        <AvatarFallback>
                          {initials(message.senderName ?? "Team")}
                        </AvatarFallback>
                      </Avatar>
                    ) : null}
                    <span
                      className={cn(
                        "max-w-[80%] rounded-2xl px-3 py-2 text-sm",
                        mine
                          ? "bg-gold text-gold-foreground"
                          : isSystem
                            ? "mx-auto bg-muted text-muted-foreground"
                            : "bg-secondary text-secondary-foreground",
                      )}
                    >
                      {!isSystem && message.senderName ? (
                        <span className="mb-0.5 block text-[10px] font-semibold opacity-70">
                          {message.senderName}
                        </span>
                      ) : null}
                      {message.imageUrl ? (
                        <ChatAttachmentPreview
                          url={message.imageUrl}
                          mine={mine}
                        />
                      ) : null}
                      {message.body ? <span>{message.body}</span> : null}
                      <span className="mt-0.5 block text-right text-[10px] tabular-nums opacity-70">
                        {formatMessageTime(message.createdAt)}
                      </span>
                    </span>
                    {mine ? (
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarImage
                          src={message.senderImage ?? undefined}
                          alt=""
                        />
                        <AvatarFallback>
                          {initials(message.senderName ?? guestName ?? "You")}
                        </AvatarFallback>
                      </Avatar>
                    ) : null}
                  </div>
                );
              })
            )}
            {staffTyping ? (
              <p className="text-xs italic text-muted-foreground">
                Team schreibt …
              </p>
            ) : null}
          </div>

          <form onSubmit={submit} className="space-y-2 border-t p-3">
            {callStream ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
                <video
                  ref={callVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-20 w-28 rounded object-cover"
                />
                <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                  {copy.videoCallReady}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={toggleVideoCall}
                >
                  {copy.end}
                </Button>
              </div>
            ) : null}
            {isBlocked ? (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {copy.blocked}
              </p>
            ) : null}
            {!isLoggedIn && !conversationId ? (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder={copy.name}
                  className="h-9"
                  aria-label="Ihr Name"
                />
                <Input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder={copy.email}
                  className="h-9"
                  aria-label="Ihre E-Mail"
                />
              </div>
            ) : null}
            {attachmentUrl ? (
              <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
                <ChatAttachmentPreview url={attachmentUrl} compact mine />
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                  {attachmentLabel(attachmentKind, copy)}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setAttachmentUrl(null)}
                  aria-label="Anhang entfernen"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadMedia(file, "image");
                }}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadMedia(file, "video");
                }}
              />
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadMedia(file, "audio");
                }}
              />
              {isRecording ? (
                <div className="flex h-10 flex-1 items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 text-sm text-destructive">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
                  <span className="font-medium">
                    {formatRecordingTime(recordingSeconds)}
                  </span>
                  <span className="text-xs">{copy.recording}</span>
                </div>
              ) : (
                <textarea
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    notifyTyping();
                  }}
                  placeholder={copy.placeholder}
                  className="h-9 max-h-9 min-h-9 min-w-[8rem] flex-1 resize-none overflow-y-auto rounded-md border border-input bg-background px-3 py-1.5 text-sm leading-5 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Nachricht"
                  disabled={isBlocked}
                />
              )}
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  disabled={isBlocked || isUploading}
                  loading={isUploading}
                  onClick={() => imageInputRef.current?.click()}
                  aria-label="Bild anhängen"
                >
                  {!isUploading ? <ImagePlus className="h-4 w-4" /> : null}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  disabled={isBlocked || isUploading}
                  onClick={() => videoInputRef.current?.click()}
                  aria-label="Video anhängen"
                >
                  <FileVideo className="h-4 w-4" />
                </Button>
                <VideoCallPanel
                  conversationId={conversationId}
                  role="CUSTOMER"
                  disabled={isBlocked || isUploading}
                />
                <Button
                  type="button"
                  variant={isRecording ? "destructive" : "outline"}
                  size="icon"
                  className="h-9 w-9"
                  disabled={isBlocked || isUploading}
                  onClick={toggleVoiceRecording}
                  aria-label={
                    isRecording
                      ? "Sprachnachricht stoppen"
                      : "Sprachnachricht aufnehmen"
                  }
                >
                  {isRecording ? (
                    <Square className="h-4 w-4" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <Button
                type="submit"
                variant="gold"
                size="icon"
                className="h-9 w-9 shrink-0"
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
