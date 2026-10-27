# PROJECT CONTEXT: NỀN TẢNG KHẢO SÁT & ĐỔI ĐIỂM KIẾM LỢI NHUẬN (VIBESURVEY)

## 1. Mục Đích Cốt Lõi & Mô Hình Kinh Tế
- **Tên dự án**: **VibeSurvey** (Nền tảng Khảo sát Trực tuyến Kiếm Điểm & Lợi Nhuận).
- **Mô hình thị trường 2 chiều**:
  1. **Người trả lời (Respondent)**: Làm bài khảo sát tích lũy điểm thưởng Point (1 Point = 1 VNĐ), quy đổi thẻ cào / tài khoản ngân hàng / ví điện tử.
  2. **Người tạo khảo sát (Creator / Doanh nghiệp)**: Nạp tiền ví Credit (1 Credit = 1 VNĐ), thiết kế khảo sát trực tiếp (Studio chuẩn Google Forms) hoặc đồng bộ liên kết ngoài, cài đặt bộ lọc nhân khẩu học, ký quỹ Escrow minh bạch.
- **Dòng tiền & Lợi nhuận sàn**:
  - **Spread Margin (Biên lợi nhuận chênh lệch)**: Sàn giữ chênh lệch giữa giá Creator trả và thù lao trả cho Respondent.
  - **Creator Boost (Tỷ lệ 80/20)**: Khi Creator tăng đơn giá để gom mẫu nhanh, phần tiền tăng thêm (Delta P) được chia sẻ cố định: **80% cho người điền / 20% cho sàn** cho tất cả các gói tài khoản.
  - **Phí xử lý rút tiền**: Rút thẻ cào từ 10.000đ (0đ phí), rút ngân hàng/MoMo từ 50.000đ (2.000đ phí), từ 100.000đ miễn phí 100%.

## 2. Kiến Trúc Hệ Thống & Cấu Trúc Thư Mục
- **Backend Core**: Node.js & Express RESTful API với Transaction ACID, Double-entry Ledger ghi nhận biến động điểm/tiền, và Engine Anti-Fraud đa chốt chặn.
- **Frontend SPA & Mobile Hybrid**: Single Page Application với Tailwind CSS, Lucide Icons, font Montserrat 100%, phong cách Minimalist Modern Bento Grid (Cam `#EA580C`, Trắng `#FFFFFF`, Đen `#09090B`).
- **Android Mobile Wrapper**: Dự án Capacitor Native (`android/`) sẵn sàng đóng gói APK.
- **Cơ sở dữ liệu**: SQLite WAL mode (`server/db/vibesurvey.db`) với cơ chế migration tự động khi khởi động.

### Cấu Trúc Thư Mục Chuẩn
```
c:\Users\Lenovo\Downloads\Linh\
├── .agent/                    # Cấu hình quy chuẩn và ngữ cảnh Agent (rules.md, GEMINI.md)
├── android/                   # Dự án Capacitor Android Native
├── public/                    # Tài nguyên tĩnh SPA (app.js, index.html, styles.css, fonts, assets)
├── server/                    # Mã nguồn máy chủ Node.js & Express
│   ├── config/                # Cấu hình kinh tế (index.js), danh mục trường ĐH, tỉnh thành
│   ├── controllers/           # Auth, Survey, Response, Wallet, Admin controllers
│   ├── services/              # AntiFraud, Ledger, PricingEngine, FormParser, Webhook services
│   ├── db/                    # Database init (database.js), seed data, SQLite DB file
│   ├── middlewares/           # Auth JWT, RateLimit, DeviceFingerprint, Validation
│   └── app.js                 # Express server bootstrap
├── tests/                     # Bộ kiểm thử tự hành đa tầng (Pricing, API, Anti-Fraud, Review-Edit)
├── DESIGN.md                  # Quy chuẩn thiết kế giao diện (Design System SSOT)
├── PROJECT_CONTEXT.md         # Ngữ cảnh liên tục của dự án (SSOT tinh gọn)
└── survey-platform.code-workspace
```

