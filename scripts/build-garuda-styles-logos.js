const fs = require('fs');
const path = require('path');

const rawSvg = fs.readFileSync('screenshots/potrace-raw.svg', 'utf8');
const pathDataMatch = rawSvg.match(/d="([^"]+)"/);
if (!pathDataMatch) throw new Error('No path data in potrace-raw.svg');
const fullD = pathDataMatch[1];
const eagleD = fullD.replace(/^M -0 112\.504[^M]+M 0\.483[^M]+/, '').trim();

// Palette
const GOLD_SHINE = '#FFF6DC';
const GOLD_LIGHT = '#F4E5B8';
const GOLD_MAIN = '#D4AF37';
const GOLD_ANTIQUE = '#C5A04A';
const GOLD_DARK = '#8A6D2B';
const GOLD_DEEPER = '#5A4315';

const PLUM_DARK = '#211C2B';
const PLUM_DEEP = '#17131F';
const EMERALD_LIGHT = '#34D399';
const EMERALD_MAIN = '#10B981';
const EMERALD_DARK = '#153F36';
const EMERALD_DEEP = '#0B2620';
const IVORY_WARM = '#F5EFE4';

function buildEmblemGroup(mode = 'dark', scale = 1) {
  const isLight = mode === 'light';
  
  const gMain = isLight ? '#99732A' : '#D4AF37';
  const gLight = isLight ? '#BF953F' : '#F7E7C4';
  const gDark = isLight ? '#664B17' : '#8A6D2B';
  const gShine = isLight ? '#DFC27D' : '#FFF6DC';

  return `
    <defs>
      <linearGradient id="goldGrad_${mode}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${gShine}" />
        <stop offset="25%" stop-color="${gLight}" />
        <stop offset="65%" stop-color="${gMain}" />
        <stop offset="100%" stop-color="${gDark}" />
      </linearGradient>

      <linearGradient id="emeraldGrad_${mode}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${EMERALD_LIGHT}" />
        <stop offset="35%" stop-color="${EMERALD_MAIN}" />
        <stop offset="80%" stop-color="${EMERALD_DARK}" />
        <stop offset="100%" stop-color="${EMERALD_DEEP}" />
      </linearGradient>

      <filter id="goldShimmer_${mode}" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="1" stdDeviation="${isLight ? '0.5' : '1.5'}" flood-color="${isLight ? 'rgba(0,0,0,0.12)' : 'rgba(212,175,55,0.35)'}" />
      </filter>
    </defs>

    <!-- Centered Garuda Emblem Vector (Exact geometry from authentic reference) -->
    <g transform="scale(${scale})" filter="url(#goldShimmer_${mode})">
      <!-- The Garuda Eagle Body & Wings in Royal Gold -->
      <path d="${eagleD}" 
            transform="translate(-112.5, -114.5)" 
            fill="url(#goldGrad_${mode})" 
            fill-rule="evenodd" />

      <!-- Deep Emerald Medallion Accents -->
      <!-- Center Chest Jewel Cabochon -->
      <g transform="translate(0, 11)">
        <ellipse cx="0" cy="0" rx="3.8" ry="5.2" fill="url(#emeraldGrad_${mode})" stroke="${gShine}" stroke-width="0.8" />
        <ellipse cx="-1" cy="-1.5" rx="1.2" ry="1.8" fill="#D1FAE5" opacity="0.8" />
      </g>

      <!-- Crown Spire Emerald Jewel -->
      <g transform="translate(0, -26)">
        <polygon points="0,-4.5 2.5,0 0,4.5 -2.5,0" fill="url(#emeraldGrad_${mode})" stroke="${gShine}" stroke-width="0.6" />
        <circle cx="0" cy="-0.5" r="0.8" fill="#D1FAE5" />
      </g>
    </g>
  `;
}

