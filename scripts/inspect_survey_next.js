const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const pNext = app.indexOf('nextQuestion() {');
if (pNext !== -1) {
  console.log('=== nextQuestion FUNCTION ===');
  console.log(app.substring(pNext, pNext + 2000));
}

const pShort = app.indexOf("case 'SHORT_TEXT':");
if (pShort !== -1) {
  console.log('=== SHORT_TEXT RENDER ===');
  console.log(app.substring(pShort, pShort + 1000));
} else {
  const pText = app.indexOf("'TEXT'");
  console.log('=== TEXT RENDER ===');
  console.log(app.substring(pText, pText + 1000));
}
