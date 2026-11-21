// Bill calculation + saving. The server ALWAYS recalculates prices, coupon and GST —
// it never trusts numbers sent from the browser.
// Every function takes `q` (a query function) so it can run inside a database transaction.
const { tx, one, audit, setting } = require('./db');

// Dates in India time
const IST_DATE = col => `(${col} AT TIME ZONE 'Asia/Kolkata')::date`;

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

// Atomic counter (safe even with many servers running at once)
async function nextNumber(q, key) {
  const r = await one(q, `INSERT INTO counters (key, value) VALUES ($1, 1)
                          ON CONFLICT (key) DO UPDATE SET value = counters.value + 1 RETURNING value`, [key]);
  return r.value;
}

function cleanPhone(p) {
  if (!p) return null;
  const d = String(p).replace(/\D/g, '').slice(-10);
  return d.length === 10 ? d : null;
}

async function applyCoupon(q, code, lines, subtotal, phone) {
  const c = await one(q, 'SELECT * FROM coupons WHERE lower(code) = lower($1)', [String(code).trim()]);
  if (!c || !c.active) throw new BillError('Coupon not found or inactive');
  const today = todayIST();
  if (c.valid_from && today < c.valid_from) throw new BillError(`Coupon starts on ${c.valid_from}`);
  if (c.valid_to && today > c.valid_to) throw new BillError('Coupon has expired');
  if (c.max_uses != null && c.used_count >= c.max_uses) throw new BillError('Coupon usage limit reached');
  if (c.per_customer != null) {
    if (!phone) throw new BillError('Enter the customer phone number to use this coupon');
    const used = (await one(q, 'SELECT COUNT(*)::int AS n FROM coupon_redemptions WHERE coupon_id = $1 AND customer_phone = $2', [c.id, phone])).n;
    if (used >= c.per_customer) throw new BillError('This customer has already used this coupon');
  }
  if (subtotal < c.min_bill * 100) throw new BillError(`Minimum bill for this coupon is ₹${c.min_bill}`);

  const eligible = lines.filter(l => !c.category || l.category.toLowerCase() === c.category.toLowerCase());
  const base = eligible.reduce((s, l) => s + l.line_total, 0);
  if (!base) throw new BillError(`Coupon only applies to ${c.category} items`);

  let discount = c.type === 'percent' ? Math.floor(base * c.value / 100) : c.value * 100;
  if (c.type === 'percent' && c.max_discount) discount = Math.min(discount, c.max_discount * 100);
  discount = Math.min(discount, base);

  let left = discount;
  eligible.forEach((l, i) => {
    const share = i === eligible.length - 1 ? left : Math.floor(discount * l.line_total / base);
    l.discount = share; left -= share;
  });
  return { coupon: c, discount };
}

