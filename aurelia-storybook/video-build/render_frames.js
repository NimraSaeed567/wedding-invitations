const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const FPS = 24;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 720, height: 1280 });
  const fileUrl = 'file:///' + path.resolve(__dirname, 'reel.html').replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  const totalMs = await page.evaluate(() => window.TOTAL_DURATION_MS);
  const totalFrames = Math.ceil((totalMs / 1000) * FPS);
  console.log('Total duration ms:', totalMs, 'Total frames:', totalFrames);

  const outDir = path.resolve(__dirname, 'frames');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  for (let i = 0; i < totalFrames; i++) {
    const tMs = (i / FPS) * 1000;
    await page.evaluate((t) => window.renderAtTime(t), tMs);
    const fname = path.join(outDir, 'f_' + String(i).padStart(5, '0') + '.png');
    await page.screenshot({ path: fname });
    if (i % 50 === 0) console.log('frame', i, '/', totalFrames);
  }

  await browser.close();
  console.log('done, frames:', totalFrames);
})();
