"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Ban,
  Check,
  FileText,
  FileVideo,
  ImagePlus,
  MessageCircle,
  Mic,
  Send,
  Square,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  blockChatUser,
  resolveConversation,
  saveChatNote,
  sendTyping,
  staffReply,
} from "@/actions/chat";
import { getPusherClient, clientChannels } from "@/lib/realtime/client";
import type { AppLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LanguageSelect,
  useLanguage,
} from "@/components/i18n/language-provider";
import { AudioMessagePlayer } from "@/components/chat/audio-message-player";
import { VideoCallPanel } from "@/components/chat/video-call-panel";

type Message = {
  id: string;
  senderType: "CUSTOMER" | "STAFF" | "SYSTEM";
  type?: "TEXT" | "IMAGE";
  body: string | null;
  imageUrl: string | null;
  createdAt: string;
};

type AttachmentKind = "image" | "video" | "audio" | "document";

export type ConversationListItem = {
  id: string;
  who: string;
  contact: string;
  status: string;
  isBlocked: boolean;
  lastMessage: string;
  updatedAt: string;
  unreadCount: number;
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Offen",
  ASSIGNED: "Zugewiesen",
  RESOLVED: "Gelöst",
  ARCHIVED: "Archiviert",
};

const CHAT_COPY: Record<
  AppLocale,
  {
    messages: string;
    language: string;
    conversation: string;
    noConversation: string;
    replyPlaceholder: string;
    internalNote: string;
    note: string;
    resolve: string;
    block: string;
    unblock: string;
    blocked: string;
    unread: string;
    recording: string;
    videoReady: string;
    end: string;
    imageReady: string;
    videoAttachmentReady: string;
    documentReady: string;
    voiceReady: string;
    now: string;
    minuteAgo: string;
    minutesAgo: string;
    hourAgo: string;
    hoursAgo: string;
  }
> = {
  de: {
    messages: "Messages",
    language: "Sprache",
    conversation: "Unterhaltung",
    noConversation: "Wählen Sie links eine Unterhaltung.",
    replyPlaceholder: "Antwort schreiben ...",
    internalNote: "Interne Notiz (nur Team)",
    note: "Notiz",
    resolve: "Lösen",
    block: "Blockieren",
    unblock: "Entsperren",
    blocked: "Blockiert",
    unread: "ungelesen",
    recording: "Sprachnachricht aufnehmen",
    videoReady: "Videoanruf bereit",
    end: "Beenden",
    imageReady: "Bild bereit zum Senden",
    videoAttachmentReady: "Video bereit zum Senden",
    documentReady: "Dokument bereit zum Senden",
    voiceReady: "Sprachnachricht bereit zum Senden",
    now: "gerade eben",
    minuteAgo: "vor 1 Min.",
    minutesAgo: "vor {n} Min.",
    hourAgo: "vor 1 Std.",
    hoursAgo: "vor {n} Std.",
  },
  ru: {
    messages: "Сообщения",
    language: "Язык",
    conversation: "Диалог",
    noConversation: "Выберите диалог слева.",
    replyPlaceholder: "Написать ответ ...",
    internalNote: "Внутренняя заметка (только команда)",
    note: "Заметка",
    resolve: "Закрыть",
    block: "Блокировать",
    unblock: "Разблокировать",
    blocked: "Заблокирован",
    unread: "непрочитано",
    recording: "Запись голосового сообщения",
    videoReady: "Видеозвонок готов",
    end: "Завершить",
    imageReady: "Фото готово к отправке",
    videoAttachmentReady: "Видео готово к отправке",
    documentReady: "Документ готов к отправке",
    voiceReady: "Голосовое готово к отправке",
    now: "только что",
    minuteAgo: "1 мин. назад",
    minutesAgo: "{n} мин. назад",
    hourAgo: "1 ч. назад",
    hoursAgo: "{n} ч. назад",
  },
  en: {
    messages: "Messages",
    language: "Language",
    conversation: "Conversation",
    noConversation: "Choose a conversation on the left.",
    replyPlaceholder: "Write a reply ...",
    internalNote: "Internal note (team only)",
    note: "Note",
    resolve: "Resolve",
    block: "Block",
    unblock: "Unblock",
    blocked: "Blocked",
    unread: "unread",
    recording: "Recording voice message",
    videoReady: "Video call ready",
    end: "End",
    imageReady: "Image ready to send",
    videoAttachmentReady: "Video ready to send",
    documentReady: "Document ready to send",
    voiceReady: "Voice message ready to send",
    now: "just now",
    minuteAgo: "1 min ago",
    minutesAgo: "{n} min ago",
    hourAgo: "1 hour ago",
    hoursAgo: "{n} hours ago",
  },
  tg: {
    messages: "Паёмҳо",
    language: "Забон",
    conversation: "Суҳбат",
    noConversation: "Аз тарафи чап як суҳбатро интихоб кунед.",
    replyPlaceholder: "Ҷавоб нависед ...",
    internalNote: "Ёддошти дохилӣ (танҳо команда)",
    note: "Ёддошт",
    resolve: "Ҳал шуд",
    block: "Блок",
    unblock: "Аз блок барор",
    blocked: "Блок шудааст",
    unread: "нохонда",
    recording: "Сабти паёми овозӣ",
    videoReady: "Видео-занг омода аст",
    end: "Қатъ",
    imageReady: "Сурат барои фиристодан омода",
    videoAttachmentReady: "Видео барои фиристодан омода",
    documentReady: "Ҳуҷҷат барои фиристодан омода",
    voiceReady: "Овоз барои фиристодан омода",
    now: "ҳозир",
    minuteAgo: "1 дақ. пеш",
    minutesAgo: "{n} дақ. пеш",
    hourAgo: "1 соат пеш",
    hoursAgo: "{n} соат пеш",
  },
};

