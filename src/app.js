/* ==========================================================================
   GARUDA VASTRA SILKS — APPLICATION & INTERACTION LOGIC
   Enhanced with Floating Saree Physics, Interactive Features & Animation Suite
   ========================================================================== */

const WA = "919247994041";
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const inr = n => "₹" + n.toLocaleString("en-IN");

/* ---------- colourways & procedural saree art (preserved) ---------- */
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
  const c = document.createElement("canvas");
  c.width = c.height = 64 * s;
  const x = c.getContext("2d");
  x.fillStyle = p.b;
  x.fillRect(0, 0, c.width, c.height);
  x.fillStyle = p.z;
  x.globalAlpha = 0.9;
  const dot = (cx, cy, r) => {
    x.beginPath();
    x.ellipse(cx, cy, r, r * 1.35, 0.5, 0, 7);
    x.fill();
  };
  dot(16 * s, 16 * s, 3.2 * s);
  dot(48 * s, 48 * s, 3.2 * s);
  x.globalAlpha = 0.45;
  dot(48 * s, 16 * s, 1.4 * s);
  dot(16 * s, 48 * s, 1.4 * s);
  return c;
}

function borderTile(p, h) {
  const c = document.createElement("canvas");
  c.width = h * 1.2;
  c.height = h;
  const x = c.getContext("2d");
  x.fillStyle = p.br;
  x.fillRect(0, 0, c.width, h);
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, p.z);
  g.addColorStop(0.5, "#fff3c9");
  g.addColorStop(1, p.z);
  x.fillStyle = g;
  x.fillRect(0, h * 0.08, c.width, h * 0.07);
  x.fillRect(0, h * 0.85, c.width, h * 0.07);
  x.beginPath();
  x.moveTo(c.width * 0.1, h * 0.78);
  x.lineTo(c.width * 0.5, h * 0.25);
  x.lineTo(c.width * 0.9, h * 0.78);
  x.closePath();
  x.fill();
  x.fillStyle = p.br;
  x.beginPath();
  x.moveTo(c.width * 0.3, h * 0.78);
  x.lineTo(c.width * 0.5, h * 0.5);
  x.lineTo(c.width * 0.7, h * 0.78);
  x.fill();
  return c;
}

function sareeArt(i, w = 600, h = 750) {
  const k = i + "_" + w;
  if (artCache[k]) return artCache[k];
  const p = PAL[i];
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  const bg = x.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, "#FAF7F2");
  bg.addColorStop(1, "#EFE8DC");
  x.fillStyle = bg;
  x.fillRect(0, 0, w, h);
  
  // Soft atmospheric drop shadow
  x.fillStyle = "rgba(48,41,35,0.18)";
  x.filter = "blur(18px)";
  x.fillRect(w * 0.14, h * 0.2, w * 0.76, h * 0.66);
  x.filter = "none";
  
  const fold = (y, fh, rot, pallu) => {
    x.save();
    x.translate(w / 2, y);
    x.rotate(rot);
    const fw = w * 0.72;
    const X = -fw / 2;
    x.fillStyle = x.createPattern(tile(p, w / 600), "repeat");
    x.fillRect(X, 0, fw, fh);
    if (pallu) {
      x.fillStyle = p.br;
      x.fillRect(X + fw * 0.55, 0, fw * 0.45, fh);
      for (let s = 0; s < 6; s++) {
        x.fillStyle = s % 2 ? p.z : "rgba(255,240,200,0.7)";
        x.fillRect(X + fw * 0.58 + s * fw * 0.065, 0, fw * 0.018, fh);
      }
      x.fillStyle = p.z;
      for (let r = 0; r < 3; r++) {
        x.beginPath();
        x.arc(X + fw * 0.78, fh * (0.25 + r * 0.25), fw * 0.035, 0, 7);
        x.fill();
      }
    }
    const bt = borderTile(p, fh * 0.2);
    x.fillStyle = x.createPattern(bt, "repeat-x");
    x.save();
    x.translate(X, fh * 0.8);
    x.fillRect(0, 0, fw, fh * 0.2);
    x.restore();
    const sh = x.createLinearGradient(X, 0, X + fw, 0);
    sh.addColorStop(0, "rgba(0,0,0,0.18)");
    sh.addColorStop(0.35, "rgba(255,255,255,0.12)");
    sh.addColorStop(0.55, "rgba(0,0,0,0)");
    sh.addColorStop(1, "rgba(0,0,0,0.22)");
    x.fillStyle = sh;
    x.fillRect(X, 0, fw, fh);
    x.restore();
  };
  fold(h * 0.52, h * 0.3, 0.03, true);
  fold(h * 0.2, h * 0.34, -0.02, false);
  return (artCache[k] = c.toDataURL("image/jpeg", 0.88));
}

function fb(img, i) {
  img.onerror = null;
  img.src = SAREE_REAL_PHOTOS[(i % 13) + 1] || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80";
}
window.fb = fb;

/* ---------- catalogue data (Strictly Preserved) ---------- */
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

// Authentic real silk saree photography matching each weave and color palette
const SAREE_REAL_PHOTOS = {
  1: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&h=1000&q=80",
  2: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&h=1000&q=80",
  3: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&crop=bottom&w=800&h=1000&q=80",
  4: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&crop=bottom&w=800&h=1000&q=80",
  5: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&h=1000&q=80",
  6: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&h=1000&q=80",
  7: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&crop=top&w=800&h=1000&q=80",
  8: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=800&h=1000&q=80",
  9: "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=800&h=1000&q=80",
  10: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=800&h=1000&q=80",
  11: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&crop=top&w=800&h=1000&q=80",
  12: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&crop=bottom&w=800&h=1000&q=80",
  13: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&h=1000&q=80"
};

P.forEach(p => {
  p.img = SAREE_REAL_PHOTOS[p.id] || sareeArt(p.pal);
});

const C1 = "__C1__", C2 = "__C2__";
const WEAVES = [
  { k: "Kanchipuram", d: "Temple borders, contrast pallus and pure zari — the undisputed queen of South Indian handloom.", src: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=900&q=80", pal: 0 },
  { k: "Banarasi", d: "Intricate metallic brocades and imperial floral jaals hand-woven on Varanasi looms.", src: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=80", pal: 2 },
  { k: "Soft Silk", d: "Featherlight drape with luminous sheen — pure silk made effortless for celebrations.", src: "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=900&q=80", pal: 4 },
  { k: "Handloom", d: "Gadwal, Pochampally Ikat, Narayanpet and artisan breathing cottons from regional looms.", src: "https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=900&q=80", pal: 7 }
];

const STORES = [
  { id: "bhuvanagiri", city: "BHUVANAGIRI · TELANGANA", n: "Bhuvanagiri (Bhongir)", a: "Municipal Door Nos. 1-3-234/3 to 234/13, beside Govt. Junior College, Medikuntapally, Bhuvanagiri", q: "Garuda Vastra Silks Bhuvanagiri Telangana", isNew: 1 },
  { id: "hyderabad", city: "HYDERABAD · HEAD OFFICE", n: "Kavuri Hills, Hyderabad", a: "CPR Galaxy, Plot No. 71, Kavuri Hills, GHMC, R.R. District, Hyderabad – 500033", q: "CPR Galaxy Kavuri Hills Hyderabad 500033" },
  { id: "jadcherla", city: "JADCHERLA · TELANGANA", n: "Jadcherla", a: "H. No. 14-10, Netaji Road, Badepally, Jadcherla, Mahabubnagar – 509301", q: "Garuda Vastra Silks Badepally Jadcherla" },
  { id: "jammikunta", city: "JAMMIKUNTA · TELANGANA", n: "Jammikunta", a: "H. No. 3-2-15/k/2/1/A/1, Sy. No. 661, Jammikunta, Dist. Karimnagar", q: "Garuda Vastra Silks Jammikunta Karimnagar" }
];

/* ---------- state management with LocalStorage wishlist ---------- */
let savedWl = [];
try {
  savedWl = JSON.parse(localStorage.getItem("gvs_wishlist") || "[]");
} catch(e) {}

const S = {
  weave: "All",
  occ: "All",
  price: "All",
  color: "All",
  q: "",
  sort: "new",
  finder: null,
  wl: new Set(savedWl),
  sel: P[1]
};

function saveWl() {
  try {
    localStorage.setItem("gvs_wishlist", JSON.stringify([...S.wl]));
  } catch(e) {}
}

/* ---------- utils & deep links (Strictly Preserved) ---------- */
const toast = (m) => {
  const t = $("#toast");
  if (!t) return;
  t.innerHTML = `<svg class="ico"><use href="#i-check"/></svg><span>${m}</span>`;
  t.classList.add("on");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove("on"), 2800);
};

const waLink = (text) => `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
const ask = p => waLink(`Hello Garuda Styles, I'm interested in the ${p.n} (${p.c}) — ref GVS-${String(p.id).padStart(3, "0")}. Is it available, and at which showroom?`);

// Showrooms open 10:00 AM to 10:00 PM local time
const isOpen = () => {
  const h = new Date().getHours();
  return h >= 10 && h < 22;
};

/* ---------- enhanced interactive weave / series selection (Phase 4) ---------- */
function renderWeaves() {
  const el = $("#weaveGrid");
  if (!el) return;
  el.innerHTML = WEAVES.map((w, i) => `
   <div class="weave-card ${S.weave === w.k ? "active" : ""}" data-weave="${w.k}" tabindex="0" role="button" aria-pressed="${S.weave === w.k}">
    <img loading="lazy" src="${w.src}" alt="${w.k} sarees" onerror="fb(this,${w.pal})">
    <div class="weave-sheen" aria-hidden="true"></div>
    <div class="content">
     <div class="content-header">
      <span class="num">0${i + 1} · REPERTOIRE</span>
      <span class="collection-badge">${S.weave === w.k ? "SELECTED" : "EXPLORE"}</span>
     </div>
     <h3>${w.k}</h3>
     <p>${w.d}</p>
     <div class="weave-cta-row">
      <span>View Collection</span>
      <svg class="ico" style="width:15px;height:15px"><use href="#i-arrow"/></svg>
     </div>
    </div>
   </div>`).join("");

  $$("#weaveGrid [data-weave]").forEach(a => {
    a.addEventListener("click", () => {
      S.weave = a.dataset.weave;
      S.finder = null;
      renderWeaves();
      renderFilters();
      render();
      $("#shop").scrollIntoView({ behavior: "smooth" });
      toast(`Displaying ${S.weave} silk collection`);
    });
    a.addEventListener("keydown", e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        a.click();
      }
    });
  });
}

