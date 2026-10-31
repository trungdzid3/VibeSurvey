const path = require('path');
const db = require(path.join(__dirname, '../server/db/database'));
const crypto = require('crypto');

function safeDeleteSurvey(surveyId) {
  db.exec('BEGIN IMMEDIATE TRANSACTION');
  try {
    // 1. Dọn dẹp diễn đàn đính kèm khảo sát
    db.prepare('DELETE FROM forum_comments WHERE post_id IN (SELECT id FROM forum_posts WHERE survey_id = ?)').run(surveyId);
    db.prepare('DELETE FROM forum_post_likes WHERE post_id IN (SELECT id FROM forum_posts WHERE survey_id = ?)').run(surveyId);
    db.prepare('DELETE FROM forum_posts WHERE survey_id = ?').run(surveyId);

    // 2. Gỡ bỏ khóa ngoại voucher_codes trỏ tới responses của khảo sát
    db.prepare('UPDATE voucher_codes SET claimed_response_id = NULL WHERE claimed_response_id IN (SELECT id FROM responses WHERE survey_id = ?)').run(surveyId);

    // 3. Xử lý voucher_codes gắn với survey_id
    db.prepare("UPDATE voucher_codes SET survey_id = NULL WHERE survey_id = ? AND status = 'CLAIMED'").run(surveyId);
    db.prepare('DELETE FROM voucher_codes WHERE survey_id = ?').run(surveyId);

    // 4. Dọn dẹp fraud_logs, notifications, email_log, warranty_claims
    db.prepare('DELETE FROM fraud_logs WHERE survey_id = ?').run(surveyId);
    db.prepare('DELETE FROM notifications WHERE survey_id = ?').run(surveyId);
    db.prepare('DELETE FROM email_notifications_log WHERE survey_id = ?').run(surveyId);
    db.prepare('DELETE FROM warranty_claims WHERE survey_id = ?').run(surveyId);

    // 5. Xóa responses và questions
    db.prepare('DELETE FROM responses WHERE survey_id = ?').run(surveyId);
    db.prepare('DELETE FROM questions WHERE survey_id = ?').run(surveyId);

    // 6. Xóa chính bài khảo sát
    const res = db.prepare('DELETE FROM surveys WHERE id = ?').run(surveyId);
    db.exec('COMMIT');
    return res.changes > 0;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// Chạy thử nghiệm đồng thời cả Forum Post + Response + Voucher Claimed
const surveyId = crypto.randomUUID();
const userId = db.prepare('SELECT id FROM users LIMIT 1').get().id;
const campaignId = db.prepare('SELECT id FROM voucher_campaigns LIMIT 1').get()?.id;

db.prepare(`
  INSERT INTO surveys (id, creator_id, title, status, cost_per_response, reward_points_per_response, target_responses)
  VALUES (?, ?, 'Test Complex Survey With Everything', 'DRAFT', 500, 300, 10)
`).run(surveyId, userId);

// 1. Tao cau hoi
db.prepare(`
  INSERT INTO questions (id, survey_id, order_index, type, content)
  VALUES (?, ?, 1, 'SINGLE_CHOICE', 'Test Q')
`).run(crypto.randomUUID(), surveyId);

// 2. Tao response
const responseId = 'resp_' + crypto.randomUUID();
db.prepare(`
  INSERT INTO responses (id, survey_id, respondent_id, status, started_at)
  VALUES (?, ?, ?, 'VALIDATED', CURRENT_TIMESTAMP)
`).run(responseId, surveyId, userId);

// 3. Tao voucher code da claimed
const vcodeId = 'vc_' + crypto.randomUUID();
db.prepare(`
  INSERT INTO voucher_codes (id, campaign_id, survey_id, code, status, claimed_by_user_id, claimed_response_id)
  VALUES (?, ?, ?, 'CODE_' || hex(randomblob(8)), 'CLAIMED', ?, ?)
`).run(vcodeId, campaignId, surveyId, userId, responseId);

// 4. Tao forum post + comment + like
const postId = crypto.randomUUID();
db.prepare(`
  INSERT INTO forum_posts (id, user_id, survey_id, title, content)
  VALUES (?, ?, ?, 'Title', 'Content')
`).run(postId, userId, surveyId);

db.prepare(`
  INSERT INTO forum_comments (id, post_id, user_id, content)
  VALUES (?, ?, ?, 'A comment')
`).run(crypto.randomUUID(), postId, userId);

db.prepare(`
  INSERT INTO forum_post_likes (post_id, user_id)
  VALUES (?, ?)
`).run(postId, userId);

console.log('Đã tạo thành công mô hình dữ liệu phức tạp liên kết chéo.');

try {
  const ok = safeDeleteSurvey(surveyId);
  console.log('KẾT QUẢ XÓA KHẢO SÁT:', ok ? 'THÀNH CÔNG 100%' : 'KHÔNG TÌM THẤY');
} catch (err) {
  console.error('LỖI KHI XÓA:', err.message);
}

// Kiểm tra xem dữ liệu đã được dọn sạch hoàn toàn chưa
const checkSurvey = db.prepare('SELECT * FROM surveys WHERE id = ?').get(surveyId);
const checkPost = db.prepare('SELECT * FROM forum_posts WHERE id = ?').get(postId);
const checkResp = db.prepare('SELECT * FROM responses WHERE id = ?').get(responseId);
const checkVc = db.prepare('SELECT * FROM voucher_codes WHERE id = ?').get(vcodeId);

console.log('Check survey (phải null):', checkSurvey || null);
console.log('Check forum post (phải null):', checkPost || null);
console.log('Check response (phải null):', checkResp || null);
console.log('Check voucher code (survey_id & claimed_response_id phải null, status CLAIMED):', checkVc?.survey_id, checkVc?.claimed_response_id, checkVc?.status);

// Dọn dẹp voucher test nếu còn
if (checkVc) {
  db.prepare('DELETE FROM voucher_codes WHERE id = ?').run(vcodeId);
}
