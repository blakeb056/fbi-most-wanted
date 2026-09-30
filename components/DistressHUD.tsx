"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { DistressCall } from "@/lib/types";
import { SEV_COLOR, SEV_LABEL } from "@/lib/severity";
import { playScannerBlip } from "@/lib/sound";
import { WatchLogData, load as loadWatchLog, save as saveWatchLog, record as recordWatchLog, topCity } from "@/lib/watchlog";
import {
  Volume2,
  VolumeX,
  RotateCw,
  Compass,
  MapPin,
  Clock,
  Shield,
  Flame,
  Radio,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  X,
  RadioTower,
} from "lucide-react";

interface DistressHUDProps {
  calls: DistressCall[];
  activeCall: DistressCall | null;
  onSelectCall: (call: DistressCall) => void;
  onCloseCall: () => void;
  soundOn: boolean;
  onToggleSound: () => void;
  autoRotate: boolean;
  onToggleOrbit: () => void;
  onFocusRegion: (region: "US" | "UK" | "World") => void;
  sevFilter: number[];
  onSevFilterChange: (sevs: number[]) => void;
  kindFilter: string[];
  onKindFilterChange: (kinds: string[]) => void;
}

const KINDS = [
  { id: "police", label: "Police" },
  { id: "crime", label: "Crime" },
  { id: "fire", label: "Fire / EMS" },
  { id: "traffic", label: "Traffic" },
];

function timeAgo(isoString: string): string {
  if (!isoString) return "—";
  const secs = (Date.now() - new Date(isoString).getTime()) / 1000;
  if (!Number.isFinite(secs)) return "—";
  if (secs < 0) return "now";
  if (secs < 90) return `${Math.round(secs)}s ago`;
  if (secs < 5400) return `${Math.round(secs / 60)}m ago`;
  if (secs < 172800) return `${Math.round(secs / 3600)}h ago`;
  return `${Math.round(secs / 86400)}d ago`;
}

