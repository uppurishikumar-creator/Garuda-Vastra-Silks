// Backup: exports every table to one JSON file.
//   npm run backup            → data/backups/garuda-manual-<time>.json
// Works with the local database and with Neon (set DATABASE_URL in .env to back up the online one).
const path = require('path');
const fs = require('fs');

const TABLES = ['branches', 'users', 'products', 'stock', 'stock_movements', 'coupons', 'bills', 'bill_items',
  'coupon_redemptions', 'returns', 'counters', 'settings', 'audit_log'];

async function exportAll(file) {
  const db = require('../backend/db');
  await db.ready();
  const out = { exported_at: new Date().toISOString(), tables: {} };
  for (const t of TABLES) out.tables[t] = await db.query(`SELECT * FROM ${t} ORDER BY 1`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(out));
  return file;
}

module.exports = { exportAll, TABLES };

if (require.main === module) {
  require('dotenv').config({ quiet: true });
  const { DATA_DIR } = require('../backend/db');
  const stamp = new Date(Date.now() + 5.5 * 3600e3).toISOString().replace(/[:T]/g, '-').slice(0, 19);
  exportAll(path.join(DATA_DIR, 'backups', `garuda-manual-${stamp}.json`))
    .then(f => { console.log('Backup saved:', f); process.exit(0); })
    .catch(e => { console.error('Backup failed:', e.message); process.exit(1); });
}
