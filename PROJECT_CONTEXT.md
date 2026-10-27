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
- **Studio 2 cột cuộn độc lập riêng biệt (Dual Independent Scroll Panes)**:
  - Cột Trái (~65% Canvas soạn câu hỏi): Khung cuộn riêng biệt `overflow-y: auto`, đệm lề phải `pr-14` bảo vệ thanh công cụ nổi Google Forms không bị cắt cụt.
  - Cột Phải (~35% Cài đặt & Ngân sách): Khung cuộn riêng biệt `overflow-y: auto`, cuộn tự do không ảnh hưởng đến vị trí đọc/soạn câu hỏi ở cột trái.
  - Top Action Header cố định ở trên, giữ nút Lưu nháp và Xuất bản luôn trong tầm mắt.
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


### Khôi Phục Đầy Đủ 5 Bộ Lọc Đối Tượng & Cơ Chế Escrow Hoàn Tiền (v3.1.4)
- **Vấn đề đã xử lý**:
  1. Người dùng thắc mắc về cơ chế thời hạn treo trên sàn: Có tính tiền theo ngày không và có đền bù gì nếu không đạt tốc độ gom mẫu không?
  2. Tab "Bộ Lọc & Cài Đặt" (Card 3) trong Studio trước đó bị thiếu mất mục Lĩnh vực/Ngành nghề và mục Trường Đại học; đồng thời mục Khu vực bị hiển thị nhầm thành 63 tỉnh thành cũ thay vì danh sách 34 tỉnh thành mới.
- **Giải pháp triển khai**:
  1. **Làm rõ Cơ chế Thời Hạn & Ký Quỹ Escrow**:
     - Hoàn toàn KHÔNG tính phí theo số ngày treo trên sàn. Đơn giá chỉ tính trên số mẫu hoàn thành thực tế (Cost Per Response).
     - Bảo vệ Escrow 100%: Nếu hết hạn treo mà không gom đủ số mẫu đăng ký hoặc Creator chủ động dừng khảo sát sớm, toàn bộ số tiền cọc tương ứng với các mẫu chưa thu được sẽ được hoàn trả 100% về số dư ví Creator, không mất bất kỳ khoản phí phạt nào.
     - Tốc độ gom mẫu là thời gian ước tính theo xác suất hành vi của đáp viên khi thấy mức thưởng cao, không phải cam kết đóng băng hay trừ tiền phạt.
  2. **Khôi Phục Trọn Vẹn 5 Tiêu Chí Bộ Lọc Đối Tượng trong Studio**:
     - Tiêu chí 1: Giới tính mục tiêu (Tất cả / Nam / Nữ).
     - Tiêu chí 2: Độ tuổi mục tiêu (Mọi lứa tuổi / 18–22 / 23–29 / 30 trở lên).
     - Tiêu chí 3: Khu vực sinh sống chuẩn hóa theo **34 Tỉnh Thành Mới** & 3 Vùng Miền (`VIBE_PROVINCES_34`), tích hợp ô tìm kiếm lọc nhanh (xóa bỏ triệt để 63 tỉnh cũ).
     - Tiêu chí 4: Lĩnh vực / Nghề nghiệp mục tiêu (`VIBE_OCCUPATIONS`: Học sinh/Sinh viên, CNTT, Kinh doanh, Tài chính, Y tế, Giáo dục...).
     - Tiêu chí 5: Trường Đại học / Học viện mục tiêu với ô tìm kiếm autocomplete từ 293 trường Đại học/Cao đẳng (`VIBE_UNIVERSITIES_DATA`).
  3. **Minh Bạch Hóa Thẻ Creator Boost**:
     - Hiển thị rõ số tiền thưởng tăng thêm: `Phân chia thưởng Boost (+1.600đ): 80% điền / 20% sàn`.
     - Kèm tỷ lệ phần trăm thực nhận trên tổng giá: `Đáp viên nhận: 1.880 Point (78,3%) | Sàn thu: 520 Credit (21,7%)`.
  4. Cập nhật cache buster mới nhất trong `public/index.html`: `v=1793122409819`.


