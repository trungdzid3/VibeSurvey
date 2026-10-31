# GEMINI CONTEXT - VIBESURVEY PLATFORM (WEB & ANDROID NATIVE)

## Tổng quan dự án
Nền tảng khảo sát trực tuyến kiếm lợi nhuận hai chiều **VibeSurvey** (Web Responsive & Android Capacitor Native):
1. **Dành cho Người trả lời (Respondent)**: Làm khảo sát nhận điểm thưởng (`1 Point = 1 VNĐ`), quy đổi thẻ cào điện thoại, ngân hàng VietQR/MoMo hoặc E-Voucher thương hiệu ngang giá.
2. **Dành cho Người tạo khảo sát (Creator / Doanh nghiệp)**: Nạp `Credit` (`1 Credit = 1 VNĐ`, khóa van 1 chiều không rút ra tiền mặt), khóa quỹ ký quỹ (`Escrow`) theo 3 phân khúc rõ ràng (Sinh viên / Cá nhân / Doanh nghiệp) x 3 mức độ dài form (Ngắn / Vừa / Dài), thiết kế bài khảo sát với 12 loại câu hỏi, lọc đối tượng và đồng bộ Google Sheets webhook.
3. **Mô hình Kinh tế học & Lợi nhuận (Unit Economics)**:
   - Sàn thu phí dịch vụ (`Take Rate`): Sinh viên cố định 10%-12%, Cá nhân 25%, Doanh nghiệp 33%-36%.
   - Thù lao đáp viên được tính động từ số Credit thực thu sau khi trừ lượt miễn phí: `Reward = floor(TotalEscrow * (1 - TakeRate) / N)`.
   - Đổi `Point -> Credit` thưởng +5% kích thích điền chéo; Screen-out = 0đ (không mất tiền mặt).
4. **Hệ thống Chống Gian lận (Anti-Fraud Engine)**: 5 chốt chặn: Bẫy tốc độ (0s cho câu tự luận), Bẫy tập trung động (chèn ngẫu nhiên + thêm 1 cơ hội), Phương sai đường thẳng (Likert, Single Choice, Dropdown), Bộ lọc tự luận rác (chấp nhận số 0 và từ ngắn), Điểm uy tín `trust_score` (khởi tạo 85, khấu trừ lũy tiến, Auto-Ban theo `device_fingerprint`).
5. **Kiến trúc Kỹ thuật**:
   - Backend: Node.js 24, Express, SQLite WAL mode với Transaction ACID & Double-Entry Ledger.
   - Frontend: Vanilla JS SPA, Tailwind CSS, Typography Montserrat 4 phân cấp, bảng màu 3 màu Cam/Trắng/Đen theo `DESIGN.md`.
   - Di động: Capacitor Android Native (Assets đồng bộ sẵn sàng build APK).
   - Hạ tầng: Oracle Cloud Always Free (2 OCPU / 6GB ARM64) + Cloudflare Tunnel + Tên miền miễn phí DigitalPlat.

## Bảng Phân Bổ Đội Hình Tác Tử (Antigravity Specialist Roster)
- `pricing-economist`: Phụ trách `server/config/index.js`, `server/services/pricingService.js`.
- `fintech-ledger-engineer`: Phụ trách `server/services/ledgerService.js`, `server/controllers/walletController.js`.
- `auth-profile-specialist`: Phụ trách `server/controllers/authController.js`, `server/services/matchingService.js`.
- `form-parser-specialist`: Phụ trách `server/services/formParserService.js`.
- `anti-fraud-specialist`: Phụ trách `server/services/antiFraudService.js`.
