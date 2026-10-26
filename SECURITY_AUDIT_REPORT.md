# BÁO CÁO KIỂM TOÁN AN TOÀN BẢO MẬT TOÀN DIỆN (FULL SECURITY AUDIT)
Dự án: Nền tảng Khảo sát & Đổi thưởng VibeSurvey (Web & Android)
Mã kiểm toán: vibesurvey-audit-001 (Run 1)
Ngày thực hiện: 26/10/2026
Phương pháp: Đánh giá mã nguồn phòng thủ (Source-grounded Defensive Code Audit)

---

## 1. TỔNG QUAN KẾT QUẢ KIỂM TOÁN

Quá trình kiểm toán toàn diện đã rà soát toàn bộ các phân tầng ứng dụng, bao gồm:
- Các tuyến giao tiếp HTTP API: Xác thực tài khoản (auth), quản lý khảo sát (surveys), ví điện tử & ký quỹ (wallet), hệ sinh thái voucher & tài trợ, quản trị hệ thống (admin).
- Các dịch vụ xử lý nội bộ: Động cơ chống gian lận (Anti-Fraud Engine), webhook đồng bộ Google Sheets, trình tải favicon/logo thương hiệu tự động (Logo Crawler).
- Giao diện người dùng Web SPA: Cơ chế xử lý DOM, chống XSS, lưu trữ phiên đăng nhập.

### Thống kê mức độ nghiêm trọng
- CRITICAL (Nghiêm trọng): 1 lỗ hổng
- HIGH (Cao): 3 lỗ hổng
- MEDIUM (Trung bình): 3 lỗ hổng
- LOW (Thấp): 3 lỗ hổng
- Tổng số lỗ hổng đã xác nhận: 10 lỗ hổng (100% có vết kiểm soát luồng cụ thể từ mã nguồn, không có cảnh báo giả).

---

## 2. BẢNG TỔNG HỢP CÁC LỖ HỔNG XÁC NHẬN

| Mã lỗi (Fingerprint) | Mức độ | Tiêu đề lỗ hổng | Tệp nguồn & Vị trí | Tác động chính |
|---|---|---|---|---|
| VIBESURVEY-AUTH-001-GOOGLE-TAKEOVER | CRITICAL | Giải mã Google JWT không qua kiểm tra chữ ký & Chiếm quyền tài khoản tùy ý | server/controllers/authController.js#L610-L655 | Chiếm đoạt tài khoản quản trị (admin) hoặc bất kỳ người dùng nào |
| VIBESURVEY-SSRF-001-SHEETS-WEBHOOK | HIGH | Server-Side Request Forgery qua Webhook Google Sheets | server/services/webhookService.js#L13-L72 | Đọc dữ liệu nhạy cảm hoặc quét mạng nội bộ / Cloud Metadata |
| VIBESURVEY-SSRF-002-LOGO-CRAWLER | HIGH | Server-Side Request Forgery qua Trình tải Logo/Favicon Voucher | server/services/logoCrawlerService.js#L137-L200 | Bị lợi dụng quét cổng nội bộ và gọi IP loopback / private |
| VIBESURVEY-XSS-001-STORED-DOM | HIGH | Stored DOM XSS trong Bảng phân tích khảo sát & Thẻ khảo sát | public/app.js#L2494, L4268, L4348 | Đánh cắp JWT token của Creator/Admin khi xem kết quả |
| VIBESURVEY-AUTH-002-EMAIL-VERIFY-BYPASS | MEDIUM | Bỏ qua xác thực Email OTP khi gửi yêu cầu không có trường OTP | server/controllers/authController.js#L453-L470 | Kích hoạt tài khoản hợp lệ mà không cần mã xác nhận email |
| VIBESURVEY-AUTH-003-REGISTRATION-OTP-BYPASS | MEDIUM | Bỏ qua OTP đăng ký bằng User-Agent hoặc Email chứa từ khóa test | server/controllers/authController.js#L150-L167 | Bot spam tạo hàng loạt tài khoản đã xác thực mà không cần email thật |
| VIBESURVEY-INFO-001-SCREENER-LEAK | MEDIUM | Lộ đáp án sàng lọc Screener trong API chi tiết khảo sát | server/controllers/surveyController.js#L171, L724 | Cheater/Bot biết trước đáp án để lách bộ lọc nhân khẩu học |
| VIBESURVEY-CRYPTO-001-DEFAULT-JWT-SECRET | LOW | Sử dụng khóa bí mật JWT mặc định cố định khi thiếu biến môi trường | server/config/index.js#L8 | Kẻ tấn công giả mạo token người dùng nếu server quên set env |
| VIBESURVEY-INJ-001-CSV-FORMULA | LOW | CSV Formula Injection khi xuất danh sách phản hồi khảo sát | server/controllers/surveyController.js#L1085-L1089 | Thực thi macro/lệnh trên máy tính nạn nhân khi mở file CSV |
| VIBESURVEY-NET-001-IP-SPOOFING | LOW | Giả mạo địa chỉ IP qua header X-Forwarded-For chưa cấu hình proxy | server/services/antiFraudService.js#L247-L261 | Bot vượt qua ngưỡng đánh giá gian lận và lệnh cấm IP |

