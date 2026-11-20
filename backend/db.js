// SQLite database: schema, migrations and first-run seed.
// The database file lives in /data (git-ignored). Never commit it.
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
// Hide Node's "SQLite is experimental" notice (it works fine; it's just a label)
const _emit = process.emitWarning;
process.emitWarning = (w, ...a) => (String(w && w.message || w).includes('SQLite') ? undefined : _emit.call(process, w, ...a));
const { DatabaseSync } = require('node:sqlite'); // built into Node 22.13+ / 24 — nothing to compile
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'garuda.db');

const raw = new DatabaseSync(DB_PATH);
raw.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

// Small wrapper so the rest of the code can use a simple API:
//   db.prepare(sql).run/get/all(params), db.exec(sql), db.transaction(fn)(), db.backup(file)
const fix = v => (v === undefined ? null : typeof v === 'boolean' ? (v ? 1 : 0) : v);
const stmtCache = new Map();
function prepare(sql) {
  let st = stmtCache.get(sql);
  if (st) return st;
  const s = raw.prepare(sql);
  const names = [...new Set([...sql.matchAll(/[@:$]([A-Za-z_][A-Za-z0-9_]*)/g)].map(m => m[1]))];
  const args = a => {
    if (a.length === 1 && a[0] && typeof a[0] === 'object' && !Array.isArray(a[0])) {
      const o = {};
      for (const n of names) o[n] = fix(a[0][n]);
      return [o];
    }
    return a.map(fix);
  };
  st = {
    run: (...a) => { const r = s.run(...args(a)); return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) }; },
    get: (...a) => s.get(...args(a)),
    all: (...a) => s.all(...args(a))
  };
  stmtCache.set(sql, st);
  return st;
}
let depth = 0;
function transaction(fn) {
  return (...a) => {
    const sp = 'sp' + depth;
    raw.exec(depth === 0 ? 'BEGIN IMMEDIATE' : `SAVEPOINT ${sp}`);
    depth++;
    try {
      const out = fn(...a);
      depth--;
      raw.exec(depth === 0 ? 'COMMIT' : `RELEASE ${sp}`);
      return out;
    } catch (e) {
      depth--;
      raw.exec(depth === 0 ? 'ROLLBACK' : `ROLLBACK TO ${sp}; RELEASE ${sp}`);
      throw e;
    }
  };
}
// Safe copy of the live database (works while the server is running)
async function backup(file) {
  if (fs.existsSync(file)) fs.unlinkSync(file);
  raw.prepare('VACUUM INTO ?').run(file);
}
const db = { prepare, exec: sql => raw.exec(sql), transaction, backup };

