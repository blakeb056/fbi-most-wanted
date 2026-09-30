"use client";

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DistressCall, DistressApiResponse, DistressSource } from "@/lib/types";
import { SEV_COLOR, SEV_LABEL } from "@/lib/severity";
import { blip, disable as muteSound, enable as enableSound, isEnabled as isAudioEnabled } from "@/lib/sound";
import * as watchlog from "@/lib/watchlog";

const POLL_MS = 20_000;
const SWEEP_MS = 340; // how often the stream releases incidents
const SWEEP_BATCH = 2; // fresh rows pushed to the wire per tick
const HEAT_BATCH = 4; // extra incidents lit for the swell per tick
const CITY_COOLDOWN_MS = 4_000; // don't re-light the same city this often
const SCAN_LIMIT = 220; // how far down the stream to look for a quieter city
const STREAM_WINDOW_H = 6; // the wire only carries the last N hours
const STREAM_POOL_MAX = 700; // ...and at most this many, freshest first
const WIRE_MAX = 60; // rows kept on the live wire
const ARRIVAL_MAX_AGE_MS = 3 * 3600_000; // older than this is backfill, not an arrival
const INITIAL_REVEAL_DELAY_MS = 700;
const INITIAL_REVEAL_MIN_WAVES = 18;
const INITIAL_REVEAL_MAX_WAVES = 52;
const INITIAL_REVEAL_CALLS_PER_WAVE = 450;
const INITIAL_PULSE_LIMIT = 80;
const INITIAL_PULSE_PER_WAVE = 42;
const HEAT_LIFE = 19_000;
const HEAT_PRUNE_MS = 3_000;
const HEAT_SAMPLE_LIMIT = 46;
const HEAT_MAX_EVENTS = 420;

const KINDS = [
  { id: "police", label: "Police" },
  { id: "crime", label: "Crime" },
  { id: "fire", label: "Fire / EMS" },
  { id: "traffic", label: "Traffic" },
];

const REGION_VIEWS: Record<string, { lat: number; lng: number }> = {
  US: { lat: 39.5, lng: -96 },
  UK: { lat: 53.2, lng: -2.4 },
  World: { lat: 25, lng: 0 },
};

function ago(iso: string | null | undefined): string {
  if (!iso) return "—";
  const secs = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!Number.isFinite(secs)) return "—";
  if (secs < 0) return "now";
  if (secs < 90) return `${Math.round(secs)}s ago`;
  if (secs < 5400) return `${Math.round(secs / 60)}m ago`;
  if (secs < 172800) return `${Math.round(secs / 3600)}h ago`;
  return `${Math.round(secs / 86400)}d ago`;
}

function agencyOf(call: DistressCall | null, sources: DistressSource[] | undefined): string {
  if (call?.agency) return call.agency;
  const hit = (sources || []).find((s) => s.id === call?.src);
  return hit?.agency || call?.city || "";
}

const panelStyle: React.CSSProperties = {
  background: "rgba(18, 26, 48, 0.88)",
  border: "1px solid #223055",
  borderRadius: 14,
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
  boxShadow: "0 10px 40px rgba(0, 0, 0, 0.45)",
};