// 1. Primary Full Luxury Brand Logo (Vertical Lockup)
function createPrimaryLogo(mode = 'dark', width = 640, height = 360) {
  const isLight = mode === 'light';
  const textColor = isLight ? PLUM_DARK : '#FFFFFF';
  const goldColor = isLight ? '#99732A' : '#D4AF37';

  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <!-- Emblem Centered -->
  <g transform="translate(${width / 2}, 130)">
    ${buildEmblemGroup(mode, 1.55)}
  </g>

  <!-- Typography: GARUDA STYLES -->
  <text x="${width / 2}" y="278" 
        text-anchor="middle" 
        fill="${textColor}" 
        font-family="'Playfair Display', 'Cormorant Garamond', 'Cinzel', Georgia, serif" 
        font-size="34" 
        font-weight="600" 
        letter-spacing="9"
        style="text-transform: uppercase;">
    GARUDA STYLES
  </text>

  <!-- Subtitle Tagline -->
  <text x="${width / 2}" y="308" 
        text-anchor="middle" 
        fill="${goldColor}" 
        font-family="'Inter', -apple-system, sans-serif" 
        font-size="10.5" 
        font-weight="500" 
        letter-spacing="6"
        style="text-transform: uppercase;">
    HAUTE SILKS &amp; COUTURE · EST. TELANGANA
  </text>

  <!-- Heritage Gold Divider -->
  <path d="M ${width / 2 - 90},322 L ${width / 2 - 25},322 M ${width / 2 + 25},322 L ${width / 2 + 90},322" 
        stroke="${goldColor}" stroke-width="0.8" opacity="0.65" />
  <polygon points="${width / 2},320 ${width / 2 + 3.5},322 ${width / 2},324 ${width / 2 - 3.5},322" 
           fill="${goldColor}" />
</svg>`;
}

// 2. Compact Horizontal Navbar Logo
function createNavbarLogo(mode = 'light', width = 380, height = 70) {
  const isLight = mode === 'light';
  const textColor = isLight ? PLUM_DARK : '#FFFFFF';
  const goldColor = isLight ? '#99732A' : '#D4AF37';

  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <!-- Emblem on Left -->
  <g transform="translate(42, 35)">
    ${buildEmblemGroup(mode, 0.44)}
  </g>

  <!-- Wordmark on Right -->
  <text x="86" y="38" 
        fill="${textColor}" 
        font-family="'Playfair Display', 'Cormorant Garamond', 'Cinzel', Georgia, serif" 
        font-size="20.5" 
        font-weight="600" 
        letter-spacing="4.5"
        style="text-transform: uppercase;">
    GARUDA STYLES
  </text>

  <text x="88" y="53" 
        fill="${goldColor}" 
        font-family="'Inter', -apple-system, sans-serif" 
        font-size="8" 
        font-weight="500" 
        letter-spacing="3.5"
        style="text-transform: uppercase;">
    HAUTE SILKS &amp; COUTURE
  </text>
</svg>`;
}

// 3. Standalone Emblem (Favicon / Avatar / App Icon)
function createStandaloneEmblem(mode = 'dark', size = 512) {
  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <g transform="translate(${size / 2}, ${size / 2})">
    ${buildEmblemGroup(mode, (size / 225) * 1.35)}
  </g>
</svg>`;
}

// Write files to src/
const srcDir = path.join(__dirname, '..', 'src');

fs.writeFileSync(path.join(srcDir, 'logo-garuda-styles-dark.svg'), createPrimaryLogo('dark'));
fs.writeFileSync(path.join(srcDir, 'logo-garuda-styles-light.svg'), createPrimaryLogo('light'));
fs.writeFileSync(path.join(srcDir, 'logo-garuda-styles.svg'), createPrimaryLogo('dark'));

fs.writeFileSync(path.join(srcDir, 'logo-nav-light.svg'), createNavbarLogo('light'));
fs.writeFileSync(path.join(srcDir, 'logo-nav-dark.svg'), createNavbarLogo('dark'));

fs.writeFileSync(path.join(srcDir, 'garuda-emblem-dark.svg'), createStandaloneEmblem('dark'));
fs.writeFileSync(path.join(srcDir, 'garuda-emblem-light.svg'), createStandaloneEmblem('light'));
fs.writeFileSync(path.join(srcDir, 'favicon.svg'), createStandaloneEmblem('dark'));

console.log('Successfully generated all Garuda Styles vector assets!');
