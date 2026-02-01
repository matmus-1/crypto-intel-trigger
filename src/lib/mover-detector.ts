/**
 * Mover Detector
 * Identifies significant price movements and volume anomalies
 */

import type { CoinMarketData, MarketSnapshot } from "./coingecko";
import type { MoveType } from "./database.types";

export interface MoverEvent {
  coinId: string;
  symbol: string;
  name: string;
  moveType: MoveType;
  magnitude: number;
  price: number;
  marketCap: number;
  volume24h: number;
  volumeRatio: number | null;
  btcRelative: number | null;
  rank: number | null;
  metadata: Record<string, unknown>;
  detectedAt: Date;
}

interface DetectorConfig {
  priceThreshold: number; // e.g., 0.10 for 10%
  volumeThreshold: number; // e.g., 2.0 for 2x average
}

const defaultConfig: DetectorConfig = {
  priceThreshold: parseFloat(process.env.PRICE_THRESHOLD || "0.10"),
  volumeThreshold: parseFloat(process.env.VOLUME_THRESHOLD || "2.0"),
};

/**
 * Detect significant movers from a market snapshot
 */
export function detectMovers(
  snapshot: MarketSnapshot,
  config: DetectorConfig = defaultConfig
): MoverEvent[] {
  const events: MoverEvent[] = [];
  const now = new Date();
  const thresholdPercent = config.priceThreshold * 100;

  for (const coin of snapshot.coins) {
    const change24h = coin.price_change_percentage_24h || 0;
    const change1h = coin.price_change_percentage_1h_in_currency || 0;
    const btcRelative = change24h - snapshot.btcChange24h;

    // Check for 24h significant move
    if (Math.abs(change24h) >= thresholdPercent) {
      events.push({
        coinId: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        moveType: change24h > 0 ? "pump" : "dump",
        magnitude: change24h,
        price: coin.current_price,
        marketCap: coin.market_cap,
        volume24h: coin.total_volume,
        volumeRatio: null, // Would need historical data
        btcRelative,
        rank: coin.market_cap_rank,
        metadata: {
          timeframe: "24h",
          change1h,
          change7d: coin.price_change_percentage_7d_in_currency,
        },
        detectedAt: now,
      });
    }
    // Check for 1h significant move (lower threshold)
    else if (Math.abs(change1h) >= thresholdPercent * 0.5) {
      events.push({
        coinId: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        moveType: change1h > 0 ? "pump" : "dump",
        magnitude: change1h,
        price: coin.current_price,
        marketCap: coin.market_cap,
        volume24h: coin.total_volume,
        volumeRatio: null,
        btcRelative,
        rank: coin.market_cap_rank,
        metadata: {
          timeframe: "1h",
          change24h,
        },
        detectedAt: now,
      });
    }
  }

  // Sort by magnitude (most significant first)
  events.sort((a, b) => Math.abs(b.magnitude) - Math.abs(a.magnitude));

  return events;
}

/**
 * Get severity level of a move
 */
export function getMoveSeverity(magnitude: number): "notable" | "significant" | "major" | "extreme" {
  const abs = Math.abs(magnitude);
  if (abs >= 50) return "extreme";
  if (abs >= 25) return "major";
  if (abs >= 15) return "significant";
  return "notable";
}

/**
 * Format a mover event for display
 */
export function formatMoverAlert(event: MoverEvent): string {
  const emoji = event.magnitude > 0 ? "🚀" : "📉";
  const severity = getMoveSeverity(event.magnitude);
  const severityEmoji =
    severity === "extreme" ? "🔥🔥🔥" : severity === "major" ? "🔥🔥" : severity === "significant" ? "🔥" : "";

  const lines = [
    `${emoji} ${severityEmoji} **${event.symbol.toUpperCase()}** (${event.name})`,
    ``,
    `📊 **Change:** ${event.magnitude > 0 ? "+" : ""}${event.magnitude.toFixed(2)}%`,
    `💰 **Price:** $${formatPrice(event.price)}`,
    `📈 **Market Cap:** $${formatNumber(event.marketCap)}`,
    `💎 **Volume 24h:** $${formatNumber(event.volume24h)}`,
  ];

  if (event.btcRelative !== null && Math.abs(event.btcRelative) > 2) {
    const vs = event.btcRelative > 0 ? "outperforming" : "underperforming";
    lines.push(`₿ **vs BTC:** ${vs} by ${Math.abs(event.btcRelative).toFixed(1)}%`);
  }

  if (event.rank) {
    lines.push(`🏆 **Rank:** #${event.rank}`);
  }

  lines.push(``, `⏰ _${event.detectedAt.toISOString()}_`);

  // Add links
  lines.push(
    ``,
    `[CoinGecko](https://www.coingecko.com/en/coins/${event.coinId}) | [TradingView](https://www.tradingview.com/symbols/${event.symbol.toUpperCase()}USD/)`
  );

  return lines.join("\n");
}

function formatPrice(price: number): string {
  if (price >= 1) return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (price >= 0.01) return price.toFixed(4);
  return price.toFixed(6);
}

function formatNumber(num: number): string {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + "B";
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + "M";
  if (num >= 1_000) return (num / 1_000).toFixed(2) + "K";
  return num.toFixed(2);
}
