# Kế hoạch Thực thi: Chuyển Đổi Thương Hiệu SurvHub, Logo SVG Chuẩn Mực & Tích Hợp Trang Mở Đầu Cho Khách

## Yêu cầu Chi tiết
1. **Chính thức đổi tên hệ thống thành SurvHub**:
   - Thay thế toàn bộ "VibeSurvey" / "vibesurvey" trên UI thành **SurvHub**.
   - Cập nhật tiêu đề trang `<title>`, meta tags, văn bản bản quyền footer, các modal xác thực/đăng nhập, điều khoản dịch vụ, thông báo toast sang SurvHub.
   - Cập nhật `capacitor.config.json` sang `"appName": "SurvHub"`.

2. **Tạo Logo SVG chuẩn như ảnh mẫu người dùng cung cấp**:
   - Vector hóa biểu tượng chữ S cách điệu gồm 4 dải ruy băng màu cam gradient rực rỡ (không chứa chữ bên dưới như yêu cầu).
   - Tạo 2 bản riêng biệt:
     + `public/logo-light.svg` (Dành cho nền sáng / Light mode).
     + `public/logo-dark.svg` (Dành cho nền tối / Dark mode Obsidian Charcoal).
     + Cập nhật đồng bộ `public/logo.svg`, `public/favicon.svg`, `public/logo.png`, `public/icon-192.png`, `public/icon-512.png`, `public/favicon.png`.
   - Loại bỏ/xóa các file logo cũ liên quan.

3. **Giao diện lấy y hệt văn bản và bố cục trên Stitch**:
   - Trang 1 (Trang Chủ Mở Đầu): Lấy lại y hệt tiêu đề, slogan, nội dung từ Stitch `stitch_screens/a8f703e9f38c4f6db80c09f21abf1012_trang_chu_mo_dau.html`:
     + "SurvHub - Share form, share your insights"
     + "Nền tảng khảo sát học thuật tín nhiệm"
     + Thẻ mẫu tương tác: "Khảo sát chuẩn xác, tích lũy điểm thưởng. Đổi ngàn Voucher hấp dẫn"
     + 3 Khối Bento: Khử gian lận AI, Đổi thưởng linh hoạt 1:1, Bảo trợ học thuật & Doanh nghiệp.
     + Testimonials & Mạng lưới 6 trường ĐH.
   - Trang 2 (Diễn đàn & Góc Đề Tài): "SurvHub - Diễn đàn & Góc Đề Tài", Community Board.
   - Trang 3 (Hồ sơ cá nhân & Quản lý khảo sát): "SurvHub - Thông tin tài khoản & Quản lý khảo sát".

4. **Trang Mở Đầu Hiển Thị Mặc Định Cho Khách Chưa Đăng Nhập**:
   - Khi người dùng chưa đăng nhập (`!this.state.currentUser`), hệ thống mặc định mở Trang Chủ Mở Đầu (thay thế cho màn hình khảo sát khách cũ).
   - Nhấp vào logo SurvHub luôn dẫn về Trang Chủ Mở Đầu (`home`).
   - Đăng xuất tự động chuyển hướng về Trang Chủ Mở Đầu (`home`).

## Danh sách Công việc (Tasks)
- [x] 1. **Cập nhật nhận diện SurvHub trên `index.html` và `capacitor.config.json`**
  - [x] Đổi tên brand, title, footer, meta, modal sang SurvHub.
  - [x] Cập nhật tệp cấu hình Android Capacitor sang SurvHub.
- [x] 2. **Cập nhật `public/app.js` sang thương hiệu SurvHub & Văn bản chuẩn Stitch**
  - [x] Thay thế các chuỗi hiển thị thương hiệu VibeSurvey sang SurvHub.
  - [x] Hoàn thiện văn bản và các phân khu trên 3 trang bám sát 100% tệp Stitch gốc.
  - [x] Thiết lập Trang Chủ Mở Đầu (`home`) làm view mặc định cho khách chưa đăng nhập.
- [x] 3. **Kiểm tra, Xác minh Cú pháp, Chạy Test Suite, Đồng bộ Android & Bàn giao**
  - [x] Kiểm tra cú pháp `node -c public/app.js`.
  - [x] Chạy bộ kiểm thử tự động `npm test` 15/15 tầng PASS.
  - [x] Đồng bộ Capacitor Android qua `npm run sync:android`.
  - [x] Cập nhật `PROJECT_CONTEXT.md` và bảo toàn `survey-platform.code-workspace`.
- [x] 4. **Thực thi Quy chế Tự động hóa Đồng bộ Git & GitHub (Git Auto-Sync Protocol theo Rule 16)**
  - [x] Ghi nhận cờ đồng bộ GitHub vào `PROJECT_CONTEXT.md`.
  - [x] Tự động commit các thay đổi hoàn tất thương hiệu SurvHub và tích hợp Stitch.
  - [x] Tự động push code lên kho lưu trữ GitHub (`origin/main`).
