# World Cup 2026 — Winner Predictor

A React + Node.js app that predicts the FIFA World Cup 2026 winner using a live-updating statistical model.

## Quick Start

### 1. Clone & install
```bash
git clone <repo-url>
cd worldcup2026
npm run install:all
```

### 2. Configure environment
```bash
cp .env.example server/.env
cp .env.example client/.env
```

Edit `server/.env`:
- Set `FOOTBALL_DATA_API_KEY` (see below)
- Set `ADMIN_PASSWORD` to something secure

Edit `client/.env`:
- Set `VITE_USE_MOCK=true` to run on demo data (no API key needed)
- Set `VITE_USE_MOCK=false` once you have a real API key

### 3. Run
```bash
npm run dev
```
- Client: http://localhost:5173
- API: http://localhost:3001

---

## Getting a football-data.org API Key

1. Go to https://www.football-data.org/client/register
2. Register for a free Tier account (free tier supports WC competition data)
3. Copy your API key into `server/.env` as `FOOTBALL_DATA_API_KEY`

> **Note:** The World Cup 2026 competition ID will be available on football-data.org once the tournament begins. Update `WC2026_ID` in `server/services/dataFetcher.js` when the ID is published.

---

## Project Structure

```
worldcup2026/
├── client/                   # React (Vite) frontend
│   └── src/
│       ├── components/       # TopPicks, Leaderboard, MatchFeed, ProbabilityChart
│       ├── hooks/            # useApi.js — data fetching + mock fallback
│       ├── pages/            # AdminPage
│       └── utils/            # prediction.js (client-side model), mockData.js
├── server/
│   ├── routes/               # /api/teams  /api/matches  /api/sync  /api/weights
│   ├── services/
│   │   ├── predictionEngine.js   # Core statistical model
│   │   └── dataFetcher.js        # football-data.org API + stat rebuilder
│   └── data/                 # teams.json, matches.json, weights.json, syncLog.json
└── package.json              # Concurrent dev runner
```

---

## Prediction Model

The model computes a win probability % for each team from these weighted factors:

| Factor            | Default Weight | Notes                                  |
|-------------------|---------------|----------------------------------------|
| Goals For         | 0.20          | Per-game average                       |
| Goals Against     | 0.18          | Inverted — fewer is better             |
| Shot Accuracy     | 0.12          | SoT / total shots                      |
| Shots on Target   | 0.10          | Per-game average                       |
| Recent Form       | 0.15          | Exponential decay (λ=0.35)             |
| Pass Accuracy     | 0.07          | Average %                              |
| Possession        | 0.08          | Average %                              |
| Opponent Strength | 0.05          | Goals vs strong teams count more       |
| Knockout Bonus    | 0.05          | Multiplier per stage reached           |

All weights are stored in `server/data/weights.json` and adjustable via the Admin panel.

---

## Admin Panel

Visit the **Admin** tab in the UI. Features:
- **Model Weights** — drag sliders to tune the model in real-time
- **Manual Match** — enter a result when the API is unavailable
- **Sync Log** — trigger a manual API sync and view history

All mutating admin actions require the `ADMIN_PASSWORD` set in your `.env`.

---

## Production Build

```bash
npm run build            # builds client/dist
NODE_ENV=production npm run start   # Express serves static files + API
```

---

## Data Sync

- Auto-syncs every **30 minutes** when the server is running with a valid API key
- Manual sync via Admin → Sync Log → "Sync Now"
- Each sync snapshots current win probabilities into each team's `probabilityHistory` array (used by the History chart)
