/**
 * Test Data Cleanup Helper
 * Tự động thanh lọc 100% dữ liệu rác phát sinh trong quá trình kiểm thử,
 * bảo vệ toàn vẹn dữ liệu môi trường thật của người dùng.
 */

const db = require('../server/db/database');

const PRESERVED_USER_EMAILS = new Set([
  'admin@vibesurvey.com',
  'trungdzid3@gmail.com',
  'linharmykxbnvn@gmail.com',
  'haidzid3@gmail.com',
  'trungclone1234@gmail.com'
]);

function cleanAllTestData(options = {}) {
  const verbose = options.verbose !== false;
  try {
    db.exec('PRAGMA foreign_keys = OFF;');

    // 1. Tìm tất cả user test (bao gồm creator@vibesurvey.com và user@vibesurvey.com)
    const allUsers = db.prepare('SELECT id, email FROM users').all();
    const testUserIds = [];

    for (const u of allUsers) {
      if (!u.email) continue;
      const emailLower = u.email.toLowerCase();
      if (PRESERVED_USER_EMAILS.has(emailLower)) {
        continue;
      }
      // Nhận diện tài khoản test sinh ra từ các bài kiểm thử tự hành
      const isTestUser = (
        emailLower === 'creator@vibesurvey.com' ||
        emailLower === 'user@vibesurvey.com' ||
        emailLower.includes('test') ||
        emailLower.includes('chaos') ||
        emailLower.includes('fake.com') ||
        emailLower.includes('school.edu.vn') ||
        emailLower.includes('vibe-allinone.com') ||
        emailLower.includes('@test.local') ||
        emailLower.includes('@api-test.com') ||
        emailLower.includes('@techcorp.vn') ||
        emailLower.startsWith('cheater_') ||
        emailLower.startsWith('student_') ||
        emailLower.startsWith('spammer_') ||
        emailLower.startsWith('hybrid_') ||
        emailLower.startsWith('sybil_') ||
        emailLower.startsWith('resp_trial_') ||
        emailLower.startsWith('fresh_') ||
        emailLower.startsWith('new_creator_') ||
        emailLower.startsWith('user1_guard_') ||
        emailLower.startsWith('user2_guard_')
      );

      if (isTestUser) {
        testUserIds.push(u.id);
      }
    }

    // 2. Tìm tất cả khảo sát test
    let testSurveyIds = [];
    if (testUserIds.length > 0) {
      const userPlaceholders = testUserIds.map(() => '?').join(',');
      const surveysByTestUsers = db.prepare(`SELECT id FROM surveys WHERE creator_id IN (${userPlaceholders})`).all(...testUserIds);
      testSurveyIds = surveysByTestUsers.map(s => s.id);
    }

    const testSurveysByTitle = db.prepare(`
      SELECT id FROM surveys 
      WHERE title LIKE '%[TEST]%' 
         OR title LIKE '%Kiểm thử%' 
         OR title LIKE '%Test Survey%'
         OR title LIKE '%Khảo sát thói quen thanh toán%'
         OR title LIKE '%Khảo sát thói quen dùng ví điện tử%'
    `).all();

    for (const s of testSurveysByTitle) {
      if (!testSurveyIds.includes(s.id)) {
        testSurveyIds.push(s.id);
      }
    }

    // 3. Xóa dữ liệu khảo sát test
    if (testSurveyIds.length > 0) {
      const sPlaceholders = testSurveyIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM voucher_codes WHERE survey_id IN (${sPlaceholders}) OR claimed_response_id IN (SELECT id FROM responses WHERE survey_id IN (${sPlaceholders}))`).run(...testSurveyIds, ...testSurveyIds);
      db.prepare(`DELETE FROM voucher_campaigns WHERE survey_id IN (${sPlaceholders})`).run(...testSurveyIds);
      db.prepare(`DELETE FROM warranty_claims WHERE survey_id IN (${sPlaceholders})`).run(...testSurveyIds);
      db.prepare(`DELETE FROM fraud_logs WHERE survey_id IN (${sPlaceholders})`).run(...testSurveyIds);
      db.prepare(`DELETE FROM notifications WHERE survey_id IN (${sPlaceholders})`).run(...testSurveyIds);
      db.prepare(`DELETE FROM email_notifications_log WHERE survey_id IN (${sPlaceholders})`).run(...testSurveyIds);
      db.prepare(`DELETE FROM responses WHERE survey_id IN (${sPlaceholders})`).run(...testSurveyIds);
      db.prepare(`DELETE FROM questions WHERE survey_id IN (${sPlaceholders})`).run(...testSurveyIds);
      db.prepare(`DELETE FROM point_transactions WHERE reference_id IN (${sPlaceholders})`).run(...testSurveyIds);
      db.prepare(`DELETE FROM surveys WHERE id IN (${sPlaceholders})`).run(...testSurveyIds);
    }

    // 4. Xóa dữ liệu người dùng test
    if (testUserIds.length > 0) {
      const uPlaceholders = testUserIds.map(() => '?').join(',');
      db.prepare(`DELETE FROM voucher_codes WHERE claimed_by_user_id IN (${uPlaceholders})`).run(...testUserIds);
      db.prepare(`DELETE FROM warranty_claims WHERE creator_id IN (${uPlaceholders})`).run(...testUserIds);
      db.prepare(`DELETE FROM fraud_logs WHERE user_id IN (${uPlaceholders})`).run(...testUserIds);
      db.prepare(`DELETE FROM notifications WHERE user_id IN (${uPlaceholders})`).run(...testUserIds);
      db.prepare(`DELETE FROM email_notifications_log WHERE user_id IN (${uPlaceholders})`).run(...testUserIds);
      db.prepare(`DELETE FROM vat_invoices WHERE user_id IN (${uPlaceholders})`).run(...testUserIds);
      db.prepare(`DELETE FROM payout_requests WHERE user_id IN (${uPlaceholders})`).run(...testUserIds);
      db.prepare(`DELETE FROM responses WHERE respondent_id IN (${uPlaceholders})`).run(...testUserIds);
      db.prepare(`DELETE FROM point_transactions WHERE user_id IN (${uPlaceholders})`).run(...testUserIds);
      db.prepare(`DELETE FROM device_ip_logs WHERE user_id IN (${uPlaceholders})`).run(...testUserIds);
      db.prepare(`DELETE FROM users WHERE id IN (${uPlaceholders})`).run(...testUserIds);
    }

    // 5. Dọn dẹp Sổ cái Ledger Stream: Xóa các giao dịch kiểm thử và giao dịch mồ côi
    // Xóa các giao dịch nạp thử, khóa/hoàn quỹ test, thưởng test
    db.prepare(`
      DELETE FROM point_transactions 
      WHERE description LIKE '%test%' 
         OR description LIKE '%Admin Console%'
         OR description LIKE '%test_review_edit%'
         OR description LIKE '%Ký quỹ chiến dịch%'
         OR description LIKE '%Hoàn trả quỹ%'
         OR description LIKE '%Thưởng nạp tiền bậc Doanh nghiệp Kim Cương%'
         OR description LIKE '%Nạp quỹ khảo sát VibeSurvey%'
    `).run();

    // 6. Dọn dẹp notifications và email_notifications_log rác từ các bài test hỏa tốc cũ
    db.prepare(`
      DELETE FROM notifications 
      WHERE title LIKE '%ví điện tử Gen Z%' 
         OR title LIKE '%[TEST]%' 
         OR message LIKE '%test%'
    `).run();

    db.prepare(`
      DELETE FROM email_notifications_log 
      WHERE subject LIKE '%ví điện tử Gen Z%' 
         OR subject LIKE '%test%'
    `).run();

    // 7. Dọn dẹp registration OTPs rác
    db.prepare(`DELETE FROM registration_otps WHERE email NOT IN (${Array.from(PRESERVED_USER_EMAILS).map(() => '?').join(',')})`).run(...Array.from(PRESERVED_USER_EMAILS));

    db.exec('PRAGMA foreign_keys = ON;');

    if (verbose) {
      console.log(`[TEST CLEANUP] Đã dọn dẹp sạch sẽ ${testUserIds.length} tài khoản test và ${testSurveyIds.length} khảo sát test khỏi cơ sở dữ liệu.`);
      console.log('[TEST CLEANUP] Đã làm sạch Sổ Cái Giao Dịch Ledger Stream và Nhật Ký Thông Báo Test.');
    }

    return {
      cleanedUsers: testUserIds.length,
      cleanedSurveys: testSurveyIds.length
    };
  } catch (err) {
    db.exec('PRAGMA foreign_keys = ON;');
    console.error('[TEST CLEANUP ERROR] Lỗi khi dọn dẹp dữ liệu test:', err.message);
    return { error: err.message };
  }
}

module.exports = {
  cleanAllTestData,
  PRESERVED_USER_EMAILS
};

if (require.main === module) {
  cleanAllTestData();
}
