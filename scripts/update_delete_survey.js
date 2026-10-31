const fs = require('fs');

function updateController() {
  let code = fs.readFileSync('server/controllers/surveyController.js', 'utf8');
  const isCrlf = code.includes('\r\n');
  const nl = isCrlf ? '\r\n' : '\n';

  let oldBlock = [
    "        db.prepare('DELETE FROM fraud_logs WHERE survey_id = ?').run(id);",
    "        db.prepare('DELETE FROM notifications WHERE survey_id = ?').run(id);",
    "        db.prepare('DELETE FROM email_notifications_log WHERE survey_id = ?').run(id);",
    "        db.prepare('DELETE FROM voucher_codes WHERE survey_id = ?').run(id);",
    "        db.prepare('DELETE FROM responses WHERE survey_id = ?').run(id);",
    "        db.prepare('DELETE FROM questions WHERE survey_id = ?').run(id);",
    "        db.prepare('DELETE FROM warranty_claims WHERE survey_id = ?').run(id);"
  ].join(nl);

  let newBlock = [
    "        // 1. Dọn dẹp diễn đàn đính kèm khảo sát (forum_comments, forum_post_likes, forum_posts)",
    "        db.prepare('DELETE FROM forum_comments WHERE post_id IN (SELECT id FROM forum_posts WHERE survey_id = ?)').run(id);",
    "        db.prepare('DELETE FROM forum_post_likes WHERE post_id IN (SELECT id FROM forum_posts WHERE survey_id = ?)').run(id);",
    "        db.prepare('DELETE FROM forum_posts WHERE survey_id = ?').run(id);",
    "",
    "        // 2. Gỡ bỏ khóa ngoại voucher_codes trỏ tới responses của khảo sát",
    "        db.prepare('UPDATE voucher_codes SET claimed_response_id = NULL WHERE claimed_response_id IN (SELECT id FROM responses WHERE survey_id = ?)').run(id);",
    "",
    "        // 3. Xử lý voucher_codes gắn với survey_id: bảo toàn mã đã CLAIMED cho người nhận, xóa mã chưa phát",
    "        db.prepare(\"UPDATE voucher_codes SET survey_id = NULL WHERE survey_id = ? AND status = 'CLAIMED'\").run(id);",
    "        db.prepare('DELETE FROM voucher_codes WHERE survey_id = ?').run(id);",
    "",
    "        // 4. Dọn dẹp logs, thông báo, khiếu nại bảo hành",
    "        db.prepare('DELETE FROM fraud_logs WHERE survey_id = ?').run(id);",
    "        db.prepare('DELETE FROM notifications WHERE survey_id = ?').run(id);",
    "        db.prepare('DELETE FROM email_notifications_log WHERE survey_id = ?').run(id);",
    "        db.prepare('DELETE FROM warranty_claims WHERE survey_id = ?').run(id);",
    "",
    "        // 5. Xóa responses và questions",
    "        db.prepare('DELETE FROM responses WHERE survey_id = ?').run(id);",
    "        db.prepare('DELETE FROM questions WHERE survey_id = ?').run(id);"
  ].join(nl);

  if (code.includes(oldBlock)) {
    code = code.replace(oldBlock, newBlock);
    fs.writeFileSync('server/controllers/surveyController.js', code, 'utf8');
    console.log('Updated server/controllers/surveyController.js successfully');
  } else {
    console.error('Old block not found in controller');
  }
}

updateController();
