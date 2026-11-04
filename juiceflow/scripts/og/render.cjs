// Step 2: lays the board next to the headline (card.html) and writes public/og.jpg (1200×630).
// Usage: node scripts/og/render.cjs  (after capture.cjs; card.html expects the hub at about 992, 568 CSS px)
const { chromium } = require("playwright");
const path = require("path");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto("file://" + path.join(__dirname, "card.html"), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  await page.screenshot({ path: path.join(__dirname, "../../public/og.jpg"), type: "jpeg", quality: 90, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await browser.close();
})();
