"use client";

import React, { useState, useEffect } from "react";
import { Fugitive } from "@/lib/types";
import TacticalGlobe from "@/components/TacticalGlobe";
import BountyBoard from "@/components/BountyBoard";
import BountyGame from "@/components/BountyGame";
import FieldRadar from "@/components/FieldRadar";
import FugitiveDossier from "@/components/FugitiveDossier";
import {
  Globe,
  Grid,
  Gamepad2,
  Radio,
  Shield,
  RefreshCw,
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"globe" | "board" | "game" | "radar">("globe");
  const [fugitives, setFugitives] = useState<Fugitive[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFugitive, setSelectedFugitive] = useState<Fugitive | null>(null);

  // Fetch fugitives on mount
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Fetch both Top 10 and broader set
        const res = await fetch("/api/wanted?pageSize=50");
        const data = await res.json();
        setFugitives(data.items || []);
      } catch (err) {
        console.error("Failed to load fugitives:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute total bounties
  const totalBountyValue = React.useMemo(() => {
    return fugitives.reduce((acc, f) => acc + f.reward_amount, 0);
  }, [fugitives]);

  const top10Count = React.useMemo(() => {
    return fugitives.filter((f) => f.poster_classification === "ten").length;
  }, [fugitives]);

  const handleLocateOnGlobe = (fugitive: Fugitive) => {
    setSelectedFugitive(fugitive);
    setActiveTab("globe");
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-neutral-100 font-mono flex flex-col selection:bg-red-500 selection:text-white">
      {/* Classified Header Banner */}
      <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(239,68,68,0.5)]">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                  FBI WANTED DATABASE
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-neutral-400">API CONNECTED</span>
              </div>
              <h1 className="text-lg md:text-xl font-black text-white tracking-wider uppercase">
                Federal Bureau of Investigation
              </h1>
            </div>
          </div>

          {/* Quick Metrics Ticker */}
          <div className="flex items-center gap-4 text-xs">
            <div className="bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] text-neutral-500 uppercase block">Active Bounties</span>
              <span className="font-bold text-amber-400">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  maximumFractionDigits: 0,
                }).format(totalBountyValue)}
              </span>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 px-3 py-1.5 rounded-xl">
              <span className="text-[10px] text-neutral-500 uppercase block">Top 10 Wanted</span>
              <span className="font-bold text-red-400">{top10Count || 10} Priority</span>
            </div>
          </div>
        </div>

        {/* Global Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 overflow-x-auto py-2 border-t border-neutral-900">
          <button
            onClick={() => setActiveTab("globe")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "globe"
                ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>3D Tactical Globe</span>
          </button>

          <button
            onClick={() => setActiveTab("board")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "board"
                ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Bounty Board</span>
          </button>

          <button
            onClick={() => setActiveTab("game")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "game"
                ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span>Higher or Lower</span>
          </button>

          <button
            onClick={() => setActiveTab("radar")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === "radar"
                ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                : "text-neutral-400 hover:text-white hover:bg-neutral-900"
            }`}
          >
            <Radio className="w-4 h-4" />
            <span>Field Radar</span>
          </button>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
            <RefreshCw className="w-8 h-8 text-red-500 animate-spin mb-3" />
            <p className="text-sm font-bold text-neutral-300 uppercase tracking-widest">
              Connecting to Federal Bureau of Investigation API...
            </p>
            <p className="text-xs text-neutral-500 mt-1">Siphoning live wanted posters and bounties</p>
          </div>
        ) : (
          <>
            {activeTab === "globe" && (
              <div className="space-y-6">
                <div className="text-center max-w-2xl mx-auto space-y-2">
                  <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">
                    Global Crime & Escape Coordinates
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Interactive 3D tracking map mapping federal crime origin field offices against suspected international escape havens (Athens, Honduras, Mexico, India).
                  </p>
                </div>
                <TacticalGlobe
                  fugitives={fugitives}
                  onSelectFugitive={setSelectedFugitive}
                  selectedFugitive={selectedFugitive}
                />
              </div>
            )}

            {activeTab === "board" && (
              <BountyBoard
                fugitives={fugitives}
                onSelectFugitive={setSelectedFugitive}
              />
            )}

            {activeTab === "game" && (
              <BountyGame fugitives={fugitives} />
            )}

            {activeTab === "radar" && (
              <FieldRadar
                fugitives={fugitives}
                onSelectFugitive={setSelectedFugitive}
              />
            )}
          </>
        )}
      </main>

      {/* Classified Modal Dossier */}
      <FugitiveDossier
        fugitive={selectedFugitive}
        onClose={() => setSelectedFugitive(null)}
        onLocateOnGlobe={handleLocateOnGlobe}
      />

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-center text-xs text-neutral-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <p>
            Data sourced live from the official{" "}
            <a
              href="https://www.fbi.gov/wanted/api"
              target="_blank"
              rel="noreferrer"
              className="text-red-400 hover:underline"
            >
              FBI Wanted API
            </a>
            . Not an official government endorsement.
          </p>
          <p className="text-[11px] text-neutral-600">
            Built for Vercel • Next.js & Tailwind CSS
          </p>
        </div>
      </footer>
    </div>
  );
}
