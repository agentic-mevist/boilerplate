# Macros — personal calorie, macro & weight tracker

A single-user progressive web app for tracking daily calories, protein, carbs,
fat and morning weight, with progress charts (weight trend vs. calorie intake).
Built as a Cloudflare Worker (static assets + JSON API) backed by a D1 database.

## Features

- **Today** — log foods by grams from a ~140-item built-in food database (plus
  your own saved foods), or log rough estimates manually; see calories
  remaining and protein/carb/fat meters against your daily targets; save your
  morning weigh-in.
- **Progress** — 1W / 1M / 3M / All ranges; weight chart (daily weigh-ins +
  7-day trend line), calorie bar chart with your target line, stat tiles, and a
  data-table view.
- **Settings** — daily targets, kg/lb, and management of your custom foods.
- Installable on iPhone: open in Safari → Share → **Add to Home Screen**.
- Protected by a PIN (stored as a Worker secret, remembered per device).

## Stack

- Cloudflare Worker (`src/worker.js`) — serves `public/` and a JSON API under `/api/*`
- Cloudflare D1 (SQLite) — `schema.sql`
- No frameworks, no build step; hand-rolled SVG charts

## Deploy

```sh
npx wrangler d1 create calorie-tracker        # put the returned id in wrangler.toml
npx wrangler d1 execute calorie-tracker --remote --file schema.sql
npx wrangler deploy
echo -n "YOUR_PIN" | npx wrangler secret put APP_PIN
```

## API (all require `x-pin` header)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/day?date=YYYY-MM-DD` | entries + weight for a day |
| POST | `/api/entries` | add a food entry |
| DELETE | `/api/entries/:id` | remove an entry |
| PUT | `/api/weight` | upsert a weigh-in `{date, kg}` |
| GET | `/api/history?from&to` | per-day totals + weigh-ins (charts) |
| GET/POST/DELETE | `/api/foods` | custom foods (per 100 g) |
| GET/PUT | `/api/settings` | targets and unit |
