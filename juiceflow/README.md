# SEO Juice

See where your SEO juice comes from. Enter a website and every site that links to it becomes a physical key-cap. Each one pours a stream of link equity into your site. The stronger, cleaner and less crowded the link, the wider the stream.

Live: https://seojuice.xyz (the Worker is still called `juiceflow`, so https://juiceflow.donatizehelp.workers.dev works too)

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
- fresh analyses per IP per day (`PER_IP_DAILY`, default 3; cached sites and demos are free)
- link lookups per IP per day (`PER_IP_LINKS_DAILY`, default 60)

The landing page shows only the form and runs nothing until you ask. Demo sites (`public/demo/*.json`: figma.com, plausible.io, handlepilot.com, gcore.com) are pre-fetched snapshots, so trying them never spends credits. A few older snapshots in `fixtures/` give the tests some smaller sites too.

## The scene

Three.js through react-three-fiber. The camera is a fixed top-down "flat lay" (orthographic, tilted ~10° so key-caps show their thickness). You drag to pan and scroll, pinch, or use the −/+ buttons to zoom, like a whiteboard. Nothing rotates. Keyboard: `+` / `−` zoom, `0` fits the view, `Esc` closes.

- `scene/layout.ts` places the sources on two rings. Every outer river flows through a reserved corridor between two inner keys, so no river ever passes under another site. Corridors are sized from the actual river widths (a 1-D packing along the arc). `layout.test.ts` checks this on every demo site.
  - **Stream** mode fans the sources around the left of your site, with the result cards on the right.
  - **Vortex** mode puts them all around and swirls the rivers in.
  - The long tail of small sites shares one creek.
- River width = `0.08 + 1.52 × (share / top share)^0.6` world units: a tiny spring for a 0.1% source, a wide fast river for the top one. Flow speed grows with strength too.
- `scene/Liquid.tsx` + `scene/liquid/shaders.ts` render all the juice as one liquid surface, in two passes like screen-space fluid rendering:
  1. **Field pass** (off screen, additive). Every river, spring pool and the lake is a shape with a signed distance to its shore. Each writes `w = exp(−distance / K)` plus its height, flow and shadow weighted by `w`. `−K·ln(Σw)` is a smooth minimum of all the shapes: streams meet the lake and each other in smooth liquid necks about K wide, while streams further apart stay apart. Deep inside a body `w` is large, so where a thin stream joins a river, the river's surface and current win and no groove or seam is left behind. Rivers run on past the end of their path into the lake and slow down there, so the change of current is spread out.
  2. **Surface pass**. Inside the shore there is juice: flat on top, curving down in a narrow meniscus at the edge, which reads as a slightly deeper line rather than a bright one. The shader adds ripples carried along by the current (a two-phase flow map, faster in big rivers), refracts the board seen through the shallows, lights the bed with caustics, and reflects a soft studio light with Fresnel, plus sun sparkles on open water. Froth appears where the juice first pours in and on fast water, and a soft tinted shadow falls away from the light.
  - The ripple, caustic and bubble textures are generated once on the GPU (`liquid/textures.ts` holds the wave tables). The ripples are a sum of "exponential sine" waves. The caustics come from the same surface, where its curvature focuses light.
  - Every stream uses the same juice; only its width (share of juice) and speed differ. Spam, nofollow and broken targets are explained in the hover card and side panel, not with different-looking streams.
- `juices.ts`: the juice flavors (green, orange, beet, berry, blue spirulina). Pick one in the bottom-left corner. It recolors the liquid, the result cards, the UI accents (CSS variables), the logo and the browser-tab icon, and it's remembered in `localStorage`.
- `scene/Hub.tsx`: your site, a plain white circle with its favicon, sitting in the lake. Its icon is the sharpest one the site has (`/api/favicon?hd=1` reads the home page: an SVG icon if there is one, else the biggest PNG from its icon links, apple-touch-icon or web manifest, else Google's 256px one), drawn at 1024px so it stays crisp when you zoom right in.
- `scene/Keys.tsx`: instanced key-caps that press on hover. Favicons (128px, from Google's favicon service) share one atlas texture.
- `scene/ResultCards.tsx`: the **Juice score** and **Juice you could reclaim** cards. They're plain HTML pinned beside the lake, so their text is as crisp as the name tags. They follow the board as you pan and grow or shrink with the zoom (within limits, so they stay readable). When the camera frames the board it makes room for them on screen, side by side, or stacked in narrower windows.
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
