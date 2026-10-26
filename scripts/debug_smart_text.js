const fp = require('../server/services/formParserService');
const rawText = `
Khảo sát Thói quen Đọc Sách & Học Tập 2026
Câu 1: Bạn đọc sách bao nhiêu giờ một tuần?
A. Dưới 1 giờ
B. 1 - 3 giờ
C. 3 - 5 giờ
D. Trên 5 giờ
Câu 2: Bạn thường đọc các thể loại sách nào? [checkbox]
- Sách kinh tế, tài chính
- Sách phát triển bản thân
- Tiểu thuyết, văn học
- Sách giáo trình chuyên ngành
Câu 3: Đánh giá tầm quan trọng của việc đọc sách đối với sự nghiệp (Thang điểm 1 - 5)
Câu 4: Hãy chia sẻ cuốn sách yêu thích nhất gần đây của bạn và lý do bạn tâm đắc
`;
const textResult = fp.parseSmartText(rawText);
console.log('textResult.questions length:', textResult.questions.length);
textResult.questions.forEach((q, i) => {
  console.log(`Q[${i}]: type="${q.type}", title="${q.content || q.title}"`);
});
