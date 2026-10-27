const db = require('../server/db/database');

const query = `
  SELECT id, email, name, role, created_at FROM users 
  WHERE email NOT LIKE '%@test.local' 
    AND email NOT LIKE '%@api-test.com' 
    AND email NOT LIKE '%@vibetest.vn' 
    AND email NOT LIKE '%@sync-test.com' 
    AND email NOT LIKE '%@vibe-allinone.com'
`;
const rows = db.prepare(query).all();
console.log('Tổng số user không thuộc 5 pattern trên:', rows.length);

const byDomain = {};
for (const r of rows) {
  const domain = r.email.split('@')[1];
  if (!byDomain[domain]) byDomain[domain] = [];
  byDomain[domain].push(r.email);
}

for (const [dom, list] of Object.entries(byDomain)) {
  console.log(`\nDomain: @${dom} (${list.length} users):`);
  console.log(list.slice(0, 5));
}
