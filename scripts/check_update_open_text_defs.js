const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const occurrences = [];
let idx = 0;
while ((idx = app.indexOf('updateOpenText(qId, val)', idx)) !== -1) {
  occurrences.push(idx);
  idx += 20;
}
console.log('updateOpenText definitions count:', occurrences.length);
occurrences.forEach((pos, i) => {
  console.log(`Pos ${i+1}: ${pos}, line approx: ${app.substring(0, pos).split('\n').length}`);
});
