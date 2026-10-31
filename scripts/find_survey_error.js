const fs = require('fs');
const app = fs.readFileSync('public/app.js', 'utf8');

const searchTerms = [
  'Vui lòng trả lời câu hỏi bắt buộc này trước khi tiếp tục',
  'bắt buộc này trước khi tiếp tục',
  'Câu tiếp theo'
];

searchTerms.forEach(term => {
  let idx = 0;
  console.log('=== SEARCHING: ' + term + ' ===');
  while ((idx = app.indexOf(term, idx)) !== -1) {
    console.log('Found at:', idx);
    console.log(app.substring(Math.max(0, idx - 400), Math.min(app.length, idx + 400)));
    console.log('--------------------------------------------');
    idx += term.length;
  }
});
