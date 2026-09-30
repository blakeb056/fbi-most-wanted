// What this browser has watched arrive, across visits.
// Ported from distress-globe/lib/watchlog.js

const KEY = "distress.watchlog.v1";

export interface WatchLogData {
  firstOpen: number;
  total: number;
  violent: number;
  cities: Record<string, number>;
  watchedMs: number;
}

const empty = (): WatchLogData => ({
  firstOpen: Date.now(),
  total: 0,
  violent: 0,
  cities: {},
  watchedMs: 0,
});

export function load(): WatchLogData {
  if (typeof window === "undefined") return empty();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.total !== "number") return empty();
    return { ...empty(), ...parsed, cities: parsed.cities || {} };
  } catch {
    return empty();
  }
}

export function save(log: WatchLogData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    // ignore quota
  }
}

export function record(log: WatchLogData, calls: { city?: string; sev?: number }[]): WatchLogData {
  if (!calls.length) return log;
  const cities = { ...log.cities };
  let violent = log.violent;
  for (const c of calls) {
    if (c.city) cities[c.city] = (cities[c.city] || 0) + 1;
    if ((c.sev || 0) >= 3) violent += 1;
  }
  return { ...log, total: log.total + calls.length, violent, cities };
}

export function topCity(log: WatchLogData): [string, number] | null {
  const entries = Object.entries(log.cities || {});
  if (!entries.length) return null;
  return entries.sort((a, b) => b[1] - a[1])[0] as [string, number];
}

export function reset(): WatchLogData {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
  return empty();
}
