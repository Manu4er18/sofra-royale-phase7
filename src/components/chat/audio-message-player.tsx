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

  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => setCurrentTime(audio.currentTime);
    const onMeta = () => setDuration(audio.duration || 0);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("durationchange", onMeta);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("durationchange", onMeta);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onEnded);
    };
  }, []);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (audio.paused) {
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
      <audio ref={audioRef} src={src} preload="metadata" />
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
          mine
            ? "bg-gold text-gold-foreground"
            : "bg-primary text-primary-foreground",
        )}
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
            className="relative z-10 h-7 w-full cursor-pointer opacity-0"
            aria-label="Audio progress"
          />
        </div>
        <div className="-mt-0.5 flex items-center justify-between text-[10px] tabular-nums opacity-75">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}