---

## 3. CHI TIẾT KỸ THUẬT VÀ PHƯƠNG ÁN KHẮC PHỤC

### 3.1. LỖ HỔNG CRITICAL

#### VIBESURVEY-AUTH-001-GOOGLE-TAKEOVER: Giải mã Google JWT thô và chiếm quyền tài khoản tùy ý
- Vị trí mã nguồn: `server/controllers/authController.js`, dòng 610-655.
- Cơ chế lỗi:
  Hàm `exports.googleAuth` xử lý token Google gửi lên bằng cách tách chuỗi JWT và giải mã thô phần payload bằng `Buffer.from(parts[1], 'base64')` mà hoàn toàn KHÔNG kiểm tra chữ ký mật mã (cryptographic signature) với máy chủ Google. Nghiêm trọng hơn, đoạn code còn có nhánh dự phòng cho phép đọc trực tiếp `google_id` và `email` từ `req.body`.
  Khi email nhận được trùng với một tài khoản đã có trong hệ thống (kể cả tài khoản `admin@vibesurvey.com`), server tự động liên kết `google_id` mới vào tài khoản đó và cấp ngay một JWT token đăng nhập có thời hạn 7 ngày mà không yêu cầu nhập mật khẩu.
- Hướng khắc phục dứt điểm:
  1. Sử dụng thư viện chính thức `google-auth-library` (`OAuth2Client.verifyIdToken`) để kiểm tra tính hợp lệ của token do Google phát hành.
  2. Loại bỏ hoàn toàn việc nhận `email` hoặc `google_id` trực tiếp từ `req.body`.
  3. Với các tài khoản ban đầu đăng ký bằng mật khẩu, không tự động liên kết tài khoản Google nếu người dùng chưa đăng nhập và xác thực chủ quyền trước đó.

---

### 3.2. CÁC LỖ HỔNG HIGH

#### VIBESURVEY-SSRF-001-SHEETS-WEBHOOK: Server-Side Request Forgery trong cơ chế Webhook Google Sheets
- Vị trí mã nguồn: `server/services/webhookService.js`, dòng 13-72 và `server/controllers/surveyController.js`, dòng 270-275.
- Cơ chế lỗi:
  Khi tạo khảo sát, Creator có thể điền trường `google_sheets_webhook_url`. Hệ thống chỉ kiểm tra chuỗi bắt đầu bằng `http://` hoặc `https://`. Khi có respondent gửi bài khảo sát, máy chủ backend sẽ dùng hàm `fetch()` để gửi payload HTTP POST tới địa chỉ này.
  Kẻ tấn công có thể cấu hình URL trỏ tới `http://127.0.0.1:6379` (Redis nội bộ), các dịch vụ quản trị nội bộ hoặc `http://169.254.169.254` (Cloud Instance Metadata Service trên AWS/GCP) để trích xuất khóa truy cập hoặc làm bàn đạp tấn công mạng nội bộ.
