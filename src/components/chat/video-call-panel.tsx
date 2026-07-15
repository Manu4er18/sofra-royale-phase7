"use client";

import * as React from "react";
import { Phone, PhoneOff, Video } from "lucide-react";
import { toast } from "sonner";

import { sendChatCallSignal } from "@/actions/chat";
import { clientChannels, getPusherClient } from "@/lib/realtime/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ChatRole = "CUSTOMER" | "STAFF";
type CallAction =
  "request" | "accept" | "decline" | "end" | "offer" | "answer" | "ice";

type CallSignal = {
  conversationId: string;
  callId: string;
  action: CallAction;
  payload?: unknown;
  senderType: ChatRole;
  senderName?: string;
  sentAt?: string;
};

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function createCallId() {
  if (typeof crypto !== "undefined") {
    return crypto.randomUUID();
  }
  return `call-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function canUseCallDevices() {
  return Boolean(
    window.isSecureContext &&
    "mediaDevices" in navigator &&
    "getUserMedia" in navigator.mediaDevices &&
    "RTCPeerConnection" in window,
  );
}

function callError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "Камера ё микрофон иҷозат надорад.";
    }
    if (error.name === "NotFoundError") return "Камера ё микрофон ёфт нашуд.";
  }
  return "Видео-занг фаъол нашуд.";
}

export function VideoCallPanel({
  conversationId,
  role,
  disabled,
  className,
}: {
  conversationId: string | null;
  role: ChatRole;
  disabled?: boolean;
  className?: string;
}) {
  const [callId, setCallId] = React.useState<string | null>(null);
  const [incoming, setIncoming] = React.useState<CallSignal | null>(null);
  const [signalConversationId, setSignalConversationId] = React.useState<
    string | null
  >(conversationId);
  const [isCalling, setIsCalling] = React.useState(false);
  const [isConnected, setIsConnected] = React.useState(false);
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(
    null,
  );
  const [remoteStream, setRemoteStream] = React.useState<MediaStream | null>(
    null,
  );
  const peerRef = React.useRef<RTCPeerConnection | null>(null);
  const localVideoRef = React.useRef<HTMLVideoElement>(null);
  const remoteVideoRef = React.useRef<HTMLVideoElement>(null);
  const lastFallbackSignalAtRef = React.useRef(Date.now() - 5000);

  React.useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  React.useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  React.useEffect(() => {
    if (!incoming) setSignalConversationId(conversationId);
  }, [conversationId, incoming]);

  const sendSignal = React.useCallback(
    async (
      action: CallAction,
      nextCallId: string,
      payload?: unknown,
      targetConversationId = signalConversationId ?? conversationId,
    ) => {
      if (!targetConversationId) return false;
      const result = await sendChatCallSignal({
        conversationId: targetConversationId,
        callId: nextCallId,
        action,
        payload,
      });
      if (!result.success) {
        toast.error(result.error);
        return false;
      }
      return true;
    },
    [conversationId, signalConversationId],
  );

  const stopCall = React.useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    localStream?.getTracks().forEach((track) => track.stop());
    setLocalStream(null);
    setRemoteStream(null);
    setIncoming(null);
    setIsCalling(false);
    setIsConnected(false);
    setCallId(null);
  }, [localStream]);

  const getLocalStream = React.useCallback(async () => {
    if (!canUseCallDevices()) {
      toast.error(
        "Барои видео-занг HTTPS ва иҷозати камера/микрофон лозим аст.",
      );
      return null;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: true,
      });
      setLocalStream(stream);
      return stream;
    } catch (error) {
      toast.error(callError(error));
      return null;
    }
  }, []);

  const createPeer = React.useCallback(
    (nextCallId: string, stream: MediaStream) => {
      peerRef.current?.close();
      const peer = new RTCPeerConnection(RTC_CONFIG);
      peerRef.current = peer;
      const remote = new MediaStream();
      setRemoteStream(remote);

      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      peer.ontrack = (event) => {
        event.streams[0]
          ?.getTracks()
          .forEach((track) => remote.addTrack(track));
        setRemoteStream(new MediaStream(remote.getTracks()));
      };
      peer.onicecandidate = (event) => {
        if (event.candidate)
          void sendSignal("ice", nextCallId, event.candidate.toJSON());
      };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected") setIsConnected(true);
        if (
          ["failed", "disconnected", "closed"].includes(peer.connectionState)
        ) {
          setIsConnected(false);
        }
      };
      return peer;
    },
    [sendSignal],
  );

  const startOffer = React.useCallback(
    async (nextCallId: string) => {
      const stream = localStream ?? (await getLocalStream());
      if (!stream) return;
      const peer = createPeer(nextCallId, stream);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      await sendSignal("offer", nextCallId, offer);
    },
    [createPeer, getLocalStream, localStream, sendSignal],
  );

  const acceptCall = React.useCallback(async () => {
    if (!incoming) return;
    const stream = await getLocalStream();
    if (!stream) return;
    setCallId(incoming.callId);
    setSignalConversationId(incoming.conversationId);
    setIsCalling(true);
    await sendSignal(
      "accept",
      incoming.callId,
      undefined,
      incoming.conversationId,
    );
  }, [getLocalStream, incoming, sendSignal]);

  const declineCall = React.useCallback(async () => {
    if (!incoming) return;
    await sendSignal(
      "decline",
      incoming.callId,
      undefined,
      incoming.conversationId,
    );
    stopCall();
  }, [incoming, sendSignal, stopCall]);

  const handleSignal = React.useCallback(
    async (signal: CallSignal, activeConversationId?: string | null) => {
      const scopedConversationId = activeConversationId ?? signalConversationId;
      if (signal.senderType === role) return;
      if (
        scopedConversationId &&
        signal.conversationId !== scopedConversationId
      ) {
        return;
      }
      if (signal.action === "request") {
        setIncoming(signal);
        setCallId(signal.callId);
        setSignalConversationId(signal.conversationId);
        return;
      }
      if (signal.action === "decline" || signal.action === "end") {
        toast.message(
          signal.action === "decline" ? "Занг рад шуд." : "Занг қатъ шуд.",
        );
        stopCall();
        return;
      }
      if (signal.action === "accept") {
        setIsCalling(true);
        await startOffer(signal.callId);
        return;
      }
      if (signal.action === "offer") {
        const stream = localStream ?? (await getLocalStream());
        if (!stream) return;
        setSignalConversationId(signal.conversationId);
        const peer = createPeer(signal.callId, stream);
        await peer.setRemoteDescription(
          signal.payload as RTCSessionDescriptionInit,
        );
        const answer = await peer.createAnswer();
        await peer.setLocalDescription(answer);
        await sendSignal(
          "answer",
          signal.callId,
          answer,
          signal.conversationId,
        );
        setIsCalling(true);
        setIsConnected(true);
        return;
      }
      if (signal.action === "answer" && peerRef.current) {
        await peerRef.current.setRemoteDescription(
          signal.payload as RTCSessionDescriptionInit,
        );
        setIsConnected(true);
        return;
      }
      if (signal.action === "ice" && peerRef.current && signal.payload) {
        try {
          await peerRef.current.addIceCandidate(
            signal.payload as RTCIceCandidateInit,
          );
        } catch {
          // ICE can arrive during teardown; ignore stale candidates.
        }
      }
    },
    [
      createPeer,
      getLocalStream,
      localStream,
      role,
      sendSignal,
      signalConversationId,
      startOffer,
      stopCall,
    ],
  );

  React.useEffect(() => {
    const activeConversationId = signalConversationId ?? conversationId;
    if (!activeConversationId) return;
    const pusher = getPusherClient();
    if (!pusher) return;
    const chatChannel = pusher.subscribe(
      clientChannels.chat(activeConversationId),
    );

    const onSignal = (signal: CallSignal) => {
      void handleSignal(signal, activeConversationId);
    };

    chatChannel.bind("call-signal", onSignal);
    return () => {
      chatChannel.unbind("call-signal", onSignal);
      pusher.unsubscribe(clientChannels.chat(activeConversationId));
    };
  }, [conversationId, handleSignal, role, signalConversationId]);

  React.useEffect(() => {
    if (role !== "STAFF") return;
    const pusher = getPusherClient();
    if (!pusher) return;
    const staffChannel = pusher.subscribe(clientChannels.staffChat);
    const onIncoming = (signal: CallSignal) => {
      if (signal.senderType !== "CUSTOMER") return;
      void handleSignal(signal);
    };
    staffChannel.bind("incoming-call", onIncoming);
    return () => {
      staffChannel.unbind("incoming-call", onIncoming);
      pusher.unsubscribe(clientChannels.staffChat);
    };
  }, [handleSignal, role]);

  React.useEffect(() => {
    if (getPusherClient()) return;
    const poll = window.setInterval(() => {
      const activeConversationId = signalConversationId ?? conversationId;
      const params = new URLSearchParams({
        role,
        since: String(lastFallbackSignalAtRef.current),
      });
      if (activeConversationId)
        params.set("conversationId", activeConversationId);
      void fetch(`/api/chat/call-signals?${params.toString()}`, {
        cache: "no-store",
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { signals?: CallSignal[] } | null) => {
          const signals = data?.signals ?? [];
          for (const signal of signals) {
            const sentAt = signal.sentAt
              ? Date.parse(signal.sentAt)
              : Date.now();
            if (Number.isFinite(sentAt)) {
              lastFallbackSignalAtRef.current = Math.max(
                lastFallbackSignalAtRef.current,
                sentAt,
              );
            }
            void handleSignal(signal, activeConversationId);
          }
        })
        .catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(poll);
  }, [conversationId, handleSignal, role, signalConversationId]);

  async function startCall() {
    if (!conversationId || disabled) return;
    const stream = await getLocalStream();
    if (!stream) return;
    const nextCallId = createCallId();
    setCallId(nextCallId);
    setSignalConversationId(conversationId);
    setIsCalling(true);
    await sendSignal("request", nextCallId);
  }

  async function endCall() {
    if (callId) await sendSignal("end", callId);
    stopCall();
  }

  return (
    <>
      <Button
        type="button"
        variant={isCalling ? "secondary" : "outline"}
        size="icon"
        className={cn("h-9 w-9", className)}
        disabled={disabled || !conversationId}
        onClick={isCalling ? endCall : startCall}
        aria-label={isCalling ? "Videoanruf beenden" : "Videoanruf starten"}
      >
        {isCalling ? (
          <PhoneOff className="h-4 w-4" />
        ) : (
          <Video className="h-4 w-4" />
        )}
      </Button>

      {incoming && !isCalling ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-sm rounded-2xl border bg-background p-5 text-center shadow-premium-lg">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gold/20">
              <Video className="h-7 w-7 text-gold" />
            </div>
            <p className="text-lg font-semibold">Видео-занги воридшаванда</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {incoming.senderName ?? "Мизоҷ"} занг зада истодааст
            </p>
            <div className="mt-5 flex justify-center gap-4">
              <Button
                type="button"
                className="bg-green-600 text-white hover:bg-green-700"
                onClick={acceptCall}
              >
                <Phone className="h-4 w-4" /> Қабул кардан
              </Button>
              <Button type="button" variant="destructive" onClick={declineCall}>
                <PhoneOff className="h-4 w-4" /> Маҳкам кардан
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {isCalling ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4">
          <div className="relative h-full max-h-[720px] w-full max-w-5xl overflow-hidden rounded-2xl bg-black shadow-premium-lg">
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="h-full w-full object-cover"
            />
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="absolute bottom-20 right-4 h-32 w-24 rounded-xl border border-white/30 object-cover shadow-lg sm:h-40 sm:w-32"
            />
            <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
              {isConnected ? "Пайваст шуд" : "Интизорӣ..."}
            </div>
            <div className="absolute bottom-5 left-0 right-0 flex justify-center">
              <Button
                type="button"
                variant="destructive"
                size="lg"
                onClick={endCall}
              >
                <PhoneOff className="h-5 w-5" /> Маҳкам кардан
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
