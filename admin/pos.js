/* Billing counter: scan → bill → stock reduced → printed → saved. */
const { $, $$, esc, rupees, paise, api, toast, beep } = GVS;

const S = {
  me: null, branch: null, mode: 'sale',
  cart: [], phone: '', name: '', coupon: '', quote: null, quoting: false,
  pay: 'cash', split: { cash: '', upi: '', card: '' }, cashGiven: '',
  lastBill: null, ret: null, check: null, busy: false
};
let cam = null;

/* ---------------- start ---------------- */
$('#posLogout').onclick = async () => {
  if (S.cart.length && !confirm('There is an unfinished bill. Log out anyway?')) return;
  await api('/auth/logout', { method: 'POST', noRedirect: true }).catch(() => {});
  location.href = '/';
};
(async function init() {
  try {
    const r = await api('/auth/me');
    S.me = r.user; S.branch = S.me.branch_id || 1;
  } catch { return; }
  $('#who').textContent = `${S.me.name} · ${S.me.role}`;
  if (S.me.role !== 'cashier') {
    const branches = await api('/branches');
    const sel = $('#branchSel');
    sel.innerHTML = branches.map(b => `<option value="${b.id}" ${b.id === S.branch ? 'selected' : ''}>${esc(b.name)}</option>`).join('');
    sel.classList.remove('hidden');
    sel.onchange = () => {
      if (S.cart.length && !confirm('Changing branch clears the current bill. Continue?')) { sel.value = S.branch; return; }
      S.branch = +sel.value; resetSale(); render();
    };
  } else {
    $('#who').textContent += ` · ${S.me.branch_name}`;
  }
  render();
  focusScan();
})();

/* ---------------- scanning ---------------- */
function focusScan() { const s = $('#scan'); if (s && !$('#rightBody').contains(document.activeElement)) s.focus(); }
function flash(ok) { const b = $('.scanbar'); b.classList.remove('flash-ok', 'flash-err'); void b.offsetWidth; b.classList.add(ok ? 'flash-ok' : 'flash-err'); setTimeout(() => b.classList.remove('flash-ok', 'flash-err'), 600); }

/* ---------------- manual search (when the scanner isn't working) ----------------
   Type part of the name, colour, category or SKU → pick from the list with ↑ ↓ Enter or a click.
   In Return mode you can type the customer's phone number or name to find their bill. */