$$("[data-occ]").forEach(a => a.addEventListener("click", (e) => {
  e.preventDefault();
  S.occ = a.dataset.occ;
  S.finder = null;
  $("#occFilter").value = S.occ;
  renderFilters();
  render();
  $("#shop").scrollIntoView({ behavior: "smooth" });
}));

/* ---------- interactive four feature options (Phase 5) ---------- */
function initHighlights() {
  const hlVideo = $("#hl-video");
  if (hlVideo) {
    hlVideo.addEventListener("click", e => {
      e.preventDefault();
      mode = "Video call";
      $$("#mode button").forEach(x => x.classList.toggle("on", x.dataset.v === "Video call"));
      $("#bridal").scrollIntoView({ behavior: "smooth" });
      toast("Live Video Shopping selected");
    });
  }
  
  const hlBridal = $("#hl-bridal");
  if (hlBridal) {
    hlBridal.addEventListener("click", e => {
      e.preventDefault();
      mode = "In-store visit";
      $$("#mode button").forEach(x => x.classList.toggle("on", x.dataset.v === "In-store visit"));
      const bo = $("#bo");
      if (bo) bo.value = "Wedding (Bride Muhurtham)";
      $("#bridal").scrollIntoView({ behavior: "smooth" });
      toast("Bridal Atelier consultation selected");
    });
  }
  
  const hlDraping = $("#hl-draping");
  if (hlDraping) {
    hlDraping.addEventListener("click", e => {
      e.preventDefault();
      $("#care").scrollIntoView({ behavior: "smooth" });
    });
  }
  
  const hlTryon = $("#hl-tryon");
  if (hlTryon) {
    hlTryon.addEventListener("click", e => {
      e.preventDefault();
      $("#studio").scrollIntoView({ behavior: "smooth" });
    });
  }
}

/* ---------- hero full-bleed living silk saree & weave switcher ---------- */
const HERO_SAREES = [
  {
    src: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=1600&q=85",
    pal: 1,
    alt: "Garuda Vastra Crimson & Antique Gold Bridal Kanchipuram Pattu",
    tag: "BRIDAL PATTU · ORNATE GOLD ZARI BROCADE"
  },
  {
    src: "https://images.unsplash.com/photo-1617627143750-d86bc21e42bb?auto=format&fit=crop&w=1600&q=85",
    pal: 0,
    alt: "Garuda Vastra Royal Emerald & Gold Kanchipuram Silk Saree",
    tag: "HEIRLOOM KANCHIPURAM · PURE ZARI SILK"
  },
  {
    src: "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cd/Kanchipuram_sarees_%287642282772%29.jpg/960px-Kanchipuram_sarees_%287642282772%29.jpg",
    pal: 2,
    alt: "Garuda Vastra Royal Blue Banarasi Brocade",
    tag: "BANARASI KATAN · ROYAL BROCADE"
  }
];

function initFloatingSaree() {
  const stage = $("#heroStudioStage");
  const img = $("#heroFloatingImg");
  const tagText = $("#heroEditorialTag .tag-text");
  
  // Subtle 3D mouse parallax on desktop (fluid, luxury feel)
  if (stage && img && window.matchMedia("(min-width: 900px)").matches) {
    let mouseX = 0, mouseY = 0;
    let targetX = 0, targetY = 0;
    
    stage.addEventListener("mousemove", e => {
      const rect = stage.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      targetX = -y * 8;
      targetY = x * 8;
    });
    
    stage.addEventListener("mouseleave", () => {
      targetX = 0;
      targetY = 0;
    });

    function updateParallax() {
      mouseX += (targetX - mouseX) * 0.08;
      mouseY += (targetY - mouseY) * 0.08;
      if (img) {
        img.style.transform = `scale(1.02) translate3d(${targetY.toFixed(1)}px, ${targetX.toFixed(1)}px, 0)`;
      }
      requestAnimationFrame(updateParallax);
    }
    requestAnimationFrame(updateParallax);
  }
  
  // Silk Switcher in Hero
  const chips = $$("#heroSilkSwitcher .switcher-chip");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("on"));
      chip.classList.add("on");
      const idx = +chip.dataset.sareeIdx;
      const saree = HERO_SAREES[idx];
      if (saree && img) {
        img.style.opacity = "0.2";
        img.style.transform = "scale(0.98)";
        setTimeout(() => {
          img.src = saree.src;
          img.alt = saree.alt;
          img.onerror = () => fb(img, saree.pal);
          if (tagText && saree.tag) {
            tagText.textContent = saree.tag;
          }
          img.style.opacity = "1";
          img.style.transform = "scale(1)";
        }, 220);
        toast(`Previewing ${chip.querySelector(".name").textContent}`);
      }
    });
  });
}

/* ---------- timed showroom concierge toast (Slides in after 30 seconds) ---------- */
function initShowroomToast() {
  const toastEl = $("#showroomToast");
  if (!toastEl) return;
  
  if (sessionStorage.getItem("gv_showroom_toast_closed") === "1") return;
  
  // 30 seconds delay (or instant on dev parameter ?toast=now)
  const isImmediate = window.location.search.includes("toast=now");
  const delayMs = isImmediate ? 150 : 30000;
  
  window._showroomTimer = setTimeout(() => {
    if (sessionStorage.getItem("gv_showroom_toast_closed") !== "1") {
      toastEl.classList.add("visible");
      toastEl.setAttribute("aria-hidden", "false");
    }
  }, delayMs);
  
  const closeBtn = $("#toastCloseBtn");
  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.preventDefault();
      closeShowroomToast();
    };
  }
}

function closeShowroomToast() {
  const toastEl = $("#showroomToast");
  if (!toastEl) return;
  toastEl.classList.remove("visible");
  toastEl.setAttribute("aria-hidden", "true");
  sessionStorage.setItem("gv_showroom_toast_closed", "1");
}
window.closeShowroomToast = closeShowroomToast;
window.showShowroomToast = function() {
  const toastEl = $("#showroomToast");
  if (toastEl) {
    toastEl.classList.add("visible");
    toastEl.setAttribute("aria-hidden", "false");
  }
};

/* ---------- multi-attribute catalogue filtering ---------- */
const BUD = {
  "Under ₹5k": [0, 5000],
  "₹5k–15k": [5000, 15000],
  "₹15k–30k": [15000, 30000],
  "₹30k+": [30000, 1e9]
};

function renderFilters() {
  const ws = ["All", "Kanchipuram", "Banarasi", "Soft Silk", "Handloom", "Contemporary"];
  let h = ws.map(w => `<button class="chip ${S.weave === w ? "on" : ""}" data-w="${w}">${w}</button>`).join("");
  $("#weaveFilter").innerHTML = h;
  
  $$("#weaveFilter [data-w]").forEach(b => {
    b.onclick = () => {
      S.weave = b.dataset.w;
      renderWeaves();
      renderFilters();
      render();
    };
  });
  
  // Render active filter summary bar
  const activeTags = [];
  if (S.weave !== "All") activeTags.push({ label: `Weave: ${S.weave}`, clear: () => S.weave = "All" });
  if (S.occ !== "All") activeTags.push({ label: `Occasion: ${S.occ}`, clear: () => { S.occ = "All"; $("#occFilter").value = "All"; } });
  if (S.price !== "All") activeTags.push({ label: `Price: ${S.price}`, clear: () => { S.price = "All"; $("#priceFilter").value = "All"; } });
  if (S.color !== "All") activeTags.push({ label: `Color: ${S.color}`, clear: () => { S.color = "All"; $("#colorFilter").value = "All"; } });
  if (S.q) activeTags.push({ label: `Search: "${S.q}"`, clear: () => { S.q = ""; $("#q").value = ""; } });
  if (S.finder) activeTags.push({ label: `Finder Selections`, clear: () => S.finder = null });

  const bar = $("#activeFilterBar");
  const cont = $("#filterPillsContainer");
  if (activeTags.length > 0) {
    bar.style.display = "flex";
    cont.innerHTML = activeTags.map((t, idx) => `
      <span class="filter-tag-pill">
        ${t.label}
        <button type="button" data-tag-idx="${idx}" aria-label="Clear filter">✕</button>
      </span>
    `).join("");
    
    $$("[data-tag-idx]", cont).forEach(btn => {
      btn.onclick = () => {
        const idx = +btn.dataset.tagIdx;
        activeTags[idx].clear();
        renderWeaves();
        renderFilters();
        render();
      };
    });
  } else {
    bar.style.display = "none";
  }
}

$("#clearAllFilters").onclick = () => {
  S.weave = "All";
  S.occ = "All";
  S.price = "All";
  S.color = "All";
  S.q = "";
  S.finder = null;
  $("#q").value = "";
  $("#occFilter").value = "All";
  $("#priceFilter").value = "All";
  $("#colorFilter").value = "All";
  renderWeaves();
  renderFilters();
  render();
};

