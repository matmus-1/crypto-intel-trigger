# Deployment Guide - Crypto Intelligence System

This guide walks you through deploying the complete system step by step.

**Total time: 30-45 minutes**

---

## Prerequisites

Before starting, you'll need:

- [ ] GitHub account
- [ ] Node.js 18+ installed locally
- [ ] A Telegram account

---

## Step 1: Get API Keys (15 minutes)

### 1.1 Anthropic Claude API (REQUIRED)

This powers the AI research analysis.

1. Go to https://console.anthropic.com/
2. Sign up or log in
3. Go to **API Keys** in the sidebar
4. Click **Create Key**
5. Copy the key (starts with `sk-ant-`)

```
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxx
```

**Cost:** Pay per use (~$0.02 per research analysis)

---

### 1.2 Telegram Bot (REQUIRED)

This sends you alerts.

1. Open Telegram and search for `@BotFather`
2. Send `/newbot`
3. Follow prompts to name your bot
4. Copy the token BotFather gives you

```
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

**Get your Chat ID:**

1. Create a new Telegram group/channel for alerts
2. Add your bot to the group
3. Add `@getidsbot` to the group
4. It will show the chat ID (starts with `-`)
5. Remove `@getidsbot`

```
TELEGRAM_CHAT_ID=-1001234567890
```

---

### 1.3 Supabase (REQUIRED)

This is your database.

1. Go to https://supabase.com/
2. Sign up with GitHub
3. Click **New Project**
4. Choose a name and password
5. Select region closest to you
6. Click **Create Project** (wait 2 minutes)

**Get your keys:**

1. Go to **Settings** → **API**
2. Copy these values:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxxxx
```

**Create database tables:**

1. Go to **SQL Editor** in Supabase dashboard
2. Click **New Query**
3. Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
4. Paste into the editor
5. Click **Run**
6. You should see "Success. No rows returned"

---

### 1.4 Trigger.dev (REQUIRED)

This runs your background jobs.

1. Go to https://trigger.dev/
2. Sign up with GitHub
3. Create a new project called `crypto-intel`
4. Go to **Settings** → **API Keys**
5. Copy your development key

```
TRIGGER_SECRET_KEY=tr_dev_xxxxxxxxxxxxx
```

---

### 1.5 CoinGecko (OPTIONAL)

Free tier works fine. Pro removes rate limits.

```
COINGECKO_API_KEY=
```

---

### 1.6 CryptoPanic (OPTIONAL)

Adds news to research analysis.

1. Go to https://cryptopanic.com/developers/api/
2. Sign up and get free API key

```
CRYPTOPANIC_API_KEY=
```

---

## Step 2: Set Up Repository (5 minutes)

### 2.1 Create GitHub Repository

```bash
# Navigate to project folder
cd crypto-intel-trigger

# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit"

# Create GitHub repo and push
gh repo create crypto-intel --private --push
```

Or manually:
1. Go to github.com → New Repository
2. Name it `crypto-intel`
3. Make it private
4. Don't initialize with README
5. Push your code

---

## Step 3: Deploy to Vercel (5 minutes)

### 3.1 Connect Repository

1. Go to https://vercel.com/
2. Sign up with GitHub
3. Click **Add New** → **Project**
4. Select your `crypto-intel` repository
5. Vercel auto-detects Next.js

### 3.2 Add Environment Variables

Before deploying, add these environment variables:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `ANTHROPIC_API_KEY` | Your Claude API key |
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID |
| `TRIGGER_SECRET_KEY` | Your Trigger.dev key |

Optional:
| Name | Value |
|------|-------|
| `COINGECKO_API_KEY` | Leave empty for free tier |
| `CRYPTOPANIC_API_KEY` | Your CryptoPanic key |
| `PRICE_THRESHOLD` | `0.10` (10% default) |
| `MAX_COINS` | `1000` |
| `MAX_RESEARCH_PER_DAY` | `20` |

### 3.3 Deploy

1. Click **Deploy**
2. Wait 1-2 minutes
3. Note your deployment URL: `https://crypto-intel-xxx.vercel.app`

### 3.4 Verify API

```bash
curl https://your-deployment-url.vercel.app/api/health
```

Expected response:
```json
{"status":"healthy","timestamp":"...","version":"1.0.0"}
```

---

## Step 4: Deploy Trigger.dev Jobs (5 minutes)

### 4.1 Install Trigger CLI

```bash
npm install -g trigger.dev
```

### 4.2 Login to Trigger.dev

```bash
npx trigger.dev@latest login
```

### 4.3 Link Project

```bash
cd crypto-intel-trigger
npx trigger.dev@latest init
```

Select your project when prompted.

### 4.4 Set Environment Variables in Trigger.dev

Go to Trigger.dev dashboard → Your project → **Environment Variables**

Add all the same variables from Vercel:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `ANTHROPIC_API_KEY` | Your Claude API key |
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot token |
| `TELEGRAM_CHAT_ID` | Your Telegram chat ID |
| `COINGECKO_API_KEY` | (optional) |
| `CRYPTOPANIC_API_KEY` | (optional) |
| `PRICE_THRESHOLD` | `0.10` |
| `MAX_COINS` | `1000` |
| `MAX_RESEARCH_PER_DAY` | `20` |

### 4.5 Deploy Jobs

```bash
npx trigger.dev@latest deploy
```

This uploads your background jobs to Trigger.dev cloud.

### 4.6 Verify Jobs

