const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');
const now = Date.now();
html = html.replace(/app\.js\?v=[^"'\s>]+/g, 'app.js?v=4.7.6_' + now);
html = html.replace(/styles\.css\?v=[^"'\s>]+/g, 'styles.css?v=4.7.6_' + now);
fs.writeFileSync('public/index.html', html, 'utf8');
console.log('Updated cache-buster in public/index.html to 4.7.6_' + now);
