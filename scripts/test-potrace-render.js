const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1000, height: 600 } });

  const rawSvg = fs.readFileSync('screenshots/potrace-raw.svg', 'utf8');

  // If we remove the first bounding box subpath:
  // The first subpath ends right before M 35.542
  const pathDataMatch = rawSvg.match(/d="([^"]+)"/);
  if (!pathDataMatch) return;
  const fullD = pathDataMatch[1];
  
  // Cut off the outer bounding box
  const eagleD = fullD.replace(/^M -0 112\.504[^M]+M 0\.483[^M]+/, '');

  const html = `
  <!DOCTYPE html>
  <html>
  <body style="background: #211C2B; margin: 0; padding: 40px; display: flex; gap: 40px; align-items: center; justify-content: center;">
    <div style="background: #15111C; padding: 20px; border-radius: 12px; border: 1px solid rgba(212,175,55,0.3);">
      <h3 style="color: #D4AF37; margin: 0 0 10px; font-family: sans-serif; font-size: 14px;">Raw Potrace (Inverted)</h3>
      <svg viewBox="0 0 225 225" width="300" height="300">
        <defs>
          <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFF4D0" />
            <stop offset="40%" stop-color="#D4AF37" />
            <stop offset="100%" stop-color="#8A6D2B" />
          </linearGradient>
        </defs>
        <path d="${eagleD}" fill="url(#gold)" fill-rule="evenodd" />
      </svg>
    </div>
  </body>
  </html>
  `;

  await page.setContent(html);
  await page.screenshot({ path: 'screenshots/potrace-rendered.png' });
  console.log('Saved screenshots/potrace-rendered.png');
  await browser.close();
})();
