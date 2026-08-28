# Solstice — event agency website mockup

A single-page static mockup for a fictional full-service event agency
("Solstice Events", Vienna). All content is illustrative placeholder copy,
meant to be edited. Photography is hot-linked from Unsplash.

## Files

- `index.html` — all content lives here, organised by clearly-commented sections
  (hero, clients, stats, services, work, process, studio, testimonials, CTA, contact, footer)
- `styles.css` — design tokens at the top (`:root`) control colors, fonts, spacing
- `script.js` — small dependency-free interactions (mobile nav, reveal-on-scroll,
  stat counters, mockup form submit)

The contact form has **no backend** — submissions just show a success note.
A `noindex` meta tag keeps the mockup out of search engines; remove it for launch.

## Deploy

Deployed on Cloudflare Pages (project `solstice-events`). To redeploy after edits:

```sh
npx wrangler pages deploy event-agency --project-name=solstice-events
```
