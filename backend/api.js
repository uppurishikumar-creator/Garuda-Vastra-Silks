// All /api routes for the website, admin panel and billing counter.
const express = require('express');
const bcrypt = require('bcryptjs');
const bwipjs = require('bwip-js');
const db = require('./db');
const { query, tx, one, setting, audit } = db;
const { issue, clear, verifyPassword, requireAuth, tooManyAttempts, recordAttempt } = require('./auth');
const billing = require('./billing');
const { BillError, IST_DATE } = billing;

const router = express.Router();
router.use(express.json({ limit: '1mb' }));

// Make sure tables exist before the first request (also on a fresh Vercel instance)
router.use(async (req, res, next) => {
  try { await db.ready(); next(); }
  catch (e) { console.error('Database setup failed:', e); res.status(503).json({ error: 'Database is not reachable: ' + (e.code ? e.code + ' ' : '') + String(e.message || e).slice(0, 200) }); }
});

const auth = requireAuth('cashier');
const manager = requireAuth('manager');
const owner = requireAuth('owner');

// Wrap async handlers so errors become clean JSON responses
const h = fn => async (req, res) => {
  try {
    const out = await fn(req, res);
    if (out !== undefined && !res.headersSent) res.json(out);
  } catch (e) {
    if (e instanceof BillError) return res.status(e.status).json({ error: e.message });
    if (e && (e.code === '23505' || /duplicate key/i.test(e.message || ''))) return res.status(409).json({ error: 'That code / SKU / username already exists' });
    if (e && (e.code === '23514' || /check constraint/i.test(e.message || ''))) return res.status(400).json({ error: 'Not enough stock or invalid value' });
    console.error(e);
    // Short technical reason (no data/passwords) so problems can be diagnosed from the browser
    res.status(500).json({ error: 'Something went wrong on the server', reason: String((e && (e.code ? e.code + ': ' : '') + e.message) || e).slice(0, 300) });
  }
};
const bad = msg => { throw new BillError(msg); };
const int = (v, d = null) => (v === '' || v == null ? d : (Number.isFinite(+v) ? Math.round(+v) : d));
const str = (v, max = 200) => (v == null || v === '' ? null : String(v).trim().slice(0, max));

function branchFor(req, requested) {
  if (req.user.role === 'cashier' || !requested) return req.user.branch_id || 1;
  return int(requested, req.user.branch_id || 1);
}

