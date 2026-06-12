# Metaphoric Raccoons 🦝

An online [metaphoric (associative) card](https://www.oh-cards-institute.org/) tool —
a projective technique used in counselling and self-exploration. The images have no
fixed meaning; whatever you see in them comes from you.

**Live:** https://metaphoric-raccoons.donatizehelp.workers.dev

## How it works

1. Optionally hold a question in mind (the intention field).
2. Click the deck to draw a card — it deals onto the table and flips face-up.
3. Drag cards anywhere on the table; their arrangement can speak too.
4. Click a card to name your association, or return it to the deck.
5. A rotating prompt bar offers gentle reflection questions.

Everything is stored in `localStorage` only — nothing leaves the browser.

## Stack

- Static site, no framework: `public/index.html`, `styles.css`, `app.js`
- Card art: 5 watercolor-storybook raccoon illustrations generated with Gemini
  (`gemini-3.1-flash-image`), downscaled to 560px WebP
- Hosted on Cloudflare Workers static assets (`wrangler.jsonc`)

## Development

```sh
# local preview
npx wrangler dev            # or: python3 -m http.server -d public 8787

# deploy
npx wrangler deploy

# generate more cards (add scenes to CARDS in the script, and to CARDS in public/app.js)
GEMINI_API_KEY=... python3 scripts/generate-cards.py
```
