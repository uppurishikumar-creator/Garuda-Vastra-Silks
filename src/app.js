const WA = "919247994041";
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const inr = n => "₹" + n.toLocaleString("en-IN");

/* ---------- colourways & generated saree art ---------- */
const PAL = [
  { b: "#8e1b22", d: "#5c0f15", z: "#d8b25a", br: "#1d5c3a" },   // 0 crimson/green
  { b: "#1f7a6b", d: "#0f4d43", z: "#d8b25a", br: "#7a1630" },   // 1 sea green/maroon
  { b: "#1c2f6e", d: "#101c45", z: "#e0bd68", br: "#1c2f6e" },   // 2 royal blue
  { b: "#a8185a", d: "#6e0d3a", z: "#e2c070", br: "#3e1a5c" },   // 3 magenta
  { b: "#f0b79a", d: "#cf8d6e", z: "#c79a46", br: "#7a2434" },   // 4 peach
  { b: "#b9a3d6", d: "#8b74ad", z: "#c9a45c", br: "#4b2f6b" },   // 5 lavender
  { b: "#d39b22", d: "#9c6f10", z: "#f2d27a", br: "#7a1630" },   // 6 mustard
  { b: "#2c3d7a", d: "#18234d", z: "#e6e1d3", br: "#9b1d2a" },   // 7 indigo ikat
  { b: "#efe6d2", d: "#cdbf9f", z: "#b88a3e", br: "#601A27" },   // 8 ivory/maroon
  { b: "#5d8f3a", d: "#3d6524", z: "#d8b25a", br: "#d6a520" },   // 9 leaf green
  { b: "#e7b416", d: "#b58a05", z: "#f5dc8a", br: "#c2185b" },   // 10 mango/pink
  { b: "#f2c4c8", d: "#d79aa0", z: "#c9a45c", br: "#f2c4c8" },   // 11 blush organza
  { b: "#6b1424", d: "#430b16", z: "#d8b25a", br: "#d39b22" }    // 12 maroon/mustard
];
const artCache = {};
function tile(p, s = 1) {
  const c = document.createElement("canvas"); c.width = c.height = 64 * s; const x = c.getContext("2d");
  x.fillStyle = p.b; x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = p.z; x.globalAlpha = .9;
  const dot = (cx, cy, r) => { x.beginPath(); x.ellipse(cx, cy, r, r * 1.35, .5, 0, 7); x.fill(); };
  dot(16 * s, 16 * s, 3.2 * s); dot(48 * s, 48 * s, 3.2 * s);
  x.globalAlpha = .45; dot(48 * s, 16 * s, 1.4 * s); dot(16 * s, 48 * s, 1.4 * s);
  return c;
}
function borderTile(p, h) {
  const c = document.createElement("canvas"); c.width = h * 1.2; c.height = h; const x = c.getContext("2d");
  x.fillStyle = p.br; x.fillRect(0, 0, c.width, h);
  const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, p.z); g.addColorStop(.5, "#fff3c9"); g.addColorStop(1, p.z);
  x.fillStyle = g;
  x.fillRect(0, h * .08, c.width, h * .07); x.fillRect(0, h * .85, c.width, h * .07);
  x.beginPath(); x.moveTo(c.width * .1, h * .78); x.lineTo(c.width * .5, h * .25); x.lineTo(c.width * .9, h * .78); x.closePath(); x.fill(); // temple
  x.fillStyle = p.br; x.beginPath(); x.moveTo(c.width * .3, h * .78); x.lineTo(c.width * .5, h * .5); x.lineTo(c.width * .7, h * .78); x.fill();
  return c;
}
function sareeArt(i, w = 600, h = 750) {
  const k = i + "_" + w; if (artCache[k]) return artCache[k];
  const p = PAL[i], c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
  const bg = x.createLinearGradient(0, 0, w, h); bg.addColorStop(0, "#f6f1e7"); bg.addColorStop(1, "#e9dfcc"); x.fillStyle = bg; x.fillRect(0, 0, w, h);
  // soft shadow
  x.fillStyle = "rgba(60,40,20,.18)"; x.filter = "blur(18px)"; x.fillRect(w * .14, h * .2, w * .76, h * .66); x.filter = "none";
  const fold = (y, fh, rot, pallu) => {
    x.save(); x.translate(w / 2, y); x.rotate(rot);
    const fw = w * .72, X = -fw / 2;
    x.fillStyle = x.createPattern(tile(p, w / 600), "repeat"); x.fillRect(X, 0, fw, fh);
    if (pallu) { // pallu panel with stripes & motifs
      x.fillStyle = p.br; x.fillRect(X + fw * .55, 0, fw * .45, fh);
      for (let s = 0; s < 6; s++) { x.fillStyle = s % 2 ? p.z : "rgba(255,240,200,.7)"; x.fillRect(X + fw * .58 + s * fw * .065, 0, fw * .018, fh); }
      x.fillStyle = p.z; for (let r = 0; r < 3; r++) { x.beginPath(); x.arc(X + fw * .78, fh * (.25 + r * .25), fw * .035, 0, 7); x.fill(); }
    }
    const bt = borderTile(p, fh * .2); x.fillStyle = x.createPattern(bt, "repeat-x");
    x.save(); x.translate(X, fh * .8); x.fillRect(0, 0, fw, fh * .2); x.restore();
    const sh = x.createLinearGradient(X, 0, X + fw, 0);
    sh.addColorStop(0, "rgba(0,0,0,.18)"); sh.addColorStop(.35, "rgba(255,255,255,.12)"); sh.addColorStop(.55, "rgba(0,0,0,0)"); sh.addColorStop(1, "rgba(0,0,0,.22)");
    x.fillStyle = sh; x.fillRect(X, 0, fw, fh);
    x.restore();
  };
  fold(h * .52, h * .3, .03, true);
  fold(h * .2, h * .34, -.02, false);
  return (artCache[k] = c.toDataURL("image/jpeg", .86));
}
function fb(img, i) { img.onerror = null; img.src = sareeArt(i); }
window.fb = fb;

