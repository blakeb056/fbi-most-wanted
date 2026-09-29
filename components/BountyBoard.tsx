"use client";

import React, { useState, useMemo } from "react";
import { Fugitive } from "@/lib/types";
import {
  Search,
  AlertTriangle,
  ArrowUpDown,
} from "lucide-react";

interface BountyBoardProps {
  fugitives: Fugitive[];
  onSelectFugitive: (fugitive: Fugitive) => void;
}

export default function BountyBoard({ fugitives, onSelectFugitive }: BountyBoardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"bounty" | "recent" | "alpha">("bounty");

  // Filter and sort fugitives
  const filteredFugitives = useMemo(() => {
    return fugitives
      .filter((f) => {
        // Search term filter
        const query = searchTerm.toLowerCase();
        const matchesQuery =
          !searchTerm ||
          f.title.toLowerCase().includes(query) ||
          (f.description && f.description.toLowerCase().includes(query)) ||
          (f.aliases && f.aliases.some((a) => a.toLowerCase().includes(query))) ||
          (f.field_offices && f.field_offices.some((o) => o.toLowerCase().includes(query)));

        // Category filter
        if (!matchesQuery) return false;

        if (selectedCategory === "all") return true;
        if (selectedCategory === "ten") return f.poster_classification === "ten";
        if (selectedCategory === "cyber") {
          return f.subjects.some((s) => s.toLowerCase().includes("cyber"));
        }
        if (selectedCategory === "violent") {
          return f.subjects.some(
            (s) =>
              s.toLowerCase().includes("violent") ||
              s.toLowerCase().includes("enterprise") ||
              s.toLowerCase().includes("murder")
          );
        }
        if (selectedCategory === "fraud") {
          return (
            f.poster_classification === "fraudster" ||
            f.subjects.some((s) => s.toLowerCase().includes("fraud") || s.toLowerCase().includes("white"))
          );
        }
        if (selectedCategory === "missing") {
          return (
            f.poster_classification === "missing" ||
            f.subjects.some((s) => s.toLowerCase().includes("kidnap") || s.toLowerCase().includes("missing"))
          );
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "bounty") {
          return b.reward_amount - a.reward_amount;
        }
        if (sortBy === "recent") {
          return new Date(b.publication).getTime() - new Date(a.publication).getTime();
        }
        if (sortBy === "alpha") {
          return a.title.localeCompare(b.title);
        }
        return 0;
      });
  }, [fugitives, searchTerm, selectedCategory, sortBy]);

  const categories = [
    { id: "all", label: "All Fugitives" },
    { id: "ten", label: "🔥 Top 10 Most Wanted" },
    { id: "violent", label: "Violent / Gangs" },
    { id: "cyber", label: "Cyber Criminals" },
    { id: "fraud", label: "White Collar / Fraud" },
    { id: "missing", label: "Kidnappings / Missing" },
  ];

  return (
    <div className="w-full max-w-6xl mx-auto font-mono space-y-6">
      {/* Controls Bar: Search, Category Chips & Sort */}
      <div className="bg-neutral-900/80 border border-neutral-800 p-4 md:p-6 rounded-2xl backdrop-blur space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search by name, crime, alias, or field office..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-neutral-500 shrink-0" />
            <span className="text-xs text-neutral-400">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-red-500"
            >
              <option value="bounty">Highest Bounty ($10M+)</option>
              <option value="recent">Recently Published</option>
              <option value="alpha">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          {categories.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-semibold transition-all ${
                  active
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                    : "bg-neutral-950 text-neutral-400 hover:text-white border border-neutral-800 hover:border-neutral-700"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results Count Summary */}
      <div className="flex items-center justify-between text-xs text-neutral-500 px-2">
        <span>Displaying {filteredFugitives.length} active investigations</span>
        <span>Data verified live from api.fbi.gov</span>
      </div>

      {/* Grid of Wanted Posters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFugitives.map((fugitive) => {
          const isTen = fugitive.poster_classification === "ten";
          return (
            <div
              key={fugitive.uid}
              onClick={() => onSelectFugitive(fugitive)}
              className={`group bg-neutral-900/90 border rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 shadow-xl flex flex-col justify-between ${
                isTen
                  ? "border-red-500/60 shadow-[0_0_20px_rgba(239,68,68,0.15)] hover:border-red-500"
                  : "border-neutral-800 hover:border-neutral-700"
              }`}
            >
              {/* Poster Image */}
              <div className="relative aspect-[4/3] bg-neutral-950 overflow-hidden">
                <img
                  src={fugitive.images[0]?.large || fugitive.images[0]?.thumb}
                  alt={fugitive.title}
                  className="w-full h-full object-cover object-top filter grayscale group-hover:grayscale-0 transition-all duration-500"
                />

                {/* Top Badge */}
                <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      isTen
                        ? "bg-red-600 text-white shadow-md"
                        : "bg-black/80 backdrop-blur text-neutral-300 border border-neutral-700"
                    }`}
                  >
                    {isTen ? "Ten Most Wanted" : fugitive.subjects[0] || "Wanted"}
                  </span>

                  {fugitive.reward_amount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 backdrop-blur border border-amber-500/40 text-amber-400 font-bold text-xs">
                      {fugitive.reward_formatted}
                    </span>
                  )}
                </div>

                {/* Warning Bar */}
                {fugitive.warning_message && (
                  <div className="absolute bottom-2 left-2 right-2 bg-red-600/90 backdrop-blur text-white text-[9px] font-bold px-2 py-1 rounded uppercase tracking-wider text-center flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span className="truncate">{fugitive.warning_message}</span>
                  </div>
                )}
              </div>

              {/* Poster Details */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-black text-white group-hover:text-red-400 transition-colors line-clamp-1">
                    {fugitive.title}
                  </h3>

                  {fugitive.aliases && fugitive.aliases.length > 0 && (
                    <p className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
                      Alias: {fugitive.aliases.slice(0, 2).join(", ")}
                    </p>
                  )}

                  <p className="text-xs text-neutral-300 mt-2.5 line-clamp-2 leading-relaxed font-sans">
                    {fugitive.description || "Active Federal Investigation"}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between text-xs">
                  <span className="text-neutral-400 text-[11px]">
                    {fugitive.field_offices?.[0]
                      ? `FBI ${fugitive.field_offices[0].toUpperCase()}`
                      : "FBI HQ"}
                  </span>
                  <span className="text-red-400 font-bold group-hover:underline flex items-center gap-1">
                    Classified Dossier &rarr;
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
