# Juiceflow

See where your SEO juice comes from. Enter a website and every site that links to it becomes a physical key-cap. Each one pours a stream of link equity into your site. The stronger, cleaner and less crowded the link, the wider the stream.

Live: https://juiceflow.donatizehelp.workers.dev

## The juice model

`src/shared/model.ts` is pure TypeScript shared by the Worker and the browser, with tests in `model.test.ts`. It follows the ideas behind PageRank and Ahrefs' Domain Rating:

```
juice = 0.85 × 10^(A / 10) × 1/L × follow × placement × type × spam × status × multi
```

| Factor | What it means | Default |
|---|---|---|
| `A` authority (0–100) | 75% page authority + 25% domain rating (log space). Unranked pages are estimated at half their domain's rank. User-content subdomains (`*.substack.com` and similar) are capped. | 10 points = 10× juice |
| `L` dilution | Outgoing links on the linking page + 50% of its internal links. You get `1/L` of the page's equity. | unknown → 30 |
| follow | nofollow / ugc / sponsored | ×0.1 |
| placement | article/main 1, section .95, unknown .8, header .6, nav/aside .5, footer .35 | |
| spam | Spam score ≤30: no penalty. 30–60: down to ×0.5. 60–80: down to ×0.05 (toxic). | |
| status | Link to a 4xx/5xx page = leak (×0). Redirect ×0.9. Lost link = dry. | |
| multi | +10% per 10× more links from the same domain, capped at +30%. | |

Two facts justify the "10 points = 10×" scale (the score is then scaled by 0.87). DataForSEO's per-link rank sits about 100 points (on its 0–1000 scale) below the page's rank for every 10× more links on that page. That is exactly how PageRank divides equity. Fitting the resulting Juice Score against DataForSEO domain rank on 5 real sites gave a slope of 0.97, so the 0–100 Juice Score lands close to a familiar DR.

Search caches, translators and archives (`*.bing.com`, `web.archive.org`, …) are ignored. Every factor is returned per source, so the UI can show the full recipe. The "How it works" panel lets you change the weights live.

## Data

The Worker (`src/worker`) makes 4 DataForSEO Backlinks API calls per fresh analysis, about $0.11 in total:

1. `backlinks/summary/live` for the target totals
2. `backlinks/backlinks/live` with `mode: one_per_domain`, the 200 strongest linking sites
3. The same call with `backlinks_status_type: lost`, the 40 strongest recently lost links
4. `backlinks/bulk_spam_score/live` for each linking domain's own spam score

Opening a source and clicking **Show every link from …** calls `/api/links`. That's one more lookup (about $0.025) for every link from that site, covering its root domain and all subdomains.

Results are cached in KV for 7 days. Cached and demo analyses cost nothing. Three guards protect the balance, all set in `wrangler.jsonc`:

- a global daily spend cap (`DAILY_BUDGET_USD`, default $3)
- fresh analyses per IP per day (`PER_IP_DAILY`, default 10)
- link lookups per IP per day (`PER_IP_LINKS_DAILY`, default 60)

Demo sites (`public/demo/*.json`) are pre-fetched snapshots, so the landing page never spends credits.

## The scene

Three.js through react-three-fiber. The camera is a fixed top-down "flat lay" (orthographic, tilted ~10° so key-caps show their thickness). You drag to pan and scroll, pinch, or use the −/+ buttons to zoom, like a whiteboard. Nothing rotates. Keyboard: `+` / `−` zoom, `0` fits the view, `Esc` closes.

- `scene/layout.ts` places the sources on two rings. Every outer river flows through a reserved corridor between two inner keys, so no river ever passes under another site. Corridors are sized from the actual river widths (a 1-D packing along the arc). `layout.test.ts` checks this on every demo site.
  - **Stream** mode fans the sources around the left of your site, with result cards on the right.
  - **Vortex** mode puts them all around and swirls the rivers in.
  - The long tail of small sites shares one creek.
- River width = `0.08 + 1.82 × (share / top share)^0.6` world units: a tiny spring for a 0.1% source, a wide fast river for the top one. Ripple speed grows with strength too.
- `scene/Streams.tsx` + `shaders.ts` render the water as crisp stylized ribbons. Every stream uses the same juice orange; only its width (share of juice) and flow speed differ. Each river has a deeper center, lighter shallows, foam streaks drifting downstream, a dark outline and wet-sand banks. Every key sits in a spring pool, and all rivers pour into a lake around your site. Spam, nofollow and broken targets are explained in the hover card and side panel, not with different-looking streams.
- `scene/Keys.tsx`: instanced key-caps that press on hover. Favicons come from a single atlas texture.
- `scene/KeyLabels.tsx`: screen-space name tags. They sit on the outer side of their key and avoid keys, rivers and each other. Hovering shows a card with the site's name and its share of your juice. Clicking opens the source's details: the linking page, every link from the site, and the full recipe.

## Develop

```bash
npm install
printf 'DATAFORSEO_LOGIN=...\nDATAFORSEO_PASSWORD=...\n' > .dev.vars
npm run dev:api   # Worker on :8787 (API + favicons)
npm run dev       # Vite on :5173, proxies /api to :8787
npm test          # model + domain tests on real fixtures
npm run typecheck
```

## Deploy

```bash
npm run deploy                         # vite build && wrangler deploy
npx wrangler secret put DATAFORSEO_LOGIN
npx wrangler secret put DATAFORSEO_PASSWORD
```
