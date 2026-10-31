const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const pRender = app.indexOf('renderQuestionOptions(q, currentAnswer) {');
if (pRender !== -1) {
  console.log('=== renderQuestionOptions ===');
  console.log(app.substring(pRender, pRender + 3000));
}
