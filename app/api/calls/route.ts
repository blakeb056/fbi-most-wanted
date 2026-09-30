import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CachedSnapshot {
  at: number;
  data: any;
}

let snapshot: CachedSnapshot | null = null;
let inflight: Promise<any> | null = null;

const TTL_MS = 25_000;
const HARD_STALE_MS = 3 * 60_000;

async function fetchFromUpstream() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);

  try {
    const res = await fetch("https://distress-globe.vercel.app/api/calls", {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip, deflate, br",
        "User-Agent": "DistressGlobeMirror/2.0",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error(`Upstream responded with ${res.status}`);
    }

    const data = await res.json();
    if (data && Array.isArray(data.calls) && data.calls.length > 0) {
      snapshot = { at: Date.now(), data };
      return data;
    }
    throw new Error("Invalid payload from upstream");
  } catch (err) {
    console.error("Error refreshing distress calls:", err);
    if (snapshot) {
      return snapshot.data;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function refresh() {
  if (!inflight) {
    inflight = fetchFromUpstream()
      .catch((err) => {
        console.error("Failed to refresh distress feed:", err);
        return snapshot?.data || null;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export async function GET() {
  const now = Date.now();
  const age = snapshot ? now - snapshot.at : Infinity;

  try {
    let freshData = null;
    if (age >= TTL_MS) {
      const pending = refresh();
      if (!snapshot || age >= HARD_STALE_MS) {
        freshData = await pending;
      }
    }

    const data = freshData || snapshot?.data;
    if (!data) {
      return NextResponse.json(
        { error: "Feeds connecting... retrying snapshot." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { ...data, cacheAgeMs: snapshot ? Date.now() - snapshot.at : 0 },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal distress feed error" },
      { status: 500 }
    );
  }
}
