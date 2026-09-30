import { NextRequest, NextResponse } from "next/server";
import { fetchFbiWanted } from "@/lib/fbi";

export const revalidate = 3600; // Cache 1 hour on Vercel Edge CDN

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const classification = searchParams.get("classification") || undefined;
  const fieldOffice = searchParams.get("fieldOffice") || undefined;
  const query = searchParams.get("query") || undefined;
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);
  const page = parseInt(searchParams.get("page") || "1", 10);

  // If fetching default home dataset, fetch both Top 10 and general feed to guarantee Top 10 presence
  if (!classification && !fieldOffice && !query && page === 1) {
    const [topTenData, generalData] = await Promise.all([
      fetchFbiWanted({ classification: "ten", pageSize: 20 }),
      fetchFbiWanted({ pageSize }),
    ]);

    const seenUids = new Set<string>();
    const mergedItems = [];

    // Prioritize Top 10 items
    for (const item of topTenData.items) {
      if (!seenUids.has(item.uid)) {
        seenUids.add(item.uid);
        mergedItems.push(item);
      }
    }

    // Add general items
    for (const item of generalData.items) {
      if (!seenUids.has(item.uid)) {
        seenUids.add(item.uid);
        mergedItems.push(item);
      }
    }

    return NextResponse.json({
      total: generalData.total || 1254,
      items: mergedItems,
    });
  }

  const data = await fetchFbiWanted({
    classification,
    fieldOffice,
    query,
    pageSize,
    page,
  });

  return NextResponse.json(data);
}
