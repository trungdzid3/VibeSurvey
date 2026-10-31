const db = require('../server/db/database');

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
console.log('--- TOÀN BỘ BẢNG TRONG CSDL ---');
for (const t of tables) {
  const count = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get();
  console.log(`${t.name}: ${count.c} dòng`);
}

const users = db.prepare("SELECT id, email, name, role FROM users").all();
console.log('\n--- DANH SÁCH USERS ---');
console.log(users);

const surveys = db.prepare("SELECT id, title, creator_id, status FROM surveys").all();
console.log('\n--- DANH SÁCH SURVEYS ---');
console.log(surveys);
