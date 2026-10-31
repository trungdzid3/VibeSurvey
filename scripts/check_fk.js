const path = require('path');
const db = require(path.join(__dirname, '../server/db/database'));
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("--- ALL FOREIGN KEYS IN DATABASE ---");
for (const t of tables) {
  try {
    const fks = db.prepare(`PRAGMA foreign_key_list(${t.name})`).all();
    for (const fk of fks) {
      console.log(`Table ${t.name} -> references ${fk.table}(${fk.to}) from ${fk.from} [ON DELETE: ${fk.on_delete}]`);
    }
  } catch(e) {
    console.error(`Error on ${t.name}:`, e.message);
  }
}
process.exit(0);