/* ---------- catalogue data (sample) ---------- */
const P = [
  { id: 1, n: "Temple Border Kanchipuram", c: "Sea Green with Maroon Border", w: "Kanchipuram", o: "Wedding", col: "Green", pr: 18500, mrp: 21000, pal: 1, tag: "BESTSELLER" },
  { id: 2, n: "Bridal Kanchipuram Pattu", c: "Crimson & Antique Gold", w: "Kanchipuram", o: "Wedding", col: "Red", pr: 42000, pal: 0, tag: "BRIDAL" },
  { id: 3, n: "Banarasi Katan Brocade", c: "Royal Blue", w: "Banarasi", o: "Festive", col: "Blue", pr: 24500, pal: 2, tag: "NEW" },
  { id: 4, n: "Banarasi Floral Jaal", c: "Magenta with Purple Border", w: "Banarasi", o: "Celebration", col: "Pink", pr: 16800, mrp: 18900, pal: 3 },
  { id: 5, n: "Soft Silk Zari Border", c: "Peach with Maroon Border", w: "Soft Silk", o: "Celebration", col: "Pastel", pr: 7900, pal: 4, tag: "NEW" },
  { id: 6, n: "Soft Silk Butta Weave", c: "Lavender", w: "Soft Silk", o: "Everyday", col: "Pastel", pr: 6400, pal: 5 },
  { id: 7, n: "Gadwal Silk Cotton", c: "Mustard with Maroon Pallu", w: "Handloom", o: "Festive", col: "Yellow", pr: 8900, pal: 6, tag: "TELANGANA WEAVE" },
  { id: 8, n: "Pochampally Ikat Silk", c: "Indigo & Red", w: "Handloom", o: "Festive", col: "Blue", pr: 9200, pal: 7, tag: "TELANGANA WEAVE" },
  { id: 9, n: "Handloom Cotton", c: "Ivory with Maroon Border", w: "Handloom", o: "Everyday", col: "Pastel", pr: 2400, pal: 8 },
  { id: 10, n: "Mangalagiri Cotton", c: "Leaf Green with Gold Border", w: "Handloom", o: "Everyday", col: "Green", pr: 1850, pal: 9 },
  { id: 11, n: "Kanchipuram Korvai", c: "Mango Yellow & Rani Pink", w: "Kanchipuram", o: "Wedding", col: "Yellow", pr: 28500, pal: 10, tag: "NEW" },
  { id: 12, n: "Contemporary Tissue Organza", c: "Blush Pink", w: "Contemporary", o: "Celebration", col: "Pink", pr: 9800, pal: 11 },
  { id: 13, n: "Narayanpet Silk", c: "Maroon with Mustard Border", w: "Handloom", o: "Festive", col: "Red", pr: 5600, pal: 12, tag: "TELANGANA WEAVE" }
];
P.forEach(p => p.img = sareeArt(p.pal));

const C1 = "__C1__", C2 = "__C2__";
const WEAVES = [
  { k: "Kanchipuram", d: "Temple borders, contrast pallus and rich zari — the queen of silk sarees.", src: C1 + "48a76f92d63b844992f404965bfa0683.webp", pal: 0 },
  { k: "Banarasi", d: "Intricate brocades and floral jaals woven for grand occasions.", src: C2 + "03a4b362-0555-4cde-9e65-d2a473d7e690.png", pal: 2 },
  { k: "Soft Silk", d: "A lighter drape with a gentle sheen — silk made effortless.", src: C2 + "14c73c19-e81e-4209-a353-d05a2d029b40.png", pal: 4 },
  { k: "Handloom", d: "Gadwal, Pochampally, Narayanpet and everyday cottons.", src: C2 + "7f5e4bab-c23b-49f0-b27c-e903681bd934.png", pal: 7 }
];
const STORES = [
  { id: "bhuvanagiri", city: "BHUVANAGIRI · TELANGANA", n: "Bhuvanagiri (Bhongir)", a: "Municipal Door Nos. 1-3-234/3 to 234/13, beside Govt. Junior College, Medikuntapally, Bhuvanagiri", q: "Garuda Vastra Silks Bhuvanagiri Telangana", isNew: 1 },
  { id: "hyderabad", city: "HYDERABAD · HEAD OFFICE", n: "Kavuri Hills, Hyderabad", a: "CPR Galaxy, Plot No. 71, Kavuri Hills, GHMC, R.R. District, Hyderabad – 500033", q: "CPR Galaxy Kavuri Hills Hyderabad 500033" },
  { id: "jadcherla", city: "JADCHERLA · TELANGANA", n: "Jadcherla", a: "H. No. 14-10, Netaji Road, Badepally, Jadcherla, Mahabubnagar – 509301", q: "Garuda Vastra Silks Badepally Jadcherla" },
  { id: "jammikunta", city: "JAMMIKUNTA · TELANGANA", n: "Jammikunta", a: "H. No. 3-2-15/k/2/1/A/1, Sy. No. 661, Jammikunta, Dist. Karimnagar", q: "Garuda Vastra Silks Jammikunta Karimnagar" }
];

/* ---------- state ---------- */
const S = { weave: "All", q: "", sort: "new", finder: null, wl: new Set(), sel: P[1] };

/* ---------- utils ---------- */
const toast = (m) => { const t = $("#toast"); t.innerHTML = `<svg class="ico"><use href="#i-check"/></svg>${m}`; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2600); };
const waLink = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
const ask = p => waLink(`Hello Garuda Vastra Silks, I'm interested in the ${p.n} (${p.c}) — ref GVS-${String(p.id).padStart(3, "0")}. Is it available, and at which showroom?`);
const isOpen = () => { const h = new Date().getHours(); return h >= 10 && h < 22; };

/* ---------- weave cards ---------- */
$("#weaveGrid").innerHTML = WEAVES.map((w, i) => `
 <a href="#sarees" class="weave reveal" data-weave="${w.k}">
  <img loading="lazy" src="${w.src}" alt="${w.k} sarees" onerror="fb(this,${w.pal})">
  <div class="t"><span class="n">0${i + 1}</span><h3>${w.k}</h3><p>${w.d}</p></div>
 </a>`).join("");
$$("[data-weave]").forEach(a => a.addEventListener("click", () => { S.weave = a.dataset.weave; S.finder = null; renderFilters(); render(); }));
$$("[data-occ]").forEach(a => a.addEventListener("click", () => { S.weave = "All"; S.finder = { occasion: a.dataset.occ }; renderFilters(); render(); }));

