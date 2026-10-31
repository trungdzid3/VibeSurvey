const fs = require('fs');
const code = fs.readFileSync('public/app.js', 'utf8');
const lines = code.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('peer-checked:after:translate-x-full')) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});
