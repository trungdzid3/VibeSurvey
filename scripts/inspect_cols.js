const db = require('../server/db/database');

const tables = ['vat_invoices', 'notifications', 'email_notifications_log', 'device_ip_logs', 'point_transactions'];
for (const t of tables) {
  const info = db.prepare(`PRAGMA table_info(${t})`).all();
  console.log(`=== BẢNG ${t} ===`);
  console.log(info.map(c => `${c.name} (${c.type})`).join(', '));
}
