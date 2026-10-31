# Kế hoạch Thực thi: Hoàn thiện Cơ chế Điều Hướng Chuẩn GG Forms / MCRS Forms & Giới hạn Định dạng (Restrictions)

## Yêu cầu Chi tiết
1. **Cơ chế Giới hạn Định dạng (Restrictions / Validation) chuẩn Microsoft Forms & Google Forms**:
   - Như các hình ảnh thực tế từ Microsoft Forms:
     + Email: Bắt buộc định dạng email, placeholder "Vui lòng nhập email".
     + Số (Là số): Giá trị phải là một số, placeholder "Giá trị phải là một số".
     + Số (Trong khoảng): Số phải nằm trong khoảng từ `Min` ~ `Max` (vd: `20000000` đến `20270000`), placeholder "Số phải nằm trong khoảng từ 20000000 ~ 20270000".
     + Số (Lớn hơn, Nhỏ hơn, Lớn hơn hoặc bằng, Nhỏ hơn hoặc bằng).
     + URL, Độ dài ký tự tối thiểu/tối đa.
   - Cung cấp giao diện thiết lập "Giới hạn" trong Creator Studio cho câu hỏi Text (`SHORT_TEXT`, `PARAGRAPH`).
   - Bóc tách tự động các giới hạn này khi nhập từ Microsoft Forms và Google Forms (`formParserService.js`).
   - Thực thi xác thực nghiêm ngặt khi làm bài (`take-survey`): Hiển thị đúng placeholder gợi ý, ngăn chặn chuyển câu / Enter / Nộp bài nếu nhập sai định dạng và hiện thông báo hướng dẫn.
2. **Cơ chế Điều hướng Rẽ nhánh Chuẩn mực (Google Forms & Microsoft Forms)**:
   - Rẽ nhánh theo phương án lựa chọn (Option-level Branching): Chọn phương án -> nhảy trực tiếp tới Phân đoạn (Mục) hoặc Câu hỏi đích, hoặc Gửi biểu mẫu.
   - Rẽ nhánh kết thúc Phân đoạn (Section-end Branching): Khi hoàn thành câu hỏi cuối cùng của một Phân đoạn, tự động kiểm tra quy tắc "Sau phần này:" của Phân đoạn đó (Tiếp tục đến phần tiếp theo, Chuyển đến Mục X, hoặc Gửi biểu mẫu) để không bị rớt vào các phân đoạn của nhánh khác!
   - Unwrap dữ liệu điều hướng chuẩn xác bất kể dạng chuỗi hay đối tượng (`action`, `target`, `sectionId`).
   - Bảo toàn ngăn xếp lịch sử `session.history` khi bấm "Câu trước".

## Danh sách Công việc (Tasks)
- [x] 1. **Cập nhật Backend & Dịch vụ Bóc Tách (`server/services/formParserService.js` & `server/repositories/surveyRepository.js`)**:
  - [x] Bổ sung bóc tách `validation` / `restrictions` trong `_parseMicrosoftQuestion` (Email, Số, Trong khoảng, URL, Placeholder).
  - [x] Bổ sung bóc tách `validation` trong `parseGoogleFormsHtml` và `parseGoogleFormsApiResponse`.
  - [x] Đảm bảo `surveyRepository` lưu và nạp `validation` đồng bộ trong `logic_json`.
- [x] 2. **Giao diện Creator Studio Form Builder (`public/app.js`)**:
  - [x] Thiết lập giao diện "Giới hạn" (Restrictions) cho `SHORT_TEXT` và `PARAGRAPH` chuẩn Microsoft Forms (Dropdown Loại: Không có, Email, Số, Độ dài, URL; Điều kiện Số: Là số, Trong khoảng, Lớn hơn, Nhỏ hơn).
  - [x] Tự động cập nhật placeholder mẫu và lưu vào `q.validation`.
  - [x] Hoàn thiện dropdown cấu hình rẽ nhánh theo từng lựa chọn và điều hướng sau phân đoạn.
- [x] 3. **Trình Làm Bài Khảo Sát (`take-survey` trong `public/app.js`)**:
  - [x] Hiển thị placeholder chuẩn từ `q.validation.placeholder` (như hình 4 của Microsoft Forms).
  - [x] Kiểm tra xác thực định dạng trong `nextQuestion()` và sự kiện phím `Enter`: Email, Số, Trong khoảng, URL.
  - [x] Triển khai cơ chế điều hướng 2 tầng chuẩn Google Forms & Microsoft Forms:
    + Tầng 1: Rẽ nhánh ngay theo đáp án đã chọn (`Option-level`).
    + Tầng 2: Rẽ nhánh khi kết thúc Phân đoạn (`Section-end routing`).
- [x] 4. **Kiểm thử & Nghiệm thu Toàn diện**:
  - [x] Viết bộ test tự động kiểm thử toàn bộ các ràng buộc định dạng và cơ chế rẽ nhánh 2 tầng.
  - [x] Chạy `npm test` 15 tầng kiểm thử đảm bảo 100% PASS.
  - [x] Kiểm tra cú pháp `node -c`.
  - [x] Đồng bộ Capacitor Android `npm run sync:android`.
  - [x] Cập nhật `PROJECT_CONTEXT.md` và bảo toàn `survey-platform.code-workspace`.