/* ---------- catalogue ---------- */
function renderFilters() {
  const ws = ["All", "Kanchipuram", "Banarasi", "Soft Silk", "Handloom", "Contemporary"];
  let h = ws.map(w => `<button class="chip ${S.weave === w ? "on" : ""}" data-w="${w}">${w}</button>`).join("");
  if (S.finder) h += `<button class="chip on" data-clear style="background:var(--gold);border-color:var(--gold)">Finder: ${Object.values(S.finder).filter(Boolean).join(" · ")} ✕</button>`;
  $("#weaveFilter").innerHTML = h;
  $$("#weaveFilter [data-w]").forEach(b => b.onclick = () => { S.weave = b.dataset.w; renderFilters(); render(); });
  const c = $("#weaveFilter [data-clear]"); if (c) c.onclick = () => { S.finder = null; renderFilters(); render(); };
}
const BUD = { "Under ₹5k": [0, 5000], "₹5k–15k": [5000, 15000], "₹15k–30k": [15000, 30000], "₹30k+": [30000, 1e9] };
function list() {
  let r = P.filter(p => (S.weave === "All" || p.w === S.weave));
  if (S.q) { const q = S.q.toLowerCase(); r = r.filter(p => (p.n + p.c + p.w + p.o + p.col).toLowerCase().includes(q)); }
  if (S.finder) {
    const f = S.finder;
    if (f.occasion) r = r.filter(p => p.o === f.occasion);
    if (f.budget) { const [a, b] = BUD[f.budget]; r = r.filter(p => p.pr >= a && p.pr < b); }
    if (f.colour) r = r.filter(p => p.col === f.colour);
  }
  if (S.sort === "lo") r.sort((a, b) => a.pr - b.pr); else if (S.sort === "hi") r.sort((a, b) => b.pr - a.pr);
  return r;
}
function card(p) {
  return `<article class="card">
   <div class="ph" data-qv="${p.id}"><img src="${p.img}" alt="${p.n}, ${p.c}">${p.tag ? `<span class="tag">${p.tag}</span>` : ""}
    <button class="heart ${S.wl.has(p.id) ? "on" : ""}" data-h="${p.id}" aria-label="Save ${p.n}"><svg class="ico"><use href="#i-heart"/></svg></button>
    <button class="try" data-try="${p.id}"><svg class="ico" style="width:16px;height:16px"><use href="#i-spark"/></svg>Try on me</button></div>
   <div class="body"><span class="meta">${p.w} · ${p.o}</span><h3>${p.n}</h3><span style="font-size:.84rem;color:var(--muted)">${p.c}</span>
    <div class="price"><b>${inr(p.pr)}</b>${p.mrp ? `<s>${inr(p.mrp)}</s>` : ""}</div>
    <div class="acts"><a class="btn btn-sm wa" target="_blank" rel="noopener" href="${ask(p)}"><svg class="ico" style="width:16px;height:16px"><use href="#i-wa"/></svg>Enquire</a><button class="btn btn-sm btn-line" data-qv="${p.id}">Details</button></div>
   </div></article>`;
}
function render() {
  const r = list();
  $("#grid").innerHTML = r.length ? r.map(card).join("") : `<div class="empty">No sarees match yet — <a href="${waLink("Hello, I'm looking for a saree: " + JSON.stringify(S.finder || S.q))}" style="color:var(--maroon);font-weight:600">ask our team on WhatsApp</a> and we'll check the shelves for you.</div>`;
}
$("#grid").addEventListener("click", e => {
  const h = e.target.closest("[data-h]"), t = e.target.closest("[data-try]"), q = e.target.closest("[data-qv]");
  if (h) { e.stopPropagation(); toggleWl(+h.dataset.h); h.classList.toggle("on", S.wl.has(+h.dataset.h)); return; }
  if (t) { e.stopPropagation(); tryOn(+t.dataset.try); return; }
  if (q) openQV(+q.dataset.qv);
});
$("#q").addEventListener("input", e => { S.q = e.target.value; render(); });
$("#sort").addEventListener("change", e => { S.sort = e.target.value; render(); });

/* ---------- finder ---------- */
const FQ = { occasion: ["Wedding", "Festive", "Celebration", "Everyday"], budget: Object.keys(BUD), colour: ["Red", "Green", "Blue", "Yellow", "Pink", "Pastel"] };
const COLHEX = { Red: "#8e1b22", Green: "#1f7a6b", Blue: "#1c2f6e", Yellow: "#d39b22", Pink: "#c2185b", Pastel: "#f0d5c8" };
const fsel = {};
$$(".finder [data-q]").forEach(box => {
  const k = box.dataset.q;
  box.innerHTML = FQ[k].map(v => k === "colour" ? `<button class="chip swatch-chip" style="background:${COLHEX[v]}" data-v="${v}" title="${v}" aria-label="${v}"></button>` : `<button class="chip" data-v="${v}">${v}</button>`).join("");
  box.onclick = e => { const b = e.target.closest("[data-v]"); if (!b) return; const on = !b.classList.contains("on"); $$("[data-v]", box).forEach(x => x.classList.remove("on")); if (on) b.classList.add("on"); fsel[k] = on ? b.dataset.v : null; };
});
$("#findBtn").onclick = () => {
  S.finder = { ...fsel }; S.weave = "All"; S.q = ""; $("#q").value = "";
  if (!Object.values(S.finder).some(Boolean)) S.finder = null;
  renderFilters(); render(); const n = list().length;
  $("#sarees").scrollIntoView(); toast(n ? `${n} saree${n > 1 ? "s" : ""} picked for you` : "No exact match — try a wider budget");
};

