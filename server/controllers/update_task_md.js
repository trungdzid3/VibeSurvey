const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', '..', 'task.md');
let content = fs.readFileSync(targetFile, 'utf8');

content = content.replace(
  '- [ ] **Task 5: Câu hỏi Sàng lọc Thích ứng (Adaptive Auto-Screener)',
  '- [x] **Task 5: Câu hỏi Sàng lọc Thích ứng (Adaptive Auto-Screener)'
);
content = content.replace(
  '  - [ ] Tự động sinh câu hỏi sàng lọc ở đầu bài',
  '  - [x] Tự động sinh câu hỏi sàng lọc ở đầu bài'
);
content = content.replace(
  '  - [ ] Bổ sung cột `is_required` (Bắt buộc trả lời / Không bắt buộc)',
  '  - [x] Bổ sung cột `is_required` (Bắt buộc trả lời / Không bắt buộc)'
);
content = content.replace(
  '  - [ ] Bổ sung tính năng yêu cầu đổi mẫu lỗi (tối đa 15% số mẫu trong 7 ngày)',
  '  - [x] Bổ sung tính năng yêu cầu đổi mẫu lỗi (tối đa 15% số mẫu trong 7 ngày)'
);

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Đã cập nhật task.md thành công');
