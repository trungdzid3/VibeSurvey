const fs = require('fs');
const path = require('path');

const testPath = path.join(__dirname, 'test_task5_adaptive_screener_warranty.js');
let code = fs.readFileSync(testPath, 'utf8');

const targetStr = `    const screenerQId = dbQuestions[0].id;
    const oldTrust2 = db.prepare('SELECT trust_score FROM users WHERE email = ?').get(unmatchedUserEmail).trust_score;`;

const replacementStr = `    const screenerQId = dbQuestions[0].id;
    // Dat trust_score khoi diem la 85 de kiem tra cong +0.2 khong bi cham tran 100
    db.prepare('UPDATE users SET trust_score = 85.0 WHERE email = ?').run(unmatchedUserEmail);
    const oldTrust2 = 85.0;`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync(testPath, code, 'utf8');
console.log('Đã cập nhật trust_score test');
