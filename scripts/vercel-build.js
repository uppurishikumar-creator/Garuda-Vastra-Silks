// Builds the static part for Vercel into dist/: website + admin pages.
// The /api/* backend runs as a Vercel function (api/index.js) using the Neon database.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
require(path.join(root, 'build.js'));                         // regenerates index.html
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
const copyDir = (from, to, filter = () => true) => {
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) {
    const s = path.join(from, f), d = path.join(to, f);
    if (fs.statSync(s).isDirectory()) copyDir(s, d, filter);
    else if (filter(f)) fs.copyFileSync(s, d);
  }
};
fs.mkdirSync(dist, { recursive: true });
fs.copyFileSync(path.join(root, 'index.html'), path.join(dist, 'index.html'));
copyDir(path.join(root, 'src'), path.join(dist, 'src'), f => /\.(svg|jpg|jpeg|png|webp)$/i.test(f));
copyDir(path.join(root, 'admin'), path.join(dist, 'admin'));
fs.mkdirSync(path.join(dist, 'admin', 'vendor'), { recursive: true });
fs.copyFileSync(require.resolve('html5-qrcode/html5-qrcode.min.js'), path.join(dist, 'admin', 'vendor', 'html5-qrcode.min.js'));
console.log('Vercel static build ready in dist/ (website + admin)');
