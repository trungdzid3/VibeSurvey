/**
 * Script don dep toan bo du lieu demo va du lieu kiem thu trong he thong VibeSurvey
 * Bao ton duy nhat 3 tai khoan quan tri vien he thong cot loi:
 * - trungdzid3@gmail.com
 * - linharmykxbnvn@gmail.com
 * - admin@vibesurvey.com
 * 
 * Toan bo survey, questions, responses, transactions, payouts, logs demo deu duoc xoa sach.
 * Kho voucher mau duoc reset ve trang thai san sang su dung.
 */

const db = require('../server/db/database');

const CORE_ADMIN_EMAILS = [
  'trungdzid3@gmail.com',
  'linharmykxbnvn@gmail.com',
  'admin@vibesurvey.com'
];

function getTableCounts() {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
  const counts = {};
  for (const t of tables) {
    const row = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get();
    counts[t.name] = row.c;
  }
  return counts;
}

function cleanDemoData() {
  console.log('--- BAT DAU TIEN TRINH DON DEP DU LIEU DEMO HE THONG ---');

  const beforeCounts = getTableCounts();
  console.log('\n[THONG KE TRUOC KHI DON DEP]');
  for (const [table, count] of Object.entries(beforeCounts)) {
    console.log(`- ${table.padEnd(25)}: ${count} dong`);
  }

  // Kiem tra su ton tai cua 3 tai khoan Admin cot loi
  const placeholders = CORE_ADMIN_EMAILS.map(() => '?').join(',');
  const adminUsers = db.prepare(`SELECT id, email, name, role FROM users WHERE email IN (${placeholders})`).all(...CORE_ADMIN_EMAILS);
  
  console.log(`\n[KIEM TRA TAI KHOAN QUAN TRI] Tim thay ${adminUsers.length}/3 tai khoan Admin cot loi:`);
  for (const u of adminUsers) {
    console.log(`- ${u.email} (${u.name}) - Vai tro: ${u.role}`);
  }

  if (adminUsers.length < CORE_ADMIN_EMAILS.length) {
    console.warn('[CANH BAO] Thieu tai khoan admin cot loi, tien trinh se tiep tuc va dam bao tai khoan theo schema.');
  }

  // Thuc hien giao dich don dep
  db.exec('PRAGMA foreign_keys = OFF;');
  db.exec('BEGIN TRANSACTION;');

  try {
    // 1. Xoa sach cac bang khao sat, cau hoi va cau tra loi
    const delResponses = db.prepare('DELETE FROM responses;').run();
    console.log(`- Da xoa ${delResponses.changes} dong tu bang responses.`);

    const delQuestions = db.prepare('DELETE FROM questions;').run();
    console.log(`- Da xoa ${delQuestions.changes} dong tu bang questions.`);

    const delSurveys = db.prepare('DELETE FROM surveys;').run();
    console.log(`- Da xoa ${delSurveys.changes} dong tu bang surveys.`);

    // 2. Xoa sach cac bang tai chinh, giao dich va yeu cau rut/nap tien
    const delPayouts = db.prepare('DELETE FROM payout_requests;').run();
    console.log(`- Da xoa ${delPayouts.changes} dong tu bang payout_requests.`);

    const delDeposits = db.prepare('DELETE FROM deposit_orders;').run();
    console.log(`- Da xoa ${delDeposits.changes} dong tu bang deposit_orders.`);

    const delWarranty = db.prepare('DELETE FROM warranty_claims;').run();
    console.log(`- Da xoa ${delWarranty.changes} dong tu bang warranty_claims.`);

    const delTransactions = db.prepare('DELETE FROM point_transactions;').run();
    console.log(`- Da xoa ${delTransactions.changes} dong tu bang point_transactions.`);

    const delVat = db.prepare('DELETE FROM vat_invoices;').run();
    console.log(`- Da xoa ${delVat.changes} dong tu bang vat_invoices.`);

    // 3. Xoa sach cac bang nhat ky, bao cao va thong bao
    const delBugReports = db.prepare('DELETE FROM bug_reports;').run();
    console.log(`- Da xoa ${delBugReports.changes} dong tu bang bug_reports.`);

    const delAuditLogs = db.prepare('DELETE FROM admin_audit_logs;').run();
    console.log(`- Da xoa ${delAuditLogs.changes} dong tu bang admin_audit_logs.`);

    const delNotifications = db.prepare('DELETE FROM notifications;').run();
    console.log(`- Da xoa ${delNotifications.changes} dong tu bang notifications.`);

    const delEmailLogs = db.prepare('DELETE FROM email_notifications_log;').run();
    console.log(`- Da xoa ${delEmailLogs.changes} dong tu bang email_notifications_log.`);

    const delDeviceLogs = db.prepare('DELETE FROM device_ip_logs;').run();
    console.log(`- Da xoa ${delDeviceLogs.changes} dong tu bang device_ip_logs.`);

    const delPushSubs = db.prepare('DELETE FROM push_subscriptions;').run();
    console.log(`- Da xoa ${delPushSubs.changes} dong tu bang push_subscriptions.`);

    const delDailyStreaks = db.prepare('DELETE FROM daily_streaks;').run();
    console.log(`- Da xoa ${delDailyStreaks.changes} dong tu bang daily_streaks.`);

    const delFraudLogs = db.prepare('DELETE FROM fraud_logs;').run();
    console.log(`- Da xoa ${delFraudLogs.changes} dong tu bang fraud_logs.`);

    const delBannedIps = db.prepare('DELETE FROM banned_ips;').run();
    console.log(`- Da xoa ${delBannedIps.changes} dong tu bang banned_ips.`);

    const delOtps = db.prepare('DELETE FROM registration_otps;').run();
    console.log(`- Da xoa ${delOtps.changes} dong tu bang registration_otps.`);

    // 4. Xu ly bang voucher_codes va voucher_campaigns
    // Xoa cac ma voucher cua chien dich tai tro (CREATOR_SPONSORED)
    const delSponsoredCodes = db.prepare(`
      DELETE FROM voucher_codes 
      WHERE campaign_id IN (
        SELECT id FROM voucher_campaigns WHERE voucher_type != 'PLATFORM_CATALOG'
      ) OR campaign_id NOT IN (
        SELECT id FROM voucher_campaigns
      );
    `).run();
    console.log(`- Da xoa ${delSponsoredCodes.changes} ma voucher thuoc cac chien dich demo tai tro.`);

    // Xoa cac chien dich voucher do creator test tao ra
    const delSponsoredCampaigns = db.prepare(`
      DELETE FROM voucher_campaigns WHERE voucher_type != 'PLATFORM_CATALOG';
    `).run();
    console.log(`- Da xoa ${delSponsoredCampaigns.changes} chien dich voucher do creator tao.`);

    // Reset trang thai toan bo voucher mau PLATFORM_CATALOG ve AVAILABLE
    const resetCodes = db.prepare(`
      UPDATE voucher_codes 
      SET status = 'AVAILABLE',
          claimed_by_user_id = NULL,
          claimed_response_id = NULL,
          claimed_at = NULL,
          survey_id = NULL
      WHERE campaign_id IN (
        SELECT id FROM voucher_campaigns WHERE voucher_type = 'PLATFORM_CATALOG'
      );
    `).run();
    console.log(`- Da reset ${resetCodes.changes} ma voucher catalog ve trang thai AVAILABLE san sang su dung.`);

    // Reset remaining_quantity = total_quantity cho cac voucher campaign danh muc he thong
    const resetCampaignQty = db.prepare(`
      UPDATE voucher_campaigns
      SET remaining_quantity = total_quantity
      WHERE voucher_type = 'PLATFORM_CATALOG';
    `).run();
    console.log(`- Da cap nhat lai so luong con lai cho ${resetCampaignQty.changes} chien dich voucher danh muc mau.`);

    // 5. Xu ly bang users: Chi giu lai 3 tai khoan Admin cot loi, xoa toan bo tai khoan con lai
    const delUsers = db.prepare(`
      DELETE FROM users 
      WHERE email NOT IN (${placeholders});
    `).run(...CORE_ADMIN_EMAILS);
    console.log(`- Da xoa ${delUsers.changes} tai khoan nguoi dung demo va test.`);

    // Reset so du diem va thiet lap trang thai sach cho cac tai khoan Admin duoc bao ton
    const resetAdmins = db.prepare(`
      UPDATE users 
      SET point_balance = 0,
          credit_balance = 0,
          promo_credit_balance = 0,
          fast_track_tickets = 0,
          free_quota_remaining = 0,
          free_trial_surveys_available = 1,
          status = 'ACTIVE',
          ban_reason = NULL,
          banned_at = NULL
      WHERE email IN (${placeholders});
    `).run(...CORE_ADMIN_EMAILS);
    console.log(`- Da reset so du va trang thai sach cho ${resetAdmins.changes} tai khoan Admin cot loi.`);

    db.exec('COMMIT;');
    console.log('[GIAO DICH] Commit giao dich thanh cong.');
  } catch (err) {
    db.exec('ROLLBACK;');
    db.exec('PRAGMA foreign_keys = ON;');
    console.error('[LOI NGHIEM TRONG] Giao dich that bai, da thuc hien rollback:', err);
    process.exit(1);
  }

  db.exec('PRAGMA foreign_keys = ON;');

  // 6. Toi uu hoa co so du lieu SQLite bang VACUUM
  console.log('\n[TOI UU HOA] Dang chay PRAGMA optimize va VACUUM...');
  db.exec('PRAGMA optimize;');
  db.exec('VACUUM;');
  console.log('[TOI UU HOA] Da thuc hien VACUUM thanh cong.');

  // 7. Thong ke sau khi don dep
  const afterCounts = getTableCounts();
  console.log('\n===============================================================');
  console.log('THONG KE CO SO DU LIEU SAU KHI DON DEP');
  console.log('===============================================================');
  for (const [table, count] of Object.entries(afterCounts)) {
    console.log(`- ${table.padEnd(25)}: ${count} dong`);
  }

  const remainingUsers = db.prepare('SELECT id, email, name, role, credit_balance, point_balance, status FROM users').all();
  console.log('\nDANH SACH TAI KHOAN CON LAI TRONG HE THONG:');
  for (const u of remainingUsers) {
    console.log(`- ${u.email.padEnd(30)} | ${u.name.padEnd(25)} | Vai tro: ${u.role.padEnd(10)} | Diem: ${u.point_balance} | Credit: ${u.credit_balance} | Trang thai: ${u.status}`);
  }

  console.log('\n[HOAN TAT] Tien trinh don dep du lieu demo da hoan thanh 100%.');
}

if (require.main === module) {
  cleanDemoData();
}

module.exports = { cleanDemoData };
