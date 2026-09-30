"use client";

import React, { useState, useEffect } from "react";
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
import BountyBoard from "@/components/BountyBoard";
import BountyGame from "@/components/BountyGame";
import FieldRadar from "@/components/FieldRadar";
import FugitiveDossier from "@/components/FugitiveDossier";
import DistressCADFeed from "@/components/DistressCADFeed";
import TracerConflicts from "@/components/TracerConflicts";
import RadioDirectory from "@/components/RadioDirectory";
import TvGuide from "@/components/TvGuide";
import {
  Globe,
  Grid,
  Gamepad2,
  Radio,
  Tv,
  Flame,
  ShieldAlert,
  Shield,
  RefreshCw,
  Info,
  ChevronRight,
  MapPin,
  Volume2,
} from "lucide-react";

export default function Home() {
  // Master Layer Mode
  const [layerMode, setLayerMode] = useState<GlobeLayerMode>("fbi");

  // Sub-tabs per mode
  const [fbiTab, setFbiTab] = useState<"globe" | "board" | "game" | "radar">("globe");
  const [distressTab, setDistressTab] = useState<"globe" | "feed">("globe");
  const [tracerTab, setTracerTab] = useState<"globe" | "conflicts">("globe");
  const [radioTab, setRadioTab] = useState<"globe" | "directory">("globe");
  const [tvTab, setTvTab] = useState<"globe" | "guide">("globe");

  // Datasets
  const [fugitives, setFugitives] = useState<Fugitive[]>([]);
  const [distressCalls, setDistressCalls] = useState<DistressCall[]>([]);
  const [tracerHotspots, setTracerHotspots] = useState<TracerHotspot[]>([]);
  const [tracerConflicts, setTracerConflicts] = useState<TracerConflict[]>([]);
  const [radioStations, setRadioStations] = useState<RadioStation[]>([]);
  const [tvChannels, setTvChannels] = useState<TvChannel[]>([]);

  // Selection states
  const [selectedFugitive, setSelectedFugitive] = useState<Fugitive | null>(null);
  const [selectedDistressCall, setSelectedDistressCall] = useState<DistressCall | null>(null);
  const [selectedRadioStation, setSelectedRadioStation] = useState<RadioStation | null>(null);
  const [selectedTvChannel, setSelectedTvChannel] = useState<TvChannel | null>(null);

  // Loading flags
  const [loadingFbi, setLoadingFbi] = useState(true);
  const [loadingDistress, setLoadingDistress] = useState(false);
  const [loadingTracer, setLoadingTracer] = useState(false);
  const [loadingRadio, setLoadingRadio] = useState(false);
  const [loadingTv, setLoadingTv] = useState(false);
  const [showFbiDatasetModal, setShowFbiDatasetModal] = useState(false);

  // 1. Initial Load: FBI Wanted Feed
  useEffect(() => {
    async function loadFbi() {
      try {
        setLoadingFbi(true);
        const res = await fetch("/api/wanted?pageSize=50");
        const data = await res.json();
        const initialItems: Fugitive[] = data.items || [];
        setFugitives(initialItems);

        // Background prefetch pages 2 and 3 to expand bounty pool
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
      } finally {
        setLoadingFbi(false);
      }
    }
    loadFbi();
  }, []);

  // 2. Pre-fetch / lazy-load datasets when layers are selected
  useEffect(() => {
    // Distress
    if ((layerMode === "distress" || distressCalls.length === 0) && !loadingDistress) {
      setLoadingDistress(true);
      fetch("/api/distress")
        .then((r) => r.json())
        .then((data) => {
          if (data.calls && Array.isArray(data.calls)) {
            setDistressCalls(data.calls);
          }
        })
        .catch((err) => console.error("Distress fetch error:", err))
        .finally(() => setLoadingDistress(false));
    }
  }, [layerMode]);

  useEffect(() => {
    // Tracer
    if (layerMode === "tracer" && tracerHotspots.length === 0 && !loadingTracer) {
      setLoadingTracer(true);
      Promise.all([
        fetch("/data/tracer-hotspots.json").then((r) => r.json()),
        fetch("/data/tracer-conflicts.json").then((r) => r.json()),
      ])
        .then(([hotspotData, conflictData]) => {
          if (hotspotData?.hotspots) setTracerHotspots(hotspotData.hotspots);
          if (conflictData?.conflicts) setTracerConflicts(conflictData.conflicts);
        })
        .catch((err) => console.error("Tracer data load error:", err))
        .finally(() => setLoadingTracer(false));
    }
  }, [layerMode, tracerHotspots.length]);

  useEffect(() => {
    // Radio
    if (layerMode === "radio" && radioStations.length === 0 && !loadingRadio) {
      setLoadingRadio(true);
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
        .catch((err) => console.error("Radio data load error:", err))
        .finally(() => setLoadingRadio(false));
    }
  }, [layerMode, radioStations.length]);

  useEffect(() => {
    // TV
    if (layerMode === "tv" && tvChannels.length === 0 && !loadingTv) {
      setLoadingTv(true);
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
        .catch((err) => console.error("TV data load error:", err))
        .finally(() => setLoadingTv(false));
    }
  }, [layerMode, tvChannels.length]);

  // Telemetry metric computations
  const totalBountyValue = React.useMemo(() => {
    return fugitives.reduce((acc, f) => acc + f.reward_amount, 0);
  }, [fugitives]);

  const top10Count = React.useMemo(() => {
    return fugitives.filter((f) => f.poster_classification === "ten").length;
  }, [fugitives]);

  const totalConflictsFatalities = React.useMemo(() => {
    return tracerConflicts.reduce((acc, c) => acc + (c.deaths || 0), 0);
  }, [tracerConflicts]);

  const handleLocateFugitive = (fugitive: Fugitive) => {
    setSelectedFugitive(fugitive);
    setLayerMode("fbi");
    setFbiTab("globe");
  };

  const handleLocateCall = (call: DistressCall) => {
    setSelectedDistressCall(call);
    setLayerMode("distress");
    setDistressTab("globe");
  };

  const handleLocateStation = (station: RadioStation) => {
    setSelectedRadioStation(station);
    setLayerMode("radio");
    setRadioTab("globe");
  };

  const handleLocateChannel = (channel: TvChannel) => {
    setSelectedTvChannel(channel);
    setLayerMode("tv");
    setTvTab("globe");
  };

  return (
    <div className="min-h-screen bg-[#07080a] text-neutral-100 font-mono flex flex-col selection:bg-red-500 selection:text-white">
      {/* Top Banner Navigation Header */}
      <header className="border-b border-neutral-800 bg-neutral-950/85 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-white transition-all shadow-lg ${
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
              {layerMode === "fbi" && <Shield className="w-5 h-5" />}
              {layerMode === "distress" && <ShieldAlert className="w-5 h-5" />}
              {layerMode === "tracer" && <Flame className="w-5 h-5" />}
              {layerMode === "radio" && <Radio className="w-5 h-5" />}
              {layerMode === "tv" && <Tv className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-300 border border-neutral-700">
                  OMNI-GLOBE PLATFORM
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] text-neutral-400">REAL-TIME FEEDS</span>
              </div>
              <h1 className="text-base md:text-lg font-black text-white tracking-wider uppercase">
                Global Surveillance & Broadcast Matrix
              </h1>
            </div>
          </div>

          {/* Master Layer Mode Pill Switcher */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            <button
              onClick={() => setLayerMode("fbi")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                layerMode === "fbi"
                  ? "bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/30"
                  : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>FBI Wanted</span>
            </button>

            <button
              onClick={() => setLayerMode("distress")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                layerMode === "distress"
                  ? "bg-cyan-600 text-white border-cyan-500 shadow-lg shadow-cyan-600/30"
                  : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Distress 911</span>
            </button>

            <button
              onClick={() => setLayerMode("tracer")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                layerMode === "tracer"
                  ? "bg-rose-600 text-white border-rose-500 shadow-lg shadow-rose-600/30"
                  : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Tracer War</span>
            </button>

            <button
              onClick={() => setLayerMode("radio")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                layerMode === "radio"
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-600/30"
                  : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Sky Dial Radio</span>
            </button>

            <button
              onClick={() => setLayerMode("tv")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                layerMode === "tv"
                  ? "bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-600/30"
                  : "bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white"
              }`}
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Sky Dial TV</span>
            </button>
          </div>

          {/* Dynamic Metrics Ticker */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {layerMode === "fbi" && (
              <>
                <div className="bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[10px] text-neutral-500 uppercase block">Active Bounties</span>
                  <span className="font-bold text-amber-400">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      maximumFractionDigits: 0,
                    }).format(totalBountyValue)}
                  </span>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[10px] text-neutral-500 uppercase block">Top 10 Wanted</span>
                  <span className="font-bold text-red-400">{top10Count || 10} Priority</span>
                </div>
                <button
                  onClick={() => setShowFbiDatasetModal(true)}
                  className="bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 px-2.5 py-1.5 rounded-xl text-left transition-all"
                  title="Click to view breakdown of all 1,254 FBI cases"
                >
                  <span className="text-[10px] text-cyan-400 uppercase flex items-center gap-1">
                    Federal Registry <Info className="w-3 h-3" />
                  </span>
                  <span className="font-bold text-white">1,254 Cases</span>
                </button>
              </>
            )}

            {layerMode === "distress" && (
              <>
                <div className="bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[10px] text-neutral-500 uppercase block">Live CAD Calls</span>
                  <span className="font-bold text-cyan-400">
                    {distressCalls.length > 0 ? distressCalls.length.toLocaleString() : "23,398"} Calls
                  </span>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[10px] text-neutral-500 uppercase block">Monitored Feeds</span>
                  <span className="font-bold text-emerald-400">120 CAD Feeds</span>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-xl hidden sm:block">
                  <span className="text-[10px] text-neutral-500 uppercase block">State Coverage</span>
                  <span className="font-bold text-amber-400">38 US States</span>
                </div>
              </>
            )}

            {layerMode === "tracer" && (
              <>
                <div className="bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[10px] text-neutral-500 uppercase block">Combat Clusters</span>
                  <span className="font-bold text-rose-500">400 Hotspots</span>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[10px] text-neutral-500 uppercase block">Fatalities Recorded</span>
                  <span className="font-bold text-red-400">
                    {totalConflictsFatalities > 0 ? totalConflictsFatalities.toLocaleString() : "135,565+"}
                  </span>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-xl hidden sm:block">
                  <span className="text-[10px] text-neutral-500 uppercase block">Data Source</span>
                  <span className="font-bold text-cyan-400">UCDP Satellite</span>
                </div>
              </>
            )}

            {layerMode === "radio" && (
              <>
                <div className="bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[10px] text-neutral-500 uppercase block">World Stations</span>
                  <span className="font-bold text-emerald-400">7,959 Tuned</span>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[10px] text-neutral-500 uppercase block">Sovereign Nations</span>
                  <span className="font-bold text-white">190+ Countries</span>
                </div>
              </>
            )}

            {layerMode === "tv" && (
              <>
                <div className="bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[10px] text-neutral-500 uppercase block">Live Broadcasts</span>
                  <span className="font-bold text-purple-400">2,105 Feeds</span>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 px-2.5 py-1.5 rounded-xl">
                  <span className="text-[10px] text-neutral-500 uppercase block">Feed Types</span>
                  <span className="font-bold text-cyan-400">IPTV & Cams</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Layer Sub-Navigation Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-2 overflow-x-auto py-2 border-t border-neutral-900">
          {layerMode === "fbi" && (
            <>
              <button
                onClick={() => setFbiTab("globe")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  fbiTab === "globe"
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>3D Tactical Globe</span>
              </button>
              <button
                onClick={() => setFbiTab("board")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  fbiTab === "board"
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <Grid className="w-4 h-4" />
                <span>Bounty Board (1,254 Cases)</span>
              </button>
              <button
                onClick={() => setFbiTab("game")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  fbiTab === "game"
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <Gamepad2 className="w-4 h-4" />
                <span>Higher or Lower</span>
              </button>
              <button
                onClick={() => setFbiTab("radar")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  fbiTab === "radar"
                    ? "bg-red-600 text-white shadow-lg shadow-red-600/30"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>Field Radar (56 Offices)</span>
              </button>
            </>
          )}

          {layerMode === "distress" && (
            <>
              <button
                onClick={() => setDistressTab("globe")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  distressTab === "globe"
                    ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>3D Emergency Radar</span>
              </button>
              <button
                onClick={() => setDistressTab("feed")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  distressTab === "feed"
                    ? "bg-cyan-600 text-white shadow-lg shadow-cyan-600/30"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Live CAD Incident Feed</span>
              </button>
            </>
          )}

          {layerMode === "tracer" && (
            <>
              <button
                onClick={() => setTracerTab("globe")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  tracerTab === "globe"
                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>3D War Theater Globe</span>
              </button>
              <button
                onClick={() => setTracerTab("conflicts")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  tracerTab === "conflicts"
                    ? "bg-rose-600 text-white shadow-lg shadow-rose-600/30"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <Flame className="w-4 h-4" />
                <span>UCDP Conflict Intelligence</span>
              </button>
            </>
          )}

          {layerMode === "radio" && (
            <>
              <button
                onClick={() => setRadioTab("globe")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  radioTab === "globe"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>3D Radio Frequency Globe</span>
              </button>
              <button
                onClick={() => setRadioTab("directory")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  radioTab === "directory"
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>World Station Directory</span>
              </button>
            </>
          )}

          {layerMode === "tv" && (
            <>
              <button
                onClick={() => setTvTab("globe")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  tvTab === "globe"
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>3D Broadcast Satellite Globe</span>
              </button>
              <button
                onClick={() => setTvTab("guide")}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  tvTab === "guide"
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900"
                }`}
              >
                <Tv className="w-4 h-4" />
                <span>Broadcast Guide & Webcams</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Viewport Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        {/* Layer Mode 1: FBI Most Wanted */}
        {layerMode === "fbi" && (
          <>
            {fbiTab === "globe" && (
              <div className="space-y-4">
                <div className="text-center max-w-2xl mx-auto space-y-1">
                  <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">
                    Global Crime & Escape Coordinates
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Pinpointing federal crime origin field offices against suspected international escape havens (Athens, Honduras, Mexico, India).
                  </p>
                </div>
                <TacticalGlobe
                  activeMode="fbi"
                  fugitives={fugitives}
                  distressCalls={distressCalls}
                  tracerHotspots={tracerHotspots}
                  radioStations={radioStations}
                  tvChannels={tvChannels}
                  onSelectFugitive={setSelectedFugitive}
                  selectedFugitive={selectedFugitive}
                />
              </div>
            )}

            {fbiTab === "board" && (
              <BountyBoard
                fugitives={fugitives}
                onSelectFugitive={handleLocateFugitive}
              />
            )}

            {fbiTab === "game" && <BountyGame fugitives={fugitives} />}

            {fbiTab === "radar" && (
              <FieldRadar
                fugitives={fugitives}
                onSelectFugitive={handleLocateFugitive}
              />
            )}
          </>
        )}

        {/* Layer Mode 2: Distress 911 CAD */}
        {layerMode === "distress" && (
          <>
            {distressTab === "globe" && (
              <div className="space-y-4">
                <div className="text-center max-w-2xl mx-auto space-y-1">
                  <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">
                    Live 911 CAD Emergency Feeds
                  </h2>
                  <p className="text-xs text-neutral-400">
                    Active Computer-Aided Dispatch emergency calls from 120 police, fire, and rescue feeds across 38 states with WebAudio telemetry synthesizer.
                  </p>
                </div>
                <TacticalGlobe
                  activeMode="distress"
                  fugitives={fugitives}
                  distressCalls={distressCalls}
                  tracerHotspots={tracerHotspots}
                  radioStations={radioStations}
                  tvChannels={tvChannels}
                  onSelectDistressCall={setSelectedDistressCall}
                />
              </div>
            )}

            {distressTab === "feed" && (
              <DistressCADFeed
                calls={distressCalls}
                onSelectCall={handleLocateCall}
              />
            )}
          </>
        )}

        {/* Layer Mode 3: Tracer War Conflicts */}
        {layerMode === "tracer" && (
          <>
            {tracerTab === "globe" && (
              <div className="space-y-4">
                <div className="text-center max-w-2xl mx-auto space-y-1">
                  <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">
                    UCDP Armed Conflicts & Hotspots
                  </h2>
                  <p className="text-xs text-neutral-400">
                    400 active conflict clusters, state warfare, and cartel clash zones mapped with satellite casualty tracking.
                  </p>
                </div>
                <TacticalGlobe
                  activeMode="tracer"
                  fugitives={fugitives}
                  distressCalls={distressCalls}
                  tracerHotspots={tracerHotspots}
                  radioStations={radioStations}
                  tvChannels={tvChannels}
                />
              </div>
            )}

            {tracerTab === "conflicts" && (
              <TracerConflicts
                conflicts={tracerConflicts}
                hotspots={tracerHotspots}
              />
            )}
          </>
        )}

        {/* Layer Mode 4: Sky Dial Radio */}
        {layerMode === "radio" && (
          <>
            {radioTab === "globe" && (
              <div className="space-y-4">
                <div className="text-center max-w-2xl mx-auto space-y-1">
                  <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">
                    Sky Dial World Radio Tuner
                  </h2>
                  <p className="text-xs text-neutral-400">
                    7,959 live streaming world radio transmitters across 190+ countries. Click any station or transmitter dot to listen live.
                  </p>
                </div>
                <TacticalGlobe
                  activeMode="radio"
                  fugitives={fugitives}
                  distressCalls={distressCalls}
                  tracerHotspots={tracerHotspots}
                  radioStations={radioStations}
                  tvChannels={tvChannels}
                  onSelectRadioStation={setSelectedRadioStation}
                  selectedRadioStation={selectedRadioStation}
                />
              </div>
            )}

            {radioTab === "directory" && (
              <RadioDirectory
                stations={radioStations}
                onSelectStation={handleLocateStation}
                activeStation={selectedRadioStation}
              />
            )}
          </>
        )}

        {/* Layer Mode 5: Sky Dial TV */}
        {layerMode === "tv" && (
          <>
            {tvTab === "globe" && (
              <div className="space-y-4">
                <div className="text-center max-w-2xl mx-auto space-y-1">
                  <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider">
                    Sky Dial TV Broadcasts & Webcams
                  </h2>
                  <p className="text-xs text-neutral-400">
                    2,105 live television feeds and public city webcams plotted at their origin coordinates across Earth.
                  </p>
                </div>
                <TacticalGlobe
                  activeMode="tv"
                  fugitives={fugitives}
                  distressCalls={distressCalls}
                  tracerHotspots={tracerHotspots}
                  radioStations={radioStations}
                  tvChannels={tvChannels}
                  onSelectTvChannel={setSelectedTvChannel}
                  selectedTvChannel={selectedTvChannel}
                />
              </div>
            )}

            {tvTab === "guide" && (
              <TvGuide
                channels={tvChannels}
                onSelectChannel={handleLocateChannel}
                activeChannel={selectedTvChannel}
              />
            )}
          </>
        )}
      </main>

      {/* Classified Modal Dossier */}
      <FugitiveDossier
        fugitive={selectedFugitive}
        onClose={() => setSelectedFugitive(null)}
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

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-center text-xs text-neutral-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-3">
          <p>
            Omni-Globe combines feeds from the{" "}
            <a
              href="https://www.fbi.gov/wanted/api"
              target="_blank"
              rel="noreferrer"
              className="text-red-400 hover:underline"
            >
              FBI Wanted API
            </a>
            , Distress CAD, UCDP Conflict Data, and Sky Dial Radio/TV.
          </p>
          <p className="text-[11px] text-neutral-600">
            Unified Multi-Layer Next.js Architecture • Natural Earth Vector Coastlines
          </p>
        </div>
      </footer>
    </div>
  );
}