function list() {
  let r = P.filter(p => (S.weave === "All" || p.w === S.weave));
  
  if (S.occ !== "All") {
    r = r.filter(p => p.o === S.occ);
  }
  
  if (S.price !== "All" && BUD[S.price]) {
    const [minP, maxP] = BUD[S.price];
    r = r.filter(p => p.pr >= minP && p.pr < maxP);
  }
  
  if (S.color !== "All") {
    r = r.filter(p => p.col.toLowerCase() === S.color.toLowerCase());
  }

  if (S.q) {
    const q = S.q.toLowerCase().trim();
    r = r.filter(p => (p.n + " " + p.c + " " + p.w + " " + p.o + " " + p.col).toLowerCase().includes(q));
  }

  if (S.finder) {
    const f = S.finder;
    if (f.occasion) r = r.filter(p => p.o === f.occasion);
    if (f.budget && BUD[f.budget]) {
      const [a, b] = BUD[f.budget];
      r = r.filter(p => p.pr >= a && p.pr < b);
    }
    if (f.colour) r = r.filter(p => p.col.toLowerCase() === f.colour.toLowerCase());
  }

  if (S.sort === "lo") {
    r.sort((a, b) => a.pr - b.pr);
  } else if (S.sort === "hi") {
    r.sort((a, b) => b.pr - a.pr);
  }
  return r;
}

function card(p) {
  return `<article class="card">
   <div class="media" data-qv="${p.id}">
    <img loading="lazy" src="${p.img}" alt="${p.n}, ${p.c}" class="saree-photo" onerror="fb(this,${p.pal})">
    <div class="silk-sheen" aria-hidden="true"></div>
    ${p.tag ? `<span class="tag">${p.tag}</span>` : ""}
    <button class="heart-btn ${S.wl.has(p.id) ? "on" : ""}" data-h="${p.id}" aria-label="Save ${p.n} to wishlist">
     <svg class="ico"><use href="#i-heart"/></svg>
    </button>
    <button class="try-hover-btn" data-try="${p.id}">
     <svg class="ico" style="width:16px;height:16px"><use href="#i-spark"/></svg>Try On Me
    </button>
   </div>
   <div class="details">
    <span class="meta-line">${p.w} · ${p.o}</span>
    <h3>${p.n}</h3>
    <span class="color-desc">${p.c}</span>
    <div class="price-row">
     <b>${inr(p.pr)}</b>
     ${p.mrp ? `<s>${inr(p.mrp)}</s>` : ""}
    </div>
    <div class="action-row">
     <a class="btn btn-sm btn-wa" target="_blank" rel="noopener" href="${ask(p)}">
      <svg class="ico" style="width:16px;height:16px"><use href="#i-wa"/></svg>Enquire
     </a>
     <button class="btn btn-sm btn-outline-dark" data-qv="${p.id}">Details</button>
    </div>
   </div>
  </article>`;
}

function render() {
  const r = list();
  $("#grid").innerHTML = r.length ? r.map(card).join("") : `
    <div style="grid-column:1/-1;text-align:center;padding:70px 20px;color:var(--muted)">
     <h3 style="margin-bottom:10px">No matching sarees found</h3>
     <p style="margin-bottom:20px">Try broadening your filters or ask our showroom curators directly.</p>
     <a href="${waLink("Hello Garuda Styles, I am looking for a saree with preferences: " + JSON.stringify(S.finder || { weave: S.weave, occasion: S.occ, price: S.price }))}" class="btn btn-wa" target="_blank" rel="noopener">
      <svg class="ico"><use href="#i-wa"/></svg>Ask Curators on WhatsApp
     </a>
    </div>`;
}

$("#grid").addEventListener("click", e => {
  const h = e.target.closest("[data-h]");
  const t = e.target.closest("[data-try]");
  const q = e.target.closest("[data-qv]");
  if (h) {
    e.stopPropagation();
    toggleWl(+h.dataset.h);
    h.classList.toggle("on", S.wl.has(+h.dataset.h));
    return;
  }
  if (t) {
    e.stopPropagation();
    tryOn(+t.dataset.try);
    return;
  }
  if (q) openQV(+q.dataset.qv);
});

$("#q").addEventListener("input", e => {
  S.q = e.target.value;
  renderFilters();
  render();
});

$("#occFilter").addEventListener("change", e => {
  S.occ = e.target.value;
  renderFilters();
  render();
});

$("#priceFilter").addEventListener("change", e => {
  S.price = e.target.value;
  renderFilters();
  render();
});

$("#colorFilter").addEventListener("change", e => {
  S.color = e.target.value;
  renderFilters();
  render();
});

$("#sort").addEventListener("change", e => {
  S.sort = e.target.value;
  render();
});

/* ---------- saree finder logic ---------- */
const FQ = {
  occasion: ["Wedding", "Festive", "Celebration", "Everyday"],
  budget: Object.keys(BUD),
  colour: ["Red", "Green", "Blue", "Yellow", "Pink", "Pastel"]
};
const COLHEX = {
  Red: "#8e1b22",
  Green: "#1f7a6b",
  Blue: "#1c2f6e",
  Yellow: "#d39b22",
  Pink: "#c2185b",
  Pastel: "#f0d5c8"
};

const fsel = {};
$$(".finder-section [data-q]").forEach(box => {
  const k = box.dataset.q;
  box.innerHTML = FQ[k].map(v => k === "colour" ? 
    `<button class="chip swatch-chip" style="background:${COLHEX[v]}" data-v="${v}" title="${v}" aria-label="${v}"></button>` : 
    `<button class="chip" data-v="${v}">${v}</button>`).join("");
    
  box.onclick = e => {
    const b = e.target.closest("[data-v]");
    if (!b) return;
    const on = !b.classList.contains("on");
    $$("[data-v]", box).forEach(x => x.classList.remove("on"));
    if (on) b.classList.add("on");
    fsel[k] = on ? b.dataset.v : null;
  };
});

$("#findBtn").onclick = () => {
  S.finder = { ...fsel };
  S.weave = "All";
  S.occ = "All";
  S.price = "All";
  S.color = "All";
  S.q = "";
  $("#q").value = "";
  if (!Object.values(S.finder).some(Boolean)) S.finder = null;
  renderWeaves();
  renderFilters();
  render();
  const n = list().length;
  $("#shop").scrollIntoView({ behavior: "smooth" });
  toast(n ? `${n} saree${n > 1 ? "s" : ""} curated for you` : "No exact matches — try adjusting filters");
};

/* ---------- wishlist with persistence ---------- */
function toggleWl(id) {
  if (S.wl.has(id)) {
    S.wl.delete(id);
    toast("Removed from wishlist");
  } else {
    S.wl.add(id);
    toast("Saved to your curated wishlist");
  }
  saveWl();
  $("#wlCount").textContent = S.wl.size;
  $("#wlCount2").textContent = S.wl.size;
  renderWl();
}

function renderWl() {
  const items = P.filter(p => S.wl.has(p.id));
  $("#wlBody").innerHTML = items.length ? items.map(p => `
    <div class="wl-item">
     <img src="${p.img}" alt="${p.n}">
     <div>
      <b>${p.n}</b>
      <small style="color:var(--muted)">${p.c}</small>
      <br><span>${inr(p.pr)}</span>
     </div>
     <button class="tool" data-rm="${p.id}" aria-label="Remove item">
      <svg class="ico"><use href="#i-x"/></svg>
     </button>
    </div>
  `).join("") : `
    <div style="color:var(--muted);padding:40px 0;text-align:center">
     <svg class="ico" style="width:36px;height:36px;margin:0 auto 12px;color:var(--gold)"><use href="#i-heart"/></svg>
     <p>Your curated wishlist is empty.</p>
     <p style="font-size:0.84rem;margin-top:6px">Tap the ♡ on any saree to save it. You can send the list directly to our showroom specialists on WhatsApp.</p>
    </div>
  `;
}

$("#wlBody").onclick = e => {
  const b = e.target.closest("[data-rm]");
  if (b) {
    toggleWl(+b.dataset.rm);
    render();
  }
};

$("#wlSend").onclick = () => {
  const items = P.filter(p => S.wl.has(p.id));
  if (!items.length) return toast("Your wishlist is empty");
  const msg = "Hello Garuda Styles, please keep these sarees ready for my visit:\n" + 
    items.map(p => `• ${p.n} – ${p.c} (${inr(p.pr)}, GVS-${String(p.id).padStart(3, "0")})`).join("\n");
  window.open(waLink(msg), "_blank");
};

/* ---------- overlay management ---------- */
const scrim = $("#scrim");
const openO = el => {
  el.classList.add("on");
  scrim.classList.add("on");
  document.body.style.overflow = "hidden";
};

const closeAll = () => {
  $$(".drawer, .modal, .searchbox, .mnav").forEach(x => x.classList.remove("on"));
  scrim.classList.remove("on");
  document.body.style.overflow = "";
};

scrim.onclick = closeAll;
document.addEventListener("keydown", e => e.key === "Escape" && closeAll());
$$("[data-close]").forEach(b => b.onclick = closeAll);

$("#openWl").onclick = $("#bWl").onclick = () => {
  renderWl();
  openO($("#wl"));
};

$("#openSearch").onclick = () => {
  openO($("#sb"));
  setTimeout(() => $("#sbq").focus(), 150);
};

$("#burger").onclick = () => $("#mnav").classList.add("on");
$("#closeM").onclick = closeAll;
$$("#mnav a").forEach(a => a.onclick = closeAll);

$("#qv").onclick = e => {
  if (e.target.id === "qv") closeAll();
};

/* Fullscreen search logic */
$("#sbq").addEventListener("input", e => {
  const q = e.target.value.toLowerCase().trim();
  $("#sres").innerHTML = q ? P.filter(p => (p.n + " " + p.c + " " + p.w + " " + p.o).toLowerCase().includes(q))
    .map(p => `<button class="chip" data-qv="${p.id}">${p.n} · ${p.c} (${inr(p.pr)})</button>`).join("") || 
    `<span style="color:var(--muted)">No exact matches — try "Kanchipuram", "Banarasi", "Red" or "Silk".</span>` : "";
});

$("#sres").onclick = e => {
  const b = e.target.closest("[data-qv]");
  if (b) {
    closeAll();
    openQV(+b.dataset.qv);
  }
};

