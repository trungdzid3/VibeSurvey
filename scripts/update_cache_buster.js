const fs = require('fs');
let html = fs.readFileSync('public/index.html', 'utf8');
html = html.replace(/styles\.css(\?v=[^"']*)?/g, 'styles.css?v=3.5.3');
html = html.replace(/app\.js(\?v=[^"']*)?/g, 'app.js?v=3.5.3');
fs.writeFileSync('public/index.html', html, 'utf8');
console.log('✅ Đã cập nhật cache buster v=3.5.3 trong index.html');
