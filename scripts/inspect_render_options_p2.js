const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const pRender = app.indexOf('renderQuestionOptions(q, currentAnswer) {');
console.log('=== renderQuestionOptions PART 2 ===');
console.log(app.substring(pRender + 3000, pRender + 7000));
