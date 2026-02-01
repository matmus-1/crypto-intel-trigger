/**
 * Evaluate Predictions - Scheduled Task
 * Checks past predictions and updates accuracy scores
 * Runs every 6 hours (offset from collect-prices)
 */

import { schedules } from "@trigger.dev/sdk/v3";

async function createSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase credentials not configured");
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(url, key);
}

export const evaluatePredictions = schedules.task({
  id: "evaluate-predictions",
  // Run every 6 hours (at 3:00, 9:00, 15:00, 21:00 UTC - offset from price collection)
  cron: "0 3,9,15,21 * * *",

  run: async () => {
    console.log("Starting prediction evaluation...");

    const supabase = await createSupabaseClient();

    // 1. Get pending predictions that are at least 24 hours old
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - 24);

    const { data: pendingPredictions, error } = await supabase
      .from("predictions")
      .select("*, mover_events!inner(coin_id, symbol)")
      .eq("status", "pending")
      .lte("predicted_at", cutoffTime.toISOString());

    if (error) {
      console.error("Error fetching predictions:", error);
      throw error;
    }

    if (!pendingPredictions || pendingPredictions.length === 0) {
      console.log("No predictions to evaluate");
      return { evaluated: 0 };
    }

    console.log(`Evaluating ${pendingPredictions.length} predictions`);

    // 2. Get current prices for the coins
    const coinIds = Array.from(new Set(pendingPredictions.map((p: { coin_id: string }) => p.coin_id)));

    // Fetch current prices from CoinGecko
    const priceUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(",")}&vs_currencies=usd&include_24hr_change=true`;
    const headers: Record<string, string> = { Accept: "application/json" };
    const apiKey = process.env.COINGECKO_API_KEY;
    if (apiKey) {
      headers["x-cg-demo-api-key"] = apiKey;
    }

    const priceResponse = await fetch(priceUrl, { headers });
    if (!priceResponse.ok) {
      throw new Error(`CoinGecko API error: ${priceResponse.status}`);
    }
    const currentPrices = await priceResponse.json();

    // 3. Evaluate each prediction
    let correctCount = 0;
    let incorrectCount = 0;

    for (const prediction of pendingPredictions) {
      const coinId = prediction.coin_id;
      const coinData = currentPrices[coinId];

      if (!coinData) {
        console.log(`No price data for ${coinId}, skipping`);
        continue;
      }

      // Get the price at prediction time from mover_events
      const { data: moverEvent } = await supabase
        .from("mover_events")
        .select("price")
        .eq("id", prediction.mover_event_id)
        .single();

      if (!moverEvent) continue;

      const priceAtPrediction = moverEvent.price;
      const currentPrice = coinData.usd;
      const actualChange = ((currentPrice - priceAtPrediction) / priceAtPrediction) * 100;

      // Determine if prediction was correct
      const predictedUp = prediction.predicted_direction === "up";
      const actualUp = actualChange > 0;
      const isCorrect = predictedUp === actualUp;

      // Determine status
      let status = "incorrect";
      if (isCorrect) {
        status = "correct";
        correctCount++;
      } else {
        incorrectCount++;
      }

      // Check for partial correctness (direction wrong but magnitude small)
      if (!isCorrect && Math.abs(actualChange) < 2) {
        status = "partial";
      }

      // Update prediction
      await supabase
        .from("predictions")
        .update({
          status,
          actual_change: actualChange,
          evaluated_at: new Date().toISOString(),
        })
        .eq("id", prediction.id);

      console.log(
        `${prediction.mover_events.symbol}: Predicted ${prediction.predicted_direction}, ` +
        `Actual ${actualChange > 0 ? "up" : "down"} ${actualChange.toFixed(1)}% = ${status}`
      );
    }

    // 4. Update the mover_events with outcome data for future pattern matching
    for (const prediction of pendingPredictions) {
      const coinId = prediction.coin_id;
      const coinData = currentPrices[coinId];
      if (!coinData) continue;

      const { data: moverEvent } = await supabase
        .from("mover_events")
        .select("price")
        .eq("id", prediction.mover_event_id)
        .single();

      if (!moverEvent) continue;

      const actualChange = ((coinData.usd - moverEvent.price) / moverEvent.price) * 100;

      // Store outcome in metadata
      await supabase
        .from("mover_events")
        .update({
          metadata: supabase.rpc ? undefined : { outcome_24h: actualChange },
        })
        .eq("id", prediction.mover_event_id);
    }

    // 5. Update daily stats
    const today = new Date().toISOString().split("T")[0];
    const { data: stats } = await supabase
      .from("daily_stats")
      .select("*")
      .eq("date", today)
      .single();

    if (stats) {
      await supabase
        .from("daily_stats")
        .update({
          predictions_correct: (stats.predictions_correct || 0) + correctCount,
        })
        .eq("date", today);
    }

    // 6. Calculate overall accuracy
    const { data: allPredictions } = await supabase
      .from("predictions")
      .select("status")
      .neq("status", "pending");

    const total = allPredictions?.length || 0;
    const correct = allPredictions?.filter((p: { status: string }) => p.status === "correct").length || 0;
    const accuracy = total > 0 ? (correct / total * 100).toFixed(1) : "N/A";

    console.log(`Evaluation complete. Overall accuracy: ${accuracy}% (${correct}/${total})`);

    return {
      evaluated: pendingPredictions.length,
      correct: correctCount,
      incorrect: incorrectCount,
      overallAccuracy: accuracy,
    };
  },
});