- Hướng khắc phục dứt điểm:
  1. Kiểm tra regex bắt buộc webhook phải thuộc tên miền chuẩn của Google Apps Script: `^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$`.
  2. Bổ sung cơ chế phân giải DNS và chặn dải IP loopback (`127.0.0.0/8`), IP private RFC 1918 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`) và Link-local (`169.254.0.0/16`).

#### VIBESURVEY-SSRF-002-LOGO-CRAWLER: Server-Side Request Forgery trong bộ tải Logo/Favicon
- Vị trí mã nguồn: `server/services/logoCrawlerService.js`, dòng 137-200 và `server/services/voucherService.js`, dòng 232-241.
- Cơ chế lỗi:
  Khi tạo voucher tài trợ, Creator nhập tên miền `website_domain`. Hàm `crawlAndSaveLogo` tải mã HTML và ảnh logo bằng client HTTP nội bộ, có hỗ trợ tự động đi theo liên kết chuyển hướng 301/302 (redirect). Bộ tải này không kiểm tra IP đích sau khi phân giải tên miền.
- Hướng khắc phục dứt điểm:
  1. Phân giải DNS trước khi kết nối; từ chối tải nếu địa chỉ IP thuộc dải nội bộ, loopback hoặc metadata.
  2. Trước mỗi bước chuyển hướng (redirect), kiểm tra lại IP đích của URL mới.

#### VIBESURVEY-XSS-001-STORED-DOM: Stored DOM XSS trong trang phân tích kết quả và danh sách thẻ khảo sát
- Vị trí mã nguồn: `public/app.js`, các dòng 2494-2498, 4260-4276, 4347-4349.
- Cơ chế lỗi:
  Khi hiển thị câu trả lời tự luận (`OPEN_TEXT`) trong modal xem phân tích chi tiết của Creator và tiêu đề khảo sát trong danh sách thẻ, mã nguồn chèn trực tiếp biến vào chuỗi HTML thông qua `innerHTML` mà không sử dụng hàm lọc `escapeHtml()`.
  Kẻ tấn công đóng vai Respondent làm bài khảo sát và nhập mã độc JavaScript (ví dụ: `<img src=x onerror="...">`). Khi Creator mở trang phân tích, mã độc được thực thi ngay trong phiên làm việc của Creator, dẫn đến nguy cơ bị đánh cắp token xác thực lưu trong `localStorage`.
- Hướng khắc phục dứt điểm:
  1. Bọc tất cả các biến động hiển thị qua hàm `escapeHtml(value)` trước khi ghép chuỗi vào `innerHTML`.
  2. Ưu tiên sử dụng `element.textContent = value` cho các đoạn nội dung văn bản thuần.

---

### 3.3. CÁC LỖ HỔNG MEDIUM

#### VIBESURVEY-AUTH-002-EMAIL-VERIFY-BYPASS: Bỏ qua xác thực Email OTP
- Vị trí mã nguồn: `server/controllers/authController.js`, dòng 453-470.
- Cơ chế lỗi:
  Hàm `verifyEmail` kiểm tra điều kiện: `if (req.body && req.body.otp)`. Nếu người dùng gửi yêu cầu với body rỗng `{}` hoặc không có thuộc tính `otp`, luồng xử lý rơi vào nhánh `else` dự phòng cũ và trực tiếp thực thi câu lệnh SQL: `UPDATE users SET is_email_verified = 1 WHERE id = ?`.
- Hướng khắc phục dứt điểm:
  Xóa bỏ hoàn toàn nhánh `else` dự phòng. Bắt buộc `req.body.otp` phải tồn tại, nếu không trả về lỗi HTTP 400.

#### VIBESURVEY-AUTH-003-REGISTRATION-OTP-BYPASS: Cửa hậu bỏ qua OTP đăng ký
- Vị trí mã nguồn: `server/controllers/authController.js`, dòng 150-167.
- Cơ chế lỗi:
  Trong luồng đăng ký, hàm kiểm tra `isAutomatedTest` dựa trên header `User-Agent` chứa chữ `node` hoặc địa chỉ email chứa các từ khóa như `test`, `bot`, `linh_`, `techcorp`. Nếu thỏa mãn, server tự động đặt `is_email_verified = 1` và không yêu cầu xác thực OTP. Kẻ xấu có thể giả mạo User-Agent để tạo hàng loạt tài khoản rác.
- Hướng khắc phục dứt điểm:
  Giới hạn điều kiện test chỉ kích hoạt khi biến môi trường `process.env.NODE_ENV === 'test'`, tuyệt đối không dựa vào dữ liệu do người dùng gửi lên.

#### VIBESURVEY-INFO-001-SCREENER-LEAK: Lộ đáp án sàng lọc Screener
- Vị trí mã nguồn: `server/controllers/surveyController.js`, dòng 171-173, 724-726.
- Cơ chế lỗi:
  API trả về chi tiết khảo sát cho Respondent (`GET /api/surveys/:id`) gửi kèm toàn bộ thuộc tính `qualifying_answer` của các câu hỏi sàng lọc nhân khẩu học. Cheater có thể mở Network Tab để biết trước đáp án nào sẽ được chọn làm khảo sát trả phí.
- Hướng khắc phục dứt điểm:
  Lọc bỏ trường `qualifying_answer` khỏi payload trả về cho Respondent. Việc đánh giá đáp án screener chỉ được thực hiện trên máy chủ khi nộp bài.

---

### 3.4. CÁC LỖ HỔNG LOW

#### VIBESURVEY-CRYPTO-001-DEFAULT-JWT-SECRET: Khóa bí mật JWT mặc định
- Vị trí mã nguồn: `server/config/index.js`, dòng 8.
- Cơ chế: Nếu chưa cấu hình biến môi trường `JWT_SECRET`, ứng dụng dùng giá trị mặc định `vibesurvey_default_secret_key_2026`.
- Khắc phục: Yêu cầu bắt buộc phải có `JWT_SECRET` khi chạy môi trường `production`, nếu thiếu thì dừng khởi động máy chủ.

#### VIBESURVEY-INJ-001-CSV-FORMULA: Chèn công thức độc hại khi xuất CSV
- Vị trí mã nguồn: `server/controllers/surveyController.js`, dòng 1085-1089.
- Cơ chế: Câu trả lời bắt đầu bằng các ký tự `=`, `+`, `-`, `@` khi xuất ra file CSV có thể kích hoạt lệnh trên Excel/Calc.
- Khắc phục: Thêm dấu nháy đơn `'` ở đầu giá trị nếu ký tự đầu tiên là ký tự kích hoạt công thức bảng tính.

