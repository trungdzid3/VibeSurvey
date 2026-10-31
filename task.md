# Kế hoạch Thực thi: Tích hợp 3 Trang Giao diện từ Stitch vào Nền tảng VibeSurvey

## Yêu cầu Chi tiết
1. **Giữ nguyên nhận diện & thông tin nền tảng**:
   - Tên thương hiệu: **VibeSurvey** (không dùng SurvHub).
   - Logo: Sử dụng logo hiện tại của VibeSurvey (`/logo-light.svg`, `/logo-dark.svg`, `/favicon.svg`).
   - Bảng màu: Tuân thủ nghiêm ngặt [DESIGN.md](file:///c:/Users/Lenovo/Downloads/Linh/DESIGN.md) với bộ 3 màu chủ đạo Cam `#EA580C`, Trắng `#FFFFFF`, Đen than `#121214` / `#1C1C20`.
   - Hệ thống Icon: Sử dụng chuẩn Lucide Icons (`data-lucide="..."`), tuyệt đối không emoji.
   - Kiểu chữ: Montserrat 100%.

2. **Tích hợp 3 màn hình từ Stitch**:
   - **Màn hình 1: Trang chủ Mở đầu (`case 'home':`)**:
     + Chuyển đổi mã HTML từ `stitch_screens/a8f703e9f38c4f6db80c09f21abf1012_trang_chu_mo_dau.html`.
     + Tạo view `renderHomeView(root)` chuyên nghiệp với Hero section, số liệu Bento, tính năng nổi bật, danh sách khảo sát tiêu biểu đang mở, và các nút CTA dẫn vào hệ thống.
     + Bổ sung tab "Trang Chủ" vào Navbar điều hướng `desktopNav` và `mobileBottomNav`.
   - **Màn hình 2: Diễn đàn & Góc Đề Tài (`case 'forum':`)**:
     + Chuyển đổi mã HTML từ `stitch_screens/1b986c90f52b4f1a85a3c6767b002623_dien_dan_goc_de_tai.html`.
     + Nâng cấp view `renderForumView(root)` với giao diện 2 cột: Feed bài viết (8 cột) + Sidebar (4 cột).
     + Giữ nguyên 100% logic API thật của VibeSurvey (`/forum/posts`, like, bình luận, đăng bài, lọc theo danh mục, khảo sát đính kèm).
   - **Màn hình 3: Thông tin tài khoản & Quản lý khảo sát (`case 'profile':`)**:
     + Chuyển đổi mã HTML từ `stitch_screens/fe33e17c90f24b3d8094e754850f5c31_thong_tin_tai_khoan_quan_ly_khao_sat.html`.
     + Nâng cấp view `renderProfileView(root)` với Banner hồ sơ người dùng, 3 thẻ bento chỉ số (Điểm Uy Tín, Mẫu Miễn Phí, Ví Điểm/Xu), và 5 tab chức năng:
       1. `demographics`: Thông tin nhân khẩu học (liên kết form cập nhật `/auth/profile`).
       2. `reputation`: Đánh giá & Mức độ uy tín (Attention-check, thời gian chuẩn, nhận xét chủ đề tài).
       3. `created-forms`: Khảo sát đã tạo (tiến độ mẫu, sửa, báo cáo, ghim VIP, xuất SPSS).
       4. `filled-forms`: Khảo sát đã tham gia (lịch sử, trạng thái duyệt, nhận thưởng).
       5. `forum-posts`: Bài viết của tôi trên diễn đàn.

## Danh sách Công việc (Tasks)
- [x] 1. **Tạo & Tích hợp Trang Chủ Mở Đầu (`renderHomeView` & Navbar)**
  - [x] Thiết lập hàm `renderHomeView(root)` trong `public/app.js` với layout chuẩn từ Stitch và màu sắc VibeSurvey.
  - [x] Cập nhật switch-case định tuyến và thanh điều hướng `renderNavigation` hiển thị tab "Trang Chủ".
- [x] 2. **Tích hợp & Nâng Cấp Trang Diễn Đàn & Góc Đề Tài (`renderForumView`)**
  - [x] Chuyển đổi giao diện Diễn đàn từ Stitch sang Bento layout VibeSurvey (Feed 8 cột + Sidebar 4 cột).
  - [x] Kết nối toàn diện logic bài viết, đính kèm khảo sát, bình luận và thả tim API thật.
- [x] 3. **Tích hợp & Nâng Cấp Trang Thông Tin Tài Khoản & Quản Lý Khảo Sát (`renderProfileView`)**
  - [x] Tích hợp Header hồ sơ, điểm uy tín, thẻ bento số dư ví.
  - [x] Xây dựng hệ thống 5 tab tương tác chuyển đổi mượt mà và kết nối dữ liệu user/surveys/responses thật.
- [x] 4. **Kiểm tra, Xác minh Cú pháp, Đồng bộ & Bàn giao**
  - [x] Chạy kiểm tra cú pháp `node -c public/app.js`.
  - [x] Chạy bộ kiểm thử tự động của dự án `npm test`.
  - [x] Đồng bộ Capacitor Android qua `npm run sync:android`.
  - [x] Cập nhật `PROJECT_CONTEXT.md` và bảo toàn `survey-platform.code-workspace`.

- [x] 5. **Chuẩn hóa Ràng buộc Định dạng, Thanh Công cụ Phẳng & Trình làm bài Đa câu hỏi theo Phân đoạn (Chuẩn Google Forms & Microsoft Forms)**
  - [x] Xây dựng `window.RestrictionEngine` hỗ trợ đầy đủ Email, Số (Là số, Trong khoảng min~max), Độ dài (Tối đa, Tối thiểu), URL kèm kiểm tra tức thì (Realtime Validation) và thông báo lỗi nội dòng đỏ.
  - [x] Thiết kế lại thanh Action Bar dưới chân câu hỏi trong Creator Studio phẳng hoàn toàn theo chuẩn Microsoft Forms với menu popup nổi lên (`bottom-full mb-1.5 z-50`) có dấu tích `✓`, toggle `Câu trả lời dài`, toggle `Bắt buộc`.
  - [x] Thiết lập `buildSurveySections` và cấu trúc Trình làm bài Đa câu hỏi theo Phân đoạn (`renderTakeSurveyView` dạng cuộn tất cả câu hỏi trong một Section, không coi `SECTION_HEADER` là câu hỏi đơn lẻ).
  - [x] Triển khai điều hướng Phân đoạn (`nextSection`, `prevSection`) với xác thực hợp lệ toàn diện (`validateCurrentSection`) và rẽ nhánh 2 tầng (Option-level và Section-level).
  - [x] Chạy kiểm thử tự hành 15/15 test suites `npm test`, kiểm thử `tests/test_short_text_answers.js`, kiểm thử `tests/test_section_runner.js` đạt 100% PASS.
  - [x] Đồng bộ toàn diện sang Android Capacitor `npm run sync:android` và đẩy lên kho mã nguồn GitHub.
