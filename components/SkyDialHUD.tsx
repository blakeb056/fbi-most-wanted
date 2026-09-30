"use client";

import React, { useState, useMemo } from "react";
import { RadioStation, TvChannel } from "@/lib/types";
import CrtTvTuner from "./CrtTvTuner";
import RadioTunerDeck from "./RadioTunerDeck";
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
  Sparkles,
  SlidersHorizontal,
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
  // Tuner HUD toggle states (can be toggled on/off)
  const [showCrtTuner, setShowCrtTuner] = useState(true);
  const [showRadioTuner, setShowRadioTuner] = useState(true);

  const isRadio = mode === "radio";

  // Filtered search results
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    if (isRadio) {
      return stations
        .filter((s) => s.name.toLowerCase().includes(term) || s.cc.toLowerCase().includes(term))
        .slice(0, 8);
    } else {
      return channels
        .filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            c.cc.toLowerCase().includes(term) ||
            c.cat.toLowerCase().includes(term)
        )
        .slice(0, 8);
    }
  }, [searchTerm, isRadio, stations, channels]);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 font-mono select-none">
      {/* 1. TOP-LEFT: BRAND, TELEMETRY & SEARCH */}
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
            {isRadio
              ? `${stations.length.toLocaleString() || "7,959"} STATIONS`
              : `${channels.length.toLocaleString() || "2,105"} BROADCASTS`}
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
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-2 text-neutral-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {searchResults.length > 0 && (
          <div className="mt-2 bg-neutral-950/95 border border-neutral-800 rounded-xl p-1 max-h-48 overflow-y-auto space-y-1">
            {searchResults.map((item: any) => (
              <button
                key={item.id}
                onClick={() => {
                  if (isRadio) {
                    onSelectStation(item);
                  } else {
                    onSelectChannel(item);
                  }
                  onFocusCoordinates(item.lat, item.lon);
                  setSearchTerm("");
                }}
                className="w-full text-left p-1.5 rounded-lg hover:bg-neutral-800/80 text-xs flex items-center justify-between gap-2"
              >
                <div className="truncate">
                  <span className="font-bold text-white">{item.name}</span>
                  <span className="text-[10px] text-neutral-400 ml-1.5">({item.cc})</span>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 shrink-0">
                  {isRadio ? `${item.clicks || 0} listens` : item.cat}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 2. TOP-RIGHT: TUNER HUD TOGGLE & CAMERA ORBIT CONTROLS */}
      <div className="pointer-events-auto absolute top-4 right-4 flex items-center gap-2">
        {/* CRT TV Tuner HUD Toggle (in TV mode) */}
        {!isRadio && (
          <button
            onClick={() => setShowCrtTuner((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold border text-xs shadow-xl backdrop-blur-md transition-all ${
              showCrtTuner
                ? "bg-purple-600 border-purple-400 text-white shadow-purple-900/40"
                : "bg-neutral-900/90 border-neutral-700 text-neutral-400 hover:text-white"
            }`}
            title="Turn CRT TV Tuner HUD On or Off"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>{showCrtTuner ? "CRT Tuner: ON" : "CRT Tuner: OFF"}</span>
          </button>
        )}

        {/* Radio Tuner HUD Toggle (in Radio mode) */}
        {isRadio && (
          <button
            onClick={() => setShowRadioTuner((v) => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold border text-xs shadow-xl backdrop-blur-md transition-all ${
              showRadioTuner
                ? "bg-emerald-600 border-emerald-400 text-white shadow-emerald-900/40"
                : "bg-neutral-900/90 border-neutral-700 text-neutral-400 hover:text-white"
            }`}
            title="Turn Radio Tuner HUD On or Off"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>{showRadioTuner ? "Radio Tuner: ON" : "Radio Tuner: OFF"}</span>
          </button>
        )}

        {/* Camera Orbit Toggle */}
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

      {/* 3. CRT TV TUNER HUD (When in TV Mode and Tuner is ON) */}
      {!isRadio && showCrtTuner && (
        <CrtTvTuner
          channels={channels}
          activeChannel={activeChannel}
          onSelectChannel={onSelectChannel}
          onClose={() => setShowCrtTuner(false)}
          onFocusCoordinates={onFocusCoordinates}
        />
      )}

      {/* 4. VINTAGE HI-FI RADIO TUNER DECK (When in Radio Mode and Tuner is ON) */}
      {isRadio && showRadioTuner && (
        <RadioTunerDeck
          stations={stations}
          activeStation={activeStation}
          onSelectStation={onSelectStation}
          onClose={() => setShowRadioTuner(false)}
          onFocusCoordinates={onFocusCoordinates}
        />
      )}
    </div>
  );
}
