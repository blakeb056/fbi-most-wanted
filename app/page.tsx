"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Fugitive,
  DistressCall,
  TracerHotspot,
  TracerConflict,
  RadioStation,
  TvChannel,
  GlobeLayerMode,
} from "@/lib/types";
import TacticalGlobe from "@/components/TacticalGlobe";
import FbiHUD from "@/components/FbiHUD";
import DistressHUD from "@/components/DistressHUD";
import TracerHUD from "@/components/TracerHUD";
import SkyDialHUD from "@/components/SkyDialHUD";
import BountyBoard from "@/components/BountyBoard";
import BountyGame from "@/components/BountyGame";
import FieldRadar from "@/components/FieldRadar";
import FugitiveDossier from "@/components/FugitiveDossier";
import { enableAudio } from "@/lib/sound";
import {
  Shield,
  ShieldAlert,
  Flame,
  Radio,
  Tv,
} from "lucide-react";

export default function Home() {
  // Master Layer Mode
  const [layerMode, setLayerMode] = useState<GlobeLayerMode>("fbi");

  // FBI sub-tab state
  const [fbiSubTab, setFbiSubTab] = useState<"globe" | "board" | "game" | "radar">("globe");

  // Camera Orbit state (Default FALSE across all modes so globe stays completely stationary)
  const [autoRotate, setAutoRotate] = useState(false);

  // Camera focus coordinate target
  const [focusPoint, setFocusPoint] = useState<{ lat: number; lng: number; altitude?: number } | null>(null);

  // Sound toggle (WebAudio scanner blips)
  const [soundOn, setSoundOn] = useState(false);

  // Distress filters
  const [sevFilter, setSevFilter] = useState<number[]>([0, 1, 2, 3]);
  const [kindFilter, setKindFilter] = useState<string[]>(["police", "crime", "fire", "traffic"]);

  // Tracer band filter
  const [tracerBand, setTracerBand] = useState<string>("all");

  // Datasets
  const [fugitives, setFugitives] = useState<Fugitive[]>([]);
  const [distressCalls, setDistressCalls] = useState<DistressCall[]>([]);
  const [tracerHotspots, setTracerHotspots] = useState<TracerHotspot[]>([]);
  const [tracerConflicts, setTracerConflicts] = useState<TracerConflict[]>([]);
  const [radioStations, setRadioStations] = useState<RadioStation[]>([]);
  const [tvChannels, setTvChannels] = useState<TvChannel[]>([]);

  // Selection states
  const [selectedFugitive, setSelectedFugitive] = useState<Fugitive | null>(null);
  const [dossierFugitive, setDossierFugitive] = useState<Fugitive | null>(null);
  const [selectedDistressCall, setSelectedDistressCall] = useState<DistressCall | null>(null);
  const [selectedTracerHotspot, setSelectedTracerHotspot] = useState<TracerHotspot | null>(null);
  const [selectedRadioStation, setSelectedRadioStation] = useState<RadioStation | null>(null);
  const [selectedTvChannel, setSelectedTvChannel] = useState<TvChannel | null>(null);

  // Dataset modal for FBI explanation
  const [showFbiDatasetModal, setShowFbiDatasetModal] = useState(false);

  // 1. Initial Load: FBI Wanted Feed
  useEffect(() => {
    async function loadFbi() {
      try {
        const res = await fetch("/api/wanted?pageSize=50");
        const data = await res.json();
        const initialItems: Fugitive[] = data.items || [];
        setFugitives(initialItems);

        // Background prefetch pages 2 and 3
        fetch("/api/wanted?page=2&pageSize=50")
          .then((r) => r.json())
          .then((p2) => {
            if (p2.items?.length > 0) {
              setFugitives((prev) => {
                const seen = new Set(prev.map((f) => f.uid));
                const additions = p2.items.filter((f: Fugitive) => !seen.has(f.uid));
                return [...prev, ...additions];
              });
            }
          })
          .catch(() => {});
      } catch (err) {
        console.error("Failed to load FBI data:", err);
      }
    }
    loadFbi();
  }, []);

  // 2. Pre-fetch / lazy-load Distress CAD calls
  useEffect(() => {
    if (layerMode === "distress" || distressCalls.length === 0) {
      fetch("/api/distress")
        .then((r) => r.json())
        .then((data) => {
          if (data.calls && Array.isArray(data.calls)) {
            setDistressCalls(data.calls);
          }
        })
        .catch((err) => console.error("Distress fetch error:", err));
    }
  }, [layerMode, distressCalls.length]);

  // 3. Pre-fetch / lazy-load Tracer UCDP Conflict data
  useEffect(() => {
    if (layerMode === "tracer" || tracerHotspots.length === 0) {
      Promise.all([
        fetch("/data/tracer-hotspots.json").then((r) => r.json()),
        fetch("/data/tracer-conflicts.json").then((r) => r.json()),
      ])
        .then(([hotspotData, conflictData]) => {
          if (hotspotData?.hotspots) setTracerHotspots(hotspotData.hotspots);
          if (conflictData?.conflicts) setTracerConflicts(conflictData.conflicts);
        })
        .catch((err) => console.error("Tracer data load error:", err));
    }
  }, [layerMode, tracerHotspots.length]);

  // 4. Pre-fetch / lazy-load Sky Dial Radio stations
  useEffect(() => {
    if (layerMode === "radio" || radioStations.length === 0) {
      fetch("/data/skydial-radio.json")
        .then((r) => r.json())
        .then((rows: any[]) => {
          if (Array.isArray(rows)) {
            const mapped: RadioStation[] = rows.map((r) => ({
              lat: r[0],
              lon: r[1],
              name: r[2],
              cc: r[3],
              url: r[4],
              id: r[5],
              clicks: r[6] || 0,
            }));
            setRadioStations(mapped);
          }
        })
        .catch((err) => console.error("Radio data load error:", err));
    }
  }, [layerMode, radioStations.length]);

  // 5. Pre-fetch / lazy-load Sky Dial TV & CCTV channels
  useEffect(() => {
    if (layerMode === "tv" || tvChannels.length === 0) {
      fetch("/data/skydial-tv.json")
        .then((r) => r.json())
        .then((rows: any[]) => {
          if (Array.isArray(rows)) {
            const mapped: TvChannel[] = rows.map((r) => ({
              lat: r[0],
              lon: r[1],
              name: r[2],
              cc: r[3],
              url: r[4],
              id: r[5],
              cat: r[6] || "general",
            }));
            setTvChannels(mapped);
          }
        })
        .catch((err) => console.error("TV data load error:", err));
    }
  }, [layerMode, tvChannels.length]);

  // Telemetry computations
  const totalBountyValue = React.useMemo(() => {
    return fugitives.reduce((acc, f) => acc + f.reward_amount, 0);
  }, [fugitives]);

  const top10Count = React.useMemo(() => {
    return fugitives.filter((f) => f.poster_classification === "ten").length;
  }, [fugitives]);

  // Sound toggle handler
  const handleToggleSound = async () => {
    if (!soundOn) {
      await enableAudio();
      setSoundOn(true);
    } else {
      setSoundOn(false);
    }
  };

  // Camera region preset jump
  const handleFocusRegion = (region: "US" | "UK" | "World") => {
    setAutoRotate(false);
    if (region === "US") {
      setFocusPoint({ lat: 39.5, lng: -96 });
    } else if (region === "UK") {
      setFocusPoint({ lat: 53.2, lng: -2.4 });
    } else {
      setFocusPoint({ lat: 20, lng: 0 });
    }
  };

  // Selection handlers
  const handleLocateFugitive = (f: Fugitive) => {
    setSelectedFugitive(f);
    setLayerMode("fbi");
    setFbiSubTab("globe");
    const loc = f.crime_location || f.escape_location;
    if (loc) setFocusPoint({ lat: loc.lat, lng: loc.lng });
  };

  const handleLocateCall = (c: DistressCall) => {
    setSelectedDistressCall(c);
    setFocusPoint({ lat: c.lat, lng: c.lon });
  };

  const handleLocateStation = (s: RadioStation) => {
    setSelectedRadioStation(s);
    setFocusPoint({ lat: s.lat, lng: s.lon });
  };

  const handleLocateChannel = (ch: TvChannel) => {
    setSelectedTvChannel(ch);
    setFocusPoint({ lat: ch.lat, lng: ch.lon });
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#07080a] text-neutral-100 font-mono select-none flex flex-col">
      {/* MASTER TOP NAVIGATION BAR */}
      <header className="h-14 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur-md px-4 flex items-center justify-between z-40 shrink-0">
        {/* Left: Platform Title */}
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-white transition-all shadow-md ${
              layerMode === "fbi"
                ? "bg-red-600 shadow-red-600/40"
                : layerMode === "distress"
                ? "bg-cyan-600 shadow-cyan-600/40"
                : layerMode === "tracer"
                ? "bg-rose-600 shadow-rose-600/40"
                : layerMode === "radio"
                ? "bg-emerald-600 shadow-emerald-600/40"
                : "bg-purple-600 shadow-purple-600/40"
            }`}
          >
            {layerMode === "fbi" && <Shield className="w-4 h-4" />}
            {layerMode === "distress" && <ShieldAlert className="w-4 h-4" />}
            {layerMode === "tracer" && <Flame className="w-4 h-4" />}
            {layerMode === "radio" && <Radio className="w-4 h-4" />}
            {layerMode === "tv" && <Tv className="w-4 h-4" />}
          </div>

          <div className="hidden sm:block">
            <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest block">
              OMNI-GLOBE PLATFORM
            </span>
            <span className="text-xs font-black text-white tracking-wider uppercase">
              {layerMode === "fbi" && "FBI Most Wanted Manhunts"}
              {layerMode === "distress" && "Distress 911 CAD Dispatch"}
              {layerMode === "tracer" && "Tracer Conflict War Map"}
              {layerMode === "radio" && "Sky Dial World Radio Tuner"}
              {layerMode === "tv" && "Sky Dial TV & CCTV Feeds"}
            </span>
          </div>
        </div>

        {/* Center: Master Mode Switcher Pills */}
        <div className="flex items-center gap-1 bg-neutral-900/90 border border-neutral-800 p-1 rounded-xl">
          <button
            onClick={() => setLayerMode("fbi")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              layerMode === "fbi"
                ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>FBI Wanted</span>
          </button>

          <button
            onClick={() => setLayerMode("distress")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              layerMode === "distress"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Distress 911</span>
          </button>

          <button
            onClick={() => setLayerMode("tracer")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              layerMode === "tracer"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Tracer War</span>
          </button>

          <button
            onClick={() => setLayerMode("radio")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              layerMode === "radio"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Sky Dial Radio</span>
          </button>

          <button
            onClick={() => setLayerMode("tv")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              layerMode === "tv"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Sky Dial TV</span>
          </button>
        </div>

        {/* Right Status Badge */}
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] text-neutral-400 font-bold uppercase">
            Live Natural Earth Matrix
          </span>
        </div>
      </header>

      {/* VIEWPORT AREA */}
      <div className="relative flex-1 w-full h-[calc(100vh-56px)] overflow-hidden">
        {/* IMMERSIVE 3D TACTICAL GLOBE (Always Mounted) */}
        <TacticalGlobe
          activeMode={layerMode}
          fugitives={fugitives}
          distressCalls={distressCalls}
          tracerHotspots={tracerHotspots}
          radioStations={radioStations}
          tvChannels={tvChannels}
          onSelectFugitive={setSelectedFugitive}
          onSelectDistressCall={handleLocateCall}
          onSelectTracerHotspot={setSelectedTracerHotspot}
          onSelectRadioStation={handleLocateStation}
          onSelectTvChannel={handleLocateChannel}
          selectedFugitive={selectedFugitive}
          selectedRadioStation={selectedRadioStation}
          selectedTvChannel={selectedTvChannel}
          autoRotate={autoRotate}
          onToggleOrbit={() => setAutoRotate((r) => !r)}
          focusPoint={focusPoint}
        />

        {/* 🔴 LAYER 1: FBI MOST WANTED HUD OVERLAY */}
        {layerMode === "fbi" && fbiSubTab === "globe" && (
          <FbiHUD
            fugitives={fugitives}
            activeFugitive={selectedFugitive}
            onSelectFugitive={setSelectedFugitive}
            onCloseFugitive={() => setSelectedFugitive(null)}
            onOpenDossier={(f) => setDossierFugitive(f)}
            activeSubTab={fbiSubTab}
            onSubTabChange={setFbiSubTab}
            autoRotate={autoRotate}
            onToggleOrbit={() => setAutoRotate((r) => !r)}
            totalBountyValue={totalBountyValue}
            top10Count={top10Count}
            totalDatabaseCases={1254}
            onOpenInfoModal={() => setShowFbiDatasetModal(true)}
          />
        )}

        {/* FBI ALTERNATIVE VIEWS (Board / Game / Radar) */}
        {layerMode === "fbi" && fbiSubTab !== "globe" && (
          <div className="absolute inset-0 z-30 bg-neutral-950/95 overflow-y-auto p-4 sm:p-6 backdrop-blur-md">
            <div className="max-w-7xl mx-auto space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <button
                  onClick={() => setFbiSubTab("globe")}
                  className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold transition-all"
                >
                  ← Return to 3D Globe
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setFbiSubTab("board")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      fbiSubTab === "board" ? "bg-red-600 text-white" : "bg-neutral-900 text-neutral-400"
                    }`}
                  >
                    Bounty Board (1,254)
                  </button>
                  <button
                    onClick={() => setFbiSubTab("game")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      fbiSubTab === "game" ? "bg-red-600 text-white" : "bg-neutral-900 text-neutral-400"
                    }`}
                  >
                    Higher or Lower
                  </button>
                  <button
                    onClick={() => setFbiSubTab("radar")}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      fbiSubTab === "radar" ? "bg-red-600 text-white" : "bg-neutral-900 text-neutral-400"
                    }`}
                  >
                    Field Radar (56)
                  </button>
                </div>
              </div>

              {fbiSubTab === "board" && (
                <BountyBoard
                  fugitives={fugitives}
                  onSelectFugitive={handleLocateFugitive}
                />
              )}
              {fbiSubTab === "game" && <BountyGame fugitives={fugitives} />}
              {fbiSubTab === "radar" && (
                <FieldRadar
                  fugitives={fugitives}
                  onSelectFugitive={handleLocateFugitive}
                />
              )}
            </div>
          </div>
        )}

        {/* 🚨 LAYER 2: AUTHENTIC DISTRESS HUD OVERLAY */}
        {layerMode === "distress" && (
          <DistressHUD
            calls={distressCalls}
            activeCall={selectedDistressCall}
            onSelectCall={handleLocateCall}
            onCloseCall={() => setSelectedDistressCall(null)}
            soundOn={soundOn}
            onToggleSound={handleToggleSound}
            autoRotate={autoRotate}
            onToggleOrbit={() => setAutoRotate((r) => !r)}
            onFocusRegion={handleFocusRegion}
            sevFilter={sevFilter}
            onSevFilterChange={setSevFilter}
            kindFilter={kindFilter}
            onKindFilterChange={setKindFilter}
          />
        )}

        {/* ⚔️ LAYER 3: AUTHENTIC TRACER HUD OVERLAY */}
        {layerMode === "tracer" && (
          <TracerHUD
            conflicts={tracerConflicts}
            hotspots={tracerHotspots}
            activeHotspot={selectedTracerHotspot}
            onSelectHotspot={setSelectedTracerHotspot}
            onCloseHotspot={() => setSelectedTracerHotspot(null)}
            autoRotate={autoRotate}
            onToggleOrbit={() => setAutoRotate((r) => !r)}
            band={tracerBand}
            onBandChange={setTracerBand}
          />
        )}

        {/* 📻 LAYER 4: AUTHENTIC SKY DIAL RADIO HUD OVERLAY */}
        {layerMode === "radio" && (
          <SkyDialHUD
            mode="radio"
            stations={radioStations}
            channels={tvChannels}
            activeStation={selectedRadioStation}
            activeChannel={null}
            onSelectStation={handleLocateStation}
            onSelectChannel={() => {}}
            onCloseActive={() => setSelectedRadioStation(null)}
            autoRotate={autoRotate}
            onToggleOrbit={() => setAutoRotate((r) => !r)}
            onFocusCoordinates={(lat, lng) => setFocusPoint({ lat, lng })}
          />
        )}

        {/* 📺 LAYER 5: AUTHENTIC SKY DIAL TV & CCTV HUD OVERLAY */}
        {layerMode === "tv" && (
          <SkyDialHUD
            mode="tv"
            stations={radioStations}
            channels={tvChannels}
            activeStation={null}
            activeChannel={selectedTvChannel}
            onSelectStation={() => {}}
            onSelectChannel={handleLocateChannel}
            onCloseActive={() => setSelectedTvChannel(null)}
            autoRotate={autoRotate}
            onToggleOrbit={() => setAutoRotate((r) => !r)}
            onFocusCoordinates={(lat, lng) => setFocusPoint({ lat, lng })}
          />
        )}
      </div>

      {/* Classified Modal Dossier */}
      <FugitiveDossier
        fugitive={dossierFugitive}
        onClose={() => setDossierFugitive(null)}
        onLocateOnGlobe={handleLocateFugitive}
      />

      {/* Dataset Breakdown Modal (Explaining the 1,254 Cases vs 150 Bounties) */}
      {showFbiDatasetModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 max-w-lg w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-bold text-white uppercase tracking-wider">
                  FBI 1,254 Case Registry Breakdown
                </h3>
              </div>
              <button
                onClick={() => setShowFbiDatasetModal(false)}
                className="text-neutral-400 hover:text-white text-xs px-2 py-1 rounded bg-neutral-800"
              >
                Close ✕
              </button>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              The official FBI API contains <strong className="text-white">1,254 active postings</strong>. While many users expect all entries to be high-dollar fugitives, the federal database actually comprises multiple distinct classifications:
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex justify-between items-center">
                <div>
                  <span className="font-bold text-amber-400 block">Monetary Cash Bounties (~150 cases)</span>
                  <span className="text-[11px] text-neutral-400">Ten Most Wanted, Cyber, Counterintel ($5K to $25M)</span>
                </div>
                <span className="font-mono font-bold text-white">~150</span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex justify-between items-center">
                <div>
                  <span className="font-bold text-cyan-400 block">Seeking Information (600+ cases)</span>
                  <span className="text-[11px] text-neutral-400">Unidentified bank robbers, Capitol riot persons of interest</span>
                </div>
                <span className="font-mono font-bold text-white">600+</span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex justify-between items-center">
                <div>
                  <span className="font-bold text-rose-400 block">ViCAP & Missing Persons (400+ cases)</span>
                  <span className="text-[11px] text-neutral-400">Violent Criminal Apprehension Program cold cases (1970–2024)</span>
                </div>
                <span className="font-mono font-bold text-white">400+</span>
              </div>

              <div className="p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 flex justify-between items-center">
                <div>
                  <span className="font-bold text-purple-400 block">Indian Country / Tribal Cases (~100 cases)</span>
                  <span className="text-[11px] text-neutral-400">Jurisdictional reservation investigations & missing victims</span>
                </div>
                <span className="font-mono font-bold text-white">~100</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-500 italic">
              All 1,254 cases are fully accessible via the <strong>Bounty Board</strong> tab using the page navigator (Pages 1 through 26).
            </p>

            <button
              onClick={() => setShowFbiDatasetModal(false)}
              className="w-full py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition-all"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