### Mô Hình Dự Báo Tốc Độ Gom Mẫu Động (Dynamic Velocity Engine) (v3.1.5)
- **Vấn đề đã xử lý**:
  1. Người dùng chỉ ra việc ghi cứng các mốc thời gian ("~3-5 ngày", "~24-48 giờ", "~2-6 giờ") là phi thực tế và mang tính tĩnh cứng (hardcoded), không có căn cứ theo quy mô khảo sát.
  2. Yêu cầu xây dựng cơ chế tự động theo dõi, tính toán đề xuất và chèn thời gian hoàn thành dự báo thực tế vào giao diện.
- **Giải pháp triển khai**:
  1. **Xây Dựng Thuật Toán Dự Báo Tốc Độ Động (Dynamic Velocity Engine)**:
     - Tích hợp hàm `estimateDynamicVelocity` trong `pricingService.js` và `VibeApp`:
     - Phân tích đa biến số thực tế:
       * **Quy mô số mẫu ($N$)**: Thời gian tỷ lệ thuận với số mẫu cần thu (ví dụ 30 mẫu khác hoàn toàn 500 mẫu).
       * **Hệ số độ dài câu hỏi ($k_{\text{loi}}$)**: $\le 5$ câu ($0.70$), $6-12$ câu ($1.00$), $13-25$ câu ($1.35$), $>25$ câu ($1.80$).
       * **Hệ số độ sâu bộ lọc đối tượng ($k_{\text{target}}$)**: Toàn quốc ($1.00$), lọc 1 tiêu chí ($1.25$), lọc 2 tiêu chí ($1.60$), lọc sâu $\ge 3$ tiêu chí hoặc trường ĐH hẹp ($2.20$).
       * **Lực hút thù lao ($v_{\text{boost}}$)**: Gia tốc phi tuyến tính theo tỷ lệ đơn giá Creator trả so với giá sàn ($v_{\text{boost}} = 1.0 + 5.5 \times (P/P_{\text{sàn}} - 1)^{1.15}$).
     - Tốc độ hoàn thành thực tế $V = (R_0 \times v_{\text{boost}}) / (k_{\text{loi}} \times k_{\text{target}})$, thời gian dự kiến $T = N / V$ (giờ).
  2. **Chèn Trực Tiếp Vào Giao Diện Thực Tế**:
     - Cả 3 thẻ SLA (Mức Sàn, Mức Đề Xuất, Mức Hỏa Tốc) tự động tính toán và hiển thị thời gian dự kiến thực tế cùng tốc độ mẫu/giờ (`Dự kiến: ~... | X mẫu/h`).
     - Thanh trượt Creator Boost tự do: Khi người dùng kéo giá từ sàn lên cao, thẻ theo dõi tốc độ tự động co giãn thời gian hoàn thành theo thời gian thực (ví dụ từ `~2 ngày` xuống `~3 giờ`, hiển thị rõ `12.5 mẫu/giờ`).
     - Hiển thị tóm tắt cơ sở dữ liệu dự báo: Quy mô N mẫu, thời lượng câu hỏi và trạng thái bộ lọc.
  3. Cập nhật cache buster mới nhất trong `public/index.html`: `v=1793122640024`.


### Chuyển Về Thước Đo Lực Hút Thù Lao & Độ Ưu Tiên Phân Phối Thực Tế (v3.1.6)
- **Vấn đề đã xử lý**:
  1. Người dùng phê bình gay gắt và chính xác: Hệ thống ở giai đoạn demo/khởi chạy chưa có dữ liệu phản hồi lịch sử (0 responses), việc đưa ra các con số ngày/giờ/tốc độ cụ thể (như `~8-12 giờ | 4.5 mẫu/h`) là tự bịa công thức, thiếu trung thực và tạo cam kết ảo cho khách hàng.
  2. Yêu cầu phản ánh đúng bản chất thực tế, minh bạch và có cơ sở.
