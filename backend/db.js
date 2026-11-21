// Database: PostgreSQL.
//  • On Vercel / any server: set DATABASE_URL (e.g. Neon) → uses the "pg" driver.
//  • On your laptop with no DATABASE_URL → uses PGlite, a real Postgres stored in ./data/pglite (no install needed).
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';

let driver;
if (DB_URL) {
  const { Pool, types } = require('pg');
  types.setTypeParser(20, v => Number(v));     // bigint  → number
  types.setTypeParser(1700, v => Number(v));   // numeric → number
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(DB_URL);
  const pool = new Pool({ connectionString: DB_URL, max: process.env.VERCEL ? 3 : 10, ...(local ? { ssl: false } : {}) });
  pool.on('error', e => console.error('Postgres pool error:', e.message));
  driver = {
    kind: 'postgres',
    query: (sql, p = []) => pool.query(sql, p).then(r => r.rows),
    tx: async fn => {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        const out = await fn((sql, p = []) => c.query(sql, p).then(r => r.rows));
        await c.query('COMMIT');
        return out;
      } catch (e) {
        await c.query('ROLLBACK').catch(() => {});
        throw e;
      } finally { c.release(); }
    }
  };
} else if (process.env.VERCEL) {
  // Don't crash the function — every API call will answer with this clear message instead
  const fail = () => Promise.reject(new Error('DATABASE_URL is not set. In Vercel: Storage → connect a Neon (Postgres) database to this project, then redeploy.'));
  driver = { kind: 'missing', query: fail, tx: fail };
} else {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  // Loaded by name at runtime so it is not bundled into the Vercel function
  const { PGlite } = require(['@electric-sql', 'pglite'].join('/'));
  const lite = new PGlite(path.join(DATA_DIR, 'pglite'), { parsers: { 20: Number, 1700: Number } });
  driver = {
    kind: 'local',
    query: (sql, p = []) => lite.query(sql, p).then(r => r.rows),
    tx: fn => lite.transaction(t => fn((sql, p = []) => t.query(sql, p).then(r => r.rows)))
  };
}

const query = driver.query;
const tx = driver.tx;
const one = async (q, sql, p) => (await q(sql, p))[0];

const SCHEMA = `
CREATE TABLE IF NOT EXISTS branches (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  address TEXT, phone TEXT, gstin TEXT,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner','manager','cashier')),
  branch_id INTEGER REFERENCES branches(id),
  active INTEGER NOT NULL DEFAULT 1,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  token_version INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower ON users (lower(username));

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  colour_desc TEXT,
  category TEXT NOT NULL,
  occasion TEXT, colour TEXT, size TEXT,
  price INTEGER NOT NULL CHECK (price >= 0),      -- rupees, GST inclusive
  mrp INTEGER,
  gst_rate NUMERIC(5,2) NOT NULL DEFAULT 5,
  hsn TEXT, image_url TEXT, tag TEXT,
  online INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  low_stock_at INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS products_sku_lower ON products (lower(sku));

CREATE TABLE IF NOT EXISTS stock (
  product_id INTEGER NOT NULL REFERENCES products(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  qty INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
  PRIMARY KEY (product_id, branch_id)
);
CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  change INTEGER NOT NULL,
  reason TEXT NOT NULL CHECK (reason IN ('sale','stock_in','return','adjustment')),
  ref TEXT, note TEXT,
  user_id INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mov_product ON stock_movements(product_id, created_at);

CREATE TABLE IF NOT EXISTS coupons (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('percent','flat')),
  value INTEGER NOT NULL CHECK (value > 0),
  max_discount INTEGER,
  min_bill INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  max_uses INTEGER,
  per_customer INTEGER,
  valid_from TEXT, valid_to TEXT,               -- 'YYYY-MM-DD'
  active INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_lower ON coupons (lower(code));

CREATE TABLE IF NOT EXISTS bills (
  id SERIAL PRIMARY KEY,
  invoice_no TEXT NOT NULL UNIQUE,
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  customer_name TEXT, customer_phone TEXT,
  subtotal BIGINT NOT NULL, discount BIGINT NOT NULL, taxable BIGINT NOT NULL,   -- money in PAISE
  cgst BIGINT NOT NULL, sgst BIGINT NOT NULL, round_off BIGINT NOT NULL, total BIGINT NOT NULL,
  coupon_id INTEGER REFERENCES coupons(id), coupon_code TEXT,
  payments TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','partly_returned','returned')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bills_date ON bills(created_at);
CREATE INDEX IF NOT EXISTS idx_bills_phone ON bills(customer_phone);

CREATE TABLE IF NOT EXISTS bill_items (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER NOT NULL REFERENCES bills(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  sku TEXT NOT NULL, name TEXT NOT NULL, size TEXT, hsn TEXT,
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price BIGINT NOT NULL, line_total BIGINT NOT NULL, discount BIGINT NOT NULL,
  gst_rate NUMERIC(5,2) NOT NULL, taxable BIGINT NOT NULL, tax BIGINT NOT NULL,
  returned_qty INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_items_bill ON bill_items(bill_id);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id SERIAL PRIMARY KEY,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id),
  bill_id INTEGER NOT NULL REFERENCES bills(id),
  customer_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS returns (
  id SERIAL PRIMARY KEY,
  credit_no TEXT NOT NULL UNIQUE,
  bill_id INTEGER NOT NULL REFERENCES bills(id),
  branch_id INTEGER NOT NULL REFERENCES branches(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  amount BIGINT NOT NULL,
  items TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, value BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY, user_id INTEGER, action TEXT NOT NULL, detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS login_attempts (
  id SERIAL PRIMARY KEY, username TEXT, ip TEXT, ok INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts ON login_attempts(created_at);
`;

