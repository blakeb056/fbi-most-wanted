"use client";

import React from "react";
import { Fugitive } from "@/lib/types";
import {
  Shield,
  RotateCw,
  Globe,
  Grid,
  Gamepad2,
  Radio,
  Info,
  MapPin,
  PlaneTakeoff,
  Eye,
  X,
} from "lucide-react";

interface FbiHUDProps {
  fugitives: Fugitive[];
  activeFugitive: Fugitive | null;
  onSelectFugitive: (fugitive: Fugitive) => void;
  onCloseFugitive: () => void;
  onOpenDossier: (fugitive: Fugitive) => void;
  activeSubTab: "globe" | "board" | "game" | "radar";
  onSubTabChange: (tab: "globe" | "board" | "game" | "radar") => void;
  autoRotate: boolean;
  onToggleOrbit: () => void;
  totalBountyValue: number;
  top10Count: number;
  totalDatabaseCases: number;
  onOpenInfoModal: () => void;
}

export default function FbiHUD({
  fugitives,
  activeFugitive,
  onSelectFugitive,
  onCloseFugitive,
  onOpenDossier,
  activeSubTab,
  onSubTabChange,
  autoRotate,
  onToggleOrbit,
  totalBountyValue,
  top10Count,
  totalDatabaseCases,
  onOpenInfoModal,
}: FbiHUDProps) {
  return (
    <div className="absolute inset-0 pointer-events-none z-30 font-mono select-none">
      {/* 1. TOP-LEFT: FEDERAL MANHUNT BADGE & TOTALS */}
      <div className="pointer-events-auto absolute top-4 left-4 max-w-sm w-full bg-neutral-900/92 border border-neutral-700/80 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-white">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444] animate-pulse" />
            <h2 className="text-base font-black tracking-widest uppercase">
              FBI MOST WANTED
            </h2>
          </div>
          <button
            onClick={onOpenInfoModal}
            className="flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-bold uppercase tracking-wider"
            title="Inspect 1,254 cases breakdown"
          >
            <Info className="w-3.5 h-3.5" />
            <span>1,254 Cases</span>
          </button>
        </div>

        <p className="text-[11px] text-neutral-400 mt-2 leading-relaxed">
          Federal crime origin field offices against suspected international escape havens (Athens, Honduras, Mexico, India).
        </p>

        {/* Bounty Metrics */}
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-neutral-800/80 text-center">
          <div className="p-2 rounded-xl bg-neutral-950/80 border border-neutral-800">
            <span className="text-sm font-black text-amber-400 block font-mono">
              {new Intl.NumberFormat("en-US", {
                style: "currency",
                currency: "USD",
                maximumFractionDigits: 0,
              }).format(totalBountyValue)}
            </span>
            <span className="text-[9px] text-neutral-500 uppercase font-bold block">
              Active Bounty Pool
            </span>
          </div>
          <div className="p-2 rounded-xl bg-neutral-950/80 border border-neutral-800">
            <span className="text-sm font-black text-red-400 block font-mono">
              {top10Count || 10} Priority
            </span>
            <span className="text-[9px] text-neutral-500 uppercase font-bold block">
              Ten Most Wanted
            </span>
          </div>
        </div>
      </div>

      {/* 2. TOP-CENTER: SUB-TABS (Globe / Board / Game / Radar) */}
      <div className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1.5 bg-neutral-900/90 border border-neutral-700/80 p-1.5 rounded-xl shadow-2xl backdrop-blur-md text-xs">
        <button
          onClick={() => onSubTabChange("globe")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === "globe"
              ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
              : "text-neutral-400 hover:text-white hover:bg-neutral-800"
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Globe</span>
        </button>

        <button
          onClick={() => onSubTabChange("board")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === "board"
              ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
              : "text-neutral-400 hover:text-white hover:bg-neutral-800"
          }`}
        >
          <Grid className="w-3.5 h-3.5" />
          <span>Bounty Board (1,254)</span>
        </button>

        <button
          onClick={() => onSubTabChange("game")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === "game"
              ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
              : "text-neutral-400 hover:text-white hover:bg-neutral-800"
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>Higher or Lower</span>
        </button>

        <button
          onClick={() => onSubTabChange("radar")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
            activeSubTab === "radar"
              ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
              : "text-neutral-400 hover:text-white hover:bg-neutral-800"
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Field Radar (56)</span>
        </button>
      </div>

      {/* 3. TOP-RIGHT: ORBIT TOGGLE */}
      <div className="pointer-events-auto absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={onToggleOrbit}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold border text-xs shadow-xl backdrop-blur-md transition-all ${
            autoRotate
              ? "bg-red-500/20 border-red-500/40 text-red-300"
              : "bg-neutral-900/90 border-neutral-700 text-neutral-400 hover:text-white"
          }`}
          title="Toggle automatic camera orbit rotation"
        >
          <RotateCw className={`w-3.5 h-3.5 ${autoRotate ? "animate-spin" : ""}`} />
          <span>{autoRotate ? "Orbit ON" : "Orbit OFF"}</span>
        </button>
      </div>

      {/* 4. BOTTOM HUD: TARGET LOCKED FUGITIVE BANNER */}
      {activeFugitive && (
        <div className="pointer-events-auto absolute bottom-4 left-4 right-4 max-w-xl mx-auto bg-neutral-900/95 border border-red-500/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={activeFugitive.images[0]?.thumb || activeFugitive.images[0]?.large}
              alt={activeFugitive.title}
              className="w-12 h-12 rounded-xl object-cover border border-neutral-700 shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                  TARGET LOCKED
                </span>
                <span className="text-xs text-amber-400 font-bold font-mono">
                  {activeFugitive.reward_formatted}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white line-clamp-1 mt-0.5">
                {activeFugitive.title}
              </h4>
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                {activeFugitive.crime_location && (
                  <span className="flex items-center gap-1 text-red-400">
                    <MapPin className="w-3 h-3" /> {activeFugitive.crime_location.name}
                  </span>
                )}
                {activeFugitive.escape_location && (
                  <span className="flex items-center gap-1 text-amber-400">
                    <PlaneTakeoff className="w-3 h-3" /> Haven: {activeFugitive.escape_location.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenDossier(activeFugitive)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg transition-all"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Open Dossier</span>
            </button>
            <button
              onClick={onCloseFugitive}
              className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
