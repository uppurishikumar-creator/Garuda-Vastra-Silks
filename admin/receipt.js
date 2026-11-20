/* Printable 80 mm bill / credit note. ?id=BILL_ID [&credit=CN_NO] [&autoprint=1] */
const { $, esc, paise, ist, api } = GVS;
const qs = new URLSearchParams(location.search);
$('#p').onclick = () => window.print();
$('#x').onclick = () => window.close();

(async function () {
  let b;
  try { b = await api('/bills/' + encodeURIComponent(qs.get('id'))); }
  catch (err) { $('#r').textContent = err.message; return; }
  const credit = qs.get('credit') && b.returns.find(r => r.credit_no === qs.get('credit'));
  const n = v => (v / 100).toFixed(2);

  const head = `<div class="c"><h1>${esc(b.shop_name)}</h1>
    <div class="s">${esc(b.branch_name)}<br>${esc(b.branch_address || '')}<br>${b.branch_phone ? 'Ph: ' + esc(b.branch_phone) : ''}
    ${b.gstin ? `<br><b>GSTIN: ${esc(b.gstin)}</b>` : ''}</div>
    <div class="title">${credit ? 'CREDIT NOTE' : 'TAX INVOICE'}</div></div>`;

  let body;
  if (credit) {
    document.title = credit.credit_no;
    body = `<div class="s">Credit note: <b>${esc(credit.credit_no)}</b><br>Date: ${esc(ist(credit.created_at))}<br>
      Against bill: ${esc(b.invoice_no)} (${esc(ist(b.created_at))})<br>${b.customer_name || b.customer_phone ? `Customer: ${esc(b.customer_name || '')} ${esc(b.customer_phone || '')}<br>` : ''}
      ${credit.reason ? 'Reason: ' + esc(credit.reason) + '<br>' : ''}By: ${esc(credit.user_name)}</div>
      <div class="hr"></div><table><tr><th>Item returned</th><th class="n">Qty</th><th class="n">Amount</th></tr>
      ${credit.items.map(i => `<tr><td>${esc(i.name)}<br><span class="s">${esc(i.sku)}</span></td><td class="n">${i.qty}</td><td class="n">${n(i.refund)}</td></tr>`).join('')}</table>
      <div class="hr"></div><table><tr class="tot"><td>REFUND / CREDIT</td><td class="n">₹${n(credit.amount)}</td></tr></table>`;
  } else {
    document.title = b.invoice_no;
    // GST summary grouped by rate
    const byRate = {};
    b.items.forEach(i => { const k = i.gst_rate; byRate[k] = byRate[k] || { taxable: 0, tax: 0 }; byRate[k].taxable += i.taxable; byRate[k].tax += i.tax; });
    body = `<div class="s">Invoice: <b>${esc(b.invoice_no)}</b><br>Date: ${esc(ist(b.created_at))}<br>Cashier: ${esc(b.cashier)}
      ${b.customer_name || b.customer_phone ? `<br>Customer: ${esc(b.customer_name || '')} ${esc(b.customer_phone || '')}` : ''}</div>
      <div class="hr"></div>
      <table><tr><th>Item</th><th class="n">Qty</th><th class="n">Rate</th><th class="n">Amt</th></tr>
      ${b.items.map(i => `<tr><td>${esc(i.name)}<br><span class="s">${esc(i.sku)}${i.size ? ' · ' + esc(i.size) : ''}${i.hsn ? ' · HSN ' + esc(i.hsn) : ''}</span></td>
        <td class="n">${i.qty}</td><td class="n">${n(i.unit_price)}</td><td class="n">${n(i.line_total)}</td></tr>`).join('')}</table>
      <div class="hr"></div>
      <table>
        <tr><td>Subtotal</td><td class="n">${n(b.subtotal)}</td></tr>
        ${b.discount ? `<tr><td>Coupon ${esc(b.coupon_code)}</td><td class="n">-${n(b.discount)}</td></tr>` : ''}
        ${b.round_off ? `<tr><td>Round off</td><td class="n">${n(b.round_off)}</td></tr>` : ''}
        <tr class="tot"><td>TOTAL</td><td class="n">₹${n(b.total)}</td></tr>
        <tr><td colspan="2" class="s">Paid: ${b.payments.map(p => `${esc(p.mode.toUpperCase())} ₹${n(p.amount)}`).join(' + ')}</td></tr>
      </table>
      <div class="hr"></div>
      <table class="s"><tr><th>GST%</th><th class="n">Taxable</th><th class="n">CGST</th><th class="n">SGST</th></tr>
      ${Object.entries(byRate).map(([r, v]) => { const c = Math.round(v.tax / 2); return `<tr><td>${r}%</td><td class="n">${n(v.taxable)}</td><td class="n">${n(c)}</td><td class="n">${n(v.tax - c)}</td></tr>`; }).join('')}
      </table><div class="s">Prices are inclusive of GST.</div>
      ${b.returns.length ? `<div class="s"><br>Returns: ${b.returns.map(r => esc(r.credit_no)).join(', ')}</div>` : ''}`;
  }

  const code = credit ? credit.credit_no : b.invoice_no;
  $('#r').innerHTML = head + body + `<div class="hr"></div>
    <div class="c"><img class="bc" id="bc" alt="" src="/api/barcode.svg?text=${encodeURIComponent(code)}"><div class="s">${esc(code)}</div>
    <div class="s" style="margin-top:6px">${esc(b.receipt_footer || '')}</div></div>`;

  if (qs.get('autoprint')) {
    const img = $('#bc');
    const go = () => setTimeout(() => window.print(), 150);
    if (img.complete) go(); else { img.onload = go; img.onerror = go; }
  }
})();
