/**
 * Stats API Endpoint
 * GET /api/stats - Get system statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get("days") || "7");

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Get daily stats
  const { data: dailyStats } = await getSupabase()
    .from("daily_stats")
    .select("*")
    .gte("date", since.toISOString().split("T")[0])
    .order("date", { ascending: false });

  // Get total movers count
  const { count: totalMovers } = await getSupabase()
    .from("mover_events")
    .select("*", { count: "exact", head: true })
    .gte("detected_at", since.toISOString());

  // Get research count
  const { count: researchCount } = await getSupabase()
    .from("research_reports")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since.toISOString());

  // Get prediction accuracy
  const { data: predictionsData } = await getSupabase()
    .from("predictions")
    .select("status")
    .gte("predicted_at", since.toISOString())
    .neq("status", "pending");

  const predictions = (predictionsData || []) as Array<{ status: string }>;

  const predictionStats = {
    total: predictions.length,
    correct: predictions.filter((p) => p.status === "correct").length,
    incorrect: predictions.filter((p) => p.status === "incorrect").length,
    partial: predictions.filter((p) => p.status === "partial").length,
  };

  const accuracy =
    predictionStats.total > 0
      ? (predictionStats.correct + predictionStats.partial * 0.5) /
        predictionStats.total
      : null;

  return NextResponse.json({
    period: { days, since: since.toISOString() },
    summary: {
      totalMovers: totalMovers || 0,
      researchReports: researchCount || 0,
      predictionAccuracy: accuracy,
    },
    predictions: predictionStats,
    dailyStats: dailyStats || [],
    timestamp: new Date().toISOString(),
  });
}
