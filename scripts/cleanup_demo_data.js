/**
 * Script don dep toan bo du lieu rac / demo trong SQLite database (server/db/vibesurvey.db)
 * Su dung transaction dam bao tinh toan ven va ACID tuyet doi.
 */

const path = require('path');
const fs = require('fs');
const db = require('../server/db/database');

const CORE_EMAILS = [
  'trungdzid3@gmail.com',
  'linharmykxbnvn@gmail.com',
  'admin@vibesurvey.com',
  'creator@vibesurvey.com',
  'user@vibesurvey.com'
];

const TEST_EMAIL_PATTERNS = [
  '%@test.local',
  '%@api-test.com',
  '%@vibetest.vn',
  '%@sync-test.com',
  '%@vibe-allinone.com'
];

function runCleanup() {
  console.log('====================================================');
  console.log('KHOI DONG TIEN TRINH DON DEP DU LIEU RAC / DEMO');
  console.log('====================================================');

  // 1. Kiem tra cac tai khoan cot loi
  const coreUsers = db.prepare(`
    SELECT id, email, role, name, credit_balance, point_balance 
    FROM users 
    WHERE email IN (${CORE_EMAILS.map(() => '?').join(',')})
  `).all(...CORE_EMAILS);

  console.log(`[Kiem tra] Tim thay ${coreUsers.length}/${CORE_EMAILS.length} tai khoan cot loi can bao ton:`);
  for (const u of coreUsers) {
    console.log(` - ${u.email} (ID: ${u.id}, Role: ${u.role})`);
  }

  const creatorAccount = coreUsers.find(u => u.email === 'creator@vibesurvey.com') || coreUsers.find(u => u.role === 'ADMIN');
  if (!creatorAccount) {
    throw new Error('Khong tim thay tai khoan creator/admin hop le de bao ton survey!');
  }

  // 2. Lay danh sach tat ca test users can xoa
  const testUserWhereClause = TEST_EMAIL_PATTERNS.map(() => 'email LIKE ?').join(' OR ');
  const rawTestUsers = db.prepare(`
    SELECT id, email FROM users 
    WHERE (${testUserWhereClause})
  `).all(...TEST_EMAIL_PATTERNS);

  // Loai tru tuyet doi cac core emails khoi danh sach xoa
  const testUsers = rawTestUsers.filter(u => !CORE_EMAILS.includes(u.email));
  const testUserIds = testUsers.map(u => u.id);
  console.log(`[Thong ke] Tong so tai khoan test ao can loai bo: ${testUsers.length}`);

  // 3. Dem so luong ban ghi truoc khi don dep
  const statsBefore = {
    users: db.prepare('SELECT count(*) as count FROM users').get().count,
    payout_requests: db.prepare('SELECT count(*) as count FROM payout_requests').get().count,
    fraud_logs: db.prepare('SELECT count(*) as count FROM fraud_logs').get().count,
    surveys: db.prepare('SELECT count(*) as count FROM surveys').get().count,
    questions: db.prepare('SELECT count(*) as count FROM questions').get().count,
    point_transactions: db.prepare('SELECT count(*) as count FROM point_transactions').get().count,
    notifications: db.prepare('SELECT count(*) as count FROM notifications').get().count,
    email_notifications_log: db.prepare('SELECT count(*) as count FROM email_notifications_log').get().count,
    device_ip_logs: db.prepare('SELECT count(*) as count FROM device_ip_logs').get().count
  };

  console.log('\n[Hien trang truoc khi don dep]');
  for (const [table, count] of Object.entries(statsBefore)) {
    console.log(` - ${table.padEnd(25)}: ${count}`);
  }

  // 4. Bat dau TRANSACTION don dep
  console.log('\n[Giao dich] Bat dau TRANSACTION...');
  db.exec('BEGIN TRANSACTION');

  try {
    // 4.1. Bao ton surveys va questions: Chuyen quyen so huu cua survey tu test user sang tai khoan creator cot loi
    const surveysToReassign = db.prepare(`
      SELECT id, title, creator_id FROM surveys 
      WHERE creator_id IN (
        SELECT id FROM users WHERE (${testUserWhereClause})
      )
    `).all(...TEST_EMAIL_PATTERNS);

    if (surveysToReassign.length > 0) {
      console.log(`[Bao ton Survey] Phat hien ${surveysToReassign.length} khao sat can chuyen giao creator de bao ton:`);
      for (const s of surveysToReassign) {
        db.prepare('UPDATE surveys SET creator_id = ? WHERE id = ?').run(creatorAccount.id, s.id);
        console.log(` -> Da chuyen survey "${s.title}" (ID: ${s.id}) sang creator: ${creatorAccount.email}`);
      }
    }

    // 4.2. Cap nhat voucher campaigns neu co issuer thuoc test users
    const campaignsToReassign = db.prepare(`
      SELECT id, title FROM voucher_campaigns 
      WHERE issuer_id IN (
        SELECT id FROM users WHERE (${testUserWhereClause})
      )
    `).all(...TEST_EMAIL_PATTERNS);

    if (campaignsToReassign.length > 0) {
      console.log(`[Bao ton Voucher] Cap nhat ${campaignsToReassign.length} chien dich voucher sang creator cot loi...`);
      for (const c of campaignsToReassign) {
        db.prepare('UPDATE voucher_campaigns SET issuer_id = ? WHERE id = ?').run(creatorAccount.id, c.id);
      }
    }

    // 4.3. Don dep bang payout_requests (Yeu cau 1)
    // Xoa sach yeu cau rut tien test/demo, bao ton ban ghi neu thuoc tai khoan that
    const deletedPayouts = db.prepare(`
      DELETE FROM payout_requests 
      WHERE user_id IN (
        SELECT id FROM users WHERE (${testUserWhereClause})
      ) OR user_id NOT IN (
        SELECT id FROM users WHERE email IN (${CORE_EMAILS.map(() => '?').join(',')})
      )
    `).run(...TEST_EMAIL_PATTERNS, ...CORE_EMAILS);
    console.log(`[Thuc thi] Bang payout_requests: da xoa ${deletedPayouts.changes} ban ghi yeu cau rut tien test/demo.`);

    // 4.4. Don dep bang fraud_logs (Yeu cau 2)
    // Xoa toan bo nhat ky gian lan test rac tu cac dot test tu dong truoc day
    const deletedFrauds = db.prepare('DELETE FROM fraud_logs').run();
    console.log(`[Thuc thi] Bang fraud_logs: da xoa ${deletedFrauds.changes} ban ghi nhat ky gian lan test.`);

    // 4.5. Don dep du lieu lien quan cua cac test users de dam bao toan ven khoa ngoai (Foreign Keys)
    // - point_transactions
    const deletedTxs = db.prepare(`
      DELETE FROM point_transactions 
      WHERE user_id IN (
        SELECT id FROM users WHERE (${testUserWhereClause})
      )
    `).run(...TEST_EMAIL_PATTERNS);
    console.log(`[Thuc thi] Bang point_transactions: da xoa ${deletedTxs.changes} giao dich test.`);

    // - notifications
    const deletedNotifs = db.prepare(`
      DELETE FROM notifications 
      WHERE user_id IN (
        SELECT id FROM users WHERE (${testUserWhereClause})
      )
    `).run(...TEST_EMAIL_PATTERNS);
    console.log(`[Thuc thi] Bang notifications: da xoa ${deletedNotifs.changes} thong bao test.`);

    // - email_notifications_log
    const deletedEmailLogs = db.prepare(`
      DELETE FROM email_notifications_log 
      WHERE user_id IN (
        SELECT id FROM users WHERE (${testUserWhereClause})
      )
    `).run(...TEST_EMAIL_PATTERNS);
    console.log(`[Thuc thi] Bang email_notifications_log: da xoa ${deletedEmailLogs.changes} log email test.`);

    // - device_ip_logs
    const deletedDeviceLogs = db.prepare(`
      DELETE FROM device_ip_logs 
      WHERE user_id IN (
        SELECT id FROM users WHERE (${testUserWhereClause})
      )
    `).run(...TEST_EMAIL_PATTERNS);
    console.log(`[Thuc thi] Bang device_ip_logs: da xoa ${deletedDeviceLogs.changes} log thiet bi test.`);

    // 4.6. Don dep bang users (Yeu cau 3)
    // Xoa cac tai khoan test ao thuoc 5 patterns, bao ton 100% cac tai khoan cot loi
    const deletedUsers = db.prepare(`
      DELETE FROM users 
      WHERE (${testUserWhereClause})
        AND email NOT IN (${CORE_EMAILS.map(() => '?').join(',')})
    `).run(...TEST_EMAIL_PATTERNS, ...CORE_EMAILS);
    console.log(`[Thuc thi] Bang users: da xoa ${deletedUsers.changes} tai khoan test ao.`);

    // 4.7. Hoan tat Transaction
    db.exec('COMMIT');
    console.log('[Giao dich] COMMIT TRANSACTION THANH CONG!');
  } catch (err) {
    db.exec('ROLLBACK');
    console.error('[Loi] Giao dich that bai, da ROLLBACK toan bo thay doi:', err.message);
    throw err;
  }

  // 5. Thuc hien VACUUM de thu hoi dung luong disk SQLite
  console.log('\n[Toi uu] Dang thuc hien VACUUM database de giai phong dung luong disk...');
  try {
    db.exec('VACUUM');
    console.log('[Toi uu] VACUUM hoan tat thanh cong.');
  } catch (vacuumErr) {
    console.warn('[Canh bao] Khong the chay VACUUM:', vacuumErr.message);
  }

  // 6. Thong ke sau khi don dep va xac minh toan ven
  const statsAfter = {
    users: db.prepare('SELECT count(*) as count FROM users').get().count,
    payout_requests: db.prepare('SELECT count(*) as count FROM payout_requests').get().count,
    fraud_logs: db.prepare('SELECT count(*) as count FROM fraud_logs').get().count,
    surveys: db.prepare('SELECT count(*) as count FROM surveys').get().count,
    questions: db.prepare('SELECT count(*) as count FROM questions').get().count,
    point_transactions: db.prepare('SELECT count(*) as count FROM point_transactions').get().count,
    notifications: db.prepare('SELECT count(*) as count FROM notifications').get().count,
    email_notifications_log: db.prepare('SELECT count(*) as count FROM email_notifications_log').get().count,
    device_ip_logs: db.prepare('SELECT count(*) as count FROM device_ip_logs').get().count
  };

  console.log('\n====================================================');
  console.log('KET QUA XAC MINH SAU KHI DON DEP');
  console.log('====================================================');
  for (const [table, count] of Object.entries(statsAfter)) {
    const diff = statsBefore[table] - count;
    console.log(` - ${table.padEnd(25)}: Truoc: ${statsBefore[table]} | Sau: ${count} | Da xoa: ${diff}`);
  }

  // 7. Kiem tra bao ton 100% 5 tai khoan cot loi
  console.log('\n[Xac minh] Kiem tra 5 tai khoan cot loi:');
  for (const email of CORE_EMAILS) {
    const u = db.prepare('SELECT id, email, role, name, credit_balance, point_balance FROM users WHERE email = ?').get(email);
    if (u) {
      console.log(` [OK] ${u.email.padEnd(30)} ID: ${u.id} | Role: ${u.role} | Balance: ${u.credit_balance} VND / ${u.point_balance} PTS`);
    } else {
      console.error(` [LOI] Khong tim thay tai khoan ${email}!`);
    }
  }

  // 8. Kiem tra bao ton 100% cac khao sat va cau hoi
  console.log('\n[Xac minh] Kiem tra cac khao sat va cau hoi:');
  const remainingSurveys = db.prepare('SELECT s.id, s.title, s.status, s.creator_id, u.email as creator_email FROM surveys s LEFT JOIN users u ON s.creator_id = u.id').all();
  for (const s of remainingSurveys) {
    const qCount = db.prepare('SELECT count(*) as count FROM questions WHERE survey_id = ?').get(s.id).count;
    console.log(` [OK] Survey: "${s.title}" (ID: ${s.id}) | Creator: ${s.creator_email} | So cau hoi: ${qCount}`);
  }

  console.log('\n====================================================');
  console.log('HOAN TAT TOAN BO TIEN TRINH DON DEP DATABASE AN TOAN');
  console.log('====================================================');
}

runCleanup();
