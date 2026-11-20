const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const refImgPath = 'C:/Users/Naveen/.gemini/antigravity/brain/82fbaad2-3e50-4b24-9aeb-0cd88f56c103/.user_uploaded/media_1795162451616_ad3251ae.png';
const base64Data = fs.readFileSync(refImgPath).toString('base64');
const dataUrl = `data:image/png;base64,${base64Data}`;

(async () => {
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true
  });
  const page = await browser.newPage();

  const result = await page.evaluate(async (imgSrc) => {
    const img = new Image();
    img.src = imgSrc;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const W = img.naturalWidth;
    const H = img.naturalHeight;

    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);

    const imgData = ctx.getImageData(0, 0, W, H);
    const data = imgData.data;

    // The image has a dark background and orange/copper artwork in the center.
    // Let's analyze brightness / color threshold.
    // Find bounding box of artwork.
    let minX = W, maxX = 0, minY = H, maxY = 0;
    const mask = new Uint8Array(W * H);

    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const idx = (y * W + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        // The background is near black (r < 30, g < 30, b < 30).
        // The artwork is orange/gold/copper with r > 60 and r > b * 1.3
        const isArt = (r > 45 && (r > b * 1.15 || (r + g) > 90));
        if (isArt) {
          mask[y * W + x] = 1;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    return {
      width: W,
      height: H,
      bounds: { minX, maxX, minY, maxY },
      artWidth: maxX - minX,
      artHeight: maxY - minY
    };
  }, dataUrl);

  console.log('Artwork analysis:', JSON.stringify(result, null, 2));
  await browser.close();
})();
