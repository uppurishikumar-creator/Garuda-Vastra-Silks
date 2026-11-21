// The Express app — used by server.js (laptop / VPS) and api/index.js (Vercel).
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const api = require('./api');

const ROOT = path.join(__dirname, '..');
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);

// Security headers. The public site keeps its own inline scripts, so CSP is applied to /admin only.
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cookieParser());

// Vercel pre-reads the request body and exposes it as a read-only req.body.
// Make it a normal value and tell Express's JSON parser it is already done,
// otherwise every POST (login, bills…) fails with a 500.
app.use((req, res, next) => {
  const d = Object.getOwnPropertyDescriptor(req, 'body');
  if (d && (d.get || d.writable === false)) {
    let value;
    try { value = req.body; } catch { return res.status(400).json({ error: 'Invalid request body' }); }
    try { Object.defineProperty(req, 'body', { value, writable: true, configurable: true, enumerable: true }); } catch { /* keep as is */ }
    if (value !== undefined) req._body = true;
  }
  next();
});

/* ---------- Virtual Try-On API (unchanged behaviour) ---------- */
app.post('/api/tryon', express.json({ limit: '25mb' }), (req, res) => {
  const { sareeId, sareeName, apiKey, provider } = req.body || {};
  const effectiveKey = apiKey || process.env.GEMINI_API_KEY || process.env.TRYON_API_KEY || process.env.REPLICATE_API_TOKEN;
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

/* ---------- Static files (on Vercel these are served by the CDN from dist/ instead) ---------- */
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
app.use('/admin', adminCsp, express.static(path.join(ROOT, 'admin'), { extensions: ['html'], index: 'index.html' }));
app.get('/pos', (req, res) => res.redirect('/admin/pos.html'));
app.use('/src', express.static(path.join(ROOT, 'src'), { index: false }));
app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(ROOT, 'index.html')));
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.use((req, res) => res.status(404).type('text').send('404 Not Found'));

// Last-resort error handler
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Something went wrong on the server' });
});

module.exports = app;
