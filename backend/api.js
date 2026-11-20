// All /api routes for the admin panel and billing counter.
const express = require('express');
const bcrypt = require('bcryptjs');
const bwipjs = require('bwip-js');
const rateLimit = require('express-rate-limit');
const { db, setting, audit } = require('./db');
const { issue, clear, verifyPassword, requireAuth } = require('./auth');
const billing = require('./billing');
const { BillError, IST } = billing;

const router = express.Router();
router.use(express.json({ limit: '1mb' }));

const auth = requireAuth('cashier');
const manager = requireAuth('manager');
const owner = requireAuth('owner');

// Wrap handlers so thrown errors become clean JSON responses
const h = fn => (req, res) => {
  try {
    const out = fn(req, res);
    if (out !== undefined && !res.headersSent) res.json(out);
  } catch (e) {
    if (e instanceof BillError) return res.status(e.status).json({ error: e.message });
    if (e && /UNIQUE constraint failed/.test(e.message || '')) return res.status(409).json({ error: 'That code / SKU / username already exists' });
    console.error(e);
    res.status(500).json({ error: 'Something went wrong on the server' });
  }
};
const bad = msg => { throw new BillError(msg); };
const int = (v, d = null) => (v === '' || v == null ? d : (Number.isFinite(+v) ? Math.round(+v) : d));
const str = (v, max = 200) => (v == null || v === '' ? null : String(v).trim().slice(0, max));

// Cashiers always work in their own branch; managers/owners can choose.
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
router.get('/public/products', h(() => {
  const rows = db.prepare(`SELECT p.id, p.sku, p.name, p.colour_desc, p.category, p.occasion, p.colour, p.size,
                                  p.price, p.mrp, p.image_url, p.tag, COALESCE(SUM(s.qty),0) AS qty
                           FROM products p LEFT JOIN stock s ON s.product_id = p.id
                           WHERE p.active = 1 AND p.online = 1 GROUP BY p.id ORDER BY p.id DESC`).all();
  // Only expose in/out of stock, never exact quantities
  return { products: rows.map(({ qty, ...p }) => ({ ...p, in_stock: qty > 0 })) };
}));

/* ---------------- auth ---------------- */
// Where each role lands after logging in
const homeFor = role => (role === 'cashier' ? '/admin/pos.html' : '/admin/#dashboard');

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' } });

router.post('/auth/login', loginLimiter, h((req, res) => {
  if (req.get('X-Requested-With') !== 'gvs') return res.status(403).json({ error: 'Bad request origin' });
  const { username, password } = req.body || {};
  const u = verifyPassword(String(username || ''), String(password || ''));
  if (!u) { audit(null, 'auth.failed', { username }); return res.status(401).json({ error: 'Wrong username or password' }); }
  issue(res, u);
  audit(u.id, 'auth.login');
  return { ok: true, mustChangePassword: !!u.must_change_password, role: u.role, home: homeFor(u.role) };
}));

router.post('/auth/logout', h((req, res) => { clear(res); return { ok: true }; }));

router.get('/auth/me', auth, h(req => ({ user: req.user, shop: setting('shop_name') })));

router.post('/auth/password', auth, h((req, res) => {
  const { current, next } = req.body || {};
  const u = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!bcrypt.compareSync(String(current || ''), u.password_hash)) bad('Current password is wrong');
  if (!next || String(next).length < 8) bad('New password must be at least 8 characters');
  db.prepare('UPDATE users SET password_hash = ?, must_change_password = 0, token_version = token_version + 1 WHERE id = ?')
    .run(bcrypt.hashSync(String(next), 10), u.id);
  issue(res, db.prepare('SELECT * FROM users WHERE id = ?').get(u.id));
  audit(u.id, 'auth.password_changed');
  return { ok: true, home: homeFor(u.role) };
}));

/* ---------------- branches & settings ---------------- */
router.get('/branches', auth, h(() => db.prepare('SELECT * FROM branches WHERE active = 1 ORDER BY id').all()));

router.put('/branches/:id', owner, h(req => {
  const b = req.body || {};
  db.prepare('UPDATE branches SET name = COALESCE(?, name), address = ?, phone = ?, gstin = ? WHERE id = ?')
    .run(str(b.name, 80), str(b.address, 300), str(b.phone, 30), str(b.gstin, 20), int(req.params.id));
  audit(req.user.id, 'branch.update', { id: req.params.id });
  return { ok: true };
}));

