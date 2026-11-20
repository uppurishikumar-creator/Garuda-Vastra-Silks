const fs = require('fs');
const path = require('path');

// Colors
const GOLD_LIGHT = '#F4E6C3';
const GOLD_MAIN = '#D4AF37';
const GOLD_ANTIQUE = '#C5A04A';
const GOLD_DARK = '#8A6D2B';
const GOLD_DEEP = '#5C4416';
const EMERALD_LIGHT = '#25856E';
const EMERALD_MAIN = '#153F36';
const EMERALD_DARK = '#0D2923';
const PLUM_DARK = '#211C2B';
const PLUM_DEEPER = '#16121D';
const IVORY_WARM = '#F5EFE4';

function getEmblemSvg(mode = 'dark', showPedestal = true) {
  // mode: 'dark' for dark backgrounds (bright gold/ivory highlights), 'light' for light backgrounds (antique gold + deep plum)
  const isLight = mode === 'light';
  
  const gMain = isLight ? '#A67C2E' : '#D4AF37';
  const gLight = isLight ? '#C5A04A' : '#F7E7C4';
  const gDark = isLight ? '#664C1B' : '#8A6D2B';
  const gShine = isLight ? '#E5C158' : '#FFF5DC';
  const accentJewel = isLight ? '#0F382E' : '#1FD6A5';

  return `
  <defs>
    <linearGradient id="goldGrad_${mode}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${gShine}" />
      <stop offset="25%" stop-color="${gLight}" />
      <stop offset="60%" stop-color="${gMain}" />
      <stop offset="100%" stop-color="${gDark}" />
    </linearGradient>

    <linearGradient id="goldH_${mode}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${gShine}" />
      <stop offset="45%" stop-color="${gMain}" />
      <stop offset="100%" stop-color="${gDark}" />
    </linearGradient>

    <linearGradient id="emeraldGrad_${mode}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="40%" stop-color="#10B981" />
      <stop offset="80%" stop-color="${EMERALD_MAIN}" />
      <stop offset="100%" stop-color="${EMERALD_DARK}" />
    </linearGradient>

    <filter id="goldGlow_${mode}" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="${isLight ? '0.8' : '1.5'}" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <!-- RIGHT HALF OF GARUDA (Symmetrically mirrored) -->
    <g id="garudaHalf_${mode}">
      <!-- CROWN / MUKUTA SIDE FLAMES -->
      <path d="M 6,-188 C 14,-212 28,-226 44,-235 C 38,-210 28,-195 18,-180 Z" fill="url(#goldGrad_${mode})" />
      <path d="M 16,-178 C 30,-198 48,-208 62,-214 C 52,-192 38,-180 26,-166 Z" fill="url(#goldGrad_${mode})" />
      <path d="M 12,-160 C 22,-168 34,-172 42,-172 C 34,-158 24,-152 14,-148 Z" fill="url(#goldGrad_${mode})" />

      <!-- UPPER FLAME WING TIPS (Rising graceful plumes) -->
      <!-- Plume 1 (Highest inner flame) -->
      <path d="M 28,-120 C 45,-165 72,-215 110,-248 C 98,-215 82,-180 72,-145 C 68,-130 52,-115 28,-120 Z" fill="url(#goldGrad_${mode})" />
      <!-- Plume 2 -->
      <path d="M 68,-140 C 92,-185 130,-235 178,-260 C 160,-225 140,-185 125,-150 C 115,-128 92,-118 68,-140 Z" fill="url(#goldGrad_${mode})" />
      <!-- Plume 3 (Tallest peak of wing) -->
      <path d="M 115,-145 C 145,-190 190,-240 245,-262 C 225,-220 198,-175 178,-135 C 162,-105 138,-115 115,-145 Z" fill="url(#goldGrad_${mode})" />
      <!-- Plume 4 (Outer crest tip) -->
      <path d="M 168,-130 C 205,-168 255,-212 305,-228 C 285,-190 252,-148 226,-112 C 210,-90 188,-102 168,-130 Z" fill="url(#goldGrad_${mode})" />

      <!-- PRIMARY FLIGHT FEATHERS (Sweeping outward and curving) -->
      <!-- Feather 1 -->
      <path d="M 210,-100 C 255,-130 310,-162 355,-168 C 330,-132 292,-95 258,-65 C 240,-48 225,-75 210,-100 Z" fill="url(#goldGrad_${mode})" />
      <!-- Feather 2 -->
      <path d="M 235,-60 C 285,-85 342,-108 382,-105 C 352,-75 310,-42 272,-18 C 252,-4 240,-35 235,-60 Z" fill="url(#goldGrad_${mode})" />
      <!-- Feather 3 -->
      <path d="M 245,-15 C 295,-35 352,-50 390,-40 C 355,-15 310,12 268,32 C 248,42 242,12 245,-15 Z" fill="url(#goldGrad_${mode})" />
      <!-- Feather 4 -->
      <path d="M 238,28 C 285,15 340,10 375,25 C 338,45 292,68 248,82 C 230,88 230,55 238,28 Z" fill="url(#goldGrad_${mode})" />
      <!-- Feather 5 -->
      <path d="M 218,72 C 260,68 310,72 342,92 C 305,108 260,122 216,128 C 200,130 206,98 218,72 Z" fill="url(#goldGrad_${mode})" />
      <!-- Feather 6 -->
      <path d="M 188,112 C 226,115 268,126 295,150 C 260,162 218,168 178,165 C 165,164 175,135 188,112 Z" fill="url(#goldGrad_${mode})" />
      <!-- Feather 7 (Lowest sweep) -->
      <path d="M 152,148 C 185,158 220,175 242,202 C 210,208 172,205 138,194 C 128,190 140,166 152,148 Z" fill="url(#goldGrad_${mode})" />

      <!-- SECONDARY TIER FEATHERS (Layered under primaries) -->
      <path d="M 145,-75 C 185,-95 228,-115 258,-118 C 240,-95 212,-72 188,-52 C 172,-40 158,-58 145,-75 Z" fill="url(#goldH_${mode})" opacity="0.9" />
      <path d="M 160,-38 C 200,-52 242,-65 272,-62 C 250,-42 220,-22 192,-6 C 178,2 168,-18 160,-38 Z" fill="url(#goldH_${mode})" opacity="0.9" />
      <path d="M 162,-2 C 198,-12 238,-18 265,-10 C 242,8 212,24 184,36 C 172,42 166,20 162,-2 Z" fill="url(#goldH_${mode})" opacity="0.9" />
      <path d="M 148,32 C 182,28 218,30 242,42 C 220,58 190,70 160,78 C 150,80 148,56 148,32 Z" fill="url(#goldH_${mode})" opacity="0.9" />
      <path d="M 128,68 C 158,68 190,75 210,90 C 188,102 162,110 134,112 C 125,112 126,90 128,68 Z" fill="url(#goldH_${mode})" opacity="0.9" />
      <path d="M 104,102 C 130,105 158,115 174,130 C 152,138 128,142 105,140 C 98,138 102,120 104,102 Z" fill="url(#goldH_${mode})" opacity="0.9" />

      <!-- INNER WING FILIGREE (Etched feather ribs) -->
      <path d="M 82,-70 C 112,-82 142,-90 168,-88 C 152,-72 134,-58 116,-46 C 104,-38 92,-52 82,-70 Z" fill="url(#goldGrad_${mode})" />
      <path d="M 90,-35 C 118,-42 148,-46 172,-40 C 155,-26 136,-14 118,-4 C 108,2 98,-15 90,-35 Z" fill="url(#goldGrad_${mode})" />
      <path d="M 88,-2 C 115,-4 142,-4 164,6 C 146,18 126,28 106,34 C 98,36 94,18 88,-2 Z" fill="url(#goldGrad_${mode})" />
      <path d="M 78,30 C 102,30 126,34 145,45 C 128,55 110,62 90,66 C 82,66 80,48 78,30 Z" fill="url(#goldGrad_${mode})" />
      <path d="M 64,62 C 84,65 104,72 120,84 C 104,92 88,96 70,96 C 64,95 64,80 64,62 Z" fill="url(#goldGrad_${mode})" />

      <!-- RIGHT CHEST PECTORAL / TEMPLE ARMOR -->
      <path d="M 0,-75 C 22,-75 42,-70 54,-55 C 50,-35 38,-18 20,-8 C 10,-4 4,-6 0,-8 Z" fill="url(#goldGrad_${mode})" />
      <path d="M 0,-5 C 26,-4 46,10 52,28 C 44,42 28,52 14,56 C 6,58 2,58 0,58 Z" fill="url(#goldH_${mode})" />
      <path d="M 0,62 C 22,62 38,72 44,88 C 36,98 22,106 10,108 C 4,108 0,108 0,108 Z" fill="url(#goldGrad_${mode})" />
      
      <!-- CHEST ORNAMENTAL SCROLL EMBELLISHMENTS -->
      <path d="M 12,-48 C 24,-48 34,-40 34,-28 C 34,-16 22,-18 14,-22 C 12,-32 10,-40 12,-48 Z" fill="${isLight ? '#FFFFFF' : '#FFF8E7'}" opacity="0.5" />
      <path d="M 14,14 C 26,14 36,22 36,32 C 36,42 24,42 16,38 C 14,30 12,22 14,14 Z" fill="${isLight ? '#FFFFFF' : '#FFF8E7'}" opacity="0.4" />

      <!-- RIGHT LEG & TALONS (Clawing downward onto base) -->
      <!-- Thigh scales -->
      <path d="M 28,115 C 42,118 56,128 62,142 C 58,155 46,165 32,168 C 24,152 22,132 28,115 Z" fill="url(#goldGrad_${mode})" />
      <path d="M 32,168 C 45,172 56,182 60,195 C 54,208 42,216 28,218 C 22,202 24,185 32,168 Z" fill="url(#goldH_${mode})" />
      <!-- Leg shank -->
      <path d="M 36,218 C 48,222 54,232 56,248 C 50,260 38,266 26,266 C 24,250 28,234 36,218 Z" fill="url(#goldGrad_${mode})" />
      <!-- Outer Talon -->
      <path d="M 52,248 C 68,252 85,264 96,282 C 98,295 90,305 78,304 C 70,292 60,278 48,268 Z" fill="url(#goldGrad_${mode})" />
      <path d="M 96,282 C 104,295 106,310 98,322 C 92,324 88,318 88,310 C 88,298 84,288 78,280 Z" fill="${gShine}" />
      <!-- Middle Talon -->
      <path d="M 40,265 C 52,272 64,286 68,306 C 68,322 58,332 48,332 C 44,318 40,302 34,288 Z" fill="url(#goldGrad_${mode})" />
      <path d="M 68,306 C 72,322 70,338 58,348 C 54,348 50,342 52,334 C 54,324 52,314 48,306 Z" fill="${gShine}" />
      <!-- Inner Talon -->
      <path d="M 26,268 C 32,278 36,294 34,312 C 30,324 20,328 14,324 C 16,310 18,295 18,280 Z" fill="url(#goldGrad_${mode})" />
      <!-- Talon back spur -->
      <path d="M 28,242 C 20,248 10,252 2,254 C 6,242 15,235 24,232 Z" fill="url(#goldH_${mode})" />

      <!-- RIGHT TAIL FEATHERS (Spreading downward) -->
      <!-- Tail feather 1 (adjacent to center) -->
      <path d="M 6,128 C 16,145 22,175 24,212 C 24,250 20,285 14,318 C 8,312 4,280 2,240 C 0,195 2,155 6,128 Z" fill="url(#goldGrad_${mode})" />
      <!-- Tail feather 2 -->
      <path d="M 18,175 C 32,195 44,228 48,265 C 50,300 44,332 34,360 C 26,352 24,322 22,285 C 20,248 18,208 18,175 Z" fill="url(#goldH_${mode})" />
      <!-- Tail feather 3 (outer fan) -->
      <path d="M 36,220 C 56,245 74,278 82,318 C 86,355 78,388 64,412 C 54,402 54,370 52,335 C 50,295 46,255 36,220 Z" fill="url(#goldGrad_${mode})" />
      <!-- Scalloped lotus tail embellishment -->
      <path d="M 34,360 C 44,385 54,408 64,412 C 48,416 32,410 18,395 C 24,382 30,370 34,360 Z" fill="url(#goldH_${mode})" />

      <!-- ORNATE PEDESTAL RIGHT SCROLL -->
      <path d="M 8,328 C 30,330 58,338 80,355 C 98,370 106,392 98,410 C 88,418 72,412 68,398 C 66,382 55,370 38,362 C 24,355 12,352 8,350 Z" fill="url(#goldGrad_${mode})" />
      <path d="M 38,362 C 54,368 68,380 70,396 C 58,400 44,395 34,385 C 32,376 34,368 38,362 Z" fill="${gShine}" opacity="0.6" />
    </g>
  </defs>

  <!-- CENTER ELEMENTS (Crown Spire, Head, Beak, Central Jewels, Central Tail) -->
  <g id="garudaCenter_${mode}">
    <!-- CENTRAL CROWN SPIRE (Mukuta) -->
    <path d="M 0,-260 C 6,-235 12,-205 10,-175 C 4,-170 -4,-170 -10,-175 C -12,-205 -6,-235 0,-260 Z" fill="url(#goldGrad_${mode})" />
    <path d="M 0,-260 L 0,-175" stroke="${gShine}" stroke-width="2" />
    <!-- Crown Finial Lotus Tip -->
    <circle cx="0" cy="-264" r="5" fill="${gShine}" />
    <!-- Crown Emerald Cabochon -->
    <ellipse cx="0" cy="-182" rx="7" ry="9" fill="url(#emeraldGrad_${mode})" stroke="${gShine}" stroke-width="1.5" />
    <ellipse cx="-2" cy="-184" rx="2" ry="3" fill="#A7F3D0" opacity="0.8" />

    <!-- CROWN HEADBAND -->
    <path d="M -22,-168 C -8,-172 8,-172 22,-168 C 24,-158 20,-152 14,-150 C 4,-152 -4,-152 -14,-150 C -20,-152 -24,-158 -22,-168 Z" fill="url(#goldGrad_${mode})" stroke="${gDark}" stroke-width="1" />

    <!-- EAGLE FOREHEAD & NOBLE BROW -->
    <path d="M -16,-150 C -6,-154 6,-154 16,-150 C 22,-138 20,-125 14,-115 C 6,-112 -6,-112 -14,-115 C -20,-125 -22,-138 -16,-150 Z" fill="url(#goldGrad_${mode})" />
    <!-- Forehead Tilak / Third Eye Flame -->
    <path d="M 0,-146 C 3,-138 4,-130 0,-122 C -4,-130 -3,-138 0,-146 Z" fill="url(#emeraldGrad_${mode})" />

    <!-- PIERCING EYES -->
    <!-- Left Eye -->
    <path d="M -15,-128 C -11,-132 -6,-131 -3,-127 C -6,-124 -11,-124 -15,-128 Z" fill="${isLight ? PLUM_DARK : '#0A080E'}" />
    <circle cx="-8" cy="-128" r="1.8" fill="${gShine}" />
    <!-- Right Eye -->
    <path d="M 3,-127 C 6,-131 11,-132 15,-128 C 11,-124 6,-124 3,-127 Z" fill="${isLight ? PLUM_DARK : '#0A080E'}" />
    <circle cx="8" cy="-128" r="1.8" fill="${gShine}" />

    <!-- MAJESTIC EAGLE BEAK (Sharp curved predator beak) -->
    <path d="M -10,-120 C -4,-118 4,-118 10,-120 C 12,-105 8,-90 0,-74 C -8,-90 -12,-105 -10,-120 Z" fill="url(#goldGrad_${mode})" />
    <path d="M 0,-120 L 0,-74" stroke="${gShine}" stroke-width="1.5" />
    <path d="M -4,-96 C -2,-84 0,-76 0,-74 C 0,-76 2,-84 4,-96 Z" fill="${gDark}" />

    <!-- CENTRAL PECTORAL EMERALD MEDALLION -->
    <!-- Medallion Frame -->
    <path d="M 0,-35 C 16,-35 28,-22 28,-5 C 28,14 16,30 0,38 C -16,30 -28,14 -28,-5 C -28,-22 -16,-35 0,-35 Z" fill="url(#goldGrad_${mode})" stroke="${gShine}" stroke-width="2" />
    <!-- Emerald Jewel Oval -->
    <ellipse cx="0" cy="-4" rx="14" ry="18" fill="url(#emeraldGrad_${mode})" stroke="${gShine}" stroke-width="1.5" />
    <!-- Jewel Facet Highlights -->
    <ellipse cx="-4" cy="-8" rx="4" ry="6" fill="#A7F3D0" opacity="0.8" />
    <polygon points="0,-18 8,-4 0,10 -8,-4" fill="none" stroke="#6EE7B7" stroke-width="0.8" opacity="0.6" />

    <!-- LOWER CENTRAL BREASTPLATE CHEVRONS -->
    <path d="M 0,38 L 18,55 L 12,68 L 0,56 L -12,68 L -18,55 Z" fill="url(#goldGrad_${mode})" />
    <path d="M 0,58 L 16,74 L 10,86 L 0,76 L -10,86 L -16,74 Z" fill="url(#goldH_${mode})" />
    <path d="M 0,78 L 14,94 L 8,104 L 0,96 L -8,104 L -14,94 Z" fill="url(#goldGrad_${mode})" />

    <!-- CENTER TAIL FEATHER (Vertical axis spine) -->
    <path d="M 0,110 C 6,150 8,200 8,260 C 8,310 5,360 0,400 C -5,360 -8,310 -8,260 C -8,200 -6,150 0,110 Z" fill="url(#goldGrad_${mode})" />
    <path d="M 0,110 L 0,400" stroke="${gShine}" stroke-width="1.5" />
    <!-- Center tail lotus spearhead tip -->
    <path d="M 0,420 C 8,405 10,390 0,375 C -10,390 -8,405 0,420 Z" fill="url(#goldH_${mode})" />

    <!-- CENTRAL LOTUS PEDESTAL CREST -->
    <path d="M 0,332 C 14,332 24,342 20,358 C 12,364 0,366 0,366 C 0,366 -12,364 -20,358 C -24,342 -14,332 0,332 Z" fill="url(#goldGrad_${mode})" stroke="${gShine}" stroke-width="1" />
    <circle cx="0" cy="348" r="4" fill="url(#emeraldGrad_${mode})" />
  </g>

  <!-- ASSEMBLED SYMMETRICAL GARUDA -->
  <g id="garudaEagle_${mode}">
    <!-- Right Half -->
    <use href="#garudaHalf_${mode}" />
    <!-- Left Half (Mathematically perfect mirror reflection) -->
    <use href="#garudaHalf_${mode}" transform="scale(-1, 1)" />
    <!-- Center Column -->
    <use href="#garudaCenter_${mode}" />
  </g>
`;
}

