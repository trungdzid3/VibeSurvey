const db = require('../server/db/database');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
console.log('=== TABLE RECORD COUNTS ===');
for (const t of tables) {
  const count = db.prepare(`SELECT count(*) as c FROM "${t.name}"`).get().c;
  if (count > 0) {
    console.log(`${t.name}: ${count}`);
  }
}
