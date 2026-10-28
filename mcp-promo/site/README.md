# Promo page

Live at **https://handlepilot-mcp-promo.donatizehelp.workers.dev** (Cloudflare Worker `handlepilot-mcp-promo`, published 2026-10-28). The page and poster are static assets; the video streams from the R2 bucket `handlepilot-mcp-promo` with byte ranges so Safari and iOS can play it.

YouTube (HandlePilot's channel, published 2026-10-28): https://www.youtube.com/watch?v=gK3l6eNJ3Gs

Direct video link: https://handlepilot-mcp-promo.donatizehelp.workers.dev/handlepilot-mcp-promo.mp4

To publish a new cut:

```bash
cd mcp-promo/site
npx wrangler r2 object put handlepilot-mcp-promo/handlepilot-mcp-promo.mp4 \
  --file ../media/handlepilot-mcp-promo.mp4 --content-type video/mp4 --remote
cp ../media/poster.jpg public/poster.jpg
npx wrangler deploy
```

This worker is separate from the HandlePilot app (`handlepilot-v2`); deploying it touches nothing else.