router.get('/settings', auth, h(() => Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map(r => [r.key, r.value]))));

router.put('/settings', owner, h(req => {
  const allowed = ['shop_name', 'gstin', 'receipt_footer', 'default_gst_rate', 'default_hsn'];
  const up = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  for (const k of allowed) if (k in (req.body || {})) up.run(k, str(req.body[k], 500));
  audit(req.user.id, 'settings.update');
  return { ok: true };
}));

/* ---------------- products & stock ---------------- */
const PRODUCT_COLS = `p.*, COALESCE((SELECT qty FROM stock WHERE product_id = p.id AND branch_id = @branch), 0) AS stock,
                      COALESCE((SELECT SUM(qty) FROM stock WHERE product_id = p.id), 0) AS total_stock`;

router.get('/products', auth, h(req => {
  const branch = branchFor(req, req.query.branch_id);
  const where = ['p.active = 1'];
  const params = { branch };
  if (req.query.q) { where.push('(p.name LIKE @q OR p.sku LIKE @q OR p.colour_desc LIKE @q OR p.category LIKE @q)'); params.q = `%${req.query.q}%`; }
  if (req.query.category) { where.push('p.category = @cat'); params.cat = req.query.category; }
  if (req.query.ids) {
    const ids = String(req.query.ids).split(',').map(Number).filter(Number.isInteger).slice(0, 500);
    where.push(`p.id IN (${ids.length ? ids.join(',') : 0})`);
  }
  let sql = `SELECT ${PRODUCT_COLS} FROM products p WHERE ${where.join(' AND ')}`;
  if (req.query.low === '1') sql = `SELECT * FROM (${sql}) WHERE stock <= low_stock_at`;
  return db.prepare(sql + ' ORDER BY id DESC LIMIT 500').all(params);
}));

router.get('/products/lookup/:code', auth, h(req => {
  const code = normaliseCode(req.params.code);
  const branch = branchFor(req, req.query.branch_id);
  const p = db.prepare(`SELECT ${PRODUCT_COLS} FROM products p WHERE p.sku = @code AND p.active = 1`).get({ code, branch });
  if (!p) throw new BillError(`No product with code "${code}"`, 404);
  p.by_branch = db.prepare(`SELECT b.id, b.name, b.code, COALESCE(s.qty,0) qty FROM branches b
                            LEFT JOIN stock s ON s.branch_id = b.id AND s.product_id = ? WHERE b.active = 1 ORDER BY b.id`).all(p.id);
  return p;
}));

router.get('/products/:id/movements', auth, h(req => db.prepare(
  `SELECT m.*, b.code AS branch_code, u.name AS user_name FROM stock_movements m
   JOIN branches b ON b.id = m.branch_id LEFT JOIN users u ON u.id = m.user_id
   WHERE m.product_id = ? ORDER BY m.id DESC LIMIT 200`).all(int(req.params.id)))
);

router.get('/categories', auth, h(() => db.prepare('SELECT DISTINCT category FROM products WHERE active = 1 ORDER BY category').all().map(r => r.category)));

