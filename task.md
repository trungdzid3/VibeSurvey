# DANH SÁCH CÔNG VIỆC THỰC THI (TASK LIST) - ARGON VIBE STUDIO

## 🎯 Mục tiêu: Giải quyết dứt điểm 6 phản hồi kiểm thử cốt lõi & Đẩy lên Git

- [x] **Task 1: Form Builder Dropdown & Bento-Card Layout**
  - [x] Sửa triệt để dropdown loại câu hỏi: chuyển đổi toàn bộ options sang thẻ `<button type="button">`, không bị lẫn sự kiện.
  - [x] Thêm class `allow-overflow` và CSS `overflow: visible !important;` cho `.bento-card` của Form Builder và Question Container để menu dropdown không bị cắt đáy.
  - [x] Phóng to nút chọn loại câu hỏi (`h-9 sm:h-10 px-3.5 sm:px-4 text-xs sm:text-sm font-extrabold rounded-xl`) và menu dropdown (`min-w-[280px] sm:min-w-[320px]`, item padding rộng `py-2.5 px-3`, icon to `w-4 h-4`).
  - [x] Tăng kích thước thang đo/loại câu hỏi và các tùy chọn trực quan, dễ nhìn trên cả mobile lẫn desktop.

- [x] **Task 2: Tính toán Escrow & Dòng Tạm Tính Chi Phí Minh Bạch**
  - [x] Sửa `updateFastEscrowCalculation()`: Bổ sung dòng hiển thị tạm tính ngân sách rõ ràng ngay dưới 2 ô nhập mẫu & điểm thưởng.
  - [x] Tính năng Free Trial: Miễn phí 25 mẫu đầu (50.000 VNĐ). Khi người dùng nhập `targets > 25`, tự động tính tiền cho phần phụ trội `(targets - 25) * (reward * 10)`.

- [x] **Task 3: Bảo Toàn Trạng Thái Router (State Persistence cho Ví & Guest Flash)**
  - [x] Lưu `vibe_current_tab` vào `localStorage`. Khi F5 ở tab `wallet` vẫn giữ nguyên ở tab `wallet`.
  - [x] Khôi phục `currentUser` từ `localStorage` ngay trong hàm `init()` trước khi render lần đầu để triệt tiêu hoàn toàn hiện tượng lóe trạng thái khách (flash guest state).

- [x] **Task 4: Trải Nghiệm Khảo Sát (Mất Tiến Độ Khi F5 & Nút Thoát Khảo Sát)**
  - [x] Lưu `vibe_active_session` vào `localStorage` mỗi khi chọn câu trả lời / chuyển câu hỏi.
  - [x] Khi F5 giữa bài, tự động phục hồi phiên làm bài với đầy đủ đáp án đã chọn và đồng hồ bấm giờ, kèm toast nhắc nhở tiếp tục.
  - [x] Sửa nút "Thoát Khảo Sát": Bổ sung modal popup xác nhận "Bạn có chắc chắn muốn thoát? Dữ liệu bài làm sẽ bị hủy", bấm Đồng ý mới xóa session và quay về trang Khảo sát.

- [x] **Task 5: Sửa Nút "Quay Lại" Modal Apps Script, Ghim VIP Confirm & 5 Vé Hỏa Tốc**
  - [x] Sửa nút "Quay Lại" ở modal Google Apps Script: Gọi `VibeApp.closeModal()` để chỉ đóng modal popup, không reset/xóa form và tiêu đề khảo sát.
  - [x] Thêm popup xác nhận khi tick Ghim VIP: Thông báo rõ ràng chi phí 50.000 VNĐ hoặc sử dụng 1 vé ghim VIP; nếu bấm Hủy thì bỏ tick.
  - [x] Hiển thị trực quan huy hiệu `⚡ ${user.fast_track_tickets || 5} Vé Hỏa Tốc` trên Header (gần Balance Pill) và trong Form Builder / Tab Ví của Creator.

- [x] **Task 6: Bộ Logo Vector SVG Chuẩn Nhận Diện Thương Hiệu Cho Voucher**
  - [x] Cập nhật vector SVG chuẩn chính hãng, tỉ lệ và mã màu chính xác cho Shopee, Grab, Highlands Coffee, Phúc Long, CGV Cinemas, Starbucks.

- [x] **Task 7: Kiểm Tra Cú Pháp, Chạy Test Suites & Push Git Origin Main**
  - [x] Chạy `node -c public/app.js` (PASS).
  - [x] Nâng cache buster `v=3.5.10` trong `public/index.html`.
  - [x] Chạy `npm test` xác nhận 13/13 Test Suites PASS (100%).
  - [x] Commit và `git push origin main`.
