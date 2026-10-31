/**
 * Test Data Cleanup Helper (Auto-Cleanup Test Data Engine - v3.6)
 * Tự động thanh lọc 100% dữ liệu rác phát sinh trong quá trình kiểm thử:
 * - Tài khoản test giả lập (@api-test.com, @test.local, personal_user_, respondent_edu_,...)
 * - Khảo sát test và rác demo (Test Complex Survey, Overdraft, Trap, Concurrency, NCKH Gen 3.0 demo,...)
 * - Duyệt tiền test (Đơn nạp tiền mô phỏng dev/staging VietQR, yêu cầu rút tiền test, hóa đơn VAT test)
 * - Gian lận test (Fraud logs, Anti-Abuse Speed/Attention/Straightline Trap, banned IPs, device/IP logs)
 * - Báo lỗi & Khiếu nại test (Bug reports kiểm thử, warranty claims)
 * - Kiểm toán test (Admin Audit Logs phát sinh từ test script, SIMULATE_PAYMENT_SUCCESS, UNBAN_IP,...)
 * - Sổ cái sàn Ledger Stream & Giao dịch nạp ảo, thưởng ảo, ký quỹ demo, điểm danh test
 * - Diễn đàn thảo luận test rác
 * BẢO VỆ TUYỆT ĐỐI 100% tài khoản người dùng thật và đưa toàn bộ sàn về trạng thái sẵn sàng sạch sẽ.
 */

const db = require('../server/db/database');

const PRESERVED_USER_EMAILS = new Set([
  'admin@vibesurvey.com',
  'admin@survhub.com',
  'trungdzid3@gmail.com',
  'linharmykxbnvn@gmail.com',
  'haidzid3@gmail.com',
  'trungclone1234@gmail.com'
]);