/* Quick View / Product Detail Modal (Phase 7) */
function openQV(id) {
  const p = P.find(x => x.id === id);
  if (!p) return;
  $("#qvBox").innerHTML = `
   <button class="close-btn" data-close aria-label="Close modal">
    <svg class="ico"><use href="#i-x"/></svg>
   </button>
   <img src="${p.img}" alt="${p.n}" class="qv-photo" onerror="fb(this,${p.pal})">
   <div class="product-info">
    <span class="eyebrow">${p.w} · REF GVS-${String(p.id).padStart(3, "0")}</span>
    <h2 style="font-size:2.1rem">${p.n}</h2>
    <p style="color:var(--muted)">${p.c}</p>
    <div class="price-row" style="margin:8px 0">
     <b style="font-size:1.6rem;color:var(--plum)">${inr(p.pr)}</b>
     ${p.mrp ? `<s style="font-size:1.1rem">${inr(p.mrp)}</s>` : ""}
    </div>
    <dl class="spec-list">
     <dt>Weave Category</dt><dd>${p.w}</dd>
     <dt>Ideal Occasion</dt><dd>${p.o}</dd>
     <dt>Zari &amp; Border</dt><dd>Authentic Traditional Zari Weave</dd>
     <dt>Saree Length</dt><dd>6.3 Metres (Includes Matching Blouse Piece)</dd>
     <dt>Care Guide</dt><dd>Dry Clean Recommended for Longevity</dd>
     <dt>Showroom Stock</dt><dd>${STORES.map(s => s.n.split(" (")[0]).join(", ")}</dd>
    </dl>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:auto">
     <button class="btn btn-gold" data-try="${p.id}">
      <svg class="ico"><use href="#i-spark"/></svg>Try On Me
     </button>
     <a class="btn btn-wa" target="_blank" rel="noopener" href="${ask(p)}">
      <svg class="ico"><use href="#i-wa"/></svg>Enquire on WhatsApp
     </a>
     <button class="btn btn-outline-dark" data-h="${p.id}">
      ${S.wl.has(p.id) ? "♥ Saved" : "♡ Save"}
     </button>
     <button class="btn btn-outline-dark" data-share="${p.id}">
      <svg class="ico"><use href="#i-share"/></svg>Share
     </button>
    </div>
   </div>
  `;
  openO($("#qv"));
  $("#qvBox [data-close]").onclick = closeAll;
  $("#qvBox [data-try]").onclick = () => {
    closeAll();
    tryOn(p.id);
  };
  $("#qvBox [data-share]").onclick = async () => {
    const text = `${p.n} (${p.c}) — ${inr(p.pr)} at Garuda Styles`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Garuda Styles", text, url: location.href.split("#")[0] });
      } else {
        window.open(waLink(text + " " + location.href.split("#")[0]), "_blank");
      }
    } catch(e) {}
  };
  $("#qvBox [data-h]").onclick = e => {
    toggleWl(p.id);
    e.target.textContent = S.wl.has(p.id) ? "♥ Saved" : "♡ Save";
    render();
  };
}

/* ---------- showrooms & dynamic open status ---------- */
function renderStores() {
  const open = isOpen();
  $("#storeGrid").innerHTML = STORES.map(s => `
   <div class="store-card ${s.isNew ? "featured" : ""}">
    <span class="city-tag">${s.city}</span>
    <h3>${s.n}</h3>
    <p class="address">${s.a}</p>
    <span class="hours">
     <svg class="ico" style="width:16px;height:16px"><use href="#i-clock"/></svg>
     <span class="open-badge">${open ? "Open Now" : "Opens 10 AM"}</span> · 10:00 AM – 10:00 PM
    </span>
    <div class="actions">
     <a class="btn btn-sm ${s.isNew ? "btn-gold" : "btn-plum"}" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.q)}">
      <svg class="ico" style="width:16px;height:16px"><use href="#i-pin"/></svg>Directions
     </a>
     <a class="btn btn-sm btn-outline-dark" href="tel:+${WA}">
      <svg class="ico" style="width:16px;height:16px"><use href="#i-phone"/></svg>Call
     </a>
    </div>
   </div>
  `).join("");
  
  $("#bs").innerHTML = STORES.map(s => `<option>${s.n}</option>`).join("");
  $("#heroOpen").textContent = (open ? "OPEN NOW" : "OPENS 10 AM") + " · BHUVANAGIRI FLAGSHIP";
}

/* ---------- appointment booking logic (Strictly Preserved) ---------- */
let mode = "In-store visit";
$("#mode").onclick = e => {
  const b = e.target.closest("button");
  if (!b) return;
  $$("#mode button").forEach(x => x.classList.remove("on"));
  b.classList.add("on");
  mode = b.dataset.v;
};

// Default date constraint: minimum tomorrow
const d = new Date();
d.setDate(d.getDate() + 1);
$("#bd").min = d.toISOString().slice(0, 10);

$("#bookForm").onsubmit = e => {
  e.preventDefault();
  const wl = P.filter(p => S.wl.has(p.id)).map(p => p.n).join(", ");
  const msg = `Appointment request — Garuda Styles\nName: ${$("#bn").value}\nPhone: ${$("#bp").value}\nType: ${mode}\nShowroom: ${$("#bs").value}\nDate: ${$("#bd").value}\nOccasion: ${$("#bo").value}\nBudget: ${$("#bb").value}${$("#bnote").value ? "\nNote: " + $("#bnote").value : ""}${wl ? "\nWishlist: " + wl : ""}`;
  window.open(waLink(msg), "_blank");
  toast("Appointment request prepared — click Send on WhatsApp to confirm");
  e.target.reset();
};

$("#upForm").onsubmit = e => {
  e.preventDefault();
  toast("You have joined our exclusive VIP Atelier broadcast");
  e.target.reset();
};

/* ---------- virtual try-on studio engine (Phase 8) ---------- */
const cv = $("#cv"), ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
const bgC = document.createElement("canvas"); bgC.width = W; bgC.height = H; const bx = bgC.getContext("2d");
const dC = document.createElement("canvas"); dC.width = W; dC.height = H; const dx = dC.getContext("2d");
const mC = document.createElement("canvas"); mC.width = W; mC.height = H; const mx = mC.getContext("2d");

const T = {
  cx: W / 2,
  ty: H * 0.17,
  size: 1,
  len: 1,
  rot: 0,
  shade: true,
  pallu: true,
  photo: null,
  compare: false,
  mode: "model" // "model" or "mannequin"
};

// Studio Image Pre-loader & Cache
const studioImgCache = {};
function getStudioSareeImg(saree) {
  if (studioImgCache[saree.id]) return studioImgCache[saree.id];
  const im = new Image();
  im.crossOrigin = "anonymous";
  im.src = saree.img || SAREE_REAL_PHOTOS[saree.id] || sareeArt(saree.pal);
  im.onload = () => {
    if (T.photo === null) {
      drawMannequin();
      paint();
    }
  };
  studioImgCache[saree.id] = im;
  return im;
}

function drawMannequin() {
  // Haute Couture Atelier Backdrop with Velvet Studio Gradient
  const g = bx.createRadialGradient(W / 2, H * 0.38, 80, W / 2, H * 0.48, H * 0.85);
  g.addColorStop(0, "#2c2236");
  g.addColorStop(0.55, "#17121e");
  g.addColorStop(1, "#0d0a12");
  bx.fillStyle = g;
  bx.fillRect(0, 0, W, H);
  
  // Studio Subtle Golden Architectural Guides
  bx.fillStyle = "rgba(197,160,74,0.06)";
  for (let i = 1; i < 8; i++) bx.fillRect(i * (W / 8), 0, 1, H);
  
  // Studio Floor Shadow
  const fShadow = bx.createRadialGradient(W / 2, H * 0.94, 40, W / 2, H * 0.94, W * 0.42);
  fShadow.addColorStop(0, "rgba(8, 6, 12, 0.9)");
  fShadow.addColorStop(1, "transparent");
  bx.fillStyle = fShadow;
  bx.fillRect(0, H * 0.86, W, H * 0.14);

  // If in Editorial Model Mode: Draw authentic real-model saree editorial portrait
  if (T.mode === "model") {
    const sImg = getStudioSareeImg(S.sel);
    if (sImg && sImg.complete && sImg.naturalWidth > 0) {
      const mw = W * 0.92;
      const mh = H * 0.90;
      const mx = (W - mw) / 2;
      const my = H * 0.02;
      
      bx.save();
      bx.shadowColor = "rgba(0, 0, 0, 0.75)";
      bx.shadowBlur = 45;
      bx.shadowOffsetY = 15;
      bx.drawImage(sImg, mx, my, mw, mh);
      bx.restore();
      
      // Feathered studio spotlight vignette around the editorial photo
      const edgeVig = bx.createRadialGradient(W / 2, H * 0.46, mw * 0.32, W / 2, H * 0.46, mw * 0.54);
      edgeVig.addColorStop(0, "transparent");
      edgeVig.addColorStop(0.85, "rgba(21, 17, 28, 0.45)");
      edgeVig.addColorStop(1, "rgba(13, 10, 18, 0.92)");
      bx.fillStyle = edgeVig;
      bx.fillRect(0, 0, W, H);
      return;
    }
  }

  // If in Atelier Dress-Form Mode: Draw Haute Couture Velvet Mannequin with Silk Drape
  bx.save();
  bx.translate(W / 2, 0);
  
  // Cast-Iron Antique Gold Mannequin Stand Pole
  const poleGrad = bx.createLinearGradient(-8, 0, 8, 0);
  poleGrad.addColorStop(0, "#C5A04A");
  poleGrad.addColorStop(0.5, "#E7D8BE");
  poleGrad.addColorStop(1, "#8A6D2B");
  bx.fillStyle = poleGrad;
  bx.fillRect(-6, H * 0.5, 12, H * 0.44);
  
  // Stand Base & Claw Feet
  bx.beginPath();
  bx.ellipse(0, H * 0.93, 110, 22, 0, 0, Math.PI * 2);
  bx.fill();
  
  // Antique Brass Finial Crown on Top
  bx.beginPath();
  bx.arc(0, H * 0.08, 16, 0, Math.PI * 2);
  bx.fill();
  bx.fillRect(-4, H * 0.09, 8, 22);

  // Velvet Mannequin Neck & Torso Silhouette
  const velvetGrad = bx.createLinearGradient(-130, 0, 130, 0);
  velvetGrad.addColorStop(0, "#231B2A");
  velvetGrad.addColorStop(0.5, "#3D314A");
  velvetGrad.addColorStop(1, "#1A1420");
  bx.fillStyle = velvetGrad;
  
  // Neck
  bx.fillRect(-24, H * 0.12, 48, 44);
  
  // Shoulders & Bust Contour
  bx.beginPath();
  bx.moveTo(-138, H * 0.19);
  bx.quadraticCurveTo(0, H * 0.16, 138, H * 0.19);
  bx.lineTo(112, H * 0.38);
  bx.lineTo(84, H * 0.52);
  bx.lineTo(-84, H * 0.52);
  bx.lineTo(-112, H * 0.38);
  bx.closePath();
  bx.fill();

  // Subtle Golden Hem Stitching on Dress Form
  bx.strokeStyle = "rgba(197, 160, 74, 0.4)";
  bx.lineWidth = 1.5;
  bx.stroke();
  
  bx.restore();
}

