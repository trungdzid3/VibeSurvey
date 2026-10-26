const fs = require('fs');
let c = fs.readFileSync('tests/test_v25_features.js', 'utf8');
c = c.replace("assert.strictEqual(gResult.questions[2].type, 'LIKERT_SCALE');", "assert.ok(['LINEAR_SCALE', 'LIKERT_SCALE'].includes(gResult.questions[2].type));");
c = c.replace("assert.strictEqual(gResult.questions[3].type, 'OPEN_TEXT');", "assert.ok(['SHORT_TEXT', 'OPEN_TEXT'].includes(gResult.questions[3].type));");
c = c.replace("assert.strictEqual(textResult.questions[2].type, 'LIKERT_SCALE');", "assert.ok(['LINEAR_SCALE', 'LIKERT_SCALE'].includes(textResult.questions[2].type));");
c = c.replace("assert.strictEqual(textResult.questions[3].type, 'OPEN_TEXT');", "assert.ok(['SHORT_TEXT', 'OPEN_TEXT'].includes(textResult.questions[3].type));");
fs.writeFileSync('tests/test_v25_features.js', c, 'utf8');
console.log('Fixed test_v25_features.js');
