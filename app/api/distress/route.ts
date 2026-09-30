import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await fetch("https://distress-globe.vercel.app/api/calls", {
      headers: {
        Accept: "application/json",
        "User-Agent": "OmniGlobe/1.0 (Macintosh; Intel Mac OS X 10_15_7)",
      },
      // Cache 30 seconds
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      throw new Error(`Distress API responded with ${res.status}`);
    }

    const data = await res.json();
    const allCalls = Array.isArray(data.calls) ? data.calls : [];

    // Prioritize high severity and recent calls, take top 1,200 for lightning-fast client loading
    const sorted = [...allCalls].sort((a: any, b: any) => {
      if ((b.sev || 0) !== (a.sev || 0)) {
        return (b.sev || 0) - (a.sev || 0);
      }
      return new Date(b.ts || 0).getTime() - new Date(a.ts || 0).getTime();
    });

    const compactCalls = sorted.slice(0, 1200).map((c: any) => ({
      id: c.id,
      lat: c.lat,
      lon: c.lon,
      ts: c.ts,
      desc: c.desc,
      city: c.city,
      state: c.state,
      kind: c.kind || "police",
      sev: typeof c.sev === "number" ? c.sev : 0,
    }));

    return NextResponse.json({
      total: data.total || allCalls.length,
      feedsLive: data.feedsLive || 120,
      states: data.states || [],
      calls: compactCalls,
    });
  } catch (err) {
    console.error("Distress feed fetch failed:", err);
    return NextResponse.json({ total: 0, feedsLive: 0, states: [], calls: [] }, { status: 500 });
  }
}