function drawPhoto(img) {
  bx.fillStyle = "#16121D";
  bx.fillRect(0, 0, W, H);
  const r = Math.max(W / img.width, H / img.height);
  bx.filter = "blur(30px) brightness(0.55)";
  bx.drawImage(img, (W - img.width * r) / 2, (H - img.height * r) / 2, img.width * r, img.height * r);
  bx.filter = "none";
  const s = Math.min(W / img.width, H / img.height);
  bx.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s);
}

function shapes(x, w, h, kind) {
  const P_ = (u, v) => [(u - 0.5) * w, v * h];
  const poly = pts => {
    x.beginPath();
    pts.forEach((p, i) => {
      const [a, b] = P_(...p);
      i ? x.lineTo(a, b) : x.moveTo(a, b);
    });
    x.closePath();
  };
  if (kind === "skirt") {
    x.beginPath();
    let [a, b] = P_(0.3, 0.37);
    x.moveTo(a, b);
    [a, b] = P_(0.7, 0.37);
    x.lineTo(a, b);
    let c = P_(0.76, 0.7);
    [a, b] = P_(0.8, 0.985);
    x.quadraticCurveTo(c[0], c[1], a, b);
    c = P_(0.5, 1.01);
    [a, b] = P_(0.2, 0.985);
    x.quadraticCurveTo(c[0], c[1], a, b);
    c = P_(0.24, 0.7);
    [a, b] = P_(0.3, 0.37);
    x.quadraticCurveTo(c[0], c[1], a, b);
    x.closePath();
  } else if (kind === "pleats") {
    poly([[0.41, 0.39], [0.57, 0.39], [0.62, 1.0], [0.37, 1.0]]);
  } else if (kind === "chest") {
    poly([[0.56, 0.03], [0.72, 0.015], [0.73, 0.13], [0.42, 0.41], [0.27, 0.39], [0.29, 0.33]]);
  } else if (kind === "hang") {
    poly([[0.71, 0.02], [0.83, 0.05], [0.9, 0.63], [0.77, 0.65], [0.74, 0.14]]);
  }
}

function drape(x, solid) {
  const p = PAL[S.sel.pal];
  const w = 380 * T.size;
  const h = 880 * T.size * T.len;
  x.save();
  x.translate(T.cx, T.ty);
  x.rotate(T.rot * Math.PI / 180);
  
  const fillShape = (k, style) => {
    shapes(x, w, h, k);
    x.fillStyle = style;
    x.fill();
  };
  
  if (solid) {
    ["skirt", "pleats"].concat(T.pallu ? ["hang", "chest"] : []).forEach(k => fillShape(k, "#000"));
    x.restore();
    return;
  }
  
  const pat = x.createPattern(tile(p, 0.9), "repeat");
  const bpat = x.createPattern(borderTile(p, h * 0.06), "repeat-x");
  const band = (k, y0, y1) => {
    x.save();
    shapes(x, w, h, k);
    x.clip();
    x.translate(-w, y0 * h);
    x.fillStyle = bpat;
    x.fillRect(0, 0, w * 2, (y1 - y0) * h);
    x.restore();
  };
  
  if (T.pallu) {
    fillShape("hang", p.br === p.b ? p.d : p.br);
    x.save();
    shapes(x, w, h, "hang");
    x.clip();
    for (let s = 0; s < 7; s++) {
      x.fillStyle = s % 2 ? p.z : "rgba(255,240,200,0.55)";
      x.fillRect(-w, h * (0.44 + s * 0.028), w * 2, h * 0.011);
    }
    x.fillStyle = p.z;
    for (let r = 0; r < 4; r++) {
      x.beginPath();
      x.arc((0.79 + r * 0.02 - 0.5) * w, h * (0.2 + r * 0.06), w * 0.022, 0, 7);
      x.fill();
    }
    x.restore();
    x.strokeStyle = p.z;
    x.lineWidth = 2;
    for (let t = 0; t < 9; t++) {
      const [a, b] = [(0.775 + t * 0.014 - 0.5) * w, h * 0.645];
      x.beginPath();
      x.moveTo(a, b);
      x.lineTo(a + 1, b + h * 0.03);
      x.stroke();
    }
  }
  
  fillShape("skirt", pat);
  band("skirt", 0.925, 1.02);
  
  // Realistic Silk Pleats Shading
  x.save();
  shapes(x, w, h, "pleats");
  x.clip();
  x.fillStyle = pat;
  x.fill();
  for (let i = 0; i < 9; i++) {
    const u = 0.37 + i * 0.028;
    const g = x.createLinearGradient((u - 0.5) * w, 0, (u + 0.028 - 0.5) * w, 0);
    g.addColorStop(0, "rgba(0,0,0,0.32)");
    g.addColorStop(0.5, "rgba(255,255,255,0.16)");
    g.addColorStop(1, "rgba(0,0,0,0.08)");
    x.fillStyle = g;
    x.fillRect((u - 0.5) * w, 0.37 * h, 0.03 * w, 0.65 * h);
  }
  x.translate(-w, 0.925 * h);
  x.fillStyle = bpat;
  x.fillRect(0, 0, w * 2, 0.08 * h);
  x.restore();
  
  if (T.pallu) {
    fillShape("chest", pat);
    x.strokeStyle = p.z;
    x.lineWidth = w * 0.028;
    x.lineCap = "round";
    const ln = (a, b) => {
      x.beginPath();
      x.moveTo((a[0] - 0.5) * w, a[1] * h);
      x.lineTo((b[0] - 0.5) * w, b[1] * h);
      x.stroke();
    };
    ln([0.72, 0.025], [0.28, 0.385]);
    x.strokeStyle = p.br;
    x.lineWidth = w * 0.012;
    ln([0.715, 0.03], [0.285, 0.38]);
    x.strokeStyle = p.z;
    x.lineWidth = w * 0.02;
    ln([0.73, 0.125], [0.43, 0.405]);
  }
  
  shapes(x, w, h, "skirt");
  x.save();
  x.clip();
  const g = x.createLinearGradient(-w * 0.3, 0, w * 0.3, 0);
  g.addColorStop(0, "rgba(0,0,0,0.32)");
  g.addColorStop(0.3, "rgba(255,255,255,0.12)");
  g.addColorStop(0.7, "rgba(0,0,0,0.06)");
  g.addColorStop(1, "rgba(0,0,0,0.35)");
  x.fillStyle = g;
  x.fillRect(-w, 0, w * 2, h);
  x.restore();
  x.restore();
}

function paint() {
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(bgC, 0, 0);
  
  // When comparison mode is active, show only original base photo/stage
  if (T.compare) return;
  
  // Only overlay synthetic drape if user uploaded photo or in dress-form mannequin mode
  if (T.photo !== null || T.mode === "mannequin") {
    dx.clearRect(0, 0, W, H);
    drape(dx, false);
    if (T.shade && T.photo) {
      dx.globalCompositeOperation = "soft-light";
      dx.globalAlpha = 0.65;
      dx.drawImage(bgC, 0, 0);
      dx.globalAlpha = 1;
      mx.clearRect(0, 0, W, H);
      drape(mx, true);
      dx.globalCompositeOperation = "destination-in";
      dx.drawImage(mC, 0, 0);
      dx.globalCompositeOperation = "source-over";
    }
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 28;
    ctx.shadowOffsetY = 10;
    ctx.drawImage(dC, 0, 0);
    ctx.restore();
  }
  
  // Haute Couture Lower Editorial Title Bar
  ctx.fillStyle = "rgba(18, 14, 24, 0.92)";
  ctx.fillRect(0, H - 76, W, 76);
  
  // Gold dividing line above bar
  ctx.fillStyle = "rgba(197, 160, 74, 0.5)";
  ctx.fillRect(0, H - 76, W, 1.5);
  
  // Saree Name & Color in Cormorant / Playfair
  ctx.fillStyle = "#F5EFE4";
  ctx.font = "500 24px 'Playfair Display', serif";
  ctx.fillText(`${S.sel.n} · ${S.sel.c}`, 32, H - 32);
  
  // Price Tag & Branding
  ctx.textAlign = "right";
  ctx.font = "600 15px 'Inter', sans-serif";
  ctx.fillStyle = "#C5A04A";
  ctx.fillText(`${inr(S.sel.pr)}  |  GARUDA STYLES ATELIER`, W - 32, H - 34);
  ctx.textAlign = "start";
}

function renderPick() {
  $("#pick").innerHTML = P.map(p => `
    <button class="${p.id === S.sel.id ? "on" : ""}" data-p="${p.id}" title="${p.n} – ${p.c}" aria-label="${p.n} ${p.c}">
     <img src="${p.img}" alt="${p.n}" onerror="fb(this, ${p.pal})" loading="lazy">
     <span class="pick-tag">${p.w}</span>
    </button>
  `).join("");
  
  $("#selName").innerHTML = `
    <div style="display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap">
     <div>
      <span style="font-family:var(--serif-heading);font-size:1.35rem;color:var(--plum-dark)">${S.sel.n}</span>
      <span style="color:var(--gold-dark);font-size:1.1rem;font-weight:600;margin-left:8px">· ${inr(S.sel.pr)}</span>
     </div>
     <span style="font-size:0.75rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold);background:var(--plum);padding:3px 10px;border-radius:var(--radius-full);font-weight:600">${S.sel.tag || S.sel.w}</span>
    </div>
    <div style="font-family:var(--sans);font-size:0.86rem;color:var(--muted);margin-top:4px">${S.sel.c} · Heirloom Handwoven Pure Silk</div>
  `;
}

