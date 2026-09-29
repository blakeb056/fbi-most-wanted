"use client";

import React, { useState, useMemo } from "react";
import { Fugitive } from "@/lib/types";
import { FBI_FIELD_OFFICES } from "@/lib/geo";
import { Radio, MapPin, Search, Shield, ArrowRight } from "lucide-react";

interface FieldRadarProps {
  fugitives: Fugitive[];
  onSelectFugitive: (fugitive: Fugitive) => void;
}

export default function FieldRadar({ fugitives, onSelectFugitive }: FieldRadarProps) {
  const [selectedOffice, setSelectedOffice] = useState<string>("newyork");
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Map field offices with counts
  const officeStats = useMemo(() => {
    const counts: Record<string, { count: number; totalBounty: number }> = {};

    fugitives.forEach((f) => {
      (f.field_offices || []).forEach((office) => {
        const key = office.toLowerCase().replace(/[^a-z]/g, "");
        if (!counts[key]) counts[key] = { count: 0, totalBounty: 0 };
        counts[key].count += 1;
        counts[key].totalBounty += f.reward_amount;
      });
    });

    return counts;
  }, [fugitives]);

  // List of field offices sorted by active fugitive count
  const sortedOffices = useMemo(() => {
    const list = Object.entries(FBI_FIELD_OFFICES).map(([key, point]) => {
      const stats = officeStats[key] || { count: 0, totalBounty: 0 };
      return {
        key,
        ...point,
        count: stats.count,
        totalBounty: stats.totalBounty,
      };
    });

    return list.filter((o) =>
      searchFilter
        ? o.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
          (o.state && o.state.toLowerCase().includes(searchFilter.toLowerCase()))
        : true
    ).sort((a, b) => b.count - a.count);
  }, [officeStats, searchFilter]);

  // Fugitives matching selected field office
  const officeFugitives = useMemo(() => {
    return fugitives.filter((f) => {
      return (f.field_offices || []).some(
        (o) => o.toLowerCase().replace(/[^a-z]/g, "") === selectedOffice
      );
    });
  }, [fugitives, selectedOffice]);

  const activeOfficeInfo = FBI_FIELD_OFFICES[selectedOffice];

  return (
    <div className="w-full max-w-6xl mx-auto font-mono space-y-6">
      {/* Radar Header */}
      <div className="bg-neutral-900/80 border border-neutral-800 p-6 rounded-2xl backdrop-blur flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-widest mb-1">
            <Radio className="w-4 h-4 animate-pulse" />
            Field Office Tactical Radar
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white">
            Regional FBI Field Jurisdiction
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Select a field office across the 56 federal field divisions to track local active cases
          </p>
        </div>

        {/* Office Quick Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
          <input
            type="text"
            placeholder="Filter city or state..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Main Grid: Left selector, Right results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Office List */}
        <div className="lg:col-span-4 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3 max-h-[580px] overflow-y-auto space-y-1.5">
          <div className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider px-3 py-1">
            56 FBI Field Offices
          </div>
          {sortedOffices.map((office) => {
            const isSelected = office.key === selectedOffice;
            return (
              <button
                key={office.key}
                onClick={() => setSelectedOffice(office.key)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-left text-xs transition-all ${
                  isSelected
                    ? "bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 font-bold"
                    : "bg-neutral-950/60 hover:bg-neutral-800/60 text-neutral-300 border border-neutral-800/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <MapPin
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isSelected ? "text-cyan-400" : "text-neutral-500"
                    }`}
                  />
                  <span>
                    {office.name}
                    {office.state ? `, ${office.state}` : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {office.count > 0 && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isSelected
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {office.count} wanted
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Fugitive Results */}
        <div className="lg:col-span-8 space-y-4">
          {/* Selected Office Summary Card */}
          <div className="bg-neutral-900/90 border border-neutral-800 p-5 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  FBI {activeOfficeInfo?.name || selectedOffice.toUpperCase()} Field Office
                </h3>
                <p className="text-xs text-neutral-400">
                  {officeFugitives.length} wanted subjects currently assigned to this division
                </p>
              </div>
            </div>
          </div>

          {/* Fugitives Grid */}
          {officeFugitives.length === 0 ? (
            <div className="p-12 text-center bg-neutral-900/40 border border-neutral-800 rounded-2xl text-neutral-500 text-xs">
              No fugitives in current cached batch for this field office. Try New York, Los Angeles, Boston, or Miami.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {officeFugitives.map((fugitive) => (
                <div
                  key={fugitive.uid}
                  onClick={() => onSelectFugitive(fugitive)}
                  className="bg-neutral-900 border border-neutral-800 hover:border-cyan-500/50 rounded-2xl overflow-hidden cursor-pointer transition-all hover:scale-[1.01] shadow-lg flex flex-col justify-between"
                >
                  <div className="relative aspect-[16/10] bg-neutral-950">
                    <img
                      src={fugitive.images[0]?.large || fugitive.images[0]?.thumb}
                      alt={fugitive.title}
                      className="w-full h-full object-cover object-top"
                    />
                    <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur text-[10px] text-amber-400 font-bold border border-amber-500/30">
                      {fugitive.reward_formatted}
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-white line-clamp-1">
                        {fugitive.title}
                      </h4>
                      <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                        {fugitive.description || "Active Federal Investigation"}
                      </p>
                    </div>

                    <div className="mt-3 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs text-cyan-400 font-semibold">
                      <span>Inspect Dossier</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