const SG = { items: [], idx: -1, timer: null, seq: 0 };
const sgBox = () => $('#suggest');
function hideSuggest() {
  clearTimeout(SG.timer); SG.seq++; SG.items = []; SG.idx = -1;
  sgBox().classList.add('hidden'); sgBox().innerHTML = '';
  $('#scan').setAttribute('aria-expanded', 'false');
}
function drawSuggest(q) {
  const box = sgBox();
  if (!SG.items.length) {
    box.innerHTML = `<div class="sg-head">No match for “${esc(q)}”</div>`;
  } else if (S.mode === 'return') {
    box.innerHTML = `<div class="sg-head">Bills — click to open</div>` + SG.items.map((b, i) => `
      <div class="sg ${i === SG.idx ? 'on' : ''}" data-sg="${i}" role="option"><div class="ph" style="display:grid;place-items:center">🧾</div>
        <div><div class="t mono">${esc(b.invoice_no)}</div><div class="m">${esc(GVS.ist(b.created_at))} · ${esc(b.customer_name || 'Walk-in')} ${esc(b.customer_phone || '')} · ${b.items} items</div></div>
        <div class="p">${paise(b.total)}</div></div>`).join('');
  } else {
    box.innerHTML = `<div class="sg-head">Products — ↑ ↓ to choose, Enter to add</div>` + SG.items.map((p, i) => `
      <div class="sg ${i === SG.idx ? 'on' : ''} ${p.stock ? '' : 'out'}" data-sg="${i}" role="option">
        ${p.image_url ? `<img src="${esc(p.image_url)}" alt="">` : '<div class="ph"></div>'}
        <div><div class="t">${esc(p.name)}</div><div class="m"><span class="mono">${esc(p.sku)}</span> · ${esc(p.size || '')} · ${esc(p.colour_desc || p.category)}</div></div>
        <div class="p">${rupees(p.price)}<div><span class="pill ${p.stock ? 'ok' : 'err'}">${p.stock ? p.stock + ' in stock' : 'Out of stock'}</span></div></div></div>`).join('');
  }
  box.classList.remove('hidden');
  $('#scan').setAttribute('aria-expanded', 'true');
  const on = box.querySelector('.sg.on'); if (on) on.scrollIntoView({ block: 'nearest' });
}
async function runSearch(q) {
  const my = ++SG.seq;
  try {
    const list = S.mode === 'return'
      ? await api('/bills?' + new URLSearchParams({ q }))
      : await api('/products?' + new URLSearchParams({ q, branch_id: S.branch }));
    if (my !== SG.seq) return;                // a newer search (or a scan) happened meanwhile
    SG.items = list.slice(0, 8); SG.idx = SG.items.length ? 0 : -1;
    drawSuggest(q);
  } catch { /* ignore */ }
}
function pickSuggestion(i) {
  const it = SG.items[i]; if (!it) return;
  hideSuggest(); $('#scan').value = '';
  if (S.mode === 'return') loadBill(it.invoice_no);
  else onCode(it.sku);
  $('#scan').focus();
}
$('#scan').addEventListener('input', e => {
  const q = e.target.value.trim();
  clearTimeout(SG.timer);
  if (q.length < 2) { hideSuggest(); return; }
  SG.timer = setTimeout(() => runSearch(q), 220);   // scanners type faster than this, so scans don't trigger a search
});
$('#scan').addEventListener('blur', () => setTimeout(hideSuggest, 150));
sgBox().addEventListener('mousedown', e => { const r = e.target.closest('[data-sg]'); if (r) { e.preventDefault(); pickSuggestion(+r.dataset.sg); } });

$('#scan').addEventListener('keydown', e => {
  const open = !sgBox().classList.contains('hidden') && SG.items.length;
  if (open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    e.preventDefault();
    SG.idx = (SG.idx + (e.key === 'ArrowDown' ? 1 : -1) + SG.items.length) % SG.items.length;
    drawSuggest(e.target.value.trim()); return;
  }
  if (e.key === 'Escape') { hideSuggest(); return; }
  if (e.key === 'Enter') {
    e.preventDefault();
    const c = e.target.value.trim();
    // If the list is showing and the text isn't an exact code, add the highlighted item
    if (open && SG.idx >= 0) {
      const it = SG.items[SG.idx];
      const exact = S.mode === 'return' ? it.invoice_no.toUpperCase() === c.toUpperCase() : it.sku.toUpperCase() === c.toUpperCase();
      if (!exact && !/^[A-Z]{2,4}\d{4,}$/i.test(c)) { pickSuggestion(SG.idx); return; }
    }
    hideSuggest(); e.target.value = '';
    if (c) onCode(c);
  }
});

// USB scanners type very fast and end with Enter. If the cursor is not in a text box,
// collect the keys anyway so a scan is never lost.
let buf = '', bufAt = 0;
document.addEventListener('keydown', e => {
  const k = e.key;
  if (k === 'F1' || k === 'F2' || k === 'F3') { e.preventDefault(); setMode({ F1: 'sale', F2: 'return', F3: 'check' }[k]); return; }
  if (k === 'F9' && S.mode === 'sale') { e.preventDefault(); completeSale(); return; }
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
  const now = Date.now();
  if (now - bufAt > 80) buf = '';
  bufAt = now;
  if (k === 'Enter' && buf.length >= 3) { e.preventDefault(); const c = buf; buf = ''; onCode(c); return; }
  if (k.length === 1) buf += k;
});

