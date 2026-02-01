/**
 * Movers API Endpoint
 * GET /api/movers - Get recent significant movers
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

interface MoverEvent {
  id: string;
  coin_id: string;
  symbol: string;
  name: string;
  move_type: string;
  magnitude: number;
  price: number;
  market_cap: number;
  volume_24h: number;
  detected_at: string;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const hours = parseInt(searchParams.get("hours") || "24");
  const direction = searchParams.get("direction") || "both";
  const limit = parseInt(searchParams.get("limit") || "20");

  // Calculate time threshold
  const since = new Date();
  since.setHours(since.getHours() - hours);

  // Build query
  let query = getSupabase()
    .from("mover_events")
    .select("*")
    .gte("detected_at", since.toISOString())
    .order("detected_at", { ascending: false })
    .limit(limit);

  // Filter by direction
  if (direction === "up") {
    query = query.gt("magnitude", 0);
  } else if (direction === "down") {
    query = query.lt("magnitude", 0);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const movers = (data || []) as MoverEvent[];

  // Sort by absolute magnitude
  const sorted = movers.sort(
    (a, b) => Math.abs(b.magnitude) - Math.abs(a.magnitude)
  );

  return NextResponse.json({
    movers: sorted,
    total: sorted.length,
    params: { hours, direction, limit },
    timestamp: new Date().toISOString(),
  });
}
