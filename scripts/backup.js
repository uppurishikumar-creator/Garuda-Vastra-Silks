// Manual database backup:  npm run backup
// Copies the live database safely (even while the server is running) into data/backups/.
const path = require('path');
const fs = require('fs');
const { db, DATA_DIR } = require('../backend/db');

const dir = path.join(DATA_DIR, 'backups');
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date(Date.now() + 5.5 * 3600e3).toISOString().replace(/[:T]/g, '-').slice(0, 19);
const file = path.join(dir, `garuda-manual-${stamp}.db`);
db.backup(file).then(() => { console.log('Backup saved:', file); process.exit(0); })
  .catch(e => { console.error('Backup failed:', e.message); process.exit(1); });
