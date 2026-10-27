const db = require('../server/db/database');

console.log('=== SURVEYS DETAIL ===');
const surveys = db.prepare('SELECT s.id, s.title, s.status, s.creator_id, u.email as creator_email FROM surveys s LEFT JOIN users u ON s.creator_id = u.id').all();
console.log(JSON.stringify(surveys, null, 2));

console.log('\n=== QUESTIONS COUNT PER SURVEY ===');
for (const s of surveys) {
  const qCount = db.prepare('SELECT count(*) as count FROM questions WHERE survey_id = ?').get(s.id);
  console.log('Survey:', s.id, s.title, 'Questions:', qCount.count);
}

console.log('\n=== RESPONSES DETAIL ===');
const respCount = db.prepare('SELECT count(*) as count FROM responses').get();
console.log('Total responses:', respCount.count);
const responses = db.prepare('SELECT r.id, r.survey_id, r.respondent_id, u.email, r.status, r.started_at FROM responses r LEFT JOIN users u ON r.respondent_id = u.id').all();
console.log('Responses sample (first 10):', JSON.stringify(responses.slice(0, 10), null, 2));

console.log('\n=== PAYOUT USERS ===');
const payoutUsers = db.prepare('SELECT DISTINCT u.email, count(p.id) as count FROM payout_requests p LEFT JOIN users u ON p.user_id = u.id GROUP BY u.email').all();
console.log('Payout users:', JSON.stringify(payoutUsers, null, 2));

console.log('\n=== PAYOUT REQUESTS WITHOUT USER ===');
const orphanedPayouts = db.prepare('SELECT count(*) as count FROM payout_requests WHERE user_id NOT IN (SELECT id FROM users)').get();
console.log('Orphaned payouts:', orphanedPayouts.count);

console.log('\n=== FRAUD LOGS DETAIL ===');
const fraudUsers = db.prepare('SELECT DISTINCT u.email, count(f.id) as count FROM fraud_logs f LEFT JOIN users u ON f.user_id = u.id GROUP BY u.email').all();
console.log('Fraud logs by user email:', JSON.stringify(fraudUsers, null, 2));

console.log('\n=== NON-TEST USERS ===');
const nonTestUsers = db.prepare(`
  SELECT id, email, name, role, created_at FROM users 
  WHERE email NOT LIKE '%@test.local' 
    AND email NOT LIKE '%@api-test.com' 
    AND email NOT LIKE '%@vibetest.vn' 
    AND email NOT LIKE '%@sync-test.com' 
    AND email NOT LIKE '%@vibe-allinone.com'
`).all();
console.log('Non-test users count:', nonTestUsers.length);
console.log(JSON.stringify(nonTestUsers, null, 2));
