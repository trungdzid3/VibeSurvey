const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const pSel = app.indexOf('selectSingleOption(qId, encodedOpt) {');
console.log('=== AROUND selectSingleOption ===');
console.log(app.substring(pSel - 200, pSel + 2000));
