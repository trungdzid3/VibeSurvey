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
- [x] 5. **Tối ưu hóa Giao diện Diễn Đàn & Trang Mở Đầu Chuẩn DESIGN.MD (Phản hồi Người dùng)**
  - [x] Áp dụng màu nền ấm Stitch `#FFF8F5` cùng các khối ambient atmospheric glow cho toàn bộ trang ở Light mode.
  - [x] Diễn đàn: Loại bỏ 100% icon sticker/emoji màu sắc, chuẩn hóa tiêu đề tinh gọn "Diễn Đàn", xóa sạch toàn bộ bài viết mock cứng, kết nối 100% dữ liệu bài viết thật từ API backend.
  - [x] Thẻ mẫu tương tác Trang Mở Đầu: Bỏ đơn vị "Xu", chuẩn hóa sang Điểm thưởng SurvHub, nút bấm dẫn sang đăng ký/đăng nhập làm bài thật.
  - [x] Widget Điểm Danh (Streak): Màu xám trung tính khi chưa điểm danh, bỏ chấm đỏ nhấp nháy, ngọn lửa bừng sáng phong cách TikTok khi đã điểm danh.
- [x] 6. **Nâng cấp Diễn Đàn: Phân Khu Sinh Viên Riêng Biệt & Thảo Luận Tự Do Mở Rộng**
  - [x] Cập nhật Cơ sở dữ liệu: Cho phép `survey_id` nullable, thêm `post_type` ('COMMUNITY' / 'STUDENT') và `category`.
  - [x] Nâng cấp Backend (`forumController.js`): Hỗ trợ đăng bài tự do (khảo sát là tùy chọn), phân quyền truy cập mục sinh viên, tinh chỉnh nhận diện link trá hình an toàn không gây false positive.
  - [x] Nâng cấp Frontend (`public/app.js`): Bổ sung 2 Tab Phân Khu (Cộng Đồng Chung vs Góc Sinh Viên), hỗ trợ modal đăng bài tự do/có khảo sát, render thẻ bài viết linh hoạt.
  - [x] Kiểm thử tự động & Đồng bộ: Chạy `tests/test_forum_community.js` và toàn bộ 15 tầng kiểm thử, đồng bộ Android và push GitHub.

---

## Giai Đoạn Rà Soát Kế Hoạch, Vá Bảo Mật & Đồng Bộ Quy Chuẩn Antigravity

- [x] 7. **Đồng Bộ Quy Tắc Toàn Cục (Rules) & Định Tuyến Kỹ Năng (Skills) từ Antigravity Platform**
  - [x] Đồng bộ `.agent/rules.md` theo Antigravity Global Rules (`~/.gemini/GEMINI.md`): Đủ 5 phần (Nguyên tắc cốt lõi, Argon Strategy Loop, Subagent First & Parallel Domain Scaling, DESIGN.md SSOT, Skill Routing & Skill Chains, `auto_github_sync: true`).
  - [x] Cập nhật `.agent/GEMINI.md` sang chuẩn SurvHub (tiền thân VibeSurvey), tỷ giá 1:1 VNĐ, 3 phân khúc, SQLite WAL, hạ tầng Oracle Always Free + Cloudflare Tunnel.
  - [x] Đồng bộ và bảo toàn danh mục Subagents chuyên trách trong `.agent/` (`pricing-economist`, `fintech-ledger-engineer`, `auth-profile-specialist`, `form-parser-specialist`, `anti-fraud-specialist`).

- [ ] 8. **Task 0 (Bảo Mật Khẩn Cấp): Vá 10 Lỗ Hổng Xác Nhận từ `SECURITY_AUDIT_REPORT.md` (Chạy Trước Khi Code Tính Năng)**
  - [ ] **P0 (Critical)**: Vá lỗi Google Auth Account Takeover (`server/controllers/authController.js#L610-L655`) — tích hợp thư viện chính thức `google-auth-library` (`OAuth2Client.verifyIdToken`) kiểm tra chữ ký mã hóa, loại bỏ hoàn toàn việc nhận `email` / `google_id` thô từ request body.
  - [ ] **P1 (High)**: Vá SSRF trong Webhook Google Sheets (`server/services/webhookService.js#L13-L72`) — kiểm tra regex bắt buộc domain `^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$`, phân giải DNS chặn loopback `127.0.0.0/8` và dải IP private RFC 1918.
  - [ ] **P1 (High)**: Vá SSRF trong Trình tải Logo/Favicon (`server/services/logoCrawlerService.js#L137-L200`) — phân giải DNS trước khi tải, chặn IP nội bộ/metadata, kiểm tra IP đích ở mỗi lượt redirect 301/302.
  - [ ] **P1 (High)**: Vá Stored DOM XSS trong Bảng phân tích khảo sát & Thẻ khảo sát (`public/app.js`) — bọc hàm `escapeHtml()` cho 100% câu trả lời tự luận `OPEN_TEXT` và tiêu đề khảo sát.
  - [ ] **P2 (Medium)**: Vá lỗi Bypass xác thực Email OTP khi gửi body rỗng (`authController.js#L453-L470`) — kiểm tra bắt buộc trường OTP tồn tại và hợp lệ.
  - [ ] **P2 (Medium)**: Loại bỏ Backdoor Bypass OTP đăng ký qua User-Agent / Email test (`authController.js#L150-L167`) — chặn bot spam tài khoản xác thực.
  - [ ] **P2 (Medium)**: Che giấu đáp án câu hỏi sàng lọc Screener khỏi API chi tiết khảo sát (`surveyController.js#L171, L724`) — bóc tách `qualifying_answer` trước khi trả về cho respondent để chống bot lách bộ lọc trước khi xây Auto-Screener.
  - [ ] **P3 (Low)**: Ép buộc biến môi trường `JWT_SECRET` (loại bỏ fallback chuỗi cố định); sanitize công thức CSV Injection (`=`, `+`, `-`, `@`); vô hiệu hóa tin cậy header IP giả mạo `X-Forwarded-For`.

