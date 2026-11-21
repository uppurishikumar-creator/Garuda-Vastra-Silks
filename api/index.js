// Vercel serverless entry: every /api/* request is handled by the same Express app used locally.
// Static pages (website, /admin) are served by Vercel's CDN from dist/ (see scripts/vercel-build.js).
let app = null, loadError = null;
try {
  app = require('../backend/app');
} catch (e) {
  loadError = e;
  console.error('Server failed to start:', e);
}

module.exports = (req, res) => {
  if (loadError) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Server failed to start: ' + loadError.message }));
  }
  // Normally Vercel passes the original URL (/api/...). If it arrives as the rewrite target
  // (/api/index?path=...), rebuild the original path so Express routes still match.
  if (req.url.startsWith('/api/index')) {
    const u = new URL(req.url, 'http://local');
    const p = u.searchParams.get('path') || '';
    u.searchParams.delete('path');
    const qs = u.searchParams.toString();
    req.url = '/api/' + p + (qs ? '?' + qs : '');
  }
  return app(req, res);
};
