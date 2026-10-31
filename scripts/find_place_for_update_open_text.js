const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const targetStr = 'selectSingleOption(qId, encodedOpt) {';
const pIdx = app.indexOf(targetStr);
console.log('--- TARGET AROUND selectSingleOption ---');
console.log(app.substring(pIdx - 100, pIdx + 300));
