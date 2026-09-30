"use client";

import React, { useState, useMemo } from "react";
import { TracerConflict, TracerHotspot } from "@/lib/types";
import {
  Flame,
  ShieldAlert,
  Search,
  Users,
  MapPin,
  Crosshair,
  TrendingUp,
  Skull,
} from "lucide-react";

interface TracerConflictsProps {
  conflicts: TracerConflict[];
  hotspots: TracerHotspot[];
  onFocusRegion?: (lat: number, lng: number) => void;
}

export default function TracerConflicts({
  conflicts,
  hotspots,
  onFocusRegion,
}: TracerConflictsProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const totalCasualties = useMemo(() => {
    return conflicts.reduce((acc, c) => acc + (c.deaths || 0), 0);
  }, [conflicts]);

  const totalCivilianCasualties = useMemo(() => {
    return conflicts.reduce((acc, c) => acc + (c.civilians || 0), 0);
  }, [conflicts]);

  const totalCombatEvents = useMemo(() => {
    return conflicts.reduce((acc, c) => acc + (c.events || 0), 0);
  }, [conflicts]);

  const filteredConflicts = useMemo(() => {
    return conflicts.filter((c) => {
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        c.sideA.toLowerCase().includes(term) ||
        c.sideB.toLowerCase().includes(term) ||
        (c.countries || []).some((co) => co.toLowerCase().includes(term))
      );
    });
  }, [conflicts, typeFilter, searchTerm]);

  return (
    <div className="space-y-6 font-mono">
      {/* Top Telemetry Dashboard */}
      <div className="bg-neutral-900/90 border border-neutral-800 p-5 rounded-2xl shadow-xl backdrop-blur">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                UCDP GEOCONFLICT INTELLIGENCE
              </span>
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs text-neutral-400">
                18 MONTHS SATELLITE & FIELD MONITORING
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider mt-1">
              Global Armed Conflicts & Cartel Wars
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Systematic tracking of state-based warfare, cartel clashes, and violence against civilians from Uppsala Conflict Data Program (UCDP).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="bg-neutral-950 border border-neutral-800 px-3 py-2 rounded-xl">
              <span className="text-[10px] text-neutral-500 uppercase block">Total Casualties</span>
              <span className="font-black text-rose-500 text-sm">
                {totalCasualties.toLocaleString()}
              </span>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 px-3 py-2 rounded-xl">
              <span className="text-[10px] text-neutral-500 uppercase block">Civilian Deaths</span>
              <span className="font-black text-amber-400 text-sm">
                {totalCivilianCasualties.toLocaleString()}
              </span>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 px-3 py-2 rounded-xl">
              <span className="text-[10px] text-neutral-500 uppercase block">Combat Strikes</span>
              <span className="font-black text-white text-sm">
                {totalCombatEvents.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-4 border-t border-neutral-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
            <input
              type="text"
              placeholder="Search conflict, country, faction (e.g. Ukraine, Sinaloa, Sudan)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 pl-10 pr-4 py-2 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { id: "all", label: "All Conflicts" },
              { id: "state", label: "State Wars" },
              { id: "non-state", label: "Non-State / Cartels" },
              { id: "one-sided", label: "Civilian Attacks" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold uppercase transition-all whitespace-nowrap ${
                  typeFilter === t.id
                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                    : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Conflict Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredConflicts.slice(0, 48).map((conflict) => {
          const isHighIntensity = conflict.deaths > 1000;

          return (
            <div
              key={conflict.id}
              className={`p-5 rounded-2xl border bg-neutral-900/60 backdrop-blur hover:bg-neutral-900 transition-all flex flex-col justify-between gap-4 ${
                isHighIntensity ? "border-rose-500/40 hover:border-rose-500" : "border-neutral-800 hover:border-neutral-700"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                      conflict.type === "state"
                        ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                        : conflict.type === "non-state"
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        : "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                    }`}
                  >
                    {conflict.type.toUpperCase()} WARFARE
                  </span>
                  <span className="text-[10px] text-neutral-500">
                    {conflict.events} Recorded Strikes
                  </span>
                </div>

                <h3 className="text-base font-black text-white mt-2 line-clamp-1">
                  {conflict.name}
                </h3>

                <div className="space-y-1.5 mt-3 text-xs text-neutral-300">
                  <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800/80">
                    <span className="text-[10px] text-neutral-500 block uppercase">Primary Combatants</span>
                    <p className="font-semibold text-rose-300 line-clamp-1">{conflict.sideA}</p>
                    <span className="text-[10px] text-neutral-500 block text-center my-0.5">vs</span>
                    <p className="font-semibold text-neutral-200 line-clamp-1">{conflict.sideB}</p>
                  </div>

                  <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] pt-1">
                    <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                    <span className="line-clamp-1">
                      {(conflict.countries || []).join(", ") || "International Theater"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-neutral-500 uppercase block">Fatalities</span>
                  <span className="text-lg font-black text-rose-500">
                    {conflict.deaths.toLocaleString()}
                  </span>
                </div>
                {conflict.civilians > 0 && (
                  <div className="text-right">
                    <span className="text-[10px] text-neutral-500 uppercase block">Civilian Toll</span>
                    <span className="text-sm font-bold text-amber-400">
                      {conflict.civilians.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredConflicts.length === 0 && (
        <div className="text-center py-16 bg-neutral-900/40 border border-neutral-800 rounded-2xl">
          <ShieldAlert className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
          <p className="text-sm text-neutral-400 font-bold">No armed conflicts matched your query.</p>
          <p className="text-xs text-neutral-600 mt-1">Try resetting the type filter or checking spelling.</p>
        </div>
      )}
    </div>
  );
}
