# Kế Hoạch Triển Khai Tính Năng & Công Cụ Quản Trị Hệ Thống VibeSurvey

## Trạng Thái Hoàn Thành
- [x] 1. **Khảo Sát Trao Đổi Sinh Viên (Edu Karma Exchange - Chỉ Edu Hiển Thị)**:
  - [x] Schema CSDL: `student_karma`, `is_student_exchange`.
  - [x] Lọc cách ly bảo mật: User thường và khách vãng lai không nhìn thấy bài sinh viên.
  - [x] Ký quỹ bằng Karma thay vì tiền mặt VNĐ, làm bài hợp lệ nhận +1 Karma.
  - [x] Giao diện Header/Profile/Studio/Feed hiển thị số dư và nhãn Trao Đổi Edu.
- [x] 2. **Diễn Đàn Thảo Luận & Chia Sẻ Khảo Sát Nội Bộ (Survey Community Board)**:
  - [x] Schema: `forum_posts`, `forum_comments`, `forum_post_likes`.
  - [x] Chặn 100% liên kết ngoài (Anti-URL Spoofing).
  - [x] Đính kèm khảo sát ACTIVE của chính mình, luồng làm bài trừ Escrow và trả thù lao chuẩn.
  - [x] Tương tác Thả tim, Bình luận, Xóa bài.
- [x] 3. **Hồ Sơ Đặc Tả Kỹ Thuật & Vận Hành (PDF cho Gemini)**:
  - [x] Xuất bản `TAI_LIEU_DU_TOAN_CHI_PHI_VAN_HANH_VIBESURVEY.pdf` (A4 chuẩn, 251 KB).
- [x] 4. **Mô Hình Tài Chính, Điểm Hòa Vốn & Thời Gian Hoàn Vốn (Excel Model)**:
  - [x] Xuất bản `MO_HINH_TAI_CHINH_HOI_VON_VIBESURVEY.xlsx`.
  - [x] Sheet 1 (Giả định & Đầu vào): Tự do nhập số người nạp, số tiền nạp theo 4 phân khúc, tỷ lệ Take-rate, chi phí VPS, Email, Nhân sự, Voucher sàn, vốn đầu tư ban đầu CapEx.
  - [x] Sheet 2 (Dòng tiền & Hồi vốn): Tự động tính Doanh thu sàn, Chi phí OpEx, Lợi nhuận ròng EBITDA, Điểm hòa vốn (Break-even Revenue & Users), Thời gian hoàn vốn (Payback Period).
  - [x] Sheet 3 (Dự phóng 12 tháng & Độ nhạy): Bảng dòng tiền tích lũy 12 tháng và so sánh 3 kịch bản: Thận trọng (50%), Cơ sở (100%), Lạc quan (180%).
