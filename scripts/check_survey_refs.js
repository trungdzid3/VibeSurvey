const path = require('path');
const db = require(path.join(__dirname, '../server/db/database'));

// Kiem tra thu tao 1 survey, tao responses, tao forum_post, tao voucher_codes gan voi response roi chay thu nghiem xoa
console.log('--- KIEM TRA TOAN BO CAC BANG CO COT survey_id ---');
const tables = db.prepare("SELECT name, sql FROM sqlite_master WHERE type='table'").all();
for (const t of tables) {
  const cols = db.prepare(`PRAGMA table_info(${t.name})`).all();
  const hasSurveyId = cols.some(c => c.name === 'survey_id');
  const hasResponseId = cols.some(c => c.name === 'response_id' || c.name === 'claimed_response_id');
  if (hasSurveyId || hasResponseId) {
    console.log(`Table ${t.name}: hasSurveyId=${hasSurveyId}, hasResponseId=${hasResponseId}`);
  }
}