/* ---------- wishlist ---------- */
function toggleWl(id) {
  S.wl.has(id) ? S.wl.delete(id) : (S.wl.add(id), toast("Saved to your wishlist"));
  $("#wlCount").textContent = S.wl.size; $("#wlCount2").textContent = S.wl.size; renderWl();
}
function renderWl() {
  const items = P.filter(p => S.wl.has(p.id));
  $("#wlBody").innerHTML = items.length ? items.map(p => `<div class="wl-item"><img src="${p.img}" alt=""><div><b>${p.n}</b><small style="color:var(--muted)">${p.c}</small><br><span>${inr(p.pr)}</span></div><button class="tool" data-rm="${p.id}" aria-label="Remove"><svg class="ico"><use href="#i-x"/></svg></button></div>`).join("")
    : `<p style="color:var(--muted);padding:30px 0;text-align:center">Tap the ♡ on any saree to save it here.<br>Share the list with family — or send it to the store so we keep them ready.</p>`;
}
$("#wlBody").onclick = e => { const b = e.target.closest("[data-rm]"); if (b) { toggleWl(+b.dataset.rm); render(); } };
$("#wlSend").onclick = () => { const items = P.filter(p => S.wl.has(p.id)); if (!items.length) return toast("Your wishlist is empty"); window.open(waLink("Hello Garuda Vastra Silks, please keep these ready for me:\n" + items.map(p => `• ${p.n} – ${p.c} (GVS-${String(p.id).padStart(3, "0")})`).join("\n")), "_blank"); };

/* ---------- overlays ---------- */
const scrim = $("#scrim");
const openO = el => { el.classList.add("on"); scrim.classList.add("on"); };
const closeAll = () => { $$(".drawer,.modal,.searchbox,.mnav").forEach(x => x.classList.remove("on")); scrim.classList.remove("on"); };
scrim.onclick = closeAll; document.addEventListener("keydown", e => e.key === "Escape" && closeAll());
$$("[data-close]").forEach(b => b.onclick = closeAll);
$("#openWl").onclick = $("#bWl").onclick = () => { renderWl(); openO($("#wl")); };
$("#openSearch").onclick = () => { openO($("#sb")); setTimeout(() => $("#sbq").focus(), 200); };
$("#burger").onclick = () => $("#mnav").classList.add("on");
$("#closeM").onclick = closeAll; $$("#mnav a").forEach(a => a.onclick = closeAll);
$("#qv").onclick = e => { if (e.target.id === "qv") closeAll(); };
$("#sbq").addEventListener("input", e => {
  const q = e.target.value.toLowerCase().trim();
  $("#sres").innerHTML = q ? P.filter(p => (p.n + p.c + p.w + p.o).toLowerCase().includes(q)).map(p => `<button class="chip" data-qv="${p.id}">${p.n} · ${p.c}</button>`).join("") || `<span style="color:var(--muted)">No results — try “silk”, “red” or “wedding”.</span>` : "";
});
$("#sres").onclick = e => { const b = e.target.closest("[data-qv]"); if (b) { closeAll(); openQV(+b.dataset.qv); } };
function openQV(id) {
  const p = P.find(x => x.id === id);
  $("#qvBox").innerHTML = `<button class="x" data-close aria-label="Close"><svg class="ico"><use href="#i-x"/></svg></button>
   <img src="${sareeArt(p.pal, 900, 1100)}" alt="${p.n}">
   <div class="info"><span class="eyebrow">${p.w} · GVS-${String(p.id).padStart(3, "0")}</span><h2 style="font-size:2rem">${p.n}</h2><p style="color:var(--muted)">${p.c}</p>
    <div class="price"><b style="font-size:1.5rem">${inr(p.pr)}</b>${p.mrp ? `<s>${inr(p.mrp)}</s>` : ""}</div>
    <dl class="spec"><dt>Weave</dt><dd>${p.w}</dd><dt>Best for</dt><dd>${p.o}</dd><dt>Length</dt><dd>6.3 m with blouse piece</dd><dt>Care</dt><dd>Dry clean recommended</dd><dt>Available at</dt><dd>${STORES.map(s => s.n.split(" (")[0]).join(", ")}</dd></dl>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:auto">
     <button class="btn btn-gold" data-try="${p.id}"><svg class="ico"><use href="#i-spark"/></svg>Try on me</button>
     <a class="btn wa" target="_blank" rel="noopener" href="${ask(p)}"><svg class="ico"><use href="#i-wa"/></svg>Enquire</a>
     <button class="btn btn-line" data-h="${p.id}">${S.wl.has(p.id) ? "♥ Saved" : "♡ Save"}</button>
     <button class="btn btn-line" data-share="${p.id}"><svg class="ico"><use href="#i-share"/></svg>Share</button>
    </div></div>`;
  openO($("#qv"));
  $("#qvBox [data-close]").onclick = closeAll;
  $("#qvBox [data-try]").onclick = () => { closeAll(); tryOn(p.id); };
  $("#qvBox [data-share]").onclick = async () => {
    const text = `${p.n} (${p.c}) — ${inr(p.pr)} at Garuda Vastra Silks`;
    try { if (navigator.share) await navigator.share({ title: "Garuda Vastra Silks", text, url: location.href.split("#")[0] }); else window.open(waLink(text + " " + location.href.split("#")[0]), "_blank"); } catch (e) {}
  };
  $("#qvBox [data-h]").onclick = e => { toggleWl(p.id); e.target.textContent = S.wl.has(p.id) ? "♥ Saved" : "♡ Save"; render(); };
}

/* ---------- stores ---------- */
function renderStores() {
  const open = isOpen();
  $("#storeGrid").innerHTML = STORES.map(s => `<div class="store ${s.isNew ? "hl" : ""}">
   ${s.isNew ? `<span class="new">NEW · NOW OPEN</span>` : ""}<span class="city">${s.city}</span><h3>${s.n}</h3><p class="addr">${s.a}</p>
   <span class="hrs"><svg class="ico" style="width:16px;height:16px"><use href="#i-clock"/></svg><span class="${open ? "open" : ""}">${open ? "Open now" : "Closed"}</span> · 10 AM – 10 PM</span>
   <div class="acts"><a class="btn btn-sm ${s.isNew ? "btn-gold" : "btn-maroon"}" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.q)}"><svg class="ico" style="width:16px;height:16px"><use href="#i-pin"/></svg>Directions</a><a class="btn btn-sm btn-line" href="tel:+${WA}"><svg class="ico" style="width:16px;height:16px"><use href="#i-phone"/></svg>Call</a></div>
  </div>`).join("");
  $("#bs").innerHTML = STORES.map(s => `<option>${s.n}</option>`).join("");
  $("#heroOpen").textContent = (open ? "OPEN NOW" : "OPENS 10 AM") + " · BHUVANAGIRI";
}

