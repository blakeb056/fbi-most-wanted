"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Fugitive } from "@/lib/types";
import {
  Search,
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Database,
} from "lucide-react";

interface BountyBoardProps {
  fugitives: Fugitive[];
  onSelectFugitive: (fugitive: Fugitive) => void;
}

export default function BountyBoard({ fugitives, onSelectFugitive }: BountyBoardProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"bounty" | "recent" | "alpha">("bounty");

  // Pagination state across the 1,254 FBI cases
  const [page, setPage] = useState(1);
  const [totalRecords, setTotalRecords] = useState(1254);
  const [pagedFugitives, setPagedFugitives] = useState<Fugitive[]>(fugitives);
  const [loading, setLoading] = useState(false);
  const [pageInput, setPageInput] = useState("1");

  const totalPages = Math.max(1, Math.ceil(totalRecords / 50));

  // Debounce search input to avoid hitting FBI API on every keystroke
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch data when page, category, or debounced search changes
  const fetchPageData = useCallback(async (p: number, cat: string, query: string) => {
    // If it's page 1 with no search and all categories, we can default to initial prop
    if (p === 1 && !query && cat === "all" && fugitives.length > 0) {
      setPagedFugitives(fugitives);
      setTotalRecords(1254);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("page", p.toString());
      params.set("pageSize", "50");
      if (cat !== "all") params.set("classification", cat);
      if (query) params.set("query", query);

      const res = await fetch(`/api/wanted?${params.toString()}`);
      const data = await res.json();
      setPagedFugitives(data.items || []);
      if (data.total) setTotalRecords(data.total);
    } catch (err) {
      console.error("Failed to fetch FBI page data:", err);
    } finally {
      setLoading(false);
    }
  }, [fugitives]);

  useEffect(() => {
    fetchPageData(page, selectedCategory, debouncedSearch);
    setPageInput(page.toString());
  }, [page, selectedCategory, debouncedSearch, fetchPageData]);

  // Local sorting of current page items
  const sortedFugitives = useMemo(() => {
    return [...pagedFugitives].sort((a, b) => {
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
  }, [pagedFugitives, sortBy]);

  const categories = [
    { id: "all", label: "All Federal Records (1,254)" },
    { id: "ten", label: "🔥 Top 10 Most Wanted" },
    { id: "violent", label: "Violent / Gangs" },
    { id: "cyber", label: "Cyber Criminals" },
    { id: "fraud", label: "White Collar / Fraud" },
    { id: "missing", label: "Kidnappings / Missing" },
  ];

  const handlePageJump = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      setPage(p);
    } else {
      setPageInput(page.toString());
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto font-mono space-y-6">
      {/* Controls Bar: Search, Category Chips & Sort */}
      <div className="bg-neutral-900/80 border border-neutral-800 p-4 md:p-6 rounded-2xl backdrop-blur space-y-4 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Input querying all 1,254 FBI records */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search across all 1,254 FBI records (name, cartel, moniker, crime)..."
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
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setPage(1);
                }}
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

      {/* Pagination & Database Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-neutral-900/60 border border-neutral-800/80 px-4 py-3 rounded-xl text-xs text-neutral-400">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-red-400 shrink-0" />
          <span>
            Displaying <span className="text-white font-bold">{sortedFugitives.length}</span> of{" "}
            <span className="text-white font-bold">{totalRecords.toLocaleString()}</span> active FBI
            records
          </span>
          <span className="text-neutral-600">•</span>
          <span className="text-neutral-300">
            Page <span className="text-amber-400 font-bold">{page}</span> of {totalPages}
          </span>
        </div>

        {/* Page Nav Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1 || loading}
            className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Jump to Page Form */}
          <form onSubmit={handlePageJump} className="flex items-center gap-1.5">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              className="w-12 text-center bg-neutral-950 border border-neutral-800 rounded-lg py-1 text-xs text-white focus:outline-none focus:border-red-500"
            />
            <span className="text-neutral-500">/ {totalPages}</span>
          </form>

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages || loading}
            className="p-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid of Wanted Posters or Loading Indicator */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-center">
          <RefreshCw className="w-8 h-8 text-red-500 animate-spin mb-3" />
          <p className="text-sm font-bold text-neutral-300 uppercase tracking-widest">
            Querying Federal Bureau of Investigation Archive...
          </p>
          <p className="text-xs text-neutral-500 mt-1">Retrieving Page {page} (50 cases)</p>
        </div>
      ) : sortedFugitives.length === 0 ? (
        <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-12 text-center text-xs text-neutral-400">
          No records matched your search query in this classification. Try clearing filters or searching another keyword.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedFugitives.map((fugitive) => {
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
      )}

      {/* Bottom Pagination Bar */}
      {!loading && sortedFugitives.length > 0 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => {
              setPage(1);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            First Page
          </button>
          <button
            onClick={() => {
              setPage((p) => Math.max(1, p - 1));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            &larr; Prev Page
          </button>
          <span className="px-3 py-1.5 text-xs text-neutral-400">
            Page <span className="text-white font-bold">{page}</span> of {totalPages}
          </span>
          <button
            onClick={() => {
              setPage((p) => Math.min(totalPages, p + 1));
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next Page &rarr;
          </button>
          <button
            onClick={() => {
              setPage(totalPages);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-neutral-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Last Page
          </button>
        </div>
      )}
    </div>
  );
}
