// Renders public/og.png (link preview) and public/apple-touch-icon.png.
// Usage: node scripts/render-images.mjs
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { chromium } from "@playwright/test"

const root = new URL("..", import.meta.url)
const out = (name) => fileURLToPath(new URL(`public/${name}`, root))

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })

await page.goto(new URL("scripts/og.html", root).href)
await page.evaluate(() => document.fonts.ready)
await page.screenshot({ path: out("og.png") })

// iOS rounds the corners itself, so the touch icon is a full-bleed square.
const favicon = await readFile(new URL("public/favicon.svg", root), "utf8")
await page.setViewportSize({ width: 180, height: 180 })
await page.setContent(
  `<style>html,body{margin:0}svg{display:block;width:180px;height:180px}</style>${favicon.replace('rx="15"', 'rx="0"')}`,
)
await page.screenshot({ path: out("apple-touch-icon.png") })

await browser.close()
console.log("Wrote public/og.png and public/apple-touch-icon.png")
