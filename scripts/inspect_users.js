const db = require('../server/db/database');

const allUsers = db.prepare('SELECT id, email, name, role FROM users').all();
const domainMap = {};

for (const u of allUsers) {
  const parts = u.email.split('@');
  const domain = parts[1] || 'no-domain';
  domainMap[domain] = (domainMap[domain] || 0) + 1;
}

console.log('=== THỐNG KÊ USERS THEO DOMAIN EMAIL ===');
console.log(JSON.stringify(domainMap, null, 2));

console.log('\n=== USERS THUỘC GMAIL / VIBESURVEY / THẬT ===');
const realCandidates = allUsers.filter(u => {
  return u.email === 'trungdzid3@gmail.com' ||
         u.email === 'linharmykxbnvn@gmail.com' ||
         u.email === 'admin@vibesurvey.com' ||
         u.email === 'creator@vibesurvey.com' ||
         u.email === 'user@vibesurvey.com';
});
console.log('Cốt lõi:', realCandidates.map(u => ({ id: u.id, email: u.email, role: u.role })));

const otherUsers = allUsers.filter(u => {
  const e = u.email;
  return e !== 'trungdzid3@gmail.com' &&
         e !== 'linharmykxbnvn@gmail.com' &&
         e !== 'admin@vibesurvey.com' &&
         e !== 'creator@vibesurvey.com' &&
         e !== 'user@vibesurvey.com';
});
console.log('Tổng số user không phải 5 tài khoản cốt lõi:', otherUsers.length);
