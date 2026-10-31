const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const funcs = [
  'selectSingleOption',
  'toggleMultipleOption',
  'updateText',
  'setAnswer',
  'saveAnswer'
];

funcs.forEach(f => {
  let idx = 0;
  console.log('=== SEARCHING: ' + f + ' ===');
  while ((idx = app.indexOf(f, idx)) !== -1) {
    console.log('Found at:', idx);
    console.log(app.substring(Math.max(0, idx - 50), Math.min(app.length, idx + 250)));
    console.log('---');
    idx += f.length;
  }
});
