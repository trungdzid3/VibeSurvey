const db = require('../server/db/database');

const testPatternQuery = `
  SELECT id FROM users 
  WHERE email LIKE '%@test.local' 
     OR email LIKE '%@api-test.com' 
     OR email LIKE '%@vibetest.vn' 
     OR email LIKE '%@sync-test.com' 
     OR email LIKE '%@vibe-allinone.com'
`;

const vatTest = db.prepare(`SELECT count(*) as count FROM vat_invoices WHERE user_id IN (${testPatternQuery})`).get();
console.log('VAT invoices of test users:', vatTest.count);

const vatCore = db.prepare(`
  SELECT count(*) as count FROM vat_invoices 
  WHERE user_id IN (
    SELECT id FROM users WHERE email IN (
      'trungdzid3@gmail.com', 'linharmykxbnvn@gmail.com', 'admin@vibesurvey.com', 'creator@vibesurvey.com', 'user@vibesurvey.com'
    )
  )
`).get();
console.log('VAT invoices of core users:', vatCore.count);
