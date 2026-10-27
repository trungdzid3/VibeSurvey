const db = require('../server/db/database');
const coreFrauds = db.prepare(`
  SELECT f.*, u.email 
  FROM fraud_logs f 
  JOIN users u ON f.user_id = u.id 
  WHERE u.email IN ('trungdzid3@gmail.com', 'linharmykxbnvn@gmail.com', 'admin@vibesurvey.com', 'creator@vibesurvey.com', 'user@vibesurvey.com')
`).all();
console.log(JSON.stringify(coreFrauds, null, 2));
