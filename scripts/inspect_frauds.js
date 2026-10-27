const db = require('../server/db/database');

const coreEmails = [
  'trungdzid3@gmail.com',
  'linharmykxbnvn@gmail.com',
  'admin@vibesurvey.com',
  'creator@vibesurvey.com',
  'user@vibesurvey.com'
];

const placeholders = coreEmails.map(() => '?').join(',');
const coreUsers = db.prepare(`SELECT id, email FROM users WHERE email IN (${placeholders})`).all(...coreEmails);
const coreUserIds = coreUsers.map(u => u.id);

const coreFrauds = db.prepare(`SELECT * FROM fraud_logs WHERE user_id IN (${coreUserIds.map(() => '?').join(',')})`).all(...coreUserIds);
console.log('Fraud logs of core users count:', coreFrauds.length);

const allFrauds = db.prepare('SELECT count(*) as count FROM fraud_logs').get();
console.log('Total fraud logs in DB:', allFrauds.count);