## 3. Hiện Trạng Các Phân Hệ Tính Năng Cốt Lõi

### A. Phân Hệ Người Tạo Khảo Sát (Creator Studio)
- **Studio 2 cột chuẩn Google Forms**: Canvas soạn thảo câu hỏi bên trái (~65%) và Sticky Sidebar bên phải (~35%).
- **Hỗ trợ 12 loại câu hỏi**: Single choice, Multiple choice, Short text, Paragraph, Dropdown, Linear scale, Choice grid (ma trận radio), Checkbox grid (ma trận checkbox), Date, Time, Rating stars, File upload.
- **3 Phân khúc tài khoản Creator**:
  - Sinh Viên (.edu.vn): Giá sàn 400đ - 600đ/mẫu, miễn phí 30 lượt/tháng.
  - Cá Nhân: Giá sàn 800đ - 1.200đ/mẫu, hỗ trợ dùng thử 25 lượt bài đầu.
  - Doanh Nghiệp (Enterprise B2B): Giá sàn 1.500đ - 2.500đ/mẫu, cấp quyền xuất hóa đơn VAT, bảo hành mẫu 1 đổi 1 trong 7 ngày.
- **Thời hạn treo khảo sát trên sàn (Tự do 1 - 90 ngày)**: Ô nhập số ngày tự do đặt ngay cạnh nhãn "Thời Hạn Treo Trên Sàn (Tự Do):", gỡ bỏ các chip chọn cứng gây rối, khảo sát dừng khi đủ mẫu hoặc hết thời hạn, số tiền mẫu chưa thu được hoàn lại 100%.
- **Bảng giá & Tốc độ gom mẫu dự kiến**: 3 nấc tốc độ (Sàn tiết kiệm ~3-5 ngày, Đề xuất ~24-48h, Hỏa tốc ~2-6h) kèm thanh trượt Creator Boost chia 80/20.
- **Đồng bộ biểu mẫu ngoài**: Nhận diện và trích xuất tự động từ Google Forms (hỗ trợ `forms.gle`) và Microsoft Forms.

### B. Phân Hệ Người Điền (Respondent) & Engine Chống Gian Lận (Anti-Fraud)
- **5 Chốt chặn chống gian lận**:
  1. Speed Trap: Bẫy thời gian làm bài tối thiểu, tính riêng câu trắc nghiệm/thang đo/lưới, thời gian đọc tự luận = 0s.
  2. Attention Check Động: Chèn ngẫu nhiên câu kiểm tra chú ý, cơ chế Second-Chance Grace tha thứ 1 lần xác nhận lại.
  3. Straight-lining: Phát hiện chọn thẳng một đường (phương sai sigma^2 = 0) trên >= 5 câu thang đo.
  4. Bộ lọc tự luận rác: Cho phép số 0 và từ ngắn tiếng Việt hợp lệ, chỉ chặn spam lặp phím liên tục.
  5. Điểm uy tín Trust Score (khởi tạo 85.0): Điều chỉnh thưởng/phạt theo hành vi, khấu trừ lũy tiến khi điểm < 80, tạm khóa rút tiền khi < 60, tự động ban khi < 40.
  6. Bảo vệ Wi-Fi trường học: Chỉ khóa tài khoản khi có >= 3 tài khoản trùng dấu vân tay thiết bị (`device_fingerprint`).

### C. Phân Hệ Quản Trị Hệ Thống (Admin Overview & Console)
- **Dashboard Tổng quan 2 cột cân xứng (Split Grid 12 Cột)**: Cột trái chứa Sổ cái giao dịch gần nhất; Cột phải chứa Fast Command Console; đáy 2 cột ngang bằng nhau 100%.
- **Chỉ số Real-time Analytics & Retention thực tế**:
  - `activeUsersNow`: Số người dùng tương tác trong 15 phút qua (tính qua cột `last_active_at`).
  - `fillingFormsNow`: Số người đang điền form dở (responses status `IN_PROGRESS`).
  - `firstTimeRetentionRate` & `repeatRetentionRate`: Tính từ lịch sử đăng nhập thiết bị `device_ip_logs`.
  - Toàn bộ chỉ số lấy thực tế 100% từ CSDL SQLite, loại bỏ hoàn toàn số demo giả định.
