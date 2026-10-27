const db = require('../server/db/database');
const gmailUsers = db.prepare("SELECT id, email, name, role, created_at FROM users WHERE email LIKE '%@gmail.com'").all();
console.log(JSON.stringify(gmailUsers, null, 2));

console.log('\n=== VIBESURVEY DOMAIN USERS ===');
const vibeUsers = db.prepare("SELECT id, email, name, role, created_at FROM users WHERE email LIKE '%@vibesurvey.com'").all();
console.log('Total vibesurvey.com:', vibeUsers.length);
console.log(vibeUsers.slice(0, 10));
