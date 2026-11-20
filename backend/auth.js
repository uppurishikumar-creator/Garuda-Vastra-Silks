// Staff login with httpOnly cookie (JWT). Roles: owner > manager > cashier.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db, DATA_DIR } = require('./db');

// Secret: from .env, otherwise generated once and stored in /data (git-ignored).
function loadSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) return process.env.JWT_SECRET;
  const f = path.join(DATA_DIR, '.jwt-secret');
  if (!fs.existsSync(f)) fs.writeFileSync(f, crypto.randomBytes(48).toString('hex'));
  return fs.readFileSync(f, 'utf8').trim();
}
const SECRET = loadSecret();
const COOKIE = 'gvs_session';
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10); // keeps login timing equal for unknown users
const ROLE_RANK = { cashier: 1, manager: 2, owner: 3 };

function issue(res, user) {
  const token = jwt.sign({ uid: user.id, v: user.token_version }, SECRET, { expiresIn: '12h' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 12 * 60 * 60 * 1000,
    path: '/'
  });
}

function clear(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

function verifyPassword(username, password) {
  const u = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
  if (!u) { bcrypt.compareSync(String(password), DUMMY_HASH); return null; }
  return bcrypt.compareSync(String(password), u.password_hash) ? u : null;
}

// Middleware: requires a logged-in user. Also blocks cross-site requests:
// every API call from our pages sends the X-Requested-With header.
function requireAuth(minRole = 'cashier') {
  return (req, res, next) => {
    if (req.method !== 'GET' && req.get('X-Requested-With') !== 'gvs') {
      return res.status(403).json({ error: 'Bad request origin' });
    }
    const token = req.cookies && req.cookies[COOKIE];
    if (!token) return res.status(401).json({ error: 'Please log in' });
    let payload;
    try { payload = jwt.verify(token, SECRET); } catch { return res.status(401).json({ error: 'Session expired, please log in again' }); }
    const u = db.prepare(`SELECT u.id, u.username, u.name, u.role, u.branch_id, u.must_change_password, u.token_version,
                                 b.name AS branch_name, b.code AS branch_code
                          FROM users u LEFT JOIN branches b ON b.id = u.branch_id
                          WHERE u.id = ? AND u.active = 1`).get(payload.uid);
    if (!u || u.token_version !== payload.v) return res.status(401).json({ error: 'Session expired, please log in again' });
    if (ROLE_RANK[u.role] < ROLE_RANK[minRole]) return res.status(403).json({ error: 'You do not have permission for this' });
    if (u.must_change_password && !req.path.startsWith('/auth/')) {
      return res.status(403).json({ error: 'Please change your password first', mustChangePassword: true });
    }
    req.user = u;
    next();
  };
}

module.exports = { issue, clear, verifyPassword, requireAuth, ROLE_RANK };
