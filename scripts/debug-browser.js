import playwright from 'playwright';

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', (msg) => console.log('PAGE LOG:', msg.type(), msg.text()));
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.toString()));

  await page.goto(process.env.TEST_URL || 'http://127.0.0.1:8081', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  try {
    const rootHtml = await page.$eval('#root', (el) => el.innerHTML);
    console.log('ROOT HTML length:', rootHtml.length);
    console.log('ROOT HTML (first 400 chars):', rootHtml.slice(0, 400));
  } catch (e) {
    console.log('no #root content');
  }
  await page.screenshot({ path: 'playwright-snapshot.png', fullPage: true });
  await browser.close();
})();
