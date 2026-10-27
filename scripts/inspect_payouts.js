const db = require('../server/db/database');

const coreEmails = [
  'trungdzid3@gmail.com',
  'linharmykxbnvn@gmail.com',
  'admin@vibesurvey.com',
  'creator@vibesurvey.com',
  'user@vibesurvey.com'
];

const placeholders = coreEmails.map(() => '?').join(',');
const coreUsers = db.prepare(`SELECT id, email FROM users WHERE email IN (${placeholders})`).all(...coreEmails);
const coreUserIds = coreUsers.map(u => u.id);

console.log('Core user IDs:', coreUsers);

const corePayouts = db.prepare(`SELECT * FROM payout_requests WHERE user_id IN (${coreUserIds.map(() => '?').join(',')})`).all(...coreUserIds);
console.log('Payouts of core users count:', corePayouts.length);

const allPayouts = db.prepare('SELECT count(*) as count FROM payout_requests').get();
console.log('Total payout requests in DB:', allPayouts.count);

// Check if any payout has non-test user
const testPatterns = ['%@test.local', '%@api-test.com', '%@vibetest.vn', '%@sync-test.com', '%@vibe-allinone.com'];
const testUsers = db.prepare(`
  SELECT id FROM users 
  WHERE email LIKE '%@test.local' 
     OR email LIKE '%@api-test.com' 
     OR email LIKE '%@vibetest.vn' 
     OR email LIKE '%@sync-test.com' 
     OR email LIKE '%@vibe-allinone.com'
`).all();
const testUserIds = new Set(testUsers.map(u => u.id));

const nonTestPayouts = db.prepare(`
  SELECT p.*, u.email 
  FROM payout_requests p 
  LEFT JOIN users u ON p.user_id = u.id
`).all().filter(p => !testUserIds.has(p.user_id));

console.log('Non-test payout requests count:', nonTestPayouts.length);
if (nonTestPayouts.length > 0) {
  console.log(nonTestPayouts);
}