export default function DistressHUD({
  calls,
  activeCall,
  onSelectCall,
  onCloseCall,
  soundOn,
  onToggleSound,
  autoRotate,
  onToggleOrbit,
  onFocusRegion,
  sevFilter,
  onSevFilterChange,
  kindFilter,
  onKindFilterChange,
}: DistressHUDProps) {
  // Panel minimize toggles
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [tickerCollapsed, setTickerCollapsed] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  // Watchlog & session metrics
  const [log, setLog] = useState<WatchLogData>(() => loadWatchLog());
  const [sessionCount, setSessionCount] = useState(0);
  const [openedAt] = useState(() => Date.now());
  const [tick, setTick] = useState(0);
  const [burst, setBurst] = useState(0);

  // Incoming rolling wire
  const [wire, setWire] = useState<DistressCall[]>([]);
  const seenIds = useRef<Set<string>>(new Set());

  // Refresh clock every 6s
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 6000);
    return () => clearInterval(t);
  }, []);

  // Update wire and watchlog when calls update
  useEffect(() => {
    if (!calls.length) return;

    if (seenIds.current.size === 0) {
      // Initial seed
      for (const c of calls) seenIds.current.add(c.id);
      setWire(calls.slice(0, 30));
      return;
    }

    const incoming: DistressCall[] = [];
    for (const c of calls) {
      if (!seenIds.current.has(c.id)) {
        seenIds.current.add(c.id);
        incoming.push(c);
      }
    }

    if (incoming.length > 0) {
      setBurst(incoming.length);
      setSessionCount((n) => n + incoming.length);
      setWire((prev) => [...incoming, ...prev].slice(0, 45));

      setLog((prev) => {
        const next = recordWatchLog(prev, incoming);
        saveWatchLog(next);
        return next;
      });

      if (soundOn) {
        const maxSev = Math.max(...incoming.map((c) => c.sev || 0));
        playScannerBlip(maxSev);
      }

      setTimeout(() => setBurst(0), 5000);
    }
  }, [calls, soundOn]);

  const sinceOpened = useMemo(() => {
    const secs = Math.max(0, (Date.now() - openedAt) / 1000);
    if (secs < 90) return `${Math.round(secs)}s`;
    if (secs < 5400) return `${Math.round(secs / 60)}m`;
    return `${Math.round(secs / 3600)}h`;
  }, [openedAt, tick]);

  const watched = useMemo(() => {
    const secs = Math.max(1, (Date.now() - openedAt) / 1000);
    const top = topCity(log);
    return {
      rate: sessionCount > 0 ? (sessionCount / (secs / 60)).toFixed(1) : "0.0",
      topCity: top ? top[0] : null,
      topCityN: top ? top[1] : 0,
      cityCount: Object.keys(log.cities || {}).length,
    };
  }, [log, sessionCount, openedAt, tick]);

  // Filtered visible wire
  const visibleWire = useMemo(() => {
    const pool = wire.length > 0 ? wire : calls.slice(0, 30);
    return pool.filter((c) => sevFilter.includes(c.sev) && kindFilter.includes(c.kind));
  }, [wire, calls, sevFilter, kindFilter]);

  const toggleSev = (val: number) => {
    if (sevFilter.includes(val)) {
      if (sevFilter.length > 1) onSevFilterChange(sevFilter.filter((v) => v !== val));
    } else {
      onSevFilterChange([...sevFilter, val]);
    }
  };

  const toggleKind = (val: string) => {
    if (kindFilter.includes(val)) {
      if (kindFilter.length > 1) onKindFilterChange(kindFilter.filter((k) => k !== val));
    } else {
      onKindFilterChange([...kindFilter, val]);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-30 font-mono select-none">
      {/* 1. TOP-LEFT: STATUS & METRICS PANEL */}
      {headerCollapsed ? (
        <button
          onClick={() => setHeaderCollapsed(false)}
          className="pointer-events-auto absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900/90 border border-neutral-700/80 text-white text-xs font-bold shadow-2xl backdrop-blur-md hover:bg-neutral-800 transition-all"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#35d0ff] animate-pulse" />
          <span>DISTRESS</span>
          <span className="text-[10px] text-neutral-400">+{sessionCount}</span>
        </button>
      ) : (
        <div className="pointer-events-auto absolute top-4 left-4 max-w-sm w-full bg-neutral-900/92 border border-neutral-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-neutral-200">
          <div className="flex items-center justify-between gap-2 border-b border-neutral-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#35d0ff] animate-pulse" />
              <h2 className="text-lg font-black tracking-widest text-white uppercase">DISTRESS</h2>
              {burst > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                  +{burst} NEW
                </span>
              )}
            </div>
            <button
              onClick={() => setHeaderCollapsed(true)}
              className="w-6 h-6 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white flex items-center justify-center text-xs"
              title="Minimize Header"
            >
              −
            </button>
          </div>

          <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed">
            Live police, fire and 911 dispatch pulled straight from municipal CAD feeds. Every dot is somebody&apos;s bad day.
          </p>

          {/* Running Tally Card */}
          <div className="mt-3 p-2.5 rounded-xl border border-rose-500/40 bg-gradient-to-b from-rose-500/10 to-transparent flex items-baseline gap-2.5">
            <span className="text-2xl font-black text-rose-400 font-mono">
              {log.total.toLocaleString()}
            </span>
            <span className="text-[11px] text-neutral-300 leading-tight">
              crimes reported
              <br />
              <span className="text-[10px] text-neutral-400">
                {sessionCount} this session • {sinceOpened} watching
              </span>
            </span>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-neutral-800/80 text-center">
            <div className="p-1.5 rounded-lg bg-neutral-950/80 border border-neutral-800">
              <span className="text-xs font-bold text-white block">
                {calls.length.toLocaleString()}
              </span>
              <span className="text-[9px] text-neutral-500 uppercase block">Calls Plotted</span>
            </div>
            <div className="p-1.5 rounded-lg bg-neutral-950/80 border border-neutral-800">
              <span className="text-xs font-bold text-cyan-400 block">38</span>
              <span className="text-[9px] text-neutral-500 uppercase block">States Live</span>
            </div>
            <div className="p-1.5 rounded-lg bg-neutral-950/80 border border-neutral-800">
              <span className="text-xs font-bold text-emerald-400 block">120/120</span>
              <span className="text-[9px] text-neutral-500 uppercase block">Feeds Live</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. TOP-RIGHT: CONTROLS & SEVERITY / SERVICE FILTERS */}
      <div className="pointer-events-auto absolute top-4 right-4 flex flex-col items-end gap-2">
        {/* Quick Toolbar */}
        <div className="flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-700/80 p-1.5 rounded-xl shadow-xl backdrop-blur-md text-xs">
          <button
            onClick={onToggleSound}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold border transition-all ${
              soundOn
                ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.3)]"
                : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white"
            }`}
            title="Toggle synthesized WebAudio police scanner sound"
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5 animate-pulse" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{soundOn ? "Scanner Sound ON" : "Muted"}</span>
          </button>

          <button
            onClick={onToggleOrbit}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg font-bold border transition-all ${
              autoRotate
                ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                : "bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white"
            }`}
            title="Toggle automatic camera orbit rotation"
          >
            <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? "animate-spin" : ""}`} />
            <span>{autoRotate ? "Orbit ON" : "Orbit OFF"}</span>
          </button>

          {/* Region Buttons */}
          <div className="flex items-center border-l border-neutral-700 pl-1.5 gap-1">
            <button
              onClick={() => onFocusRegion("US")}
              className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-bold"
            >
              US
            </button>
            <button
              onClick={() => onFocusRegion("UK")}
              className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-bold"
            >
              UK
            </button>
            <button
              onClick={() => onFocusRegion("World")}
              className="px-2 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-bold"
            >
              World
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        {filtersCollapsed ? (
          <button
            onClick={() => setFiltersCollapsed(false)}
            className="px-3 py-1.5 rounded-xl bg-neutral-900/90 border border-neutral-700/80 text-white text-xs font-bold shadow-xl backdrop-blur-md"
          >
            Show Filters ▾
          </button>
        ) : (
          <div className="bg-neutral-900/92 border border-neutral-700/80 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md max-w-xs w-full text-xs space-y-3">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Severity Tiers
              </span>
              <button
                onClick={() => setFiltersCollapsed(true)}
                className="text-neutral-500 hover:text-white text-xs"
              >
                −
              </button>
            </div>

            {/* Severity Badges */}
            <div className="grid grid-cols-2 gap-1.5">
              {[0, 1, 2, 3].map((sev) => {
                const active = sevFilter.includes(sev);
                return (
                  <button
                    key={sev}
                    onClick={() => toggleSev(sev)}
                    className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
                      active
                        ? "bg-neutral-800 border-neutral-600 text-white"
                        : "bg-neutral-950/60 border-neutral-800 text-neutral-500 opacity-60"
                    }`}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        background: SEV_COLOR[sev],
                        boxShadow: active ? `0 0 8px ${SEV_COLOR[sev]}` : "none",
                      }}
                    />
                    <div className="leading-tight">
                      <span className="text-[11px] font-bold uppercase block">{SEV_LABEL[sev]}</span>
                      <span className="text-[9px] text-neutral-400">Sev {sev}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Service Kinds */}
            <div className="pt-2 border-t border-neutral-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                Service Kinds
              </span>
              <div className="flex flex-wrap gap-1.5">
                {KINDS.map((k) => {
                  const active = kindFilter.includes(k.id);
                  return (
                    <button
                      key={k.id}
                      onClick={() => toggleKind(k.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase border transition-all ${
                        active
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                          : "bg-neutral-950 text-neutral-500 border-neutral-800"
                      }`}
                    >
                      {k.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. BOTTOM-LEFT: INCOMING CALLS WIRE (TICKER) */}
      {tickerCollapsed ? (
        <button
          onClick={() => setTickerCollapsed(false)}
          className="pointer-events-auto absolute bottom-4 left-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900/90 border border-neutral-700/80 text-white text-xs font-bold shadow-2xl backdrop-blur-md hover:bg-neutral-800 transition-all"
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#35d0ff] animate-pulse" />
          <span>Incoming Wire</span>
          <span className="text-[10px] text-neutral-400">({visibleWire.length})</span>
        </button>
      ) : (
        <div className="pointer-events-auto absolute bottom-4 left-4 w-80 sm:w-96 max-h-80 bg-neutral-900/92 border border-neutral-700/80 rounded-2xl p-3 shadow-2xl backdrop-blur-md flex flex-col">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2 px-1 mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-white uppercase tracking-wider">
                INCOMING WIRE
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                LIVE ONLY
              </span>
            </div>
            <button
              onClick={() => setTickerCollapsed(true)}
              className="text-neutral-400 hover:text-white text-xs"
            >
              −
            </button>
          </div>

          {/* Wire Rows List */}
          <div className="overflow-y-auto space-y-1.5 pr-1 flex-1 custom-scrollbar">
            {visibleWire.map((c) => {
              const isSelected = activeCall?.id === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => onSelectCall(c)}
                  className={`w-full text-left p-2 rounded-xl border transition-all text-xs flex flex-col gap-1 ${
                    isSelected
                      ? "bg-neutral-800/90 border-cyan-500 shadow-md"
                      : "bg-neutral-950/60 border-neutral-800/80 hover:bg-neutral-800/50 hover:border-neutral-700"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 truncate">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{
                          background: SEV_COLOR[c.sev] || "#35d0ff",
                          boxShadow: `0 0 6px ${SEV_COLOR[c.sev] || "#35d0ff"}`,
                        }}
                      />
                      <span className="font-bold text-white truncate">{c.desc}</span>
                    </div>
                    <span className="text-[10px] text-neutral-400 shrink-0">{timeAgo(c.ts)}</span>
                  </div>

                  <div className="text-[11px] text-neutral-400 pl-3.5 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-neutral-500 shrink-0" />
                    <span className="truncate">
                      {c.city}, {c.state}
                    </span>
                  </div>
                </button>
              );
            })}

            {visibleWire.length === 0 && (
              <div className="text-center py-8 text-neutral-500 text-xs">
                No incoming calls match active filters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. BOTTOM CONTEXT HUD: SELECTED CAD INCIDENT */}
      {activeCall && (
        <div className="pointer-events-auto absolute bottom-4 right-4 max-w-sm w-full bg-neutral-900/95 border border-cyan-500/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-white">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  background: SEV_COLOR[activeCall.sev] || "#35d0ff",
                  boxShadow: `0 0 8px ${SEV_COLOR[activeCall.sev] || "#35d0ff"}`,
                }}
              />
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                {activeCall.kind.toUpperCase()} DISPATCH • SEV {activeCall.sev}
              </span>
            </div>
            <button
              onClick={onCloseCall}
              className="text-neutral-400 hover:text-white text-xs p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <h3 className="text-sm font-bold text-white mt-2 leading-snug">
            {activeCall.desc}
          </h3>

          <div className="mt-2 text-xs text-neutral-300 space-y-1">
            <div className="flex items-center gap-1.5 text-neutral-400">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>Location: {activeCall.city}, {activeCall.state}</span>
            </div>
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Clock className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
              <span>Time: {new Date(activeCall.ts).toLocaleTimeString()} ({timeAgo(activeCall.ts)})</span>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-neutral-800">
            <button
              onClick={() => playScannerBlip(activeCall.sev)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Replay CAD Audio</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
