const path = require('path');
const db = require(path.join(__dirname, '../server/db/database'));
const crypto = require('crypto');

const surveyId = crypto.randomUUID();
const userId = db.prepare('SELECT id FROM users LIMIT 1').get().id;
const campaignId = db.prepare('SELECT id FROM voucher_campaigns LIMIT 1').get()?.id;

if (!campaignId) {
  console.log('No voucher campaign');
  process.exit(0);
}

db.prepare(`
  INSERT INTO surveys (id, creator_id, title, status, cost_per_response, reward_points_per_response, target_responses)
  VALUES (?, ?, 'Test Survey For Voucher Claimed', 'DRAFT', 500, 300, 10)
`).run(surveyId, userId);

const responseId = 'resp_' + crypto.randomUUID();
db.prepare(`
  INSERT INTO responses (id, survey_id, respondent_id, status, started_at)
  VALUES (?, ?, ?, 'VALIDATED', CURRENT_TIMESTAMP)
`).run(responseId, surveyId, userId);

const vcodeId = 'vc_' + crypto.randomUUID();
// Voucher co survey_id = NULL nhung claimed_response_id = responseId (vi du voucher cua san phat thuong)
db.prepare(`
  INSERT INTO voucher_codes (id, campaign_id, survey_id, code, status, claimed_by_user_id, claimed_response_id)
  VALUES (?, ?, NULL, 'TESTCODE123', 'CLAIMED', ?, ?)
`).run(vcodeId, campaignId, userId, responseId);

console.log('Da tao survey, response, va voucher co claimed_response_id.');

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
  console.log('Xoa thanh cong');
} catch (err) {
  console.log('BỊ LỖI KỊCH BẢN VOUCHER:', err.message);
  db.exec('ROLLBACK');
}

// Cleanup
db.prepare('DELETE FROM voucher_codes WHERE id = ?').run(vcodeId);
db.prepare('DELETE FROM responses WHERE id = ?').run(responseId);
db.prepare('DELETE FROM surveys WHERE id = ?').run(surveyId);
