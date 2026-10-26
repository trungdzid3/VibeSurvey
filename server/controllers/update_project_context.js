const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, '..', '..', 'PROJECT_CONTEXT.md');
let content = fs.readFileSync(targetFile, 'utf8');

const targetStr = '| Task 6: Nâng Cấp Hệ Thống Chống Gian Lận Anti-Fraud Engine (`server/services/antiFraudService.js`) | Hoàn thành |';

const addition = `| Task 5: Câu hỏi Sàng lọc Thích ứng (Adaptive Auto-Screener), Cờ \`is_required\` & Bảo hành 1 Đổi 1 (\`server/controllers/surveyController.js\` & \`server/db/database.js\`) | Hoàn thành | (1) Bổ sung cột \`is_required\` (mặc định 1 - Bắt buộc), \`rows_json\`, \`columns_json\` vào bảng \`questions\`; mở rộng hỗ trợ 12 định dạng Google Forms (bao gồm CHOICE_GRID và CHECKBOX_GRID); (2) Kiểm tra ràng buộc bắt buộc khi nộp bài (\`submitSurvey\`): chặn bỏ trống câu hỏi có is_required = 1 (trả 400), kiểm tra trả lời đầy đủ từng hàng của câu hỏi Lưới ma trận; (3) Adaptive Auto-Screener: nếu người dùng đã hoàn thiện Profile và khớp 100% tiêu chí lọc (\`target_demographics\`), tự động ẨN câu hỏi sàng lọc ở đầu bài (Smart Bypass), tự động điền ngầm (Auto-fill) thông tin Profile vào kết quả nộp bài và xuất file CSV/Sheets; nếu chưa khớp Profile, tự động sinh/chèn các câu hỏi sàng lọc ở đầu bài và kích hoạt Screen-out an toàn (0 Point, +0.2 uy tín, status SCREENED_OUT); (4) Tính năng Bảo hành 1 Đổi 1 cho Gói Doanh Nghiệp (\`POST /api/surveys/:id/warranty-claim\`): kiểm tra quyền sở hữu, phân khúc Doanh nghiệp, thời hạn 7 ngày, hạn mức tối đa 15% tổng số mẫu thu thập; khi yêu cầu thành công, đánh dấu \`WARRANTY_REPLACED\`, trừ \`collected_responses\` để tự động mở lại khảo sát thành ACTIVE thu bù mẫu mới và ghi log vào bảng \`warranty_claims\`; (5) Kiểm thử \`tests/test_task5_adaptive_screener_warranty.js\` đạt 100% PASS. |
| Task 6: Nâng Cấp Hệ Thống Chống Gian Lận Anti-Fraud Engine (\`server/services/antiFraudService.js\`) | Hoàn thành |`;

content = content.replace(targetStr, addition);
fs.writeFileSync(targetFile, content, 'utf8');
console.log('Đã cập nhật PROJECT_CONTEXT.md thành công');
