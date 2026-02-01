/**
 * Collect Prices - Scheduled Task
 * Runs every 5 minutes to fetch prices and detect movers
 */

import { schedules } from "@trigger.dev/sdk/v3";
import { coingecko } from "@/lib/coingecko";
import { detectMovers } from "@/lib/mover-detector";
import { supabaseAdmin } from "@/lib/supabase";
import { sendAlerts } from "./send-alerts";
import { runResearch } from "./run-research";

export const collectPrices = schedules.task({
  id: "collect-prices",
  // Run every 5 minutes
  cron: "*/5 * * * *",

  run: async () => {
    console.log("Starting price collection...");

    // 1. Fetch market data
    const maxCoins = parseInt(process.env.MAX_COINS || "1000");
    const snapshot = await coingecko.getAllMarketData(maxCoins);

    console.log(`Fetched ${snapshot.coins.length} coins`);

    // 2. Upsert coins into database
    const coinRecords = snapshot.coins.map((coin) => ({
      id: coin.id,
      symbol: coin.symbol,
      name: coin.name,
      is_active: true,
      updated_at: new Date().toISOString(),
    }));

    // Batch upsert coins (100 at a time)
    for (let i = 0; i < coinRecords.length; i += 100) {
      const batch = coinRecords.slice(i, i + 100);
      await supabaseAdmin.from("coins").upsert(batch, { onConflict: "id" });
    }

    // 3. Store price snapshots (top 500 only to save space)
    const priceRecords = snapshot.coins.slice(0, 500).map((coin) => ({
      coin_id: coin.id,
      price: coin.current_price,
      volume_24h: coin.total_volume,
      market_cap: coin.market_cap,
      price_change_1h: coin.price_change_percentage_1h_in_currency,
      price_change_24h: coin.price_change_percentage_24h,
      price_change_7d: coin.price_change_percentage_7d_in_currency,
      recorded_at: snapshot.timestamp.toISOString(),
    }));

    // Batch insert price snapshots
    for (let i = 0; i < priceRecords.length; i += 100) {
      const batch = priceRecords.slice(i, i + 100);
      await supabaseAdmin.from("price_snapshots").insert(batch);
    }

    // 4. Detect movers
    const movers = detectMovers(snapshot);
    console.log(`Detected ${movers.length} significant movers`);

    if (movers.length === 0) {
      return {
        coinsProcessed: snapshot.coins.length,
        moversDetected: 0,
        alertsSent: 0,
      };
    }

    // 5. Store mover events
    const moverRecords = movers.map((event) => ({
      coin_id: event.coinId,
      symbol: event.symbol,
      name: event.name,
      move_type: event.moveType,
      magnitude: event.magnitude,
      price: event.price,
      market_cap: event.marketCap,
      volume_24h: event.volume24h,
      volume_ratio: event.volumeRatio,
      btc_relative: event.btcRelative,
      rank: event.rank,
      metadata: event.metadata,
      detected_at: event.detectedAt.toISOString(),
    }));

    const { data: insertedMovers } = await supabaseAdmin
      .from("mover_events")
      .insert(moverRecords)
      .select("id, coin_id, symbol, magnitude");

    // 6. Trigger alerts (top 10 movers)
    if (insertedMovers && insertedMovers.length > 0) {
      await sendAlerts.trigger({
        movers: movers.slice(0, 10).map((m) => ({
          id: insertedMovers.find((im: { coin_id: string; id: string }) => im.coin_id === m.coinId)?.id,
          symbol: m.symbol,
          name: m.name,
          magnitude: m.magnitude,
          price: m.price,
          marketCap: m.marketCap,
          volume24h: m.volume24h,
          btcRelative: m.btcRelative,
          rank: m.rank,
        })),
      });
    }

    // 7. Trigger research for top 5 movers
    const maxResearch = parseInt(process.env.MAX_RESEARCH_PER_DAY || "20");

    // Check how many researches we've done today
    const today = new Date().toISOString().split("T")[0];
    const { count } = await supabaseAdmin
      .from("research_reports")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today);

    const remainingResearch = maxResearch - (count || 0);
    const moversToResearch = movers.slice(0, Math.min(5, remainingResearch));

    for (const mover of moversToResearch) {
      const eventId = insertedMovers?.find((im: { coin_id: string; id: string }) => im.coin_id === mover.coinId)?.id;
      if (eventId) {
        await runResearch.trigger({
          eventId,
          coinId: mover.coinId,
          symbol: mover.symbol,
          magnitude: mover.magnitude,
        });
      }
    }

    // 8. Update daily stats
    await updateDailyStats(movers.length);

    return {
      coinsProcessed: snapshot.coins.length,
      moversDetected: movers.length,
      alertsSent: Math.min(movers.length, 10),
      researchTriggered: moversToResearch.length,
    };
  },
});

async function updateDailyStats(moverCount: number) {
  const today = new Date().toISOString().split("T")[0];

  // Try to update existing record
  const { data: existing } = await supabaseAdmin
    .from("daily_stats")
    .select("*")
    .eq("date", today)
    .single();

  if (existing) {
    await supabaseAdmin
      .from("daily_stats")
      .update({
        total_movers: existing.total_movers + moverCount,
      })
      .eq("date", today);
  } else {
    await supabaseAdmin.from("daily_stats").insert({
      date: today,
      total_movers: moverCount,
    });
  }
}
