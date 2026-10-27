const db = require('../server/db/database');
const vatOwners = db.prepare(`
  SELECT u.email, count(v.id) as count 
  FROM vat_invoices v 
  LEFT JOIN users u ON v.user_id = u.id 
  GROUP BY u.email
`).all();
console.log('VAT owners:', vatOwners);
