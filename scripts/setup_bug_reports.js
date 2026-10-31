const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'server', 'db', 'database.js');
let code = fs.readFileSync(dbPath, 'utf8');

const target = "    `CREATE TABLE IF NOT EXISTS registration_otps (";
const addition = `    \`CREATE TABLE IF NOT EXISTS bug_reports (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      reporter_name TEXT,
      reporter_email TEXT,
      category TEXT DEFAULT 'OTHER',
      severity TEXT DEFAULT 'MEDIUM',
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      image_url TEXT,
      device_info TEXT,
      status TEXT DEFAULT 'PENDING',
      admin_notes TEXT,
      resolved_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );\`,
    'CREATE INDEX IF NOT EXISTS idx_bug_reports_user ON bug_reports(user_id);',
    'CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);',
    'CREATE INDEX IF NOT EXISTS idx_bug_reports_created ON bug_reports(created_at);',
`;

if (!code.includes('CREATE TABLE IF NOT EXISTS bug_reports')) {
  code = code.replace(target, addition + target);
  fs.writeFileSync(dbPath, code, 'utf8');
  console.log('Successfully updated server/db/database.js with bug_reports migration!');
} else {
  console.log('bug_reports migration already exists in database.js');
}

// Chạy trực tiếp qua instance db để tạo bảng ngay lập tức
const db = require('../server/db/database');
db.exec(`
  CREATE TABLE IF NOT EXISTS bug_reports (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    reporter_name TEXT,
    reporter_email TEXT,
    category TEXT DEFAULT 'OTHER',
    severity TEXT DEFAULT 'MEDIUM',
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT,
    device_info TEXT,
    status TEXT DEFAULT 'PENDING',
    admin_notes TEXT,
    resolved_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_bug_reports_user ON bug_reports(user_id);
  CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
  CREATE INDEX IF NOT EXISTS idx_bug_reports_created ON bug_reports(created_at);
`);
console.log('SQLite database table bug_reports verified and ready!');