function spreadInitialCalls(calls: DistressCall[]): DistressCall[] {
  const buckets = new Map<string, DistressCall[]>();
  for (const call of calls) {
    const key = `${call.state || "?"}:${call.src || call.city || "?"}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(call);
  }

  const keys = [...buckets.keys()].sort((a, b) => {
    const sizeDelta = (buckets.get(b)?.length || 0) - (buckets.get(a)?.length || 0);
    return sizeDelta || a.localeCompare(b);
  });

  const out: DistressCall[] = [];
  while (keys.length) {
    for (let i = keys.length - 1; i >= 0; i--) {
      const bucket = buckets.get(keys[i]);
      const next = bucket?.shift();
      if (next) out.push(next);
      if (!bucket?.length) keys.splice(i, 1);
    }
  }
  return out;
}

function pulseSample(calls: DistressCall[], max = INITIAL_PULSE_LIMIT): DistressCall[] {
  if (calls.length <= max) return calls;
  const out: DistressCall[] = [];
  const step = calls.length / max;
  for (let i = 0; i < max; i++) out.push(calls[Math.floor(i * step)]);
  return out.filter(Boolean);
}

// -------------------------------------------------------------
// INCOMING TICKER COMPONENT
// -------------------------------------------------------------
const Ticker = memo(function Ticker({
  className,
  collapsed,
  streaming,
  items,
  freshIds,
  selectedId,
  onPick,
  onToggle,
  updatedAt,
}: {
  className?: string;
  collapsed: boolean;
  streaming: boolean;
  items: DistressCall[];
  freshIds: Set<string>;
  selectedId?: string | null;
  onPick: (c: DistressCall) => void;
  onToggle: () => void;
  updatedAt?: string;
}) {
  if (collapsed) {
    return (
      <button
        className={`${className || ""} dg-ticker-handle`}
        onClick={onToggle}
        title="Show incoming calls"
        aria-label="Show incoming calls"
        style={{
          position: "absolute",
          left: 16,
          bottom: 16,
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 12px",
          color: "#e8ecf7",
          cursor: "pointer",
          fontSize: 11,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          pointerEvents: "auto",
          zIndex: 40,
          ...panelStyle,
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#35d0ff",
            boxShadow: "0 0 10px #35d0ff",
            animation: "dgPulse 1.6s ease-in-out infinite",
          }}
        />
        Incoming
      </button>
    );
  }

  return (
    <div
      className={className}
      style={{
        position: "absolute",
        left: 16,
        bottom: 16,
        width: 340,
        maxHeight: "48vh",
        overflowY: "auto",
        padding: "10px 8px 10px 12px",
        pointerEvents: "auto",
        zIndex: 40,
        ...panelStyle,
      }}
    >
      <div
        style={{
          fontSize: 11,
          opacity: 0.6,
          letterSpacing: 1.4,
          marginBottom: 8,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          INCOMING
          {streaming && (
            <span
              style={{
                fontSize: 9,
                letterSpacing: 0.8,
                padding: "1px 5px",
                borderRadius: 4,
                border: "1px solid #2a3656",
                color: "#8ea3d0",
              }}
              title="Only incidents that surfaced since you opened the app — nothing is replayed"
            >
              LIVE ONLY
            </span>
          )}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {updatedAt ? `updated ${ago(updatedAt)}` : ""}
          <button
            onClick={onToggle}
            title="Hide incoming calls"
            aria-label="Hide incoming calls"
            style={{
              width: 22,
              height: 22,
              borderRadius: 7,
              border: "1px solid #2a3656",
              background: "rgba(255,255,255,0.03)",
              color: "#9fb2dd",
              cursor: "pointer",
              lineHeight: 1,
            }}
          >
            −
          </button>
        </span>
      </div>

      {items.map((c) => {
        const isNew = c.live || freshIds.has(c.id);
        return (
          <button
            key={c.key || c.id}
            onClick={() => onPick(c)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "7px 8px",
              marginBottom: 3,
              borderRadius: 8,
              border: "1px solid",
              borderColor: selectedId === c.id ? "#3d558f" : "transparent",
              background: selectedId === c.id ? "rgba(255,255,255,0.08)" : "transparent",
              color: "#e8ecf7",
              cursor: "pointer",
              fontSize: 12,
              animation: isNew ? "dgFlash 2.6s ease-out 1" : "none",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: SEV_COLOR[c.sev] || "#35d0ff",
                  boxShadow: `0 0 7px ${SEV_COLOR[c.sev] || "#35d0ff"}`,
                }}
              />
              <span
                style={{
                  flex: 1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {c.desc}
              </span>
              {c.live ? (
                <span
                  style={{
                    fontSize: 9,
                    letterSpacing: 0.6,
                    padding: "1px 4px",
                    borderRadius: 3,
                    background: "#ff1240",
                    color: "#fff",
                    fontWeight: 700,
                  }}
                >
                  LIVE
                </span>
              ) : null}
              <span style={{ opacity: 0.5, fontSize: 11 }}>{ago(c.ts)}</span>
            </div>
            <div style={{ opacity: 0.5, fontSize: 11, marginLeft: 14 }}>
              {c.city}, {c.state}
              {c.place ? ` · ${c.place}` : ""}
            </div>
          </button>
        );
      })}

      {!items.length && (
        <div style={{ fontSize: 12, opacity: 0.5, padding: 8 }}>
          Connecting to public agency CAD feeds...
        </div>
      )}
    </div>
  );
});

// -------------------------------------------------------------
// MAIN DISTRESS HUD COMPONENT
// -------------------------------------------------------------
interface DistressHUDProps {
  onSelectCall: (call: DistressCall) => void;
  activeCall: DistressCall | null;
  onCloseCall: () => void;
  onFocusRegion?: (region: "US" | "UK" | "World") => void;
  onFocusCoordinates?: (lat: number, lon: number) => void;
  onUpdateDistressCalls?: (calls: DistressCall[]) => void;
}

export default function DistressHUD({
  onSelectCall,
  activeCall,
  onCloseCall,
  onFocusRegion,
  onFocusCoordinates,
  onUpdateDistressCalls,
}: DistressHUDProps) {
  const [data, setData] = useState<DistressApiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sevFilter, setSevFilter] = useState<number[]>([0, 1, 2, 3]);
  const [kindFilter, setKindFilter] = useState<string[]>(KINDS.map((k) => k.id));
  const [showSources, setShowSources] = useState(false);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [tickerCollapsed, setTickerCollapsed] = useState(false);
  const [bootingData, setBootingData] = useState(false);
  const [tick, setTick] = useState(0);
  const [wire, setWire] = useState<DistressCall[]>([]);
  const [heatCount, setHeatCount] = useState(0);
  const [burst, setBurst] = useState(0);
  const [sessionCount, setSessionCount] = useState(0);
  const [openedAt] = useState(() => Date.now());
  const [log, setLog] = useState<watchlog.WatchLogData>(() => watchlog.load());
  const [soundOn, setSoundOn] = useState(false);

  const seenIds = useRef<Set<string>>(new Set());
  const stagedOnce = useRef(false);
  const stagingTimers = useRef<NodeJS.Timeout[]>([]);
  const [freshIds, setFreshIds] = useState<Set<string>>(() => new Set());
  const streamCursor = useRef(0);
  const heatCursor = useRef(0);
  const heatRef = useRef<DistressCall[]>([]);
  const cityCooldown = useRef<Map<string, number>>(new Map());
  const streamRef = useRef<DistressCall[]>([]);
  const pending = useRef<DistressCall[]>([]);
  const liveQueue = useRef<DistressCall[]>([]);

  const clearStagingTimers = useCallback(() => {
    for (const timer of stagingTimers.current) clearTimeout(timer);
    stagingTimers.current = [];
  }, []);

  // 1. DATA LOADER ENGINE (Polls /api/calls)
  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/calls", { cache: "no-store" });
      if (!res.ok) throw new Error(`feed error ${res.status}`);
      const json: DistressApiResponse = await res.json();

      if (!stagedOnce.current && seenIds.current.size === 0) {
        stagedOnce.current = true;
        clearStagingTimers();
        for (const c of json.calls) seenIds.current.add(c.id);

        // One-off seed so wire opens with latest incidents
        setWire(
          json.calls
            .filter((c) => c.ts)
            .slice(0, 25)
            .map((c) => ({ ...c, key: `seed-${c.id}` }))
        );

        const staged = spreadInitialCalls(json.calls);
        setData({ ...json, calls: [] });
        setFreshIds(new Set());
        setBurst(0);
        setBootingData(true);
        setLoading(false);
        setError(null);

        const waveCount = Math.max(
          INITIAL_REVEAL_MIN_WAVES,
          Math.min(
            INITIAL_REVEAL_MAX_WAVES,
            Math.ceil(staged.length / INITIAL_REVEAL_CALLS_PER_WAVE)
          )
        );

        let delay = INITIAL_REVEAL_DELAY_MS;
        let start = 0;
        for (let wave = 1; wave <= waveCount; wave++) {
          delay += 230 + Math.random() * 250;
          const t = wave / waveCount;
          const eased = t * t * (3 - 2 * t);
          const end =
            wave === waveCount
              ? staged.length
              : Math.max(start + 1, Math.round(staged.length * eased));
          const chunkStart = start;
          const chunkEnd = end;

          const timer = setTimeout(() => {
            const chunk = staged.slice(chunkStart, chunkEnd);
            const pulseChunk = pulseSample(chunk, INITIAL_PULSE_PER_WAVE);
            pending.current = [...pending.current, ...pulseChunk].slice(-600);
            setFreshIds(new Set(pulseChunk.map((c) => c.id)));
            setHeatCount((prev) => Math.min(260, prev + chunk.length));

            const currentBatch = wave === waveCount ? json.calls : staged.slice(0, chunkEnd);
            setData({
              ...json,
              calls: currentBatch,
            });
            if (onUpdateDistressCalls) onUpdateDistressCalls(currentBatch);
            if (wave === waveCount) setBootingData(false);
          }, delay);
          stagingTimers.current.push(timer);
          start = end;
        }
        return;
      }

      // Subsequent Polls: filter for genuine live arrivals
      const arrivalCutoff = Date.now() - ARRIVAL_MAX_AGE_MS;
      const incoming: DistressCall[] = [];
      const first = seenIds.current.size === 0;
      for (const c of json.calls) {
        if (seenIds.current.has(c.id)) continue;
        seenIds.current.add(c.id);
        if (first) continue;
        const t = c.ts ? new Date(c.ts).getTime() : NaN;
        if (Number.isFinite(t) && t >= arrivalCutoff) incoming.push(c);
      }

      setFreshIds(new Set(incoming.map((c) => c.id)));
      liveQueue.current = [...liveQueue.current, ...incoming].slice(-200);

      if (incoming.length) {
        setBurst(incoming.length);
        setSessionCount((n) => n + incoming.length);
        setLog((prev) => {
          const next = watchlog.record(prev, incoming);
          watchlog.save(next);
          return next;
        });
        setHeatCount((prev) => Math.min(260, prev + incoming.length * 3));
      }

      setData(json);
      if (onUpdateDistressCalls) onUpdateDistressCalls(json.calls);
      setError(null);
    } catch (err: any) {
      setError(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }, [clearStagingTimers, onUpdateDistressCalls]);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => {
      clearInterval(t);
      clearStagingTimers();
    };
  }, [clearStagingTimers, load]);

  // Clock tick for ago() formatting
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 8_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!burst) return;
    const t = setTimeout(() => setBurst(0), 6000);
    return () => clearTimeout(t);
  }, [burst]);

  const calls = data?.calls || [];

  const visible = useMemo(
    () => calls.filter((c) => sevFilter.includes(c.sev) && kindFilter.includes(c.kind)),
    [calls, sevFilter, kindFilter]
  );

  const streamPool = useMemo(() => {
    const cutoff = Date.now() - STREAM_WINDOW_H * 3600_000;
    const windowed = visible.filter((c) => {
      if (!c.ts) return false;
      const t = new Date(c.ts).getTime();
      return Number.isFinite(t) && t >= cutoff;
    });
    const sorted = [...(windowed.length > 40 ? windowed : visible)].sort((a, b) =>
      (b.ts || "").localeCompare(a.ts || "")
    );
    return sorted.slice(0, STREAM_POOL_MAX);
  }, [visible]);

  const heatPool = useMemo(() => spreadInitialCalls(visible), [visible]);
  heatRef.current = heatPool;
  streamRef.current = streamPool;

  useEffect(() => {
    streamCursor.current = 0;
  }, [data?.generatedAt]);

  // 2. LIVE SWEEP ENGINE (Ticks every 340ms, pushes fresh rows to the wire)
  useEffect(() => {
    const tickSweep = () => {
      const now = Date.now();
      const src = streamRef.current;

      const fresh: DistressCall[] = liveQueue.current.splice(0, 6).map((c) => ({
        ...c,
        hot: true,
        live: true,
        born: now,
        key: `live-${c.id}-${now}`,
      }));

      // Boot-reveal pulses
      pending.current.splice(0, 14).map((c) => ({
        ...c,
        hot: true,
        born: now,
        key: `boot-${c.id}-${now}`,
      }));

      // Replayed incident rotation with city cooldown
      const streamed: DistressCall[] = [];
      if (src.length) {
        for (let i = 0; i < SWEEP_BATCH; i++) {
          let picked: DistressCall | null = null;
          for (let scan = 0; scan < SCAN_LIMIT; scan++) {
            const c = src[streamCursor.current % src.length];
            streamCursor.current++;
            if (!c) continue;
            const last = cityCooldown.current.get(c.city) || 0;
            if (now - last >= CITY_COOLDOWN_MS) {
              picked = c;
              break;
            }
          }
          if (!picked) break;
          cityCooldown.current.set(picked.city, now);
          streamed.push({
            ...picked,
            hot: true,
            born: now,
            key: `str-${picked.id}-${now}-${i}`,
          });
        }
        if (cityCooldown.current.size > 400) cityCooldown.current.clear();
      }

      if (fresh.length) {
        setWire((prev) => [...fresh, ...prev].slice(0, WIRE_MAX));
        blip(Math.max(...fresh.map((c) => c.sev || 0)));
      }
    };

    const t = setInterval(tickSweep, SWEEP_MS);
    return () => clearInterval(t);
  }, []);

  const ticker = useMemo(
    () => (wire.length ? wire.slice(0, WIRE_MAX) : visible.slice(0, WIRE_MAX)),
    [wire, visible]
  );

  const heatLevel = useMemo(() => Math.min(1, heatCount / 260), [heatCount]);

  const counts = useMemo(() => {
    const c = [0, 0, 0, 0];
    for (const call of visible) c[call.sev] = (c[call.sev] || 0) + 1;
    return c;
  }, [visible]);

  const violent = useMemo(
    () => visible.filter((c) => c.sev >= 3).slice(0, 140),
    [visible]
  );

  const violentRecent = useMemo(() => {
    const dayAgo = Date.now() - 86_400_000;
    return violent.filter((c) => c.ts && new Date(c.ts).getTime() > dayAgo).length;
  }, [violent]);

  const sinceOpened = useMemo(() => {
    const secs = Math.max(0, (Date.now() - openedAt) / 1000);
    if (secs < 90) return `${Math.round(secs)}s`;
    if (secs < 5400) return `${Math.round(secs / 60)}m`;
    return `${Math.round(secs / 3600)}h`;
  }, [openedAt, tick]);

  const watched = useMemo(() => {
    const secs = Math.max(1, (Date.now() - openedAt) / 1000);
    const top = watchlog.topCity(log);
    return {
      rate: sessionCount > 0 ? (sessionCount / (secs / 60)).toFixed(1) : "0.0",
      topCity: top ? top[0] : null,
      topCityN: top ? top[1] : 0,
      cityCount: Object.keys(log.cities || {}).length,
    };
  }, [log, sessionCount, openedAt, tick]);

  const stats = useMemo(() => {
    if (!calls.length) return null;
    const now = Date.now();
    const day = now - 86_400_000;
    const hour = now - 3_600_000;

    let last24 = 0;
    let lastHour = 0;
    let violent24 = 0;
    const cityCount = new Map<string, number>();
    const typeCount = new Map<string, number>();

    for (const c of calls) {
      const t = c.ts ? new Date(c.ts).getTime() : NaN;
      if (!Number.isFinite(t)) continue;
      if (t >= day) {
        last24++;
        if (c.sev >= 3) violent24++;
        cityCount.set(c.city, (cityCount.get(c.city) || 0) + 1);
        const key = (c.desc || "").split(/[-–(,\/]/)[0].trim().toLowerCase();
        if (key) typeCount.set(key, (typeCount.get(key) || 0) + 1);
      }
      if (t >= hour) lastHour++;
    }

    const topCity = [...cityCount].sort((a, b) => b[1] - a[1])[0];
    const topType = [...typeCount].sort((a, b) => b[1] - a[1])[0];

    return {
      last24,
      perHour: Math.round(last24 / 24),
      lastHour,
      violent24,
      topCity: topCity ? topCity[0] : "—",
      topCityN: topCity ? topCity[1] : 0,
      topType: topType ? topType[0] : "—",
      topTypeN: topType ? topType[1] : 0,
    };
  }, [calls]);

  const toggleSev = (val: number) => {
    setSevFilter((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));
  };

  const toggleKind = (val: string) => {
    setKindFilter((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]));
  };

  const pick = useCallback(
    (call: DistressCall) => {
      onSelectCall(call);
      if (onFocusCoordinates) onFocusCoordinates(call.lat, call.lon);
    },
    [onSelectCall, onFocusCoordinates]
  );

  return (
    <div className="absolute inset-0 pointer-events-none select-none font-sans z-30">
      {/* 1. TOP-LEFT: STATUS & METRICS PANEL */}
      {headerCollapsed ? (
        <button
          className="dg-header-handle pointer-events-auto"
          onClick={() => setHeaderCollapsed(false)}
          title="Show status panel"
          aria-label="Show status panel"
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "9px 13px",
            color: "#e8ecf7",
            cursor: "pointer",
            fontSize: 13,
            letterSpacing: 2.4,
            ...panelStyle,
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: error ? "#ff2d55" : bootingData ? "#ffb020" : "#35d0ff",
              boxShadow: `0 0 10px ${error ? "#ff2d55" : bootingData ? "#ffb020" : "#35d0ff"}`,
              animation: "dgPulse 1.6s ease-in-out infinite",
            }}
          />
          DISTRESS
        </button>
      ) : (
        <div
          className="dg-header pointer-events-auto"
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            padding: "14px 18px",
            maxWidth: 340,
            ...panelStyle,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: error ? "#ff2d55" : bootingData ? "#ffb020" : "#35d0ff",
                boxShadow: `0 0 12px ${error ? "#ff2d55" : bootingData ? "#ffb020" : "#35d0ff"}`,
                animation: "dgPulse 1.6s ease-in-out infinite",
              }}
            />
            <h1 style={{ margin: 0, fontSize: 22, letterSpacing: 3, fontWeight: 700, color: "#fff" }}>
              DISTRESS
            </h1>
            {burst > 0 && (
              <span
                style={{
                  marginLeft: "auto",
                  fontSize: 11,
                  padding: "3px 9px",
                  borderRadius: 999,
                  background: "rgba(255,45,85,0.16)",
                  border: "1px solid rgba(255,45,85,0.5)",
                  color: "#ff8095",
                  animation: "dgPop 0.5s ease-out 1",
                }}
              >
                +{burst} new
              </span>
            )}
            <button
              onClick={() => setHeaderCollapsed(true)}
              title="Minimise status panel"
              aria-label="Minimise status panel"
              style={{
                marginLeft: burst > 0 ? 0 : "auto",
                width: 22,
                height: 22,
                flexShrink: 0,
                borderRadius: 7,
                border: "1px solid #2a3656",
                background: "rgba(255,255,255,0.03)",
                color: "#9fb2dd",
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              −
            </button>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 12.5, opacity: 0.72, lineHeight: 1.5, color: "#d1dcfa" }}>
            {data?.fallbackActive
              ? "Live feeds are retrying; baseline city coverage is keeping the map populated."
              : "Live police, fire and 911 dispatch pulled straight from public agency feeds. Every dot is somebody's bad day."}
          </p>

          <div
            style={{
              marginTop: 12,
              padding: "9px 11px",
              borderRadius: 10,
              border: "1px solid rgba(255,45,85,0.35)",
              background: "linear-gradient(180deg, rgba(255,45,85,0.12), rgba(255,45,85,0.03))",
              display: "flex",
              alignItems: "baseline",
              gap: 9,
            }}
          >
            <span
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#ff8095",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {log.total.toLocaleString()}
            </span>
            <span style={{ fontSize: 11.5, opacity: 0.75, lineHeight: 1.35, color: "#e8ecf7" }}>
              crimes reported
              <br />
              <span style={{ opacity: 0.65 }}>
                {sessionCount} this session · {sinceOpened} watching
              </span>
            </span>
          </div>

          {log.total > 0 && (
            <div
              style={{
                marginTop: 6,
                display: "flex",
                flexWrap: "wrap",
                gap: "4px 10px",
                fontSize: 11,
                opacity: 0.68,
                color: "#e8ecf7",
              }}
            >
              <span>
                <strong style={{ color: "#ff8095" }}>{log.violent}</strong> violent
              </span>
              <span>
                <strong>{watched.cityCount}</strong> cities
              </span>
              <span>
                <strong>{watched.rate}</strong>/min
              </span>
              {watched.topCity && (
                <span style={{ opacity: 0.85 }}>
                  busiest {watched.topCity} ({watched.topCityN})
                </span>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12, color: "#e8ecf7" }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>
                {loading ? "—" : visible.length.toLocaleString()}
              </div>
              <div style={{ opacity: 0.6 }}>{bootingData ? "syncing" : "calls plotted"}</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>
                {data ? data.states.length : "—"}
              </div>
              <div style={{ opacity: 0.6 }}>states live</div>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>
                {data ? `${data.feedsOk}/${data.feedsTotal}` : "—"}
              </div>
              <div style={{ opacity: 0.6 }}>
                {data?.fallbackActive
                  ? "feeds retrying"
                  : data?.feedsLive != null
                  ? `feeds up · ${data.feedsLive} live`
                  : "feeds up"}
              </div>
            </div>
          </div>

          {stats && (
            <div
              style={{
                marginTop: 12,
                paddingTop: 10,
                borderTop: "1px solid rgba(255,255,255,0.08)",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px 10px",
                fontSize: 11,
                color: "#e8ecf7",
              }}
            >
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{stats.last24.toLocaleString()}</div>
                <div style={{ opacity: 0.55 }}>calls · 24h</div>
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>
                  {stats.perHour.toLocaleString()}/hr
                </div>
                <div style={{ opacity: 0.55 }}>national rate</div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={stats.topCity}
                >
                  {stats.topCity}
                </div>
                <div style={{ opacity: 0.55 }}>busiest · {stats.topCityN}</div>
              </div>
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textTransform: "capitalize",
                  }}
                  title={stats.topType}
                >
                  {stats.topType}
                </div>
                <div style={{ opacity: 0.55 }}>top call · {stats.topTypeN}</div>
              </div>
            </div>
          )}

          {/* Violent felonies board */}
          {violent.length > 0 && (
            <div
              style={{
                marginTop: 12,
                padding: "9px 10px",
                borderRadius: 10,
                border: "1px solid rgba(255,18,64,0.45)",
                background: "linear-gradient(180deg, rgba(255,18,64,0.16), rgba(255,18,64,0.05))",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  fontSize: 10.5,
                  letterSpacing: 1.3,
                  textTransform: "uppercase",
                  color: "#ff8095",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#ff1240",
                    boxShadow: "0 0 10px #ff1240",
                    animation: "dgAlarm 1.1s ease-in-out infinite",
                  }}
                />
                <span style={{ flex: 1, fontWeight: 700 }}>Violent felonies</span>
                <span style={{ color: "#ffd0d8" }}>{violentRecent} in 24h</span>
              </div>

              <div style={{ marginTop: 7, maxHeight: 132, overflowY: "auto" }}>
                {violent.slice(0, 14).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => pick(c)}
                    style={{
                      display: "block",
                      width: "100%",
                      textAlign: "left",
                      padding: "4px 5px",
                      marginBottom: 2,
                      borderRadius: 6,
                      border: "1px solid transparent",
                      background: activeCall?.id === c.id ? "rgba(255,255,255,0.09)" : "transparent",
                      color: "#ffe6ea",
                      cursor: "pointer",
                      fontSize: 11.5,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                      }}
                    >
                      <span
                        style={{
                          flex: 1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontWeight: 500,
                        }}
                      >
                        {c.desc}
                      </span>
                      <span style={{ opacity: 0.6, fontSize: 10.5 }}>{ago(c.ts)}</span>
                    </div>
                    <div style={{ opacity: 0.6, fontSize: 10.5 }}>
                      {c.city}, {c.state}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Activity Heat Meter */}
          <div className="dg-heat-meter" style={{ marginTop: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 10.5,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: "#ff9a74",
                opacity: 0.86,
              }}
            >
              <span>Activity heat</span>
              <span>
                {heatCount ? `${Math.round(heatLevel * 100)}%` : bootingData ? "warming" : "quiet"}
              </span>
            </div>
            <div
              style={{
                height: 7,
                marginTop: 6,
                borderRadius: 999,
                overflow: "hidden",
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                style={{
                  width: `${heatCount ? Math.max(8, heatLevel * 100) : 0}%`,
                  height: "100%",
                  borderRadius: 999,
                  background: "linear-gradient(90deg, #ffb020 0%, #ff5a2f 42%, #ff174d 100%)",
                  boxShadow: `0 0 ${10 + heatLevel * 24}px rgba(255, 45, 85, ${0.35 + heatLevel * 0.45})`,
                  transition: "width 700ms ease, box-shadow 700ms ease",
                }}
              />
            </div>
          </div>

          {error && <div style={{ marginTop: 10, fontSize: 12, color: "#ff8095" }}>{error}</div>}
        </div>
      )}

      {/* 2. TOP-RIGHT: FILTERS PANEL */}
      {filtersCollapsed ? (
        <button
          className="dg-filter-handle pointer-events-auto"
          onClick={() => setFiltersCollapsed(false)}
          title="Show map filters"
          aria-label="Show map filters"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "9px 12px",
            color: "#e8ecf7",
            cursor: "pointer",
            fontSize: 11,
            letterSpacing: 1.2,
            textTransform: "uppercase",
            ...panelStyle,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#ffb020",
              boxShadow: "0 0 10px #ffb020",
            }}
          />
          Filters
        </button>
      ) : (
        <div
          className="dg-filters pointer-events-auto"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            padding: "12px 14px",
            width: 210,
            ...panelStyle,
          }}
        >
          <div
            style={{
              fontSize: 11,
              opacity: 0.6,
              letterSpacing: 1.4,
              marginBottom: 8,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              color: "#e8ecf7",
            }}
          >
            <span>SEVERITY</span>
            <button
              onClick={() => {
                setFiltersCollapsed(true);
                setShowSources(false);
              }}
              title="Hide map filters"
              aria-label="Hide map filters"
              style={{
                width: 22,
                height: 22,
                borderRadius: 7,
                border: "1px solid #2a3656",
                background: "rgba(255,255,255,0.03)",
                color: "#9fb2dd",
                cursor: "pointer",
                lineHeight: 1,
              }}
            >
              −
            </button>
          </div>

          {[3, 2, 1, 0].map((s) => (
            <button
              key={s}
              onClick={() => toggleSev(s)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "6px 8px",
                marginBottom: 4,
                borderRadius: 8,
                border: "1px solid transparent",
                background: sevFilter.includes(s) ? "rgba(255,255,255,0.06)" : "transparent",
                color: "#e8ecf7",
                opacity: sevFilter.includes(s) ? 1 : 0.4,
                cursor: "pointer",
                fontSize: 12.5,
                textAlign: "left",
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: SEV_COLOR[s],
                  boxShadow: `0 0 8px ${SEV_COLOR[s]}`,
                }}
              />
              <span style={{ textTransform: "capitalize", flex: 1 }}>{SEV_LABEL[s]}</span>
              <span style={{ opacity: 0.65 }}>{(counts[s] || 0).toLocaleString()}</span>
            </button>
          ))}

          <div
            style={{
              fontSize: 11,
              opacity: 0.6,
              letterSpacing: 1.4,
              margin: "12px 0 8px",
              color: "#e8ecf7",
            }}
          >
            TYPE
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => toggleKind(k.id)}
                style={{
                  padding: "5px 9px",
                  borderRadius: 999,
                  border: "1px solid #2a3656",
                  background: kindFilter.includes(k.id) ? "#1b2747" : "transparent",
                  color: "#e8ecf7",
                  opacity: kindFilter.includes(k.id) ? 1 : 0.42,
                  cursor: "pointer",
                  fontSize: 11.5,
                }}
              >
                {k.label}
              </button>
            ))}
          </div>

          <div
            style={{
              fontSize: 11,
              opacity: 0.6,
              letterSpacing: 1.4,
              margin: "12px 0 8px",
              color: "#e8ecf7",
            }}
          >
            REGION
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {Object.keys(REGION_VIEWS).map((r) => (
              <button
                key={r}
                onClick={() => {
                  if (onFocusRegion) onFocusRegion(r as any);
                  else if (onFocusCoordinates) {
                    const coords = REGION_VIEWS[r];
                    onFocusCoordinates(coords.lat, coords.lng);
                  }
                }}
                style={{
                  flex: 1,
                  padding: "6px 8px",
                  borderRadius: 8,
                  border: "1px solid #2a3656",
                  background: "transparent",
                  color: "#9fb2dd",
                  cursor: "pointer",
                  fontSize: 11.5,
                }}
              >
                {r}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
            <button
              onClick={async () => {
                if (soundOn) {
                  muteSound();
                  setSoundOn(false);
                } else {
                  const ok = await enableSound();
                  setSoundOn(ok);
                  if (ok) blip(1);
                }
              }}
              title={soundOn ? "Mute scanner audio" : "Scanner audio: a blip per incident"}
              style={{
                flex: 1,
                padding: "7px 8px",
                borderRadius: 8,
                border: "1px solid",
                borderColor: soundOn ? "#3d558f" : "#2a3656",
                background: soundOn ? "rgba(61,85,143,0.35)" : "transparent",
                color: soundOn ? "#e8ecf7" : "#9fb2dd",
                cursor: "pointer",
                fontSize: 11.5,
              }}
            >
              {soundOn ? "scanner on" : "scanner"}
            </button>
            <button
              onClick={() => setLog(watchlog.reset())}
              title="Reset the crimes-watched tally"
              style={{
                flex: 1,
                padding: "7px 8px",
                borderRadius: 8,
                border: "1px solid #2a3656",
                background: "transparent",
                color: "#9fb2dd",
                cursor: "pointer",
                fontSize: 11.5,
              }}
            >
              reset tally
            </button>
          </div>

          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button
              onClick={() => {
                if (onFocusCoordinates) onFocusCoordinates(39.5, -96);
              }}
              style={{
                flex: 1,
                padding: "7px 8px",
                borderRadius: 8,
                border: "1px solid #2a3656",
                background: "transparent",
                color: "#9fb2dd",
                cursor: "pointer",
                fontSize: 11.5,
              }}
            >
              reset view
            </button>
            <button
              onClick={() => setShowSources((v) => !v)}
              style={{
                flex: 1,
                padding: "7px 8px",
                borderRadius: 8,
                border: "1px solid #2a3656",
                background: "transparent",
                color: "#9fb2dd",
                cursor: "pointer",
                fontSize: 11.5,
              }}
            >
              {showSources ? "hide feeds" : "feeds"}
            </button>
          </div>
        </div>
      )}

      {/* 3. SOURCES MODAL */}
      {showSources && data && (
        <div
          className="dg-sources pointer-events-auto"
          style={{
            position: "absolute",
            top: 74,
            right: 236,
            width: 320,
            maxHeight: "70vh",
            overflowY: "auto",
            padding: "12px 14px",
            color: "#e8ecf7",
            ...panelStyle,
          }}
        >
          <div style={{ fontSize: 11, opacity: 0.6, letterSpacing: 1.4, marginBottom: 8 }}>
            FEEDS ({data.feedsOk}/{data.feedsTotal} returning data)
          </div>
          {(data.sources || [])
            .slice()
            .sort((a, b) => (b.count || 0) - (a.count || 0))
            .map((s) => (
              <div
                key={s.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 0",
                  fontSize: 12,
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: s.count ? (s.live ? "#35d0ff" : "#5f7ab5") : "#ff2d55",
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                  {s.agency}
                  <span style={{ opacity: 0.5 }}> · {s.state}</span>
                </span>
                <span style={{ opacity: 0.45, fontSize: 10.5, marginRight: 6 }}>
                  {s.ageMin == null
                    ? ""
                    : s.ageMin < 90
                    ? `${s.ageMin}m`
                    : s.ageMin < 2880
                    ? `${Math.round(s.ageMin / 60)}h`
                    : `${Math.round(s.ageMin / 1440)}d`}
                </span>
                <span style={{ opacity: 0.6 }}>{s.count || s.error || 0}</span>
              </div>
            ))}
        </div>
      )}

      {/* 4. BOTTOM-LEFT: LIVE WIRE / TICKER */}
      <Ticker
        className="dg-ticker"
        collapsed={tickerCollapsed}
        streaming={wire.length > 0}
        items={ticker}
        freshIds={freshIds}
        selectedId={activeCall?.id}
        onPick={pick}
        onToggle={() => setTickerCollapsed((v) => !v)}
        updatedAt={data?.generatedAt}
      />

      {/* 5. BOTTOM-RIGHT: SELECTED CALL DETAIL CARD */}
      {activeCall && (
        <div
          className="dg-detail pointer-events-auto"
          style={{
            position: "absolute",
            right: 16,
            bottom: 16,
            width: 300,
            padding: "14px 16px",
            color: "#e8ecf7",
            ...panelStyle,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <span
              style={{
                fontSize: 10.5,
                letterSpacing: 1.2,
                color: SEV_COLOR[activeCall.sev] || "#35d0ff",
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              {SEV_LABEL[activeCall.sev]} · {activeCall.kind}
            </span>
            <button
              onClick={onCloseCall}
              style={{
                background: "none",
                border: "none",
                color: "#7d8db5",
                cursor: "pointer",
                fontSize: 15,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          </div>
          <div style={{ fontSize: 15, marginTop: 6, fontWeight: 600, color: "#fff" }}>
            {activeCall.desc}
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.72, marginTop: 6, lineHeight: 1.5, color: "#c8d5f4" }}>
            {activeCall.place && (
              <>
                {activeCall.place}
                <br />
              </>
            )}
            {activeCall.city}, {activeCall.state}
            <br />
            {agencyOf(activeCall, data?.sources)}
            <br />
            {ago(activeCall.ts)}
            {activeCall.approx ? " · location approximate" : ""}
          </div>
        </div>
      )}

      {/* 6. AUTHENTIC KEYFRAME ANIMATIONS */}
      <style>{`
        @keyframes dgPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(0.82); }
        }
        @keyframes dgAlarm {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.25; transform: scale(0.7); }
        }
        @keyframes dgPop {
          0% { transform: scale(0.6); opacity: 0; }
          60% { transform: scale(1.12); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes dgFlash {
          0% { background: rgba(255,255,255,0.22); border-color: rgba(255,255,255,0.35); }
          100% { background: transparent; border-color: transparent; }
        }
        ::-webkit-scrollbar { width: 8px; }
        ::-webkit-scrollbar-thumb { background: #223055; border-radius: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        @media (max-width: 700px) {
          .dg-header {
            top: 12px !important;
            left: 12px !important;
            right: 12px !important;
            max-width: none !important;
            padding: 12px 14px !important;
          }
          .dg-filters {
            top: 208px !important;
            left: 12px !important;
            right: 12px !important;
            width: auto !important;
            padding: 10px 12px !important;
          }
          .dg-filter-handle {
            top: 208px !important;
            right: 12px !important;
          }
          .dg-ticker:not(.dg-ticker-handle) {
            left: 12px !important;
            right: 12px !important;
            bottom: 12px !important;
            width: auto !important;
            max-height: 32vh !important;
          }
          .dg-ticker-handle {
            left: 12px !important;
            right: auto !important;
            bottom: 12px !important;
            width: auto !important;
            max-height: none !important;
          }
          .dg-detail {
            left: 12px !important;
            right: 12px !important;
            bottom: 12px !important;
            width: auto !important;
          }
          .dg-sources {
            top: 482px !important;
            left: 12px !important;
            right: 12px !important;
            width: auto !important;
            max-height: 28vh !important;
          }
        }
      `}</style>
    </div>
  );
}
