const db = require('../server/db/database');

const campaigns = db.prepare('SELECT id, issuer_id, brand_name, title FROM voucher_campaigns').all();
console.log('=== VOUCHER CAMPAIGNS ===');
console.log(campaigns);

for (const c of campaigns) {
  const issuer = db.prepare('SELECT id, email FROM users WHERE id = ?').get(c.issuer_id);
  console.log(`Campaign "${c.title}" issuer:`, issuer ? issuer.email : 'NULL');
}
