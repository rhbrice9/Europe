# 🌍 Europe Trip 2026

Real-time collaborative travel planner for 7 travelers across **Dublin · London · Paris · Brussels**.

Built with **Next.js 14** + **Supabase** (Postgres + Realtime) — deployed on Vercel's free Hobby tier.

---

## Features

- 🗺️ **Itinerary** — day-by-day plans per city, fully editable by anyone in the group
- 📍 **Interactive Map** — Leaflet map with all locations, flight arcs, and train routes
- ✈️ **Flights** — all outbound & return flights with traveler assignments
- 🚄 **Trains** — Eurostar and Thalys connections with booking links
- 💰 **Group Budget** — shared expense tracker with multi-currency support and per-couple splits
- 💬 **Notes & Chat** — pinboard + group chat, synced in real time across all devices

---

## Project Structure

```
Europe/
├── pages/
│   ├── _app.jsx          # Global styles, fonts, <head>
│   └── index.jsx         # Full app — all tabs, components, and logic
├── lib/
│   └── supabase.js       # Supabase client + storage helper (get/set/subscribe)
│                          #   → password-gated writes, rate limiting (5/min)
├── supabase/
│   └── setup.sql         # Run once in Supabase SQL Editor to create the table
│                          #   → RLS policies: open reads, password-gated writes
├── .env.local.example    # Copy to .env.local and fill in your Supabase keys
├── next.config.js        # Security headers (X-Frame-Options, nosniff, etc.)
└── package.json
```

---

## Setup (~10 minutes)

### 1. Supabase — database + realtime

1. Create a free project at [supabase.com](https://supabase.com) (no credit card)
2. Go to **SQL Editor → New Query**, paste `supabase/setup.sql`, click **Run**
3. Go to **Database → Replication** and toggle `trip_data` ON under Realtime
4. Copy your credentials from **Project Settings → API**:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Local development

```bash
npm install
cp .env.local.example .env.local   # fill in your Supabase keys
npm run dev                         # → http://localhost:3000
```

### 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → import this repo
2. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Click **Deploy** — share the URL with all 7 travelers 🎉

---

## How It Works

All trip data is stored in a single Supabase Postgres table (`trip_data`) with three rows:

| key | contents |
|-----|----------|
| `europe-trip-2026-v2` | Full itinerary (cities, days, items) |
| `europe-trip-2026-budget-v1` | All expenses, splits, and FX rates |
| `europe-trip-2026-notes-v1` | Pinboard notes and group chat messages |

Supabase Realtime pushes row changes to every open browser tab instantly — no polling, no page refresh needed.

**Security:** No login required. The Vercel URL is the shared "key" — only share it with your travel group.

- **Read access** — open to anyone with the URL (view-only by default)
- **Write access** — requires the group password ("The Mutch-Too-Many Travelers"), enforced at both the client and the Supabase RLS policy level via a custom `x-write-password` header
- **Rate limiting** — max 5 writes per minute per client (sliding window)
- **Payload guard** — `CHECK (length(value) < 500000)` prevents oversized writes
- **Security headers** — `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `X-XSS-Protection`, `Referrer-Policy`, `Permissions-Policy`

---

## Travelers

Carmen · Jason · Hannah · Abby · Chris · Riley · Rachel

## Itinerary Overview

| City | Dates | Who |
|------|-------|-----|
| 🍀 Dublin | Aug 27 – 31 | Carmen, Jason, Hannah, Abby, Chris |
| 🇬🇧 London | Aug 31 – Sep 2 | All 7 |
| 🗼 Paris | Sep 2 – 5 | Carmen, Jason, Riley, Rachel |
| 🍫 Brussels | Sep 5 – 10 | Riley, Rachel |
