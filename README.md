# Crypto Intelligence System

A self-learning system that tracks crypto movers, automatically researches price movements, and sends real-time alerts.

## Features

- **Real-time Monitoring** - Tracks 1000+ coins every 5 minutes
- **Smart Detection** - Identifies pumps, dumps, and volume spikes
- **AI Research** - Uses Claude to analyze why coins moved
- **Instant Alerts** - Telegram notifications for significant moves
- **REST API** - Query movers, research reports, and stats

## Architecture

| Service | Purpose | Cost |
|---------|---------|------|
| **Vercel** | API hosting | Free |
| **Trigger.dev** | Background jobs | Free |
| **Supabase** | PostgreSQL database | Free |
| **Claude API** | AI research | ~$15/mo |

**Total: ~$15/month** (or $0 if you disable AI research)

## Quick Start

### 1. Get API Keys

- **Anthropic Claude**: https://console.anthropic.com/
- **Telegram Bot**: Message @BotFather on Telegram
- **Supabase**: https://supabase.com/
- **Trigger.dev**: https://trigger.dev/

### 2. Deploy

See [DEPLOY.md](./DEPLOY.md) for step-by-step instructions.

### 3. Configure

Copy `.env.example` to `.env` and fill in your keys.

## Documentation

- [ROADMAP.md](./ROADMAP.md) - Architecture, future phases, API reference
- [DEPLOY.md](./DEPLOY.md) - Complete deployment guide

## API Endpoints

```bash
GET /api/health              # System health check
GET /api/movers              # Recent significant movers
GET /api/movers?hours=24     # Filter by time window
GET /api/research/:id        # Research report for an event
GET /api/stats               # System statistics
```

## Background Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `collect-prices` | Every 5 min | Fetch prices, detect movers |
| `send-alerts` | On-demand | Send Telegram notifications |
| `run-research` | On-demand | AI analysis of movers |

## License

MIT