db.exec(`
CREATE TABLE IF NOT EXISTS branches (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,          -- short code used in invoice numbers, e.g. BHG
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  gstin TEXT,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','manager','cashier')),
  branch_id INTEGER REFERENCES branches(id),
  active INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE COLLATE NOCASE,   -- printed as barcode + QR on the sticker
  name TEXT NOT NULL,
  colour_desc TEXT,                          -- "Sea Green with Maroon Border"
  category TEXT NOT NULL,                    -- Kanchipuram, Banarasi, Shirts, Kids...
  occasion TEXT,
  colour TEXT,                               -- filter colour: Red, Green, Pastel...
  size TEXT,                                 -- Free size, M, L, 40...
  price INTEGER NOT NULL CHECK (price >= 0), -- selling price in rupees (GST inclusive)
  mrp INTEGER,
  gst_rate REAL NOT NULL DEFAULT 5,          -- percent; confirm with the shop's accountant
  hsn TEXT,
  image_url TEXT,
  tag TEXT,
  online INTEGER NOT NULL DEFAULT 1,         -- show on public website
  active INTEGER NOT NULL DEFAULT 1,
  low_stock_at INTEGER NOT NULL DEFAULT 2,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stock (
  product_id INTEGER NOT NULL REFERENCES products(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  qty INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
  PRIMARY KEY (product_id, branch_id)
);

-- Every change to stock is logged here (sale, stock in, return, adjustment)
CREATE TABLE IF NOT EXISTS stock_movements (
  id INTEGER PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  change INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('sale','stock_in','return','adjustment')),
  ref TEXT,
  note TEXT,
  user_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_mov_product ON stock_movements(product_id, created_at);

CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY,
  code TEXT NOT NULL UNIQUE COLLATE NOCASE,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('percent','flat')),
  value INTEGER NOT NULL CHECK (value > 0),  -- percent (1-100) or rupees
  max_discount INTEGER,                      -- cap for percent coupons (rupees)
  min_bill INTEGER NOT NULL DEFAULT 0,       -- minimum bill amount (rupees)
  category TEXT,                             -- only items of this category (optional)
  max_uses INTEGER,                          -- total uses allowed (NULL = unlimited)
  per_customer INTEGER,                      -- uses per customer phone (NULL = unlimited)
  valid_from TEXT,
  valid_to TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY,
  invoice_no TEXT NOT NULL UNIQUE,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  customer_name TEXT,
  customer_phone TEXT,
  subtotal INTEGER NOT NULL,     -- all money columns are in PAISE
  discount INTEGER NOT NULL,
  taxable INTEGER NOT NULL,
  cgst INTEGER NOT NULL,
  sgst INTEGER NOT NULL,
  round_off INTEGER NOT NULL,
  total INTEGER NOT NULL,
  coupon_id INTEGER REFERENCES coupons(id),
  coupon_code TEXT,
  payments TEXT NOT NULL,        -- JSON: [{"mode":"cash","amount":paise}]
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','partly_returned','returned')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(created_at);
CREATE INDEX IF NOT EXISTS idx_bills_phone ON bills(customer_phone);

CREATE TABLE IF NOT EXISTS bill_items (
  id INTEGER PRIMARY KEY,
  bill_id INTEGER NOT NULL REFERENCES bills(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  size TEXT,
  hsn TEXT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price INTEGER NOT NULL,   -- paise
  line_total INTEGER NOT NULL,   -- paise, before coupon
  discount INTEGER NOT NULL,     -- paise share of coupon
  gst_rate REAL NOT NULL,
  taxable INTEGER NOT NULL,
  tax INTEGER NOT NULL,
  returned_qty INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id INTEGER PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id),
  bill_id INTEGER NOT NULL REFERENCES bills(id),
  customer_phone TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS returns (
  id INTEGER PRIMARY KEY,
  credit_no TEXT NOT NULL UNIQUE,
  bill_id INTEGER NOT NULL REFERENCES bills(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,       -- paise refunded / credited
  items TEXT NOT NULL,           -- JSON
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS counters (
  key TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  user_id INTEGER,
  action TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

function setting(key, fallback = null) {
  const r = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return r ? r.value : fallback;
}

function audit(userId, action, detail) {
  db.prepare('INSERT INTO audit_log (user_id, action, detail) VALUES (?, ?, ?)')
    .run(userId || null, action, detail ? JSON.stringify(detail) : null);
}

/* ---------------- first-run seed ---------------- */
function seed() {
  const hasBranches = db.prepare('SELECT COUNT(*) c FROM branches').get().c > 0;
  if (!hasBranches) {
    const ins = db.prepare('INSERT INTO branches (code, name, address, phone) VALUES (?, ?, ?, ?)');
    ins.run('BHG', 'Bhuvanagiri (Bhongir)', 'Municipal Door Nos. 1-3-234/3 to 234/13, beside Govt. Junior College, Medikuntapally, Bhuvanagiri', '+91 92479 94041');
    ins.run('HYD', 'Kavuri Hills, Hyderabad', 'CPR Galaxy, Plot No. 71, Kavuri Hills, Hyderabad – 500033', '+91 92479 94041');
    ins.run('JDC', 'Jadcherla', 'H. No. 14-10, Netaji Road, Badepally, Jadcherla, Mahabubnagar – 509301', '+91 92479 94041');
    ins.run('JMK', 'Jammikunta', 'H. No. 3-2-15/k/2/1/A/1, Sy. No. 661, Jammikunta, Dist. Karimnagar', '+91 92479 94041');
  }

  const defaults = {
    shop_name: 'Garuda Vastra Silks',
    gstin: '',
    receipt_footer: 'Thank you for shopping with us! Exchange within 7 days with bill. No exchange on discounted items.',
    default_gst_rate: '5',
    default_hsn: '5007'
  };
  const insS = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(defaults)) insS.run(k, v);

  const hasUsers = db.prepare('SELECT COUNT(*) c FROM users').get().c > 0;
  if (!hasUsers) {
    const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(6).toString('base64url');
    db.prepare(`INSERT INTO users (username, name, password_hash, role, branch_id, must_change_password)
                VALUES ('owner', 'Owner', ?, 'owner', 1, 1)`).run(bcrypt.hashSync(password, 10));
    const msg = `First login →  username: owner   password: ${password}\n(You will be asked to change it after logging in.)\n`;
    fs.writeFileSync(path.join(DATA_DIR, 'FIRST-LOGIN.txt'), msg);
    console.log('\n==============================================');
    console.log(msg + `Also saved in ${path.join(DATA_DIR, 'FIRST-LOGIN.txt')} — delete that file after logging in.`);
    console.log('==============================================\n');
  }

  const hasProducts = db.prepare('SELECT COUNT(*) c FROM products').get().c > 0;
  if (!hasProducts && process.env.SEED_SAMPLE !== 'false') {
    // Sample catalogue (same as the website preview). Delete/replace with real stock.
    const sample = [
      ['Temple Border Kanchipuram', 'Sea Green with Maroon Border', 'Kanchipuram', 'Wedding', 'Green', 18500, 21000, 'BESTSELLER'],
      ['Bridal Kanchipuram Pattu', 'Crimson & Antique Gold', 'Kanchipuram', 'Wedding', 'Red', 42000, null, 'BRIDAL'],
      ['Banarasi Katan Brocade', 'Royal Blue', 'Banarasi', 'Festive', 'Blue', 24500, null, 'NEW'],
      ['Banarasi Floral Jaal', 'Magenta with Purple Border', 'Banarasi', 'Celebration', 'Pink', 16800, 18900, null],
      ['Soft Silk Zari Border', 'Peach with Maroon Border', 'Soft Silk', 'Celebration', 'Pastel', 7900, null, 'NEW'],
      ['Soft Silk Butta Weave', 'Lavender', 'Soft Silk', 'Everyday', 'Pastel', 6400, null, null],
      ['Gadwal Silk Cotton', 'Mustard with Maroon Pallu', 'Handloom', 'Festive', 'Yellow', 8900, null, 'TELANGANA WEAVE'],
      ['Pochampally Ikat Silk', 'Indigo & Red', 'Handloom', 'Festive', 'Blue', 9200, null, 'TELANGANA WEAVE'],
      ['Handloom Cotton', 'Ivory with Maroon Border', 'Handloom', 'Everyday', 'Pastel', 2400, null, null],
      ['Mangalagiri Cotton', 'Leaf Green with Gold Border', 'Handloom', 'Everyday', 'Green', 1850, null, null],
      ['Kanchipuram Korvai', 'Mango Yellow & Rani Pink', 'Kanchipuram', 'Wedding', 'Yellow', 28500, null, 'NEW'],
      ['Contemporary Tissue Organza', 'Blush Pink', 'Contemporary', 'Celebration', 'Pink', 9800, null, null],
      ['Narayanpet Silk', 'Maroon with Mustard Border', 'Handloom', 'Festive', 'Red', 5600, null, 'TELANGANA WEAVE']
    ];
    const insP = db.prepare(`INSERT INTO products (sku, name, colour_desc, category, occasion, colour, size, price, mrp, gst_rate, hsn, tag)
                             VALUES (?, ?, ?, ?, ?, ?, 'Free Size', ?, ?, 5, '5007', ?)`);
    const insStock = db.prepare('INSERT INTO stock (product_id, branch_id, qty) VALUES (?, 1, ?)');
    db.transaction(() => {
      sample.forEach((s, i) => {
        const sku = 'GVS' + String(i + 1).padStart(5, '0');
        const r = insP.run(sku, s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7]);
        insStock.run(r.lastInsertRowid, 3 + (i % 4));
      });
      db.prepare("INSERT OR REPLACE INTO counters (key, value) VALUES ('sku', ?)").run(sample.length);
    })();
  }
}
seed();

module.exports = { db, setting, audit, DATA_DIR, DB_PATH };