$('#camBtn').onclick = async () => {
  if (cam) { cam.stop(); cam = null; $('#reader').classList.add('hidden'); $('#camBtn').textContent = '📷 Camera'; return; }
  $('#reader').classList.remove('hidden');
  try { cam = await GVS.startCamera('reader', onCode); $('#camBtn').textContent = 'Stop camera'; }
  catch (err) { $('#reader').classList.add('hidden'); toast('Camera: ' + (err.message || err), 'err'); }
};

function onCode(code) {
  if (S.mode === 'sale') return addToCart(code);
  if (S.mode === 'return') return loadBill(code);
  if (S.mode === 'check') return priceCheck(code);
}

/* ---------------- modes ---------------- */
$('#modeTabs').onclick = e => { const b = e.target.closest('[data-mode]'); if (b) setMode(b.dataset.mode); };
function setMode(m) {
  S.mode = m;
  $$('#modeTabs button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  hideSuggest(); $('#scan').value = '';
  $('#scan').placeholder = { sale: 'Scan sticker — or type product name / SKU to search', return: 'Scan the bill barcode — or type invoice no., phone or name', check: 'Scan a sticker — or type product name / SKU' }[m];
  render(); $('#scan').focus();
}

function render() {
  if (S.mode === 'sale') renderSale();
  else if (S.mode === 'return') renderReturn();
  else renderCheck();
}

/* ================= SALE ================= */
async function addToCart(code) {
  try {
    const p = await api('/products/lookup/' + encodeURIComponent(code) + '?branch_id=' + S.branch);
    S.lastBill = null;
    const ex = S.cart.find(x => x.product_id === p.id);
    if (ex) { ex.qty++; S.cart.splice(S.cart.indexOf(ex), 1); S.cart.unshift(ex); }
    else S.cart.unshift({ product_id: p.id, sku: p.sku, name: p.name, size: p.size, price: p.price, stock: p.stock, image: p.image_url, qty: 1 });
    S.justAdded = p.id;
    if (p.stock < (ex ? ex.qty : 1)) { beep(false); flash(false); toast(`Only ${p.stock} of ${p.name} in stock here!`, 'err'); }
    else { beep(true); flash(true); }
    requote();
  } catch (err) { beep(false); flash(false); toast(err.message, 'err'); }
}

let qTimer;
function requote(now = false) {
  clearTimeout(qTimer);
  renderSale();
  if (!S.cart.length) { S.quote = null; renderSale(); return; }
  qTimer = setTimeout(async () => {
    S.quoting = true;
    try {
      S.quote = await api('/bills/quote', { method: 'POST', body: {
        branch_id: S.branch, coupon_code: S.coupon, customer_phone: S.phone,
        items: S.cart.map(x => ({ product_id: x.product_id, qty: x.qty })) } });
      S.quote.lines.forEach(l => { const c = S.cart.find(x => x.product_id === l.product_id); if (c) c.stock = l.in_stock; });
    } catch (err) { S.quote = null; toast(err.message, 'err'); }
    S.quoting = false;
    renderSale();
  }, now ? 0 : 250);
}

function resetSale() {
  Object.assign(S, { cart: [], phone: '', name: '', coupon: '', quote: null, pay: 'cash', split: { cash: '', upi: '', card: '' }, cashGiven: '' });
}

function renderSale() {
  const q = S.quote;
  $('#leftBody').innerHTML = S.lastBill && !S.cart.length ? `
    <div class="cart"><div class="done-box"><div class="tick">✅</div><h2>Bill ${esc(S.lastBill.invoice_no)} saved</h2>
      <p class="muted">${paise(S.lastBill.total)} · stock updated · printing…</p>
      <div class="row" style="justify-content:center"><button class="btn" id="reprint">🖨️ Print again</button>
      <button class="btn primary" id="newBill">Next customer</button></div></div></div>`
    : `<div class="cart">${S.cart.length ? `<table>
      <tr><th>Item</th><th class="num">Price</th><th style="text-align:center">Qty</th><th class="num">Amount</th><th></th></tr>
      ${S.cart.map((x, i) => `<tr class="${S.justAdded === x.product_id ? 'just-added' : ''}">
        <td><div class="nm">${esc(x.name)}</div><div class="small muted"><span class="mono">${esc(x.sku)}</span> · ${esc(x.size || '')}</div>
          ${x.qty > x.stock ? `<div class="warn-stock">⚠ Only ${x.stock} in stock at this branch</div>` : ''}</td>
        <td class="num">${rupees(x.price)}</td>
        <td style="text-align:center"><span class="qty"><button data-dec="${i}" aria-label="less">−</button><span>${x.qty}</span><button data-inc="${i}" aria-label="more">+</button></span></td>
        <td class="num"><b>${rupees(x.price * x.qty)}</b></td>
        <td class="right"><button class="btn sm danger" data-del="${i}" aria-label="remove">✕</button></td></tr>`).join('')}
      </table>` : `<div class="cart-empty"><div class="big">🛍️</div><h2>Scan the first item</h2><p>Point the scanner at the sticker. Scanner not working? Type the product name (e.g. <b>kanchi</b>, <b>shirt 40</b>) in the box above and pick it from the list.</p></div>`}</div>
      ${S.cart.length ? `<div class="row"><span class="muted small">${S.cart.reduce((s, x) => s + x.qty, 0)} pieces</span><span style="flex:1"></span><button class="btn sm danger" id="clearCart">Clear bill</button></div>` : ''}`;
  S.justAdded = null;

  const totalR = q ? q.total / 100 : 0;
  const paid = S.pay === 'split' ? ['cash', 'upi', 'card'].reduce((s, m) => s + (+S.split[m] || 0), 0) : totalR;
  const change = S.pay === 'cash' && +S.cashGiven > totalR ? +S.cashGiven - totalR : 0;
  const stockProblem = S.cart.some(x => x.qty > x.stock);
  const ready = q && !S.quoting && !q.coupon_error && !stockProblem && Math.abs(paid - totalR) < 0.005 && S.cart.length;

  $('#rightBody').innerHTML = `
    <h3>Customer <span class="small muted">(optional)</span></h3>
    <div class="grid g2" style="gap:.5rem">
      <input id="cPhone" inputmode="numeric" maxlength="14" placeholder="Phone" value="${esc(S.phone)}">
      <input id="cName" placeholder="Name" value="${esc(S.name)}"></div>
    <h3 style="margin-top:.4rem">Coupon</h3>
    <div class="row"><input id="cCode" class="grow" placeholder="Coupon code" value="${esc(S.coupon)}" style="text-transform:uppercase">
      <button class="btn" id="applyCp">${q && q.coupon ? 'Change' : 'Apply'}</button></div>
    ${q && q.coupon ? `<div class="coupon-ok">✓ ${esc(q.coupon.code)} applied — you save ${paise(q.discount)}</div>` : ''}
    ${q && q.coupon_error ? `<div class="coupon-err">✕ ${esc(q.coupon_error)}</div>` : ''}
    <table class="sum">
      <tr><td>Subtotal</td><td class="num">${paise(q ? q.subtotal : 0)}</td></tr>
      ${q && q.discount ? `<tr><td>Coupon discount</td><td class="num" style="color:var(--ok)">−${paise(q.discount)}</td></tr>` : ''}
      <tr class="small muted"><td>GST included (CGST ${paise(q ? q.cgst : 0)} + SGST ${paise(q ? q.sgst : 0)})</td><td></td></tr>
      ${q && q.round_off ? `<tr class="small muted"><td>Round off</td><td class="num">${paise(q.round_off)}</td></tr>` : ''}
      <tr class="grand"><td>Total</td><td class="num">${S.quoting ? '…' : paise(q ? q.total : 0)}</td></tr>
    </table>
    <h3>Payment</h3>
    <div class="paybtns">${['cash', 'upi', 'card'].map(m => `<button class="btn ${S.pay === m ? 'on' : ''}" data-pay="${m}">${{ cash: '💵 Cash', upi: '📱 UPI', card: '💳 Card' }[m]}</button>`).join('')}</div>
    <button class="btn sm ${S.pay === 'split' ? 'on' : ''}" data-pay="split" style="align-self:flex-start">Split payment</button>
    ${S.pay === 'cash' ? `<div class="payrow"><span>Given ₹</span><input id="cashGiven" type="number" min="0" inputmode="decimal" placeholder="Cash received" value="${esc(S.cashGiven)}"></div>
      ${change ? `<div class="change">Return change: ${rupees(Math.round(change * 100) / 100)}</div>` : ''}` : ''}
    ${S.pay === 'split' ? ['cash', 'upi', 'card'].map(m => `<div class="payrow"><span>${m.toUpperCase()} ₹</span><input data-split="${m}" type="number" min="0" step="0.01" value="${esc(S.split[m])}"></div>`).join('')
      + `<div class="small ${Math.abs(paid - totalR) < 0.005 ? 'coupon-ok' : 'coupon-err'}">Entered ${rupees(paid)} of ${rupees(totalR)}</div>` : ''}
    <button class="btn gold lg" id="complete" ${ready && !S.busy ? '' : 'disabled'} style="margin-top:auto">✔ Complete sale &amp; print <kbd>F9</kbd></button>`;
}

$('#leftBody').addEventListener('click', e => {
  const inc = e.target.closest('[data-inc]'), dec = e.target.closest('[data-dec]'), del = e.target.closest('[data-del]');
  if (inc) { S.cart[+inc.dataset.inc].qty++; requote(); }
  if (dec) { const it = S.cart[+dec.dataset.dec]; if (it.qty > 1) it.qty--; else S.cart.splice(+dec.dataset.dec, 1); requote(); }
  if (del) { S.cart.splice(+del.dataset.del, 1); requote(); }
  if (e.target.id === 'clearCart' && confirm('Clear this bill?')) { resetSale(); renderSale(); }
  if (e.target.id === 'newBill') { S.lastBill = null; renderSale(); }
  if (e.target.id === 'reprint' && S.lastBill) printReceipt(S.lastBill.id);
  if (S.mode === 'return') returnClick(e);
  focusScan();
});

$('#rightBody').addEventListener('click', e => {
  if (S.mode !== 'sale') return returnRightClick(e);
  const p = e.target.closest('[data-pay]');
  if (p) {
    S.pay = p.dataset.pay;
    if (S.pay === 'split' && S.quote) S.split = { cash: '', upi: '', card: '' };
    renderSale();
  }
  if (e.target.id === 'applyCp') { S.coupon = $('#cCode').value.trim().toUpperCase(); S.phone = $('#cPhone').value.trim(); requote(true); }
  if (e.target.id === 'complete') completeSale();
});

$('#rightBody').addEventListener('change', e => {
  if (S.mode !== 'sale') return;
  if (e.target.id === 'cPhone') { S.phone = e.target.value.trim(); if (S.coupon) requote(true); }
  if (e.target.id === 'cName') S.name = e.target.value.trim();
});
$('#rightBody').addEventListener('input', e => {
  if (S.mode !== 'sale') return;
  if (e.target.id === 'cashGiven') { S.cashGiven = e.target.value; const pos = e.target.selectionStart; renderSale(); const i = $('#cashGiven'); i.focus(); try { i.setSelectionRange(pos, pos); } catch {} }
  if (e.target.dataset.split) { S.split[e.target.dataset.split] = e.target.value; const m = e.target.dataset.split; renderSale(); const i = $(`[data-split="${m}"]`); i.focus(); }
  if (e.target.id === 'cPhone') S.phone = e.target.value.trim();
  if (e.target.id === 'cName') S.name = e.target.value.trim();
});
$('#rightBody').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'cCode') { e.preventDefault(); $('#applyCp').click(); } });

