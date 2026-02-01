/**
 * Run Research - Background Task
 * Uses Claude to analyze why a coin moved significantly
 */

import { task } from "@trigger.dev/sdk/v3";
import { sendResearchAlert } from "@/lib/telegram";

interface ResearchPayload {
  eventId: string;
  coinId: string;
  symbol: string;
  magnitude: number;
}

interface ResearchResult {
  catalyst: string;
  catalyst_confidence: number;
  sentiment: {
    label: string;
    score: number;
    reasoning: string;
  };
  key_factors: string[];
  risks: string[];
  continuation_probability: number;
  summary: string;
  recommended_action: string;
}

// Create Supabase client inline to avoid import-time initialization
async function createSupabaseClient() {
  const { createClient } = await import("@supabase/supabase-js");
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Create Anthropic client inline
async function createAnthropicClient() {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  return new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
}

export const runResearch = task({
  id: "run-research",
  retry: {
    maxAttempts: 2,
  },

  run: async (payload: ResearchPayload) => {
    const { eventId, symbol, magnitude } = payload;

    console.log(`Running research for ${symbol} (${magnitude > 0 ? "+" : ""}${magnitude.toFixed(1)}%)`);

    // Get clients
    const supabase = await createSupabaseClient();
    const anthropic = await createAnthropicClient();

    // 1. Get the mover event details
    const { data: event } = await supabase
      .from("mover_events")
      .select("*")
      .eq("id", eventId)
      .single();

    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    // 2. Fetch recent news (if CryptoPanic API key is set)
    const newsArticles = await fetchNews(symbol);

    // 3. Build context for Claude
    const context = buildContext(event, newsArticles);

    // 4. Call Claude API
    const systemPrompt = `You are a cryptocurrency market analyst specializing in identifying catalysts for significant price movements. Your job is to analyze market events and provide clear, actionable insights.

When analyzing a crypto move, you should:
1. Identify the most likely catalyst(s) for the move
2. Assess whether the move is likely to continue or reverse
3. Provide a sentiment assessment
4. Rate your confidence in the analysis

Be concise but thorough. Focus on facts and data-driven insights. Avoid speculation without evidence.`;

    const userPrompt = `Analyze this cryptocurrency price movement and provide your findings.

${context}

Please provide your analysis in the following JSON format:
{
    "catalyst": "Brief description of the most likely catalyst for this move",
    "catalyst_confidence": 0.0-1.0,
    "sentiment": {
        "label": "bullish/bearish/neutral",
        "score": -1.0 to 1.0,
        "reasoning": "Brief explanation"
    },
    "key_factors": ["factor1", "factor2", "factor3"],
    "risks": ["risk1", "risk2"],
    "continuation_probability": 0.0-1.0,
    "summary": "2-3 sentence executive summary",
    "recommended_action": "Watch/Consider Entry/Avoid/Take Profits"
}

Respond ONLY with the JSON, no additional text.`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    // 5. Parse response
    let analysis: ResearchResult;
    const content = response.content[0];

    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    try {
      // Clean up potential markdown code blocks
      let jsonText = content.text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.split("```")[1];
        if (jsonText.startsWith("json")) {
          jsonText = jsonText.slice(4);
        }
      }
      analysis = JSON.parse(jsonText.trim());
    } catch (e) {
      console.error("Failed to parse Claude response:", content.text);
      throw new Error("Failed to parse research response");
    }

    // 6. Store research report
    await supabase.from("research_reports").insert({
      mover_event_id: eventId,
      catalyst: analysis.catalyst,
      catalyst_confidence: analysis.catalyst_confidence,
      news_summary: analysis.summary,
      sentiment_label: analysis.sentiment.label,
      sentiment_score: analysis.sentiment.score,
      key_factors: analysis.key_factors,
      risks: analysis.risks,
      full_analysis: JSON.stringify(analysis),
      news_articles: newsArticles,
      tokens_used: response.usage.input_tokens + response.usage.output_tokens,
    });

    // 7. Send research alert to Telegram
    await sendResearchAlert(symbol, magnitude, {
      catalyst: analysis.catalyst,
      sentiment: `${analysis.sentiment.label} (${(analysis.sentiment.score * 100).toFixed(0)}%)`,
      keyFactors: analysis.key_factors,
    });

    // 8. Update daily stats - increment research_count
    const today = new Date().toISOString().split("T")[0];
    const { data: stats } = await supabase
      .from("daily_stats")
      .select("research_count")
      .eq("date", today)
      .single();

    if (stats) {
      await supabase
        .from("daily_stats")
        .update({ research_count: (stats.research_count || 0) + 1 })
        .eq("date", today);
    }

    return {
      eventId,
      symbol,
      catalyst: analysis.catalyst,
      sentiment: analysis.sentiment.label,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  },
});

function buildContext(
  event: Record<string, unknown>,
  newsArticles: Array<{ title: string; source: string; published_at: string }>
): string {
  const sections: string[] = [];

  // Event details
  sections.push(`## Event Details
- **Coin**: ${event.symbol} (${event.name})
- **Move Type**: ${event.move_type}
- **Magnitude**: ${Number(event.magnitude) > 0 ? "+" : ""}${Number(event.magnitude).toFixed(2)}%
- **Detected**: ${event.detected_at}
- **Price**: $${Number(event.price).toFixed(6)}
- **Market Cap**: $${Number(event.market_cap).toLocaleString()}
- **24h Volume**: $${Number(event.volume_24h).toLocaleString()}
- **Rank**: #${event.rank || "N/A"}`);

  // News articles
  if (newsArticles.length > 0) {
    sections.push("\n## Recent News Articles");
    newsArticles.slice(0, 10).forEach((article, i) => {
      sections.push(`
### Article ${i + 1}
- **Title**: ${article.title}
- **Source**: ${article.source}
- **Date**: ${article.published_at}`);
    });
  } else {
    sections.push("\n## News\nNo recent news articles found for this coin.");
  }

  return sections.join("\n");
}

async function fetchNews(
  symbol: string
): Promise<Array<{ title: string; source: string; published_at: string }>> {
  const apiKey = process.env.CRYPTOPANIC_API_KEY;

  if (!apiKey) {
    return [];
  }

  try {
    const url = new URL("https://cryptopanic.com/api/v1/posts/");
    url.searchParams.set("auth_token", apiKey);
    url.searchParams.set("currencies", symbol.toUpperCase());
    url.searchParams.set("filter", "important");
    url.searchParams.set("public", "true");

    const response = await fetch(url.toString());

    if (!response.ok) {
      console.error("CryptoPanic API error:", response.status);
      return [];
    }

    const data = await response.json();

    return (data.results || []).slice(0, 10).map((article: Record<string, unknown>) => ({
      title: article.title,
      source: (article.source as Record<string, unknown>)?.title || "Unknown",
      published_at: article.published_at,
    }));
  } catch (error) {
    console.error("Failed to fetch news:", error);
    return [];
  }
}
