"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { RadioStation } from "@/lib/types";
import { playTunerClick, playStaticBurst, playStationLockTone } from "@/lib/sound";
import {
  Radio,
  Play,
  Square,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  X,
  MapPin,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Music,
  Disc3,
} from "lucide-react";

interface RadioTunerDeckProps {
  stations: RadioStation[];
  activeStation: RadioStation | null;
  onSelectStation: (station: RadioStation) => void;
  onClose: () => void;
  onFocusCoordinates?: (lat: number, lng: number) => void;
}

const GENRE_PRESETS = [
  { id: "music_all", label: "ALL MUSIC" },
  { id: "pop", label: "POP & HITS" },
  { id: "rock", label: "ROCK" },
  { id: "jazz", label: "JAZZ & BLUES" },
  { id: "electronic", label: "ELECTRONIC" },
  { id: "dance", label: "DANCE" },
  { id: "classical", label: "CLASSICAL" },
  { id: "all", label: "EVERYTHING" },
];

export default function RadioTunerDeck({
  stations,
  activeStation,
  onSelectStation,
  onClose,
  onFocusCoordinates,
}: RadioTunerDeckProps) {
  // Seek State
  const [isSeeking, setIsSeeking] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState("music_all");
  const [isMuted, setIsMuted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [powerOn, setPowerOn] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [needlePos, setNeedlePos] = useState(50); // 0 to 100% across the dial scale
  const [frequencyMhz, setFrequencyMhz] = useState("101.5");
  const [signalStrength, setSignalStrength] = useState(92);
  const [vuLeft, setVuLeft] = useState(45);
  const [vuRight, setVuRight] = useState(48);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const seekTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Filter music stations
  const filteredStations = useMemo(() => {
    if (!stations.length) return [];
    if (selectedGenre === "all") return stations;

    const musicKeywords =
      selectedGenre === "music_all"
        ? ["music", "fm", "hits", "radio", "rock", "pop", "jazz", "dance", "beat", "wave", "classical"]
        : selectedGenre === "pop"
        ? ["pop", "hits", "top", "chart"]
        : selectedGenre === "rock"
        ? ["rock", "metal", "guitar", "classic rock"]
        : selectedGenre === "jazz"
        ? ["jazz", "blues", "lounge", "smooth"]
        : selectedGenre === "electronic"
        ? ["electronic", "techno", "trance", "house", "club", "edm"]
        : selectedGenre === "dance"
        ? ["dance", "disco", "club", "groove"]
        : selectedGenre === "classical"
        ? ["classic", "orchestra", "symphony", "baroque"]
        : ["music"];

    return stations.filter((s) => {
      const lower = s.name.toLowerCase();
      return musicKeywords.some((kw) => lower.includes(kw));
    });
  }, [stations, selectedGenre]);

  // Set initial station if none active
  useEffect(() => {
    if (!activeStation && filteredStations.length > 0) {
      const initial = filteredStations[0];
      onSelectStation(initial);
      calculateFrequency(initial);
      if (onFocusCoordinates) onFocusCoordinates(initial.lat, initial.lon);
    }
  }, [activeStation, filteredStations, onSelectStation, onFocusCoordinates]);

  // Compute virtual FM frequency (88.0 - 108.0 MHz) and dial needle position based on station
  const calculateFrequency = (station: RadioStation) => {
    // Generate pseudo-deterministic frequency from station name + coordinates
    let hash = 0;
    for (let i = 0; i < station.name.length; i++) {
      hash = (hash << 5) - hash + station.name.charCodeAt(i);
      hash |= 0;
    }
    const normalized = Math.abs(hash % 1000) / 1000;
    const mhz = (88.1 + normalized * 19.8).toFixed(1);
    const needle = Math.round(normalized * 100);
    setFrequencyMhz(mhz);
    setNeedlePos(needle);
    setSignalStrength(Math.floor(82 + Math.random() * 17));
  };

  // Synchronize audio volume and playback
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Animated VU Meters when audio is playing
  useEffect(() => {
    if (!powerOn || !activeStation) return;
    const interval = setInterval(() => {
      const base = isSeeking ? 15 : isMuted ? 0 : Math.floor(40 + Math.random() * 45);
      setVuLeft(Math.min(95, Math.max(10, base + (Math.random() * 15 - 7))));
      setVuRight(Math.min(95, Math.max(10, base + (Math.random() * 15 - 7))));
    }, 150);
    return () => clearInterval(interval);
  }, [powerOn, activeStation, isSeeking, isMuted]);

  // Hop to station with analog audio static transition
  const tuneToStation = useCallback(
    (target: RadioStation) => {
      playTunerClick();
      playStaticBurst(260);

      calculateFrequency(target);
      onSelectStation(target);
      if (onFocusCoordinates) onFocusCoordinates(target.lat, target.lon);
    },
    [onSelectStation, onFocusCoordinates]
  );

  // Manual Station Steppers
  const handleNext = () => {
    if (!filteredStations.length) return;
    const currentIndex = activeStation
      ? filteredStations.findIndex((s) => s.id === activeStation.id)
      : -1;
    const nextIndex = (currentIndex + 1) % filteredStations.length;
    tuneToStation(filteredStations[nextIndex]);
  };

  const handlePrev = () => {
    if (!filteredStations.length) return;
    const currentIndex = activeStation
      ? filteredStations.findIndex((s) => s.id === activeStation.id)
      : -1;
    const prevIndex = (currentIndex - 1 + filteredStations.length) % filteredStations.length;
    tuneToStation(filteredStations[prevIndex]);
  };

  // Continuous Auto-Seek Music Engine
  useEffect(() => {
    if (!isSeeking || !filteredStations.length) {
      if (seekTimerRef.current) clearInterval(seekTimerRef.current);
      return;
    }

    const interval = setInterval(() => {
      const randIdx = Math.floor(Math.random() * filteredStations.length);
      tuneToStation(filteredStations[randIdx]);
    }, 4500);

    seekTimerRef.current = interval;
    return () => clearInterval(interval);
  }, [isSeeking, filteredStations, tuneToStation]);

  const handleToggleSeek = () => {
    if (isSeeking) {
      setIsSeeking(false);
      playStationLockTone();
    } else {
      setIsSeeking(true);
      handleNext();
    }
  };

  if (!powerOn) {
    return (
      <div className="pointer-events-auto absolute bottom-4 left-4 z-40 font-mono">
        <button
          onClick={() => {
            setPowerOn(true);
            playTunerClick();
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-white text-xs font-bold shadow-2xl hover:bg-neutral-800 transition-all"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
          <span>POWER ON RADIO TUNER</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-auto absolute z-40 transition-all duration-300 font-mono select-none ${
        isMinimized
          ? "bottom-4 left-4 w-72"
          : "bottom-4 left-4 w-[440px] sm:w-[500px] max-w-[calc(100vw-32px)]"
      }`}
    >
      {/* VINTAGE BRUSHED ALUMINUM HI-FI RACK CHASSIS */}
      <div className="relative bg-gradient-to-b from-[#242930] to-[#15191f] rounded-3xl p-3 sm:p-4 border-4 border-[#3a424e] shadow-[0_20px_60px_rgba(0,0,0,0.85),inset_0_2px_4px_rgba(255,255,255,0.2)] flex flex-col gap-3">
        {/* TOP BRAND BAR */}
        <div className="flex items-center justify-between px-1 border-b border-[#38414e] pb-2 text-[#9da8b8]">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSeeking
                  ? "bg-amber-400 shadow-[0_0_10px_#f59e0b] animate-ping"
                  : "bg-emerald-400 shadow-[0_0_10px_#10b981]"
              }`}
            />
            <span className="text-[11px] font-black tracking-widest uppercase text-[#e1e7f0]">
              MARANTZ SOLID-STATE • WORLD RADIO TUNER
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsMinimized((m) => !m)}
              className="text-[#8895a7] hover:text-white p-1 rounded"
              title={isMinimized ? "Maximize tuner" : "Minimize tuner"}
            >
              {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="text-[#8895a7] hover:text-white p-1 rounded"
              title="Close Radio HUD"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* BACKLIT ANALOG FREQUENCY DIAL & VU METERS */}
        {!isMinimized && (
          <div className="relative bg-[#0c1015] rounded-2xl p-3 border-2 border-[#2b333e] shadow-[inset_0_0_20px_rgba(0,0,0,0.9)] flex flex-col gap-3">
            {/* ANALOG DIAL SCALE WINDOW WITH ILLUMINATED NEEDLE */}
            <div className="relative h-14 bg-gradient-to-b from-[#101924] to-[#070b10] rounded-xl overflow-hidden border border-[#2b3542] px-3 flex flex-col justify-between py-1.5 shadow-[inset_0_0_12px_rgba(0,0,0,0.8)]">
              {/* FM Scale Markings */}
              <div className="flex justify-between items-center text-[10px] font-bold text-amber-300/80 tracking-wider">
                <span>88</span>
                <span>92</span>
                <span>96</span>
                <span>100</span>
                <span>104</span>
                <span>108</span>
                <span className="text-[9px] text-amber-500 font-black">MHz FM</span>
              </div>

              {/* Dial Scale Tick Marks */}
              <div className="relative w-full h-2 flex items-center justify-between opacity-60">
                {Array.from({ length: 33 }).map((_, i) => (
                  <div
                    key={i}
                    className={`w-[1px] bg-amber-400 ${i % 4 === 0 ? "h-2.5" : "h-1.5"}`}
                  />
                ))}
              </div>

              {/* AM Scale Markings */}
              <div className="flex justify-between items-center text-[9px] font-medium text-emerald-400/70 tracking-wider">
                <span>530</span>
                <span>700</span>
                <span>900</span>
                <span>1100</span>
                <span>1400</span>
                <span>1700</span>
                <span className="text-[8px] text-emerald-500 font-black">kHz AM</span>
              </div>

              {/* MOVING PHYSICAL ILLUMINATED NEEDLE */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-red-500 shadow-[0_0_8px_#ef4444,0_0_2px_#ffffff] transition-all duration-300 pointer-events-none"
                style={{ left: `${Math.max(2, Math.min(98, needlePos))}%` }}
              >
                <div className="w-2 h-2 -ml-[3px] bg-red-400 rounded-full shadow-[0_0_6px_#ef4444]" />
              </div>
            </div>

            {/* DUAL ANALOG VU METERS & VFD READOUT */}
            <div className="grid grid-cols-12 gap-2.5 items-center">
              {/* VFD DIGITAL READOUT (7 Cols) */}
              <div className="col-span-7 bg-[#050e11] border border-[#0d2a33] rounded-xl p-2.5 text-[#2ef3c8] shadow-[inset_0_0_10px_rgba(0,0,0,0.8),0_0_8px_rgba(46,243,200,0.15)] flex flex-col justify-between h-20">
                <div className="flex items-center justify-between text-[11px] font-black tracking-widest border-b border-[#0d3b47] pb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1 py-0.2 rounded bg-[#0b3842] text-white text-[9px]">
                      FM
                    </span>
                    <span>{frequencyMhz} MHz</span>
                  </div>
                  <span className="text-[10px] text-[#ff3366] font-bold">● STEREO</span>
                </div>
                <div className="text-xs font-bold text-white truncate py-0.5">
                  {isSeeking ? (
                    <span className="text-amber-400 animate-pulse">&gt;&gt;&gt; SCANNING MUSIC AIRWAVES...</span>
                  ) : (
                    activeStation?.name || "Tuning station..."
                  )}
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#71cfc1]">
                  <span>{activeStation?.cc || "GLOBAL"} • LIVE STREAM</span>
                  <span>SIGNAL: {signalStrength}%</span>
                </div>
              </div>

              {/* DUAL ANALOG VU METERS (5 Cols) */}
              <div className="col-span-5 bg-[#12161c] border border-[#2b333e] rounded-xl p-2 h-20 flex flex-col justify-between">
                <div className="flex justify-between items-center text-[9px] font-bold text-neutral-400">
                  <span>CH-L</span>
                  <span>VU LEVEL</span>
                  <span>CH-R</span>
                </div>
                {/* Meter Bars */}
                <div className="space-y-1.5">
                  <div className="h-2 bg-neutral-900 rounded-full overflow-hidden flex border border-neutral-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-100"
                      style={{ width: `${vuLeft}%` }}
                    />
                  </div>
                  <div className="h-2 bg-neutral-900 rounded-full overflow-hidden flex border border-neutral-800">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 transition-all duration-100"
                      style={{ width: `${vuRight}%` }}
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center text-[8px] text-neutral-500">
                  <span>-20dB</span>
                  <span>0dB</span>
                  <span>+3dB</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* GENRE SELECTOR PILLS */}
        <div className="bg-[#12161c] rounded-2xl p-2 border border-[#2e3744] flex flex-col gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px]">
            {GENRE_PRESETS.map((genre) => (
              <button
                key={genre.id}
                onClick={() => {
                  setSelectedGenre(genre.id);
                  playTunerClick();
                }}
                className={`px-2.5 py-1 rounded-lg font-bold uppercase transition-all whitespace-nowrap flex items-center gap-1 ${
                  selectedGenre === genre.id
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/50"
                    : "bg-[#1c222b] text-[#8895a7] hover:text-[#e1e7f0]"
                }`}
              >
                <Music className="w-3 h-3" />
                <span>{genre.label}</span>
              </button>
            ))}
          </div>

          {/* MAIN SEEK & AUDIO CONTROLS ROW */}
          <div className="flex items-center justify-between gap-3 pt-1 border-t border-[#222a35]">
            {/* BIG "SEEK MUSIC" / "STOP SEEK" BUTTON */}
            <button
              onClick={handleToggleSeek}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-black text-xs tracking-wider transition-all shadow-lg active:scale-95 ${
                isSeeking
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/50 animate-pulse border border-rose-400"
                  : "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-900/40 border border-emerald-300"
              }`}
            >
              {isSeeking ? (
                <>
                  <Square className="w-4 h-4 fill-current" />
                  <span>STOP SEEK</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>SEEK MUSIC</span>
                </>
              )}
            </button>

            {/* MANUAL TUNING STEPPERS */}
            <div className="flex items-center gap-1 bg-[#1a212b] p-1 rounded-xl border border-[#313c4a]">
              <button
                onClick={handlePrev}
                disabled={isSeeking}
                title="Tune Down"
                className="p-1.5 rounded-lg text-[#9da8b8] hover:text-white hover:bg-[#2b3542] disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-[11px] font-black text-[#e1e7f0] px-2">TUNE</span>
              <button
                onClick={handleNext}
                disabled={isSeeking}
                title="Tune Up"
                className="p-1.5 rounded-lg text-[#9da8b8] hover:text-white hover:bg-[#2b3542] disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* VOLUME & MUTE CONTROLS */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  setIsMuted((m) => !m);
                  playTunerClick();
                }}
                className={`p-2 rounded-xl border text-xs transition-all ${
                  isMuted
                    ? "bg-red-500/20 border-red-500/40 text-red-400"
                    : "bg-[#1a212b] border-[#313c4a] text-[#9da8b8] hover:text-white"
                }`}
                title={isMuted ? "Unmute audio" : "Mute audio"}
              >
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* HIDDEN / EMBEDDED HTML5 AUDIO STREAM PLAYER */}
        {activeStation?.url && (
          <audio
            ref={audioRef}
            src={activeStation.url}
            autoPlay
            playsInline
            onError={() => {
              if (isSeeking) handleNext();
            }}
          />
        )}
      </div>
    </div>
  );
}
