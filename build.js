const fs = require('fs');
const path = require('path');

const c1 = "https://horizons-cdn.hostinger.com/f56b7f19-8513-495b-ae14-ca206c95afd1/";
const c2 = "https://images.hostinger.com/";

const storePath = path.join(__dirname, 'src', 'store.jpg');
const storeBuf = fs.readFileSync(storePath);
const store = "data:image/jpeg;base64," + storeBuf.toString('base64');

const css = fs.readFileSync(path.join(__dirname, 'src', 'style.css'), 'utf-8');
const body = fs.readFileSync(path.join(__dirname, 'src', 'body.html'), 'utf-8');
let js = fs.readFileSync(path.join(__dirname, 'src', 'app.js'), 'utf-8');

if (!js.includes('window._fbq')) {
  js = js.replace('window.fb = fb;', 'window.fb = fb;\n(window._fbq||[]).forEach(([im,i])=>fb(im,i));');
}

const head = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Garuda Vastra Silks — Kanchipuram, Banarasi &amp; Handloom Sarees | Bhuvanagiri, Hyderabad, Jadcherla, Jammikunta</title>
<meta name="description" content="Garuda Vastra Silks — premier destination for certified handloom silks across Telangana. Kanchipuram, Banarasi, soft silk and bridal sarees, plus women, men and kids wear. Try sarees on virtually, enquire on WhatsApp, book a bridal appointment.">
<meta property="og:title" content="Garuda Vastra Silks — Elegance, woven through generations">
<meta property="og:description" content="Certified handloom silks and complete family ethnic fashion across Telangana. Now open in Bhuvanagiri.">
<meta property="og:type" content="website">
<meta name="theme-color" content="#211C2B">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Inter:wght@300;400;500;600;700&family=Noto+Sans+Telugu:wght@400;600&family=Noto+Serif+Telugu:wght@500;600&display=swap" rel="stylesheet">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"ClothingStore","name":"Garuda Vastra Silks","telephone":"+91-92479-94041","email":"contactus@garudavastrasilks.com","openingHours":"Mo-Su 10:00-22:00","address":{"@type":"PostalAddress","streetAddress":"CPR Galaxy, Plot No. 71, Kavuri Hills","addressLocality":"Hyderabad","postalCode":"500033","addressRegion":"Telangana","addressCountry":"IN"}}</script>
<script>window.fb=function(im,i){im.onerror=null;(window._fbq=window._fbq||[]).push([im,i])}</script>
`;

let html = head + '<style>\n' + css + '\n</style>\n</head>\n<body>\n' + body + '\n<script>\n' + js + '\n</script>\n</body>\n</html>\n';
html = html.replace(/__C1__/g, c1).replace(/__C2__/g, c2).replace(/__STORE__/g, store);

fs.writeFileSync(path.join(__dirname, 'index.html'), html, 'utf-8');
console.log('index.html rebuilt successfully with Modern Heritage Luxury system (' + html.length + ' bytes)');
