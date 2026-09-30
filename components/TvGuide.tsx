"use client";

import React, { useState, useMemo } from "react";
import { TvChannel } from "@/lib/types";
import {
  Tv,
  Search,
  ExternalLink,
  MapPin,
  Play,
  Film,
} from "lucide-react";

interface TvGuideProps {
  channels: TvChannel[];
  onSelectChannel: (channel: TvChannel) => void;
  activeChannel?: TvChannel | null;
}

export default function TvGuide({
  channels,
  onSelectChannel,
  activeChannel,
}: TvGuideProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const categories = useMemo(() => {
    const cats = new Set<string>();
    channels.forEach((c) => {
      if (c.cat) cats.add(c.cat.toLowerCase());
    });
    return Array.from(cats);
  }, [channels]);

  const filteredChannels = useMemo(() => {
    return channels.filter((c) => {
      if (selectedCategory !== "all" && c.cat?.toLowerCase() !== selectedCategory) return false;
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        c.name.toLowerCase().includes(term) ||
        c.cc.toLowerCase().includes(term) ||
        c.cat?.toLowerCase().includes(term)
      );
    });
  }, [channels, selectedCategory, searchTerm]);

  return (
    <div className="space-y-6 font-mono">
      {/* Banner */}
      <div className="bg-neutral-900/90 border border-neutral-800 p-5 rounded-2xl shadow-xl backdrop-blur">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                SKY DIAL TV BROADCAST GUIDE
              </span>
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span className="text-xs text-neutral-400">
                {channels.length.toLocaleString()} LIVE CHANNELS & WEBCAMS
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider mt-1">
              Earth Television Feeds & Observatories
            </h2>
            <p className="text-xs text-neutral-400 mt-1">
              Public IPTV channels, news broadcasts, nature cams, and city feeds across sovereign coordinates.
            </p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mt-4 pt-4 border-t border-neutral-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-neutral-500" />
            <input
              type="text"
              placeholder="Search TV broadcast, country, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 pl-10 pr-4 py-2 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${
                selectedCategory === "all"
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                  : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800"
              }`}
            >
              All Categories ({channels.length.toLocaleString()})
            </button>
            {categories.slice(0, 10).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                    : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredChannels.slice(0, 60).map((ch) => {
          const isCurrentlyActive = activeChannel?.id === ch.id;

          return (
            <div
              key={ch.id}
              className={`p-4 rounded-xl border bg-neutral-900/60 backdrop-blur hover:bg-neutral-900 transition-all flex flex-col justify-between gap-3 ${
                isCurrentlyActive
                  ? "border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                  : "border-neutral-800 hover:border-purple-500/40"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    {ch.cc || "WORLD"} • {(ch.cat || "general").toUpperCase()}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white mt-2 line-clamp-1">
                  {ch.name}
                </h4>

                <div className="flex items-center gap-1 text-xs text-neutral-400 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                  <span>Lat: {ch.lat.toFixed(2)}°, Lon: {ch.lon.toFixed(2)}°</span>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-neutral-800/80">
                <a
                  href={ch.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-bold transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-purple-400" />
                  <span>Open Feed</span>
                </a>
                <button
                  onClick={() => onSelectChannel(ch)}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md"
                >
                  <Tv className="w-3.5 h-3.5" />
                  <span>Globe Lock</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredChannels.length === 0 && (
        <div className="text-center py-16 bg-neutral-900/40 border border-neutral-800 rounded-2xl">
          <Tv className="w-10 h-10 text-neutral-600 mx-auto mb-2" />
          <p className="text-sm text-neutral-400 font-bold">No TV channels matched your query.</p>
          <p className="text-xs text-neutral-600 mt-1">Try selecting All Categories or resetting search.</p>
        </div>
      )}
    </div>
  );
}