// Accept raw SKU, or a QR containing a URL like ...?sku=GVS00001
function normaliseCode(code) {
  const c = String(code || '').trim();
  const m = c.match(/[?&]sku=([^&#]+)/i);
  return m ? decodeURIComponent(m[1]) : c;
}

/* ---------------- public (website) ---------------- */
router.get('/public/products', h(async (req, res) => {
  const rows = await query(`SELECT p.id, p.sku, p.name, p.colour_desc, p.category, p.occasion, p.colour, p.size,
                                   p.price, p.mrp, p.image_url, p.tag, COALESCE(SUM(s.qty),0)::int AS qty
                            FROM products p LEFT JOIN stock s ON s.product_id = p.id
                            WHERE p.active = 1 AND p.online = 1 GROUP BY p.id ORDER BY p.id DESC`);
  res.set('Cache-Control', 'public, max-age=30, s-maxage=30');
  return { products: rows.map(({ qty, ...p }) => ({ ...p, in_stock: qty > 0 })) };
}));

/* ---------------- auth ---------------- */
const homeFor = role => (role === 'cashier' ? '/admin/pos.html' : '/admin/#dashboard');

router.post('/auth/login', h(async (req, res) => {
  if (req.get('X-Requested-With') !== 'gvs') return res.status(403).json({ error: 'Bad request origin' });
  const username = String((req.body || {}).username || '').trim();
  const password = String((req.body || {}).password || '');
  const ip = String(req.ip || '');
  if (await tooManyAttempts(username, ip)) return res.status(429).json({ error: 'Too many wrong attempts. Try again in 15 minutes.' });
  const u = await verifyPassword(username, password);
  await recordAttempt(username, ip, !!u);
  if (!u) { await audit(null, 'auth.failed', { username }); return res.status(401).json({ error: 'Wrong username or password' }); }
  await issue(res, u);
  await audit(u.id, 'auth.login');
  return { ok: true, mustChangePassword: !!u.must_change_password, role: u.role, home: homeFor(u.role) };
}));

router.post('/auth/logout', h((req, res) => { clear(res); return { ok: true }; }));

router.get('/auth/me', auth, h(async req => ({ user: req.user, shop: await setting('shop_name') })));

router.post('/auth/password', auth, h(async (req, res) => {
  const { current, next } = req.body || {};
  const u = await one(query, 'SELECT * FROM users WHERE id = $1', [req.user.id]);
  if (!bcrypt.compareSync(String(current || ''), u.password_hash)) bad('Current password is wrong');
  if (!next || String(next).length < 8) bad('New password must be at least 8 characters');
  const nu = await one(query, `UPDATE users SET password_hash = $1, must_change_password = 0, token_version = token_version + 1
                               WHERE id = $2 RETURNING *`, [bcrypt.hashSync(String(next), 10), u.id]);
  await issue(res, nu);
  await audit(u.id, 'auth.password_changed');
  return { ok: true, home: homeFor(u.role) };
}));

/* ---------------- branches & settings ---------------- */
router.get('/branches', auth, h(() => query('SELECT * FROM branches WHERE active = 1 ORDER BY id')));

router.put('/branches/:id', owner, h(async req => {
  const b = req.body || {};
  await query('UPDATE branches SET name = COALESCE($1, name), address = $2, phone = $3, gstin = $4 WHERE id = $5',
    [str(b.name, 80), str(b.address, 300), str(b.phone, 30), str(b.gstin, 20), int(req.params.id)]);
  await audit(req.user.id, 'branch.update', { id: req.params.id });
  return { ok: true };
}));

const PUBLIC_SETTINGS = ['shop_name', 'gstin', 'receipt_footer', 'default_gst_rate', 'default_hsn'];
router.get('/settings', auth, h(async () => Object.fromEntries(
  (await query(`SELECT key, value FROM settings WHERE key IN (${PUBLIC_SETTINGS.map(k => `'${k}'`).join(',')})`)).map(r => [r.key, r.value]))));

router.put('/settings', owner, h(async req => {
  for (const k of PUBLIC_SETTINGS) {
    if (k in (req.body || {})) await query('INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', [k, str(req.body[k], 500)]);
  }
  await audit(req.user.id, 'settings.update');
  return { ok: true };
}));

/* ---------------- products & stock ---------------- */
const PRODUCT_COLS = branchParam => `p.*,
  COALESCE((SELECT qty FROM stock WHERE product_id = p.id AND branch_id = ${branchParam}), 0)::int AS stock,
  COALESCE((SELECT SUM(qty) FROM stock WHERE product_id = p.id), 0)::int AS total_stock`;

router.get('/products', auth, h(async req => {
  const params = [branchFor(req, req.query.branch_id)];
  const where = ['p.active = 1'];
  if (req.query.q) { params.push(`%${req.query.q}%`); const n = params.length; where.push(`(p.name ILIKE $${n} OR p.sku ILIKE $${n} OR p.colour_desc ILIKE $${n} OR p.category ILIKE $${n})`); }
  if (req.query.category) { params.push(req.query.category); where.push(`p.category = $${params.length}`); }
  if (req.query.ids) {
    const ids = String(req.query.ids).split(',').map(Number).filter(Number.isInteger).slice(0, 500);
    where.push(`p.id IN (${ids.length ? ids.join(',') : 0})`);
  }
  let sql = `SELECT ${PRODUCT_COLS('$1')} FROM products p WHERE ${where.join(' AND ')}`;
  if (req.query.low === '1') sql = `SELECT * FROM (${sql}) x WHERE stock <= low_stock_at`;
  return query(sql + ' ORDER BY id DESC LIMIT 500', params);
}));

router.get('/products/lookup/:code', auth, h(async req => {
  const code = normaliseCode(req.params.code);
  const p = await one(query, `SELECT ${PRODUCT_COLS('$2')} FROM products p WHERE lower(p.sku) = lower($1) AND p.active = 1`,
    [code, branchFor(req, req.query.branch_id)]);
  if (!p) throw new BillError(`No product with code "${code}"`, 404);
  p.by_branch = await query(`SELECT b.id, b.name, b.code, COALESCE(s.qty,0)::int AS qty FROM branches b
                             LEFT JOIN stock s ON s.branch_id = b.id AND s.product_id = $1 WHERE b.active = 1 ORDER BY b.id`, [p.id]);
  return p;
}));

router.get('/products/:id/movements', auth, h(req => query(
  `SELECT m.*, b.code AS branch_code, u.name AS user_name FROM stock_movements m
   JOIN branches b ON b.id = m.branch_id LEFT JOIN users u ON u.id = m.user_id
   WHERE m.product_id = $1 ORDER BY m.id DESC LIMIT 200`, [int(req.params.id, 0)])));

router.get('/categories', auth, h(async () => (await query('SELECT DISTINCT category FROM products WHERE active = 1 ORDER BY category')).map(r => r.category)));

async function productFields(b) {
  const f = {
    name: str(b.name, 120), colour_desc: str(b.colour_desc, 120), category: str(b.category, 60), occasion: str(b.occasion, 40),
    colour: str(b.colour, 30), size: str(b.size, 30), price: int(b.price), mrp: int(b.mrp),
    gst_rate: b.gst_rate === '' || b.gst_rate == null ? +(await setting('default_gst_rate', 5)) : +b.gst_rate,
    hsn: str(b.hsn, 12) || await setting('default_hsn'), image_url: str(b.image_url, 500), tag: str(b.tag, 30),
    online: b.online === false || b.online === 0 || b.online === '0' ? 0 : 1, low_stock_at: int(b.low_stock_at, 2)
  };
  if (!f.name) bad('Product name is required');
  if (!f.category) bad('Category is required');
  if (f.price == null || f.price < 0) bad('Enter a valid price');
  if (!(f.gst_rate >= 0 && f.gst_rate <= 28)) bad('GST rate must be between 0 and 28');
  if (f.image_url && !/^https?:\/\//i.test(f.image_url)) bad('Image link must start with http(s)://');
  return f;
}
const FIELD_ORDER = ['name', 'colour_desc', 'category', 'occasion', 'colour', 'size', 'price', 'mrp', 'gst_rate', 'hsn', 'image_url', 'tag', 'online', 'low_stock_at'];

router.post('/products', manager, h(async req => {
  const f = await productFields(req.body || {});
  let sku = str(req.body.sku, 40);
  if (sku && !/^[A-Za-z0-9-]+$/.test(sku)) bad('SKU can only have letters, numbers and -');
  const branch = branchFor(req, req.body.branch_id);
  return tx(async q => {
    if (!sku) {
      do { sku = 'GVS' + String(await billing.nextNumber(q, 'sku')).padStart(5, '0'); }
      while (await one(q, 'SELECT 1 FROM products WHERE lower(sku) = lower($1)', [sku]));
    }
    const p = await one(q, `INSERT INTO products (sku, ${FIELD_ORDER.join(', ')})
                            VALUES ($1, ${FIELD_ORDER.map((_, i) => '$' + (i + 2)).join(', ')}) RETURNING *`,
      [sku, ...FIELD_ORDER.map(k => f[k])]);
    const qty = int(req.body.initial_qty, 0);
    if (qty > 0) {
      await q('INSERT INTO stock (product_id, branch_id, qty) VALUES ($1,$2,$3)', [p.id, branch, qty]);
      await q(`INSERT INTO stock_movements (product_id, branch_id, change, reason, note, user_id) VALUES ($1,$2,$3,'stock_in','Opening stock',$4)`,
        [p.id, branch, qty, req.user.id]);
    }
    await audit(req.user.id, 'product.create', { sku }, q);
    return p;
  });
}));

router.put('/products/:id', manager, h(async req => {
  const f = await productFields(req.body || {});
  const r = await query(`UPDATE products SET ${FIELD_ORDER.map((k, i) => `${k} = $${i + 1}`).join(', ')}, updated_at = now()
                         WHERE id = $${FIELD_ORDER.length + 1} RETURNING id`, [...FIELD_ORDER.map(k => f[k]), int(req.params.id, 0)]);
  if (!r.length) throw new BillError('Product not found', 404);
  await audit(req.user.id, 'product.update', { id: req.params.id });
  return { ok: true };
}));

router.delete('/products/:id', manager, h(async req => {
  await query('UPDATE products SET active = 0, updated_at = now() WHERE id = $1', [int(req.params.id, 0)]);
  await audit(req.user.id, 'product.archive', { id: req.params.id });
  return { ok: true };
}));

// Stock in: new goods arrived. items: [{ product_id | sku, qty }]
router.post('/stock/in', manager, h(async req => {
  const branch = branchFor(req, req.body.branch_id);
  const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 500) : [];
  if (!items.length) bad('Scan at least one item');
  const note = str(req.body.note, 200);
  return tx(async q => {
    const ref = 'IN-' + Date.now().toString(36).toUpperCase();
    const out = [];
    for (const it of items) {
      const qty = int(it.qty);
      if (!(qty > 0 && qty <= 10000)) bad('Invalid quantity');
      const p = it.product_id ? await one(q, 'SELECT * FROM products WHERE id = $1', [int(it.product_id, 0)])
        : await one(q, 'SELECT * FROM products WHERE lower(sku) = lower($1)', [normaliseCode(it.sku)]);
      if (!p) bad(`Unknown product ${it.sku || it.product_id}`);
      const s = await one(q, `INSERT INTO stock (product_id, branch_id, qty) VALUES ($1,$2,$3)
                              ON CONFLICT (product_id, branch_id) DO UPDATE SET qty = stock.qty + EXCLUDED.qty RETURNING qty`, [p.id, branch, qty]);
      await q(`INSERT INTO stock_movements (product_id, branch_id, change, reason, ref, note, user_id) VALUES ($1,$2,$3,'stock_in',$4,$5,$6)`,
        [p.id, branch, qty, ref, note, req.user.id]);
      out.push({ product_id: p.id, sku: p.sku, name: p.name, size: p.size, added: qty, stock: s.qty });
    }
    await audit(req.user.id, 'stock.in', { ref, count: out.length }, q);
    return { ref, items: out };
  });
}));

// Undo a stock-in scan (e.g. scanned twice by mistake)
router.post('/stock/undo', manager, h(async req => {
  const branch = branchFor(req, req.body.branch_id);
  const pid = int(req.body.product_id, 0), qty = int(req.body.qty, 1);
  if (!(qty > 0 && qty <= 10000)) bad('Invalid quantity');
  return tx(async q => {
    const r = await one(q, 'UPDATE stock SET qty = qty - $1 WHERE product_id = $2 AND branch_id = $3 AND qty >= $1 RETURNING qty', [qty, pid, branch]);
    if (!r) bad('Not enough stock to undo');
    await q(`INSERT INTO stock_movements (product_id, branch_id, change, reason, note, user_id) VALUES ($1,$2,$3,'adjustment','Undo stock-in scan',$4)`,
      [pid, branch, -qty, req.user.id]);
    return { ok: true, stock: r.qty };
  });
}));

// Stock count correction: set the exact quantity on the shelf
router.post('/stock/adjust', manager, h(async req => {
  const branch = branchFor(req, req.body.branch_id);
  const pid = int(req.body.product_id, 0), qty = int(req.body.qty);
  if (!(qty >= 0)) bad('Invalid quantity');
  return tx(async q => {
    const cur = await one(q, 'SELECT qty FROM stock WHERE product_id = $1 AND branch_id = $2 FOR UPDATE', [pid, branch]);
    const from = cur ? cur.qty : 0;
    if (from === qty) return { ok: true, change: 0 };
    await q(`INSERT INTO stock (product_id, branch_id, qty) VALUES ($1,$2,$3)
             ON CONFLICT (product_id, branch_id) DO UPDATE SET qty = EXCLUDED.qty`, [pid, branch, qty]);
    await q(`INSERT INTO stock_movements (product_id, branch_id, change, reason, note, user_id) VALUES ($1,$2,$3,'adjustment',$4,$5)`,
      [pid, branch, qty - from, str(req.body.note, 200) || 'Stock count correction', req.user.id]);
    await audit(req.user.id, 'stock.adjust', { pid, branch, from, to: qty }, q);
    return { ok: true, change: qty - from };
  });
}));

/* ---------------- coupons ---------------- */
router.get('/coupons', manager, h(() => query('SELECT * FROM coupons ORDER BY id DESC')));

const COUPON_ORDER = ['code', 'description', 'type', 'value', 'max_discount', 'min_bill', 'category', 'max_uses', 'per_customer', 'valid_from', 'valid_to', 'active'];
function couponFields(b) {
  const f = {
    code: str(b.code, 30) && String(b.code).trim().toUpperCase(), description: str(b.description, 200),
    type: b.type === 'flat' ? 'flat' : 'percent', value: int(b.value), max_discount: int(b.max_discount),
    min_bill: int(b.min_bill, 0), category: str(b.category, 60), max_uses: int(b.max_uses), per_customer: int(b.per_customer),
    valid_from: str(b.valid_from, 10), valid_to: str(b.valid_to, 10), active: b.active === false || b.active === 0 ? 0 : 1
  };
  if (!f.code || !/^[A-Z0-9_-]{3,30}$/.test(f.code)) bad('Coupon code: 3–30 letters/numbers');
  if (!(f.value > 0)) bad('Enter the discount value');
  if (f.type === 'percent' && f.value > 100) bad('Percent cannot be more than 100');
  for (const d of [f.valid_from, f.valid_to]) if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) bad('Dates must be YYYY-MM-DD');
  if (f.valid_from && f.valid_to && f.valid_from > f.valid_to) bad('End date is before start date');
  return f;
}

router.post('/coupons', manager, h(async req => {
  const f = couponFields(req.body || {});
  const c = await one(query, `INSERT INTO coupons (${COUPON_ORDER.join(', ')}) VALUES (${COUPON_ORDER.map((_, i) => '$' + (i + 1)).join(', ')}) RETURNING *`,
    COUPON_ORDER.map(k => f[k]));
  await audit(req.user.id, 'coupon.create', { code: f.code });
  return c;
}));

router.put('/coupons/:id', manager, h(async req => {
  const f = couponFields(req.body || {});
  await query(`UPDATE coupons SET ${COUPON_ORDER.map((k, i) => `${k} = $${i + 1}`).join(', ')} WHERE id = $${COUPON_ORDER.length + 1}`,
    [...COUPON_ORDER.map(k => f[k]), int(req.params.id, 0)]);
  await audit(req.user.id, 'coupon.update', { code: f.code });
  return { ok: true };
}));

/* ---------------- billing ---------------- */
router.post('/bills/quote', auth, h(req => billing.quote(query, { ...req.body, branch_id: branchFor(req, req.body.branch_id) })));

router.post('/bills', auth, h(req => billing.createBill({ ...req.body, branch_id: branchFor(req, req.body.branch_id) }, req.user)));

router.get('/bills', auth, h(async req => {
  const where = ['1=1'], p = [];
  const add = (sql, v) => { p.push(v); where.push(sql.replace('?', '$' + p.length)); };
  if (req.user.role === 'cashier') add('b.branch_id = ?', req.user.branch_id);
  else if (req.query.branch_id) add('b.branch_id = ?', int(req.query.branch_id, 0));
  if (req.query.q) { p.push(`%${req.query.q}%`); const n = p.length; where.push(`(b.invoice_no ILIKE $${n} OR b.customer_phone ILIKE $${n} OR b.customer_name ILIKE $${n})`); }
  if (req.query.from) add(`${IST_DATE('b.created_at')} >= ?::date`, req.query.from);
  if (req.query.to) add(`${IST_DATE('b.created_at')} <= ?::date`, req.query.to);
  const rows = await query(`SELECT b.id, b.invoice_no, b.customer_name, b.customer_phone, b.total, b.discount, b.coupon_code, b.payments, b.status,
                                   b.created_at, br.code AS branch_code, u.name AS cashier,
                                   (SELECT COALESCE(SUM(qty),0)::int FROM bill_items WHERE bill_id = b.id) AS items
                            FROM bills b JOIN branches br ON br.id = b.branch_id JOIN users u ON u.id = b.user_id
                            WHERE ${where.join(' AND ')} ORDER BY b.id DESC LIMIT 300`, p);
  return rows.map(r => ({ ...r, payments: JSON.parse(r.payments) }));
}));

router.get('/bills/find', auth, h(async req => {
  const b = await one(query, 'SELECT id, branch_id FROM bills WHERE upper(invoice_no) = upper($1)', [String(req.query.invoice || '').trim()]);
  if (!b || (req.user.role === 'cashier' && b.branch_id !== req.user.branch_id)) throw new BillError('Bill not found', 404);
  return billing.getBill(query, b.id);
}));

router.get('/bills/:id', auth, h(async req => {
  const b = await billing.getBill(query, int(req.params.id, 0));
  if (!b || (req.user.role === 'cashier' && b.branch_id !== req.user.branch_id)) throw new BillError('Bill not found', 404);
  return b;
}));

router.post('/returns', auth, h(async req => {
  const b = await one(query, 'SELECT branch_id FROM bills WHERE id = $1', [int(req.body.bill_id, 0)]);
  if (!b || (req.user.role === 'cashier' && b.branch_id !== req.user.branch_id)) throw new BillError('Bill not found', 404);
  return billing.createReturn(req.body, req.user);
}));

// CSV for the accountant
router.get('/export/bills.csv', manager, h(async (req, res) => {
  const from = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '') ? req.query.from : '2000-01-01';
  const to = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '') ? req.query.to : '2999-12-31';
  const rows = await query(`SELECT b.invoice_no, to_char(b.created_at AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI') AS date_ist, br.code AS branch,
                                   b.customer_name, b.customer_phone, b.subtotal, b.discount, b.taxable, b.cgst, b.sgst, b.round_off, b.total,
                                   b.coupon_code, b.payments, b.status
                            FROM bills b JOIN branches br ON br.id = b.branch_id
                            WHERE ${IST_DATE('b.created_at')} BETWEEN $1::date AND $2::date ORDER BY b.id`, [from, to]);
  const money = ['subtotal', 'discount', 'taxable', 'cgst', 'sgst', 'round_off', 'total'];
  const esc = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s; };
  const head = ['invoice_no', 'date_ist', 'branch', 'customer_name', 'customer_phone', ...money, 'coupon_code', 'payments', 'status'];
  const lines = rows.map(r => head.map(k => {
    if (money.includes(k)) return (r[k] / 100).toFixed(2);
    if (k === 'payments') return esc(JSON.parse(r.payments).map(x => `${x.mode}:${(x.amount / 100).toFixed(2)}`).join(' '));
    return esc(r[k]);
  }).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="bills_${from}_to_${to}.csv"`);
  res.send([head.join(','), ...lines].join('\n'));
}));

/* ---------------- reports ---------------- */
router.get('/reports/summary', auth, h(async req => {
  const br = req.user.role === 'cashier' ? req.user.branch_id : int(req.query.branch_id);
  const today = billing.todayIST();
  const bf = br ? 'AND b.branch_id = $2' : '';
  const p = br ? [today, br] : [today];
  const t = await one(query, `SELECT COUNT(*)::int AS bills, COALESCE(SUM(total),0) AS sales, COALESCE(SUM(discount),0) AS discount
                             FROM bills b WHERE ${IST_DATE('created_at')} = $1::date ${bf}`, p);
  const pays = { cash: 0, upi: 0, card: 0 };
  (await query(`SELECT payments FROM bills b WHERE ${IST_DATE('created_at')} = $1::date ${bf}`, p))
    .forEach(r => JSON.parse(r.payments).forEach(x => { pays[x.mode] = (pays[x.mode] || 0) + x.amount; }));
  const refunds = (await one(query, `SELECT COALESCE(SUM(amount),0) AS n FROM returns b WHERE ${IST_DATE('created_at')} = $1::date ${bf}`, p)).n;
  const days = await query(`SELECT to_char(${IST_DATE('created_at')}, 'YYYY-MM-DD') AS d, SUM(total) AS sales, COUNT(*)::int AS bills FROM bills b
                            WHERE ${IST_DATE('created_at')} >= $1::date - 13 ${bf} GROUP BY 1 ORDER BY 1`, p);
  const top = await query(`SELECT i.sku, i.name, SUM(i.qty - i.returned_qty)::int AS qty,
                                  ROUND(SUM((i.line_total - i.discount) * (i.qty - i.returned_qty)::numeric / i.qty)) AS amount
                           FROM bill_items i JOIN bills b ON b.id = i.bill_id
                           WHERE ${IST_DATE('b.created_at')} >= $1::date - 29 ${bf}
                           GROUP BY i.product_id, i.sku, i.name ORDER BY 3 DESC LIMIT 8`, p);
  const low = await query(`SELECT p.id, p.sku, p.name, p.size, p.low_stock_at, COALESCE(s.qty,0)::int AS qty FROM products p
                           LEFT JOIN stock s ON s.product_id = p.id AND s.branch_id = $1
                           WHERE p.active = 1 AND COALESCE(s.qty,0) <= p.low_stock_at ORDER BY qty LIMIT 20`, [br || req.user.branch_id || 1]);
  return { today: { ...t, refunds, payments: pays }, days, top, low };
}));

/* ---------------- users (owner only) ---------------- */
router.get('/users', owner, h(() => query(`SELECT u.id, u.username, u.name, u.role, u.branch_id, u.active, u.created_at, b.name AS branch_name
                                            FROM users u LEFT JOIN branches b ON b.id = u.branch_id ORDER BY u.id`)));

router.post('/users', owner, h(async req => {
  const b = req.body || {};
  const username = str(b.username, 30), name = str(b.name, 60);
  if (!username || !/^[a-zA-Z0-9_.]{3,30}$/.test(username)) bad('Username: 3–30 letters/numbers');
  if (!name) bad('Name is required');
  if (!['owner', 'manager', 'cashier'].includes(b.role)) bad('Choose a role');
  if (!b.password || String(b.password).length < 8) bad('Password must be at least 8 characters');
  const r = await one(query, `INSERT INTO users (username, name, password_hash, role, branch_id, must_change_password) VALUES ($1,$2,$3,$4,$5,1) RETURNING id`,
    [username, name, bcrypt.hashSync(String(b.password), 10), b.role, int(b.branch_id, 1)]);
  await audit(req.user.id, 'user.create', { username, role: b.role });
  return { id: r.id };
}));

router.put('/users/:id', owner, h(async req => {
  const b = req.body || {}, id = int(req.params.id, 0);
  if (id === req.user.id && (b.active === 0 || b.active === false || (b.role && b.role !== 'owner'))) bad('You cannot disable or demote yourself');
  if (b.role && !['owner', 'manager', 'cashier'].includes(b.role)) bad('Invalid role');
  await query(`UPDATE users SET name = COALESCE($1, name), role = COALESCE($2, role), branch_id = COALESCE($3, branch_id),
               active = COALESCE($4, active), token_version = token_version + 1 WHERE id = $5`,
    [str(b.name, 60), b.role || null, int(b.branch_id), b.active == null ? null : (b.active ? 1 : 0), id]);
  if (b.password) {
    if (String(b.password).length < 8) bad('Password must be at least 8 characters');
    await query('UPDATE users SET password_hash = $1, must_change_password = 1 WHERE id = $2', [bcrypt.hashSync(String(b.password), 10), id]);
  }
  await audit(req.user.id, 'user.update', { id });
  return { ok: true };
}));

/* ---------------- barcode / QR images for labels and bills ---------------- */
router.get('/barcode.svg', auth, (req, res) => {
  const text = String(req.query.text || '').slice(0, 64);
  if (!text) return res.status(400).end();
  try {
    const qr = req.query.type === 'qr';
    const svg = bwipjs.toSVG(qr
      ? { bcid: 'qrcode', text, scale: 2, eclevel: 'M' }
      : { bcid: 'code128', text, height: 9, scale: 2, includetext: false });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.send(svg);
  } catch (e) { res.status(400).end(); }
});

router.use((req, res) => res.status(404).json({ error: 'Not found' }));

module.exports = router;