function productFields(b) {
  const f = {
    name: str(b.name, 120), colour_desc: str(b.colour_desc, 120), category: str(b.category, 60), occasion: str(b.occasion, 40),
    colour: str(b.colour, 30), size: str(b.size, 30), price: int(b.price), mrp: int(b.mrp),
    gst_rate: b.gst_rate === '' || b.gst_rate == null ? +setting('default_gst_rate', 5) : +b.gst_rate,
    hsn: str(b.hsn, 12) || setting('default_hsn'), image_url: str(b.image_url, 500), tag: str(b.tag, 30),
    online: b.online === false || b.online === 0 || b.online === '0' ? 0 : 1, low_stock_at: int(b.low_stock_at, 2)
  };
  if (!f.name) bad('Product name is required');
  if (!f.category) bad('Category is required');
  if (f.price == null || f.price < 0) bad('Enter a valid price');
  if (!(f.gst_rate >= 0 && f.gst_rate <= 28)) bad('GST rate must be between 0 and 28');
  if (f.image_url && !/^https?:\/\//i.test(f.image_url)) bad('Image link must start with http(s)://');
  return f;
}

router.post('/products', manager, h(req => {
  const f = productFields(req.body || {});
  let sku = str(req.body.sku, 40);
  if (sku && !/^[A-Za-z0-9-]+$/.test(sku)) bad('SKU can only have letters, numbers and -');
  return db.transaction(() => {
    if (!sku) {
      do { sku = 'GVS' + String(billing.nextNumber('sku')).padStart(5, '0'); }
      while (db.prepare('SELECT 1 FROM products WHERE sku = ?').get(sku));
    }
    const r = db.prepare(`INSERT INTO products (sku, name, colour_desc, category, occasion, colour, size, price, mrp, gst_rate, hsn, image_url, tag, online, low_stock_at)
      VALUES (@sku, @name, @colour_desc, @category, @occasion, @colour, @size, @price, @mrp, @gst_rate, @hsn, @image_url, @tag, @online, @low_stock_at)`)
      .run({ ...f, sku });
    const qty = int(req.body.initial_qty, 0);
    if (qty > 0) {
      const branch = branchFor(req, req.body.branch_id);
      db.prepare('INSERT INTO stock (product_id, branch_id, qty) VALUES (?, ?, ?)').run(r.lastInsertRowid, branch, qty);
      db.prepare(`INSERT INTO stock_movements (product_id, branch_id, change, reason, note, user_id) VALUES (?,?,?,'stock_in','Opening stock',?)`)
        .run(r.lastInsertRowid, branch, qty, req.user.id);
    }
    audit(req.user.id, 'product.create', { sku });
    return db.prepare('SELECT * FROM products WHERE id = ?').get(r.lastInsertRowid);
  })();
}));

router.put('/products/:id', manager, h(req => {
  const f = productFields(req.body || {});
  const r = db.prepare(`UPDATE products SET name=@name, colour_desc=@colour_desc, category=@category, occasion=@occasion, colour=@colour,
      size=@size, price=@price, mrp=@mrp, gst_rate=@gst_rate, hsn=@hsn, image_url=@image_url, tag=@tag, online=@online,
      low_stock_at=@low_stock_at, updated_at=datetime('now') WHERE id=@id`).run({ ...f, id: int(req.params.id) });
  if (!r.changes) throw new BillError('Product not found', 404);
  audit(req.user.id, 'product.update', { id: req.params.id });
  return { ok: true };
}));

router.delete('/products/:id', manager, h(req => {
  db.prepare("UPDATE products SET active = 0, updated_at = datetime('now') WHERE id = ?").run(int(req.params.id));
  audit(req.user.id, 'product.archive', { id: req.params.id });
  return { ok: true };
}));

// Stock in: new goods arrived. items: [{ product_id | sku, qty }]
router.post('/stock/in', manager, h(req => {
  const branch = branchFor(req, req.body.branch_id);
  const items = Array.isArray(req.body.items) ? req.body.items : [];
  if (!items.length) bad('Scan at least one item');
  const note = str(req.body.note, 200);
  return db.transaction(() => {
    const ref = 'IN-' + Date.now().toString(36).toUpperCase();
    const out = [];
    for (const it of items) {
      const qty = int(it.qty);
      if (!(qty > 0 && qty <= 10000)) bad('Invalid quantity');
      const p = it.product_id ? db.prepare('SELECT * FROM products WHERE id = ?').get(it.product_id)
        : db.prepare('SELECT * FROM products WHERE sku = ?').get(normaliseCode(it.sku));
      if (!p) bad(`Unknown product ${it.sku || it.product_id}`);
      db.prepare('INSERT INTO stock (product_id, branch_id, qty) VALUES (?, ?, ?) ON CONFLICT(product_id, branch_id) DO UPDATE SET qty = qty + excluded.qty')
        .run(p.id, branch, qty);
      db.prepare(`INSERT INTO stock_movements (product_id, branch_id, change, reason, ref, note, user_id) VALUES (?,?,?,'stock_in',?,?,?)`)
        .run(p.id, branch, qty, ref, note, req.user.id);
      const now = db.prepare('SELECT qty FROM stock WHERE product_id = ? AND branch_id = ?').get(p.id, branch).qty;
      out.push({ product_id: p.id, sku: p.sku, name: p.name, size: p.size, added: qty, stock: now });
    }
    audit(req.user.id, 'stock.in', { ref, count: out.length });
    return { ref, items: out };
  })();
}));

// Undo a stock-in scan (e.g. scanned twice by mistake)
router.post('/stock/undo', manager, h(req => {
  const branch = branchFor(req, req.body.branch_id);
  const pid = int(req.body.product_id), qty = int(req.body.qty, 1);
  if (!(qty > 0 && qty <= 10000)) bad('Invalid quantity');
  return db.transaction(() => {
    const r = db.prepare('UPDATE stock SET qty = qty - ? WHERE product_id = ? AND branch_id = ? AND qty >= ?').run(qty, pid, branch, qty);
    if (r.changes !== 1) bad('Not enough stock to undo');
    db.prepare(`INSERT INTO stock_movements (product_id, branch_id, change, reason, note, user_id) VALUES (?,?,?,'adjustment','Undo stock-in scan',?)`)
      .run(pid, branch, -qty, req.user.id);
    return { ok: true, stock: db.prepare('SELECT qty FROM stock WHERE product_id = ? AND branch_id = ?').get(pid, branch).qty };
  })();
}));

// Stock count correction: set the exact quantity on the shelf
router.post('/stock/adjust', manager, h(req => {
  const branch = branchFor(req, req.body.branch_id);
  const pid = int(req.body.product_id), qty = int(req.body.qty);
  if (!(qty >= 0)) bad('Invalid quantity');
  return db.transaction(() => {
    const cur = (db.prepare('SELECT qty FROM stock WHERE product_id = ? AND branch_id = ?').get(pid, branch) || { qty: 0 }).qty;
    if (cur === qty) return { ok: true, change: 0 };
    db.prepare('INSERT INTO stock (product_id, branch_id, qty) VALUES (?, ?, ?) ON CONFLICT(product_id, branch_id) DO UPDATE SET qty = excluded.qty')
      .run(pid, branch, qty);
    db.prepare(`INSERT INTO stock_movements (product_id, branch_id, change, reason, note, user_id) VALUES (?,?,?,'adjustment',?,?)`)
      .run(pid, branch, qty - cur, str(req.body.note, 200) || 'Stock count correction', req.user.id);
    audit(req.user.id, 'stock.adjust', { pid, branch, from: cur, to: qty });
    return { ok: true, change: qty - cur };
  })();
}));

/* ---------------- coupons ---------------- */
router.get('/coupons', manager, h(() => db.prepare('SELECT * FROM coupons ORDER BY id DESC').all()));

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

router.post('/coupons', manager, h(req => {
  const f = couponFields(req.body || {});
  const r = db.prepare(`INSERT INTO coupons (code, description, type, value, max_discount, min_bill, category, max_uses, per_customer, valid_from, valid_to, active)
    VALUES (@code, @description, @type, @value, @max_discount, @min_bill, @category, @max_uses, @per_customer, @valid_from, @valid_to, @active)`).run(f);
  audit(req.user.id, 'coupon.create', { code: f.code });
  return db.prepare('SELECT * FROM coupons WHERE id = ?').get(r.lastInsertRowid);
}));

router.put('/coupons/:id', manager, h(req => {
  const f = couponFields(req.body || {});
  db.prepare(`UPDATE coupons SET code=@code, description=@description, type=@type, value=@value, max_discount=@max_discount, min_bill=@min_bill,
    category=@category, max_uses=@max_uses, per_customer=@per_customer, valid_from=@valid_from, valid_to=@valid_to, active=@active WHERE id=@id`)
    .run({ ...f, id: int(req.params.id) });
  audit(req.user.id, 'coupon.update', { code: f.code });
  return { ok: true };
}));

/* ---------------- billing ---------------- */
router.post('/bills/quote', auth, h(req => billing.quote({ ...req.body, branch_id: branchFor(req, req.body.branch_id) })));

router.post('/bills', auth, h(req => billing.createBill({ ...req.body, branch_id: branchFor(req, req.body.branch_id) }, req.user)));

router.get('/bills', auth, h(req => {
  const where = ['1=1'], p = {};
  if (req.user.role === 'cashier') { where.push('b.branch_id = @br'); p.br = req.user.branch_id; }
  else if (req.query.branch_id) { where.push('b.branch_id = @br'); p.br = int(req.query.branch_id); }
  if (req.query.q) { where.push('(b.invoice_no LIKE @q OR b.customer_phone LIKE @q OR b.customer_name LIKE @q)'); p.q = `%${req.query.q}%`; }
  if (req.query.from) { where.push(`date(b.created_at, ${IST}) >= @from`); p.from = req.query.from; }
  if (req.query.to) { where.push(`date(b.created_at, ${IST}) <= @to`); p.to = req.query.to; }
  return db.prepare(`SELECT b.id, b.invoice_no, b.customer_name, b.customer_phone, b.total, b.discount, b.coupon_code, b.payments, b.status,
                            b.created_at, br.code AS branch_code, u.name AS cashier,
                            (SELECT SUM(qty) FROM bill_items WHERE bill_id = b.id) AS items
                     FROM bills b JOIN branches br ON br.id = b.branch_id JOIN users u ON u.id = b.user_id
                     WHERE ${where.join(' AND ')} ORDER BY b.id DESC LIMIT 300`).all(p)
    .map(r => ({ ...r, payments: JSON.parse(r.payments) }));
}));

router.get('/bills/find', auth, h(req => {
  const b = db.prepare('SELECT id FROM bills WHERE invoice_no = ?').get(String(req.query.invoice || '').trim());
  if (!b) throw new BillError('Bill not found', 404);
  return billing.getBill(b.id);
}));

router.get('/bills/:id', auth, h(req => {
  const b = billing.getBill(int(req.params.id));
  if (!b) throw new BillError('Bill not found', 404);
  if (req.user.role === 'cashier' && b.branch_id !== req.user.branch_id) throw new BillError('Bill not found', 404);
  return b;
}));

router.post('/returns', auth, h(req => {
  const b = billing.getBill(int(req.body.bill_id));
  if (!b || (req.user.role === 'cashier' && b.branch_id !== req.user.branch_id)) throw new BillError('Bill not found', 404);
  return billing.createReturn(req.body, req.user);
}));

// CSV for the accountant
router.get('/export/bills.csv', manager, (req, res) => {
  const from = req.query.from || '2000-01-01', to = req.query.to || '2999-12-31';
  const rows = db.prepare(`SELECT b.invoice_no, datetime(b.created_at, ${IST}) AS date_ist, br.code AS branch, b.customer_name, b.customer_phone,
                                  b.subtotal, b.discount, b.taxable, b.cgst, b.sgst, b.round_off, b.total, b.coupon_code, b.payments, b.status
                           FROM bills b JOIN branches br ON br.id = b.branch_id
                           WHERE date(b.created_at, ${IST}) BETWEEN ? AND ? ORDER BY b.id`).all(from, to);
  const money = ['subtotal', 'discount', 'taxable', 'cgst', 'sgst', 'round_off', 'total'];
  const esc = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) || /^[=+\-@]/.test(s) ? `"${s.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : s; };
  const head = ['invoice_no', 'date_ist', 'branch', 'customer_name', 'customer_phone', ...money, 'coupon_code', 'payments', 'status'];
  const lines = rows.map(r => head.map(k => {
    if (money.includes(k)) return (r[k] / 100).toFixed(2);
    if (k === 'payments') return esc(JSON.parse(r.payments).map(p => `${p.mode}:${(p.amount / 100).toFixed(2)}`).join(' '));
    return esc(r[k]);
  }).join(','));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="bills_${from}_to_${to}.csv"`);
  res.send([head.join(','), ...lines].join('\n'));
});

