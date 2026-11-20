/* Garuda admin panel — single page app (hash routes). */
const { $, $$, esc, rupees, paise, ist, todayIST, api, toast } = GVS;
const RANK = { cashier: 1, manager: 2, owner: 3 };
const COLOURS = ['Red', 'Green', 'Blue', 'Pink', 'Yellow', 'Pastel', 'Black', 'White', 'Gold', 'Purple', 'Orange', 'Multi'];
const OCCASIONS = ['Wedding', 'Festive', 'Celebration', 'Everyday', 'Party', 'Office'];
let ME = null, BRANCHES = [], CATEGORIES = [];
const can = role => ME && RANK[ME.role] >= RANK[role];

/* ---------------- modal ---------------- */
function openModal(html) { $('#modal').innerHTML = html; $('#modalBg').classList.add('open'); const f = $('#modal input, #modal select'); if (f) f.focus(); }
function closeModal() { $('#modalBg').classList.remove('open'); $('#modal').innerHTML = ''; }
$('#modalBg').addEventListener('mousedown', e => { if (e.target.id === 'modalBg') closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeModal(); });
const formData = form => Object.fromEntries(new FormData(form).entries());

/* ---------------- auth ---------------- */
function showAuth(mode) {
  $('#appView').classList.add('hidden');
  $('#authView').classList.remove('hidden');
  $('#loginForm').classList.toggle('hidden', mode !== 'login');
  $('#pwForm').classList.toggle('hidden', mode !== 'password');
}

$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  $('#loginErr').classList.add('hidden');
  try {
    const r = await api('/auth/login', { method: 'POST', body: { username: $('#lu').value.trim(), password: $('#lp').value }, noRedirect: true });
    $('#lp').value = '';
    if (r.mustChangePassword) { location.hash = '#password'; showAuth('password'); return; }
    goHome(r.home);
  } catch (err) { $('#loginErr').textContent = err.message; $('#loginErr').classList.remove('hidden'); }
});

$('#pwForm').addEventListener('submit', async e => {
  e.preventDefault();
  const box = $('#pwErr'); box.classList.add('hidden');
  if ($('#pn').value !== $('#pn2').value) { box.textContent = 'New passwords do not match'; box.classList.remove('hidden'); return; }
  try {
    const r = await api('/auth/password', { method: 'POST', body: { current: $('#pc').value, next: $('#pn').value }, noRedirect: true });
    toast('Password updated'); goHome(r.home);
  } catch (err) { box.textContent = err.message; box.classList.remove('hidden'); }
});

$('#logoutBtn').addEventListener('click', async () => {
  await api('/auth/logout', { method: 'POST', noRedirect: true }).catch(() => {});
  ME = null; location.href = '/';
});

// Cashiers go straight to the billing counter; owner/manager to the dashboard
function goHome(home) {
  if (home && home.startsWith('/admin/pos')) { location.href = home; return; }
  location.hash = '#dashboard'; boot();
}

async function boot() {
  if (location.hash === '#password') { showAuth('password'); return; }
  try {
    const r = await api('/auth/me', { noRedirect: true });
    ME = r.user;
    if (ME.must_change_password) { location.hash = '#password'; showAuth('password'); return; }
  } catch { showAuth('login'); return; }
  [BRANCHES, CATEGORIES] = await Promise.all([api('/branches'), api('/categories')]);
  $('#authView').classList.add('hidden');
  $('#appView').classList.remove('hidden');
  if (location.hash === '#login' || location.hash === '#password') location.hash = '#dashboard';
  $('#whoami').innerHTML = `<b>${esc(ME.name)}</b><br><span class="small">${esc(ME.role)} · ${esc(ME.branch_name || '')}</span>`;
  $$('#nav a[data-min]').forEach(a => a.classList.toggle('hidden', !can(a.dataset.min)));
  route();
}

