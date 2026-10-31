const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const pRenderStart = app.indexOf('renderQuestionOptions(q, currentAnswer) {');
const pRenderEnd = app.indexOf('selectSingleOption(qId, encodedOpt) {');

const renderCode = app.substring(pRenderStart, pRenderEnd);

// Tìm tất cả các lệnh gọi VibeApp.xxx
const matches = [...renderCode.matchAll(/VibeApp\.([a-zA-Z0-9_]+)\(/g)];
const calledFuncs = [...new Set(matches.map(m => m[1]))];

console.log('Called functions in renderQuestionOptions:');
calledFuncs.forEach(fn => {
  const isDefined = app.includes(fn + '(') && app.indexOf(fn + '(') !== app.lastIndexOf(fn + '(');
  const hasMethod = app.includes('\n  ' + fn + '(') || app.includes(' ' + fn + '(');
  console.log(`- ${fn}: exists? ${app.indexOf(fn + '(') !== -1}`);
});
