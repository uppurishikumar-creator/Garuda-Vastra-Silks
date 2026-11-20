# Garuda Vastra Silks — Website + Admin Panel + Billing Counter

A redesign for Garuda Vastra Silks by **Driksha** (https://driksha-website-mt52.vercel.app/).

| Part | Where | What it does |
|---|---|---|
| Website | `/` | Virtual Saree Try-On, Saree Finder, wishlist, WhatsApp enquiry, Telugu / English, store locator. **Products, prices and sold-out status now come live from the admin panel.** |
| Admin panel | `/admin` | Dashboard, products & stock (per branch), stock in, barcode/QR labels, coupons, bills & returns, staff, settings |
| Billing counter | `/admin/pos.html` | Scan sticker → bill → stock reduced → bill printed → saved. Return/exchange and price check modes. |

## Run it

```bash
npm install
npm start
```

Open http://localhost:3000/admin. On the very first start the terminal prints the **owner password**
(also saved in `data/FIRST-LOGIN.txt` — delete that file after logging in). You must set a new password on first login.

## How the billing counter works

1. Staff opens **Billing Counter** and scans the sticker (USB scanner or 📷 phone/laptop camera).
2. Item is added (scan again = quantity +1). Stock is checked for that branch.
3. Optional: customer phone/name and coupon. Server checks the coupon (dates, min bill, total uses, uses per customer, category).
4. Choose Cash / UPI / Card / Split → **Complete sale (F9)**.
5. In one database transaction: bill saved, invoice number given (`BHG/2026-27/00001`), stock reduced, coupon use recorded.
6. 80 mm thermal bill prints automatically, with a barcode of the invoice number.

**Return / Exchange (F2):** scan the barcode on the customer's bill → choose items → stock is added back and a credit note prints.
**Price check (F3):** scan any sticker → price and stock in every branch.

Shortcuts: `F1` sale · `F2` return · `F3` price check · `F9` complete sale.

## Labels (stickers)

Admin → **Print Labels** → enter how many per product → Print. Each sticker has name, size, price, a **barcode** (USB scanners) and a **QR code** (phone cameras); both contain the SKU.
Paper: A4 sheet (3×8 = 24 labels of 70×37 mm) or a thermal label roll (50×25 mm). In the print dialog set Margins: None, Scale: 100%.

## Hardware that works

- Any USB / Bluetooth barcode scanner that types like a keyboard (Code 128 + QR support)
- 80 mm thermal receipt printer (installed as a normal Windows printer)
- Optional: thermal label printer (TSC / Zebra / similar) for 50×25 mm stickers
- No scanner? The 📷 Camera button uses the phone or laptop camera.

## Roles

| Role | Can do |
|---|---|
| Owner | Everything, including staff and settings |
| Manager | Products, stock in, stock corrections, labels, coupons, reports, CSV export |
| Cashier | Billing counter, returns and bills of **their own branch** only |

## Data & safety

- Database: SQLite file in `data/garuda.db`. **`data/` and `.env` are in `.gitignore` — never commit them.**
- Automatic daily backup into `data/backups/` (last 30 kept). Manual: `npm run backup`. Copy backups to Google Drive / a pen drive regularly.
- Passwords hashed (bcrypt), login cookie is httpOnly, login is rate-limited, every price/coupon/GST is recalculated on the server, all stock changes are logged with who and when.
- Only the website, `/src` assets and `/admin` are served — the database, source code and `.env` are never reachable from the browser.
- Settings: copy `.env.example` to `.env`. On a live server set `NODE_ENV=production` and use HTTPS.

## Before going live — check with the shop

- **GST**: rates and HSN codes per product, GSTIN per branch, bill format → confirm with their accountant. (Default 5%, HSN 5007 are placeholders.)
- Do they already use billing software (Tally, Marg…)? Bills can be exported as CSV (Bills → Export CSV).
- **Hosting**: Vercel only hosts the static website — the admin panel and database need a Node server
  (a VPS, Railway/Render with a persistent disk, or a PC in the shop). Needs Node 22.13 or newer (uses the built-in node:sqlite — nothing to compile). Without the server the website falls back to the sample catalogue.
- Internet: billing needs the server to be reachable. If the server runs online, keep a mobile hotspot as backup.

## Project structure

```
server.js            Express server (website, admin, API, daily backup)
backend/db.js        Database tables + first-run setup
backend/auth.js      Login, roles, sessions
backend/billing.js   Bill / coupon / GST maths, invoice numbers, returns
backend/api.js       All /api routes
admin/               Admin panel, billing counter, receipt and label pages
src/                 Website source (build with: npm run build → index.html)
test-admin.js        End-to-end test of admin + billing (npm run test:admin)
```

Catalogue items and prices in the seed data are samples — replace them with the real stock (or start with `SEED_SAMPLE=false`).
