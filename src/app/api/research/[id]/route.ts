/**
 * Research Report API Endpoint
 * GET /api/research/[id] - Get research report for a mover event
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get Supabase client
  const supabase = await getSupabase();

  const { data: report, error } = await supabase
    .from("research_reports")
    .select(`
      *,
      mover_events (*)
    `)
    .eq("mover_event_id", id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json(
        { error: "Research report not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ report });
}
