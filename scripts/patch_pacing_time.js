const fs = require('fs');

// 1. Sửa server/config/index.js
let cfg = fs.readFileSync('server/config/index.js', 'utf8');
cfg = cfg.replace('CHOICE: 1.5,', 'CHOICE: 0.5,');
fs.writeFileSync('server/config/index.js', cfg, 'utf8');
console.log('✅ Đã cập nhật server/config/index.js: CHOICE 0.5s');

// 2. Sửa server/services/antiFraudService.js
let afs = fs.readFileSync('server/services/antiFraudService.js', 'utf8');
afs = afs.replace('// 1.5s', '// 0.5s');
fs.writeFileSync('server/services/antiFraudService.js', afs, 'utf8');
console.log('✅ Đã cập nhật server/services/antiFraudService.js');

// 3. Sửa public/app.js
let app = fs.readFileSync('public/app.js', 'utf8');
app = app.replace('<span>Đọc câu hỏi (1.5s)...</span>', '<span>Đọc câu hỏi (0.5s)...</span>');
app = app.replace('}, 1500);', '}, 500);');
app = app.replace("this.showToast('Vui lòng đọc kỹ câu hỏi (1.5s)', 'info');", "this.showToast('Vui lòng đọc kỹ câu hỏi (0.5s)', 'info');");
fs.writeFileSync('public/app.js', app, 'utf8');
console.log('✅ Đã cập nhật public/app.js: giảm khóa nhịp độ đọc câu hỏi xuống 0.5s');