/* ---------- booking ---------- */
let mode = "In-store visit";
$("#mode").onclick = e => { const b = e.target.closest("button"); if (!b) return; $$("#mode button").forEach(x => x.classList.remove("on")); b.classList.add("on"); mode = b.dataset.v; };
const d = new Date(); d.setDate(d.getDate() + 1); $("#bd").min = d.toISOString().slice(0, 10);
$("#bookForm").onsubmit = e => {
  e.preventDefault();
  const wl = P.filter(p => S.wl.has(p.id)).map(p => p.n).join(", ");
  const msg = `Appointment request — Garuda Vastra Silks\nName: ${$("#bn").value}\nPhone: ${$("#bp").value}\nType: ${mode}\nShowroom: ${$("#bs").value}\nDate: ${$("#bd").value}\nOccasion: ${$("#bo").value}\nBudget: ${$("#bb").value}${$("#bnote").value ? "\nNote: " + $("#bnote").value : ""}${wl ? "\nWishlist: " + wl : ""}`;
  window.open(waLink(msg), "_blank"); toast("Request ready — send it on WhatsApp to confirm"); e.target.reset();
};
$("#upForm").onsubmit = e => { e.preventDefault(); toast("You're on the list for festival offers"); e.target.reset(); };

/* ---------- virtual try-on ---------- */
const cv = $("#cv"), ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
const bgC = document.createElement("canvas"); bgC.width = W; bgC.height = H; const bx = bgC.getContext("2d");
const dC = document.createElement("canvas"); dC.width = W; dC.height = H; const dx = dC.getContext("2d");
const mC = document.createElement("canvas"); mC.width = W; mC.height = H; const mx = mC.getContext("2d");
const T = { cx: W / 2, ty: H * .17, size: 1, len: 1, rot: 0, shade: true, pallu: true, photo: null, compare: false };

