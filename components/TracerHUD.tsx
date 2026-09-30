"use client";

import React, { useState, useMemo, useEffect } from "react";
import { TracerConflict, TracerHotspot } from "@/lib/types";
import {
  Flame,
  Play,
  Pause,
  RotateCw,
  Search,
  MapPin,
  Users,
  ShieldAlert,
  X,
  Crosshair,
  ExternalLink,
} from "lucide-react";

interface TracerHUDProps {
  conflicts: TracerConflict[];
  hotspots: TracerHotspot[];
  activeHotspot: TracerHotspot | null;
  onSelectHotspot: (hotspot: TracerHotspot) => void;
  onCloseHotspot: () => void;
  autoRotate: boolean;
  onToggleOrbit: () => void;
  band: string;
  onBandChange: (band: string) => void;
}

export default function TracerHUD({
  conflicts,
  hotspots,
  activeHotspot,
  onSelectHotspot,
  onCloseHotspot,
  autoRotate,
  onToggleOrbit,
  band,
  onBandChange,
}: TracerHUDProps) {
  // Timeline playback state
  const [playing, setPlaying] = useState(false);
  const [day, setDay] = useState(180);
  const TOTAL_DAYS = 546;

  // Playback timer
  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => {
      setDay((d) => (d >= TOTAL_DAYS ? 0 : d + 1));
    }, 250); // 4 days / sec
    return () => clearInterval(interval);
  }, [playing]);

  const currentDate = useMemo(() => {
    const start = new Date("2025-01-01T00:00:00Z").getTime();
    const current = start + day * 86400000;
    return new Date(current).toISOString().slice(0, 10);
  }, [day]);

  // Aggregate telemetry totals
  const totals = useMemo(() => {
    let dead = 0;
    let civ = 0;
    let events = 0;
    for (const c of conflicts) {
      if (band !== "all" && c.type !== band) continue;
      dead += c.deaths || 0;
      civ += c.civilians || 0;
      events += c.events || 0;
    }
    return { dead, civ, events };
  }, [conflicts, band]);

  // Find nearest conflict for active hotspot
  const selectedConflict = useMemo(() => {
    if (!activeHotspot || !conflicts.length) return null;
    // Match based on nearest cluster or priority conflict
    if (activeHotspot.la > 45 && activeHotspot.lo > 30) {
      return conflicts.find((c) => c.name.toLowerCase().includes("ukraine") || c.name.toLowerCase().includes("russia"));
    }
    if (activeHotspot.la > 25 && activeHotspot.la < 35 && activeHotspot.lo > 32 && activeHotspot.lo < 38) {
      return conflicts.find((c) => c.name.toLowerCase().includes("israel") || c.name.toLowerCase().includes("palestine") || c.name.toLowerCase().includes("gaza"));
    }
    if (activeHotspot.la > 10 && activeHotspot.la < 20 && activeHotspot.lo > 24 && activeHotspot.lo < 36) {
      return conflicts.find((c) => c.name.toLowerCase().includes("sudan"));
    }
    if (activeHotspot.la > 18 && activeHotspot.la < 26 && activeHotspot.lo > 92 && activeHotspot.lo < 100) {
      return conflicts.find((c) => c.name.toLowerCase().includes("myanmar"));
    }
    if (activeHotspot.la > 16 && activeHotspot.la < 30 && activeHotspot.lo < -95) {
      return conflicts.find((c) => c.name.toLowerCase().includes("mexico") || c.name.toLowerCase().includes("cartel"));
    }
    return conflicts[0] || null;
  }, [activeHotspot, conflicts]);

  return (
    <div className="absolute inset-0 pointer-events-none z-30 font-mono select-none">
      {/* 1. TOP-LEFT: BRAND & TELEMETRY */}
      <div className="pointer-events-auto absolute top-4 left-4 max-w-sm w-full bg-neutral-900/92 border border-neutral-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-white">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_#f43f5e] animate-pulse" />
            <h2 className="text-lg font-black tracking-widest uppercase">TRACER</h2>
          </div>
          <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">
            UCDP INTELLIGENCE
          </span>
        </div>

        <p className="text-[11px] text-neutral-400 mt-2">
          Eighteen months of recorded organised violence on Earth, plotted where it happened.
        </p>

        {/* Telemetry Running Totals */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-neutral-800/80 text-center">
          <div className="p-2 rounded-xl bg-neutral-950/80 border border-neutral-800">
            <span className="text-sm font-black text-rose-500 block">
              {totals.dead.toLocaleString()}
            </span>
            <span className="text-[9px] text-neutral-500 uppercase font-bold block">Fatalities</span>
          </div>
          <div className="p-2 rounded-xl bg-neutral-950/80 border border-neutral-800">
            <span className="text-sm font-black text-amber-400 block">
              {totals.civ.toLocaleString()}
            </span>
            <span className="text-[9px] text-neutral-500 uppercase font-bold block">Civilian Toll</span>
          </div>
          <div className="p-2 rounded-xl bg-neutral-950/80 border border-neutral-800">
            <span className="text-sm font-black text-neutral-200 block">
              {totals.events.toLocaleString()}
            </span>
            <span className="text-[9px] text-neutral-500 uppercase font-bold block">Events</span>
          </div>
        </div>
      </div>

      {/* 2. TOP-CENTER: VIOLENCE KIND PILLS (BAND) */}
      <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-700/80 p-1.5 rounded-xl shadow-2xl backdrop-blur-md text-xs">
        {[
          { id: "all", label: "ALL" },
          { id: "state", label: "WAR" },
          { id: "non-state", label: "NON-STATE" },
          { id: "one-sided", label: "CIVILIANS" },
        ].map((b) => (
          <button
            key={b.id}
            onClick={() => onBandChange(b.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${
              band === b.id
                ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* 3. TOP-RIGHT: ORBIT TOGGLE */}
      <div className="pointer-events-auto absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={onToggleOrbit}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold border text-xs shadow-xl backdrop-blur-md transition-all ${
            autoRotate
              ? "bg-rose-500/20 border-rose-500/40 text-rose-300"
              : "bg-neutral-900/90 border-neutral-700 text-neutral-400 hover:text-white"
          }`}
          title="Toggle automatic camera orbit rotation"
        >
          <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? "animate-spin" : ""}`} />
          <span>{autoRotate ? "Orbit ON" : "Orbit OFF"}</span>
        </button>
      </div>

      {/* 4. BOTTOM FLOATING TRANSPORT & TIMELINE SCRUBBER */}
      <div className="pointer-events-auto absolute bottom-4 left-4 right-4 max-w-2xl mx-auto bg-neutral-900/92 border border-neutral-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-white">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setPlaying((p) => !p)}
            className="w-10 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/30 transition-all"
            title={playing ? "Pause timeline" : "Play timeline forward"}
          >
            {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
          </button>

          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-rose-400 font-mono">{currentDate}</span>
              <span className="text-[11px] text-neutral-400">
                Day {day} of {TOTAL_DAYS} (4 days/sec)
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={TOTAL_DAYS}
              value={day}
              onChange={(e) => setDay(parseInt(e.target.value, 10))}
              className="w-full accent-rose-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* 5. BRIEF PANEL: SELECTED / HOVERED COMBAT CLUSTER */}
      {activeHotspot && (
        <div className="pointer-events-auto absolute bottom-24 right-4 max-w-sm w-full bg-neutral-900/95 border border-rose-500/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-white">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]" />
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                COMBAT CLUSTER BRIEF
              </span>
            </div>
            <button onClick={onCloseHotspot} className="text-neutral-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-base font-black text-white mt-2 leading-tight">
            {selectedConflict?.name || `Hostilities at ${activeHotspot.la}° N, ${activeHotspot.lo}° E`}
          </h3>

          {selectedConflict && (
            <div className="mt-2 p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs">
              <span className="text-[9px] text-neutral-500 uppercase block font-bold">Combatants</span>
              <p className="text-rose-300 font-semibold truncate">{selectedConflict.sideA}</p>
              <span className="text-[9px] text-neutral-500 block text-center my-0.5">vs</span>
              <p className="text-neutral-200 font-semibold truncate">{selectedConflict.sideB}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-neutral-800 text-center">
            <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-lg font-black text-rose-500 block">
                {activeHotspot.n.toLocaleString()}
              </span>
              <span className="text-[9px] text-neutral-500 uppercase font-bold block">Fatalities</span>
            </div>
            <div className="p-2 rounded-xl bg-neutral-950 border border-neutral-800">
              <span className="text-lg font-black text-amber-400 block">
                {activeHotspot.e}
              </span>
              <span className="text-[9px] text-neutral-500 uppercase font-bold block">Armed Strikes</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
