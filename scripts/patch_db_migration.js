const fs = require('fs');
let content = fs.readFileSync('server/db/database.js', 'utf8');

const targetStr = "console.warn('[DB Migration] Nâng cấp bảng point_transactions gặp chú ý:', err.message);";
const targetIdx = content.indexOf(targetStr);

if (targetIdx !== -1) {
  const closingBraceIdx = content.indexOf('}', targetIdx);
  const functionClosingBraceIdx = content.indexOf('}', closingBraceIdx + 1);

  const snippet = `

  // Migration v2.7: Cho phép thảo luận tự do trên diễn đàn (survey_id nullable, thêm post_type và category)
  try {
    const fTableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='forum_posts'").get();
    if (fTableSql && fTableSql.sql && fTableSql.sql.includes("survey_id TEXT NOT NULL")) {
      db.exec(\`
        PRAGMA foreign_keys = OFF;
        CREATE TABLE forum_posts_new (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL REFERENCES users(id),
          survey_id TEXT REFERENCES surveys(id),
          title TEXT NOT NULL,
          content TEXT NOT NULL,
          post_type TEXT DEFAULT 'COMMUNITY',
          category TEXT DEFAULT 'ALL',
          views_count INTEGER DEFAULT 0,
          likes_count INTEGER DEFAULT 0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
        INSERT INTO forum_posts_new (id, user_id, survey_id, title, content, post_type, category, views_count, likes_count, created_at, updated_at)
        SELECT id, user_id, survey_id, title, content, 'COMMUNITY', 'ALL', views_count, likes_count, created_at, updated_at
        FROM forum_posts;
        DROP TABLE forum_posts;
        ALTER TABLE forum_posts_new RENAME TO forum_posts;
        CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON forum_posts(user_id);
        CREATE INDEX IF NOT EXISTS idx_forum_posts_survey ON forum_posts(survey_id);
        CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at);
        CREATE INDEX IF NOT EXISTS idx_forum_posts_type ON forum_posts(post_type);
        PRAGMA foreign_keys = ON;
      \`);
      console.log('[DB Migration] Đã nâng cấp bảng forum_posts cho phép thảo luận tự do và phân khu sinh viên.');
    }
  } catch (err) {
    console.warn('[DB Migration] Nâng cấp bảng forum_posts gặp chú ý:', err.message);
  }
`;

  content = content.slice(0, functionClosingBraceIdx) + snippet + content.slice(functionClosingBraceIdx);
  fs.writeFileSync('server/db/database.js', content, 'utf8');
  console.log('Successfully patched server/db/database.js!');
} else {
  console.error('Target string not found!');
}
