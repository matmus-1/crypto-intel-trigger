# Crypto Intelligence System - Complete Roadmap

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SYSTEM ARCHITECTURE                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   USER                                                                       │
│     │                                                                        │
│     │  Telegram Alerts                                                       │
│     ▼                                                                        │
│   ┌─────────────┐                                                           │
│   │  Telegram   │◀─────────────────────────────────────────┐                │
│   │    Bot      │                                          │                │
│   └─────────────┘                                          │                │
│                                                             │                │
│   ┌─────────────────────────────────────────────────────────┴──────────┐    │
│   │                        TRIGGER.DEV                                  │    │
│   │                    (Background Jobs)                                │    │
│   │                                                                     │    │
│   │   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐  │    │
│   │   │ collect-prices  │   │  send-alerts    │   │  run-research   │  │    │
│   │   │                 │   │                 │   │                 │  │    │
│   │   │ • Every 5 min   │──▶│ • On mover      │   │ • On mover      │  │    │
│   │   │ • Fetch prices  │   │ • Format msg    │   │ • Call Claude   │  │    │
│   │   │ • Detect movers │   │ • Send Telegram │   │ • Store report  │  │    │
│   │   └─────────────────┘   └─────────────────┘   └─────────────────┘  │    │
│   │            │                                          │             │    │
│   │            │         ┌─────────────────┐              │             │    │
│   │            │         │ evaluate-preds  │              │             │    │
│   │            │         │ • Every hour    │              │             │    │
│   │            │         │ • Check outcomes│              │             │    │
│   │            │         └─────────────────┘              │             │    │
│   │            │                  │                       │             │    │
│   └────────────┼──────────────────┼───────────────────────┼─────────────┘    │
│                │                  │                       │                  │
│                ▼                  ▼                       ▼                  │
│   ┌─────────────────────────────────────────────────────────────────────┐    │
│   │                          SUPABASE                                    │    │
│   │                      (PostgreSQL Database)                           │    │
│   │                                                                      │    │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │    │
│   │   │    coins     │  │mover_events  │  │  research    │              │    │
│   │   │              │  │              │  │  _reports    │              │    │
│   │   │ • id         │  │ • id         │  │              │              │    │
│   │   │ • symbol     │  │ • coin_id    │  │ • event_id   │              │    │
│   │   │ • name       │  │ • magnitude  │  │ • catalyst   │              │    │
│   │   └──────────────┘  │ • move_type  │  │ • sentiment  │              │    │
│   │                     └──────────────┘  └──────────────┘              │    │
│   │                                                                      │    │
│   │   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │    │
│   │   │price_snapshots│ │ predictions  │  │ daily_stats  │              │    │
│   │   │              │  │              │  │              │              │    │
│   │   │ • coin_id    │  │ • direction  │  │ • date       │              │    │
│   │   │ • price      │  │ • confidence │  │ • totals     │              │    │
│   │   │ • volume     │  │ • status     │  │ • accuracy   │              │    │
│   │   └──────────────┘  └──────────────┘  └──────────────┘              │    │
│   │                                                                      │    │
│   └──────────────────────────────────────────────────────────────────────┘    │
│                                       ▲                                       │
│                                       │                                       │
│   ┌───────────────────────────────────┴───────────────────────────────────┐  │
│   │                            VERCEL                                      │  │
│   │                        (API + Frontend)                                │  │
│   │                                                                        │  │
│   │   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │  │
│   │   │ /api/health │  │ /api/movers │  │/api/research│  │ /api/stats  │  │  │
│   │   └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘  │  │
│   │                                                                        │  │
│   └────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│   EXTERNAL APIS                                                               │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                          │
│   │  CoinGecko  │  │   Claude    │  │ CryptoPanic │                          │
│   │  (Prices)   │  │ (Research)  │  │   (News)    │                          │
│   │   FREE      │  │  PAY/USE    │  │  OPTIONAL   │                          │
│   └─────────────┘  └─────────────┘  └─────────────┘                          │
│                                                                               │
└───────────────────────────────────────────────────────────────────────────────┘
```

---

## What's Built (Phase 1) ✅ COMPLETE

### Core Infrastructure

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| Project config | `package.json`, `tsconfig.json` | ✅ | TypeScript + Next.js setup |
| Trigger config | `trigger.config.ts` | ✅ | Background job configuration |
| Environment | `.env.example` | ✅ | All configuration variables |

### Database Layer

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| Schema | `supabase/migrations/001_initial_schema.sql` | ✅ | All tables, indexes, functions |
| Types | `src/lib/database.types.ts` | ✅ | TypeScript type definitions |
| Client | `src/lib/supabase.ts` | ✅ | Supabase client setup |

### Data Collection

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| CoinGecko client | `src/lib/coingecko.ts` | ✅ | Price data fetching |
| Mover detector | `src/lib/mover-detector.ts` | ✅ | Pump/dump detection |

### Background Jobs (Trigger.dev)

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| Price collector | `src/trigger/collect-prices.ts` | ✅ | Runs every 5 minutes |
| Alert sender | `src/trigger/send-alerts.ts` | ✅ | Telegram notifications |
| Research agent | `src/trigger/run-research.ts` | ✅ | Claude AI analysis |

### API Layer (Vercel)

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| Health check | `src/app/api/health/route.ts` | ✅ | System status |
| Movers endpoint | `src/app/api/movers/route.ts` | ✅ | List recent movers |
| Research endpoint | `src/app/api/research/[id]/route.ts` | ✅ | Get research reports |
| Stats endpoint | `src/app/api/stats/route.ts` | ✅ | System statistics |

### Notifications

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| Telegram client | `src/lib/telegram.ts` | ✅ | All alert functions |

---

## What Needs Building (Future Phases)

### Phase 2: Pattern System (1-2 weeks)

| Component | Description | Priority |
|-----------|-------------|----------|
| Volume history tracking | Store 7-day rolling average volume for each coin | High |
| Pattern embeddings | Generate embeddings for each mover event | High |
| Similarity search | Find similar historical patterns | High |
| ChromaDB integration | Vector storage for pattern matching | Medium |

**Files to create:**
```
src/lib/embeddings.ts       # Generate embeddings via Claude
src/lib/vector-store.ts     # ChromaDB client
src/trigger/store-pattern.ts # Background job to store patterns
```

### Phase 3: ML Predictions (2-3 weeks)

| Component | Description | Priority |
|-----------|-------------|----------|
| Feature extraction | Extract numerical features from events | High |
| Prediction model | Simple classifier for direction prediction | High |
| Outcome tracking | Track if predictions were correct | High |
| Model retraining | Periodic retraining with new data | Medium |

**Files to create:**
```
src/lib/features.ts              # Feature extraction
src/lib/predictor.ts             # Prediction logic
src/trigger/make-predictions.ts  # Generate predictions
src/trigger/evaluate-predictions.ts # Check outcomes
src/trigger/retrain-model.ts     # Weekly retraining
```

### Phase 4: Self-Learning (1-2 weeks)

| Component | Description | Priority |
|-----------|-------------|----------|
| Accuracy tracking | Track prediction accuracy over time | High |
| Confidence calibration | Adjust confidence scores based on accuracy | Medium |
| Feature importance | Identify which features matter most | Medium |
| Automated alerts | Alert when model performance drops | Low |

### Phase 5: Dashboard (Optional, 2-3 weeks)

| Component | Description | Priority |
|-----------|-------------|----------|
| Live movers view | Real-time display of current movers | Medium |
| Research viewer | Read research reports in UI | Medium |
| Accuracy charts | Visualize prediction performance | Low |
| Settings management | Configure thresholds and alerts | Low |

---

## Monthly Cost Breakdown

### Minimum Setup (Free Tier Everything)

| Service | Free Tier Limits | Expected Usage | Cost |
|---------|------------------|----------------|------|
| **Vercel** | 100GB bandwidth, 100 hours compute | ~1GB, ~10 hours | $0 |
| **Trigger.dev** | 50,000 runs/month | ~9,000 runs | $0 |
| **Supabase** | 500MB database, 2GB bandwidth | ~100-200MB | $0 |
| **CoinGecko** | 30 calls/min | ~12 calls/5min | $0 |
| **Claude API** | Pay per use | See below | $20-50 |
| **Telegram** | Unlimited | N/A | $0 |

### Claude API Cost Estimates

| Usage Level | Researches/Day | Tokens/Research | Monthly Cost |
|-------------|----------------|-----------------|--------------|
| Light | 5 | ~3,000 | $10-15 |
| Medium | 15 | ~3,000 | $30-40 |
| Heavy | 30 | ~3,000 | $60-80 |

**Calculation:**
- Input: ~2,000 tokens × $0.003/1K = $0.006
- Output: ~1,000 tokens × $0.015/1K = $0.015
- Per research: ~$0.02
- 20 researches/day × 30 days = $12/month

### Total Monthly Costs

| Scenario | Hosting | Database | API | Total |
|----------|---------|----------|-----|-------|
| **Minimum** | $0 | $0 | $15 | **$15/mo** |
| **Typical** | $0 | $0 | $35 | **$35/mo** |
| **Heavy** | $0 | $25 | $80 | **$105/mo** |

---

## File Structure

```
crypto-intel-trigger/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/
│   │   │   ├── health/
│   │   │   │   └── route.ts      # GET /api/health
│   │   │   ├── movers/
│   │   │   │   └── route.ts      # GET /api/movers
│   │   │   ├── research/
│   │   │   │   └── [id]/
│   │   │   │       └── route.ts  # GET /api/research/:id
│   │   │   └── stats/
│   │   │       └── route.ts      # GET /api/stats
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── lib/                      # Shared libraries
│   │   ├── coingecko.ts          # CoinGecko API client
│   │   ├── database.types.ts     # TypeScript types for DB
│   │   ├── mover-detector.ts     # Detection algorithms
│   │   ├── supabase.ts           # Supabase client
│   │   └── telegram.ts           # Telegram bot client
│   │
│   └── trigger/                  # Trigger.dev jobs
│       ├── collect-prices.ts     # Scheduled: every 5 min
│       ├── send-alerts.ts        # On-demand: send Telegram
│       └── run-research.ts       # On-demand: Claude analysis
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
│
├── .env.example                  # Environment template
├── next.config.js                # Next.js config
├── package.json                  # Dependencies
├── trigger.config.ts             # Trigger.dev config
├── tsconfig.json                 # TypeScript config
├── ROADMAP.md                    # This file
└── DEPLOY.md                     # Deployment guide
```

---

## API Reference

### GET /api/health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "1.0.0"
}
```