1. Go to Trigger.dev dashboard
2. Click on your project
3. You should see:
   - `collect-prices` (scheduled)
   - `send-alerts` (on-demand)
   - `run-research` (on-demand)

The `collect-prices` job will start running every 5 minutes automatically.

---

## Step 5: Verify Everything Works (5 minutes)

### 5.1 Check Trigger.dev Dashboard

1. Go to Trigger.dev dashboard → Runs
2. Wait up to 5 minutes for first `collect-prices` run
3. Click on the run to see logs
4. Should show:
   - "Fetched X coins"
   - "Detected X movers"

### 5.2 Check Telegram

If there are significant movers (>10% change), you'll receive a Telegram alert.

If market is calm, you can temporarily lower the threshold:
1. Go to Trigger.dev → Environment Variables
2. Change `PRICE_THRESHOLD` to `0.05` (5%)
3. Wait for next run

### 5.3 Check Database

1. Go to Supabase dashboard → Table Editor
2. Check `coins` table - should have entries
3. Check `price_snapshots` - should have entries
4. Check `mover_events` - may have entries if movers detected

### 5.4 Check API

```bash
# Get recent movers
curl https://your-url.vercel.app/api/movers

# Get stats
curl https://your-url.vercel.app/api/stats
```

---

## Step 6: Configure Alerts (Optional)

### Adjust Thresholds

In Trigger.dev environment variables:

| Variable | Effect |
|----------|--------|
| `PRICE_THRESHOLD=0.15` | Only alert on >15% moves (fewer alerts) |
| `PRICE_THRESHOLD=0.05` | Alert on >5% moves (more alerts) |
| `MAX_RESEARCH_PER_DAY=5` | Limit research to save Claude API costs |
| `MAX_COINS=500` | Track fewer coins (faster, less data) |

### Add More Alert Channels (Future)

You can extend `src/lib/telegram.ts` to add:
- Discord webhooks
- Email notifications
- Slack integration

---

## Troubleshooting

### "No movers detected"

This is normal in calm markets. Options:
1. Lower `PRICE_THRESHOLD` temporarily
2. Wait for market volatility
3. Check `price_snapshots` table - data should still be collecting

### "Telegram messages not arriving"

1. Verify bot token is correct
2. Verify chat ID is correct (should start with `-` for groups)
3. Make sure bot is added to the chat
4. Check Trigger.dev logs for errors

### "Claude research failed"

1. Verify `ANTHROPIC_API_KEY` is valid
2. Check you have API credits at console.anthropic.com
3. Check Trigger.dev logs for specific error

### "Supabase connection error"

1. Check all three Supabase env vars are set
2. Verify database is not paused (free tier pauses after 1 week)
3. Go to Supabase dashboard → restart database if paused

### "Jobs not running on schedule"

1. Make sure you ran `npx trigger.dev@latest deploy`
2. Check Trigger.dev dashboard for deployment status
3. Verify environment variables are set in Trigger.dev (not just Vercel)

---

## Maintenance

### Weekly Tasks

1. Check Trigger.dev dashboard for failed jobs
2. Review Supabase database size (500MB free limit)
3. Check Claude API usage at console.anthropic.com

### Monthly Tasks

1. Clean old data if approaching database limit:
   ```sql
   DELETE FROM price_snapshots WHERE recorded_at < NOW() - INTERVAL '30 days';
   ```

2. Review alert thresholds based on signal quality

### Keeping Database Active (Free Tier)

Supabase free tier pauses after 1 week of inactivity. The system automatically keeps it active by writing data every 5 minutes, but if you disable jobs:

1. Set up a simple cron to ping your API weekly
2. Or manually visit Supabase dashboard weekly

---

## Cost Summary

| Service | Free Tier | Your Usage | Monthly Cost |
|---------|-----------|------------|--------------|
| Vercel | 100GB/mo | ~1GB | $0 |
| Trigger.dev | 50K runs | ~9K runs | $0 |
| Supabase | 500MB | ~100-200MB | $0 |
| Claude API | Pay/use | ~600 calls | $12-15 |
| **Total** | | | **$12-15/mo** |

If research is disabled (alerts only): **$0/month**

---

## Quick Reference

### URLs

| Service | Dashboard URL |
|---------|---------------|
| Vercel | https://vercel.com/dashboard |
| Trigger.dev | https://cloud.trigger.dev/ |
| Supabase | https://app.supabase.com/ |
| Anthropic | https://console.anthropic.com/ |

### Commands

```bash
# Deploy Trigger.dev jobs
npx trigger.dev@latest deploy

# View Trigger.dev logs locally
npx trigger.dev@latest dev

# Test locally
npm run dev
```

### API Endpoints

```bash
# Health check
curl https://your-url.vercel.app/api/health

# Get movers
curl https://your-url.vercel.app/api/movers

# Get movers (filtered)
curl "https://your-url.vercel.app/api/movers?hours=24&direction=up&limit=10"

# Get stats
curl https://your-url.vercel.app/api/stats

# Get research report
curl https://your-url.vercel.app/api/research/EVENT_ID
```

---

## Success! 🎉

If you've made it here, your system is:
- ✅ Collecting prices every 5 minutes
- ✅ Detecting significant movers
- ✅ Sending Telegram alerts
- ✅ Running AI research on top movers
- ✅ Storing everything in database

**Next steps:**
1. Monitor for 24 hours
2. Adjust thresholds based on alert volume
3. Review research quality
4. Consider adding prediction features (Phase 2+)