// items: [{ product_id | sku, qty }]
async function quote(q, { items, coupon_code, customer_phone, branch_id }) {
  if (!Array.isArray(items) || !items.length) throw new BillError('Bill is empty');
  if (items.length > 200) throw new BillError('Too many items on one bill');
  const phone = cleanPhone(customer_phone);
  const merged = new Map();
  for (const it of items) {
    const qty = parseInt(it.qty, 10);
    if (!(qty > 0 && qty <= 999)) throw new BillError('Invalid quantity');
    const p = it.product_id
      ? await one(q, 'SELECT * FROM products WHERE id = $1', [parseInt(it.product_id, 10) || 0])
      : await one(q, 'SELECT * FROM products WHERE lower(sku) = lower($1)', [String(it.sku || '').trim()]);
    if (!p || !p.active) throw new BillError(`Product not found: ${it.sku || it.product_id}`);
    const prev = merged.get(p.id);
    merged.set(p.id, { p, qty: (prev ? prev.qty : 0) + qty });
  }

  const lines = [];
  for (const { p, qty } of merged.values()) {
    const s = await one(q, 'SELECT qty FROM stock WHERE product_id = $1 AND branch_id = $2', [p.id, branch_id]);
    lines.push({
      product_id: p.id, sku: p.sku, name: p.name, size: p.size, hsn: p.hsn, category: p.category,
      qty, in_stock: s ? s.qty : 0, unit_price: p.price * 100, line_total: p.price * 100 * qty,
      gst_rate: Number(p.gst_rate), discount: 0
    });
  }

  const subtotal = lines.reduce((s, l) => s + l.line_total, 0);
  let coupon = null, discount = 0, couponError = null;
  if (coupon_code && String(coupon_code).trim()) {
    try { ({ coupon, discount } = await applyCoupon(q, coupon_code, lines, subtotal, phone)); }
    catch (e) { if (e instanceof BillError) { couponError = e.message; lines.forEach(l => { l.discount = 0; }); } else throw e; }
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

async function createBill(input, user) {
  const id = await tx(async q => {
    const branch = await one(q, 'SELECT * FROM branches WHERE id = $1', [input.branch_id]);
    if (!branch) throw new BillError('Branch not found');
    const r = await quote(q, { ...input, branch_id: branch.id });
    if (r.coupon_error) throw new BillError(r.coupon_error);
    for (const l of r.lines) {
      if (l.qty > l.in_stock) throw new BillError(`Only ${l.in_stock} left of ${l.name} (${l.sku}) at ${branch.name}`);
    }

    const payments = (Array.isArray(input.payments) ? input.payments : [])
      .map(p => ({ mode: String(p.mode), amount: Math.round(Number(p.amount) * 100) }))
      .filter(p => p.amount > 0);
    if (!payments.length) throw new BillError('Add payment');
    if (payments.some(p => !PAY_MODES.includes(p.mode))) throw new BillError('Invalid payment mode');
    const paid = payments.reduce((s, p) => s + p.amount, 0);
    if (paid !== r.total) throw new BillError(`Payment ₹${paid / 100} does not match bill total ₹${r.total / 100}`);

    const fy = financialYear();
    const invoice_no = `${branch.code}/${fy}/${String(await nextNumber(q, `inv:${branch.code}:${fy}`)).padStart(5, '0')}`;
    const name = input.customer_name ? String(input.customer_name).slice(0, 80) : null;

    const bill = await one(q, `INSERT INTO bills (invoice_no, branch_id, user_id, customer_name, customer_phone, subtotal, discount,
                                 taxable, cgst, sgst, round_off, total, coupon_id, coupon_code, payments)
                               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
      [invoice_no, branch.id, user.id, name, r.customer_phone, r.subtotal, r.discount, r.taxable, r.cgst, r.sgst,
        r.round_off, r.total, r.coupon ? r.coupon.id : null, r.coupon ? r.coupon.code : null, JSON.stringify(payments)]);

    for (const l of r.lines) {
      await q(`INSERT INTO bill_items (bill_id, product_id, sku, name, size, hsn, qty, unit_price, line_total, discount, gst_rate, taxable, tax)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [bill.id, l.product_id, l.sku, l.name, l.size, l.hsn, l.qty, l.unit_price, l.line_total, l.discount, l.gst_rate, l.taxable, l.tax]);
      const dec = await q('UPDATE stock SET qty = qty - $1 WHERE product_id = $2 AND branch_id = $3 AND qty >= $1 RETURNING qty', [l.qty, l.product_id, branch.id]);
      if (dec.length !== 1) throw new BillError(`Not enough stock for ${l.name}`);
      await q(`INSERT INTO stock_movements (product_id, branch_id, change, reason, ref, user_id) VALUES ($1,$2,$3,'sale',$4,$5)`,
        [l.product_id, branch.id, -l.qty, invoice_no, user.id]);
    }

    if (r.coupon) {
      const up = await q('UPDATE coupons SET used_count = used_count + 1 WHERE id = $1 AND (max_uses IS NULL OR used_count < max_uses) RETURNING id', [r.coupon.id]);
      if (up.length !== 1) throw new BillError('Coupon usage limit reached');
      await q('INSERT INTO coupon_redemptions (coupon_id, bill_id, customer_phone) VALUES ($1,$2,$3)', [r.coupon.id, bill.id, r.customer_phone]);
    }
    await audit(user.id, 'bill.create', { invoice_no, total: r.total }, q);
    return bill.id;
  });
  return getBill(require('./db').query, id);
}

async function getBill(q, id) {
  const bill = await one(q, `SELECT b.*, br.name AS branch_name, br.address AS branch_address, br.phone AS branch_phone,
                                    br.gstin AS branch_gstin, u.name AS cashier
                             FROM bills b JOIN branches br ON br.id = b.branch_id JOIN users u ON u.id = b.user_id
                             WHERE b.id = $1`, [id]);
  if (!bill) return null;
  bill.payments = JSON.parse(bill.payments);
  bill.items = (await q('SELECT * FROM bill_items WHERE bill_id = $1 ORDER BY id', [id])).map(i => ({ ...i, gst_rate: Number(i.gst_rate) }));
  bill.returns = (await q(`SELECT r.id, r.credit_no, r.amount, r.items, r.reason, r.created_at, u.name AS user_name
                           FROM returns r JOIN users u ON u.id = r.user_id WHERE r.bill_id = $1 ORDER BY r.id`, [id]))
    .map(r => ({ ...r, items: JSON.parse(r.items) }));
  bill.shop_name = await setting('shop_name', 'Garuda Vastra Silks', q);
  bill.receipt_footer = await setting('receipt_footer', '', q);
  bill.gstin = bill.branch_gstin || await setting('gstin', '', q);
  return bill;
}

// items: [{ bill_item_id, qty }]
async function createReturn({ bill_id, items, reason }, user) {
  return tx(async q => {
    const bill = await getBill(q, bill_id);
    if (!bill) throw new BillError('Bill not found', 404);
    if (!Array.isArray(items) || !items.length) throw new BillError('Select items to return');
    await q('SELECT id FROM bills WHERE id = $1 FOR UPDATE', [bill.id]);   // one return at a time per bill
    const branch = await one(q, 'SELECT * FROM branches WHERE id = $1', [bill.branch_id]);
    const fy = financialYear();
    const credit_no = `CN/${branch.code}/${fy}/${String(await nextNumber(q, `cn:${branch.code}:${fy}`)).padStart(5, '0')}`;

    let amount = 0; const done = [];
    for (const r of items) {
      const qty = parseInt(r.qty, 10);
      if (!qty) continue;
      const it = await one(q, 'SELECT * FROM bill_items WHERE id = $1 AND bill_id = $2', [Number(r.bill_item_id) || 0, bill.id]);
      if (!it) throw new BillError('Item is not on this bill');
      if (qty < 0 || qty > it.qty - it.returned_qty) throw new BillError(`Can return at most ${it.qty - it.returned_qty} of ${it.name}`);
      const refund = Math.round((it.line_total - it.discount) * qty / it.qty);
      amount += refund;
      await q('UPDATE bill_items SET returned_qty = returned_qty + $1 WHERE id = $2', [qty, it.id]);
      await q(`INSERT INTO stock (product_id, branch_id, qty) VALUES ($1,$2,$3)
               ON CONFLICT (product_id, branch_id) DO UPDATE SET qty = stock.qty + EXCLUDED.qty`, [it.product_id, bill.branch_id, qty]);
      await q(`INSERT INTO stock_movements (product_id, branch_id, change, reason, ref, note, user_id) VALUES ($1,$2,$3,'return',$4,$5,$6)`,
        [it.product_id, bill.branch_id, qty, credit_no, `Return of ${bill.invoice_no}`, user.id]);
      done.push({ bill_item_id: it.id, sku: it.sku, name: it.name, qty, refund });
    }
    if (!done.length) throw new BillError('Select items to return');
    await q('INSERT INTO returns (credit_no, bill_id, branch_id, user_id, amount, items, reason) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [credit_no, bill.id, bill.branch_id, user.id, amount, JSON.stringify(done), reason ? String(reason).slice(0, 200) : null]);
    const left = (await one(q, 'SELECT COALESCE(SUM(qty - returned_qty),0)::int AS n FROM bill_items WHERE bill_id = $1', [bill.id])).n;
    await q('UPDATE bills SET status = $1 WHERE id = $2', [left === 0 ? 'returned' : 'partly_returned', bill.id]);
    await audit(user.id, 'bill.return', { credit_no, invoice_no: bill.invoice_no, amount }, q);
    return { credit_no, amount, items: done, invoice_no: bill.invoice_no };
  });
}

module.exports = { quote, createBill, getBill, createReturn, BillError, todayIST, IST_DATE, nextNumber };