/* ---------------- reports ---------------- */
router.get('/reports/summary', auth, h(req => {
  const br = req.user.role === 'cashier' ? req.user.branch_id : int(req.query.branch_id);
  const bf = br ? 'AND b.branch_id = @br' : '';
  const p = { br, today: billing.todayIST() };
  const today = db.prepare(`SELECT COUNT(*) bills, COALESCE(SUM(total),0) sales, COALESCE(SUM(discount),0) discount
                            FROM bills b WHERE date(created_at, ${IST}) = @today ${bf}`).get(p);
  const pays = { cash: 0, upi: 0, card: 0 };
  db.prepare(`SELECT payments FROM bills b WHERE date(created_at, ${IST}) = @today ${bf}`).all(p)
    .forEach(r => JSON.parse(r.payments).forEach(x => { pays[x.mode] = (pays[x.mode] || 0) + x.amount; }));
  const refunds = db.prepare(`SELECT COALESCE(SUM(amount),0) n FROM returns b WHERE date(created_at, ${IST}) = @today ${bf}`).get(p).n;
  const days = db.prepare(`SELECT date(created_at, ${IST}) d, SUM(total) sales, COUNT(*) bills FROM bills b
                           WHERE date(created_at, ${IST}) >= date(@today, '-13 days') ${bf} GROUP BY d ORDER BY d`).all(p);
  const top = db.prepare(`SELECT i.sku, i.name, SUM(i.qty - i.returned_qty) qty, SUM((i.line_total - i.discount) * (i.qty - i.returned_qty) / i.qty) amount
                          FROM bill_items i JOIN bills b ON b.id = i.bill_id
                          WHERE date(b.created_at, ${IST}) >= date(@today, '-29 days') ${bf}
                          GROUP BY i.product_id ORDER BY qty DESC LIMIT 8`).all(p);
  const low = db.prepare(`SELECT p.id, p.sku, p.name, p.size, p.low_stock_at, COALESCE(s.qty,0) qty FROM products p
                          LEFT JOIN stock s ON s.product_id = p.id AND s.branch_id = @b
                          WHERE p.active = 1 AND COALESCE(s.qty,0) <= p.low_stock_at ORDER BY qty LIMIT 20`).all({ b: br || req.user.branch_id || 1 });
  return { today: { ...today, refunds, payments: pays }, days, top, low };
}));