- [ ] 9. **Rà Soát & Khắc Phục 7 Sai Lệch Kinh Tế Học & Bất Biến Sàn (Chống Lỗ Sàn Tuyệt Đối)**
  - [ ] **Rà soát 1 (Khắc phục lỗi lớn nhất)**: Thống nhất thù lao 25 lượt free Gói Cá Nhân giữa Bảng giá I.2/2.1.A (750đ) và Công thức tính động I.3/2.1.B (375đ); định rõ tỷ lệ trừ lượt free (ví dụ tối đa 10-15 lượt) hoặc lượt free chỉ miễn phí sàn (đáp viên nhận đủ 750đ) để triệt tiêu nguy cơ lỗ 12.500đ/đơn.
  - [ ] **Rà soát 2**: Thống nhất phụ phí lọc đối tượng Sinh viên (+100đ/mẫu): tách riêng phần thù lao (+50đ cho đáp viên) và phần sàn thu (+50đ) ra khỏi công thức nhân `(1 - TakeRate)`, tránh việc đáp viên nhận 450đ làm giảm thu của sàn.
  - [ ] **Rà soát 3**: Chuẩn hóa công thức hoàn tiền khi đóng bài sớm / hết hạn: sửa Mục V.3 / 4.3 từ `(target - collected) * cost_per_response` thành hoàn từ số dư ký quỹ thực tế còn lại (`escrow_locked_balance`), bảo toàn tối thiểu 10% phí sàn khi có lượt free.
  - [ ] **Rà soát 4**: Đồng bộ mức trừ Điểm Uy Tín `REJECTED_FRAUD`: thống nhất chuẩn duy nhất `-12.0 điểm` giữa `KE_HOACH_TONG_THE.md` và `TUONG_LAI_HE_THONG.md`.
  - [ ] **Rà soát 5**: Định nghĩa rõ cơ chế xử lý bài làm Nghi vấn (`SUSPICIOUS`): quy định rõ giải ngân ngay (trừ điểm uy tín) hay tạm treo (`FLAGGED_MANUAL`) chờ duyệt.
  - [ ] **Rà soát 6**: Bảo toàn phạm vi bẫy Straight-lining: giữ nguyên kiểm tra cả `SINGLE_CHOICE` và `DROPDOWN` (ngưỡng 4 câu) như hiện tại, không thu hẹp chỉ còn Likert/Rating.
  - [ ] **Rà soát 7**: Bổ sung 7 quy tắc bất biến chi phí thật vào tài liệu: Giá bán Credit của Voucher/thẻ ≥ giá vốn tiền mặt; Bỏ vĩnh viễn cơ chế auto-replenish 25 mã vô hạn; Bút toán `PLATFORM_PAYOUT_COST` đối soát take rate; Trần rút thẻ cào/ngày cho tài khoản mới.

- [ ] 10. **Rà Soát & Đồng Bộ Đặc Tả Triển Khai Giữa 2 Tài Liệu (KE_HOACH_TONG_THE & TUONG_LAI_HE_THONG)**
  - [ ] Đồng bộ bảng voucher hybrid 3 mức (`1.000 / 1.300 / 1.600 Point`) từ TUONG_LAI sang KE_HOACH.
  - [ ] Thống nhất quy tắc không cộng dồn giảm giá voucher 20% với chiết khấu quy mô 10%-15%.
  - [ ] Xóa bỏ hoàn toàn phần thưởng lẻ `+5.000 Credit` hồ sơ cá nhân trong mọi tài liệu (đã gộp vào 25 lượt free).
  - [ ] Ghi chú rõ kế hoạch cắt đổi (Cutover): dự án đang phát triển, chưa công khai nên không cần quy đổi số dư 1:10 -> 1:1, chỉ cần reset dữ liệu test khi triển khai.

- [ ] 11. **Hạ Tầng Triển Khai Miễn Phí — Oracle Cloud Always Free + Cloudflare Tunnel + DigitalPlat Domain (Phần VI)**
  - [ ] Đăng ký tên miền miễn phí DigitalPlat (`survhub.dpdns.org` hoặc `.us.kg`), trỏ DNS về Cloudflare Free.
  - [ ] Khởi tạo VM Ampere A1 (2 OCPU / 6GB ARM64, Ubuntu LTS), cấu hình Cloudflare Tunnel trỏ về `localhost:3000` (không mở port 80/443).
  - [ ] Cài đặt Node.js 24 ARM64, rebuild native modules (`bcrypt`, `node:sqlite`), quản lý tiến trình bằng `pm2`.
  - [ ] Thiết lập 3 cronjobs định kỳ: quét `expires_at` đóng bài & hoàn tiền, hạ ghim sau 7 ngày, làm mới 30 lượt free ngày 01 đầu tháng; backup SQLite hằng ngày lên Object Storage.
  - [ ] Cập nhật Google OAuth redirect URIs, `APP_URL` và Capacitor Android; chạy song song Render 1-2 tuần làm fallback.

