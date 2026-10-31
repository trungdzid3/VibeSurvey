const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const pRenderStart = app.indexOf('renderQuestionOptions(q, currentAnswer) {');
const pRenderEnd = app.indexOf('selectSingleOption(qId, encodedOpt) {');
const renderCode = app.substring(pRenderStart, pRenderEnd);

const types = ['NUMBER', 'DATE', 'TIME', 'RATING', 'SLIDER', 'FILE_UPLOAD', 'MATRIX'];
types.forEach(t => {
  console.log(`Type ${t} in renderQuestionOptions: ${renderCode.includes(t)}`);
});
