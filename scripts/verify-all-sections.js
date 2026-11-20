const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  console.log('--- Verifying Garuda Styles Website Transformations ---');

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Navigate to local server
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(2000);

  // Check Header logo
  const logoVisible = await page.$eval('.logo img', img => img.naturalWidth > 0 || img.complete);
  console.log('Header Logo loaded:', logoVisible);

  // Check Family collections images
  const familyImages = await page.$$eval('#depts .dept-card img', imgs => imgs.map(i => ({ alt: i.alt, loaded: i.naturalWidth > 0, src: i.src })));
  console.log('Family Collections Images:', JSON.stringify(familyImages, null, 2));

  // Check Bridal consultation image
  const bridalImage = await page.$eval('#bridal .booking-art img', i => ({ alt: i.alt, loaded: i.naturalWidth > 0, src: i.src }));
  console.log('Bridal Consultation Image:', JSON.stringify(bridalImage, null, 2));

  // Check Occasions images
  const occImages = await page.$$eval('#occasions .occ-card img', imgs => imgs.map(i => ({ alt: i.alt, loaded: i.naturalWidth > 0 })));
  console.log('Occasions Images loaded count:', occImages.filter(x => x.loaded).length, 'of', occImages.length);

  // Check Product cards
  const productImages = await page.$$eval('#shopGrid .card img', imgs => imgs.slice(0, 4).map(i => ({ alt: i.alt, loaded: i.naturalWidth > 0, isCanvas: i.src.startsWith('data:') })));
  console.log('Sample Product Images:', JSON.stringify(productImages, null, 2));

  if (!fs.existsSync('screenshots')) fs.mkdirSync('screenshots');

  // Screenshot 1: Header / Brand Logo
  const header = await page.$('header.top');
  if (header) {
    await header.screenshot({ path: 'screenshots/header-brand-logo.png' });
    console.log('Saved screenshots/header-brand-logo.png');
  }

  // Screenshot 2: Family Wardrobes
  const familySec = await page.$('#depts');
  if (familySec) {
    await familySec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await familySec.screenshot({ path: 'screenshots/family-collections-posh.png' });
    console.log('Saved screenshots/family-collections-posh.png');
  }

  // Screenshot 3: Bridal Consultation Atelier
  const bridalSec = await page.$('#bridal');
  if (bridalSec) {
    await bridalSec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await bridalSec.screenshot({ path: 'screenshots/bridal-atelier-consultation.png' });
    console.log('Saved screenshots/bridal-atelier-consultation.png');
  }

  // Screenshot 4: Occasions Mosaic
  const occSec = await page.$('#occasions');
  if (occSec) {
    await occSec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await occSec.screenshot({ path: 'screenshots/occasions-mosaic.png' });
    console.log('Saved screenshots/occasions-mosaic.png');
  }

  // Screenshot 5: Shop Sarees Catalogue
  const shopSec = await page.$('#shop');
  if (shopSec) {
    await shopSec.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await shopSec.screenshot({ path: 'screenshots/shop-sarees-catalogue.png' });
    console.log('Saved screenshots/shop-sarees-catalogue.png');
  }

  console.log('Total Console Errors:', consoleErrors.length);
  if (consoleErrors.length) console.log('Console Errors:', consoleErrors);

  await browser.close();
})();