async function completeSale() {
  const q = S.quote;
  if (S.busy || !q || !S.cart.length) return;
  if (q.coupon_error) return toast('Remove or fix the coupon first', 'err');
  const payments = S.pay === 'split'
    ? ['cash', 'upi', 'card'].map(m => ({ mode: m, amount: +S.split[m] || 0 })).filter(p => p.amount > 0)
    : [{ mode: S.pay, amount: q.total / 100 }];
  S.busy = true; renderSale();
  try {
    const bill = await api('/bills', { method: 'POST', body: {
      branch_id: S.branch, coupon_code: S.coupon, customer_phone: S.phone, customer_name: S.name, payments,
      items: S.cart.map(x => ({ product_id: x.product_id, qty: x.qty })) } });
    S.lastBill = bill; resetSale(); beep(true);
    toast(`Saved ${bill.invoice_no}`);
    printReceipt(bill.id);
  } catch (err) { beep(false); toast(err.message, 'err'); requote(true); }
  S.busy = false; renderSale(); focusScan();
}

function printReceipt(id, credit) {
  $('#printFrame').src = `/admin/receipt.html?id=${id}&autoprint=1${credit ? '&credit=' + encodeURIComponent(credit) : ''}&t=${Date.now()}`;
}

/* ================= RETURN / EXCHANGE ================= */
async function loadBill(code) {
  try {
    const invoice = code.trim().toUpperCase();
    const b = await api('/bills/find?invoice=' + encodeURIComponent(invoice));
    S.ret = { bill: b, qty: {}, reason: '' };
    beep(true); flash(true); renderReturn();
  } catch (err) { beep(false); flash(false); toast(err.message, 'err'); }
}