### GET /api/movers
Get recent significant movers.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| hours | number | 24 | Time window in hours |
| direction | string | "both" | "up", "down", or "both" |
| limit | number | 20 | Max results |

**Response:**
```json
{
  "movers": [
    {
      "id": "uuid",
      "coin_id": "solana",
      "symbol": "sol",
      "name": "Solana",
      "move_type": "pump",
      "magnitude": 15.5,
      "price": 150.25,
      "market_cap": 65000000000,
      "volume_24h": 3000000000,
      "detected_at": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 1,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET /api/research/:eventId
Get research report for a mover event.

**Response:**
```json
{
  "report": {
    "id": "uuid",
    "mover_event_id": "uuid",
    "catalyst": "Major partnership announcement with...",
    "catalyst_confidence": 0.85,
    "sentiment_label": "bullish",
    "sentiment_score": 0.7,
    "key_factors": ["partnership", "ecosystem growth", "TVL increase"],
    "risks": ["market volatility", "competition"],
    "mover_events": { ... }
  }
}
```

### GET /api/stats
Get system statistics.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| days | number | 7 | Time window in days |

**Response:**
```json
{
  "period": { "days": 7, "since": "2024-01-08T00:00:00.000Z" },
  "summary": {
    "totalMovers": 45,
    "researchReports": 30,
    "predictionAccuracy": 0.65
  },
  "predictions": {
    "total": 20,
    "correct": 13,
    "incorrect": 5,
    "partial": 2
  },
  "dailyStats": [ ... ]
}
```

---

## Background Jobs Reference

### collect-prices (Scheduled)
- **Schedule:** Every 5 minutes (`*/5 * * * *`)
- **Purpose:** Fetch prices, detect movers, trigger alerts/research
- **Flow:**
  1. Fetch market data from CoinGecko (up to 1000 coins)
  2. Upsert coins into database
  3. Store price snapshots (top 500)
  4. Run mover detection algorithm
  5. Store mover events
  6. Trigger `send-alerts` for top 10 movers
  7. Trigger `run-research` for top 5 movers (with daily limit)
  8. Update daily stats

### send-alerts (On-demand)
- **Triggered by:** `collect-prices`
- **Purpose:** Send Telegram notifications
- **Flow:**
  1. Receive list of movers
  2. Send detailed alert for top 3
  3. Send summary for remaining movers
  4. Rate limit: 1 message per second

### run-research (On-demand)
- **Triggered by:** `collect-prices`
- **Purpose:** Analyze why a coin moved
- **Flow:**
  1. Fetch mover event details
  2. Fetch recent news (if CryptoPanic configured)
  3. Build context for Claude
  4. Call Claude API for analysis
  5. Parse and store research report
  6. Send research alert to Telegram

---

## Troubleshooting Guide

### Common Issues

**1. "Rate limited by CoinGecko"**
- Solution: Wait 1 minute, reduce `MAX_COINS`, or get Pro API key

**2. "Telegram message failed"**
- Check: `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are correct
- Verify: Bot is added to the chat/channel
- Test: Send message via BotFather

