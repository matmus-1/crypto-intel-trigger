/**
 * Send Alerts - Background Task
 * Sends Telegram alerts for detected movers with buy/sell signals
 */

import { task } from "@trigger.dev/sdk/v3";
import { sendTelegramMessage } from "@/lib/telegram";

interface MoverWithPrediction {
  id?: string;
  symbol: string;
  name: string;
  magnitude: number;
  price: number;
  marketCap: number;
  volume24h: number;
  btcRelative: number | null;
  rank: number | null;
  prediction?: {
    direction: "up" | "down";
    confidence: number;
    reasoning: string;
  };
}

interface AlertPayload {
  movers: MoverWithPrediction[];
  historicalAccuracy?: string;
}

export const sendAlerts = task({
  id: "send-alerts",
  retry: {
    maxAttempts: 3,
  },

  run: async (payload: AlertPayload) => {
    const { movers, historicalAccuracy } = payload;

    if (movers.length === 0) {
      return { sent: 0 };
    }

    console.log(`Sending alerts for ${movers.length} movers`);

    let sentCount = 0;

    // Send individual alerts for top 3 most significant moves
    const topMovers = movers.slice(0, 3);

    for (const mover of topMovers) {
      const message = formatAlertWithSignal(mover, historicalAccuracy);
      const success = await sendTelegramMessage(message);

      if (success) {
        sentCount++;
      }

      // Rate limit: wait 1 second between messages
      await new Promise((r) => setTimeout(r, 1000));
    }

    // If there are more than 3 movers, send a summary
    if (movers.length > 3) {
      const remainingMovers = movers.slice(3);
      const summaryLines = [
        "",
        "📊 *Additional Movers:*",
        "",
      ];

      remainingMovers.forEach((mover, i) => {
        const emoji = mover.magnitude > 0 ? "🚀" : "📉";
        const sign = mover.magnitude > 0 ? "+" : "";
        const signal = getSignal(mover);
        summaryLines.push(
          `${i + 4}. ${emoji} ${mover.symbol.toUpperCase()}: ${sign}${mover.magnitude.toFixed(1)}% ${signal}`
        );
      });

      await sendTelegramMessage(summaryLines.join("\n"));
    }

    return {
      sent: sentCount,
      total: movers.length,
    };
  },
});

function getSignal(mover: MoverWithPrediction): string {
  if (!mover.prediction) return "";

  const isPump = mover.magnitude > 0;
  const predictUp = mover.prediction.direction === "up";
  const confidence = mover.prediction.confidence;

  // High confidence signals only
  if (confidence < 0.5) return "⚪️";

  if (isPump && !predictUp) return "🔴"; // Pump but predicts down = SELL
  if (isPump && predictUp) return "🟢"; // Pump and predicts up = HOLD/BUY MORE
  if (!isPump && predictUp) return "🟢"; // Dump but predicts up = BUY
  if (!isPump && !predictUp) return "🔴"; // Dump and predicts down = AVOID

  return "⚪️";
}

function formatAlertWithSignal(mover: MoverWithPrediction, historicalAccuracy?: string): string {
  const isPump = mover.magnitude > 0;
  const emoji = isPump ? "🚀" : "📉";
  const sign = isPump ? "+" : "";

  const lines = [
    `${emoji} *${mover.symbol.toUpperCase()}* (${mover.name})`,
    ``,
    `📊 *Change:* ${sign}${mover.magnitude.toFixed(2)}%`,
    `💰 *Price:* $${formatPrice(mover.price)}`,
    `📈 *Market Cap:* $${formatNumber(mover.marketCap)}`,
    `💎 *Volume 24h:* $${formatNumber(mover.volume24h)}`,
  ];

  if (mover.rank) {
    lines.push(`🏆 *Rank:* #${mover.rank}`);
  }

  // Add prediction and signal
  if (mover.prediction) {
    const { direction, confidence, reasoning } = mover.prediction;
    const confidencePct = (confidence * 100).toFixed(0);

    lines.push(``);
    lines.push(`━━━━━━━━━━━━━━━`);
    lines.push(`🤖 *AI PREDICTION*`);
    lines.push(``);

    // Determine signal
    let signal: string;
    let signalEmoji: string;

    if (isPump) {
      if (direction === "down") {
        signal = "SELL / Take Profits";
        signalEmoji = "🔴";
      } else {
        signal = "HOLD / Buy More";
        signalEmoji = "🟢";
      }
    } else {
      if (direction === "up") {
        signal = "BUY / Accumulate";
        signalEmoji = "🟢";
      } else {
        signal = "AVOID / Wait";
        signalEmoji = "🔴";
      }
    }

    lines.push(`${signalEmoji} *Signal:* ${signal}`);
    lines.push(`📈 *Predicts:* ${direction.toUpperCase()} (${confidencePct}% confidence)`);

    if (reasoning) {
      lines.push(`💡 ${reasoning}`);
    }

    if (historicalAccuracy && historicalAccuracy !== "N/A") {
      lines.push(`📊 *Model Accuracy:* ${historicalAccuracy}`);
    }
  }

  lines.push(``);
  lines.push(`⚠️ _Not financial advice. DYOR._`);
  lines.push(``);
  lines.push(`[CoinGecko](https://coingecko.com/en/coins/${mover.symbol}) | [TradingView](https://tradingview.com/symbols/${mover.symbol.toUpperCase()}USD/)`);

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
