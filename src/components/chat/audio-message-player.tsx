"use client";

import * as React from "react";
import { Mic, Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";

function formatTime(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function audioMimeFromUrl(url: string) {
  const clean = url.split("?")[0]?.toLowerCase() ?? url.toLowerCase();
  if (clean.endsWith(".mp3")) return "audio/mpeg";
  if (clean.endsWith(".m4a") || clean.endsWith(".mp4")) return "audio/mp4";
  if (clean.endsWith(".ogg") || clean.endsWith(".oga")) return "audio/ogg";
  if (clean.endsWith(".wav")) return "audio/wav";
  if (clean.endsWith(".aac")) return "audio/aac";
  if (clean.endsWith(".webm")) return "audio/webm";
  return undefined;
}

function cloudinaryAudioFallback(url: string) {
  if (!url.includes("res.cloudinary.com") || !url.includes("/chat/audio/")) {
    return null;
  }
  const [path, query] = url.split("?");
  if (!path || !/\.(webm|m4a|mp4|aac|ogg|wav)$/i.test(path)) return null;
  const transformedPath = path
    .replace("/video/upload/", "/video/upload/f_mp3/")
    .replace(/\.(webm|m4a|mp4|aac|ogg|wav)$/i, ".mp3");
  return `${transformedPath}${query ? `?${query}` : ""}`;
}

export function AudioMessagePlayer({
  src,
  mine = false,
}: {
  src: string;
  mine?: boolean;
}) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [loadError, setLoadError] = React.useState(false);
  const sources = React.useMemo(() => {
    const fallback = cloudinaryAudioFallback(src);
    return [
      { src, type: audioMimeFromUrl(src) },
      ...(fallback ? [{ src: fallback, type: "audio/mpeg" }] : []),
    ];
  }, [src]);

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const syncDuration = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        return;
      }
      if (audio.seekable.length > 0) {
        const seekableEnd = audio.seekable.end(audio.seekable.length - 1);
        if (Number.isFinite(seekableEnd) && seekableEnd > 0) {
          setDuration(seekableEnd);
        }
      }
    };
    const onTime = () => {
      if (audio.currentTime > 1_000_000 && audio.duration === Infinity) {
        audio.currentTime = 0;
        return;
      }
      setCurrentTime(audio.currentTime);
      syncDuration();
    };
    const onMeta = () => {
      setLoadError(false);
      syncDuration();
      if (audio.duration === Infinity) {
        audio.currentTime = Number.MAX_SAFE_INTEGER;
      }
    };
    const onEnded = () => setIsPlaying(false);
    const onError = () => {
      setIsPlaying(false);
      setLoadError(true);
    };

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("loadeddata", onMeta);
    audio.addEventListener("canplay", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onEnded);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("loadeddata", onMeta);
      audio.removeEventListener("canplay", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onEnded);
      audio.removeEventListener("error", onError);
    };
  }, []);

  React.useEffect(() => {
    setCurrentTime(0);
    setDuration(0);
    setLoadError(false);
    setIsPlaying(false);
    audioRef.current?.load();
  }, [src]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio || loadError) return;
    try {
      if (audio.paused) {
        if (audio.readyState === 0) audio.load();
        await audio.play();
        setIsPlaying(true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    } catch {
      setIsPlaying(false);
    }
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = (value / 100) * duration;
    setCurrentTime(audio.currentTime);
  }

  const progress = duration ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div
      className={cn(
        "flex min-w-56 max-w-80 items-center gap-2 rounded-2xl px-2.5 py-2 shadow-sm",
        mine ? "bg-gold/25" : "bg-background/80",
      )}
    >
      <audio ref={audioRef} preload="metadata" crossOrigin="anonymous">
        {sources.map((source) => (
          <source key={source.src} src={source.src} type={source.type} />
        ))}
      </audio>
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          mine ? "bg-gold/30 text-gold-foreground" : "bg-muted text-foreground",
        )}
        aria-hidden
      >
        <Mic className="h-4 w-4" />
      </span>
      <button
        type="button"
        onClick={togglePlayback}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95",
          loadError && "cursor-not-allowed opacity-60",
          mine
            ? "bg-gold text-gold-foreground"
            : "bg-primary text-primary-foreground",
        )}
        disabled={loadError}
        aria-label={isPlaying ? "Pause audio" : "Play audio"}
      >
        {isPlaying ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="relative flex h-7 items-center">
          <div className="bg-current/20 absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full" />
          <div
            className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-current"
            style={{ width: `${progress}%` }}
          />
          <div className="pointer-events-none absolute inset-x-0 flex items-center justify-between opacity-40">
            {Array.from({ length: 18 }).map((_, index) => (
              <span
                key={index}
                className="w-0.5 rounded-full bg-current"
                style={{ height: `${8 + ((index * 7) % 15)}px` }}
              />
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={0.1}
            value={progress}
            onChange={(event) => seek(Number(event.target.value))}
            className={cn(
              "relative z-10 h-7 w-full opacity-0",
              duration ? "cursor-pointer" : "cursor-default",
            )}
            aria-label="Audio progress"
            disabled={!duration}
          />
        </div>
        <div className="-mt-0.5 flex items-center justify-between text-[10px] tabular-nums opacity-75">
          <span>{formatTime(currentTime)}</span>
          <span>{loadError ? "--:--" : formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
