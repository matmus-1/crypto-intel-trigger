/**
 * Send Alerts - Background Task
 * Sends Telegram alerts for detected movers
 */

import { task } from "@trigger.dev/sdk/v3";
import { sendTelegramMessage } from "@/lib/telegram";
import { formatMoverAlert, type MoverEvent } from "@/lib/mover-detector";

interface AlertPayload {
  movers: Array<{
    id?: string;
    symbol: string;
    name: string;
    magnitude: number;
    price: number;
    marketCap: number;
    volume24h: number;
    btcRelative: number | null;
    rank: number | null;
  }>;
}

export const sendAlerts = task({
  id: "send-alerts",
  retry: {
    maxAttempts: 3,
  },

  run: async (payload: AlertPayload) => {
    const { movers } = payload;

    if (movers.length === 0) {
      return { sent: 0 };
    }

    console.log(`Sending alerts for ${movers.length} movers`);

    let sentCount = 0;

    // Send individual alerts for top 3 most significant moves
    const topMovers = movers.slice(0, 3);

    for (const mover of topMovers) {
      const event: MoverEvent = {
        coinId: mover.symbol,
        symbol: mover.symbol,
        name: mover.name,
        moveType: mover.magnitude > 0 ? "pump" : "dump",
        magnitude: mover.magnitude,
        price: mover.price,
        marketCap: mover.marketCap,
        volume24h: mover.volume24h,
        volumeRatio: null,
        btcRelative: mover.btcRelative,
        rank: mover.rank,
        metadata: {},
        detectedAt: new Date(),
      };

      const message = formatMoverAlert(event);
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
        summaryLines.push(
          `${i + 4}. ${emoji} ${mover.symbol.toUpperCase()}: ${sign}${mover.magnitude.toFixed(1)}%`
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
