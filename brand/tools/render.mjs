// Screenshot a local HTML or SVG file at a fixed size.
// usage: node render.mjs <in.html|svg> <out.png> <width> <height> [transparent]
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const [inp, out, w, h, transparent] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.goto('file://' + path.resolve(inp));
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
await page.screenshot({ path: out, omitBackground: !!transparent });
await browser.close();
console.log('wrote', out);