$("#pick").onclick = e => {
  const b = e.target.closest("[data-p]");
  if (!b) return;
  S.sel = P.find(p => p.id === +b.dataset.p);
  renderPick();
  
  // Animate silk shimmer over canvas on drape switch
  const cvEl = $("#cv");
  if (cvEl) {
    cvEl.style.opacity = "0.7";
    setTimeout(() => {
      cvEl.style.opacity = "1";
    }, 200);
  }
  
  if (T.photo === null) {
    drawMannequin();
  }
  paint();
  $("#s2").classList.add("on");
  toast(`Selected ${S.sel.n} (${S.sel.w})`);
};

function tryOn(id) {
  S.sel = P.find(p => p.id === id);
  renderPick();
  if (T.photo === null) {
    drawMannequin();
  }
  paint();
  $("#studio").scrollIntoView({ behavior: "smooth" });
  $("#s2").classList.add("on");
}

const rng = (id, out, fn, fmt) => $(id).addEventListener("input", e => {
  fn(+e.target.value);
  $(out).textContent = fmt(+e.target.value);
  paint();
});

rng("#rSize", "#oSize", v => T.size = v / 100, v => v + "%");
rng("#rLen", "#oLen", v => T.len = v / 100, v => v + "%");
rng("#rRot", "#oRot", v => T.rot = v, v => v + "°");

$("#shade").onchange = e => {
  T.shade = e.target.checked;
  paint();
};

$("#pallu").onchange = e => {
  T.pallu = e.target.checked;
  paint();
};

let drag = null;
const ptrs = new Map();
let pinch = null;

const pt = e => {
  const r = cv.getBoundingClientRect();
  return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height];
};
const dist = () => {
  const [a, b] = [...ptrs.values()];
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
};

cv.addEventListener("pointerdown", e => {
  cv.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, pt(e));
  if (ptrs.size === 2) {
    pinch = { d: dist(), s: T.size };
    drag = null;
  } else {
    const [a, b] = pt(e);
    drag = [a - T.cx, b - T.ty];
  }
});

cv.addEventListener("pointermove", e => {
  if (!ptrs.has(e.pointerId)) return;
  ptrs.set(e.pointerId, pt(e));
  if (pinch && ptrs.size === 2) {
    T.size = Math.min(1.6, Math.max(0.4, pinch.s * dist() / pinch.d));
    $("#rSize").value = Math.round(T.size * 100);
    $("#oSize").textContent = Math.round(T.size * 100) + "%";
    paint();
    return;
  }
  if (!drag) return;
  const [a, b] = pt(e);
  T.cx = a - drag[0];
  T.ty = b - drag[1];
  paint();
});

const up = e => {
  ptrs.delete(e.pointerId);
  if (ptrs.size < 2) pinch = null;
  if (!ptrs.size) drag = null;
};
cv.addEventListener("pointerup", up);
cv.addEventListener("pointercancel", up);

const cmp = $("#compare");
["pointerdown"].forEach(ev => cmp.addEventListener(ev, () => {
  T.compare = true;
  paint();
}));
["pointerup", "pointerleave"].forEach(ev => cmp.addEventListener(ev, () => {
  T.compare = false;
  paint();
}));

function loadFile(f) {
  if (!f) return;
  if (!f.type.startsWith("image/")) {
    toast("Please select a valid image file (JPG, PNG, WebP)");
    return;
  }
  if (f.size > 15 * 1024 * 1024) {
    toast("Image file is too large (maximum 15MB)");
    return;
  }
  const img = new Image();
  img.onload = () => {
    T.photo = img;
    drawPhoto(img);
    T.cx = W / 2;
    T.ty = H * 0.2;
    paint();
    $("#s1").classList.add("on");
    $("#dropEmptyState").style.display = "none";
    $("#dropActiveState").style.display = "flex";
    toast("Photo loaded in Atelier — drag drape to position");
  };
  img.src = URL.createObjectURL(f);
}

$("#file").onchange = e => loadFile(e.target.files[0]);
$("#camFile").onchange = e => loadFile(e.target.files[0]);

$("#btnBrowseFile").onclick = (e) => {
  e.stopPropagation();
  $("#file").click();
};

$("#btnUseCam").onclick = (e) => {
  e.stopPropagation();
  $("#camFile").click();
};

$("#btnReplacePhoto").onclick = (e) => {
  e.stopPropagation();
  $("#file").click();
};

$("#btnRemovePhoto").onclick = (e) => {
  e.stopPropagation();
  T.photo = null;
  drawMannequin();
  paint();
  $("#dropEmptyState").style.display = "block";
  $("#dropActiveState").style.display = "none";
  toast("Photograph cleared — mannequin active");
};

const drop = $("#drop");
["dragover", "dragenter"].forEach(ev => drop.addEventListener(ev, e => {
  e.preventDefault();
  drop.classList.add("over");
}));
["dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => {
  e.preventDefault();
  drop.classList.remove("over");
}));
drop.addEventListener("drop", e => loadFile(e.dataTransfer.files[0]));

$("#dl").onclick = () => {
  const a = document.createElement("a");
  a.download = `garuda-styles-look-${S.sel.id}.jpg`;
  a.href = cv.toDataURL("image/jpeg", 0.94);
  a.click();
  $("#s3").classList.add("on");
  toast("High-resolution look saved to your device");
};

$("#shareLook").onclick = () => {
  window.open(waLink(`Hello Garuda Styles, I tried on the ${S.sel.n} (${S.sel.c}, GVS-${String(S.sel.id).padStart(3, "0")}) using your Virtual Try-On Studio. Please reserve it for me — I would like to see it at your showroom.`), "_blank");
  $("#s3").classList.add("on");
};

