const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const pNext = app.indexOf('nextQuestion() {');
console.log('--- nextQuestion() START ---');
console.log(app.substring(pNext, pNext + 600));
