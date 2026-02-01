/**
 * Stats API Endpoint
 * GET /api/stats - Get system statistics
 */

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const days = parseInt(searchParams.get("days") || "7");

  const since = new Date();
  since.setDate(since.getDate() - days);

  // Get daily stats
  const { data: dailyStats } = await supabase
    .from("daily_stats")
    .select("*")
    .gte("date", since.toISOString().split("T")[0])
    .order("date", { ascending: false });

  // Get total movers count
  const { count: totalMovers } = await supabase
    .from("mover_events")
    .select("*", { count: "exact", head: true })
    .gte("detected_at", since.toISOString());

  // Get research count
  const { count: researchCount } = await supabase
    .from("research_reports")
    .select("*", { count: "exact", head: true })
    .gte("created_at", since.toISOString());

  // Get prediction accuracy
  const { data: predictions } = await supabase
    .from("predictions")
    .select("status")
    .gte("predicted_at", since.toISOString())
    .neq("status", "pending");

  const predictionStats = {
    total: predictions?.length || 0,
    correct: predictions?.filter((p) => p.status === "correct").length || 0,
    incorrect: predictions?.filter((p) => p.status === "incorrect").length || 0,
    partial: predictions?.filter((p) => p.status === "partial").length || 0,
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
