const path = require('path');
const db = require(path.join(__dirname, '../server/db/database'));
const crypto = require('crypto');

const surveyId = crypto.randomUUID();
const userId = db.prepare('SELECT id FROM users LIMIT 1').get().id;

db.prepare(`
  INSERT INTO surveys (id, creator_id, title, status, cost_per_response, reward_points_per_response, target_responses)
  VALUES (?, ?, 'Test Survey For Forum', 'DRAFT', 500, 300, 10)
`).run(surveyId, userId);

const postId = crypto.randomUUID();
db.prepare(`
  INSERT INTO forum_posts (id, user_id, survey_id, title, content)
  VALUES (?, ?, ?, 'Test Forum Post', 'Post content')
`).run(postId, userId, surveyId);

console.log('Da tao survey va forum post.');

try {
  db.exec('BEGIN IMMEDIATE TRANSACTION');
  db.prepare('DELETE FROM fraud_logs WHERE survey_id = ?').run(surveyId);
  db.prepare('DELETE FROM notifications WHERE survey_id = ?').run(surveyId);
  db.prepare('DELETE FROM email_notifications_log WHERE survey_id = ?').run(surveyId);
  db.prepare('DELETE FROM voucher_codes WHERE survey_id = ?').run(surveyId);
  db.prepare('DELETE FROM responses WHERE survey_id = ?').run(surveyId);
  db.prepare('DELETE FROM questions WHERE survey_id = ?').run(surveyId);
  db.prepare('DELETE FROM warranty_claims WHERE survey_id = ?').run(surveyId);
  db.prepare('DELETE FROM surveys WHERE id = ?').run(surveyId);
  db.exec('COMMIT');
  console.log('Xoa thanh cong (khong bi loi FK)');
} catch (err) {
  console.log('BỊ LỖI ĐÚNG NHƯ DỰ ĐOÁN:', err.message);
  db.exec('ROLLBACK');
}

// Cleanup
db.prepare('DELETE FROM forum_posts WHERE id = ?').run(postId);
db.prepare('DELETE FROM surveys WHERE id = ?').run(surveyId);