function getAttachmentKind(url: string): AttachmentKind {
  if (url.includes("/chat/document/") || url.includes("/document/")) {
    return "document";
  }
  if (url.includes("/chat/audio/") || url.includes("/audio/")) {
    return "audio";
  }
  if (url.includes("/chat/video/") || url.includes("/video/")) return "video";
  if (/\.(pdf|doc|docx|xls|xlsx|txt|csv)$/i.test(url)) return "document";
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
  if (kind === "video") return copy.videoAttachmentReady;
  if (kind === "audio") return copy.voiceReady;
  if (kind === "document") return copy.documentReady;
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
          compact ? "h-12 max-w-32" : "max-h-48",
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
  if (kind === "document") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="mb-2 inline-flex max-w-full items-center gap-2 rounded-md border bg-background px-3 py-2 text-xs font-medium underline-offset-4 hover:underline"
      >
        <FileText className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {decodeURIComponent(url.split("/").pop() ?? "Dokument")}
        </span>
      </a>
    );
  }
  return (
    <Image
      src={url}
      alt=""
      width={compact ? 48 : 420}
      height={compact ? 48 : 288}
      className={cn(
        "mb-2 rounded-lg object-cover",
        compact ? "h-12 w-12" : "max-h-48 w-full",
      )}
    />
  );
}

