const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const pSubmit = app.indexOf('submitSurvey');
console.log('=== submitSurvey occurrences ===');
let idx = 0;
while ((idx = app.indexOf('submitSurvey', idx)) !== -1) {
  console.log('Found at:', idx);
  console.log(app.substring(Math.max(0, idx - 50), Math.min(app.length, idx + 400)));
  console.log('---');
  idx += 'submitSurvey'.length;
}