- **Giải pháp triển khai**:
  1. **Xóa Bỏ Toàn Bộ Con Số Ngày/Giờ/Mẫu/h Giả Lập**:
     - Xóa bỏ triệt để các chuỗi thời gian ước tính tĩnh hoặc giả lập công thức lý thuyết khỏi cả 3 nấc SLA và thanh trượt Boost.
  2. **Đưa Về Đúng Bản Chất: "Mức Thưởng & Độ Ưu Tiên Phân Phối (Distribution Priority)"**:
     - **Mức Sàn Tiết Kiệm**: `Phân phối: Hàng chờ tiêu chuẩn | Tối ưu chi phí` (Phân phối theo thứ tự tự nhiên của hệ thống).
     - **Mức Đề Xuất (+25%)**: `Phân phối: Ưu tiên hiển thị nổi bật (+25%) | Thu hút đáp viên` (Đẩy lên danh mục bài làm được đề xuất, đáp viên chọn làm trước).
     - **Mức Hỏa Tốc (+60%)**: `Phân phối: Gắn nhãn [Thưởng Cao] (+60%) | Ưu tiên tối đa` (Gắn badge thưởng cao kích thích đáp viên vào làm ngay).
  3. **Thước Đo Lực Hút Thù Lao (Incentive Strength Index)**:
     - Trên thanh trượt Creator Boost, hiển thị độ chênh lệch thực tế so với giá sàn: `Lực hút thù lao: +X VNĐ (+Y%)`.
     - Phân cấp ưu tiên thời gian thực: `Hàng chờ tiêu chuẩn` -> `Ưu tiên hiển thị nổi bật` -> `Đẩy luồng ưu tiên cao` -> `Ưu tiên tối đa toàn sàn`.
  4. **Ghi Chú Minh Bạch Tuyệt Đối**:
     - Ghi rõ ràng: Thời gian gom mẫu thực tế phụ thuộc vào lưu lượng đáp viên online và mức độ hấp dẫn của thù lao tại từng thời điểm. Khảo sát hiển thị trên sàn cho đến khi đủ mẫu hoặc hết số ngày do Creator tự cài đặt. Tiền cọc các mẫu chưa thu được hoàn trả 100%.
  5. Cập nhật cache buster mới nhất trong `public/index.html`: `v=1793122909897`.


### Làm Sạch Triệt Để Giao Dịch Sổ Cái & Gỡ Bỏ Tài Khoản Test Khỏi Bootstrap (v3.1.2)
- **Vấn đề đã xử lý**: Bảng Sổ Cái Sàn Gần Nhất (Ledger Stream) hiển thị 11 giao dịch test của `creator@vibesurvey.com` (Doanh Nghiệp Test) và `user@vibesurvey.com` (Đáp Viên Test) cùng 62 thông báo test cũ.
- **Giải pháp dứt điểm**:
  1. Gỡ bỏ việc tự động sinh tài khoản `creator@vibesurvey.com` và `user@vibesurvey.com` trong hàm `ensureEssentialAccounts` của `server/db/database.js`.
  2. Xóa bỏ hoàn toàn 11 bản ghi giao dịch test trong bảng `point_transactions`, 62 bản ghi trong `notifications` và `email_notifications_log`.
  3. Xóa bỏ 2 tài khoản `creator@vibesurvey.com` và `user@vibesurvey.com` khỏi cơ sở dữ liệu. Bảng Sổ Cái Sàn nay tinh khiết 100%, sẵn sàng cho các giao dịch thực tế.


### Ẩn Khối Phân Chia Thưởng Boost Trên Studio (v3.1.3)
- **Yêu cầu**: Ẩn khối hiển thị `Phân chia thưởng Boost (+375đ): 80% điền / 20% sàn | Đáp viên nhận: ... | Sàn thu: ...` trên sidebar Studio Tạo Khảo Sát.
- **Lý do**: Đây là thông số cơ chế biên lợi nhuận / take rate nội bộ của nền tảng, việc hiển thị trực diện trên form tạo khảo sát gây rối rắm và tạo cảm giác tính phí hoa hồng lộ liễu cho Creator.
- **Thực hiện**: Đã ẩn hoàn toàn khối này (`id="boost-split-box" class="hidden"`) khỏi giao diện Studio, giữ logic tính toán ngầm nguyên vẹn không ảnh hưởng đến hệ thống.
