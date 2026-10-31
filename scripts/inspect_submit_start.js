const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const pSubmit = app.indexOf('async submitSurvey() {');
console.log('--- submitSurvey() START ---');
console.log(app.substring(pSubmit, pSubmit + 800));
