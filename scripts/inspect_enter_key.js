const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const pEnter = app.indexOf("e.key === 'Enter'");
console.log('=== Enter key handling ===');
let idx = 0;
while ((idx = app.indexOf("e.key === 'Enter'", idx)) !== -1) {
  console.log('Found at:', idx);
  console.log(app.substring(Math.max(0, idx - 150), Math.min(app.length, idx + 400)));
  console.log('---');
  idx += 17;
}