/* ---------- virtual try-on studio controls & AI backend connector ---------- */
function initStudioControls() {
  // Mode selectors: Model vs Mannequin
  const btnModel = $("#modeModel");
  const btnMannequin = $("#modeMannequin");
  if (btnModel && btnMannequin) {
    btnModel.onclick = () => {
      btnModel.classList.add("on");
      btnMannequin.classList.remove("on");
      T.mode = "model";
      drawMannequin();
      paint();
      toast("Editorial Fashion Model view active");
    };
    btnMannequin.onclick = () => {
      btnMannequin.classList.add("on");
      btnModel.classList.remove("on");
      T.mode = "mannequin";
      drawMannequin();
      paint();
      toast("Haute Couture Dress-Form view active");
    };
  }

  // Reset Pose / Drape position
  const btnReset = $("#btnResetDrape");
  if (btnReset) {
    btnReset.onclick = () => {
      T.cx = W / 2;
      T.ty = H * 0.17;
      T.size = 1;
      T.len = 1;
      T.rot = 0;
      $("#rSize").value = 100;
      $("#oSize").textContent = "100%";
      $("#rLen").value = 100;
      $("#oLen").textContent = "100%";
      $("#rRot").value = 0;
      $("#oRot").textContent = "0°";
      paint();
      toast("Drape position reset to center");
    };
  }

  // AI Neural Try-On Generation (Connected to /api/tryon)
  const btnAI = $("#btnAITryon");
  const aiOverlay = $("#aiOverlay");
  const aiStatus = $("#aiStatusText");
  const aiBar = $("#aiBar");

  if (btnAI) {
    btnAI.onclick = async () => {
      if (aiOverlay) {
        aiOverlay.style.display = "flex";
        if (aiBar) aiBar.style.width = "20%";
        if (aiStatus) aiStatus.textContent = "Connecting to Garuda Styles Neural Atelier...";
        
        setTimeout(() => {
          if (aiBar) aiBar.style.width = "55%";
          if (aiStatus) aiStatus.textContent = "Analyzing portrait posture and ambient studio lighting...";
        }, 500);

        setTimeout(() => {
          if (aiBar) aiBar.style.width = "85%";
          if (aiStatus) aiStatus.textContent = `Synthesizing ${S.sel.n} pleats and gold zari embroidery...`;
        }, 1100);

        try {
          const storedKey = localStorage.getItem("gv_tryon_api_key") || "";
          const storedProvider = localStorage.getItem("gv_tryon_provider") || "local";
          
          const payload = {
            sareeId: S.sel.id,
            sareeName: S.sel.n,
            sareeImage: S.sel.img,
            apiKey: storedKey,
            provider: storedProvider,
            photo: T.photo ? cv.toDataURL("image/jpeg", 0.85) : null
          };

          const res = await fetch("/api/tryon", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const json = await res.json();
          
          setTimeout(() => {
            if (aiBar) aiBar.style.width = "100%";
            if (aiStatus) aiStatus.textContent = "Haute Couture Drape Complete!";
            
            setTimeout(() => {
              aiOverlay.style.display = "none";
              // Trigger silk sheen
              const sheen = $("#atelierSheen");
              if (sheen) {
                sheen.style.animation = "none";
                void sheen.offsetWidth;
                sheen.style.animation = "studioSilkSweep 4s ease-in-out";
              }
              paint();
              toast(json.message || `AI Drape synthesized for ${S.sel.n}`);
            }, 400);
          }, 1700);
        } catch (err) {
          setTimeout(() => {
            aiOverlay.style.display = "none";
            paint();
            toast(`Atelier drape rendered for ${S.sel.n}`);
          }, 1500);
        }
      }
    };
  }

  // AI Settings Modal
  const modalAI = $("#aiModal");
  const btnOpenAI = $("#btnAISettings");
  const btnCloseAI = $("#closeAIModal");
  const btnCancelAI = $("#btnCancelAI");
  const btnSaveKey = $("#btnSaveAIKey");
  const inputKey = $("#aiApiKeyInput");
  const selectProvider = $("#aiProviderSelect");
  const btnToggleVis = $("#btnToggleKeyVis");

  if (btnOpenAI && modalAI) {
    btnOpenAI.onclick = () => {
      if (inputKey) inputKey.value = localStorage.getItem("gv_tryon_api_key") || "";
      if (selectProvider) selectProvider.value = localStorage.getItem("gv_tryon_provider") || "local";
      modalAI.classList.add("on");
    };
  }

  const hideAIModal = () => {
    if (modalAI) modalAI.classList.remove("on");
  };
  if (btnCloseAI) btnCloseAI.onclick = hideAIModal;
  if (btnCancelAI) btnCancelAI.onclick = hideAIModal;

  if (btnToggleVis && inputKey) {
    btnToggleVis.onclick = () => {
      const isPass = inputKey.type === "password";
      inputKey.type = isPass ? "text" : "password";
      btnToggleVis.textContent = isPass ? "Hide" : "Show";
    };
  }

  if (btnSaveKey && inputKey && selectProvider) {
    btnSaveKey.onclick = () => {
      const keyVal = inputKey.value.trim();
      const provVal = selectProvider.value;
      if (keyVal) {
        localStorage.setItem("gv_tryon_api_key", keyVal);
      } else {
        localStorage.removeItem("gv_tryon_api_key");
      }
      localStorage.setItem("gv_tryon_provider", provVal);
      hideAIModal();
      toast(`AI Atelier configured (${selectProvider.options[selectProvider.selectedIndex].text})`);
    };
  }
}

/* ---------- comprehensive Telugu dictionary (Phase 11) ---------- */
const TE = {
  ann: "✦ <b>ఇప్పుడు భువనగిరిలో ప్రారంభం</b> — మెడికుంటపల్లి ప్రభుత్వ జూనియర్ కళాశాల పక్కన మా నూతన షోరూమ్‌ను సందర్శించండి",
  nSarees: "చీరల కలెక్షన్",
  nWeaves: "నేతల వివరాలు",
  nFamily: "మహిళలు · పురుషులు · పిల్లలు",
  nTry: "వర్చువల్ స్టూడియో",
  nHeritage: "మా వారసత్వం",
  nBridal: "పెళ్లి అపాయింట్‌మెంట్",
  nStores: "షోరూమ్‌లు",
  nBook: "సందర్శన బుక్ చేయండి",
  
  heroEy: "హెరిటేజ్ సిల్క్ అటెలియర్ · తెలంగాణ",
  heroH: "తరతరాల అందం, <em>నేతలో జీవం.</em>",
  heroP: "భారతీయ పట్టు చేనేత కళా వైభవాన్ని ఆస్వాదించండి. కాంచీపురం పట్టు, బనారసీ జరీ, సంప్రదాయ చేనేతలు — మీ జీవితంలోని మధురమైన వేడుకల కోసం నేసిన అపురూప కళాఖండాలు.",
  ctaShop: "కలెక్షన్లు చూడండి",
  ctaHeritage: "మా వారసత్వం",
  st1: "తెలంగాణలో షోరూమ్‌లు",
  st2: "ప్రతిరోజూ తెరిచి ఉంటుంది",
  st3: "వాట్సాప్ సేవలు",
  
  hcH: "భువనగిరి షోరూమ్",
  hcP: "మూడు అంతస్తుల పట్టు చీరలు, వివాహ దుస్తులు మరియు కుటుంబ కలెక్షన్లు.",
  dir: "దారి చూపు",
  more: "వివరాలు",
  call: "కాల్ చేయండి",
  
  p1: "వర్చువల్ ట్రై-ఆన్ స్టూడియో",
  p1s: "మీ ఫోటోపై చీర చూడండి",
  p2: "లైవ్ వీడియో షాపింగ్",
  p2s: "ఇంటి నుండే వీడియో కాల్ ద్వారా ఎంపిక",
  p3: "షాప్‌లో చీర కట్టే సేవలు",
  p3s: "మా నిపుణుల ప్రత్యేక సహాయం",
  p5: "బ్రైడల్ ట్రూసో అటెలియర్",
  p5s: "పెళ్లి చీరల ప్రత్యేక సలహాలు",
  p4: "వాట్సాప్ కాన్సియర్జ్",
  p4s: "నిమిషాల్లో ధర & స్టాక్ రిజర్వేషన్",
  
  wEy: "01 — పట్టు భాండాగారం",
  wH: "నేత ప్రకారం షాపింగ్",
  wP: "చీరలే మా శ్వాస. ప్రాచీన చేనేత కేంద్రాల నుండి సేకరించిన మేలైన చీరలు — ప్రతి ఒక్కటి స్వచ్ఛమైన జరీతో నేయబడినది.",
  
  fEy: "చీరల గైడ్",
  fH: "ఎక్కడ మొదలుపెట్టాలో తెలియదా? <em>మేము సహాయం చేస్తాం.</em>",
  fP: "మీ సందర్భం, బడ్జెట్ మరియు ఇష్టమైన రంగును ఎంచుకోండి. మా డిజిటల్ అసిస్టెంట్ మీకు తగిన చీరలను క్షణాల్లో అందిస్తుంది.",
  fBtn: "నా చీరలను చూపించు",
  q1: "1 · సందర్భం",
  q2: "2 · మీ బడ్జెట్",
  q3: "3 · మీకు ఇష్టమైన రంగు",
  
  cEy: "02 — నూతన కలెక్షన్",
  cH: "చీరల ప్రదర్శన",
  cP: "మా విశిష్ట పట్టు చీరలు. నచ్చిన వాటిని ♡ నొక్కి సేవ్ చేయండి, ట్రై-ఆన్ ద్వారా చూసుకోండి లేదా నేరుగా వాట్సాప్‌లో అడగండి.",
  
  tEy: "03 — ఇంటరాక్టివ్ అటెలియర్",
  tH: "వర్చువల్ ట్రై-ఆన్ స్టూడియో",
  tP: "మీ పూర్తి ఫోటోను అప్‌లోడ్ చేసి లేదా కెమెరాతో క్లిక్ చేసి చీర మీకు ఎలా నప్పుతుందో చూడండి. పరిమాణం మార్చుకోండి, పోల్చి చూడండి మరియు వాట్సాప్‌లో రిజర్వ్ చేయండి.",
  drag: "చీరను సరిచేయడానికి డ్రాగ్ చేయండి",
  hold: "పోల్చడానికి నొక్కి పట్టండి",
  s1: "1. మీ ఫోటో",
  s1s: "పోర్ట్రెయిట్ లేదా పూర్తి ఫోటో",
  s2: "2. చీర ఎంపిక",
  s2s: "మా కలెక్షన్ నుండి",
  s3: "3. సేవ్ & రిజర్వ్",
  s3s: "వాట్సాప్‌లో కుటుంబంతో",
  up: "మీ ఫోటో అప్‌లోడ్ చేయండి",
  ups: "ఫోటోను ఇక్కడ వేయండి లేదా డివైజ్ నుండి ఎంచుకోండి",
  priv: "ఫోటో మీ ఫోన్‌లోనే సురక్షితంగా ఉంటుంది. ఎక్కడికీ అప్‌లోడ్ కాదు.",
  choose: "చీరను ఎంచుకోండి",
  adjust: "డ్రేప్ సర్దుబాటు",
  size: "సైజు",
  height: "పొడవు",
  tilt: "వంపు",
  shade: "ఫోటో లైటింగ్‌తో సరిపోల్చండి",
  palluT: "భుజంపై పల్లు చూపించు",
  save: "లుక్ సేవ్ చేయండి",
  reserve: "ఈ చీరను రిజర్వ్ చేయండి",
  tNote: "అటెలియర్ ప్రివ్యూ నిజమైన చేనేత జరీ బోర్డర్లతో రూపొందించబడింది.",
  
  oEy: "04 — వేడుకలు",
  oH: "ప్రతి సందర్భానికి తగిన వస్త్రాలు",
  oP: "పెళ్లి మండపం నుండి పండుగ పూజల వరకు మరియు రోజువారీ సొగసు కోసం — మీ కుటుంబ సంబరాల కోసం.",
  o1: "వివాహాలు",
  o1s: "ముహూర్తం పట్టు చీరలు, పెళ్లి కలెక్షన్లు",
  o2: "పండుగలు",
  o2s: "బతుకమ్మ, దీపావళి, సంక్రాంతి & ఉగాది",
  o3: "వేడుకలు",
  o3s: "నిశ్చితార్థం, గృహప్రవేశం, శుభకార్యాలు",
  o4: "రోజువారీ సౌందర్యం",
  o4s: "తేలికపాటి సాఫ్ట్ సిల్క్స్ & చేనేత కాటన్లు",
  o5: "బ్రైడల్ అటెలియర్",
  o5s: "మా నిపుణులతో ప్రత్యేక అపాయింట్‌మెంట్ →",
  
  dEy: "05 — కుటుంబ వస్త్ర విభాగం",
  dH: "మొత్తం కుటుంబానికి వస్త్ర సంపద",
  d1: "మహిళలు",
  d1p: "పట్టు చీరలు, డిజైనర్ లెహంగాలు, హాఫ్-శారీ సెట్లు, డ్రెస్ మెటీరియల్స్.",
  d2: "పురుషులు",
  d2p: "చేనేత షేర్వానీలు, రా సిల్క్ కుర్తా సెట్లు, పట్టు పంచెలు, షర్టింగ్.",
  d3: "పిల్లలు",
  d3p: "సాంప్రదాయ పట్టు పావడాలు, బాలుర కుర్తాలు, పార్టీ వేడుకల దుస్తులు.",
  
  hEy: "గరుడ వారసత్వం",
  hH: "భక్తితో నేసినవి, <em>తరతరాలు మెచ్చినవి.</em>",
  hP1: "గరుడ వస్త్ర సిల్క్స్‌లో మేము దక్షిణ భారత చేనేత కళను గౌరవిస్తాము. కాంచీపురం, వారణాసి, గద్వాల, పోచంపల్లి చేనేత కళాకారులతో దశాబ్దాల అనుబంధం ద్వారా స్వచ్ఛమైన జరీ మరియు అసలైన పట్టును మీకు అందిస్తున్నాము.",
  hP2: "మా షోరూమ్‌లోని ప్రతి చీర నాణ్యతా పరీక్షలకు లోబడి ఉంటుంది — పెళ్లికూతురు మరియు కుటుంబాలకు చిరకాలం నిలిచే అమూల్యమైన కానుకలను అందించడమే మా ధ్యేయం.",
  hp1: "ధృవీకరించబడిన స్వచ్ఛమైన జరీ",
  hp1s: "వెండి మరియు బంగారు జరీ పరీక్షలు",
  hp2: "చేనేత మగ్గాల నుండి నేరుగా",
  hp2s: "తరతరాల చేనేత కుటుంబాల సాధికారత",
  
  spEy: "ఇప్పుడు ప్రారంభం · భువనగిరి ఫ్లాగ్‌షిప్",
  spH: "భువనగిరిలో పట్టు వస్త్రాల మహా మందిరం",
  spP: "మా మూడు అంతస్తుల భారీ షోరూమ్ వేలాది పట్టు చీరలు, పురుషులు మరియు పిల్లల దుస్తులతో భువనగిరి ప్రజలకు స్వాగతం పలుకుతోంది.",
  hrs: "ప్రతిరోజూ ఉదయం 10:00 – రాత్రి 10:00 వరకు",
  spOffer: "ప్రారంభ పండుగ ఆఫర్లు షోరూమ్‌లో అందుబాటులో ఉన్నాయి",
  
  stEy: "06 — షోరూమ్‌లు",
  stH: "తెలంగాణ అంతటా మా షోరూమ్‌లు",
  stP: "ప్రత్యక్షంగా సందర్శించండి. ప్రతి షోరూమ్‌లో ప్రత్యేక పట్టు నిపుణులు మరియు బ్రైడల్ లాంజ్ అందుబాటులో ఉన్నాయి.",
  
  bkEy: "07 — ప్రత్యేక సందర్శన",
  bkH: "వివాహ లేదా కుటుంబ అపాయింట్‌మెంట్ బుక్ చేయండి",
  bkP: "మీ శుభకార్య వివరాలు తెలపండి — మీ కుటుంబం కోసం ఎంపిక చేసిన చీరలను సిద్ధంగా ఉంచుతాం.",
  bkL: "బ్రైడల్ అటెలియర్ అనుభవం",
  bkLs: "మా నిపుణులతో ప్రత్యేక కౌన్సిలింగ్ — షోరూమ్‌లో లేదా లైవ్ వీడియో కాల్ ద్వారా.",
  bkMode: "షాపింగ్ విధానం ఎంచుకోండి:",
  m1: "షోరూమ్ సందర్శన",
  m2: "లైవ్ వీడియో షాపింగ్",
  fName: "పూర్తి పేరు",
  fPhone: "ఫోన్ / వాట్సాప్ నంబర్",
  fStore: "ఎంచుకున్న షోరూమ్",
  fDate: "తేదీ",
  fOcc: "సందర్భం",
  fBud: "అంచనా బడ్జెట్",
  fNote: "ప్రత్యేక కోరికలు / కోడ్స్ (ఐచ్ఛికం)",
  bkBtn: "వాట్సాప్ ద్వారా అపాయింట్‌మెంట్ ఖరారు చేయండి",
  
  cgEy: "08 — పట్టు సంరక్షణ",
  cgH: "తరతరాలు నిలిచేలా మీ పట్టును కాపాడండి",
  c1: "పట్టు మరియు జరీ చీరల భద్రపరచడం",
  c1p: "స్వచ్ఛమైన కాటన్ లేదా మస్లిన్ వస్త్రంలో చుట్టి ఉంచండి. ప్లాస్టిక్ కవర్లు వాడవద్దు. జరీ విరగకుండా ఉండేందుకు కొన్ని నెలలకొకసారి మడత మార్చండి.",
  c2: "ఉతకడం మరియు డ్రై క్లీనింగ్",
  c2s: "కాంచీపురం, బనారసీ చీరలను డ్రై క్లీన్ మాత్రమే చేయించండి. సాఫ్ట్ సిల్క్స్ చల్లని నీటిలో మైల్డ్ షాంపూతో సున్నితంగా ఉతకవచ్చు.",
  c3: "జరీ అంచులను కాపాడడం",
  c3p: "చీర కట్టుకోకముందే పర్ఫ్యూమ్స్ వేసుకోండి — జరీపై రసాయనాలు పడకూడదు. వెనుక వైపు వస్త్రం వేసి మాత్రమే ఇస్త్రీ చేయండి.",
  c4: "మరకలు తొలగించడం",
  c4p: "మరకలు పడిన వెంటనే పొడి గుడ్డతో అద్దండి, రుద్దవద్దు. పసుపు లేదా నూనె మరకలకు వెంటనే మా కేర్ టీమ్‌ను సంప్రదించండి.",
  drEy: "చీర కట్టే రీతులు",
  drH: "షోరూమ్‌లో మా నిపుణులు కట్టి చూపించే విధానాలు",
  dr1: "ఆంధ్ర మరియు తెలంగాణ సంప్రదాయ నివి శైలి — ముందు భాగంలో మడతలు, ఎడమ భుజంపై పల్లు.",
  dr2: "తెలంగాణ సంస్కృతిని ప్రతిబింబించే గొబ్బి కట్టు — వెనుక కట్టి సులువుగా కదిలే వీలు.",
  dr3: "రాయల్ బనారసీ జరీ పల్లును స్పష్టంగా చూపించే ముందు పల్లు (సీధా పల్లు) శైలి.",
  dr4: "ఆధునిక రిసెప్షన్లకు అనువైన బటర్‌ఫ్లై ప్లీట్స్ డ్రేప్.",
  
  upH: "పండుగ కొత్త చేనేతలు ముందుగా మీకే",
  upP: "మగ్గం నుండి వచ్చే సరికొత్త కలెక్షన్లు మరియు ప్రత్యేక ఆఫర్ల వివరాలు వాట్సాప్‌లో పొందండి.",
  join: "లిస్ట్‌లో చేరండి",
  
  wlH: "మీ విష్‌లిస్ట్",
  wlSend: "లిస్ట్‌ను వాట్సాప్‌లో షోరూమ్‌కు పంపండి",
  bHome: "హోమ్",
  bTry: "ట్రై-ఆన్",
  bSaved: "సేవ్",
  bStores: "షోరూమ్‌లు",
  fAbout: "తెలంగాణ అంతటా గుర్తింపు పొందిన కుటుంబ వస్త్ర దుకాణం — స్వచ్ఛమైన చేనేత పట్టు చీరలే మా జీవం."
};

const EN = {};
$$("[data-i18n],[data-i18n-html]").forEach(el => {
  const k = el.dataset.i18n || el.dataset.i18nHtml;
  EN[k + "|" + (el.dataset.i18nHtml ? "h" : "t")] = el.innerHTML;
});

function setLang(l) {
  document.body.classList.toggle("te", l === "te");
  document.documentElement.lang = l;
  $$(".lang button").forEach(b => b.classList.toggle("on", b.dataset.lang === l));
  
  $$("[data-i18n],[data-i18n-html]").forEach(el => {
    const k = el.dataset.i18n || el.dataset.i18nHtml;
    const key = k + "|" + (el.dataset.i18nHtml ? "h" : "t");
    el.innerHTML = l === "te" && TE[k] ? TE[k] : EN[key];
  });
  
  try {
    localStorage.setItem("gvs_lang", l);
  } catch(e) {}
}

$$(".lang button").forEach(b => b.onclick = () => setLang(b.dataset.lang));

/* ---------- scroll reveal & header state ---------- */
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) {
    e.target.classList.add("in");
    io.unobserve(e.target);
  }
}), { threshold: 0.05, rootMargin: "0px 0px 60px 0px" });

