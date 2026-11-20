// Builds the static website into dist/ for Vercel (preview only).
// The admin panel, billing counter and database need the Node server on a VPS.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
require(path.join(root, 'build.js'));              // regenerates index.html
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'src'), { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(dist, 'index.html'));
for (const f of fs.readdirSync(path.join(root, 'src'))) {
  if (/\.(svg|jpg|jpeg|png|webp)$/i.test(f)) fs.copyFileSync(path.join(root, 'src', f), path.join(dist, 'src', f));
}
console.log('Static site ready in dist/ (' + fs.readdirSync(path.join(dist, 'src')).length + ' assets)');
