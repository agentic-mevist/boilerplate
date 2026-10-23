# RotAIte: AI-powered key rotation

**Live: https://rotate-my-keys.pages.dev**

A joke site for a group chat that asked, "Is there an AI tool that would rotate my keys for me?"

You paste your API keys and click **Rotate**. A very serious "Large Rotation Model" thinks hard for
three seconds, then rotates every key by exactly 180°. Physically. With CSS.

- **Letters**: every character flips on its own.
- **Keys**: each key flips as one unit.
- **Everything**: the entire website turns upside down. Esc puts it back.
- An angle slider (0° is "compliance theater", 360° "looks exactly the same, billed twice"),
  "Copy rotated keys" (upside-down Unicode), and a "Share the joke" button.

## It's a joke, so it has to be safe

The page asks people to paste secrets, so it's built to make that as harmless as possible, and to
tell people loudly not to do it.

- **Nothing leaves the page.** There is no backend, and the code never sends, navigates or opens
  connections. On top of that, the CSP sets `default-src 'none'`, `connect-src 'none'` and
  `form-action 'none'`, so the browser blocks fetches, beacons, WebSockets, image pings and form
  posts even if some script tried. Only same-origin scripts, styles and fonts load, and Trusted
  Types are enforced. (No CSP can block top-level navigation or WebRTC, so for those the guarantee
  is the code, which you can read.) The policy is defined once in `vite.config.ts` and shipped both
  as a Cloudflare Pages `_headers` file and as a `<meta>` tag.
- **Nothing is stored.** No cookies, storage, analytics or third-party requests of any kind. The
  box empties itself on `pagehide`.
- **Real keys get called out.** `src/lib/secrets.ts` recognizes about 25 credential formats (GitHub,
  OpenAI, Anthropic, AWS, Azure, Stripe, Slack, private keys, JWTs, passwords in URLs and in
  `NAME=value` / JSON / YAML assignments, …), plus a heuristic for random-looking tokens. If you
  paste one, the page tells you, links to where to revoke it, and masks it in the rotated output so
  it can't end up in a screenshot. Masks never show only part of a secret, and always have the same
  length, so they don't give away how long a password is.
- **Extensions are asked to stay out.** The box disables spellcheck, autocorrect, autocomplete,
  Grammarly, LanguageTool and password-manager capture, and the keys are marked `translate="no"` so
  browser translation never sends them to a translation service.
- **Share never includes key content.** Only the count and the angle.
- **You can verify all of it.** Source maps ship on purpose (DevTools → Sources shows the real code),
  and the e2e tests assert there are zero network requests while rotating.

### Supply chain

- Every dependency is pinned to an exact version. The lockfile was resolved with
  `npm install --before=2026-10-09`, so nothing in the tree (296 packages) was less than 14 days
  old at build time.
- `.npmrc` sets `ignore-scripts=true`, so no dependency runs install scripts. Nothing here needs them.
- The shadcn CLI now generates components that import a brand-new `cn` npm package. They import a
  local `cn()` built on long-established `clsx` and `tailwind-merge` instead.

## Stack

Vite 8, React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Radix), Geist fonts self-hosted via
Fontsource. Static output, hosted on Cloudflare Pages.

## Commands

```sh
npm ci              # install (no install scripts run)
npm run dev         # dev server (no CSP in dev; Vite needs inline scripts and websockets)
npm test            # unit tests: secret detection, upside-down text
npm run build       # typecheck + production build into dist/
npm run preview     # serve dist/ with wrangler pages dev (applies _headers, like production)
npm run test:e2e    # Playwright against the preview server; BASE_URL=https://... to test a deploy
npm run images      # re-render public/og.png and public/apple-touch-icon.png
npm run deploy      # build and deploy to Cloudflare Pages (project: rotate-my-keys)
```

## Layout

```
src/lib/secrets.ts     real-key detection, redaction, line preparation
src/lib/flip.ts        180° Unicode text
src/lib/copy.ts        every joke on the page
src/components/        page sections; key-rotator.tsx is the tool itself
src/components/ui/     shadcn/ui components
e2e/site.spec.ts       browser tests: CSP, zero requests, redaction, page flip, storage
vite.config.ts         the security policy and headers
```
