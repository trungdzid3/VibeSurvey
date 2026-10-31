const fs = require('fs');
const content = fs.readFileSync('public/app.js', 'utf8');
const assets = new Set();
const matches = content.matchAll(/\/assets\/3d\/[a-zA-Z0-9_\.]+/g);
for (const m of matches) {
  assets.add(m[0]);
}
console.log('3D Assets found in public/app.js:');
console.log(Array.from(assets));