function renderReturn() {
  const r = S.ret;
  if (!r) {
    $('#leftBody').innerHTML = `<div class="cart"><div class="cart-empty"><div class="big">🧾</div><h2>Scan the customer's bill</h2>
      <p>Scan the barcode printed on the bill, or type the invoice number (e.g. BHG/2026-27/00012) and press Enter.</p></div></div>`;
    $('#rightBody').innerHTML = `<h3>How exchange works</h3><ol class="small muted" style="padding-left:1.1rem;line-height:1.7">
      <li>Scan the old bill and choose items being returned.</li><li>Press <b>Process return</b> — stock is added back and a credit note prints.</li>
      <li>Switch to <b>Sale</b> (F1), scan the new items.</li><li>Collect only the difference (or refund it).</li></ol>`;
    return;
  }
  const b = r.bill;
  let refund = 0;
  b.items.forEach(i => { const n = +r.qty[i.id] || 0; refund += Math.round((i.line_total - i.discount) * n / i.qty); });
  $('#leftBody').innerHTML = `<div class="cart"><div style="padding:1rem 1rem .3rem"><h2 class="mono" style="font-family:inherit;font-size:1.2rem">${esc(b.invoice_no)}</h2>
    <p class="muted small">${GVS.ist(b.created_at)} · ${esc(b.branch_name)} · ${esc(b.customer_name || 'Walk-in')} ${esc(b.customer_phone || '')} · Total ${paise(b.total)}</p></div>
    <table><tr><th>Item</th><th class="num">Bought</th><th class="num">Paid</th><th style="text-align:center">Return</th></tr>
    ${b.items.map(i => { const left = i.qty - i.returned_qty; return `<tr><td><div class="nm">${esc(i.name)}</div><div class="small muted mono">${esc(i.sku)} · ${esc(i.size || '')}</div>
      ${i.returned_qty ? `<div class="warn-stock">${i.returned_qty} already returned</div>` : ''}</td>
      <td class="num">${i.qty}</td><td class="num">${paise(i.line_total - i.discount)}</td>
      <td style="text-align:center">${left ? `<span class="qty"><button data-rdec="${i.id}">−</button><span>${+r.qty[i.id] || 0}</span><button data-rinc="${i.id}" data-max="${left}">+</button></span>` : '—'}</td></tr>`; }).join('')}
    </table></div>`;
  $('#rightBody').innerHTML = `<h3>Return summary</h3>
    <table class="sum"><tr class="grand"><td>Refund / credit</td><td class="num">${paise(refund)}</td></tr></table>
    <p class="small muted">Coupon discount on the original bill is already deducted from each item.</p>
    <div class="field"><label>Reason</label><input id="rReason" value="${esc(r.reason)}" placeholder="Size / colour exchange…"></div>
    <button class="btn danger lg" id="doReturn" ${refund ? '' : 'disabled'}>↩ Process return &amp; print credit note</button>
    <button class="btn" id="cancelReturn">Cancel</button>`;
}

