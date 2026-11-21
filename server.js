// Garuda Vastra Silks — run on your laptop or a VPS:  npm start  →  http://localhost:3000  (admin: /admin)
// On Vercel this file is not used: api/index.js runs the same app as a serverless function.
if (!process.env.VERCEL) require('dotenv').config({ quiet: true });
const path = require('path');
const fs = require('fs');
const app = require('./backend/app');
const db = require('./backend/db');
const { exportAll } = require('./scripts/backup');

const PORT = process.env.PORT || 3000;

/* ---------- Daily backup to data/backups (keeps last 30) ---------- */
const BACKUP_DIR = path.join(db.DATA_DIR, 'backups');
async function backupNow() {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date(Date.now() + 5.5 * 3600e3).toISOString().slice(0, 10);
  const file = path.join(BACKUP_DIR, `garuda-${stamp}.json`);
  if (fs.existsSync(file)) return;
  await exportAll(file);
  const old = fs.readdirSync(BACKUP_DIR).filter(f => /^garuda-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  old.slice(0, Math.max(0, old.length - 30)).forEach(f => fs.unlinkSync(path.join(BACKUP_DIR, f)));
  console.log('Database backup saved:', file);
}

if (process.env.VERCEL) {
  // On Vercel this file may be picked up as the Express entry point: just export the app.
  // (No app.listen, no file backups, never exit the process.)
  module.exports = app;
} else {
  db.ready().then(async () => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Garuda Vastra Silks running (${db.kind === 'local' ? 'local database in ./data' : 'online Postgres database'}):`);
      console.log(`  Website         → http://localhost:${PORT}/`);
      console.log(`  Admin panel     → http://localhost:${PORT}/admin`);
      console.log(`  Billing counter → http://localhost:${PORT}/admin/pos.html`);
    });
    backupNow().catch(e => console.error('Backup failed:', e.message));
    setInterval(() => backupNow().catch(e => console.error('Backup failed:', e.message)), 60 * 60 * 1000).unref();
  }).catch(e => {
    console.error('\nCould not start the database:\n', e.message, '\n');
    process.exit(1);
  });
}
