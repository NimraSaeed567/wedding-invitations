const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new'
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 720, height: 1280 });
  const fileUrl = 'file:///' + path.resolve(__dirname, 'reel.html').replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'networkidle0' });

  const timestamps = [3000, 6000, 10300, 14000, 18500, 23000, 27500];
  for (const ms of timestamps) {
    await page.evaluate((t) => window.renderAtTime(t), ms);
    await page.screenshot({ path: path.resolve(__dirname, `test_${ms}.png`) });
  }

  await browser.close();
  console.log('done');
})();
