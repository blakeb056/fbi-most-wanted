"use client";

import React, { useState } from "react";
import { RadioStation, TvChannel } from "@/lib/types";
import {
  Radio,
  Tv,
  RotateCw,
  Search,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ExternalLink,
  MapPin,
  X,
  Compass,
} from "lucide-react";

interface SkyDialHUDProps {
  mode: "radio" | "tv";
  stations: RadioStation[];
  channels: TvChannel[];
  activeStation: RadioStation | null;
  activeChannel: TvChannel | null;
  onSelectStation: (station: RadioStation) => void;
  onSelectChannel: (channel: TvChannel) => void;
  onCloseActive: () => void;
  autoRotate: boolean;
  onToggleOrbit: () => void;
  onFocusCoordinates: (lat: number, lng: number) => void;
}

export default function SkyDialHUD({
  mode,
  stations,
  channels,
  activeStation,
  activeChannel,
  onSelectStation,
  onSelectChannel,
  onCloseActive,
  autoRotate,
  onToggleOrbit,
  onFocusCoordinates,
}: SkyDialHUDProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const isRadio = mode === "radio";

  return (
    <div className="absolute inset-0 pointer-events-none z-30 font-mono select-none">
      {/* 1. TOP-LEFT: BRAND & STREAM COUNTER */}
      <div className="pointer-events-auto absolute top-4 left-4 max-w-sm w-full bg-neutral-900/92 border border-neutral-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-white">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isRadio
                  ? "bg-emerald-400 shadow-[0_0_10px_#10b981]"
                  : "bg-purple-400 shadow-[0_0_10px_#a855f7]"
              } animate-pulse`}
            />
            <h2 className="text-base font-black tracking-widest uppercase">
              {isRadio ? "SKY DIAL WORLD RADIO" : "SKY DIAL TV & CCTV"}
            </h2>
          </div>
          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
            {isRadio ? "7,959 TRANSMITTERS" : "2,105 BROADCASTS"}
          </span>
        </div>

        <p className="text-[11px] text-neutral-400 mt-2">
          {isRadio
            ? "Tuning into local FM/AM/Web broadcasts across 190+ sovereign countries mapped to real coordinates."
            : "Earth television broadcasts, public traffic cams, and observatories plotted across sovereign coordinates."}
        </p>

        {/* Quick Search Bar */}
        <div className="relative mt-3">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
          <input
            type="text"
            placeholder={isRadio ? "Search station or country..." : "Search channel or category..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-950/80 border border-neutral-800 pl-8 pr-3 py-1.5 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* 2. TOP-RIGHT: ORBIT & CONTROLS */}
      <div className="pointer-events-auto absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={onToggleOrbit}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold border text-xs shadow-xl backdrop-blur-md transition-all ${
            autoRotate
              ? isRadio
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : "bg-purple-500/20 border-purple-500/40 text-purple-300"
              : "bg-neutral-900/90 border-neutral-700 text-neutral-400 hover:text-white"
          }`}
          title="Toggle automatic camera orbit rotation"
        >
          <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? "animate-spin" : ""}`} />
          <span>{autoRotate ? "Orbit ON" : "Orbit OFF"}</span>
        </button>
      </div>

      {/* 3. BOTTOM HUD: ACTIVE RADIO STREAMING DECK */}
      {isRadio && activeStation && (
        <div className="pointer-events-auto absolute bottom-4 left-4 right-4 max-w-xl mx-auto bg-neutral-900/95 border border-emerald-500/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  NOW TUNED IN ({activeStation.cc || "GLOBAL"})
                </span>
                <span className="text-[10px] text-neutral-400">
                  {activeStation.clicks?.toLocaleString() || 0} listens
                </span>
              </div>
              <h4 className="text-sm font-bold text-white line-clamp-1 mt-0.5">
                {activeStation.name}
              </h4>
              <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5">
                <MapPin className="w-3 h-3 text-neutral-500" />
                <span>Lat: {activeStation.lat.toFixed(2)}°, Lon: {activeStation.lon.toFixed(2)}°</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <audio src={activeStation.url} controls autoPlay className="h-8 max-w-xs" />
            <button
              onClick={onCloseActive}
              className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 4. BOTTOM HUD: ACTIVE TV / CCTV MONITOR */}
      {!isRadio && activeChannel && (
        <div className="pointer-events-auto absolute bottom-4 left-4 right-4 max-w-xl mx-auto bg-neutral-900/95 border border-purple-500/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
              <Tv className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                  LIVE BROADCAST ({activeChannel.cat.toUpperCase()})
                </span>
                <span className="text-[10px] text-neutral-400">{activeChannel.cc}</span>
              </div>
              <h4 className="text-sm font-bold text-white line-clamp-1 mt-0.5">
                {activeChannel.name}
              </h4>
              <div className="flex items-center gap-1 text-[11px] text-neutral-400 mt-0.5">
                <MapPin className="w-3 h-3 text-neutral-500" />
                <span>Lat: {activeChannel.lat.toFixed(2)}°, Lon: {activeChannel.lon.toFixed(2)}°</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={activeChannel.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Watch Stream</span>
            </a>
            <button
              onClick={onCloseActive}
              className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
