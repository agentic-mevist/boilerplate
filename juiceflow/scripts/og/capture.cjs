// Step 1 of the social preview image: renders the figma.com demo board in vortex mode with no UI,
// our juice glass as the site in the middle, and saves a frozen frame to scripts/og/board.png.
// Needs the dev servers (`npm run dev` and `npm run dev:api`). Usage: node scripts/og/capture.cjs
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const base = process.env.BASE || "http://127.0.0.1:5173";
const html = fs.readFileSync(path.join(__dirname, "../../index.html"), "utf8");
const glass = decodeURIComponent(/rel="icon" type="image\/svg\+xml" href="data:image\/svg\+xml,([^"]+)"/.exec(html)[1]);

(async () => {
  const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width: 1600, height: 1100 }, deviceScaleFactor: 2 });
  await page.addInitScript(() => localStorage.setItem("juiceflow.juice", "green"));
  await page.route("**/api/favicon?domain=figma.com&hd=1", (r) => r.fulfill({ status: 200, contentType: "image/svg+xml", body: glass }));
  await page.goto(`${base}/?d=figma.com`, { waitUntil: "load" });
  await page.waitForTimeout(3000);
  await page.click(".seg button:nth-child(2)"); // vortex
  await page.addStyleTag({ content: ".topbar,.summary,.legend,.zoom,.results-layer,.labels,.panel,.loading,.toast{display:none!important}" });
  await page.mouse.move(5, 5);
  await page.waitForTimeout(9000);
  await page.evaluate(() => {
    window.__liquid.freeze = window.__liquid.t;
    return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  });
  await page.screenshot({ path: path.join(__dirname, "board.png") });
  await browser.close();
})();