/** Two-pane staff chat inbox: conversation list + active thread. */
export function AdminChat({
  conversations,
  initialActive,
  initialMessages,
  initialNote,
  initialStatus,
  initialIsBlocked,
  initialUnreadTotal,
  canBlock,
}: {
  conversations: ConversationListItem[];
  initialActive: string | null;
  initialMessages: Message[];
  initialNote: string;
  initialStatus: string;
  initialIsBlocked: boolean;
  initialUnreadTotal: number;
  canBlock: boolean;
}) {
  const router = useRouter();
  const { locale } = useLanguage();
  const [activeId, setActiveId] = React.useState(initialActive);
  const [messageInbox, setMessageInbox] = React.useState(conversations);
  const [totalUnread, setTotalUnread] = React.useState(initialUnreadTotal);
  const [liveMessages, setLiveMessages] =
    React.useState<Message[]>(initialMessages);
  const [note, setNote] = React.useState(initialNote);
  const [status, setStatus] = React.useState(initialStatus);
  const [isBlocked, setIsBlocked] = React.useState(initialIsBlocked);
  const [draft, setDraft] = React.useState("");
  const [attachmentUrl, setAttachmentUrl] = React.useState<string | null>(null);
  const [attachmentKind, setAttachmentKind] =
    React.useState<AttachmentKind>("image");
  const [isUploading, setIsUploading] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);
  const [callStream, setCallStream] = React.useState<MediaStream | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const callVideoRef = React.useRef<HTMLVideoElement>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);
  const audioInputRef = React.useRef<HTMLInputElement>(null);
  const documentInputRef = React.useRef<HTMLInputElement>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const audioChunksRef = React.useRef<Blob[]>([]);
  const lastTypingAtRef = React.useRef(0);
  const copy = CHAT_COPY[locale];
  const routeBase = "/admin/messages";

  // Refresh the message pane when switching conversations (server nav).
  function openConversation(id: string) {
    setActiveId(id);
    router.push(`${routeBase}?c=${id}`);
  }

  function notifyTyping() {
    if (!activeId) return;
    const now = Date.now();
    if (now - lastTypingAtRef.current < 2000) return;
    lastTypingAtRef.current = now;
    void sendTyping(activeId);
  }

  function formatRelative(value: string) {
    const diffMs = Date.now() - new Date(value).getTime();
    const minutes = Math.max(0, Math.floor(diffMs / 60_000));
    if (minutes < 1) return copy.now;
    if (minutes === 1) return copy.minuteAgo;
    if (minutes < 60) return copy.minutesAgo.replace("{n}", String(minutes));
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return copy.hourAgo;
    return copy.hoursAgo.replace("{n}", String(hours));
  }

  React.useEffect(() => {
    setMessageInbox(conversations);
    setTotalUnread(initialUnreadTotal);
    setLiveMessages(initialMessages);
    setNote(initialNote);
    setStatus(initialStatus);
    setIsBlocked(initialIsBlocked);
    setActiveId(initialActive);
  }, [
    conversations,
    initialUnreadTotal,
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
        setLiveMessages((prev) => mergeMessage(prev, msg));
      });
      convChannel.bind(
        "access",
        (data: { isBlocked?: boolean; status?: string }) => {
          if (typeof data.isBlocked === "boolean") setIsBlocked(data.isBlocked);
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
      if (document.hidden) return;
      void fetch(`/api/admin/chat/${activeId}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then(
          (
            data: {
              conversation?: {
                status: string;
                isBlocked: boolean;
                internalNotes: string;
                messages: Message[];
              };
            } | null,
          ) => {
            if (!data?.conversation) return;
            setStatus(data.conversation.status);
            setIsBlocked(data.conversation.isBlocked);
            setNote(data.conversation.internalNotes);
            setLiveMessages(data.conversation.messages);
          },
        )
        .catch(() => undefined);
    }, 10000);
    return () => window.clearInterval(poll);
  }, [activeId]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [liveMessages]);

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

  async function uploadMedia(
    file: File,
    kind: AttachmentKind,
    options: { attach?: boolean } = {},
  ) {
    const shouldAttach = options.attach ?? true;
    const formData = new FormData();
    formData.set("media", file);
    formData.set("kind", kind);
    if (activeId) formData.set("conversationId", activeId);

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
      if (documentInputRef.current) documentInputRef.current.value = "";
    }
  }

  function sendStaffMessage(body: string | null, imageUrl: string | null) {
    if (!activeId) return;
    setLiveMessages((prev) =>
      mergeMessage(prev, {
        id: `tmp-${Date.now()}`,
        senderType: "STAFF",
        type: imageUrl ? "IMAGE" : "TEXT",
        body,
        imageUrl,
        createdAt: new Date().toISOString(),
      }),
    );
    startTransition(async () => {
      const result = await staffReply({
        conversationId: activeId,
        body: body ?? "",
        imageUrl: imageUrl ?? undefined,
      });
      if (!result.success) toast.error(result.error);
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
          {
            type: audioBlob.type,
          },
        );
        void uploadMedia(audioFile, "audio", { attach: false }).then(
          (uploaded) => {
            if (!uploaded?.url) return;
            sendStaffMessage(null, uploaded.url);
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

  function reply(event: React.FormEvent) {
    event.preventDefault();
    const body = draft.trim();
    if ((!body && !attachmentUrl) || !activeId) return;
    setDraft("");
    const attachedImageUrl = attachmentUrl;
    setAttachmentUrl(null);
    sendStaffMessage(body || null, attachedImageUrl);
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
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="secondary">{copy.messages}</Badge>
        <LanguageSelect />
      </div>

      <div className="grid gap-3 lg:h-[min(34rem,calc(100dvh-18rem))] lg:min-h-0 lg:grid-cols-[250px_1fr]">
        {/* Conversation list */}
        <aside className="min-h-0 space-y-2 overflow-y-auto rounded-lg border bg-card p-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {copy.messages}
            </span>
            <span className="relative inline-flex h-8 w-8 items-center justify-center rounded-md border">
              <MessageCircle className="h-4 w-4" />
              {totalUnread > 0 ? (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              ) : null}
            </span>
          </div>
          {messageInbox.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {copy.noConversation}
            </p>
          ) : (
            messageInbox.map((c) => (
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
                {c.unreadCount > 0 ? (
                  <span className="mt-1 inline-flex rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-destructive-foreground">
                    {c.unreadCount} {copy.unread}
                  </span>
                ) : null}
                {c.isBlocked ? (
                  <span className="mt-1 inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                    {copy.blocked}
                  </span>
                ) : null}
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                  {c.lastMessage}
                </span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">
                  Live • {formatRelative(c.updatedAt)}
                </span>
              </button>
            ))
          )}
        </aside>

        {/* Active thread */}
        <section className="flex min-h-[22rem] flex-col overflow-hidden rounded-lg border bg-card lg:min-h-0">
          {!activeId ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              {copy.noConversation}
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 border-b p-3">
                <p className="text-sm font-medium">{copy.conversation}</p>
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
                    <Check /> {copy.resolve}
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
                      <Ban /> {isBlocked ? copy.unblock : copy.block}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div
                ref={scrollRef}
                className="min-h-0 flex-1 space-y-1.5 overflow-y-auto p-3"
                aria-live="polite"
              >
                {liveMessages.map((message) => (
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
                        "max-w-[68%] rounded-xl px-2.5 py-1.5 text-sm",
                        message.senderType === "STAFF"
                          ? "bg-gold text-gold-foreground"
                          : message.senderType === "SYSTEM"
                            ? "bg-muted text-muted-foreground"
                            : "bg-secondary text-secondary-foreground",
                      )}
                    >
                      {message.imageUrl ? (
                        <ChatAttachmentPreview
                          url={message.imageUrl}
                          mine={message.senderType === "STAFF"}
                        />
                      ) : null}
                      {message.body ? <span>{message.body}</span> : null}
                    </span>
                  </div>
                ))}
              </div>

              <div className="shrink-0 border-t p-3">
                <form onSubmit={reply} className="space-y-2">
                  {callStream ? (
                    <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2">
                      <video
                        ref={callVideoRef}
                        autoPlay
                        muted
                        playsInline
                        className="h-20 w-32 rounded object-cover"
                      />
                      <span className="min-w-0 flex-1 text-xs text-muted-foreground">
                        {copy.videoReady}
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
                    <input
                      ref={documentInputRef}
                      type="file"
                      accept="application/pdf,text/plain,text/csv,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void uploadMedia(file, "document");
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
                        placeholder={copy.replyPlaceholder}
                        className="h-9 max-h-9 min-h-9 min-w-[10rem] flex-1 resize-none overflow-y-auto rounded-md border border-input bg-background px-3 py-1.5 text-sm leading-5 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label="Antwort"
                      />
                    )}
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        disabled={isPending || isUploading}
                        loading={isUploading}
                        onClick={() => imageInputRef.current?.click()}
                        aria-label="Bild anhängen"
                      >
                        {!isUploading ? (
                          <ImagePlus className="h-4 w-4" />
                        ) : null}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        disabled={isPending || isUploading}
                        onClick={() => videoInputRef.current?.click()}
                        aria-label="Video anhängen"
                      >
                        <FileVideo className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9"
                        disabled={isPending || isUploading}
                        onClick={() => documentInputRef.current?.click()}
                        aria-label="Dokument anhängen"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <VideoCallPanel
                        conversationId={activeId}
                        role="STAFF"
                        disabled={isPending || isUploading}
                      />
                      <Button
                        type="button"
                        variant={isRecording ? "destructive" : "outline"}
                        size="icon"
                        className="h-9 w-9"
                        disabled={isPending || isUploading}
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
                      loading={isPending}
                      aria-label="Senden"
                    >
                      {!isPending ? <Send className="h-4 w-4" /> : null}
                    </Button>
                  </div>
                </form>
                <div className="mt-2 flex gap-2">
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={copy.internalNote}
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
                    {copy.note}
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