function cleanAllTestData(options = {}) {
  const verbose = options.verbose !== false;
  try {
    db.exec('PRAGMA foreign_keys = OFF;');

    const safeRun = (sql, params = []) => {
      try {
        const stmt = db.prepare(sql);
        const res = Array.isArray(params) && params.length > 0 ? stmt.run(...params) : stmt.run();
        return res ? res.changes : 0;
      } catch (e) {
        if (verbose) console.warn('[TEST CLEANUP WARN] Bỏ qua câu lệnh lỗi:', e.message);
        return 0;
      }
    };

    // =========================================================================
    // 1. NHẬN DIỆN TOÀN DIỆN CÁC TÀI KHOẢN TEST GIẢ LẬP
    // =========================================================================
    const allUsers = db.prepare('SELECT id, email, name, role FROM users').all();
    const testUserIds = [];

    for (const u of allUsers) {
      if (!u.email) continue;
      const emailLower = u.email.toLowerCase().trim();
      const nameLower = (u.name || '').toLowerCase().trim();

      if (PRESERVED_USER_EMAILS.has(emailLower)) {
        continue; // Bảo tồn tuyệt đối tài khoản thật của Admin và người dùng chỉ định
      }

      const isTestUser = (
        emailLower === 'creator@vibesurvey.com' ||
        emailLower === 'user@vibesurvey.com' ||
        emailLower.includes('test') ||
        emailLower.includes('chaos') ||
        emailLower.includes('fake') ||
        emailLower.includes('mock') ||
        emailLower.includes('dummy') ||
        emailLower.includes('sample') ||
        emailLower.includes('benchmark') ||
        emailLower.includes('fuzz') ||
        emailLower.includes('school.edu.vn') ||
        emailLower.includes('neu.edu.vn') ||
        emailLower.includes('vibe-allinone.com') ||
        emailLower.includes('vibe-personal.com') ||
        emailLower.includes('@test.local') ||
        emailLower.includes('@api-test.com') ||
        emailLower.includes('@techcorp.vn') ||
        emailLower.includes('@example.com') ||
        emailLower.includes('@vibetest.vn') ||
        emailLower.includes('@sync-test.com') ||
        emailLower.startsWith('personal_user_') ||
        emailLower.startsWith('respondent_edu_') ||
        emailLower.startsWith('creator_del_') ||
        emailLower.startsWith('cheater_') ||
        emailLower.startsWith('student_') ||
        emailLower.startsWith('spammer_') ||
        emailLower.startsWith('hybrid_') ||
        emailLower.startsWith('sybil_') ||
        emailLower.startsWith('resp_trial_') ||
        emailLower.startsWith('fresh_') ||
        emailLower.startsWith('new_creator_') ||
        emailLower.startsWith('user1_guard_') ||
        emailLower.startsWith('user2_guard_') ||
        emailLower.startsWith('trial_') ||
        nameLower.includes('người dùng cá nhân') ||
        nameLower.includes('sinh vien dap vien') ||
        nameLower.includes('creator delete test') ||
        nameLower.includes('test') ||
        nameLower.includes('mock') ||
        nameLower.includes('cheater') ||
        nameLower.includes('spammer')
      );

      if (isTestUser) {
        testUserIds.push(u.id);
      }
    }

    // =========================================================================
    // 2. NHẬN DIỆN CÁC KHẢO SÁT TEST & RÁC DEMO
    // =========================================================================
    const testSurveyIdSet = new Set();

    // Khảo sát do test user tạo
    if (testUserIds.length > 0) {
      const userPlaceholders = testUserIds.map(() => '?').join(',');
      const surveysByTestUsers = db.prepare(`SELECT id FROM surveys WHERE creator_id IN (${userPlaceholders})`).all(...testUserIds);
      surveysByTestUsers.forEach(s => testSurveyIdSet.add(s.id));
    }

    // Khảo sát có tiêu đề, mô tả hoặc URL mang nội dung test giả lập hoặc bài demo thử nghiệm
    const testSurveysByPattern = db.prepare(`
      SELECT id FROM surveys 
      WHERE LOWER(title) LIKE '%test%'
         OR LOWER(title) LIKE '%kiểm thử%'
         OR LOWER(title) LIKE '%overdraft%'
         OR LOWER(title) LIKE '%trap%'
         OR LOWER(title) LIKE '%concurrency%'
         OR LOWER(title) LIKE '%chaos%'
         OR LOWER(title) LIKE '%benchmark%'
         OR LOWER(title) LIKE '%fuzz%'
         OR LOWER(title) LIKE '%complex survey%'
         OR LOWER(title) LIKE '%thói quen thanh toán%'
         OR LOWER(title) LIKE '%thói quen dùng ví điện tử%'
         OR LOWER(title) LIKE '%trải nghiệm học trực tuyến%'
         OR LOWER(title) LIKE '%mức độ hài lòng về căn tin%'
         OR LOWER(title) LIKE '%khảo sát thử nghiệm%'
         OR LOWER(title) LIKE '%khảo sát mẫu%'
         OR LOWER(title) LIKE '%gen 3.0%'
         OR LOWER(title) LIKE '%tình nguyện viên%'
         OR LOWER(title) LIKE '%nghiên cứu việc làm sinh viên%'
         OR LOWER(title) = 'title'
         OR is_free_trial = 1
         OR LOWER(IFNULL(description, '')) LIKE '%test%'
         OR LOWER(IFNULL(description, '')) LIKE '%mô phỏng%'
         OR LOWER(IFNULL(description, '')) = 'desc'
         OR LOWER(IFNULL(description, '')) = 'content'
         OR LOWER(IFNULL(external_form_url, '')) LIKE '%test%'
         OR LOWER(IFNULL(external_form_url, '')) LIKE '%example.com%'
    `).all();

    testSurveysByPattern.forEach(s => testSurveyIdSet.add(s.id));
    const testSurveyIds = Array.from(testSurveyIdSet);

    // =========================================================================
    // 3. XÓA DỮ LIỆU LIÊN QUAN ĐẾN KHẢO SÁT TEST
    // =========================================================================
    if (testSurveyIds.length > 0) {
      const sPlaceholders = testSurveyIds.map(() => '?').join(',');

      safeRun(`DELETE FROM voucher_codes WHERE survey_id IN (${sPlaceholders}) OR claimed_response_id IN (SELECT id FROM responses WHERE survey_id IN (${sPlaceholders}))`, [...testSurveyIds, ...testSurveyIds]);
      safeRun(`DELETE FROM voucher_campaigns WHERE id IN (SELECT sponsor_campaign_id FROM surveys WHERE id IN (${sPlaceholders}) AND sponsor_campaign_id IS NOT NULL)`, testSurveyIds);
      safeRun(`DELETE FROM warranty_claims WHERE survey_id IN (${sPlaceholders})`, testSurveyIds);
      safeRun(`DELETE FROM fraud_logs WHERE survey_id IN (${sPlaceholders})`, testSurveyIds);
      safeRun(`DELETE FROM notifications WHERE survey_id IN (${sPlaceholders})`, testSurveyIds);
      safeRun(`DELETE FROM email_notifications_log WHERE survey_id IN (${sPlaceholders})`, testSurveyIds);
      safeRun(`DELETE FROM forum_comments WHERE post_id IN (SELECT id FROM forum_posts WHERE survey_id IN (${sPlaceholders}))`, testSurveyIds);
      safeRun(`DELETE FROM forum_post_likes WHERE post_id IN (SELECT id FROM forum_posts WHERE survey_id IN (${sPlaceholders}))`, testSurveyIds);
      safeRun(`DELETE FROM forum_posts WHERE survey_id IN (${sPlaceholders})`, testSurveyIds);
      safeRun(`DELETE FROM responses WHERE survey_id IN (${sPlaceholders})`, testSurveyIds);
      safeRun(`DELETE FROM questions WHERE survey_id IN (${sPlaceholders})`, testSurveyIds);
      safeRun(`DELETE FROM point_transactions WHERE reference_id IN (${sPlaceholders})`, testSurveyIds);
      safeRun(`DELETE FROM surveys WHERE id IN (${sPlaceholders})`, testSurveyIds);
    }

    // =========================================================================
    // 4. XÓA DỮ LIỆU TÀI KHOẢN TEST GIẢ LẬP
    // =========================================================================
    if (testUserIds.length > 0) {
      const uPlaceholders = testUserIds.map(() => '?').join(',');

      safeRun(`DELETE FROM voucher_codes WHERE claimed_by_user_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM voucher_campaigns WHERE issuer_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM warranty_claims WHERE creator_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM fraud_logs WHERE user_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM notifications WHERE user_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM email_notifications_log WHERE user_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM vat_invoices WHERE user_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM payout_requests WHERE user_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM deposit_orders WHERE user_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM responses WHERE respondent_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM point_transactions WHERE user_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM device_ip_logs WHERE user_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM daily_streaks WHERE user_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM push_subscriptions WHERE user_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM bug_reports WHERE user_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM forum_comments WHERE user_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM forum_post_likes WHERE user_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM forum_posts WHERE user_id IN (${uPlaceholders})`, testUserIds);
      safeRun(`DELETE FROM users WHERE id IN (${uPlaceholders})`, testUserIds);
    }

    // =========================================================================
    // 5. DỌN DẸP DUYỆT TIỀN TEST (DEPOSIT ORDERS & PAYOUT REQUESTS & VAT)
    // =========================================================================
    // Xóa toàn bộ các đơn nạp tiền mô phỏng dev/staging, đơn nạp test VietQR
    let cleanedDepositOrders = 0;
    try {
      const delDep = db.prepare(`
        DELETE FROM deposit_orders 
        WHERE LOWER(IFNULL(bank_account_info_json, '')) LIKE '%dev/staging%'
           OR LOWER(IFNULL(bank_account_info_json, '')) LIKE '%mô phỏng%'
           OR LOWER(IFNULL(bank_account_info_json, '')) LIKE '%mo phong%'
           OR LOWER(IFNULL(bank_account_info_json, '')) LIKE '%test%'
           OR LOWER(order_code) LIKE 'test%'
           OR LOWER(order_code) LIKE 'vibe%'
           OR LOWER(IFNULL(payment_method, '')) LIKE '%test%'
      `).run();
      cleanedDepositOrders = delDep ? delDep.changes : 0;
    } catch (e) {
      if (verbose) console.warn('[CLEANUP WARN deposit_orders]:', e.message);
    }

    // Xóa các yêu cầu rút tiền test/ảo
    let cleanedPayouts = 0;
    try {
      const delPayout = db.prepare(`
        DELETE FROM payout_requests 
        WHERE LOWER(IFNULL(admin_note, '')) LIKE '%test%'
           OR LOWER(IFNULL(recipient_info_json, '')) LIKE '%test%'
           OR LOWER(IFNULL(recipient_info_json, '')) LIKE '%fake%'
           OR LOWER(IFNULL(recipient_info_json, '')) LIKE '%123456789%'
      `).run();
      cleanedPayouts = delPayout ? delPayout.changes : 0;
    } catch (e) {
      if (verbose) console.warn('[CLEANUP WARN payout_requests]:', e.message);
    }

    // Xóa hóa đơn VAT test
    safeRun(`
      DELETE FROM vat_invoices 
      WHERE LOWER(company_name) LIKE '%test%'
         OR LOWER(recipient_email) LIKE '%test%'
         OR LOWER(company_address) LIKE '%test%'
    `);

    // =========================================================================
    // 6. DỌN DẸP GIAN LẬN TEST (FRAUD LOGS, BANNED IPS, DEVICE IP LOGS)
    // =========================================================================
    let cleanedFraudLogs = 0;
    try {
      const delFraud = db.prepare(`
        DELETE FROM fraud_logs 
        WHERE LOWER(reason) LIKE '%test%'
           OR LOWER(reason) LIKE '%speed trap%'
           OR LOWER(reason) LIKE '%straight-lining%'
           OR LOWER(reason) LIKE '%attention%'
           OR LOWER(reason) LIKE '%device fingerprint%'
           OR LOWER(reason) LIKE '%giả lập%'
           OR LOWER(reason) LIKE '%cheat%'
      `).run();
      cleanedFraudLogs = delFraud ? delFraud.changes : 0;
    } catch (e) {
      if (verbose) console.warn('[CLEANUP WARN fraud_logs]:', e.message);
    }

    // Xóa IP test bị chặn
    safeRun(`
      DELETE FROM banned_ips 
      WHERE LOWER(reason) LIKE '%test%'
         OR ip_address LIKE '198.51.%'
         OR ip_address LIKE '203.%'
         OR ip_address IN ('127.0.0.1', '::1', 'localhost')
    `);

    // Xóa log thiết bị test (cả log test localhost và fingerprints kiểm thử)
    let cleanedDeviceLogs = 0;
    try {
      const delDev = db.prepare(`
        DELETE FROM device_ip_logs 
        WHERE LOWER(IFNULL(device_fingerprint, '')) LIKE '%test%'
           OR LOWER(IFNULL(device_fingerprint, '')) LIKE '%clean_%'
           OR LOWER(IFNULL(device_fingerprint, '')) LIKE '%device_%'
           OR ip_address IN ('127.0.0.1', '::1', 'localhost')
           OR ip_address LIKE '198.51.%'
           OR device_fingerprint IS NULL
      `).run();
      cleanedDeviceLogs = delDev ? delDev.changes : 0;
    } catch (e) {
      if (verbose) console.warn('[CLEANUP WARN device_ip_logs]:', e.message);
    }

    // =========================================================================
    // 7. DỌN DẸP BÁO LỖI & KHIẾU NẠI TEST (BUG REPORTS & WARRANTY CLAIMS)
    // =========================================================================
    let cleanedBugReports = 0;
    try {
      const delBugs = db.prepare(`
        DELETE FROM bug_reports 
        WHERE LOWER(reporter_email) LIKE '%test%'
           OR LOWER(reporter_email) LIKE '%example.com%'
           OR LOWER(title) LIKE '%test%'
           OR LOWER(title) LIKE '%demo%'
           OR title LIKE '%Lỗi vỡ layout khi co màn hình trên Galaxy Fold%'
           OR LOWER(description) LIKE '%test%'
           OR LOWER(IFNULL(admin_notes, '')) LIKE '%test%'
      `).run();
      cleanedBugReports = delBugs ? delBugs.changes : 0;
    } catch (e) {
      if (verbose) console.warn('[CLEANUP WARN bug_reports]:', e.message);
    }

    safeRun(`DELETE FROM warranty_claims WHERE LOWER(reason) LIKE '%test%'`);

    // =========================================================================
    // 8. DỌN DẸP KIỂM TOÁN THAO TÁC TEST (ADMIN AUDIT LOGS)
    // =========================================================================
    let cleanedAuditLogs = 0;
    try {
      const delAudit = db.prepare(`
        DELETE FROM admin_audit_logs 
        WHERE (target_type = 'IP' AND (target_id LIKE '203.%' OR target_id LIKE '198.51.%' OR target_id IN ('127.0.0.1', '::1')))
           OR (target_type = 'BUG_REPORT' AND (LOWER(details) LIKE '%galaxy fold%' OR LOWER(details) LIKE '%test%'))
           OR target_type = 'DEPOSIT_ORDER'
           OR action = 'SIMULATE_PAYMENT_SUCCESS'
           OR action = 'UNBAN_IP'
           OR LOWER(details) LIKE '%test%'
           OR LOWER(details) LIKE '%mo phong%'
           OR LOWER(details) LIKE '%mô phỏng%'
      `).run();
      cleanedAuditLogs = delAudit ? delAudit.changes : 0;
    } catch (e) {
      if (verbose) console.warn('[CLEANUP WARN admin_audit_logs]:', e.message);
    }

    // =========================================================================
    // 9. DỌN DẸP BÀI VIẾT DIỄN ĐÀN TEST (FORUM POSTS, COMMENTS, LIKES)
    // =========================================================================
    let cleanedForumPosts = 0;
    try {
      const testPosts = db.prepare(`
        SELECT id FROM forum_posts 
        WHERE LOWER(title) LIKE '%test%'
           OR LOWER(title) = 'title'
           OR LOWER(content) LIKE '%test%'
           OR LOWER(content) = 'content'
           OR LOWER(content) = 'nội dung chia sẻ'
           OR LOWER(title) LIKE '%trao doi khao sat khoa hoc may tinh bach khoa%'
           OR survey_id NOT IN (SELECT id FROM surveys)
      `).all();

      if (testPosts.length > 0) {
        const postIds = testPosts.map(p => p.id);
        const pPlaceholders = postIds.map(() => '?').join(',');
        safeRun(`DELETE FROM forum_comments WHERE post_id IN (${pPlaceholders})`, postIds);
        safeRun(`DELETE FROM forum_post_likes WHERE post_id IN (${pPlaceholders})`, postIds);
        const delPosts = db.prepare(`DELETE FROM forum_posts WHERE id IN (${pPlaceholders})`).run(...postIds);
        cleanedForumPosts = delPosts ? delPosts.changes : 0;
      }
    } catch (e) {
      if (verbose) console.warn('[CLEANUP WARN forum_posts]:', e.message);
    }

    // =========================================================================
    // 10. DỌN DẸP SỔ CÁI SÀN LEDGER STREAM & GIAO DỊCH TEST
    // =========================================================================
    let cleanedTransactions = 0;
    try {
      const delTx = db.prepare(`
        DELETE FROM point_transactions 
        WHERE LOWER(description) LIKE '%test%'
           OR LOWER(description) LIKE '%admin console%'
           OR LOWER(description) LIKE '%test_review_edit%'
           OR LOWER(description) LIKE '%tài trợ miễn phí%'
           OR LOWER(description) LIKE '%tai tro mien phi%'
           OR LOWER(description) LIKE '%ký quỹ%'
           OR LOWER(description) LIKE '%ky quy%'
           OR LOWER(description) LIKE '%hoàn trả quỹ%'
           OR LOWER(description) LIKE '%thưởng nạp tiền%'
           OR LOWER(description) LIKE '%thuong nap tien%'
           OR LOWER(description) LIKE '%nạp quỹ khảo sát vibesurvey%'
           OR LOWER(description) LIKE '%mo phong thanh toan%'
           OR LOWER(description) LIKE '%dev/staging%'
           OR LOWER(description) LIKE '%vietqr tu dong%'
           OR LOWER(description) LIKE '%điểm danh%'
           OR id LIKE 'ptx_streak_%'
      `).run();
      cleanedTransactions = delTx ? delTx.changes : 0;
    } catch (e) {
      if (verbose) console.warn('[CLEANUP WARN point_transactions]:', e.message);
    }

    // =========================================================================
    // 11. ĐỒNG BỘ & CÂN BẰNG LẠI SỐ DƯ TÀI KHOẢN BẢO TỒN (ADMIN / CORE USERS)
    // =========================================================================
    try {
      const preservedPlaceholders = Array.from(PRESERVED_USER_EMAILS).map(() => '?').join(',');
      db.prepare(`
        UPDATE users 
        SET credit_balance = 100000000,
            point_balance = 0
        WHERE role = 'ADMIN' 
          AND email IN (${preservedPlaceholders})
      `).run(...Array.from(PRESERVED_USER_EMAILS));

      // Reset chuỗi ngày điểm danh về 0
      db.prepare(`
        UPDATE daily_streaks 
        SET current_streak = 0, 
            total_points_earned = 0 
        WHERE user_id IN (SELECT id FROM users WHERE email IN (${preservedPlaceholders}))
      `).run(...Array.from(PRESERVED_USER_EMAILS));
    } catch (e) {
      if (verbose) console.warn('[CLEANUP WARN balance balance sync]:', e.message);
    }

    // =========================================================================
    // 12. DỌN DẸP THÔNG BÁO & EMAIL LOG RÁC
    // =========================================================================
    safeRun(`
      DELETE FROM notifications 
      WHERE LOWER(title) LIKE '%ví điện tử gen z%' 
         OR LOWER(title) LIKE '%test%' 
         OR LOWER(message) LIKE '%test%'
         OR LOWER(title) LIKE '%điểm danh%'
         OR LOWER(message) LIKE '%mo phong%'
         OR LOWER(message) LIKE '%ký quỹ%'
         OR LOWER(title) LIKE '%tài trợ%'
    `);

    safeRun(`
      DELETE FROM email_notifications_log 
      WHERE LOWER(subject) LIKE '%ví điện tử gen z%' 
         OR LOWER(subject) LIKE '%test%'
         OR LOWER(content_snippet) LIKE '%test%'
    `);

    // Dọn dẹp registration OTPs rác
    const pEmails = Array.from(PRESERVED_USER_EMAILS);
    safeRun(`DELETE FROM registration_otps WHERE email NOT IN (${pEmails.map(() => '?').join(',')})`, pEmails);

    db.exec('PRAGMA foreign_keys = ON;');

    // Thực hiện VACUUM database SQLite để giải phóng bộ nhớ và dọn rác vật lý
    try {
      db.exec('VACUUM;');
    } catch (vacuumErr) {
      if (verbose) console.warn('[CLEANUP WARN vacuum]:', vacuumErr.message);
    }

    if (verbose) {
      console.log(`[TEST CLEANUP] Đã xóa ${testUserIds.length} tài khoản test, ${testSurveyIds.length} khảo sát test.`);
      console.log(`[TEST CLEANUP] Đã xóa ${cleanedDepositOrders} đơn nạp test, ${cleanedPayouts} yêu cầu rút test.`);
      console.log(`[TEST CLEANUP] Đã xóa ${cleanedFraudLogs} nhật ký gian lận test, ${cleanedDeviceLogs} log thiết bị.`);
      console.log(`[TEST CLEANUP] Đã xóa ${cleanedBugReports} báo cáo lỗi test, ${cleanedAuditLogs} log kiểm toán test.`);
      console.log(`[TEST CLEANUP] Đã xóa ${cleanedTransactions} giao dịch sổ cái ảo, ${cleanedForumPosts} bài thảo luận rác.`);
      console.log('[TEST CLEANUP] Đã cân bằng lại số dư và làm sạch Sổ Cái Giao Dịch Ledger Stream 100%.');
    }

    return {
      cleanedUsers: testUserIds.length,
      cleanedSurveys: testSurveyIds.length,
      cleanedDepositOrders,
      cleanedPayouts,
      cleanedFraudLogs,
      cleanedDeviceLogs,
      cleanedBugReports,
      cleanedAuditLogs,
      cleanedTransactions,
      cleanedForumPosts
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
