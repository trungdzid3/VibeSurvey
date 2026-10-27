const db = require('../server/db/database');

console.log('=== BẮT ĐẦU DỌN DẸP TRIỆT ĐỂ TOÀN BỘ DATA DEMO/TEST ===');

// Danh sách các email tài khoản thật và tài khoản chuẩn hệ thống được BẢO TỒN NGUYÊN VẸN
const PRESERVED_EMAILS = [
  'trungdzid3@gmail.com',
  'linharmykxbnvn@gmail.com',
  'haidzid3@gmail.com',
  'trungclone1234@gmail.com',
  'admin@vibesurvey.com',
  'creator@vibesurvey.com',
  'user@vibesurvey.com'
];

try {
  // Tạm tắt ràng buộc khóa ngoại để dọn dẹp theo tầng không bị vướng
  db.exec('PRAGMA foreign_keys = OFF');
  db.exec('BEGIN TRANSACTION');

  // 1. Lấy danh sách ID các tài khoản được giữ lại
  const preservedUsers = db.prepare(`SELECT id, email FROM users WHERE email IN (${PRESERVED_EMAILS.map(() => '?').join(',')})`).all(...PRESERVED_EMAILS);
  const preservedIds = preservedUsers.map(u => u.id);
  console.log(`Tìm thấy ${preservedUsers.length} tài khoản cần bảo tồn:`, preservedUsers.map(u => u.email).join(', '));

  // 2. Xóa toàn bộ Khảo sát Demo (surveys), câu hỏi (questions), phản hồi (responses)
  const delResponses = db.prepare('DELETE FROM responses').run();
  console.log(`- Đã xóa ${delResponses.changes} lượt phản hồi khảo sát.`);

  const delQuestions = db.prepare('DELETE FROM questions').run();
  console.log(`- Đã xóa ${delQuestions.changes} câu hỏi khảo sát.`);

  const delSurveys = db.prepare('DELETE FROM surveys').run();
  console.log(`- Đã xóa ${delSurveys.changes} khảo sát demo.`);

  // 3. Xóa sạch Bảng Duyệt Tiền (payout_requests)
  const delPayouts = db.prepare('DELETE FROM payout_requests').run();
  console.log(`- Đã xóa ${delPayouts.changes} yêu cầu duyệt rút tiền demo.`);

  // 4. Xóa sạch Bảng Nhật Ký Gian Lận (fraud_logs) và IP bị chặn (banned_ips)
  const delFraud = db.prepare('DELETE FROM fraud_logs').run();
  console.log(`- Đã xóa ${delFraud.changes} nhật ký gian lận rác.`);

  const delBannedIps = db.prepare('DELETE FROM banned_ips').run();
  console.log(`- Đã xóa ${delBannedIps.changes} IP bị chặn test.`);

  // 5. Xóa sạch Hóa Đơn VAT Demo (vat_invoices)
  const delVat = db.prepare('DELETE FROM vat_invoices').run();
  console.log(`- Đã xóa ${delVat.changes} hóa đơn VAT demo.`);

  // 6. Xóa sạch Voucher Demo (voucher_codes, voucher_campaigns)
  const delVoucherCodes = db.prepare('DELETE FROM voucher_codes').run();
  console.log(`- Đã xóa ${delVoucherCodes.changes} mã voucher demo.`);

  const delVoucherCampaigns = db.prepare('DELETE FROM voucher_campaigns').run();
  console.log(`- Đã xóa ${delVoucherCampaigns.changes} chiến dịch voucher demo.`);

  // 7. Xóa sạch Mã OTP đăng ký rác (registration_otps)
  const delOtps = db.prepare('DELETE FROM registration_otps').run();
  console.log(`- Đã xóa ${delOtps.changes} OTP đăng ký rác.`);

  // 8. Xóa các dữ liệu phụ thuộc của những users test ảo sắp bị xóa
  const placeholders = preservedIds.map(() => '?').join(',');

  const delTrans = db.prepare(`DELETE FROM point_transactions WHERE user_id NOT IN (${placeholders})`).run(...preservedIds);
  console.log(`- Đã xóa ${delTrans.changes} giao dịch điểm của users test.`);

  const delNotifs = db.prepare(`DELETE FROM notifications WHERE user_id NOT IN (${placeholders})`).run(...preservedIds);
  console.log(`- Đã xóa ${delNotifs.changes} thông báo của users test.`);

  const delEmailLogs = db.prepare(`DELETE FROM email_notifications_log WHERE user_id NOT IN (${placeholders})`).run(...preservedIds);
  console.log(`- Đã xóa ${delEmailLogs.changes} log email của users test.`);

  const delDeviceLogs = db.prepare(`DELETE FROM device_ip_logs WHERE user_id NOT IN (${placeholders})`).run(...preservedIds);
  console.log(`- Đã xóa ${delDeviceLogs.changes} log thiết bị/IP của users test.`);

  // 9. Xóa toàn bộ Users ảo (không nằm trong danh sách bảo tồn)
  const delUsers = db.prepare(`DELETE FROM users WHERE id NOT IN (${placeholders})`).run(...preservedIds);
  console.log(`- Đã xóa ${delUsers.changes} tài khoản test ảo.`);

  // 10. Reset trạng thái sạch cho các tài khoản được giữ lại (đảm bảo không bị dính ban nhầm)
  const resetBanned = db.prepare(`UPDATE users SET status = 'ACTIVE', ban_reason = NULL, banned_at = NULL WHERE id IN (${placeholders})`).run(...preservedIds);
  console.log(`- Đã đảm bảo ${resetBanned.changes} tài khoản được giữ lại ở trạng thái ACTIVE sạch sẽ.`);

  db.exec('COMMIT');
  db.exec('PRAGMA foreign_keys = ON');
} catch (err) {
  db.exec('ROLLBACK');
  db.exec('PRAGMA foreign_keys = ON');
  console.error('Lỗi khi dọn dẹp data:', err);
  process.exit(1);
}

console.log('=== CHẠY VACUUM TỐI ƯU HÓA DATABASE ===');
db.exec('VACUUM');
console.log('=== DỌN DẸP HOÀN TẤT 100% ===');
