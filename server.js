// Garuda Vastra Silks — website + admin panel + billing counter server
// Run:  npm install  →  npm start  →  http://localhost:3000  (admin: /admin)
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const { db, DATA_DIR } = require('./backend/db');
const api = require('./backend/api');

const PORT = process.env.PORT || 3000;
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Security headers. The public site keeps its own inline scripts, so CSP is applied to /admin only.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cookieParser());

/* ---------- Virtual Try-On API (unchanged behaviour) ---------- */
app.post('/api/tryon', express.json({ limit: '25mb' }), (req, res) => {
  const { sareeId, sareeName, apiKey, provider } = req.body || {};
  const effectiveKey = apiKey || process.env.GEMINI_API_KEY || process.env.TRYON_API_KEY || process.env.REPLICATE_API_TOKEN;
  if (effectiveKey && (provider === 'gemini' || !provider)) {
    console.log(`[API /tryon] Processing external AI request for saree: ${sareeName} using provider: ${provider || 'gemini'}`);
  }
  res.json({
    success: true,
    sareeId: sareeId || 1,
    sareeName: sareeName || 'Heritage Silk Saree',
    provider: effectiveKey ? (provider || 'gemini-ai') : 'atelier-neural-blend',
    hasApiKey: !!effectiveKey,
    message: effectiveKey
      ? `Photorealistic AI drape synthesized successfully for ${sareeName}`
      : `Atelier Neural Engine drape generated for ${sareeName}. You can enter a custom API key in AI Settings anytime.`,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/tryon/status', (req, res) => {
  res.json({
    ok: true,
    service: 'Garuda Vastra Neural Atelier Studio',
    hasEnvKey: !!(process.env.GEMINI_API_KEY || process.env.TRYON_API_KEY || process.env.REPLICATE_API_TOKEN)
  });
});

/* ---------- Admin + billing API ---------- */
app.use('/api', api);

/* ---------- Admin panel (strict CSP) ---------- */
const adminCsp = helmet.contentSecurityPolicy({
  useDefaults: false,
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
    mediaSrc: ["'self'", 'blob:'],
    connectSrc: ["'self'"],
    frameAncestors: ["'self'"],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"]
  }
});
app.get('/admin/vendor/html5-qrcode.min.js', (req, res) =>
  res.sendFile(require.resolve('html5-qrcode/html5-qrcode.min.js')));
app.use('/admin', adminCsp, express.static(path.join(__dirname, 'admin'), { extensions: ['html'], index: 'index.html' }));
app.get('/pos', (req, res) => res.redirect('/admin/pos.html'));

/* ---------- Public website (only these files are served — never /data, /backend or .env) ---------- */
app.use('/src', express.static(path.join(__dirname, 'src'), { index: false }));
app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.use((req, res) => res.status(404).type('text').send('404 Not Found'));

/* ---------- Automatic daily database backup (keeps last 30) ---------- */
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
async function backupNow() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  const file = path.join(BACKUP_DIR, `garuda-${stamp}.db`);
  if (fs.existsSync(file)) return;
  await db.backup(file);
  const old = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.db')).sort();
  old.slice(0, Math.max(0, old.length - 30)).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
  console.log('Database backup saved:', file);
}
backupNow().catch(e => console.error('Backup failed:', e.message));
setInterval(() => backupNow().catch(e => console.error('Backup failed:', e.message)), 60 * 60 * 1000).unref();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Garuda Vastra Silks running:`);
  console.log(`  Website        → http://localhost:${PORT}/`);
  console.log(`  Admin panel    → http://localhost:${PORT}/admin`);
  console.log(`  Billing counter→ http://localhost:${PORT}/admin/pos.html`);
});
