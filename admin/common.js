// Shared helpers for admin, billing counter, receipt and label pages.
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  // Escape any text before putting it into HTML (prevents script injection)
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const rupees = n => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
  const paise = p => '₹' + (Number(p || 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Accepts ISO dates from the server ("2026-11-20T17:36:10.000Z") and old "YYYY-MM-DD HH:MM:SS" (UTC) format
  const ist = s => {
    if (!s) return '';
    const d = new Date(/[TZ+]/.test(String(s)) ? s : String(s).replace(' ', 'T') + 'Z');
    return isNaN(d) ? String(s) : d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  };
  const todayIST = () => new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);

  async function api(path, opts = {}) {
    const init = { method: opts.method || 'GET', credentials: 'same-origin', headers: { 'X-Requested-With': 'gvs' } };
    if (opts.body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
    let res;
    try { res = await fetch('/api' + path, init); }
    catch { throw new Error('Cannot reach the server. Check the internet / Wi-Fi.'); }
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && !opts.noRedirect) { location.href = '/admin/#login'; throw new Error(data.error || 'Please log in'); }
    if (res.status === 403 && data.mustChangePassword && !opts.noRedirect) { location.href = '/admin/#password'; throw new Error(data.error); }
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  let toastTimer;
  function toast(msg, kind = 'ok') {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.className = 'toast show ' + kind;
    t.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), kind === 'err' ? 4500 : 2600);
  }

  // Short beep for the scanner (good / bad scan)
  let actx;
  function beep(ok = true) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = ok ? 1250 : 260; o.type = ok ? 'sine' : 'square';
      g.gain.value = 0.08; o.connect(g); g.connect(actx.destination);
      o.start(); o.stop(actx.currentTime + (ok ? 0.09 : 0.3));
    } catch { /* sound not available */ }
  }

  // Phone/laptop camera scanner (QR + barcodes). Needs /admin/vendor/html5-qrcode.min.js loaded.
  // Returns { stop() }. Same code is ignored for 2 seconds so one sticker isn't added twice.
  async function startCamera(elementId, onCode) {
    if (!window.Html5Qrcode) throw new Error('Camera scanner not loaded');
    const F = window.Html5QrcodeSupportedFormats;
    const cam = new window.Html5Qrcode(elementId, {
      formatsToSupport: [F.QR_CODE, F.CODE_128, F.EAN_13, F.CODE_39], verbose: false,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true }
    });
    let last = '', lastAt = 0;
    await cam.start({ facingMode: 'environment' }, { fps: 10, qrbox: { width: 260, height: 160 } }, text => {
      const now = Date.now();
      if (text === last && now - lastAt < 2000) return;
      last = text; lastAt = now; onCode(text);
    }, () => {});
    return { stop: () => cam.stop().then(() => cam.clear()).catch(() => {}) };
  }

  window.GVS = { $, $$, esc, rupees, paise, ist, todayIST, api, toast, beep, startCamera };
})();
