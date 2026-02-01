/**
 * CoinGecko API Client
 * Fetches cryptocurrency market data
 */

const BASE_URL = "https://api.coingecko.com/api/v3";
const PRO_BASE_URL = "https://pro-api.coingecko.com/api/v3";

export interface CoinMarketData {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number | null;
  total_volume: number;
  price_change_percentage_1h_in_currency: number | null;
  price_change_percentage_24h: number | null;
  price_change_percentage_7d_in_currency: number | null;
}

export interface MarketSnapshot {
  coins: CoinMarketData[];
  timestamp: Date;
  btcChange24h: number;
}

// Get config at runtime (not import time)
function getConfig() {
  const apiKey = process.env.COINGECKO_API_KEY || null;
  const isPro = apiKey ? !apiKey.startsWith("CG-") : false;
  const baseUrl = isPro ? PRO_BASE_URL : BASE_URL;
  return { apiKey, isPro, baseUrl };
}

async function fetchFromCoinGecko<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const { apiKey, isPro, baseUrl } = getConfig();

  const url = new URL(`${baseUrl}${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.append(key, value);
  });

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  // Use appropriate header based on key type
  if (apiKey) {
    if (isPro) {
      headers["x-cg-pro-api-key"] = apiKey;
    } else {
      headers["x-cg-demo-api-key"] = apiKey;
    }
  }

  console.log(`Fetching CoinGecko: ${endpoint}, hasKey: ${!!apiKey}, isPro: ${isPro}`);

  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("Rate limited by CoinGecko. Try again later.");
    }
    const errorText = await response.text();
    console.error("CoinGecko error response:", errorText);
    throw new Error(`CoinGecko API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch market data for coins
 * @param page Page number (250 coins per page)
 */
async function getMarketData(page: number = 1): Promise<CoinMarketData[]> {
  return fetchFromCoinGecko<CoinMarketData[]>("/coins/markets", {
    vs_currency: "usd",
    order: "market_cap_desc",
    per_page: "250",
    page: page.toString(),
    sparkline: "false",
    price_change_percentage: "1h,24h,7d",
  });
}

/**
 * Fetch all market data up to maxCoins
 */
async function getAllMarketData(maxCoins: number = 1000): Promise<MarketSnapshot> {
  const allCoins: CoinMarketData[] = [];
  let page = 1;

  while (allCoins.length < maxCoins) {
    const coins = await getMarketData(page);

    if (coins.length === 0) break;

    // Filter by minimum market cap and volume
    const filtered = coins.filter(
      (c) =>
        (c.market_cap || 0) >= 1_000_000 && // Min $1M market cap
        (c.total_volume || 0) >= 100_000 // Min $100k volume
    );

    allCoins.push(...filtered);
    page++;

    // Rate limiting pause (Demo API has lower limits)
    await new Promise((r) => setTimeout(r, 1500));
  }

  // Get BTC change for relative calculations
  const btc = allCoins.find((c) => c.id === "bitcoin");
  const btcChange24h = btc?.price_change_percentage_24h || 0;

  return {
    coins: allCoins.slice(0, maxCoins),
    timestamp: new Date(),
    btcChange24h,
  };
}

/**
 * Fetch data for specific coins
 */
async function getCoinsData(coinIds: string[]): Promise<CoinMarketData[]> {
  return fetchFromCoinGecko<CoinMarketData[]>("/coins/markets", {
    vs_currency: "usd",
    ids: coinIds.join(","),
    order: "market_cap_desc",
    sparkline: "false",
    price_change_percentage: "1h,24h,7d",
  });
}

export const coingecko = {
  getAllMarketData,
  getMarketData,
  getCoinsData,
};
