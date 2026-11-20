/* Sticker sheet: ?paper=a4|thermal&items=PRODUCTIDxCOUNT,... */
const { $, esc, api } = GVS;
const qs = new URLSearchParams(location.search);
const paper = qs.get('paper') === 'thermal' ? 'thermal' : 'a4';
document.body.classList.add(paper);
$('#pageSize').textContent = paper === 'thermal' ? '@page { size: 50mm 25mm; margin: 0; }' : '@page { size: A4; margin: 0; }';
$('#p').onclick = () => window.print();

(async function () {
  const want = (qs.get('items') || '').split(',').map(x => x.split('x').map(Number)).filter(([id, n]) => id > 0 && n > 0);
  if (!want.length) { $('#info').textContent = 'No labels selected'; return; }
  const [rows, settings] = await Promise.all([api('/products?ids=' + want.map(w => w[0]).join(',')), api('/settings')]);
  const byId = Object.fromEntries(rows.map(p => [p.id, p]));
  const shop = settings.shop_name || 'Garuda';
  const html = [];
  let count = 0;
  for (const [id, n] of want) {
    const p = byId[id]; if (!p) continue;
    const t = encodeURIComponent(p.sku);
    const one = `<div class="lbl">
      <div class="nm">${esc(p.name)}</div>
      <div class="meta">${esc(p.size || '')}${p.colour_desc ? ' · ' + esc(p.colour_desc) : ''}<br>
        <span class="pr">₹${Number(p.price).toLocaleString('en-IN')}</span>${p.mrp && p.mrp > p.price ? ` <s>₹${Number(p.mrp).toLocaleString('en-IN')}</s>` : ''}
        <span class="sku"> ${esc(p.sku)}</span></div>
      <img class="qr" src="/api/barcode.svg?type=qr&text=${t}" alt="">
      <img class="bc" src="/api/barcode.svg?text=${t}" alt="" style="object-fit:fill">
    </div>`;
    for (let i = 0; i < n; i++) { html.push(one); count++; }
  }
  $('#sheet').innerHTML = html.join('');
  $('#info').textContent = `${count} labels · ${paper === 'thermal' ? 'Thermal 50×25 mm' : 'A4, 24 per page'} · ${shop}. In the print dialog set Margins: None and Scale: 100%.`;
})();
