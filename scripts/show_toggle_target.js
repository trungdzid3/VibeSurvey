const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const pToggle = app.indexOf('toggleMultipleOption(qId, encodedOpt) {');
console.log('--- toggleMultipleOption ---');
console.log(app.substring(pToggle, pToggle + 600));
