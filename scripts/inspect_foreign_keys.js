const db = require('../server/db/database');

const testEmailsQuery = `
  SELECT id, email, role FROM users 
  WHERE email LIKE '%@test.local' 
     OR email LIKE '%@api-test.com' 
     OR email LIKE '%@vibetest.vn' 
     OR email LIKE '%@sync-test.com' 
     OR email LIKE '%@vibe-allinone.com'
`;
const testUsers = db.prepare(testEmailsQuery).all();
console.log('Tổng số user test khớp 5 patterns:', testUsers.length);

const testUserIds = new Set(testUsers.map(u => u.id));

// Kiểm tra xem có user test nào sở hữu surveys không:
const surveys = db.prepare('SELECT id, title, creator_id FROM surveys').all();
for (const s of surveys) {
  if (testUserIds.has(s.creator_id)) {
    const creator = testUsers.find(u => u.id === s.creator_id);
    console.log(`CẢNH BÁO: Survey "${s.title}" (id: ${s.id}) có creator là user test: ${creator.email} (id: ${creator.id})`);
  }
}

// Kiểm tra xem có foreign keys nào trỏ tới users
// Các bảng trong database có cột user_id, respondent_id, creator_id, claimed_by_user_id...
const checkTables = [
  { table: 'surveys', col: 'creator_id' },
  { table: 'responses', col: 'respondent_id' },
  { table: 'point_transactions', col: 'user_id' },
  { table: 'payout_requests', col: 'user_id' },
  { table: 'fraud_logs', col: 'user_id' },
  { table: 'voucher_campaigns', col: 'issuer_id' },
  { table: 'voucher_codes', col: 'claimed_by_user_id' },
  { table: 'notifications', col: 'user_id' },
  { table: 'vat_invoices', col: 'creator_id' },
  { table: 'device_ip_logs', col: 'user_id' },
  { table: 'warranty_claims', col: 'respondent_id' }
];

console.log('\n=== CÁC BẢN GHI PHỤ THUỘC VÀO CÁC TEST USERS NÀY ===');
for (const item of checkTables) {
  try {
    const count = db.prepare(`SELECT count(*) as count FROM ${item.table} WHERE ${item.col} IN (${testEmailsQuery.replace('SELECT id, email, role FROM users', 'SELECT id FROM users')})`).get();
    console.log(`${item.table}.${item.col}: ${count.count} bản ghi`);
  } catch (err) {
    console.log(`${item.table}.${item.col}: lỗi (${err.message})`);
  }
}
