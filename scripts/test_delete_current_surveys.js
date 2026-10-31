const path = require('path');
const db = require(path.join(__dirname, '../server/db/database'));

const surveys = db.prepare('SELECT id, title, creator_id, status FROM surveys').all();
console.log(`Tong so khao sat trong DB: ${surveys.length}`);
for (const s of surveys) {
  // Kiem tra cac lien ket ngoai
  const responsesCount = db.prepare('SELECT COUNT(*) as c FROM responses WHERE survey_id = ?').get(s.id).c;
  const forumCount = db.prepare('SELECT COUNT(*) as c FROM forum_posts WHERE survey_id = ?').get(s.id).c;
  const voucherCount = db.prepare('SELECT COUNT(*) as c FROM voucher_codes WHERE survey_id = ?').get(s.id).c;
  const claimedVoucherCount = db.prepare('SELECT COUNT(*) as c FROM voucher_codes WHERE claimed_response_id IN (SELECT id FROM responses WHERE survey_id = ?)').get(s.id).c;
  const claimsCount = db.prepare('SELECT COUNT(*) as c FROM warranty_claims WHERE survey_id = ?').get(s.id).c;
  const notifCount = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE survey_id = ?').get(s.id).c;
  const emailCount = db.prepare('SELECT COUNT(*) as c FROM email_notifications_log WHERE survey_id = ?').get(s.id).c;
  const fraudCount = db.prepare('SELECT COUNT(*) as c FROM fraud_logs WHERE survey_id = ?').get(s.id).c;

  console.log(`Survey: [${s.id}] "${s.title}" (status: ${s.status})`);
  console.log(`  -> responses: ${responsesCount}, forum_posts: ${forumCount}, vouchers: ${voucherCount}, claimedVouchersOnResponses: ${claimedVoucherCount}, warranty: ${claimsCount}`);

  // Thu nghiem xoa trong ROLLBACK transaction de xem cai nao loi
  db.exec('BEGIN IMMEDIATE TRANSACTION');
  try {
    db.prepare('DELETE FROM fraud_logs WHERE survey_id = ?').run(s.id);
    db.prepare('DELETE FROM notifications WHERE survey_id = ?').run(s.id);
    db.prepare('DELETE FROM email_notifications_log WHERE survey_id = ?').run(s.id);
    db.prepare('DELETE FROM voucher_codes WHERE survey_id = ?').run(s.id);
    db.prepare('DELETE FROM responses WHERE survey_id = ?').run(s.id);
    db.prepare('DELETE FROM questions WHERE survey_id = ?').run(s.id);
    db.prepare('DELETE FROM warranty_claims WHERE survey_id = ?').run(s.id);
    db.prepare('DELETE FROM surveys WHERE id = ?').run(s.id);
    console.log('  -> Ket qua thu xoa: THANH CONG (se rollback)');
  } catch (err) {
    console.log(`  -> Ket qua thu xoa: LOI -> ${err.message}`);
  } finally {
    db.exec('ROLLBACK');
  }
}
