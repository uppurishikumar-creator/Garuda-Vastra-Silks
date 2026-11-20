// Bill calculation + saving. The server ALWAYS recalculates prices, coupon and GST —
// it never trusts numbers sent from the browser.
const { db, audit, setting } = require('./db');

const IST = "'+5 hours', '+30 minutes'";

class BillError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

function todayIST() {
  return new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
}

function financialYear() {
  const d = new Date(Date.now() + 5.5 * 3600e3);
  const y = d.getUTCFullYear(), m = d.getUTCMonth() + 1;
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

function nextNumber(prefix) {
  const key = `${prefix}`;
  db.prepare('INSERT INTO counters (key, value) VALUES (?, 0) ON CONFLICT(key) DO NOTHING').run(key);
  db.prepare('UPDATE counters SET value = value + 1 WHERE key = ?').run(key);
  return db.prepare('SELECT value FROM counters WHERE key = ?').get(key).value;
}

function cleanPhone(p) {
  if (!p) return null;
  const d = String(p).replace(/\D/g, '').slice(-10);
  return d.length === 10 ? d : null;
}

// Validate coupon and work out the discount (in paise) for the given lines.
function applyCoupon(code, lines, subtotal, phone) {
  const c = db.prepare('SELECT * FROM coupons WHERE code = ?').get(String(code).trim());
  if (!c || !c.active) throw new BillError('Coupon not found or inactive');
  const today = todayIST();
  if (c.valid_from && today < c.valid_from) throw new BillError(`Coupon starts on ${c.valid_from}`);
  if (c.valid_to && today > c.valid_to) throw new BillError('Coupon has expired');
  if (c.max_uses != null && c.used_count >= c.max_uses) throw new BillError('Coupon usage limit reached');
  if (c.per_customer != null) {
    if (!phone) throw new BillError('Enter the customer phone number to use this coupon');
    const used = db.prepare('SELECT COUNT(*) n FROM coupon_redemptions WHERE coupon_id = ? AND customer_phone = ?').get(c.id, phone).n;
    if (used >= c.per_customer) throw new BillError('This customer has already used this coupon');
  }
  if (subtotal < c.min_bill * 100) throw new BillError(`Minimum bill for this coupon is ₹${c.min_bill}`);

  const eligible = lines.filter(l => !c.category || l.category.toLowerCase() === c.category.toLowerCase());
  const base = eligible.reduce((s, l) => s + l.line_total, 0);
  if (!base) throw new BillError(`Coupon only applies to ${c.category} items`);

  let discount = c.type === 'percent' ? Math.floor(base * c.value / 100) : c.value * 100;
  if (c.type === 'percent' && c.max_discount) discount = Math.min(discount, c.max_discount * 100);
  discount = Math.min(discount, base);

  // Share the discount across eligible lines (needed for correct GST per line)
  let left = discount;
  eligible.forEach((l, i) => {
    const share = i === eligible.length - 1 ? left : Math.floor(discount * l.line_total / base);
    l.discount = share; left -= share;
  });
  return { coupon: c, discount };
}

// items: [{ product_id | sku, qty }]
function quote({ items, coupon_code, customer_phone, branch_id }) {
  if (!Array.isArray(items) || !items.length) throw new BillError('Bill is empty');
  const phone = cleanPhone(customer_phone);
  const merged = new Map();
  for (const it of items) {
    const qty = parseInt(it.qty, 10);
    if (!(qty > 0 && qty <= 999)) throw new BillError('Invalid quantity');
    const p = it.product_id
      ? db.prepare('SELECT * FROM products WHERE id = ?').get(it.product_id)
      : db.prepare('SELECT * FROM products WHERE sku = ?').get(String(it.sku || '').trim());
    if (!p || !p.active) throw new BillError(`Product not found: ${it.sku || it.product_id}`);
    const prev = merged.get(p.id);
    merged.set(p.id, { p, qty: (prev ? prev.qty : 0) + qty });
  }

  const stockQ = db.prepare('SELECT qty FROM stock WHERE product_id = ? AND branch_id = ?');
  const lines = [...merged.values()].map(({ p, qty }) => {
    const inStock = (stockQ.get(p.id, branch_id) || { qty: 0 }).qty;
    return {
      product_id: p.id, sku: p.sku, name: p.name, size: p.size, hsn: p.hsn, category: p.category,
      qty, in_stock: inStock, unit_price: p.price * 100, line_total: p.price * 100 * qty,
      gst_rate: p.gst_rate, discount: 0
    };
  });

  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  let coupon = null, discount = 0, couponError = null;
  if (coupon_code && String(coupon_code).trim()) {
    try { ({ coupon, discount } = applyCoupon(coupon_code, lines, subtotal, phone)); }
    catch (e) { if (e instanceof BillError) couponError = e.message; else throw e; }
  }

  let taxable = 0, tax = 0;
  for (const l of lines) {
    const net = l.line_total - l.discount;
    l.taxable = Math.round(net * 100 / (100 + l.gst_rate));
    l.tax = net - l.taxable;
    taxable += l.taxable; tax += l.tax;
  }
  const cgst = Math.round(tax / 2);
  const gross = subtotal - discount;
  const total = Math.round(gross / 100) * 100;
  return {
    lines, subtotal, discount, taxable, cgst, sgst: tax - cgst, gross,
    round_off: total - gross, total, customer_phone: phone,
    coupon: coupon ? { id: coupon.id, code: coupon.code, description: coupon.description } : null,
    coupon_error: couponError
  };
}

const PAY_MODES = ['cash', 'upi', 'card'];

function createBill(input, user) {
  const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(input.branch_id);
  if (!branch) throw new BillError('Branch not found');

  return db.transaction(() => {
    const q = quote({ ...input, branch_id: branch.id });
    if (q.coupon_error) throw new BillError(q.coupon_error);
    for (const l of q.lines) {
      if (l.qty > l.in_stock) throw new BillError(`Only ${l.in_stock} left of ${l.name} (${l.sku}) at ${branch.name}`);
    }

    const payments = (Array.isArray(input.payments) ? input.payments : [])
      .map(p => ({ mode: String(p.mode), amount: Math.round(Number(p.amount) * 100) }))
      .filter(p => p.amount > 0);
    if (!payments.length) throw new BillError('Add payment');
    if (payments.some(p => !PAY_MODES.includes(p.mode))) throw new BillError('Invalid payment mode');
    const paid = payments.reduce((s, p) => s + p.amount, 0);
    if (paid !== q.total) throw new BillError(`Payment ₹${paid / 100} does not match bill total ₹${q.total / 100}`);

    const fy = financialYear();
    const invoice_no = `${branch.code}/${fy}/${String(nextNumber(`inv:${branch.code}:${fy}`)).padStart(5, '0')}`;
    const name = input.customer_name ? String(input.customer_name).slice(0, 80) : null;

    const bill = db.prepare(`INSERT INTO bills (invoice_no, branch_id, user_id, customer_name, customer_phone, subtotal, discount,
                               taxable, cgst, sgst, round_off, total, coupon_id, coupon_code, payments)
                             VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(invoice_no, branch.id, user.id, name, q.customer_phone, q.subtotal, q.discount, q.taxable, q.cgst, q.sgst,
        q.round_off, q.total, q.coupon ? q.coupon.id : null, q.coupon ? q.coupon.code : null, JSON.stringify(payments));
    const billId = bill.lastInsertRowid;

    const insItem = db.prepare(`INSERT INTO bill_items (bill_id, product_id, sku, name, size, hsn, qty, unit_price, line_total, discount, gst_rate, taxable, tax)
                                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    const dec = db.prepare('UPDATE stock SET qty = qty - ? WHERE product_id = ? AND branch_id = ? AND qty >= ?');
    const mov = db.prepare(`INSERT INTO stock_movements (product_id, branch_id, change, reason, ref, user_id) VALUES (?,?,?,'sale',?,?)`);
    for (const l of q.lines) {
      insItem.run(billId, l.product_id, l.sku, l.name, l.size, l.hsn, l.qty, l.unit_price, l.line_total, l.discount, l.gst_rate, l.taxable, l.tax);
      if (dec.run(l.qty, l.product_id, branch.id, l.qty).changes !== 1) throw new BillError(`Not enough stock for ${l.name}`);
      mov.run(l.product_id, branch.id, -l.qty, invoice_no, user.id);
    }

    if (q.coupon) {
      const up = db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ? AND (max_uses IS NULL OR used_count < max_uses)').run(q.coupon.id);
      if (up.changes !== 1) throw new BillError('Coupon usage limit reached');
      db.prepare('INSERT INTO coupon_redemptions (coupon_id, bill_id, customer_phone) VALUES (?,?,?)').run(q.coupon.id, billId, q.customer_phone);
    }
    audit(user.id, 'bill.create', { invoice_no, total: q.total });
    return getBill(billId);
  })();
}

function getBill(id) {
  const bill = db.prepare(`SELECT b.*, br.name AS branch_name, br.address AS branch_address, br.phone AS branch_phone,
                                  br.gstin AS branch_gstin, u.name AS cashier
                           FROM bills b JOIN branches br ON br.id = b.branch_id JOIN users u ON u.id = b.user_id
                           WHERE b.id = ?`).get(id);
  if (!bill) return null;
  bill.payments = JSON.parse(bill.payments);
  bill.items = db.prepare('SELECT * FROM bill_items WHERE bill_id = ? ORDER BY id').all(id);
  bill.returns = db.prepare(`SELECT r.id, r.credit_no, r.amount, r.items, r.reason, r.created_at, u.name AS user_name
                             FROM returns r JOIN users u ON u.id = r.user_id WHERE r.bill_id = ? ORDER BY r.id`).all(id)
    .map(r => ({ ...r, items: JSON.parse(r.items) }));
  bill.shop_name = setting('shop_name', 'Garuda Vastra Silks');
  bill.receipt_footer = setting('receipt_footer', '');
  bill.gstin = bill.branch_gstin || setting('gstin', '');
  return bill;
}

// items: [{ bill_item_id, qty }]
function createReturn({ bill_id, items, reason }, user) {
  return db.transaction(() => {
    const bill = getBill(bill_id);
    if (!bill) throw new BillError('Bill not found', 404);
    if (!Array.isArray(items) || !items.length) throw new BillError('Select items to return');
    const branch = db.prepare('SELECT * FROM branches WHERE id = ?').get(bill.branch_id);
    const add = db.prepare('UPDATE stock SET qty = qty + ? WHERE product_id = ? AND branch_id = ?');
    const ensure = db.prepare('INSERT OR IGNORE INTO stock (product_id, branch_id, qty) VALUES (?, ?, 0)');
    const upItem = db.prepare('UPDATE bill_items SET returned_qty = returned_qty + ? WHERE id = ?');
    const fy = financialYear();
    const credit_no = `CN/${branch.code}/${fy}/${String(nextNumber(`cn:${branch.code}:${fy}`)).padStart(5, '0')}`;
    const mov = db.prepare(`INSERT INTO stock_movements (product_id, branch_id, change, reason, ref, note, user_id) VALUES (?,?,?,'return',?,?,?)`);

    let amount = 0; const done = [];
    for (const r of items) {
      const qty = parseInt(r.qty, 10);
      if (!qty) continue;
      const it = bill.items.find(i => i.id === Number(r.bill_item_id));
      if (!it) throw new BillError('Item is not on this bill');
      if (qty < 0 || qty > it.qty - it.returned_qty) throw new BillError(`Can return at most ${it.qty - it.returned_qty} of ${it.name}`);
      const refund = Math.round((it.line_total - it.discount) * qty / it.qty);
      amount += refund;
      upItem.run(qty, it.id);
      ensure.run(it.product_id, bill.branch_id);
      add.run(qty, it.product_id, bill.branch_id);
      mov.run(it.product_id, bill.branch_id, qty, credit_no, `Return of ${bill.invoice_no}`, user.id);
      done.push({ bill_item_id: it.id, sku: it.sku, name: it.name, qty, refund });
    }
    if (!done.length) throw new BillError('Select items to return');
    db.prepare('INSERT INTO returns (credit_no, bill_id, branch_id, user_id, amount, items, reason) VALUES (?,?,?,?,?,?,?)')
      .run(credit_no, bill.id, bill.branch_id, user.id, amount, JSON.stringify(done), reason ? String(reason).slice(0, 200) : null);
    const left = db.prepare('SELECT SUM(qty - returned_qty) n FROM bill_items WHERE bill_id = ?').get(bill.id).n;
    db.prepare('UPDATE bills SET status = ? WHERE id = ?').run(left === 0 ? 'returned' : 'partly_returned', bill.id);
    audit(user.id, 'bill.return', { credit_no, invoice_no: bill.invoice_no, amount });
    return { credit_no, amount, items: done, invoice_no: bill.invoice_no };
  })();
}

module.exports = { quote, createBill, getBill, createReturn, BillError, todayIST, IST, nextNumber };
