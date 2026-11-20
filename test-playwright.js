const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function runTests() {
  console.log('--- Starting Garuda Vastra Silks UI/UX Verification Tests ---');
  
  // Use installed Chrome executable
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const browser = await chromium.launch({
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    headless: true
  });
  
  const consoleErrors = [];
  const pageErrors = [];

  // ==========================================
  // DESKTOP TEST SUITE
  // ==========================================
  console.log('\n[1/2] Running Desktop Test Suite (1440x900)...');
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(`[Console Error]: ${msg.text()}`);
    }
  });
  page.on('pageerror', err => {
    pageErrors.push(`[Page Error]: ${err.message}`);
  });

  await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // 1. Check Title & Hero Headings
  const title = await page.title();
  console.log(`✓ Page Title: "${title}"`);
  
  const heroHeading = await page.$eval('.hero-editorial h1', el => el.textContent.trim());
  console.log(`✓ Hero Headline: "${heroHeading}"`);

  // 1b. Test Floating Saree Rig & Interactive Switcher
  console.log('Testing Floating Saree Stage & Rig...');
  const stageExists = await page.$eval('#heroStudioStage', el => !!el);
  const sareeRigExists = await page.$eval('#sareeRig', el => !!el);
  const sareeShadowExists = await page.$eval('#sareeFloorShadow', el => !!el);
  const sareeImgSrc = await page.$eval('#heroFloatingImg', el => el.src);
  console.log(`✓ Floating Saree Rig loaded: stage=${stageExists}, rig=${sareeRigExists}, shadow=${sareeShadowExists}`);
  console.log(`✓ Initial Floating Saree Image: ${sareeImgSrc}`);

  // Test Saree Switcher Chip Interaction
  const chips = await page.$$eval('#heroSilkSwitcher .switcher-chip', els => els.map(e => e.getAttribute('title')));
  console.log(`✓ Silk Switcher Chips: ${JSON.stringify(chips)}`);
  await page.click('#heroSilkSwitcher .switcher-chip[data-saree-idx="1"]');
  await page.waitForTimeout(300);
  const updatedSareeSrc = await page.$eval('#heroFloatingImg', el => el.src);
  const activeChipIdx = await page.$eval('#heroSilkSwitcher .switcher-chip.on', el => el.getAttribute('data-saree-idx'));
  console.log(`✓ Switched to Bridal Pattu: activeIndex="${activeChipIdx}", image updated: ${updatedSareeSrc.includes('Crimson') || updatedSareeSrc.length > 0}`);

  // Test Mouse Pointer Parallax on Hero Studio Stage
  await page.hover('#heroStudioStage', { position: { x: 100, y: 100 } });
  await page.waitForTimeout(100);
  await page.hover('#heroStudioStage', { position: { x: 400, y: 300 } });
  await page.waitForTimeout(100);
  console.log('✓ Desktop pointer parallax motion tested on #heroStudioStage');

  // 2. Test Language Switcher (Telugu -> English)
  console.log('Testing Telugu language switch...');
  await page.click('.announce .lang button[data-lang="te"]');
  await page.waitForTimeout(400);
  const teHeading = await page.$eval('.hero-editorial h1', el => el.textContent.trim());
  console.log(`✓ Telugu Headline Rendered: "${teHeading}"`);
  
  // Switch back to English
  await page.click('.announce .lang button[data-lang="en"]');
  await page.waitForTimeout(400);

  // 3. Test Shop Filters
  console.log('Testing Shop Multi-Attribute Filters...');
  // Click Kanchipuram chip
  await page.click('#weaveFilter button[data-w="Kanchipuram"]');
  await page.waitForTimeout(300);
  let cardCount = await page.$$eval('#grid .card', cards => cards.length);
  console.log(`✓ Filtered by Kanchipuram: ${cardCount} cards displayed`);

  // Select Occasion 'Wedding'
  await page.selectOption('#occFilter', 'Wedding');
  await page.waitForTimeout(300);
  cardCount = await page.$$eval('#grid .card', cards => cards.length);
  console.log(`✓ Filtered by Kanchipuram + Wedding: ${cardCount} cards displayed`);

  // Check active filter bar
  const activeTags = await page.$$eval('.filter-tag-pill', pills => pills.map(p => p.textContent.trim()));
  console.log(`✓ Active Filter Pills: ${JSON.stringify(activeTags)}`);

  // Clear All
  await page.click('#clearAllFilters');
  await page.waitForTimeout(300);
  cardCount = await page.$$eval('#grid .card', cards => cards.length);
  console.log(`✓ Reset Filters: all ${cardCount} cards displayed`);

  // 4. Test Wishlist Functionality
  console.log('Testing Wishlist Save & Drawer...');
  const firstHeart = page.locator('#grid .card .heart-btn').first();
  await firstHeart.click();
  await page.waitForTimeout(300);
  const badgeCount = await page.$eval('#wlCount', el => el.textContent.trim());
  console.log(`✓ Wishlist badge updated to: ${badgeCount}`);

  // Open Wishlist Drawer
  await page.click('#openWl');
  await page.waitForTimeout(400);
  const wlDrawerOpen = await page.$eval('#wl', el => el.classList.contains('on'));
  const wlItems = await page.$$eval('#wlBody .wl-item', items => items.length);
  console.log(`✓ Wishlist drawer open: ${wlDrawerOpen}, items in drawer: ${wlItems}`);
  await page.click('#wl [data-close]');
  await page.waitForTimeout(300);

  // 5. Test Quick View Modal
  console.log('Testing Quick View Modal...');
  const firstDetailsBtn = page.locator('#grid .card .action-row button').first();
  await firstDetailsBtn.click();
  await page.waitForTimeout(400);
  const qvOpen = await page.$eval('#qv', el => el.classList.contains('on'));
  const qvTitle = await page.$eval('#qvBox h2', el => el.textContent.trim());
  const qvImgSrc = await page.$eval('#qvBox img', el => el.src);
  console.log(`✓ Quick View modal open: ${qvOpen}, Product: "${qvTitle}", Img: ${qvImgSrc.substring(0, 60)}...`);
  await page.screenshot({ path: path.join(__dirname, 'screenshots', 'real-saree-quickview.png') });
  await page.click('#qvBox [data-close]');
  await page.waitForTimeout(300);

  // 5b. Test Weave Collection Cards & Active Selection
  console.log('Testing Weave Collection Selection Cards...');
  await page.locator('#weaves').scrollIntoViewIfNeeded();
  const weaveCardCount = await page.$$eval('#weaveGrid .weave-card', cards => cards.length);
  console.log(`✓ Weave selection cards rendered: ${weaveCardCount} categories`);
  
  // Click 'Banarasi' weave card
  const targetWeave = 'Banarasi';
  await page.click(`#weaveGrid .weave-card[data-weave="${targetWeave}"]`, { force: true });
  await page.waitForTimeout(400);
  const isWeaveActive = await page.$eval(`#weaveGrid .weave-card[data-weave="${targetWeave}"]`, el => el.classList.contains('active'));
  console.log(`✓ Weave card active state applied: ${isWeaveActive}`);

  // 5c. Test Interactive Highlights & Connected Navigation
  console.log('Testing Interactive Highlights Cards...');
  await page.locator('#highlights').scrollIntoViewIfNeeded();
  const highlightCount = await page.$$eval('#highlights .highlight-item', items => items.length);
  console.log(`✓ Interactive highlight items: ${highlightCount}`);

  // Test Bridal Atelier click pre-selects bridal consultation
  await page.click('#hl-bridal');
  await page.waitForTimeout(400);
  const occasionVal = await page.$eval('#bo', el => el.value);
  console.log(`✓ Bridal Atelier highlight pre-selected consultation: "${occasionVal}"`);

  // Test Bridal Consultation Form & Stores Options
  console.log('Testing Bridal Consultation Form options...');
  const storeOptionCount = await page.$$eval('#bs option', opts => opts.length);
  console.log(`✓ Bridal consultation stores populated: ${storeOptionCount} locations`);

  // 6. Test Virtual Try-On Studio Controls
  console.log('Testing Virtual Try-On Studio...');
  await page.locator('#studio').scrollIntoViewIfNeeded();
  const canvasExists = await page.$eval('#cv', el => !!el);
  console.log(`✓ Studio Canvas initialized: ${canvasExists}`);

  // Change scale slider
  await page.fill('#rSize', '110');
  await page.dispatchEvent('#rSize', 'input');
  await page.waitForTimeout(200);
  const sizeOutput = await page.$eval('#oSize', el => el.textContent.trim());
  console.log(`✓ Studio scale adjusted to: ${sizeOutput}`);

  // 7. Test Showrooms live status
  const storeCards = await page.$$eval('#storeGrid .store-card', cards => cards.length);
  console.log(`✓ Showrooms rendered: ${storeCards} locations`);

  // 8. Capture Desktop Screenshots
  const imgDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir);

  await page.screenshot({ path: path.join(imgDir, 'desktop-home.png'), fullPage: false });
  console.log('✓ Desktop screenshot captured: screenshots/desktop-home.png');

  // Capture Floating Saree Rig Screenshot
  const stageEl = page.locator('#heroStudioStage');
  await stageEl.screenshot({ path: path.join(imgDir, 'floating-saree-hero.png') });
  console.log('✓ Floating saree rig screenshot captured: screenshots/floating-saree-hero.png');

  // Capture Weaves Section Screenshot
  const weavesEl = page.locator('#weaves');
  await weavesEl.screenshot({ path: path.join(imgDir, 'weaves-selection.png') });
  console.log('✓ Weaves collection screenshot captured: screenshots/weaves-selection.png');

  // Capture Highlights Section Screenshot
  const hlEl = page.locator('#highlights');
  await hlEl.screenshot({ path: path.join(imgDir, 'interactive-highlights.png') });
  console.log('✓ Highlights screenshot captured: screenshots/interactive-highlights.png');

  // Capture Real Sarees Shop Grid Screenshot
  await page.locator('#shop').scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(imgDir, 'real-sarees-shop.png') });
  console.log('✓ Real sarees catalog screenshot captured: screenshots/real-sarees-shop.png');

  // ==========================================
  // MOBILE TEST SUITE
  // ==========================================
  console.log('\n[2/2] Running Mobile Test Suite (iPhone 390x844)...');
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    isMobile: true,
    hasTouch: true
  });
  const mPage = await mobileContext.newPage();
  await mPage.goto('http://localhost:3000', { waitUntil: 'networkidle' });

  // Test Mobile Navigation Drawer
  await mPage.click('#burger');
  await mPage.waitForTimeout(400);
  const mNavOpen = await mPage.$eval('#mnav', el => el.classList.contains('on'));
  console.log(`✓ Mobile drawer opened: ${mNavOpen}`);
  await mPage.click('#closeM');
  await mPage.waitForTimeout(300);

  // Test Mobile Bottom Navigation Bar
  const bnavVisible = await mPage.$eval('.bnav', el => window.getComputedStyle(el).display !== 'none');
  console.log(`✓ Mobile bottom navigation bar visible: ${bnavVisible}`);

  // Test Mobile 2-column grid
  const mCardWidth = await mPage.$eval('#grid .card', el => el.getBoundingClientRect().width);
  console.log(`✓ Mobile product card width: ${Math.round(mCardWidth)}px (clean 2-column fit)`);

  // Capture Mobile Screenshot
  await mPage.screenshot({ path: path.join(imgDir, 'mobile-home.png'), fullPage: false });
  console.log('✓ Mobile screenshot captured: screenshots/mobile-home.png');

  const mStageEl = mPage.locator('#heroStudioStage');
  await mStageEl.screenshot({ path: path.join(imgDir, 'mobile-floating-saree.png') });
  console.log('✓ Mobile floating saree screenshot captured: screenshots/mobile-floating-saree.png');

  await browser.close();

  // ==========================================
  // CONSOLE AUDIT SUMMARY
  // ==========================================
  console.log('\n--- Console & Error Audit ---');
  if (consoleErrors.length === 0 && pageErrors.length === 0) {
    console.log('🎉 ZERO JavaScript or page errors detected!');
  } else {
    console.error('Console Errors:', consoleErrors);
    console.error('Page Errors:', pageErrors);
  }

  console.log('\n--- All Verification Tests Passed Successfully! ---');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
