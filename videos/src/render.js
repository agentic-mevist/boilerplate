const { chromium } = require('playwright');
const { spawn } = require('child_process');
const dir = process.argv[2], W = +process.argv[3] || 4, FPS = 30;
(async () => {
  const browser = await chromium.launch();
  const p0 = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await p0.goto('file://' + dir + '/scenes.html');
  const total = await p0.evaluate(() => window.TL.total); await p0.close();
  const N = Math.ceil(total * FPS), per = Math.ceil(N / W);
  console.log('frames', N);
  const t0 = Date.now();
  await Promise.all([...Array(W).keys()].map(async w => {
    const a = w * per, z = Math.min(N, a + per);
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.goto('file://' + dir + '/scenes.html'); await page.evaluate(() => window.READY);
    const ff = spawn('ffmpeg', ['-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS), `${dir}/seg${w}.mp4`], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise(r => ff.on('close', r));
    for (let f = a; f < z; f++) {
      await page.evaluate(t => window.render(t), f / FPS);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
      if (w === 0 && (f - a) % 300 === 0) console.log(`w0 ${f - a}/${z - a}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
    ff.stdin.end(); await done; await page.close();
  }));
  await browser.close();
  console.log('done in', ((Date.now() - t0) / 1000).toFixed(0), 's');
})();