// 1. Primary Full Logo (Emblem + GARUDA STYLES Wordmark)
function createFullLogo(mode = 'dark', width = 720, height = 300) {
  const isLight = mode === 'light';
  const textColor = isLight ? PLUM_DARK : '#FFFFFF';
  const goldColor = isLight ? '#99732B' : '#D4AF37';
  const mutedColor = isLight ? '#665E55' : '#D8CFBE';
  const emblemY = 110;
  const emblemScale = 0.36;

  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  ${getEmblemSvg(mode)}
  
  <!-- Garuda Emblem Centered -->
  <g transform="translate(${width / 2}, ${emblemY}) scale(${emblemScale})">
    <use href="#garudaEagle_${mode}" />
  </g>

  <!-- Luxury Brand Wordmark -->
  <!-- Brand Name: GARUDA STYLES -->
  <text x="${width / 2}" y="222" 
        text-anchor="middle" 
        fill="${textColor}" 
        font-family="'Playfair Display', 'Cormorant Garamond', 'Cinzel', Georgia, serif" 
        font-size="34" 
        font-weight="600" 
        letter-spacing="7"
        style="text-transform: uppercase;">
    GARUDA STYLES
  </text>

  <!-- Subtitle / Heritage Tagline -->
  <text x="${width / 2}" y="252" 
        text-anchor="middle" 
        fill="${goldColor}" 
        font-family="'Inter', -apple-system, sans-serif" 
        font-size="10.5" 
        font-weight="500" 
        letter-spacing="5.5"
        style="text-transform: uppercase;">
    HAUTE SILKS &amp; COUTURE · EST. TELANGANA
  </text>

  <!-- Accent Divider Flourish -->
  <path d="M ${width / 2 - 80},265 L ${width / 2 - 20},265 M ${width / 2 + 20},265 L ${width / 2 + 80},265" 
        stroke="${goldColor}" stroke-width="0.8" opacity="0.6" />
  <polygon points="${width / 2},263 ${width / 2 + 3},265 ${width / 2},267 ${width / 2 - 3},265" 
           fill="${goldColor}" />
</svg>`;
}

// 2. Compact Horizontal Navbar Logo (Emblem on Left, Wordmark on Right)
function createNavbarLogo(mode = 'light', width = 380, height = 70) {
  const isLight = mode === 'light';
  const textColor = isLight ? PLUM_DARK : '#FFFFFF';
  const goldColor = isLight ? '#99732B' : '#D4AF37';
  const emblemX = 42;
  const emblemY = 35;
  const emblemScale = 0.088;

  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  ${getEmblemSvg(mode)}

  <!-- Emblem on Left -->
  <g transform="translate(${emblemX}, ${emblemY}) scale(${emblemScale})">
    <use href="#garudaEagle_${mode}" />
  </g>

  <!-- Wordmark on Right -->
  <text x="88" y="38" 
        fill="${textColor}" 
        font-family="'Playfair Display', 'Cormorant Garamond', 'Cinzel', Georgia, serif" 
        font-size="21" 
        font-weight="600" 
        letter-spacing="4"
        style="text-transform: uppercase;">
    GARUDA STYLES
  </text>

  <text x="90" y="53" 
        fill="${goldColor}" 
        font-family="'Inter', -apple-system, sans-serif" 
        font-size="8.5" 
        font-weight="500" 
        letter-spacing="3"
        style="text-transform: uppercase;">
    HAUTE SILKS &amp; COUTURE
  </text>
</svg>`;
}

