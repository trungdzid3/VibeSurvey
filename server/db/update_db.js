const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.js');
let code = fs.readFileSync(dbPath, 'utf8');

// 1. Thay đổi CREATE TABLE questions
code = code.replace(
  /type TEXT NOT NULL CHECK\(type IN \('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'LIKERT_SCALE', 'OPEN_TEXT'\)\),/g,
  'type TEXT NOT NULL,\r\n      rows_json TEXT,\r\n      columns_json TEXT,\r\n      is_required INTEGER DEFAULT 1,'
);

// 2. Thay đổi CREATE TABLE responses
code = code.replace(
  /CHECK\(status IN \('IN_PROGRESS', 'VALIDATED', 'FLAGGED_MANUAL', 'REJECTED_FRAUD'\)\)/g,
  "CHECK(status IN ('IN_PROGRESS', 'VALIDATED', 'FLAGGED_MANUAL', 'REJECTED_FRAUD', 'SCREENED_OUT', 'WARRANTY_REPLACED'))"
);

// 3. Thêm cột vào danh sách migrations
const migrationAdditions = `    'ALTER TABLE questions ADD COLUMN is_required INTEGER DEFAULT 1;',
    'ALTER TABLE questions ADD COLUMN rows_json TEXT;',
    'ALTER TABLE questions ADD COLUMN columns_json TEXT;',
    'ALTER TABLE surveys ADD COLUMN package_type TEXT DEFAULT \\'PERSONAL\\';',
    'ALTER TABLE surveys ADD COLUMN pricing_tier TEXT DEFAULT \\'STANDARD\\';',
    'ALTER TABLE surveys ADD COLUMN completed_at TEXT;',
    \`CREATE TABLE IF NOT EXISTS warranty_claims (
      id TEXT PRIMARY KEY,
      survey_id TEXT NOT NULL REFERENCES surveys(id),
      creator_id TEXT NOT NULL REFERENCES users(id),
      response_ids_json TEXT NOT NULL,
      replaced_count INTEGER NOT NULL,
      reason TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );\`,
    'CREATE INDEX IF NOT EXISTS idx_warranty_survey ON warranty_claims(survey_id);',
    'CREATE INDEX IF NOT EXISTS idx_warranty_creator ON warranty_claims(creator_id);',`;

if (!code.includes('warranty_claims')) {
  code = code.replace(
    "'ALTER TABLE users ADD COLUMN monthly_income TEXT;',",
    "'ALTER TABLE users ADD COLUMN monthly_income TEXT;',\r\n" + migrationAdditions
  );
}

// 4. Migration v2.6 nâng cấp bảng questions và responses
const migrationCode = `
  // Migration v2.6: Nâng cấp bảng questions (bỏ CHECK constraint type cũ để hỗ trợ 12 định dạng, thêm is_required, rows_json, columns_json)
  try {
    const qTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='questions'").get();
    if (qTableSql && qTableSql.sql && qTableSql.sql.includes("CHECK(type IN")) {
      db.exec(\`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE questions_new (
          id TEXT PRIMARY KEY,
          survey_id TEXT NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
          order_index INTEGER NOT NULL,
          type TEXT NOT NULL,
          content TEXT NOT NULL,
          options_json TEXT,
          rows_json TEXT,
          columns_json TEXT,
          is_required INTEGER DEFAULT 1,
          is_attention_check INTEGER DEFAULT 0,
          expected_answer TEXT,
          is_screener INTEGER DEFAULT 0,
          qualifying_answer TEXT
        );
        INSERT INTO questions_new (id, survey_id, order_index, type, content, options_json, is_required, is_attention_check, expected_answer, is_screener, qualifying_answer)
        SELECT id, survey_id, order_index, type, content, options_json, COALESCE(is_required, 1), is_attention_check, expected_answer, is_screener, qualifying_answer FROM questions;
        DROP TABLE questions;
        ALTER TABLE questions_new RENAME TO questions;
        CREATE INDEX IF NOT EXISTS idx_questions_survey ON questions(survey_id);
        PRAGMA foreign_keys = ON;
      \`);
      console.log('[DB Migration] Đã nâng cấp bảng questions hỗ trợ trọn vẹn 12 định dạng và cờ is_required.');
    }
  } catch (err) {
    console.warn('[DB Migration] Nâng cấp bảng questions gặp chú ý:', err.message);
  }

  // Migration v2.6: Nâng cấp bảng responses hỗ trợ trạng thái SCREENED_OUT và WARRANTY_REPLACED
  try {
    const respTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='responses'").get();
    if (respTableSql && respTableSql.sql && !respTableSql.sql.includes("SCREENED_OUT")) {
      db.exec(\`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE responses_new (
          id TEXT PRIMARY KEY,
          survey_id TEXT NOT NULL REFERENCES surveys(id),
          respondent_id TEXT NOT NULL REFERENCES users(id),
          status TEXT DEFAULT 'IN_PROGRESS' CHECK(status IN ('IN_PROGRESS', 'VALIDATED', 'FLAGGED_MANUAL', 'REJECTED_FRAUD', 'SCREENED_OUT', 'WARRANTY_REPLACED')),
          started_at TEXT NOT NULL,
          submitted_at TEXT,
          duration_sec INTEGER DEFAULT 0,
          answers_payload TEXT,
          quality_score REAL DEFAULT 0.0,
          points_rewarded INTEGER DEFAULT 0,
          completion_code_input TEXT,
          verification_method TEXT DEFAULT 'NATIVE_SUBMIT',
          UNIQUE(survey_id, respondent_id)
        );
        INSERT INTO responses_new (id, survey_id, respondent_id, status, started_at, submitted_at, duration_sec, answers_payload, quality_score, points_rewarded, completion_code_input, verification_method)
        SELECT id, survey_id, respondent_id, status, started_at, submitted_at, duration_sec, answers_payload, quality_score, points_rewarded, completion_code_input, verification_method FROM responses;
        DROP TABLE responses;
        ALTER TABLE responses_new RENAME TO responses;
        CREATE INDEX IF NOT EXISTS idx_responses_user ON responses(respondent_id);
        CREATE INDEX IF NOT EXISTS idx_responses_survey ON responses(survey_id);
        PRAGMA foreign_keys = ON;
      \`);
      console.log('[DB Migration] Đã nâng cấp bảng responses hỗ trợ SCREENED_OUT và WARRANTY_REPLACED.');
    }
  } catch (err) {
    console.warn('[DB Migration] Nâng cấp bảng responses gặp chú ý:', err.message);
  }
`;

if (!code.includes('Migration v2.6: Nâng cấp bảng questions')) {
  code = code.replace(
    '  // Migration v2.5: Đảm bảo bảng point_transactions hỗ trợ POINT_TO_CREDIT_SWAP trong CHECK constraint',
    migrationCode + '\r\n  // Migration v2.5: Đảm bảo bảng point_transactions hỗ trợ POINT_TO_CREDIT_SWAP trong CHECK constraint'
  );
}

fs.writeFileSync(dbPath, code, 'utf8');
console.log('Đã cập nhật database.js thành công');
