const db = require('../server/db/database');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

console.log('=== DANH SÁCH BẢNG VÀ SỐ LƯỢNG BẢN GHI ===');
for (const t of tables) {
  try {
    const cnt = db.prepare(`SELECT count(*) as count FROM ${t.name}`).get();
    console.log(`${t.name.padEnd(30)}: ${cnt.count}`);
  } catch (err) {
    console.log(`${t.name.padEnd(30)}: Lỗi (${err.message})`);
  }
}
