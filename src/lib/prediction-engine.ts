/**
 * Prediction Engine
 * Makes predictions based on historical patterns and learns from outcomes
 */

export interface PredictionInput {
  coinId: string;
  symbol: string;
  magnitude: number;
  moveType: "pump" | "dump";
  marketCap: number;
  volume24h: number;
  rank: number | null;
}

export interface Prediction {
  direction: "up" | "down";
  confidence: number;
  reasoning: string;
  similarEvents: Array<{
    coinId: string;
    symbol: string;
    magnitude: number;
    outcome: number;
    date: string;
  }>;
}

export interface HistoricalEvent {
  coin_id: string;
  symbol: string;
  magnitude: number;
  move_type: string;
  market_cap: number;
  detected_at: string;
  outcome_24h?: number;
}

/**
 * Find similar historical events based on move characteristics
 */
export function findSimilarEvents(
  current: PredictionInput,
  history: HistoricalEvent[]
): HistoricalEvent[] {
  return history
    .filter((event) => {
      // Same direction (pump or dump)
      const sameDirection =
        (current.moveType === "pump" && event.magnitude > 0) ||
        (current.moveType === "dump" && event.magnitude < 0);

      // Similar magnitude (within 50% range)
      const magnitudeRatio = Math.abs(event.magnitude) / Math.abs(current.magnitude);
      const similarMagnitude = magnitudeRatio >= 0.5 && magnitudeRatio <= 2.0;

      // Similar market cap tier
      const mcTier = getMarketCapTier(current.marketCap);
      const eventMcTier = getMarketCapTier(event.market_cap);
      const similarSize = mcTier === eventMcTier;

      return sameDirection && similarMagnitude && similarSize;
    })
    .slice(0, 20); // Top 20 similar events
}

/**
 * Categorize market cap into tiers
 */
function getMarketCapTier(marketCap: number): string {
  if (marketCap >= 10_000_000_000) return "large"; // $10B+
  if (marketCap >= 1_000_000_000) return "mid"; // $1B+
  if (marketCap >= 100_000_000) return "small"; // $100M+
  return "micro"; // < $100M
}

/**
 * Make a prediction based on historical patterns
 */
export function makePrediction(
  input: PredictionInput,
  similarEvents: HistoricalEvent[],
  historicalAccuracy: number | null
): Prediction {
  // Default prediction based on move type
  // Pumps often have pullbacks, dumps often continue
  const defaultDirection = input.moveType === "pump" ? "down" : "down";
  let direction: "up" | "down" = defaultDirection;
  let confidence = 0.5;
  let reasoning = "";

  if (similarEvents.length === 0) {
    reasoning = `No similar historical events found. Default prediction based on typical ${input.moveType} behavior.`;
    return { direction, confidence: 0.4, reasoning, similarEvents: [] };
  }

  // Analyze outcomes of similar events
  const eventsWithOutcome = similarEvents.filter((e) => e.outcome_24h !== undefined);

  if (eventsWithOutcome.length > 0) {
    const avgOutcome =
      eventsWithOutcome.reduce((sum, e) => sum + (e.outcome_24h || 0), 0) /
      eventsWithOutcome.length;

    const positiveOutcomes = eventsWithOutcome.filter((e) => (e.outcome_24h || 0) > 0).length;
    const positiveRatio = positiveOutcomes / eventsWithOutcome.length;

    // Determine direction based on historical outcomes
    direction = avgOutcome > 0 ? "up" : "down";

    // Calculate confidence based on consistency of outcomes
    const consistency = Math.abs(positiveRatio - 0.5) * 2; // 0 to 1 scale
    confidence = 0.4 + consistency * 0.4; // 0.4 to 0.8 range

    // Adjust confidence based on historical accuracy
    if (historicalAccuracy !== null) {
      confidence = confidence * 0.7 + historicalAccuracy * 0.3;
    }

    reasoning = `Based on ${eventsWithOutcome.length} similar events: ${(positiveRatio * 100).toFixed(0)}% continued up, avg 24h change: ${avgOutcome > 0 ? "+" : ""}${avgOutcome.toFixed(1)}%`;
  } else {
    reasoning = `Found ${similarEvents.length} similar events but no outcome data yet. Using pattern-based prediction.`;
  }

  return {
    direction,
    confidence: Math.min(0.95, Math.max(0.1, confidence)),
    reasoning,
    similarEvents: eventsWithOutcome.slice(0, 5).map((e) => ({
      coinId: e.coin_id,
      symbol: e.symbol,
      magnitude: e.magnitude,
      outcome: e.outcome_24h || 0,
      date: e.detected_at,
    })),
  };
}

/**
 * Calculate prediction accuracy from historical predictions
 */
export function calculateAccuracy(
  predictions: Array<{
    predicted_direction: string;
    actual_change: number | null;
    status: string;
  }>
): { accuracy: number; total: number; correct: number } {
  const evaluated = predictions.filter(
    (p) => p.status !== "pending" && p.actual_change !== null
  );

  if (evaluated.length === 0) {
    return { accuracy: 0, total: 0, correct: 0 };
  }

  const correct = evaluated.filter((p) => {
    const predictedUp = p.predicted_direction === "up";
    const actualUp = (p.actual_change || 0) > 0;
    return predictedUp === actualUp;
  }).length;

  return {
    accuracy: correct / evaluated.length,
    total: evaluated.length,
    correct,
  };
}
