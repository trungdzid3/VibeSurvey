const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const pNext = app.indexOf('nextQuestion() {');
console.log('pNext:', pNext);
console.log(JSON.stringify(app.substring(pNext - 10, pNext + 350)));