/* ---------------- users (owner only) ---------------- */
router.get('/users', owner, h(() => db.prepare(`SELECT u.id, u.username, u.name, u.role, u.branch_id, u.active, u.created_at, b.name AS branch_name
                                                 FROM users u LEFT JOIN branches b ON b.id = u.branch_id ORDER BY u.id`).all()));

router.post('/users', owner, h(req => {
  const b = req.body || {};
  const username = str(b.username, 30), name = str(b.name, 60);
  if (!username || !/^[a-zA-Z0-9_.]{3,30}$/.test(username)) bad('Username: 3–30 letters/numbers');
  if (!name) bad('Name is required');
  if (!['owner', 'manager', 'cashier'].includes(b.role)) bad('Choose a role');
  if (!b.password || String(b.password).length < 8) bad('Password must be at least 8 characters');
  const r = db.prepare(`INSERT INTO users (username, name, password_hash, role, branch_id, must_change_password) VALUES (?,?,?,?,?,1)`)
    .run(username, name, bcrypt.hashSync(String(b.password), 10), b.role, int(b.branch_id, 1));
  audit(req.user.id, 'user.create', { username, role: b.role });
  return { id: r.lastInsertRowid };
}));

router.put('/users/:id', owner, h(req => {
  const b = req.body || {}, id = int(req.params.id);
  if (id === req.user.id && (b.active === 0 || b.active === false || (b.role && b.role !== 'owner'))) bad('You cannot disable or demote yourself');
  if (b.role && !['owner', 'manager', 'cashier'].includes(b.role)) bad('Invalid role');
  db.prepare(`UPDATE users SET name = COALESCE(?, name), role = COALESCE(?, role), branch_id = COALESCE(?, branch_id),
              active = COALESCE(?, active), token_version = token_version + 1 WHERE id = ?`)
    .run(str(b.name, 60), b.role || null, int(b.branch_id), b.active == null ? null : (b.active ? 1 : 0), id);
  if (b.password) {
    if (String(b.password).length < 8) bad('Password must be at least 8 characters');
    db.prepare('UPDATE users SET password_hash = ?, must_change_password = 1 WHERE id = ?').run(bcrypt.hashSync(String(b.password), 10), id);
  }
  audit(req.user.id, 'user.update', { id });
  return { ok: true };
}));

/* ---------------- barcode / QR images for labels ---------------- */
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
