const fs = require('fs');
const path = require('path');

const bodyPath = path.join(__dirname, '..', 'src', 'body.html');
let html = fs.readFileSync(bodyPath, 'utf8');

// 1. Family collections
html = html.replace(
  /src="__C1__chatgpt-image-sep-10-2026-07_59_17-pm-H4VgL\.png"\s+alt="Women's ethnic collections"\s+onerror="fb\(this,2\)"/,
  'src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=900&q=85" alt="Women\'s royal bridal &amp; silk collections"'
);

html = html.replace(
  /src="__C1__550216eb7d0e68681604a8153385e19b\.jpg"\s+alt="Men's wedding and formal wear"\s+onerror="fb\(this,6\)"/,
  'src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=900&q=85" alt="Men\'s royal wedding and festive wear"'
);

html = html.replace(
  /src="__C1__23c02bbd77ce9ee97c6d227da5ea8371\.jpg"\s+alt="Kids festive and party wear"\s+onerror="fb\(this,9\)"/,
  'src="https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?auto=format&fit=crop&w=900&q=85" alt="Kids traditional festive silk wear"'
);

// 2. Heritage artisan loom
html = html.replace(
  /src="__C1__48a76f92d63b844992f404965bfa0683\.webp"\s+alt="Artisan weaving silk saree"\s+onerror="fb\(this,0\)"/,
  'src="https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?auto=format&fit=crop&w=1200&q=85" alt="Master artisan weaving silk saree on traditional loom"'
);

// 3. Bridal consultation suite
html = html.replace(
  /<div class="booking-art reveal">\s*<img loading="lazy" src="__C1__48a76f92d63b844992f404965bfa0683\.webp" alt="Bridal consultation suite" onerror="fb\(this,0\)">\s*<div class="overlay-card">\s*<b data-i18n="bkL">The Bridal Atelier Experience<\/b>/,
  `<div class="booking-art reveal">
   <img loading="lazy" src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=1200&q=85" alt="Bridal consultation atelier suite at Garuda Styles">
   <div class="booking-sheen" aria-hidden="true"></div>
   <div class="overlay-card">
    <span class="booking-badge">✦ PRIVATE BRIDAL ATELIER</span>
    <b data-i18n="bkL">The Bespoke Bridal Experience</b>`
);

// 4. Footer branding
html = html.replace(
  /<div class="brand-name">Garuda Vastra Silks<\/div>\s*<div class="te-name">గరుడ వస్త్ర సిల్క్స్<\/div>/,
  `<img src="__LOGO_NAV_DARK__" alt="Garuda Styles" class="footer-logo-img">
    <div class="brand-name" style="font-size:1.45rem">Garuda Styles</div>
    <div class="te-name">గరుడ స్టైల్స్ · వస్త్ర సిల్క్స్</div>`
);

html = html.replace(
  /© 2026 Garuda Vastra Silks\. All rights reserved\./g,
  '© 2026 Garuda Styles. All rights reserved.'
);

fs.writeFileSync(bodyPath, html, 'utf8');
console.log('Successfully updated src/body.html!');
