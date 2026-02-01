/**
 * Telegram Bot Client
 * Sends alerts to Telegram channel/chat
 */

const TELEGRAM_API = "https://api.telegram.org/bot";

interface TelegramConfig {
  botToken: string;
  chatId: string;
}

function getConfig(): TelegramConfig {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set");
  }

  return { botToken, chatId };
}

/**
 * Send a message to Telegram
 */
export async function sendTelegramMessage(
  text: string,
  options: {
    parseMode?: "Markdown" | "HTML";
    disablePreview?: boolean;
  } = {}
): Promise<boolean> {
  const { botToken, chatId } = getConfig();
  const { parseMode = "Markdown", disablePreview = true } = options;

  const url = `${TELEGRAM_API}${botToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: disablePreview,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Telegram API error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return false;
  }
}

/**
 * Send a batch alert with multiple movers
 */
export async function sendBatchAlert(
  movers: Array<{
    symbol: string;
    magnitude: number;
    price: number;
  }>,
  title: string = "Market Movers Alert"
): Promise<boolean> {
  if (movers.length === 0) return true;

  const lines = [
    `*${title}*`,
    `_${new Date().toISOString()}_`,
    "",
  ];

  movers.slice(0, 10).forEach((mover, i) => {
    const emoji = mover.magnitude > 0 ? "🚀" : "📉";
    const sign = mover.magnitude > 0 ? "+" : "";
    lines.push(
      `${i + 1}. ${emoji} *${mover.symbol.toUpperCase()}* ${sign}${mover.magnitude.toFixed(1)}% ($${formatPrice(mover.price)})`
    );
  });

  return sendTelegramMessage(lines.join("\n"));
}

/**
 * Send research summary alert
 */
export async function sendResearchAlert(
  symbol: string,
  magnitude: number,
  research: {
    catalyst?: string;
    sentiment?: string;
    keyFactors?: string[];
  }
): Promise<boolean> {
  const emoji = magnitude > 0 ? "🚀" : "📉";

  const lines = [
    `📋 *Research Summary: ${symbol.toUpperCase()}*`,
    `${emoji} Move: ${magnitude > 0 ? "+" : ""}${magnitude.toFixed(1)}%`,
    "",
  ];

  if (research.catalyst) {
    lines.push(`*Likely Catalyst:*`);
    lines.push(research.catalyst.slice(0, 300));
    lines.push("");
  }

  if (research.sentiment) {
    lines.push(`*Sentiment:* ${research.sentiment}`);
  }

  if (research.keyFactors && research.keyFactors.length > 0) {
    lines.push("");
    lines.push("*Key Factors:*");
    research.keyFactors.slice(0, 5).forEach((factor) => {
      lines.push(`• ${factor}`);
    });
  }

  return sendTelegramMessage(lines.join("\n"));
}

/**
 * Send prediction alert
 */
export async function sendPredictionAlert(
  symbol: string,
  direction: "up" | "down",
  confidence: number,
  reasoning: string
): Promise<boolean> {
  const emoji = confidence > 0.7 ? "🎯" : confidence > 0.5 ? "📊" : "🔮";
  const dirEmoji = direction === "up" ? "📈" : "📉";

  const lines = [
    `${emoji} *Prediction Alert: ${symbol.toUpperCase()}*`,
    "",
    `${dirEmoji} *Direction:* ${direction.toUpperCase()}`,
    `*Confidence:* ${(confidence * 100).toFixed(0)}%`,
    "",
    `*Analysis:*`,
    reasoning.slice(0, 400),
    "",
    "⚠️ _This is not financial advice. DYOR._",
  ];

  return sendTelegramMessage(lines.join("\n"));
}

/**
 * Send daily summary
 */
export async function sendDailySummary(stats: {
  totalMovers: number;
  pumps: number;
  dumps: number;
  topGainers: Array<{ symbol: string; change: number }>;
  topLosers: Array<{ symbol: string; change: number }>;
  accuracy?: number;
}): Promise<boolean> {
  const lines = [
    `📊 *Daily Market Summary*`,
    `_${new Date().toISOString().split("T")[0]}_`,
    "",
    `*Events Today:* ${stats.totalMovers}`,
    `🚀 Pumps: ${stats.pumps} | 📉 Dumps: ${stats.dumps}`,
    "",
    "*Top Gainers:*",
  ];

  stats.topGainers.slice(0, 5).forEach((coin, i) => {
    lines.push(`${i + 1}. ${coin.symbol.toUpperCase()}: +${coin.change.toFixed(1)}%`);
  });

  lines.push("", "*Top Losers:*");

  stats.topLosers.slice(0, 5).forEach((coin, i) => {
    lines.push(`${i + 1}. ${coin.symbol.toUpperCase()}: ${coin.change.toFixed(1)}%`);
  });

  if (stats.accuracy !== undefined) {
    lines.push("", `*Prediction Accuracy:* ${(stats.accuracy * 100).toFixed(0)}%`);
  }

  return sendTelegramMessage(lines.join("\n"));
}

function formatPrice(price: number): string {
  if (price >= 1) return price.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return price.toFixed(6);
}