- **Admin Fast Command Console**: Hỗ trợ 16 lệnh quản trị nhanh (`/naptien`, `/congdiem`, `/resetpoint`, `/ban`, `/unban`, `/settier`, phím tắt F2).

## 4. Các Lưu Ý Kỹ Thuật Bắt Buộc (Technical Gotchas)
1. **Bảo mật câu hỏi bẫy**: Khi API trả danh sách câu hỏi cho người điền, bắt buộc bóc tách 100% thuộc tính `is_attention_check` và `expected_answer` khỏi payload.
2. **Nguyên tắc giao dịch kép (Double-entry Ledger)**: Mọi biến động số dư Point và Credit phải được bọc trong Transaction ACID của SQLite với câu lệnh kiểm tra số dư nguyên tử.
3. **Công thức hoàn tiền an toàn (Safe Escrow Refund)**: Khi hủy hoặc đóng khảo sát sớm, số tiền hoàn trả được giới hạn bởi trần số dư ký quỹ thực tế: `Math.min(escrow_locked_balance, Math.max(0, TotalEscrow - (collected * effectivePrice)))` để chống gian lận khi dùng lượt miễn phí.
4. **Không phân biệt đối xử Creator Boost**: Tỷ lệ phân chia tiền thưởng tăng thêm giữa đáp viên và sàn luôn là cố định **80% điền / 20% sàn** trên toàn hệ thống.
5. **Chuẩn hóa URL biểu mẫu ngoài**: Luôn loại bỏ query parameters rác (`?usp=sf_link`, `?fbclid=...`) qua hàm `normalizeFormUrl()` trước khi kiểm tra trùng lặp biểu mẫu.
6. **Bảo toàn quyền Admin**: Trong mọi logic tự động khóa tài khoản vi phạm, luôn có điều kiện bảo vệ `AND role != 'ADMIN'`.

## 5. Hướng Dẫn Bàn Giao Cho Phiên Tiếp Theo
- Trước khi bắt đầu: Đọc kỹ tệp này và tệp `DESIGN.md`.
- Kiểm tra tính toàn vẹn: Chạy lệnh `node tests/test_pricing.js`, `node tests/test_api_endpoints.js` và `node tests/test_anti_fraud.js` (phải đạt 100% PASS).
- Sau khi chỉnh sửa: Chạy `node -c <file>` để kiểm tra cú pháp, cập nhật timestamp cache buster trong `public/index.html` và cập nhật lại tiến độ vào tệp này.
- Giao tiếp: Toàn bộ bằng tiếng Việt, tuyệt đối không dùng emoji/icon màu sắc trong mã nguồn, văn bản và giao diện.


### Cơ Chế Tự Động Thanh Lọc 100% Dữ Liệu Kiểm Thử (Auto-Cleanup Test Data - v3.1.1)
- **Vấn đề đã xử lý**: Khi chạy test hoặc tạo test, hàng chục tài khoản test và khảo sát rác bị lưu lại trong cơ sở dữ liệu làm ô nhiễm môi trường thật.
- **Giải pháp toàn diện**:
  1. Xây dựng module dùng chung 	ests/test_cleanup_helper.js: Tự động nhận diện và xóa sạch 100% tài khoản test (@api-test.com, @test.local, cheater_, student_, spammer_, hybrid_,...) và các bài khảo sát test, câu hỏi, phản hồi, voucher rác, bảo vệ an toàn tuyệt đối các tài khoản người dùng thật.
  2. Tích hợp cleanAllTestData vào 	ests/run_all_tests.js: Chạy tự động cả trước (pre-cleanup) và sau khi kết thúc toàn bộ test (post-cleanup trong khối finally).
  3. Bổ sung lệnh Admin Console /cleantest và nút bấm nhanh trong giao diện Admin để người dùng có thể dọn sạch dữ liệu test bất kỳ lúc nào.