function drawMannequin() {
  const g = bx.createRadialGradient(W / 2, H * .35, 50, W / 2, H * .5, H * .8); g.addColorStop(0, "#f6efe2"); g.addColorStop(1, "#d9cbb2");
  bx.fillStyle = g; bx.fillRect(0, 0, W, H);
  bx.fillStyle = "rgba(154,120,60,.12)"; for (let i = 0; i < 9; i++) bx.fillRect(i * 110 + 20, 0, 2, H);
  bx.save(); bx.translate(W / 2, 0);
  const sk = bx.createLinearGradient(-200, 0, 200, 0); sk.addColorStop(0, "#9c7a5c"); sk.addColorStop(.5, "#c8a27f"); sk.addColorStop(1, "#8f6e52");
  bx.fillStyle = sk;
  bx.beginPath(); bx.ellipse(0, H * .1, 52, 66, 0, 0, 7); bx.fill(); // head
  bx.fillRect(-22, H * .14, 44, 50); // neck
  bx.beginPath(); bx.moveTo(-150, H * .2); bx.quadraticCurveTo(0, H * .17, 150, H * .2); // shoulders
  bx.lineTo(178, H * .5); bx.lineTo(150, H * .51); bx.lineTo(118, H * .27); bx.lineTo(110, H * .38);
  bx.lineTo(-110, H * .38); bx.lineTo(-118, H * .27); bx.lineTo(-150, H * .51); bx.lineTo(-178, H * .5); bx.closePath(); bx.fill();
  bx.fillStyle = "#5b1b25"; bx.beginPath(); bx.moveTo(-142, H * .205); bx.quadraticCurveTo(0, H * .175, 142, H * .205); bx.lineTo(120, H * .3); bx.lineTo(112, H * .37); bx.lineTo(-112, H * .37); bx.lineTo(-120, H * .3); bx.closePath(); bx.fill(); // blouse
  bx.fillStyle = sk; bx.fillRect(-110, H * .37, 220, 34);
  bx.fillStyle = "#3a2a20"; bx.fillRect(-60, H * .985, 120, 14);
  bx.restore();
}
function drawPhoto(img) {
  bx.fillStyle = "#1a1311"; bx.fillRect(0, 0, W, H);
  const r = Math.max(W / img.width, H / img.height);
  bx.filter = "blur(30px) brightness(.6)"; bx.drawImage(img, (W - img.width * r) / 2, (H - img.height * r) / 2, img.width * r, img.height * r); bx.filter = "none";
  const s = Math.min(W / img.width, H / img.height);
  bx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
}
// shapes in unit space: x in [-.5,.5]*w, y in [0,1]*h
function shapes(x, w, h, kind) {
  const P_ = (u, v) => [(u - .5) * w, v * h];
  const poly = pts => { x.beginPath(); pts.forEach((p, i) => { const [a, b] = P_(...p); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.closePath(); };
  if (kind === "skirt") {
    x.beginPath(); let [a, b] = P_(.3, .37); x.moveTo(a, b); [a, b] = P_(.7, .37); x.lineTo(a, b);
    let c = P_(.76, .7); [a, b] = P_(.8, .985); x.quadraticCurveTo(c[0], c[1], a, b);
    c = P_(.5, 1.01); [a, b] = P_(.2, .985); x.quadraticCurveTo(c[0], c[1], a, b);
    c = P_(.24, .7); [a, b] = P_(.3, .37); x.quadraticCurveTo(c[0], c[1], a, b); x.closePath();
  } else if (kind === "pleats") poly([[.41, .39], [.57, .39], [.62, 1.0], [.37, 1.0]]);
  else if (kind === "chest") poly([[.56, .03], [.72, .015], [.73, .13], [.42, .41], [.27, .39], [.29, .33]]);
  else if (kind === "hang") poly([[.71, .02], [.83, .05], [.9, .63], [.77, .65], [.74, .14]]);
}
function drape(x, solid) {
  const p = PAL[S.sel.pal], w = 380 * T.size, h = 880 * T.size * T.len;
  x.save(); x.translate(T.cx, T.ty); x.rotate(T.rot * Math.PI / 180);
  const fillShape = (k, style) => { shapes(x, w, h, k); x.fillStyle = style; x.fill(); };
  if (solid) { ["skirt", "pleats"].concat(T.pallu ? ["hang", "chest"] : []).forEach(k => fillShape(k, "#000")); x.restore(); return; }
  const pat = x.createPattern(tile(p, .9), "repeat");
  const bpat = x.createPattern(borderTile(p, h * .06), "repeat-x");
  const band = (k, y0, y1) => { x.save(); shapes(x, w, h, k); x.clip(); x.translate(-w, y0 * h); x.fillStyle = bpat; x.fillRect(0, 0, w * 2, (y1 - y0) * h); x.restore(); };
  // pallu hanging behind (drawn first)
  if (T.pallu) {
    fillShape("hang", p.br === p.b ? p.d : p.br);
    x.save(); shapes(x, w, h, "hang"); x.clip();
    for (let s = 0; s < 7; s++) { x.fillStyle = s % 2 ? p.z : "rgba(255,240,200,.55)"; x.fillRect(-w, h * (.44 + s * .028), w * 2, h * .011); }
    x.fillStyle = p.z; for (let r = 0; r < 4; r++) { x.beginPath(); x.arc((.79 + r * .02 - .5) * w, h * (.2 + r * .06), w * .022, 0, 7); x.fill(); }
    x.restore();
    x.strokeStyle = p.z; x.lineWidth = 2; for (let t = 0; t < 9; t++) { const [a, b] = [(.775 + t * .014 - .5) * w, h * .645]; x.beginPath(); x.moveTo(a, b); x.lineTo(a + 1, b + h * .03); x.stroke(); } // tassels
  }
  fillShape("skirt", pat);
  band("skirt", .925, 1.02);
  // pleats
  x.save(); shapes(x, w, h, "pleats"); x.clip(); x.fillStyle = pat; x.fill();
  for (let i = 0; i < 9; i++) { const u = .37 + i * .028; const g = x.createLinearGradient((u - .5) * w, 0, (u + .028 - .5) * w, 0); g.addColorStop(0, "rgba(0,0,0,.28)"); g.addColorStop(.5, "rgba(255,255,255,.12)"); g.addColorStop(1, "rgba(0,0,0,.05)"); x.fillStyle = g; x.fillRect((u - .5) * w, .37 * h, .03 * w, .65 * h); }
  x.translate(-w, .925 * h); x.fillStyle = bpat; x.fillRect(0, 0, w * 2, .08 * h); x.restore();
  if (T.pallu) {
    fillShape("chest", pat);
    // zari edges along chest pallu
    x.strokeStyle = p.z; x.lineWidth = w * .028; x.lineCap = "round";
    const ln = (a, b) => { x.beginPath(); x.moveTo((a[0] - .5) * w, a[1] * h); x.lineTo((b[0] - .5) * w, b[1] * h); x.stroke(); };
    ln([.72, .025], [.28, .385]); x.strokeStyle = p.br; x.lineWidth = w * .012; ln([.715, .03], [.285, .38]);
    x.strokeStyle = p.z; x.lineWidth = w * .02; ln([.73, .125], [.43, .405]);
  }
  // fabric folds
  shapes(x, w, h, "skirt"); x.save(); x.clip();
  const g = x.createLinearGradient(-w * .3, 0, w * .3, 0); g.addColorStop(0, "rgba(0,0,0,.3)"); g.addColorStop(.3, "rgba(255,255,255,.08)"); g.addColorStop(.7, "rgba(0,0,0,.05)"); g.addColorStop(1, "rgba(0,0,0,.32)");
  x.fillStyle = g; x.fillRect(-w, 0, w * 2, h); x.restore();
  x.restore();
}
function paint() {
  ctx.clearRect(0, 0, W, H); ctx.drawImage(bgC, 0, 0);
  if (T.compare) return;
  dx.clearRect(0, 0, W, H); drape(dx, false);
  if (T.shade && T.photo) { dx.globalCompositeOperation = "soft-light"; dx.globalAlpha = .6; dx.drawImage(bgC, 0, 0); dx.globalAlpha = 1; mx.clearRect(0, 0, W, H); drape(mx, true); dx.globalCompositeOperation = "destination-in"; dx.drawImage(mC, 0, 0); dx.globalCompositeOperation = "source-over"; }
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,.35)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8; ctx.drawImage(dC, 0, 0); ctx.restore();
  ctx.fillStyle = "rgba(18,13,11,.72)"; ctx.fillRect(0, H - 64, W, 64);
  ctx.fillStyle = "#e9d3a0"; ctx.font = "500 22px 'Playfair Display', serif"; ctx.fillText(`${S.sel.n} · ${S.sel.c}`, 24, H - 26);
  ctx.textAlign = "right"; ctx.font = "500 16px 'IBM Plex Mono', monospace"; ctx.fillText("GARUDA VASTRA SILKS", W - 24, H - 28); ctx.textAlign = "start";
}
function renderPick() {
  $("#pick").innerHTML = P.map(p => `<button class="${p.id === S.sel.id ? "on" : ""}" data-p="${p.id}" title="${p.n} – ${p.c}" aria-label="${p.n} ${p.c}"><img src="${sareeArt(p.pal, 160, 160)}" alt=""></button>`).join("");
  $("#selName").innerHTML = `${S.sel.n} <span style="color:var(--maroon);font-size:1rem">· ${inr(S.sel.pr)}</span><div style="font-family:var(--sans);font-size:.82rem;color:var(--muted)">${S.sel.c}</div>`;
}
$("#pick").onclick = e => { const b = e.target.closest("[data-p]"); if (!b) return; S.sel = P.find(p => p.id === +b.dataset.p); renderPick(); paint(); $("#s2").classList.add("on"); };
function tryOn(id) { S.sel = P.find(p => p.id === id); renderPick(); paint(); $("#tryon").scrollIntoView(); $("#s2").classList.add("on"); }
const rng = (id, out, fn, fmt) => $(id).addEventListener("input", e => { fn(+e.target.value); $(out).textContent = fmt(+e.target.value); paint(); });
rng("#rSize", "#oSize", v => T.size = v / 100, v => v + "%");
rng("#rLen", "#oLen", v => T.len = v / 100, v => v + "%");
rng("#rRot", "#oRot", v => T.rot = v, v => v + "°");
$("#shade").onchange = e => { T.shade = e.target.checked; paint(); };
$("#pallu").onchange = e => { T.pallu = e.target.checked; paint(); };
let drag = null; const ptrs = new Map(); let pinch = null;
const pt = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; };
const dist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a[0] - b[0], a[1] - b[1]); };
cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, pt(e));
  if (ptrs.size === 2) { pinch = { d: dist(), s: T.size }; drag = null; } else { const [a, b] = pt(e); drag = [a - T.cx, b - T.ty]; } });