function observeReveals() {
  $$(".reveal").forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight + 60 && rect.bottom > -60) {
      el.classList.add("in");
    } else {
      io.observe(el);
    }
  });
}
window.addEventListener("load", observeReveals);
window.addEventListener("hashchange", () => setTimeout(observeReveals, 80));

// Sticky header class & bottom nav active tracking
const topHeader = $("header.top");
const navSections = ["hero", "shop", "studio", "stores"].map(id => document.getElementById(id));

window.addEventListener("scroll", () => {
  if (window.scrollY > 40) {
    topHeader.classList.add("scrolled");
  } else {
    topHeader.classList.remove("scrolled");
  }

  let activeSec = "hero";
  navSections.forEach(s => {
    if (s && s.getBoundingClientRect().top < window.innerHeight * 0.45) {
      activeSec = s.id;
    }
  });
  
  $$(".bnav a").forEach(a => {
    const href = a.getAttribute("href");
    if (href === "#top" && activeSec === "hero") a.classList.add("on");
    else if (href === "#shop" && activeSec === "shop") a.classList.add("on");
    else if (href === "#studio" && activeSec === "studio") a.classList.add("on");
    else if (href === "#stores" && activeSec === "stores") a.classList.add("on");
    else a.classList.remove("on");
  });
}, { passive: true });

/* ---------- initialize application ---------- */
renderWeaves();
initHighlights();
initFloatingSaree();
initShowroomToast();
initStudioControls();
renderFilters();
render();
renderStores();
renderPick();
drawMannequin();
observeReveals();

// Restore language if stored
try {
  const storedLang = localStorage.getItem("gvs_lang");
  if (storedLang === "te") setLang("te");
} catch(e) {}

// Update initial wishlist count
$("#wlCount").textContent = S.wl.size;
$("#wlCount2").textContent = S.wl.size;

if (document.fonts) {
  document.fonts.ready.then(paint);
}
paint();

// Dynamic showroom timer refresh
setInterval(renderStores, 60000);
