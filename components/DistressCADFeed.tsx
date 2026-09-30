"use client";

import React, { useState, useMemo } from "react";
import { DistressCall } from "@/lib/types";
import { playScannerBlip } from "@/lib/sound";
import {
  AlertCircle,
  Flame,
  ShieldAlert,
  Search,
  Volume2,
  MapPin,
  Clock,
  Radio,
  ExternalLink,
} from "lucide-react";

interface DistressCADFeedProps {
  calls: DistressCall[];
  onSelectCall: (call: DistressCall) => void;
}

export default function DistressCADFeed({ calls, onSelectCall }: DistressCADFeedProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("all");
  const [sevFilter, setSevFilter] = useState<string>("all");

  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      if (kindFilter !== "all" && c.kind !== kindFilter) return false;
      if (sevFilter === "felony" && c.sev < 3) return false;
      if (sevFilter === "urgent" && c.sev < 2) return false;

      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        c.desc.toLowerCase().includes(term) ||
        c.city.toLowerCase().includes(term) ||
        c.state.toLowerCase().includes(term) ||
        c.id.toLowerCase().includes(term)
      );
    });
  }, [calls, kindFilter, sevFilter, searchTerm]);

  return (
    <div className="space-y-6 font-mono">
      {/* Top Banner & Control Deck */}
      <div className="bg-neutral-900/90 border border-neutral-800 p-5 rounded-2xl shadow-xl backdrop-blur">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                LIVE 911 CAD STREAM
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-neutral-400">
                {calls.length.toLocaleString()} ACTIVE CALLS INGESTED
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider mt-1">
              Police, Fire & EMS Emergency Dispatches
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Real-time Computer Aided Dispatch feeds from municipal PSAPs across 38 US states with synthesized CAD telemetry frequencies.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => playScannerBlip(3)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 transition-all"
            >
              <Volume2 className="w-4 h-4" />
              <span>Test Felony Two-Tone</span>
            </button>
            <button
              onClick={() => playScannerBlip(0)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/30 transition-all"
            >
              <Volume2 className="w-4 h-4" />
              <span>Test Routine CAD Blip</span>
            </button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 pt-4 border-t border-neutral-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
            <input
              type="text"
              placeholder="Search description, city, state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 pl-10 pr-4 py-2 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {["all", "police", "fire", "ems"].map((k) => (
              <button
                key={k}
                onClick={() => setKindFilter(k)}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap ${
                  kindFilter === k
                    ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/30"
                    : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800"
                }`}
              >
                {k === "all" ? "All Services" : k}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: "all", label: "All Priority" },
              { id: "urgent", label: "Urgent (Sev 2+)" },
              { id: "felony", label: "Felony (Sev 3)" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setSevFilter(s.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  sevFilter === s.id
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                    : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Incident List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredCalls.slice(0, 60).map((call) => {
          const isFelony = call.sev >= 3;
          const isFire = call.kind === "fire";

          return (
            <div
              key={call.id}
              className={`p-4 rounded-xl border bg-neutral-900/60 backdrop-blur hover:bg-neutral-900 transition-all flex flex-col justify-between gap-3 ${
                isFelony
                  ? "border-red-500/40 hover:border-red-500"
                  : isFire
                  ? "border-orange-500/40 hover:border-orange-500"
                  : "border-neutral-800 hover:border-cyan-500/40"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                      isFelony
                        ? "bg-red-500/20 text-red-400 border-red-500/40"
                        : isFire
                        ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                        : "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                    }`}
                  >
                    {call.kind.toUpperCase()} • SEV {call.sev}
                  </span>
                  <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(call.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white mt-2 line-clamp-2">
                  {call.desc}
                </h4>

                <div className="flex items-center gap-1.5 text-xs text-neutral-400 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span className="line-clamp-1">{call.city}, {call.state}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/80">
                <button
                  onClick={() => playScannerBlip(call.sev)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-all"
                >
                  <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Scanner Audio</span>
                </button>
                <button
                  onClick={() => onSelectCall(call)}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all"
                >
                  <span>Globe Lock</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCalls.length === 0 && (
        <div className="text-center py-16 bg-neutral-900/40 border border-neutral-800 rounded-2xl">
          <ShieldAlert className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
          <p className="text-sm text-neutral-400 font-bold">No active CAD dispatches matched your filter.</p>
          <p className="text-xs text-neutral-600 mt-1">Try clearing search or setting services to All.</p>
        </div>
      )}
    </div>
  );
}