#### VIBESURVEY-NET-001-IP-SPOOFING: Giả mạo IP qua X-Forwarded-For
- Vị trí mã nguồn: `server/services/antiFraudService.js`, dòng 247-261.
- Cơ chế: Lấy địa chỉ IP trực tiếp từ `x-forwarded-for` mà không thông qua cấu hình `app.set('trust proxy', ...)`.
- Khắc phục: Cấu hình dải IP proxy tin cậy trong Express và chỉ đọc `req.ip`.

---

## 4. CÁC ĐIỂM SÁNG KIẾN TRÚC AN TOÀN ĐÃ LÀM TỐT
- Cơ chế Sổ cái Kép (Double-Entry Ledger) trong `server/services/ledgerService.js` được thực thi hoàn toàn trong khối giao dịch SQLite (`BEGIN IMMEDIATE` / `COMMIT`), đảm bảo nguyên tắc bất biến tổng nợ bằng tổng có, loại bỏ hoàn toàn nguy cơ Race Condition rút tiền kép.
- Phân quyền Admin: Middleware `requireAdmin` kiểm tra vai trò người dùng trong cơ sở dữ liệu trên từng yêu cầu nhạy cảm.
- Phòng chống SQL Injection: Toàn bộ truy vấn SQL đều sử dụng cú pháp tham số hóa (`?`), không phát hiện lỗi nối chuỗi SQL nào.
- Mật khẩu người dùng được băm an toàn bằng thuật toán bcrypt với hệ số chi phí phù hợp (salt rounds 10).

---

## 5. LỘ TRÌNH VÀ KẾ HOẠCH KHẮC PHỤC KHUYẾN NGHỊ

### Ưu tiên P0 (Khẩn cấp - Cần vá ngay)
1. Sửa hàm `googleAuth` trong `server/controllers/authController.js`: Bắt buộc xác thực chữ ký token Google và cấm liên kết tài khoản tự động bằng email từ body.
2. Thêm kiểm tra regex tên miền Google Apps Script và chặn IP nội bộ trong `server/services/webhookService.js`.
3. Bổ sung `escapeHtml()` cho các vị trí hiển thị kết quả phân tích khảo sát trong `public/app.js`.

### Ưu tiên P1 (Ưu tiên cao - Trong vòng 24-48 giờ)
4. Sửa hàm `verifyEmail` trong `server/controllers/authController.js`: Bắt buộc phải có OTP hợp lệ.
5. Sửa điều kiện `isAutomatedTest` trong `server/controllers/authController.js`: Chỉ cho phép khi `NODE_ENV === 'test'`.
6. Chặn dải IP private/loopback trong bộ tải logo `server/services/logoCrawlerService.js`.

### Ưu tiên P2 (Ưu tiên trung bình)
7. Lọc bỏ trường `qualifying_answer` trong các API gửi về cho Respondent (`server/controllers/surveyController.js`).
8. Xử lý ký tự công thức trong hàm xuất CSV (`escapeCSV`).
9. Cấu hình kiểm tra biến môi trường `JWT_SECRET` bắt buộc và thiết lập `trust proxy` chuẩn cho Express.
