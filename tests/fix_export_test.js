const fs = require('fs');
const path = require('path');

const testPath = path.join(__dirname, 'test_task5_adaptive_screener_warranty.js');
let code = fs.readFileSync(testPath, 'utf8');

const targetStr = `    // Lay 2 response VALIDATED
    const sampleResponses = db.prepare('SELECT id FROM responses WHERE survey_id = ? AND status = \\'VALIDATED\\' LIMIT 3').all(surveyId);
    const respId1 = sampleResponses[0].id;
    const respId2 = sampleResponses[1].id;`;

const replacementStr = `    // Lay 2 response VALIDATED tu cac dummy users de bao toan response cua Respondent 1
    const dummyResponses = db.prepare("SELECT id FROM responses WHERE survey_id = ? AND status = 'VALIDATED' AND respondent_id != (SELECT id FROM users WHERE email = ?) LIMIT 3").all(surveyId, matchedUserEmail);
    const respId1 = dummyResponses[0].id;
    const respId2 = dummyResponses[1].id;`;

code = code.replace(targetStr, replacementStr);
fs.writeFileSync(testPath, code, 'utf8');
console.log('Đã cập nhật sampleResponses trong test');
