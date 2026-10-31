const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const pShort = app.indexOf("// 3. TRẢ LỜI NGẮN (SHORT_TEXT)");
console.log('--- SHORT_TEXT & PARAGRAPH ---');
console.log(app.substring(pShort, pShort + 1000));
