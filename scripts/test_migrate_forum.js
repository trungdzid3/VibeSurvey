const db = require('../server/db/database');

try {
  const currentSql = db.prepare("SELECT sql FROM sqlite_master WHERE name='forum_posts'").get();
  console.log('Current SQL:', currentSql.sql);

  if (currentSql.sql.includes('survey_id TEXT NOT NULL')) {
    console.log('Migrating forum_posts to allow nullable survey_id and add post_type...');
    db.exec('PRAGMA foreign_keys = OFF;');
    db.exec('BEGIN TRANSACTION;');

    db.exec(`
      CREATE TABLE forum_posts_temp (
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

      INSERT INTO forum_posts_temp (id, user_id, survey_id, title, content, post_type, category, views_count, likes_count, created_at, updated_at)
      SELECT id, user_id, survey_id, title, content, 'COMMUNITY', 'ALL', views_count, likes_count, created_at, updated_at
      FROM forum_posts;

      DROP TABLE forum_posts;

      ALTER TABLE forum_posts_temp RENAME TO forum_posts;

      CREATE INDEX IF NOT EXISTS idx_forum_posts_user ON forum_posts(user_id);
      CREATE INDEX IF NOT EXISTS idx_forum_posts_survey ON forum_posts(survey_id);
      CREATE INDEX IF NOT EXISTS idx_forum_posts_created ON forum_posts(created_at);
      CREATE INDEX IF NOT EXISTS idx_forum_posts_type ON forum_posts(post_type);
    `);

    db.exec('COMMIT;');
    db.exec('PRAGMA foreign_keys = ON;');
    console.log('Migration successful!');
  } else {
    console.log('Already migrated.');
  }

  const newSql = db.prepare("SELECT sql FROM sqlite_master WHERE name='forum_posts'").get();
  console.log('New SQL:', newSql.sql);
} catch (err) {
  console.error('Migration failed:', err);
}
