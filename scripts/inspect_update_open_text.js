const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const pUpdate = app.indexOf('updateOpenText');
console.log('=== updateOpenText occurrences ===');
let idx = 0;
while ((idx = app.indexOf('updateOpenText', idx)) !== -1) {
  console.log('Found at:', idx);
  console.log(app.substring(Math.max(0, idx - 100), Math.min(app.length, idx + 400)));
  console.log('--------------------------------------------');
  idx += 'updateOpenText'.length;
}
