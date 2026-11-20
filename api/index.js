// Vercel serverless entry: every /api/* request is handled by the same Express app used locally.
// Static pages (website, /admin) are served by Vercel's CDN from dist/ (see scripts/vercel-build.js).
const app = require('../backend/app');

module.exports = (req, res) => {
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