function returnClick(e) {
  const r = S.ret; if (!r) return;
  const inc = e.target.closest('[data-rinc]'), dec = e.target.closest('[data-rdec]');
  if (inc) { const id = inc.dataset.rinc; r.qty[id] = Math.min(+inc.dataset.max, (+r.qty[id] || 0) + 1); renderReturn(); }
  if (dec) { const id = dec.dataset.rdec; r.qty[id] = Math.max(0, (+r.qty[id] || 0) - 1); renderReturn(); }
}

async function returnRightClick(e) {
  if (S.mode !== 'return') return;
  if (e.target.id === 'cancelReturn') { S.ret = null; renderReturn(); }
  if (e.target.id === 'doReturn') {
    const r = S.ret;
    const items = Object.entries(r.qty).filter(([, n]) => n > 0).map(([id, n]) => ({ bill_item_id: +id, qty: n }));
    if (!confirm('Process this return? Stock will be added back.')) return;
    try {
      const out = await api('/returns', { method: 'POST', body: { bill_id: r.bill.id, items, reason: $('#rReason').value } });
      toast(`Credit note ${out.credit_no}: ${paise(out.amount)}`);
      printReceipt(r.bill.id, out.credit_no);
      S.ret = null; renderReturn();
    } catch (err) { toast(err.message, 'err'); }
  }
}
document.addEventListener('input', e => { if (e.target.id === 'rReason' && S.ret) S.ret.reason = e.target.value; });

