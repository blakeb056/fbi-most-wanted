"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";
import { TvChannel } from "@/lib/types";
import { playTunerClick, playStaticBurst, playStationLockTone } from "@/lib/sound";
import {
  Tv,
  Play,
  Square,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  MapPin,
  Radio,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Sparkles,
} from "lucide-react";

interface CrtTvTunerProps {
  channels: TvChannel[];
  activeChannel: TvChannel | null;
  onSelectChannel: (channel: TvChannel) => void;
  onClose: () => void;
  onFocusCoordinates?: (lat: number, lng: number) => void;
}

const CATEGORIES = [
  { id: "all", label: "ALL CHANNELS" },
  { id: "music", label: "MUSIC TV" },
  { id: "news", label: "NEWS" },
  { id: "entertainment", label: "ENTERTAINMENT" },
  { id: "movies", label: "CINEMA" },
  { id: "general", label: "GENERAL" },
];

export default function CrtTvTuner({
  channels,
  activeChannel,
  onSelectChannel,
  onClose,
  onFocusCoordinates,
}: CrtTvTunerProps) {
  // Seek / Auto-Scan State
  const [isSeeking, setIsSeeking] = useState(false);
  const [selectedCat, setSelectedCat] = useState("all");
  const [isMuted, setIsMuted] = useState(false);
  const [scanlinesOn, setScanlinesOn] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showStaticSnow, setShowStaticSnow] = useState(false);
  const [channelNumber, setChannelNumber] = useState(1);
  const [signalStrength, setSignalStrength] = useState(94);
  const [powerOn, setPowerOn] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const seekTimerRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Filter channels by category
  const filteredChannels = React.useMemo(() => {
    if (selectedCat === "all") return channels;
    return channels.filter((c) => c.cat?.toLowerCase() === selectedCat.toLowerCase());
  }, [channels, selectedCat]);

  // Set initial channel if none selected
  useEffect(() => {
    if (!activeChannel && filteredChannels.length > 0) {
      const initial = filteredChannels[0];
      onSelectChannel(initial);
      setChannelNumber(1);
      if (onFocusCoordinates) onFocusCoordinates(initial.lat, initial.lon);
    }
  }, [activeChannel, filteredChannels, onSelectChannel, onFocusCoordinates]);

  // Video playback management using hls.js for .m3u8 live streams
  useEffect(() => {
    if (!powerOn || !activeChannel) return;

    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const streamUrl = activeChannel.url;
    if (streamUrl.includes(".m3u8")) {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = streamUrl;
        video.muted = isMuted;
        video.play().catch(() => {});
      } else if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
        });
        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.muted = isMuted;
          video.play().catch(() => {});
        });
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) {
            // Stream cannot be decoded or CORS blocked
          }
        });
      }
    } else {
      video.src = streamUrl;
      video.muted = isMuted;
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeChannel, isMuted, powerOn]);

  // Animated Static Noise Canvas (Snow)
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas || (!showStaticSnow && powerOn)) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const renderNoise = () => {
      const w = (canvas.width = 160);
      const h = (canvas.height = 120);
      const imgData = ctx.createImageData(w, h);
      const buffer = new Uint32Array(imgData.data.buffer);
      for (let i = 0; i < buffer.length; i++) {
        // Random grayscale noise
        const shade = (Math.random() * 255) | 0;
        buffer[i] = (255 << 24) | (shade << 16) | (shade << 8) | shade;
      }
      ctx.putImageData(imgData, 0, 0);
      animId = requestAnimationFrame(renderNoise);
    };

    renderNoise();
    return () => cancelAnimationFrame(animId);
  }, [showStaticSnow, powerOn]);

  // Hop to next / random channel with authentic CRT transition
  const tuneToChannel = useCallback(
    (target: TvChannel, targetIdx: number) => {
      playTunerClick();
      playStaticBurst(320);

      setShowStaticSnow(true);
      setChannelNumber(targetIdx + 1);
      setSignalStrength(Math.floor(75 + Math.random() * 24));

      setTimeout(() => {
        onSelectChannel(target);
        if (onFocusCoordinates) onFocusCoordinates(target.lat, target.lon);
        setShowStaticSnow(false);
      }, 350);
    },
    [onSelectChannel, onFocusCoordinates]
  );

  // Manual Channel Next / Prev
  const handleNextChannel = () => {
    if (!filteredChannels.length) return;
    const currentIndex = activeChannel
      ? filteredChannels.findIndex((c) => c.id === activeChannel.id)
      : -1;
    const nextIndex = (currentIndex + 1) % filteredChannels.length;
    tuneToChannel(filteredChannels[nextIndex], nextIndex);
  };

  const handlePrevChannel = () => {
    if (!filteredChannels.length) return;
    const currentIndex = activeChannel
      ? filteredChannels.findIndex((c) => c.id === activeChannel.id)
      : -1;
    const prevIndex = (currentIndex - 1 + filteredChannels.length) % filteredChannels.length;
    tuneToChannel(filteredChannels[prevIndex], prevIndex);
  };

  // Continuous Auto-Seek Loop
  useEffect(() => {
    if (!isSeeking || !filteredChannels.length) {
      if (seekTimerRef.current) clearInterval(seekTimerRef.current);
      return;
    }

    const interval = setInterval(() => {
      // Pick random channel
      const randIdx = Math.floor(Math.random() * filteredChannels.length);
      const nextChannel = filteredChannels[randIdx];
      tuneToChannel(nextChannel, randIdx);
    }, 4200);

    seekTimerRef.current = interval;
    return () => clearInterval(interval);
  }, [isSeeking, filteredChannels, tuneToChannel]);

  const handleToggleSeek = () => {
    if (isSeeking) {
      // Stop Seek
      setIsSeeking(false);
      playStationLockTone();
    } else {
      // Start Seek
      setIsSeeking(true);
      handleNextChannel();
    }
  };

  if (!powerOn) {
    return (
      <div className="pointer-events-auto absolute bottom-4 right-4 z-40 font-mono">
        <button
          onClick={() => {
            setPowerOn(true);
            playTunerClick();
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs font-bold shadow-2xl hover:bg-neutral-800 transition-all"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_#ef4444]" />
          <span>POWER ON CRT TV</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-auto absolute z-40 transition-all duration-300 font-mono select-none ${
        isMinimized
          ? "bottom-4 right-4 w-72"
          : "bottom-4 right-4 w-[420px] sm:w-[480px] max-w-[calc(100vw-32px)]"
      }`}
    >
      {/* RETRO CRT CHASSIS CABINET */}
      <div className="relative bg-[#1c1815] rounded-3xl p-3 sm:p-4 border-4 border-[#332a22] shadow-[0_20px_60px_rgba(0,0,0,0.85),inset_0_2px_4px_rgba(255,255,255,0.15)] flex flex-col gap-3">
        {/* TOP BRAND BAR */}
        <div className="flex items-center justify-between px-1 border-b border-[#3d3229] pb-2 text-[#b09e8d]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSeeking
                  ? "bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-ping"
                  : "bg-emerald-400 shadow-[0_0_10px_#10b981]"
              }`}
            />
            <span className="text-[11px] font-black tracking-widest uppercase text-[#d6c7b7]">
              ZENITH TRINITRON • CRT MONITOR
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMinimized((m) => !m)}
              className="text-[#998777] hover:text-white p-1 rounded"
              title={isMinimized ? "Maximize monitor" : "Minimize monitor"}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="text-[#998777] hover:text-white p-1 rounded"
              title="Close CRT HUD"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CRT SCREEN HOUSING WITH ROUNDED BEZEL */}
        {!isMinimized && (
          <div className="relative aspect-[4/3] w-full bg-black rounded-[28px] overflow-hidden border-8 border-[#26201b] shadow-[inset_0_0_24px_rgba(0,0,0,0.9),0_0_12px_rgba(0,0,0,0.7)] flex items-center justify-center">
            {/* 1. ACTUAL LIVE VIDEO PLAYER */}
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
              {activeChannel && (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* 2. STATIC SNOW CANVAS OVERLAY (active during seek transition) */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-150 ${
                showStaticSnow ? "opacity-100 z-20" : "opacity-0 -z-10"
              }`}
            />

            {/* 3. RETRO CRT GLASS CURVATURE & VIGNETTE */}
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(255,255,255,0.04) 0%, transparent 60%, rgba(0,0,0,0.88) 100%)",
                boxShadow: "inset 0 0 40px rgba(0,0,0,0.8)",
              }}
            />

            {/* 4. SCANLINES OVERLAY */}
            {scanlinesOn && (
              <div
                className="absolute inset-0 pointer-events-none z-10"
                style={{
                  background:
                    "repeating-linear-gradient(0deg, rgba(0,0,0,0.28) 0px, rgba(0,0,0,0.28) 1px, transparent 2px, transparent 3px)",
                }}
              />
            )}

            {/* 5. PHOSPHOR GREEN RETRO OSD (On-Screen Display) */}
            <div className="absolute top-3 left-4 right-4 pointer-events-none z-20 flex justify-between items-start text-[#33ff66] drop-shadow-[0_0_8px_rgba(51,255,102,0.8)] text-xs font-mono">
              <div>
                <div className="font-bold tracking-widest text-sm">
                  CH {channelNumber.toString().padStart(2, "0")}
                </div>
                <div className="text-[10px] opacity-80 uppercase mt-0.5">
                  {isSeeking ? (
                    <span className="text-amber-300 animate-pulse">&gt;&gt;&gt; AUTO-SEEKING...</span>
                  ) : (
                    <span>SIGNAL: {signalStrength}% • NTSC</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <span className="px-1.5 py-0.5 rounded bg-black/60 border border-[#33ff66]/40 text-[10px] font-bold uppercase">
                  {activeChannel?.cat || "CCTV"}
                </span>
                <div className="text-[10px] opacity-75 mt-0.5">{activeChannel?.cc || "WORLD"}</div>
              </div>
            </div>

            {/* BOTTOM OSD: CHANNEL TITLE */}
            <div className="absolute bottom-3 left-4 right-4 pointer-events-none z-20 text-[#33ff66] drop-shadow-[0_0_6px_rgba(51,255,102,0.7)] text-[11px] font-mono truncate">
              {isSeeking ? (
                <span className="text-amber-300">SEARCHING FREQUENCY SPECTRUM...</span>
              ) : (
                <span>{activeChannel?.name || "Tuning into frequency..."}</span>
              )}
            </div>
          </div>
        )}

        {/* CRT CONTROL DECK & HARDWARE BUTTONS */}
        <div className="bg-[#14110e] rounded-2xl p-2.5 sm:p-3 border border-[#332a22] flex flex-col gap-2.5">
          {/* CATEGORY SELECTOR PILLS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCat(cat.id);
                  playTunerClick();
                }}
                className={`px-2.5 py-1 rounded-lg font-bold uppercase transition-all whitespace-nowrap ${
                  selectedCat === cat.id
                    ? "bg-[#d97706] text-black shadow-md"
                    : "bg-[#211b15] text-[#998777] hover:text-[#d6c7b7]"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* MAIN TUNER CONTROLS ROW */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#26201b]">
            {/* BIG SEEK / STOP TACTILE BUTTON */}
            <button
              onClick={handleToggleSeek}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-black text-xs tracking-wider transition-all shadow-lg active:scale-95 ${
                isSeeking
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50 animate-pulse border border-rose-400"
                  : "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-900/40 border border-amber-300"
              }`}
            >
              {isSeeking ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>STOP SEEK</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>SEEK CHANNEL</span>
                </>
              )}
            </button>

            {/* CHANNEL STEPPERS (Prev / Next rotary style) */}
            <div className="flex items-center gap-1 bg-[#211b15] p-1 rounded-xl border border-[#382d24]">
              <button
                onClick={handlePrevChannel}
                disabled={isSeeking}
                title="Channel Down"
                className="p-1.5 rounded-lg text-[#b09e8d] hover:text-white hover:bg-[#332a22] disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-black text-[#d6c7b7] px-2">CH</span>
              <button
                onClick={handleNextChannel}
                disabled={isSeeking}
                title="Channel Up"
                className="p-1.5 rounded-lg text-[#b09e8d] hover:text-white hover:bg-[#332a22] disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* AUX CONTROLS (Mute / Scanlines / External) */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsMuted((m) => !m);
                  playTunerClick();
                }}
                className={`p-2 rounded-xl border text-xs transition-all ${
                  isMuted
                    ? "bg-red-500/20 border-red-500/40 text-red-400"
                    : "bg-[#211b15] border-[#382d24] text-[#b09e8d] hover:text-white"
                }`}
                title={isMuted ? "Unmute audio" : "Mute audio"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  setScanlinesOn((s) => !s);
                  playTunerClick();
                }}
                className={`p-2 rounded-xl border text-[10px] font-bold transition-all ${
                  scanlinesOn
                    ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                    : "bg-[#211b15] border-[#382d24] text-[#998777]"
                }`}
                title="Toggle CRT Scanlines Overlay"
              >
                CRT
              </button>

              {activeChannel?.url && (
                <a
                  href={activeChannel.url}
                  target="_blank"
                  rel="noreferrer"
                  className="p-2 rounded-xl bg-[#211b15] border border-[#382d24] text-[#b09e8d] hover:text-white transition-all"
                  title="Open live stream in new window"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