/* ---------------- router ---------------- */
const VIEWS = { dashboard, products, stockin, labels, coupons, bills, staff, settings };
let cleanup = null;
function route() {
  if (!ME) return;
  if (cleanup) { cleanup(); cleanup = null; }
  let v = (location.hash || '#dashboard').slice(1).split('?')[0];
  if (v === 'password') { showAuth('password'); return; }
  if (v === 'login' || !VIEWS[v]) v = 'dashboard';
  $('#authView').classList.add('hidden'); $('#appView').classList.remove('hidden');
  const link = $(`#nav a[data-v="${v}"]`);
  if (link && link.dataset.min && !can(link.dataset.min)) v = 'dashboard';
  $$('#nav a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  $('#side').classList.remove('open');
  $('#main').innerHTML = '<div class="empty">Loading…</div>';
  VIEWS[v]().catch(err => { $('#main').innerHTML = `<div class="err-box">${esc(err.message)}</div>`; });
}
window.addEventListener('hashchange', () => { if (ME) route(); else boot(); });

function topbar(title, actions = '') {
  return `<div class="topbar"><div class="row"><button class="btn sm menu-btn" id="menuBtn" type="button">☰</button><h1>${title}</h1></div><div class="actions">${actions}</div></div>`;
}
document.addEventListener('click', e => { if (e.target.id === 'menuBtn') $('#side').classList.toggle('open'); });

function branchSelect(id, selected, allOption = false) {
  if (!can('manager')) return '';
  return `<select id="${id}" style="width:auto">${allOption ? '<option value="">All branches</option>' : ''}${BRANCHES.map(b =>
    `<option value="${b.id}" ${String(selected) === String(b.id) ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select>`;
}

/* ================= DASHBOARD ================= */
let dashBranch = '';
async function dashboard() {
  const d = await api('/reports/summary' + (dashBranch ? '?branch_id=' + dashBranch : ''));
  const t = d.today;
  const max = Math.max(1, ...d.days.map(x => x.sales));
  const days = [];
  for (let i = 13; i >= 0; i--) {
    const dt = new Date(Date.now() + 5.5 * 3600e3 - i * 864e5).toISOString().slice(0, 10);
    days.push(d.days.find(x => x.d === dt) || { d: dt, sales: 0, bills: 0 });
  }
  $('#main').innerHTML = topbar('Dashboard', branchSelect('dashBranch', dashBranch, true) + `<a class="btn gold" href="/admin/pos.html">🛒 Billing Counter</a>`) + `
    <div class="stats">
      <div class="stat"><div class="k">Today's sales</div><div class="v">${paise(t.sales)}</div><div class="s">${t.bills} bills</div></div>
      <div class="stat"><div class="k">Returns / refunds</div><div class="v">${paise(t.refunds)}</div><div class="s">Net ${paise(t.sales - t.refunds)}</div></div>
      <div class="stat"><div class="k">Coupon discounts</div><div class="v">${paise(t.discount)}</div><div class="s">given today</div></div>
      <div class="stat"><div class="k">Cash · UPI · Card</div><div class="v" style="font-size:1.05rem;line-height:1.7">${paise(t.payments.cash)}<br>${paise(t.payments.upi)}<br>${paise(t.payments.card)}</div></div>
    </div>
    <div class="grid g2">
      <div class="card"><h3>Last 14 days</h3>
        <div class="bars">${days.map(x => `<div class="b" style="height:${Math.round(x.sales / max * 100)}%" data-tip="${x.d}: ${paise(x.sales)} · ${x.bills} bills"><span>${x.d.slice(8)}</span></div>`).join('')}</div>
        <div style="height:22px"></div></div>
      <div class="card"><h3>Top sellers (30 days)</h3>
        ${d.top.length ? `<table><tr><th>Product</th><th class="num">Qty</th><th class="num">Amount</th></tr>${d.top.map(x =>
          `<tr><td>${esc(x.name)}<div class="small muted mono">${esc(x.sku)}</div></td><td class="num">${x.qty}</td><td class="num">${paise(x.amount)}</td></tr>`).join('')}</table>`
          : '<div class="empty">No sales yet</div>'}</div>
    </div>
    <div class="card"><h3>Low stock ${dashBranch ? '' : '(your branch)'}</h3>
      ${d.low.length ? `<table><tr><th>SKU</th><th>Product</th><th>Size</th><th class="num">In stock</th></tr>${d.low.map(x =>
        `<tr><td class="mono">${esc(x.sku)}</td><td>${esc(x.name)}</td><td>${esc(x.size || '')}</td><td class="num"><span class="pill ${x.qty ? 'warn' : 'err'}">${x.qty}</span></td></tr>`).join('')}</table>`
        : '<div class="empty">All good — nothing is running low 🎉</div>'}</div>`;
  const sel = $('#dashBranch');
  if (sel) sel.onchange = () => { dashBranch = sel.value; dashboard(); };
}

/* ================= PRODUCTS ================= */
let prodState = { q: '', category: '', branch: '' };
async function products() {
  const st = prodState;
  const branch = st.branch || ME.branch_id;
  const qs = new URLSearchParams({ q: st.q, category: st.category, branch_id: branch });
  const rows = await api('/products?' + qs);
  CATEGORIES = await api('/categories');
  $('#main').innerHTML = topbar('Products & Stock', `${can('manager') ? '<button class="btn primary" id="addProd">+ Add product</button>' : ''}`) + `
    <div class="card" style="margin-bottom:1rem"><div class="row">
      <input class="grow" id="pq" placeholder="Search name, SKU, colour… or scan a sticker" value="${esc(st.q)}">
      <select id="pc" style="width:auto"><option value="">All categories</option>${CATEGORIES.map(c => `<option ${c === st.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      ${branchSelect('pb', branch)}
    </div></div>
    <div class="table-wrap"><table>
      <tr><th></th><th>SKU</th><th>Product</th><th>Category</th><th>Size</th><th class="num">Price</th><th class="num">Stock here</th><th class="num">All branches</th><th>Website</th><th></th></tr>
      ${rows.map(p => `<tr>
        <td>${p.image_url ? `<img class="thumb" src="${esc(p.image_url)}" alt="" loading="lazy">` : '<div class="thumb"></div>'}</td>
        <td class="mono">${esc(p.sku)}</td>
        <td><b>${esc(p.name)}</b><div class="small muted">${esc(p.colour_desc || '')}</div></td>
        <td>${esc(p.category)}</td><td>${esc(p.size || '')}</td>
        <td class="num">${rupees(p.price)}${p.mrp ? `<div class="small muted"><s>${rupees(p.mrp)}</s></div>` : ''}</td>
        <td class="num"><span class="pill ${p.stock === 0 ? 'err' : p.stock <= p.low_stock_at ? 'warn' : 'ok'}">${p.stock}</span></td>
        <td class="num">${p.total_stock}</td>
        <td>${p.online ? '<span class="pill gold">Shown</span>' : '<span class="pill">Hidden</span>'}</td>
        <td class="right" style="white-space:nowrap">
          <button class="btn sm" data-hist="${p.id}">Stock</button>
          ${can('manager') ? `<button class="btn sm" data-edit="${p.id}">Edit</button>` : ''}
        </td></tr>`).join('') || '<tr><td colspan="10" class="empty">No products found</td></tr>'}
    </table></div>`;

  let t;
  $('#pq').oninput = e => { clearTimeout(t); t = setTimeout(() => { st.q = e.target.value; products().then(() => { const i = $('#pq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); }, 300); };
  $('#pc').onchange = e => { st.category = e.target.value; products(); };
  if ($('#pb')) $('#pb').onchange = e => { st.branch = e.target.value; products(); };
  if ($('#addProd')) $('#addProd').onclick = () => productForm();
  $('#main').onclick = e => {
    const ed = e.target.closest('[data-edit]'), hi = e.target.closest('[data-hist]');
    if (ed) productForm(rows.find(p => p.id === +ed.dataset.edit));
    if (hi) stockModal(rows.find(p => p.id === +hi.dataset.hist), branch);
  };
}

function productForm(p = null) {
  const v = k => esc(p ? (p[k] == null ? '' : p[k]) : '');
  openModal(`<form id="pf">
    <div class="modal-head"><h2>${p ? 'Edit product' : 'Add product'}</h2><button type="button" class="btn sm" data-close>✕</button></div>
    <div class="grid g2">
      <div class="field"><label>Product name *</label><input name="name" required value="${v('name')}" placeholder="Kanchipuram Pattu Saree / Cotton Shirt"></div>
      <div class="field"><label>SKU / barcode ${p ? '' : '(leave empty = auto)'}</label><input name="sku" ${p ? 'disabled' : ''} value="${v('sku')}" placeholder="GVS00014" pattern="[A-Za-z0-9-]+"></div>
      <div class="field"><label>Colour description</label><input name="colour_desc" value="${v('colour_desc')}" placeholder="Sea green with maroon border"></div>
      <div class="field"><label>Category *</label><input name="category" required list="catList" value="${v('category')}" placeholder="Kanchipuram, Banarasi, Shirts…">
        <datalist id="catList">${['Kanchipuram', 'Banarasi', 'Soft Silk', 'Handloom', 'Contemporary', 'Men', 'Kids', ...CATEGORIES].filter((x, i, a) => a.indexOf(x) === i).map(c => `<option value="${esc(c)}">`).join('')}</datalist></div>
      <div class="field"><label>Occasion</label><select name="occasion"><option value=""></option>${OCCASIONS.map(o => `<option ${p && p.occasion === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
      <div class="field"><label>Filter colour</label><select name="colour"><option value=""></option>${COLOURS.map(o => `<option ${p && p.colour === o ? 'selected' : ''}>${o}</option>`).join('')}</select></div>
      <div class="field"><label>Size</label><input name="size" value="${p ? v('size') : 'Free Size'}" placeholder="Free Size / M / L / 40"></div>
      <div class="field"><label>Tag on website</label><input name="tag" value="${v('tag')}" placeholder="NEW / BRIDAL / BESTSELLER"></div>
      <div class="field"><label>Selling price ₹ (incl. GST) *</label><input name="price" type="number" min="0" step="1" required value="${v('price')}"></div>
      <div class="field"><label>MRP ₹ (shown crossed out)</label><input name="mrp" type="number" min="0" step="1" value="${v('mrp')}"></div>
      <div class="field"><label>GST %</label><input name="gst_rate" type="number" min="0" max="28" step="0.5" value="${p ? v('gst_rate') : ''}" placeholder="default from settings"></div>
      <div class="field"><label>HSN code</label><input name="hsn" value="${v('hsn')}" placeholder="default from settings"></div>
      <div class="field"><label>Low stock alert at</label><input name="low_stock_at" type="number" min="0" value="${p ? v('low_stock_at') : 2}"></div>
      ${p ? '' : `<div class="field"><label>Opening stock (this branch)</label><input name="initial_qty" type="number" min="0" value="0"></div>`}
    </div>
    <div class="field"><label>Photo link (https://…)</label><input name="image_url" type="url" value="${v('image_url')}" placeholder="https://…"></div>
    <label class="check"><input type="checkbox" name="online" ${!p || p.online ? 'checked' : ''}> Show on website</label>
    <div class="modal-foot">
      ${p ? '<button type="button" class="btn danger" id="archive">Remove product</button><span style="flex:1"></span>' : ''}
      <button type="button" class="btn" data-close>Cancel</button><button class="btn primary">Save</button></div>
  </form>`);
  $('#pf').onsubmit = async e => {
    e.preventDefault();
    const d = formData(e.target); d.online = e.target.online.checked;
    try {
      if (p) await api('/products/' + p.id, { method: 'PUT', body: d });
      else { d.branch_id = prodState.branch || ME.branch_id; const r = await api('/products', { method: 'POST', body: d }); toast('Saved — SKU ' + r.sku); }
      if (p) toast('Saved');
      closeModal(); products();
    } catch (err) { toast(err.message, 'err'); }
  };
  if ($('#archive')) $('#archive').onclick = async () => {
    if (!confirm(`Remove "${p.name}"? It will be hidden everywhere. Old bills keep it.`)) return;
    try { await api('/products/' + p.id, { method: 'DELETE' }); toast('Removed'); closeModal(); products(); } catch (err) { toast(err.message, 'err'); }
  };
}

async function stockModal(p, branch) {
  const [info, mv] = await Promise.all([api('/products/lookup/' + encodeURIComponent(p.sku) + '?branch_id=' + branch), api(`/products/${p.id}/movements`)]);
  const RS = { sale: ['Sale', 'err'], stock_in: ['Stock in', 'ok'], return: ['Return', 'ok'], adjustment: ['Correction', 'warn'] };
  openModal(`<div class="modal-head"><div><h2>${esc(p.name)}</h2><span class="mono muted">${esc(p.sku)}</span></div><button class="btn sm" data-close>✕</button></div>
    <div class="stats">${info.by_branch.map(b => `<div class="stat"><div class="k">${esc(b.name)}</div><div class="v">${b.qty}</div></div>`).join('')}</div>
    ${can('manager') ? `<form id="adj" class="card" style="margin-bottom:1rem"><h3>Stock count correction</h3>
      <p class="small muted">Counted the shelf and the number is different? Enter the real count. The change is logged.</p>
      <div class="row"><select name="branch_id" style="width:auto">${BRANCHES.map(b => `<option value="${b.id}" ${+branch === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select>
      <input name="qty" type="number" min="0" placeholder="Real count" style="width:120px" required><input name="note" class="grow" placeholder="Reason (optional)">
      <button class="btn primary">Save</button></div></form>` : ''}
    <h3>History</h3>
    <div class="table-wrap" style="max-height:40vh"><table><tr><th>When</th><th>Branch</th><th>Type</th><th class="num">Change</th><th>Ref / note</th><th>By</th></tr>
    ${mv.map(m => `<tr><td class="small">${ist(m.created_at)}</td><td>${esc(m.branch_code)}</td><td><span class="pill ${RS[m.reason][1]}">${RS[m.reason][0]}</span></td>
      <td class="num">${m.change > 0 ? '+' : ''}${m.change}</td><td class="small">${esc(m.ref || '')} ${esc(m.note || '')}</td><td class="small">${esc(m.user_name || '')}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No history</td></tr>'}
    </table></div>`);
  const f = $('#adj');
  if (f) f.onsubmit = async e => {
    e.preventDefault();
    try { await api('/stock/adjust', { method: 'POST', body: { ...formData(f), product_id: p.id } }); toast('Stock updated'); closeModal(); products(); }
    catch (err) { toast(err.message, 'err'); }
  };
}

/* ================= STOCK IN (scan new goods) ================= */
async function stockin() {
  const items = []; let cam = null;
  let branch = ME.branch_id;
  $('#main').innerHTML = topbar('Stock In', branchSelect('sib', branch)) + `
    <div class="info-box">New goods arrived? Click the box below and scan each sticker with the scanner (or use the camera). Every scan adds 1. Change the number if needed, then press <b>Save stock</b>.</div>
    <div class="card"><div class="row">
      <input class="grow" id="siScan" placeholder="Scan or type SKU and press Enter" autocomplete="off" autofocus>
      <button class="btn" id="siCam" type="button">📷 Camera</button>
    </div><div id="siReader" style="max-width:420px;margin-top:.8rem"></div></div>
    <div class="card"><div id="siList"></div>
      <div class="row" style="margin-top:1rem"><input class="grow" id="siNote" placeholder="Note (supplier, invoice no.) — optional">
      <button class="btn primary lg" id="siSave">Save stock</button></div></div>`;

  const draw = () => {
    $('#siList').innerHTML = items.length ? `<table><tr><th>SKU</th><th>Product</th><th class="num">Now in stock</th><th class="num">Adding</th><th></th></tr>${items.map((it, i) => `
      <tr><td class="mono">${esc(it.sku)}</td><td>${esc(it.name)} <span class="small muted">${esc(it.size || '')}</span></td><td class="num">${it.stock}</td>
      <td class="num"><input type="number" min="1" value="${it.qty}" data-q="${i}" class="label-qty"></td><td class="right"><button class="btn sm danger" data-rm="${i}">✕</button></td></tr>`).join('')}</table>
      <p class="right"><b>Total pieces: ${items.reduce((s, x) => s + x.qty, 0)}</b></p>` : '<div class="empty">Nothing scanned yet</div>';
  };
  const add = async code => {
    try {
      const p = await api('/products/lookup/' + encodeURIComponent(code) + '?branch_id=' + branch);
      const ex = items.find(x => x.id === p.id);
      if (ex) ex.qty++; else items.unshift({ id: p.id, sku: p.sku, name: p.name, size: p.size, stock: p.stock, qty: 1 });
      GVS.beep(true); draw();
    } catch (err) { GVS.beep(false); toast(err.message, 'err'); }
  };
  draw();
  $('#siScan').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); const c = e.target.value.trim(); e.target.value = ''; if (c) add(c); } };
  $('#siList').oninput = e => { const q = e.target.dataset.q; if (q != null) items[q].qty = Math.max(1, parseInt(e.target.value, 10) || 1); };
  $('#siList').onclick = e => { const r = e.target.closest('[data-rm]'); if (r) { items.splice(+r.dataset.rm, 1); draw(); } };
  if ($('#sib')) $('#sib').onchange = e => { branch = +e.target.value; items.length = 0; draw(); };
  $('#siCam').onclick = async () => {
    if (cam) { cam.stop(); cam = null; $('#siCam').textContent = '📷 Camera'; return; }
    try { cam = await GVS.startCamera('siReader', add); $('#siCam').textContent = 'Stop camera'; } catch (err) { toast('Camera: ' + (err.message || err), 'err'); }
  };
  $('#siSave').onclick = async () => {
    if (!items.length) return toast('Scan something first', 'err');
    try {
      const r = await api('/stock/in', { method: 'POST', body: { branch_id: branch, note: $('#siNote').value, items: items.map(x => ({ product_id: x.id, qty: x.qty })) } });
      toast(`Saved ${r.items.length} products (${r.ref})`); items.length = 0; $('#siNote').value = ''; draw(); $('#siScan').focus();
    } catch (err) { toast(err.message, 'err'); }
  };
  cleanup = () => { if (cam) cam.stop(); };
}

/* ================= LABELS ================= */
async function labels() {
  const rows = await api('/products?branch_id=' + ME.branch_id);
  const qty = {};
  $('#main').innerHTML = topbar('Print Labels', '<button class="btn primary" id="lbPrint">🖨️ Print selected</button>') + `
    <div class="info-box">Each sticker has the product name, size, price, a <b>barcode</b> (for USB scanners) and a <b>QR code</b> (for phone cameras). Both contain the SKU.
      Enter how many stickers you need for each product. Tip: use <b>“= stock”</b> to print one per piece in stock.</div>
    <div class="card" style="margin-bottom:1rem"><div class="row">
      <input class="grow" id="lbq" placeholder="Filter products…">
      <label class="check" style="margin:0">Paper: <select id="lbPaper" style="width:auto;margin-left:.4rem">
        <option value="a4">A4 sheet (3 × 8 = 24 per page)</option><option value="thermal">Thermal label roll 50 × 25 mm</option></select></label>
      <button class="btn" id="lbStock">= stock for all shown</button><button class="btn" id="lbClear">Clear</button>
    </div></div>
    <div class="table-wrap"><table id="lbt"><tr><th>SKU</th><th>Product</th><th>Size</th><th class="num">Price</th><th class="num">In stock</th><th class="num">Stickers</th></tr>
      ${rows.map(p => `<tr data-row="${p.id}" data-s="${esc((p.sku + ' ' + p.name + ' ' + p.category).toLowerCase())}"><td class="mono">${esc(p.sku)}</td><td>${esc(p.name)}</td>
      <td>${esc(p.size || '')}</td><td class="num">${rupees(p.price)}</td><td class="num">${p.stock}</td>
      <td class="num"><input type="number" min="0" max="500" value="" data-lq="${p.id}" data-stock="${p.stock}" class="label-qty"></td></tr>`).join('')}</table></div>`;
  $('#lbt').oninput = e => { const id = e.target.dataset.lq; if (id) qty[id] = Math.max(0, Math.min(500, parseInt(e.target.value, 10) || 0)); };
  $('#lbq').oninput = e => { const q = e.target.value.toLowerCase(); $$('#lbt tr[data-row]').forEach(r => r.classList.toggle('hidden', !r.dataset.s.includes(q))); };
  $('#lbStock').onclick = () => $$('#lbt tr[data-row]:not(.hidden) input').forEach(i => { i.value = i.dataset.stock; qty[i.dataset.lq] = +i.dataset.stock; });
  $('#lbClear').onclick = () => $$('#lbt input').forEach(i => { i.value = ''; delete qty[i.dataset.lq]; });
  $('#lbPrint').onclick = () => {
    const list = Object.entries(qty).filter(([, n]) => n > 0).map(([id, n]) => `${id}x${n}`);
    if (!list.length) return toast('Enter how many stickers to print', 'err');
    window.open(`/admin/labels.html?paper=${$('#lbPaper').value}&items=${list.join(',')}`, '_blank');
  };
}

/* ================= COUPONS ================= */
async function coupons() {
  const rows = await api('/coupons');
  const today = todayIST();
  const status = c => !c.active ? ['Off', ''] : (c.valid_to && today > c.valid_to) ? ['Expired', 'err'] : (c.valid_from && today < c.valid_from) ? ['Scheduled', 'warn']
    : (c.max_uses != null && c.used_count >= c.max_uses) ? ['Used up', 'err'] : ['Active', 'ok'];
  $('#main').innerHTML = topbar('Coupons', '<button class="btn primary" id="addCp">+ New coupon</button>') + `
    <div class="table-wrap"><table><tr><th>Code</th><th>Discount</th><th>Rules</th><th>Valid</th><th class="num">Used</th><th>Status</th><th></th></tr>
    ${rows.map(c => { const s = status(c); return `<tr>
      <td><b class="mono">${esc(c.code)}</b><div class="small muted">${esc(c.description || '')}</div></td>
      <td>${c.type === 'percent' ? `${c.value}% off${c.max_discount ? ` (max ${rupees(c.max_discount)})` : ''}` : `${rupees(c.value)} off`}</td>
      <td class="small">${c.min_bill ? `Min bill ${rupees(c.min_bill)}<br>` : ''}${c.category ? `Only ${esc(c.category)}<br>` : ''}${c.per_customer ? `${c.per_customer}× per customer` : ''}</td>
      <td class="small">${esc(c.valid_from || 'now')} → ${esc(c.valid_to || 'no end')}</td>
      <td class="num">${c.used_count}${c.max_uses != null ? ' / ' + c.max_uses : ''}</td>
      <td><span class="pill ${s[1]}">${s[0]}</span></td>
      <td class="right"><button class="btn sm" data-cp="${c.id}">Edit</button></td></tr>`; }).join('') || '<tr><td colspan="7" class="empty">No coupons yet</td></tr>'}
    </table></div>`;
  $('#addCp').onclick = () => couponForm();
  $('#main').onclick = e => { const b = e.target.closest('[data-cp]'); if (b) couponForm(rows.find(c => c.id === +b.dataset.cp)); };
}

function couponForm(c = null) {
  const v = k => esc(c ? (c[k] == null ? '' : c[k]) : '');
  openModal(`<form id="cf">
    <div class="modal-head"><h2>${c ? 'Edit coupon' : 'New coupon'}</h2><button type="button" class="btn sm" data-close>✕</button></div>
    <div class="grid g2">
      <div class="field"><label>Coupon code *</label><input name="code" required value="${v('code')}" placeholder="DIWALI10" style="text-transform:uppercase"></div>
      <div class="field"><label>Description</label><input name="description" value="${v('description')}" placeholder="Diwali festival offer"></div>
      <div class="field"><label>Type</label><select name="type" id="cpType"><option value="percent" ${!c || c.type === 'percent' ? 'selected' : ''}>% off the bill</option><option value="flat" ${c && c.type === 'flat' ? 'selected' : ''}>Flat ₹ off</option></select></div>
      <div class="field"><label id="cpValLabel">Discount *</label><input name="value" type="number" min="1" required value="${v('value')}"></div>
      <div class="field" id="cpMaxBox"><label>Maximum discount ₹ (for %)</label><input name="max_discount" type="number" min="1" value="${v('max_discount')}" placeholder="no limit"></div>
      <div class="field"><label>Minimum bill ₹</label><input name="min_bill" type="number" min="0" value="${c ? v('min_bill') : 0}"></div>
      <div class="field"><label>Total uses allowed</label><input name="max_uses" type="number" min="1" value="${v('max_uses')}" placeholder="unlimited"></div>
      <div class="field"><label>Uses per customer (by phone)</label><input name="per_customer" type="number" min="1" value="${v('per_customer')}" placeholder="unlimited"></div>
      <div class="field"><label>Starts</label><input name="valid_from" type="date" value="${v('valid_from')}"></div>
      <div class="field"><label>Ends</label><input name="valid_to" type="date" value="${v('valid_to')}"></div>
      <div class="field"><label>Only for category (optional)</label><input name="category" list="cpCats" value="${v('category')}" placeholder="all products">
        <datalist id="cpCats">${CATEGORIES.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
    </div>
    <label class="check"><input type="checkbox" name="active" ${!c || c.active ? 'checked' : ''}> Coupon is active</label>
    ${c ? `<p class="small muted">Used ${c.used_count} times so far.</p>` : ''}
    <div class="modal-foot"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">Save</button></div>
  </form>`);
  const sync = () => { const pct = $('#cpType').value === 'percent'; $('#cpValLabel').textContent = pct ? 'Discount % *' : 'Discount ₹ *'; $('#cpMaxBox').classList.toggle('hidden', !pct); };
  $('#cpType').onchange = sync; sync();
  $('#cf').onsubmit = async e => {
    e.preventDefault();
    const d = formData(e.target); d.active = e.target.active.checked;
    try { await api(c ? '/coupons/' + c.id : '/coupons', { method: c ? 'PUT' : 'POST', body: d }); toast('Coupon saved'); closeModal(); coupons(); }
    catch (err) { toast(err.message, 'err'); }
  };
}

/* ================= BILLS & RETURNS ================= */
let billState = { q: '', from: todayIST(), to: todayIST(), branch: '' };
async function bills() {
  const st = billState;
  const rows = await api('/bills?' + new URLSearchParams({ q: st.q, from: st.from, to: st.to, branch_id: st.branch }));
  const total = rows.reduce((s, b) => s + b.total, 0);
  $('#main').innerHTML = topbar('Bills & Returns', can('manager') ? `<a class="btn" href="/api/export/bills.csv?from=${st.from}&to=${st.to}">⬇ Export CSV (for accountant)</a>` : '') + `
    <div class="card" style="margin-bottom:1rem"><div class="row">
      <input class="grow" id="bq" placeholder="Invoice no, phone or name" value="${esc(st.q)}">
      <input type="date" id="bf" value="${esc(st.from)}" style="width:auto"> → <input type="date" id="bt" value="${esc(st.to)}" style="width:auto">
      ${branchSelect('bb', st.branch, true)}
    </div><p class="small muted" style="margin:.6rem 0 0">${rows.length} bills · ${paise(total)}</p></div>
    <div class="table-wrap"><table><tr><th>Invoice</th><th>Date</th><th>Customer</th><th class="num">Items</th><th class="num">Total</th><th>Payment</th><th>Status</th><th></th></tr>
    ${rows.map(b => `<tr><td class="mono">${esc(b.invoice_no)}</td><td class="small">${ist(b.created_at)}</td>
      <td>${esc(b.customer_name || '')}<div class="small muted">${esc(b.customer_phone || '')}</div></td><td class="num">${b.items}</td>
      <td class="num"><b>${paise(b.total)}</b>${b.coupon_code ? `<div class="small muted">${esc(b.coupon_code)}</div>` : ''}</td>
      <td class="small">${b.payments.map(p => esc(p.mode.toUpperCase())).join(' + ')}</td>
      <td>${b.status === 'paid' ? '<span class="pill ok">Paid</span>' : b.status === 'returned' ? '<span class="pill err">Returned</span>' : '<span class="pill warn">Part returned</span>'}</td>
      <td class="right"><button class="btn sm" data-bill="${b.id}">Open</button></td></tr>`).join('') || '<tr><td colspan="8" class="empty">No bills for these dates</td></tr>'}
    </table></div>`;
  let t;
  $('#bq').oninput = e => { clearTimeout(t); t = setTimeout(() => { st.q = e.target.value; bills().then(() => { const i = $('#bq'); i.focus(); i.setSelectionRange(i.value.length, i.value.length); }); }, 350); };
  $('#bf').onchange = e => { st.from = e.target.value; bills(); };
  $('#bt').onchange = e => { st.to = e.target.value; bills(); };
  if ($('#bb')) $('#bb').onchange = e => { st.branch = e.target.value; bills(); };
  $('#main').onclick = e => { const b = e.target.closest('[data-bill]'); if (b) billModal(+b.dataset.bill); };
}

async function billModal(id) {
  const b = await api('/bills/' + id);
  const canReturn = b.items.some(i => i.qty > i.returned_qty);
  openModal(`<div class="modal-head"><div><h2 class="mono" style="font-family:inherit">${esc(b.invoice_no)}</h2><span class="muted small">${ist(b.created_at)} · ${esc(b.branch_name)} · by ${esc(b.cashier)}</span></div>
      <button class="btn sm" data-close>✕</button></div>
    <p>${esc(b.customer_name || 'Walk-in customer')} ${b.customer_phone ? '· ' + esc(b.customer_phone) : ''}</p>
    <form id="rf"><table><tr><th>Item</th><th class="num">Qty</th><th class="num">Amount</th>${canReturn ? '<th class="num">Return qty</th>' : ''}</tr>
    ${b.items.map(i => `<tr><td>${esc(i.name)} <span class="small muted">${esc(i.size || '')}</span><div class="mono small muted">${esc(i.sku)}</div></td>
      <td class="num">${i.qty}${i.returned_qty ? `<div class="small" style="color:var(--err)">${i.returned_qty} returned</div>` : ''}</td>
      <td class="num">${paise(i.line_total - i.discount)}</td>
      ${canReturn ? `<td class="num"><input type="number" class="label-qty" min="0" max="${i.qty - i.returned_qty}" value="0" name="r${i.id}" ${i.qty === i.returned_qty ? 'disabled' : ''}></td>` : ''}</tr>`).join('')}
    </table>
    <table style="margin-top:.6rem"><tr><td>Subtotal</td><td class="num">${paise(b.subtotal)}</td></tr>
      ${b.discount ? `<tr><td>Coupon ${esc(b.coupon_code)}</td><td class="num">−${paise(b.discount)}</td></tr>` : ''}
      <tr><td>CGST + SGST (included)</td><td class="num">${paise(b.cgst + b.sgst)}</td></tr>
      <tr><td><b>Total</b></td><td class="num"><b>${paise(b.total)}</b></td></tr>
      <tr><td>Paid</td><td class="num">${b.payments.map(p => `${esc(p.mode.toUpperCase())} ${paise(p.amount)}`).join(' + ')}</td></tr></table>
    ${b.returns.length ? `<p class="small">Credit notes: ${b.returns.map(r => `<a href="/admin/receipt.html?id=${b.id}&credit=${encodeURIComponent(r.credit_no)}" target="_blank">${esc(r.credit_no)}</a> (${paise(r.amount)})`).join(', ')}</p>` : ''}
    ${canReturn ? `<div class="field" style="margin-top:1rem"><label>Return reason</label><input name="reason" placeholder="Size issue / colour exchange…"></div>` : ''}
    <div class="modal-foot"><a class="btn" target="_blank" href="/admin/receipt.html?id=${b.id}">🖨️ Reprint bill</a>
      ${canReturn ? '<button class="btn danger">Return selected items</button>' : ''}</div></form>`);
  $('#rf').onsubmit = async e => {
    e.preventDefault();
    const items = b.items.map(i => ({ bill_item_id: i.id, qty: parseInt((e.target['r' + i.id] || {}).value, 10) || 0 })).filter(x => x.qty > 0);
    if (!items.length) return toast('Enter the quantity to return', 'err');
    if (!confirm('Return these items? Stock will be added back.')) return;
    try {
      const r = await api('/returns', { method: 'POST', body: { bill_id: b.id, items, reason: e.target.reason.value } });
      toast(`Credit note ${r.credit_no}: refund ${paise(r.amount)}`);
      window.open(`/admin/receipt.html?id=${b.id}&credit=${encodeURIComponent(r.credit_no)}`, '_blank');
      closeModal(); bills();
    } catch (err) { toast(err.message, 'err'); }
  };
}

/* ================= STAFF ================= */
async function staff() {
  const rows = await api('/users');
  $('#main').innerHTML = topbar('Staff', '<button class="btn primary" id="addU">+ Add staff</button>') + `
    <div class="info-box"><b>Owner</b>: everything. <b>Manager</b>: products, stock, coupons, labels, reports. <b>Cashier</b>: billing counter and bills of their branch only.</div>
    <div class="table-wrap"><table><tr><th>Name</th><th>Username</th><th>Role</th><th>Branch</th><th>Status</th><th></th></tr>
    ${rows.map(u => `<tr><td>${esc(u.name)}</td><td class="mono">${esc(u.username)}</td><td>${esc(u.role)}</td><td>${esc(u.branch_name || '')}</td>
      <td>${u.active ? '<span class="pill ok">Active</span>' : '<span class="pill">Disabled</span>'}</td><td class="right"><button class="btn sm" data-u="${u.id}">Edit</button></td></tr>`).join('')}
    </table></div>`;
  $('#addU').onclick = () => userForm();
  $('#main').onclick = e => { const b = e.target.closest('[data-u]'); if (b) userForm(rows.find(u => u.id === +b.dataset.u)); };
}

function userForm(u = null) {
  openModal(`<form id="uf"><div class="modal-head"><h2>${u ? 'Edit staff' : 'Add staff'}</h2><button type="button" class="btn sm" data-close>✕</button></div>
    <div class="grid g2">
      <div class="field"><label>Full name *</label><input name="name" required value="${esc(u ? u.name : '')}"></div>
      <div class="field"><label>Username *</label><input name="username" required ${u ? 'disabled' : ''} value="${esc(u ? u.username : '')}" pattern="[a-zA-Z0-9_.]{3,30}"></div>
      <div class="field"><label>Role</label><select name="role">${['cashier', 'manager', 'owner'].map(r => `<option ${u && u.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      <div class="field"><label>Branch</label><select name="branch_id">${BRANCHES.map(b => `<option value="${b.id}" ${u && u.branch_id === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select></div>
      <div class="field"><label>${u ? 'Reset password (leave empty to keep)' : 'Temporary password *'}</label><input name="password" type="text" minlength="8" ${u ? '' : 'required'} autocomplete="off"></div>
    </div>
    ${u ? `<label class="check"><input type="checkbox" name="active" ${u.active ? 'checked' : ''}> Can log in</label>` : ''}
    <p class="small muted">They will be asked to set their own password on first login.</p>
    <div class="modal-foot"><button type="button" class="btn" data-close>Cancel</button><button class="btn primary">Save</button></div></form>`);
  $('#uf').onsubmit = async e => {
    e.preventDefault();
    const d = formData(e.target); if (!d.password) delete d.password;
    if (u) d.active = e.target.active.checked;
    try { await api(u ? '/users/' + u.id : '/users', { method: u ? 'PUT' : 'POST', body: d }); toast('Saved'); closeModal(); staff(); }
    catch (err) { toast(err.message, 'err'); }
  };
}

/* ================= SETTINGS ================= */
async function settings() {
  const s = await api('/settings');
  BRANCHES = await api('/branches');
  $('#main').innerHTML = topbar('Settings') + `
    <form class="card" id="sf"><h3>Shop &amp; bill details</h3>
      <div class="grid g2">
        <div class="field"><label>Shop name on bill</label><input name="shop_name" value="${esc(s.shop_name)}"></div>
        <div class="field"><label>GSTIN (used if branch has none)</label><input name="gstin" value="${esc(s.gstin)}" placeholder="36XXXXXXXXXXXZX"></div>
        <div class="field"><label>Default GST % for new products</label><input name="default_gst_rate" type="number" step="0.5" min="0" max="28" value="${esc(s.default_gst_rate)}"></div>
        <div class="field"><label>Default HSN code</label><input name="default_hsn" value="${esc(s.default_hsn)}"></div>
      </div>
      <div class="field"><label>Message at bottom of bill</label><textarea name="receipt_footer" rows="2">${esc(s.receipt_footer)}</textarea></div>
      <p class="small muted">⚠️ Confirm the GST rates, HSN codes and bill format with the shop's accountant before going live.</p>
      <button class="btn primary">Save</button></form>
    <div class="card"><h3>Branches</h3>
      ${BRANCHES.map(b => `<form class="grid g4" data-br="${b.id}" style="align-items:end;margin-bottom:.8rem">
        <div class="field" style="margin:0"><label>${esc(b.code)} · Name</label><input name="name" value="${esc(b.name)}"></div>
        <div class="field" style="margin:0"><label>Address</label><input name="address" value="${esc(b.address || '')}"></div>
        <div class="field" style="margin:0"><label>Phone / GSTIN</label><div class="row"><input name="phone" value="${esc(b.phone || '')}" style="flex:1;min-width:0"><input name="gstin" value="${esc(b.gstin || '')}" placeholder="GSTIN" style="flex:1;min-width:0"></div></div>
        <button class="btn">Save</button></form>`).join('')}
    </div>
    <div class="card"><h3>Your account</h3><a class="btn" href="#password" id="chpw">Change my password</a></div>`;
  $('#sf').onsubmit = async e => { e.preventDefault(); try { await api('/settings', { method: 'PUT', body: formData(e.target) }); toast('Saved'); } catch (err) { toast(err.message, 'err'); } };
  $$('[data-br]').forEach(f => f.onsubmit = async e => {
    e.preventDefault();
    try { await api('/branches/' + f.dataset.br, { method: 'PUT', body: formData(f) }); toast('Branch saved'); } catch (err) { toast(err.message, 'err'); }
  });
  $('#chpw').onclick = e => { e.preventDefault(); location.hash = '#password'; showAuth('password'); };
}

boot();
