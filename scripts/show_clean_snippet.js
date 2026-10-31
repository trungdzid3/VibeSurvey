const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const lines = app.split('\n');
console.log(lines.slice(5750, 5845).map((l, i) => `${5751 + i}: ${l}`).join('\n'));