// 3. Standalone Emblem (Favicon / Avatar / App Icon)
function createStandaloneEmblem(mode = 'dark', size = 512) {
  return `<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  ${getEmblemSvg(mode)}
  
  <g transform="translate(${size / 2}, ${size / 2 - 10}) scale(0.56)">
    <use href="#garudaEagle_${mode}" />
  </g>
</svg>`;
}

// Write files
const srcDir = path.join(__dirname, '..', 'src');

// 1. Primary logos
fs.writeFileSync(path.join(srcDir, 'logo-garuda-styles-dark.svg'), createFullLogo('dark'));
fs.writeFileSync(path.join(srcDir, 'logo-garuda-styles-light.svg'), createFullLogo('light'));
fs.writeFileSync(path.join(srcDir, 'logo-garuda-styles.svg'), createFullLogo('dark')); // primary default

// 2. Navbar horizontal logos
fs.writeFileSync(path.join(srcDir, 'logo-nav-light.svg'), createNavbarLogo('light'));
fs.writeFileSync(path.join(srcDir, 'logo-nav-dark.svg'), createNavbarLogo('dark'));

// 3. Standalone emblem & Favicon
fs.writeFileSync(path.join(srcDir, 'garuda-emblem-dark.svg'), createStandaloneEmblem('dark'));
fs.writeFileSync(path.join(srcDir, 'garuda-emblem-light.svg'), createStandaloneEmblem('light'));
fs.writeFileSync(path.join(srcDir, 'favicon.svg'), createStandaloneEmblem('dark'));

console.log('Successfully generated all Garuda Styles vector assets in src/');
