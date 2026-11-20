const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1200, height: 900 } });
  
  const emblemDark = fs.readFileSync('src/garuda-emblem-dark.svg', 'utf8');
  const emblemLight = fs.readFileSync('src/garuda-emblem-light.svg', 'utf8');
  const logoDark = fs.readFileSync('src/logo-garuda-styles-dark.svg', 'utf8');
  const logoLight = fs.readFileSync('src/logo-garuda-styles-light.svg', 'utf8');
  const navLight = fs.readFileSync('src/logo-nav-light.svg', 'utf8');
  const navDark = fs.readFileSync('src/logo-nav-dark.svg', 'utf8');

  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600&amp;family=Inter:wght@500&amp;display=swap" rel="stylesheet">
    <style>
      body { margin: 0; padding: 24px; font-family: 'Inter', sans-serif; display: grid; grid-template-columns: 1fr 1fr; gap: 24px; background: #0E0C12; color: #fff; box-sizing: border-box; }
      .box { border-radius: 16px; padding: 32px 24px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; border: 1px solid rgba(255,255,255,0.1); }
      .box.dark { background: #211C2B; }
      .box.light { background: #F5EFE4; color: #211C2B; border-color: rgba(0,0,0,0.1); }
      h3 { margin: 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px; opacity: 0.8; }
      .logo-wrap { width: 100%; max-width: 480px; display: flex; justify-content: center; }
      .nav-wrap { width: 100%; max-width: 380px; padding: 8px 16px; border-radius: 8px; }
      .emblem-wrap { width: 140px; height: 140px; }
      svg { width: 100%; height: auto; display: block; }
    </style>
  </head>
  <body>
    <div class="box dark">
      <h3>Dark Background (Midnight Plum) — Primary</h3>
      <div class="logo-wrap">${logoDark}</div>
      <div class="nav-wrap" style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08);">${navDark}</div>
      <div class="emblem-wrap">${emblemDark}</div>
    </div>
    <div class="box light">
      <h3>Light Background (Warm Ivory) — Alternate</h3>
      <div class="logo-wrap">${logoLight}</div>
      <div class="nav-wrap" style="background: #FFFFFF; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 4px 14px rgba(0,0,0,0.04);">${navLight}</div>
      <div class="emblem-wrap">${emblemLight}</div>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');
  await page.screenshot({ path: 'screenshots/garuda-styles-logo-preview.png', fullPage: true });
  console.log('Saved screenshot to screenshots/garuda-styles-logo-preview.png');
  await browser.close();
})();