**3. "Claude API error"**
- Check: `ANTHROPIC_API_KEY` is valid
- Check: You have API credits
- Verify: Not hitting rate limits

**4. "Supabase connection failed"**
- Check: All three Supabase env vars are set
- Verify: Database is not paused (free tier pauses after 1 week inactivity)

**5. "Trigger.dev jobs not running"**
- Check: `TRIGGER_SECRET_KEY` is correct
- Verify: Jobs are deployed (`npx trigger.dev@latest deploy`)
- Check: Trigger.dev dashboard for errors

### Monitoring

**Trigger.dev Dashboard:**
- View job runs, success/failure rates
- See logs for each run
- Monitor queue depth

**Supabase Dashboard:**
- Check database size
- View query performance
- Monitor connections

**Vercel Dashboard:**
- Check function logs
- Monitor bandwidth
- View error rates

---

## Next Steps After Deployment

1. **Monitor for 24 hours** - Ensure jobs run successfully
2. **Check Telegram** - Verify alerts are arriving
3. **Review research quality** - Check if Claude analysis is useful
4. **Adjust thresholds** - Tune `PRICE_THRESHOLD` based on alert volume
5. **Set up daily summary** - Add a scheduled job for daily reports

---

## Support & Resources

- **Trigger.dev Docs:** https://trigger.dev/docs
- **Supabase Docs:** https://supabase.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Claude API Docs:** https://docs.anthropic.com
- **CoinGecko API:** https://www.coingecko.com/en/api/documentation