/* ================= PRICE CHECK ================= */
async function priceCheck(code) {
  try { S.check = await api('/products/lookup/' + encodeURIComponent(code) + '?branch_id=' + S.branch); beep(true); flash(true); }
  catch (err) { S.check = null; beep(false); flash(false); toast(err.message, 'err'); }
  renderCheck();
}

function renderCheck() {
  const p = S.check;
  $('#leftBody').innerHTML = p ? `<div class="pc-card">
      ${p.image_url ? `<img src="${esc(p.image_url)}" alt="">` : '<div class="ph"></div>'}
      <div><h2>${esc(p.name)}</h2><p class="muted">${esc(p.colour_desc || '')} · ${esc(p.category)} · ${esc(p.size || '')}</p>
      <div class="pc-price">${rupees(p.price)} ${p.mrp ? `<s class="muted" style="font-size:1rem">${rupees(p.mrp)}</s>` : ''}</div>
      <p class="mono muted">${esc(p.sku)} · GST ${p.gst_rate}% incl.</p></div></div>
      <div class="cart"><table><tr><th>Branch</th><th class="num">In stock</th></tr>
      ${p.by_branch.map(b => `<tr><td>${esc(b.name)}${b.id === S.branch ? ' <span class="pill gold">this branch</span>' : ''}</td><td class="num"><span class="pill ${b.qty ? 'ok' : 'err'}">${b.qty}</span></td></tr>`).join('')}</table></div>`
    : `<div class="cart"><div class="cart-empty"><div class="big">🔍</div><h2>Scan any sticker</h2><p>See the price and how many are in each branch. Nothing is billed.</p></div></div>`;
  $('#rightBody').innerHTML = `<h3>Price check</h3><p class="small muted">Useful when a customer asks “Do you have this in another branch?”</p>
    ${p ? `<button class="btn gold lg" id="toSale">Add to bill →</button>` : ''}`;
  const b = $('#toSale');
  if (b) b.onclick = () => { const code = p.sku; setMode('sale'); addToCart(code); };
}
