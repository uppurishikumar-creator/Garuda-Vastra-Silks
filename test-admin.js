// End-to-end test of admin panel + billing counter.
// Start a FRESH server first:  set ADMIN_PASSWORD=Start@123 and DATA_DIR=./data-test, then npm start
// Then run:  npm run test:admin   (BASE=http://localhost:3000 by default)
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:3000';
const FIRST = process.env.ADMIN_PASSWORD || 'Start@123';
const NEWPW = 'Garuda@2026';
const SHOTS = process.env.SHOTS || 'screenshots';

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 860 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/favicon|fonts\.g|unsplash|hostinger|ERR_|401/.test(m.text())) errors.push(m.text()); });
  const step = async (name, fn) => { await fn(); console.log('✔', name); };

  await step('login + forced password change', async () => {
    await page.goto(BASE + '/admin/');
    await page.fill('#lu', 'owner'); await page.fill('#lp', FIRST); await page.click('#loginForm button');
    await page.waitForSelector('#pwForm:not(.hidden)');
    await page.fill('#pc', FIRST); await page.fill('#pn', NEWPW); await page.fill('#pn2', NEWPW); await page.click('#pwForm button');
    await page.waitForSelector('.stat');
    await page.screenshot({ path: `${SHOTS}/admin-dashboard.png` });
  });

  await step('add product with opening stock', async () => {
    await page.click('a[data-v="products"]');
    await page.waitForSelector('#addProd');
    await page.click('#addProd');
    await page.fill('#pf [name=name]', 'Cotton Formal Shirt');
    await page.fill('#pf [name=category]', 'Men');
    await page.fill('#pf [name=size]', '40');
    await page.fill('#pf [name=price]', '1299');
    await page.fill('#pf [name=mrp]', '1599');
    await page.fill('#pf [name=gst_rate]', '5');
    await page.fill('#pf [name=initial_qty]', '10');
    await page.click('#pf button.primary');
    await page.waitForSelector('text=Cotton Formal Shirt');
    await page.screenshot({ path: `${SHOTS}/admin-products.png` });
  });

  await step('create coupon (10% max ₹500, 2 uses, once per customer)', async () => {
    await page.click('a[data-v="coupons"]');
    await page.click('#addCp');
    await page.fill('#cf [name=code]', 'FEST10');
    await page.fill('#cf [name=description]', 'Festival offer');
    await page.fill('#cf [name=value]', '10');
    await page.fill('#cf [name=max_discount]', '500');
    await page.fill('#cf [name=min_bill]', '1000');
    await page.fill('#cf [name=max_uses]', '2');
    await page.fill('#cf [name=per_customer]', '1');
    await page.click('#cf button.primary');
    await page.waitForSelector('text=FEST10');
    await page.screenshot({ path: `${SHOTS}/admin-coupons.png` });
  });

  let invoice;
  await step('billing counter: scan, coupon, cash, complete', async () => {
    await page.goto(BASE + '/admin/pos.html');
    await page.waitForSelector('#scan');
    for (const code of ['GVS00005', 'GVS00014', 'GVS00014']) { await page.fill('#scan', code); await page.press('#scan', 'Enter'); await page.waitForTimeout(350); }
    await page.fill('#cPhone', '9876543210');
    await page.fill('#cName', 'Lakshmi');
    await page.fill('#cCode', 'fest10');
    await page.click('#applyCp');
    await page.waitForSelector('.coupon-ok');
    await page.fill('#cashGiven', '12000');
    await page.waitForSelector('.change');
    await page.screenshot({ path: `${SHOTS}/pos-sale.png` });
    await page.click('#complete');
    await page.waitForSelector('.done-box');
    invoice = (await page.textContent('.done-box h2')).replace('Bill ', '').replace(' saved', '').trim();
    await page.screenshot({ path: `${SHOTS}/pos-done.png` });
  });

  await step('same customer cannot reuse coupon', async () => {
    await page.click('#newBill');
    await page.fill('#scan', 'GVS00001'); await page.press('#scan', 'Enter'); await page.waitForTimeout(350);
    await page.fill('#cPhone', '9876543210');
    await page.fill('#cCode', 'FEST10'); await page.click('#applyCp');
    await page.waitForSelector('.coupon-err');
    if (!(await page.isDisabled('#complete'))) throw new Error('complete should be disabled with bad coupon');
    await page.click('#clearCart').catch(() => {});
  });

  await step('receipt renders', async () => {
    const r = await ctx.newPage();
    const id = await page.evaluate(() => fetch('/api/bills?q=').then(r => r.json()).then(b => b[0].id));
    await r.goto(`${BASE}/admin/receipt.html?id=${id}`);
    await r.waitForSelector('text=TAX INVOICE');
    await r.waitForTimeout(400);
    await r.locator('#r').screenshot({ path: `${SHOTS}/receipt.png` });
    await r.close();
  });

  await step('return one shirt via scanning invoice', async () => {
    page.on('dialog', d => d.accept());
    await page.click('[data-mode="return"]');
    await page.fill('#scan', invoice); await page.press('#scan', 'Enter');
    await page.waitForSelector('[data-rinc]');
    await page.locator('tr', { hasText: 'GVS00014' }).locator('[data-rinc]').click();
    await page.fill('#rReason', 'Size exchange');
    await page.screenshot({ path: `${SHOTS}/pos-return.png` });
    await page.click('#doReturn');
    await page.waitForSelector('text=Scan the customer');
  });

  await step('price check shows all branches', async () => {
    await page.click('[data-mode="check"]');
    await page.fill('#scan', 'GVS00014'); await page.press('#scan', 'Enter');
    await page.waitForSelector('.pc-card');
    await page.screenshot({ path: `${SHOTS}/pos-pricecheck.png` });
  });

  await step('stock stayed correct (10 − 2 + 1 = 9)', async () => {
    const p = await page.evaluate(() => fetch('/api/products/lookup/GVS00014').then(r => r.json()));
    if (p.stock !== 9) throw new Error('expected 9, got ' + p.stock);
  });

  await step('labels sheet', async () => {
    const l = await ctx.newPage();
    const p = await page.evaluate(() => fetch('/api/products/lookup/GVS00014').then(r => r.json()));
    await l.goto(`${BASE}/admin/labels.html?paper=a4&items=${p.id}x3,1x2`);
    await l.waitForSelector('.lbl');
    await l.waitForTimeout(500);
    await l.screenshot({ path: `${SHOTS}/labels-a4.png` });
    await l.close();
  });

  await step('dashboard after sales', async () => {
    await page.goto(BASE + '/admin/#dashboard');
    await page.waitForSelector('.stat');
    await page.screenshot({ path: `${SHOTS}/admin-dashboard-sales.png` });
    await page.goto(BASE + '/admin/#bills');
    await page.waitForSelector('[data-bill]');
    await page.click('[data-bill]');
    await page.waitForSelector('#rf');
    await page.screenshot({ path: `${SHOTS}/admin-bill.png` });
  });

  await step('website shows live catalogue', async () => {
    const w = await ctx.newPage();
    await w.goto(BASE + '/');
    await w.waitForFunction(() => document.querySelector('#catalogueNote')?.textContent.includes('Live'), null, { timeout: 15000 });
    if (!(await w.locator('text=Cotton Formal Shirt').count())) throw new Error('new product not on site');
    await w.close();
  });

  if (errors.length) { console.log('Page errors:\n' + errors.join('\n')); process.exitCode = 1; }
  else console.log('\nAll admin/billing tests passed ✅');
  await browser.close();
})().catch(e => { console.error('✖', e.message); process.exit(1); });
