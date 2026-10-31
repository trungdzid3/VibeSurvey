const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const pSubmit = app.indexOf('async submitSurvey() {');
console.log('pSubmit:', pSubmit);
console.log(JSON.stringify(app.substring(pSubmit - 10, pSubmit + 350)));
