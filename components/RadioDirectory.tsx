"use client";

import React, { useState, useMemo } from "react";
import { RadioStation } from "@/lib/types";
import {
  Radio,
  Search,
  Volume2,
  Play,
  Pause,
  ExternalLink,
  MapPin,
  TrendingUp,
} from "lucide-react";

interface RadioDirectoryProps {
  stations: RadioStation[];
  onSelectStation: (station: RadioStation) => void;
  activeStation?: RadioStation | null;
}

export default function RadioDirectory({
  stations,
  onSelectStation,
  activeStation,
}: RadioDirectoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("all");
  const [playingId, setPlayingId] = useState<string | null>(activeStation?.id || null);

  // Extract top countries with station counts
  const topCountries = useMemo(() => {
    const counts: Record<string, number> = {};
    stations.forEach((s) => {
      const c = (s.cc || "GLOBAL").toUpperCase();
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);
  }, [stations]);

  const filteredStations = useMemo(() => {
    return stations.filter((s) => {
      if (selectedCountry !== "all" && s.cc?.toUpperCase() !== selectedCountry) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        s.name.toLowerCase().includes(term) ||
        s.cc.toLowerCase().includes(term)
      );
    });
  }, [stations, selectedCountry, searchTerm]);

  return (
    <div className="space-y-6 font-mono">
      {/* Directory Banner */}
      <div className="bg-neutral-900/90 border border-neutral-800 p-5 rounded-2xl shadow-xl backdrop-blur">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                SKY DIAL GLOBAL RADIO TUNER
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-neutral-400">
                {stations.length.toLocaleString()} TRANSMITTER LOCATIONS INGESTED
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider mt-1">
              Live World Radio Broadcast Streams
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Tune into local FM/AM/Web streams across 190+ sovereign countries mapped to real geographical coordinates.
            </p>
          </div>
        </div>

        {/* Search & Country Filter Badges */}
        <div className="mt-4 pt-4 border-t border-neutral-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
            <input
              type="text"
              placeholder="Search radio station by title or country..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 pl-10 pr-4 py-2 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCountry("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${
                selectedCountry === "all"
                  ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30"
                  : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800"
              }`}
            >
              All Nations ({stations.length.toLocaleString()})
            </button>
            {topCountries.map(([cc, count]) => (
              <button
                key={cc}
                onClick={() => setSelectedCountry(cc)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${
                  selectedCountry === cc
                    ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/30"
                    : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800"
                }`}
              >
                {cc} ({count})
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredStations.slice(0, 60).map((st) => {
          const isCurrentlyActive = activeStation?.id === st.id;

          return (
            <div
              key={st.id}
              className={`p-4 rounded-xl border bg-neutral-900/60 backdrop-blur hover:bg-neutral-900 transition-all flex flex-col justify-between gap-3 ${
                isCurrentlyActive
                  ? "border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                  : "border-neutral-800 hover:border-emerald-500/40"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {st.cc || "WORLD"}
                  </span>
                  <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> {st.clicks?.toLocaleString() || 0} listens
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white mt-2 line-clamp-1">
                  {st.name}
                </h4>

                <div className="flex items-center gap-1 text-xs text-neutral-400 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span>Lat: {st.lat.toFixed(2)}°, Lon: {st.lon.toFixed(2)}°</span>
                </div>
              </div>

              {/* Inline Player & Globe Focus */}
              <div className="space-y-2 pt-2 border-t border-neutral-800/80">
                <audio
                  src={st.url}
                  controls
                  preload="none"
                  className="w-full h-8 max-h-8 rounded"
                />

                <button
                  onClick={() => onSelectStation(st)}
                  className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md"
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Lock Coordinates on Globe</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredStations.length === 0 && (
        <div className="text-center py-16 bg-neutral-900/40 border border-neutral-800 rounded-2xl">
          <Radio className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
          <p className="text-sm text-neutral-400 font-bold">No radio stations matched your query.</p>
          <p className="text-xs text-neutral-600 mt-1">Try resetting the country or clearing your search.</p>
        </div>
      )}
    </div>
  );
}
