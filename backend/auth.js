// Staff login with httpOnly cookie (JWT). Roles: owner > manager > cashier.
// Works on Vercel (many short-lived copies of the server) because everything is kept in the database.
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { query, one, setting } = require('./db');

const COOKIE = 'gvs_session';
const ROLE_RANK = { cashier: 1, manager: 2, owner: 3 };
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10); // keeps login timing equal for unknown users
const MAX_FAILS = 10, WINDOW_MIN = 15;

let secretCache = null;
async function secret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) return process.env.JWT_SECRET;
  if (!secretCache) secretCache = await setting('jwt_secret');
  return secretCache;
}

async function issue(res, user) {
  const token = jwt.sign({ uid: user.id, v: user.token_version }, await secret(), { expiresIn: '12h' });
  res.cookie(COOKIE, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production' || !!process.env.VERCEL,
    maxAge: 12 * 60 * 60 * 1000,
    path: '/'
  });
}

function clear(res) { res.clearCookie(COOKIE, { path: '/' }); }

// Login lock: 10 wrong tries for a username or from one IP in 15 minutes
async function tooManyAttempts(username, ip) {
  const r = await one(query, `SELECT COUNT(*)::int AS n FROM login_attempts
                              WHERE ok = 0 AND created_at > now() - interval '${WINDOW_MIN} minutes'
                                AND (lower(username) = lower($1) OR ip = $2)`, [username, ip]);
  return r.n >= MAX_FAILS;
}
async function recordAttempt(username, ip, ok) {
  await query('INSERT INTO login_attempts (username, ip, ok) VALUES ($1,$2,$3)', [username.slice(0, 60), ip, ok ? 1 : 0]);
  if (Math.random() < 0.05) await query("DELETE FROM login_attempts WHERE created_at < now() - interval '2 days'");
}

async function verifyPassword(username, password) {
  const u = await one(query, 'SELECT * FROM users WHERE lower(username) = lower($1) AND active = 1', [username]);
  if (!u) { bcrypt.compareSync(String(password), DUMMY_HASH); return null; }
  return bcrypt.compareSync(String(password), u.password_hash) ? u : null;
}

// Middleware: requires a logged-in user. Non-GET calls must carry our header (blocks cross-site requests).
function requireAuth(minRole = 'cashier') {
  return async (req, res, next) => {
    try {
      if (req.method !== 'GET' && req.get('X-Requested-With') !== 'gvs') return res.status(403).json({ error: 'Bad request origin' });
      const token = req.cookies && req.cookies[COOKIE];
      if (!token) return res.status(401).json({ error: 'Please log in' });
      let payload;
      try { payload = jwt.verify(token, await secret()); } catch { return res.status(401).json({ error: 'Session expired, please log in again' }); }
      const u = await one(query, `SELECT u.id, u.username, u.name, u.role, u.branch_id, u.must_change_password, u.token_version,
                                         b.name AS branch_name, b.code AS branch_code
                                  FROM users u LEFT JOIN branches b ON b.id = u.branch_id
                                  WHERE u.id = $1 AND u.active = 1`, [payload.uid]);
      if (!u || u.token_version !== payload.v) return res.status(401).json({ error: 'Session expired, please log in again' });
      if (ROLE_RANK[u.role] < ROLE_RANK[minRole]) return res.status(403).json({ error: 'You do not have permission for this' });
      if (u.must_change_password && !req.path.startsWith('/auth/')) {
        return res.status(403).json({ error: 'Please change your password first', mustChangePassword: true });
      }
      req.user = u;
      next();
    } catch (e) { next(e); }
  };
}

module.exports = { issue, clear, verifyPassword, requireAuth, tooManyAttempts, recordAttempt, ROLE_RANK };