const SAMPLE = [
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

async function setup() {
  await tx(async q => {
    await q('SELECT pg_advisory_xact_lock(7342001)');   // only one instance sets up at a time
    for (const stmt of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) await q(stmt);

    if (!(await one(q, 'SELECT 1 FROM branches LIMIT 1'))) {
      const b = [
        ['BHG', 'Bhuvanagiri (Bhongir)', 'Municipal Door Nos. 1-3-234/3 to 234/13, beside Govt. Junior College, Medikuntapally, Bhuvanagiri'],
        ['HYD', 'Kavuri Hills, Hyderabad', 'CPR Galaxy, Plot No. 71, Kavuri Hills, Hyderabad – 500033'],
        ['JDC', 'Jadcherla', 'H. No. 14-10, Netaji Road, Badepally, Jadcherla, Mahabubnagar – 509301'],
        ['JMK', 'Jammikunta', 'H. No. 3-2-15/k/2/1/A/1, Sy. No. 661, Jammikunta, Dist. Karimnagar']
      ];
      for (const [code, name, address] of b) {
        await q('INSERT INTO branches (code, name, address, phone) VALUES ($1,$2,$3,$4)', [code, name, address, '+91 92479 94041']);
      }
    }

    const defaults = {
      shop_name: 'Garuda Vastra Silks', gstin: '',
      receipt_footer: 'Thank you for shopping with us! Exchange within 7 days with bill. No exchange on discounted items.',
      default_gst_rate: '5', default_hsn: '5007',
      jwt_secret: crypto.randomBytes(48).toString('hex')   // used only if JWT_SECRET env is not set
    };
    for (const [k, v] of Object.entries(defaults)) {
      await q('INSERT INTO settings (key, value) VALUES ($1,$2) ON CONFLICT (key) DO NOTHING', [k, v]);
    }

    if (!(await one(q, 'SELECT 1 FROM users LIMIT 1'))) {
      const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(6).toString('base64url');
      const branch = await one(q, 'SELECT id FROM branches ORDER BY id LIMIT 1');
      await q(`INSERT INTO users (username, name, password_hash, role, branch_id, must_change_password)
               VALUES ('owner', 'Owner', $1, 'owner', $2, 1)`, [bcrypt.hashSync(password, 10), branch.id]);
      const msg = `First login →  username: owner   password: ${process.env.ADMIN_PASSWORD ? '(the ADMIN_PASSWORD you set)' : password}\n(You will be asked to change it after logging in.)\n`;
      console.log('\n==============================================\n' + msg + '==============================================\n');
      if (driver.kind === 'local') fs.writeFileSync(path.join(DATA_DIR, 'FIRST-LOGIN.txt'), msg.replace('(the ADMIN_PASSWORD you set)', password));
    }

    if (!(await one(q, 'SELECT 1 FROM products LIMIT 1')) && process.env.SEED_SAMPLE !== 'false') {
      const branch = await one(q, 'SELECT id FROM branches ORDER BY id LIMIT 1');
      for (let i = 0; i < SAMPLE.length; i++) {
        const s = SAMPLE[i];
        const sku = 'GVS' + String(i + 1).padStart(5, '0');
        const p = await one(q, `INSERT INTO products (sku, name, colour_desc, category, occasion, colour, size, price, mrp, gst_rate, hsn, tag)
                                VALUES ($1,$2,$3,$4,$5,$6,'Free Size',$7,$8,5,'5007',$9) RETURNING id`, [sku, ...s]);
        await q('INSERT INTO stock (product_id, branch_id, qty) VALUES ($1,$2,$3)', [p.id, branch.id, 3 + (i % 4)]);
      }
      await q(`INSERT INTO counters (key, value) VALUES ('sku', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [SAMPLE.length]);
    }
  });
}

let readyPromise = null;
function ready() {
  if (!readyPromise) readyPromise = setup().catch(e => { readyPromise = null; throw e; });
  return readyPromise;
}

async function setting(key, fallback = null, q = query) {
  const r = await one(q, 'SELECT value FROM settings WHERE key = $1', [key]);
  return r ? r.value : fallback;
}

async function audit(userId, action, detail, q = query) {
  await q('INSERT INTO audit_log (user_id, action, detail) VALUES ($1,$2,$3)', [userId || null, action, detail ? JSON.stringify(detail) : null]);
}

module.exports = { query, tx, one, ready, setting, audit, DATA_DIR, kind: driver.kind };
