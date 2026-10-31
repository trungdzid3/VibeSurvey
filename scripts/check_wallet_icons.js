const fs = require('fs');
const code = fs.readFileSync('public/app.js', 'utf8');
const start = code.indexOf('renderWalletView');
const end = code.indexOf('toggleWalletLedgerAccordion');
const s = code.substring(start, end);
const re = /data-lucide=["']([^"']+)["']/g;
let m;
const set = new Set();
while ((m = re.exec(s)) !== null) {
  set.add(m[1]);
}
console.log(JSON.stringify(Array.from(set), null, 2));