cv.addEventListener("pointermove", e => { if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, pt(e));
  if (pinch && ptrs.size === 2) { T.size = Math.min(1.6, Math.max(.4, pinch.s * dist() / pinch.d)); $("#rSize").value = Math.round(T.size * 100); $("#oSize").textContent = Math.round(T.size * 100) + "%"; paint(); return; }
  if (!drag) return; const [a, b] = pt(e); T.cx = a - drag[0]; T.ty = b - drag[1]; paint(); });
const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (!ptrs.size) drag = null; };
cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
const cmp = $("#compare");
["pointerdown"].forEach(ev => cmp.addEventListener(ev, () => { T.compare = true; paint(); }));
["pointerup", "pointerleave"].forEach(ev => cmp.addEventListener(ev, () => { T.compare = false; paint(); }));
function loadFile(f) {
  if (!f || !f.type.startsWith("image/")) return;
  const img = new Image(); img.onload = () => { T.photo = img; drawPhoto(img); T.cx = W / 2; T.ty = H * .2; paint(); $("#s1").classList.add("on"); toast("Photo added — drag the drape to fit"); };
  img.src = URL.createObjectURL(f);
}
$("#file").onchange = e => loadFile(e.target.files[0]);
const drop = $("#drop");
["dragover", "dragenter"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
drop.addEventListener("drop", e => loadFile(e.dataTransfer.files[0]));
$("#dl").onclick = () => { const a = document.createElement("a"); a.download = `garuda-look-${S.sel.id}.jpg`; a.href = cv.toDataURL("image/jpeg", .92); a.click(); $("#s3").classList.add("on"); toast("Look saved to your device"); };
$("#shareLook").onclick = () => { window.open(waLink(`Hello Garuda Vastra Silks, I tried on the ${S.sel.n} (${S.sel.c}, GVS-${String(S.sel.id).padStart(3, "0")}) using your Virtual Try-On. Please reserve it for me — I'd like to see it in store.`), "_blank"); $("#s3").classList.add("on"); };

/* ---------- Telugu ---------- */
const TE = {
  ann: "✦ <b>ఇప్పుడు భువనగిరిలో ప్రారంభం</b> — మెడికుంటపల్లి ప్రభుత్వ జూనియర్ కళాశాల పక్కన మా కొత్త షోరూమ్‌ను సందర్శించండి",
  nSarees: "చీరలు", nFamily: "మహిళలు · పురుషులు · పిల్లలు", nTry: "వర్చువల్ ట్రై-ఆన్", nBridal: "పెళ్లి అపాయింట్‌మెంట్", nStores: "మా షోరూమ్‌లు",
  heroEy: "చీరలు · మహిళలు · పురుషులు · పిల్లలు", heroH: "జీవితంలోని <em>అందమైన</em> క్షణాల కోసం నేసినవి",
  heroP: "కాంచీపురం పట్టు, బనారసీ, రోజువారీ కాటన్ చీరలు — షాప్‌కి రాకముందే చీర మీకు ఎలా ఉంటుందో చూడండి. వర్చువల్‌గా ట్రై చేయండి, నచ్చినవి సేవ్ చేయండి, వాట్సాప్‌లో ఒక్క టచ్‌తో అడగండి.",
  ctaTry: "చీర మీపై ట్రై చేయండి", ctaShop: "చీరలు చూడండి", st1: "తెలంగాణలో షోరూమ్‌లు", st2: "ప్రతిరోజూ తెరిచి ఉంటుంది", st3: "వాట్సాప్ విచారణ",
  hcH: "మా కొత్త షోరూమ్", hcP: "మూడు అంతస్తుల పట్టు చీరలు, కుటుంబ దుస్తులు — భువనగిరి.", dir: "దారి చూపు", more: "మరింత", call: "కాల్",
  p1: "వర్చువల్ ట్రై-ఆన్", p1s: "మీ ఫోటోపై చీర చూడండి", p2: "వీడియో కాల్ షాపింగ్", p2s: "ఇంటి నుండే చూడండి", p3: "షాప్‌లో చీర కట్టే సహాయం", p3s: "మా టీమ్ కట్టి చూపిస్తుంది", p4: "వాట్సాప్ విచారణ", p4s: "నిమిషాల్లో ధర & స్టాక్",
  wEy: "01 — చీరల గది", wH: "నేత ప్రకారం చూడండి", wP: "చీరలే మా మొదటి ప్రేమ. మేము పేరుపొందిన నేతలతో ప్రారంభించండి.",
  fEy: "చీర ఫైండర్", fH: "ఎక్కడ మొదలుపెట్టాలో తెలియదా? <em>మేము సహాయం చేస్తాం.</em>", fP: "మూడు చిన్న ప్రశ్నలకు సమాధానం ఇవ్వండి — మీకు సరిపడే చీరలు చూపిస్తాం.", fBtn: "నా చీరలు చూపించు",
  q1: "1 · సందర్భం", q2: "2 · మీ బడ్జెట్", q3: "3 · మీకు ఇష్టమైన రంగు",
  cEy: "02 — కొత్తగా వచ్చినవి", cH: "చీరల కలెక్షన్", cP: "ప్రతి చీరకు ఫోటో, వివరాలు, ధర — ♡ నొక్కి సేవ్ చేయండి, “ట్రై ఆన్” తో మీపై చూడండి.",
  tEy: "03 — కొత్తది · వర్చువల్ ట్రై-ఆన్", tH: "షాప్‌కి రాకముందే మీపై చూడండి", tP: "మీ పూర్తి ఫోటో అప్‌లోడ్ చేసి, చీర ఎంచుకోండి. లుక్ సేవ్ చేసి కుటుంబంతో షేర్ చేయండి.",
  drag: "చీరను జరపడానికి డ్రాగ్ చేయండి", hold: "పోల్చడానికి నొక్కి పట్టండి", s1: "1. మీ ఫోటో", s1s: "పూర్తి ఫోటో, ముందు వైపు", s2: "2. చీర ఎంచుకోండి", s2s: "మా కలెక్షన్ నుండి", s3: "3. సేవ్ & షేర్", s3s: "వాట్సాప్‌లో కుటుంబంతో",
  up: "మీ ఫోటో అప్‌లోడ్ చేయండి", ups: "ఫోటో మీ ఫోన్‌లోనే ఉంటుంది, ఎక్కడికీ పంపబడదు", choose: "చీర ఎంచుకోండి", adjust: "సర్దుబాటు", size: "సైజు", height: "పొడవు", tilt: "వంపు",
  shade: "ఫోటో వెలుతురుతో కలపండి", palluT: "భుజంపై పల్లు చూపించు", save: "నా లుక్ సేవ్ చేయి", reserve: "ఈ చీర రిజర్వ్ చేయి",
  oEy: "04 — సందర్భాలు", oH: "ప్రతి సందర్భానికి", oP: "పెళ్లి మండపం నుండి రోజువారీ కట్టు వరకు — కుటుంబమంతటికీ ఒకే చోట.", o1: "పెళ్లిళ్లు", o2: "పండుగలు", o3: "వేడుకలు", o4: "రోజువారీ అందం", o5: "బ్రైడల్ అటెలియర్",
  dEy: "05 — విభాగాలు", dH: "కుటుంబమంతటికీ కలెక్షన్లు", d1: "మహిళలు", d2: "పురుషులు", d3: "పిల్లలు",
  spEy: "ఇప్పుడు ప్రారంభం · భువనగిరి", spH: "భువనగిరిలో పట్టుకు కొత్త ఇల్లు", spP: "మా కొత్త షోరూమ్ పూర్తి చీరల గదిని — పురుషులు, పిల్లల కలెక్షన్లను — భువనగిరికి తీసుకువచ్చింది.", hrs: "ప్రతిరోజూ ఉదయం 10 – రాత్రి 10", spOffer: "ప్రారంభ ఆఫర్లు — వాట్సాప్‌లో అడగండి",
  stEy: "06 — మా షోరూమ్‌లు", stH: "తెలంగాణ అంతటా మమ్మల్ని కనుగొనండి", stP: "ప్రతి షోరూమ్‌కు దారి, సమయాలు, ప్రత్యక్ష ఓపెన్/క్లోజ్ స్థితి.",
  bkEy: "07 — అపాయింట్‌మెంట్", bkH: "పెళ్లి లేదా కుటుంబ అపాయింట్‌మెంట్ బుక్ చేయండి", bkP: "సందర్భం చెప్పండి — మీ కోసం ఎంపిక చేసిన చీరలు సిద్ధంగా ఉంచుతాం.", bkL: "బ్రైడల్ అటెలియర్", bkMode: "ఎలా షాపింగ్ చేయాలనుకుంటున్నారు?", m1: "షాప్‌లో", m2: "వీడియో కాల్",
  fName: "మీ పేరు", fPhone: "ఫోన్ / వాట్సాప్", fStore: "షోరూమ్", fDate: "తేదీ", fOcc: "సందర్భం", fBud: "ఒక్కో చీర బడ్జెట్", fNote: "ఇంకేమైనా?", bkBtn: "అపాయింట్‌మెంట్ అభ్యర్థించండి",
  cgEy: "08 — చీర సంరక్షణ", cgH: "తరతరాలు నిలిచేలా మీ పట్టును కాపాడండి", drEy: "కట్టు విధానాలు", drH: "ఇవన్నీ మా టీమ్ కట్టి చూపిస్తుంది",
  upH: "పండుగ ఆఫర్లు ముందుగా మీకే", upP: "కొత్త చీరలు, ఆఫర్లు వాట్సాప్‌లో పొందండి.", join: "చేరండి", wlH: "మీ విష్‌లిస్ట్", wlSend: "లిస్ట్ షాప్‌కి వాట్సాప్ చేయండి",
  bHome: "హోమ్", bTry: "ట్రై-ఆన్", bSaved: "సేవ్", bStores: "షోరూమ్‌లు",
  fAbout: "తెలంగాణ అంతటా కుటుంబ వస్త్ర దుకాణం — చీరలే మా హృదయం."
};
const EN = {};
$$("[data-i18n],[data-i18n-html]").forEach(el => { const k = el.dataset.i18n || el.dataset.i18nHtml; EN[k + "|" + (el.dataset.i18nHtml ? "h" : "t")] = el.innerHTML; });
function setLang(l) {
  document.body.classList.toggle("te", l === "te"); document.documentElement.lang = l;
  $$(".lang button").forEach(b => b.classList.toggle("on", b.dataset.lang === l));
  $$("[data-i18n],[data-i18n-html]").forEach(el => {
    const k = el.dataset.i18n || el.dataset.i18nHtml, key = k + "|" + (el.dataset.i18nHtml ? "h" : "t");
    el.innerHTML = l === "te" && TE[k] ? TE[k] : EN[key];
  });
}
$$(".lang button").forEach(b => b.onclick = () => setLang(b.dataset.lang));

/* ---------- reveal ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
$$(".reveal").forEach(el => io.observe(el));

/* ---------- bottom nav active state ---------- */
const secs = ["sarees", "tryon", "stores"].map(id => document.getElementById(id));
addEventListener("scroll", () => {
  let cur = "top"; secs.forEach(s => { if (s.getBoundingClientRect().top < innerHeight * .4) cur = s.id; });
  if (cur === "stores" && $("#stores").getBoundingClientRect().bottom < 0) cur = "top-x";
  $$(".bnav a").forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + cur));
}, { passive: true });

/* ---------- init ---------- */
renderFilters(); render(); renderStores(); renderPick(); drawMannequin();
document.fonts && document.fonts.ready.then(paint); paint();
setInterval(renderStores, 60000);
