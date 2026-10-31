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
│   ├── repositories/          # Data Access Layer (surveyRepository.js) gom SQL surveys, questions, responses
│   ├── services/              # AntiFraud, Ledger, PricingEngine, FormParser, Webhook, AuditLog services
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
  - Cột Trái (~65% Canvas soạn câu hỏi): Khung cuộn riêng biệt `overflow-y: auto`, đệm lề phải vừa vặn `pr-10 sm:pr-12 lg:pr-12 xl:pr-14` và đệm đáy `pb-8`, loại bỏ thanh ngang thừa thãi phía trên, giữ cho giao diện tối giản chuẩn Google Forms.
  - Floating Action Toolbar tinh gọn: Chiều cao thu gọn ~180px (`p-1.5`, icon 16px `w-4 h-4`), đặt tại `left-[calc(100%+6px)]`, tự động nhận diện theo con trỏ chuột hover mà không bị thò xuống sâu hay cắt ở đáy màn hình, lề phải cân đối không bị trống.
  - Cột Phải (~35% Cài đặt & Ngân sách): Khung cuộn riêng biệt `overflow-y: auto`, cuộn tự do không ảnh hưởng đến vị trí đọc/soạn câu hỏi ở cột trái.
  - Top Action Header cố định ở trên, giữ nút Lưu nháp và Xuất bản luôn trong tầm mắt.
- **Hỗ trợ 12 loại câu hỏi**: Single choice, Multiple choice, Short text, Paragraph, Dropdown, Linear scale, Choice grid (ma trận radio), Checkbox grid (ma trận checkbox), Date, Time, Rating stars, File upload.
- **3 Phân khúc tài khoản Creator**:
  - Sinh Viên (.edu.vn): Giá sàn 400đ - 600đ/mẫu, miễn phí 30 lượt/tháng.
  - Cá Nhân: Giá sàn 800đ - 1.200đ/mẫu, hỗ trợ dùng thử 25 lượt bài đầu.
  - Doanh Nghiệp (Enterprise B2B): Giá sàn 1.500đ - 2.500đ/mẫu, cấp quyền xuất hóa đơn VAT, bảo hành mẫu 1 đổi 1 trong 7 ngày.
- **Thời hạn treo khảo sát trên sàn (Tự do 1 - 90 ngày)**: Ô nhập số ngày tự do đặt ngay cạnh nhãn "Thời Hạn Treo Trên Sàn (Tự Do):", gỡ bỏ các chip chọn cứng gây rối, khảo sát dừng khi đủ mẫu hoặc hết thời hạn, số tiền mẫu chưa thu được hoàn lại 100%.
- **Bảng giá & Tốc độ gom mẫu dự kiến**: 3 nấc tốc độ (Sàn tiết kiệm ~3-5 ngày, Đề xuất ~24-48h, Hỏa tốc ~2-6h) kèm thanh trượt Creator Boost chia 80/20.
- **Đồng bộ biểu mẫu ngoài**: Nhận diện và trích xuất tự động từ Google Forms (hỗ trợ `forms.gle`, link `/edit`, HTML public scraping) và Microsoft Forms (hỗ trợ cả `forms.office.com`, `forms.cloud.microsoft`, SPA API Runtime ngầm `prefetchFormUrl` với AntiForgeryToken). Bóc tách chuẩn xác 100% câu hỏi trắc nghiệm, hộp kiểm, đoạn văn, rating stars, ma trận Likert. Tích hợp song song 2 giải pháp chính thức khi đồng bộ Google Forms bị giới hạn quyền truy cập (Lỗi 401):
  + **Giải pháp 1 (Email Bot Service Account)**: Thêm email bot hệ thống `vibesurvey-forms-sync@vibesurvey-512517.iam.gserviceaccount.com` làm cộng tác viên (Editor) trên Google Forms. Cung cấp nút sao chép email 1-click mượt mà và hướng dẫn 3 bước thao tác trực quan.
  + **Giải pháp 2 (Google OAuth 2.0 1-Click)**: Ủy quyền 1-click bằng tài khoản Google cá nhân của người dùng với phạm vi an toàn `forms.body.readonly`. Không cần nhập mật khẩu hay Cookie cá nhân, hỗ trợ hủy liên kết bất kỳ lúc nào.
  + **Cơ chế bắt lỗi & hiển thị Modal tự động**: Sửa triệt để lỗi nuốt mã trạng thái 401 tại `formParserService.js` và `surveyController.js`. Khi gặp biểu mẫu bị chặn quyền, popup modal lập tức bật lên với 2 giải pháp song song thay vì hiển thị thông báo toast lỗi thô.
  + **Tái thiết kế giao diện & Bố cục Bento Grid thoáng đãng (v3.3.4)**:
    - Nâng cấp modal hệ thống (`showModal`): Mở rộng chiều rộng từ `max-w-lg` (512px) chật chội sang `maxWidth: 'max-w-4xl'` (896px) rộng rãi, đệm lề `p-6 sm:p-8`, bo tròn `rounded-3xl` chuẩn Linear/SaaS.
    - Bố cục 2 cột cân xứng (`grid grid-cols-1 md:grid-cols-2 gap-5`): Đặt 2 giải pháp song song cạnh nhau trên màn hình máy tính/tablet, loại bỏ hoàn toàn cảm giác nhồi nhét chữ theo chiều dọc.
    - Cải tiến giao diện Tab "Google / MS Forms" trong Studio: Tăng kích thước ô nhập URL thoáng đãng, bổ sung thẻ giới thiệu 2 năng lực bóc tách và hỗ trợ form nội bộ.

### B. Phân Hệ Người Điền (Respondent) & Engine Chống Gian Lận (Anti-Fraud)
- **5 Chốt chặn chống gian lận**:
  1. Speed Trap: Bẫy thời gian làm bài tối thiểu, tính riêng câu trắc nghiệm/thang đo/lưới, thời gian đọc tự luận = 0s.
  2. Attention Check Động: Chèn ngẫu nhiên câu kiểm tra chú ý, cơ chế Second-Chance Grace tha thứ 1 lần xác nhận lại.
  3. Straight-lining: Phát hiện chọn thẳng một đường (phương sai sigma^2 = 0) trên >= 5 câu thang đo.
  4. Bộ lọc tự luận rác: Cho phép số 0 và từ ngắn tiếng Việt hợp lệ, chỉ chặn spam lặp phím liên tục.
  5. Điểm uy tín Trust Score (khởi tạo 85.0): Điều chỉnh thưởng/phạt theo hành vi, khấu trừ lũy tiến khi điểm < 80, tạm khóa rút tiền khi < 60, tự động ban khi < 40.
  6. Bảo vệ Wi-Fi trường học: Chỉ khóa tài khoản khi có >= 3 tài khoản trùng dấu vân tay thiết bị (`device_fingerprint`).
- **Màn hình mở đầu (Welcome Screen) & Ảnh bìa biểu mẫu**:
  - Khi người điền bắt đầu một khảo sát, hệ thống hiển thị màn hình mở đầu sang trọng (phong cách Google Forms Hybrid) với đầy đủ Ảnh bìa (`cover_image_url`), Tiêu đề, Mô tả, Thể loại, Bento grid thông số (Phần thưởng điểm/VNĐ, Số lượng câu hỏi, Thời gian dự kiến, Nhịp độ tối thiểu) và Quy tắc bảo đảm chất lượng dữ liệu.
  - Tối ưu hóa kích thước và căn chỉnh ảnh bìa (v3.3.4): Kích thước tinh gọn chuẩn mực Google Forms (`h-32 sm:h-40`), áp dụng cơ chế 2 lớp (lớp nền mờ ambient blur chống hở viền + lớp ảnh chính `object-contain object-center` sắc nét không bị lệch, méo hay cắt xén chủ thể người/chữ).
  - Nút "Bắt Đầu Làm Khảo Sát": Kích hoạt bộ đếm thời gian và chuyển sang Stepper tập trung từng câu hỏi.
  - Bảo toàn tính liên tục: Nếu người dùng đang làm dở từ câu 1 trở đi hoặc ở chế độ chỉnh sửa phản hồi (`isEditing`), hệ thống đưa thẳng vào câu đang làm, không bắt xem lại màn hình mở đầu.
  - Phân vùng hiển thị chuẩn xác: Chỉ hiển thị ảnh bìa khi người dùng click vào bài test (Màn hình mở đầu bài làm Welcome Screen, Modal xem trước, và Màn hình xem lại); hoàn toàn ẩn ảnh bìa trên thẻ danh sách ngoài trang chủ (`renderCompactSurveyCard`) để giữ bố cục Bento phẳng, đều hàng và tối giản.
  - Backend `createSurvey`, `listSurveys` và `getSurvey` lưu trữ và truy xuất đầy đủ trường `cover_image_url`.
- **Trình làm bài Phân đoạn Đa câu hỏi (Section-based Multi-question Runner chuẩn Google Forms & Microsoft Forms - v3.3.5)**:
  - **Mô hình Phân đoạn Đa câu hỏi**: Gom nhóm danh sách câu hỏi thành các Section độc lập qua `buildSurveySections(questions, surveyMeta)`. Mỗi khối `SECTION_HEADER` đóng vai trò là một Điểm Ngắt Phần (Page Break), không phải câu hỏi để trả lời.
  - **Hiển thị đồng thời toàn bộ câu hỏi trong Section**: Tất cả câu hỏi nằm giữa 2 `SECTION_HEADER` (hoặc từ đầu bài đến `SECTION_HEADER` đầu tiên) thuộc về cùng một Section Page và được hiển thị đồng thời trên cùng một trang làm bài.
  - **Thẻ Section Header Card**: Hiển thị dải Accent Cam Vibe (`#EA580C`, chiều cao `h-2.5`), huy hiệu chỉ số mục `Mục X trên Y`, tiêu đề Section, mô tả chi tiết và ghi chú `* Biểu thị câu hỏi bắt buộc`.
  - **Đánh số câu hỏi & Xác thực nội dòng**: Đánh số thứ tự liên tục toàn bài (1., 2., 3....), hiển thị placeholder mờ lấy từ `RestrictionEngine.getMeta`, gắn sự kiện kiểm tra realtime `handleSurveyInputRealtime`, và thẻ cảnh báo lỗi nội dòng `#val-err-{id}` dưới từng câu hỏi.
  - **Xác thực toàn diện trước khi chuyển phần (`validateCurrentSection`)**: Duyệt qua toàn bộ câu hỏi trong Section, kiểm tra bắt buộc và ràng buộc định dạng (Email, Số trong khoảng, v.v.). Nếu có lỗi, tự động cuộn mượt (smooth scroll) đến câu hỏi lỗi đầu tiên, focus ô nhập và báo toast.
  - **Điều hướng Rẽ nhánh 2 Tầng (2-Tier Routing - `nextSection` & `prevSection`)**:
    + Cấp 1 (Option-level): Ưu tiên rẽ nhánh theo lựa chọn trắc nghiệm/dropdown của câu hỏi trong Section (`logic.options`).
    + Cấp 2 (Section default): Rẽ nhánh theo thiết lập mặc định của Section (`curSec.defaultAction`).
    + Mặc định: Chuyển sang Section kế tiếp, hoặc nộp bài (`submitSurvey`) khi ở Section cuối cùng.
    + Nút 'Quay lại' (`prevSection`) tự động khôi phục Section trước đó từ lịch sử `session.sectionHistory`. Phím tắt Enter hỗ trợ chuyển Section nhanh.

### C. Phân Hệ Quản Trị Hệ Thống (Admin Overview & Console)
- **Dashboard Tổng quan 2 cột cân xứng (Split Grid 12 Cột)**: Cột trái chứa Sổ cái giao dịch gần nhất; Cột phải chứa Fast Command Console; đáy 2 cột ngang bằng nhau 100%.
- **Chỉ số Real-time Analytics & Retention thực tế**:
  - `activeUsersNow`: Số người dùng tương tác trong 15 phút qua (tính qua cột `last_active_at`).
  - `fillingFormsNow`: Số người đang điền form dở (responses status `IN_PROGRESS`).
  - `firstTimeRetentionRate` & `repeatRetentionRate`: Tính từ lịch sử đăng nhập thiết bị `device_ip_logs`.
  - Toàn bộ chỉ số lấy thực tế 100% từ CSDL SQLite, loại bỏ hoàn toàn số demo giả định.
- **Admin Fast Command Console**: Hỗ trợ 16 lệnh quản trị nhanh (`/naptien`, `/congdiem`, `/resetpoint`, `/ban`, `/unban`, `/settier`, phím tắt F2).
- **Tối ưu Mobile Navigation & Phân Tách Đặc Quyền Doanh Nghiệp (v3.3.3)**:
  - **Doanh Nghiệp không sử dụng điểm & không đổi voucher**:
    + Bỏ hoàn toàn tab `Chợ Voucher` khỏi Doanh Nghiệp (chặn và vô hiệu hóa nút đổi voucher, hiển thị banner thông báo quy chế).
    + Xóa bỏ hiển thị "Số dư điểm", "Quy đổi VNĐ" và "Chuỗi điểm danh" trong Dropdown tài khoản; Doanh Nghiệp chỉ quản lý Credit tạo form và Vé VIP hỏa tốc.
    + Không hỗ trợ điểm danh cho Doanh Nghiệp: Ẩn widget ngọn lửa trên Header, ẩn thẻ Daily Streak Card trên Dashboard, chặn hành động điểm danh.
    + Trang Ví Doanh Nghiệp (`Ví & Quỹ Doanh Nghiệp`): Ẩn Card điểm thưởng đổi thẻ cào 10K và bảng yêu cầu rút tiền; mở rộng Card Credit tạo form và nạp quỹ VietQR full width.
  - **Tối ưu thanh Mobile Bottom Dock**:
    + Người Điền: 5 tabs, nút `Tạo Khảo Sát` ở chính giữa (vị trí số 3) làm nút tròn cam nổi bật (`w-11 h-11`), cân đối hoàn hảo (2 nút trái, 2 nút phải).
    + Doanh Nghiệp: 4 tabs chuyên biệt (`Khám Phá`, `Tạo Khảo Sát`, `Khảo Sát Của Tôi`, `Ví & Nạp Quỹ`) chia đều 25% phẳng, đối xứng hoàn hảo 100%, không bị lệch sang phải.
    + Toàn bộ thanh dock ẩn chữ, chỉ giữ icon to rõ nét `w-5 h-5` trong khung tròn `w-10 h-10` thanh lịch.
  - **Khắc phục lỗi menu tài khoản bị cắt phần đáy**: Thêm `max-h-[calc(100vh-80px)] overflow-y-auto overscroll-contain` và `max-w-[calc(100vw-20px)]` vào `#user-profile-dropdown`, thiết kế lại khối số dư Bento 2 cột tinh gọn giúp menu hiển thị trọn vẹn và cuộn mượt mà trên mọi loại màn hình laptop thấp hoặc điện thoại.
- **Thống nhất định danh & Khắc phục lỗi thông báo kép**:
  - Thống nhất 100% thuật ngữ tiếng Việt hiển thị trên UI: dùng `Doanh Nghiệp` thay cho `Creator` (`(Doanh Nghiệp Boost)`, `Sổ cái nạp Doanh Nghiệp`, Quy chuẩn minh bạch Doanh nghiệp).
  - Khắc phục triệt để lỗi nhảy 2 thông báo toast cùng lúc khi chuyển góc nhìn sang Doanh Nghiệp bằng cờ `silent: true` trong `switchAdminTier`.

### D. Phân Hệ Gamification Giữ Chân & Điểm Danh Chuỗi Ngày (Daily Streaks Engine - v3.3.0)
- **Bảng CSDL `daily_streaks`**: Lưu trữ `id`, `user_id` (UNIQUE), `current_streak`, `max_streak`, `last_checkin_date`, `total_points_earned`, `updated_at`.
- **Thang thưởng chuỗi ngày tăng dần**:
  - Ngày 1: +50 Point
  - Ngày 2: +80 Point
  - Ngày 3: +120 Point
  - Ngày 4: +160 Point
  - Ngày 5: +200 Point
  - Ngày 6: +250 Point
  - Ngày 7 (Mốc Vàng): +500 Point + Mở khóa Badge Tích Cực
  - Từ Ngày 8 trở đi: Duy trì +200 Point/ngày. Nếu ngắt quãng 1 ngày không điểm danh, chuỗi quay về Ngày 1.
- **API Backend**:
  - `GET /api/v1/users/streak-info`: Cung cấp thông tin chuỗi ngày hiện tại, trạng thái điểm danh hôm nay, phần thưởng hôm nay và lộ trình 7 ngày tới.
  - `POST /api/v1/users/checkin`: Thực hiện điểm danh trong ngày theo múi giờ Việt Nam (UTC+7), chống điểm danh trùng lặp, cộng điểm vào ví qua `ledgerService.rewardDailyStreak` với ghi nhận sổ cái kép `point_transactions`, cập nhật `daily_streaks`, gửi thông báo vào bảng `notifications`.
- **Giao diện Frontend**:
  - Widget Streak trên Header (cạnh chuông thông báo/profile, icon ngọn lửa tối giản, text chuỗi ngày, viền cam nổi bật khi chưa điểm danh, click mở modal).
  - Daily Streak Card tại đầu Dashboard Khảo sát (ngay dưới Welcome Banner) với trạng thái và nút điểm danh nhanh.
  - Modal Điểm danh Chuỗi Ngày với sơ đồ 7 ngày trực quan, ngày đã nhận có dấu tích, ngày hôm nay nổi bật, nút điểm danh và bảng quy chế chi tiết.
  - Cập nhật số dư điểm tức thời ngay khi hoàn thành điểm danh, không cần tải lại trang.
  - Tuyệt đối không dùng bất kỳ emoji nào, tuân thủ phong cách Minimalist Modern của `DESIGN.md`.

### G. Phân Hệ Đồ Họa 3D Độc Bản Tự Tạo 100% & Khắc Phục Triệt Để Chữ Bóng Ma (v4.7.5)
- **Tự Tạo Đồ Họa 3D Render Độc Bản 100% Thay Thế Hoàn Toàn Ảnh Cắt Mẫu (Pure Independent 3D Rendering)**:
  - Chấm dứt hoàn toàn phương pháp trích xuất từ ảnh chụp màn hình mẫu (nguyên nhân gây ra hiện tượng chữ bóng ma "1%", "Tất cả (0)", "0,5%", "Nạp Credit" in đè lên giao diện thật).
  - Tự tạo mới 100% qua pipeline sinh đồ họa 3D Claymorphism kết hợp thuật toán xử lý độ trong suốt kênh Alpha tự động (tách nền trắng sang trong suốt, cắt bỏ vùng đệm thừa):
    + `wallet_3d_master.png` (719x855): Chiếc ví da 3D màu cam bóng bẩy với quai xách cong, cúc cài ngôi sao vàng dập nổi 3D đa diện và đổ bóng sàn mềm mại. Độ phân giải cao, sắc nét tuyệt đối, 0% chữ rác.
    + `coins_coupon_3d_master.png` (845x733): Chồng 3 đồng xu vàng kim loại 3D và vé coupon phần trăm (%) cam nghiêng sắc sảo, nền trong suốt hoàn toàn, 0% chữ rác.
    + `empty_state_3d_master.png` (1024x1024): Bảng kẹp tài liệu 3D cam sunset viền trắng, kẹp kim loại, kính lúp 3D bóng loáng nghiêng 45 độ, các cụm đám mây kem bồng bềnh và tia sáng cam tỏa ra. Nét căng trên mọi độ phân giải màn hình.
    + `gift_box_3d_master.png` (1024x1024): Hộp quà 3D cam pastel với ruy băng trắng kem mềm mại ở góc dưới các thẻ "Số dư tích lũy" và "Chuỗi điểm danh", không che lấp chữ hay hàng nút T1 đến T7.
- **Sửa Triệt Để Lỗi Các Nút Toggle Bị Lưng Chừng (Studio & Khảo Sát)**:
  - Khắc phục lỗi nút tròn màu trắng chỉ dịch chuyển lưng chừng ở giữa trên các công tắc "Bắt buộc" và "Yêu cầu trong mỗi hàng" tại Studio Tạo khảo sát:
    * Khung switch nâng cấp lên chuẩn `w-9 h-5` (36px x 20px).
    * Nút tròn màu trắng `w-4 h-4` (16px x 16px) đặt tại tọa độ `top-[2px] left-[2px]`.
    * Khi bật (checked): `peer-checked:after:translate-x-4` (dịch chuyển đúng 16px sang phải), đưa nút tròn áp sát mép phải đúng 2px, cân xứng hoàn hảo 100%, không còn bị kẹt lơ lửng ở giữa.
- **Kiểm Chuẩn & Bảo Toàn Hệ Thống**:
  - Cú pháp `node -c public/app.js` đạt mã 0 (PASS 100%).
  - Toàn bộ 15 tầng kiểm thử tự hành (`npm test`) đạt 15/15 Suites PASS (100.0%, 23.39 giây).
  - Đồng bộ Capacitor Android (`npm run sync:android`) thành công.
  - Tăng cache-buster lên `4.7.5_1793470000` trong `public/index.html`.
  - Bảo toàn `survey-platform.code-workspace`.

### H. Phân Hệ Khảo Sát Đề Xuất (Surveys View Bento Redesign - v4.7.0)
- **Biểu đồ Đường Trực Quan Xu Hướng Sàn (Interactive SVG Trends Chart)**:
  - Tự xây dựng thuần túy bằng SVG và JavaScript nội bộ (không sử dụng bất kỳ thư viện ngoài nào như Chart.js hay Recharts), đáp ứng 100% phong cách Minimalist Modern Bento Grid.
  - Tuyến API Backend: `GET /api/v1/admin/analytics/trends?days=7|14|30`.
  - Dữ liệu thực tế tổng hợp theo từng ngày: Dòng tiền nạp thực tế (`deposit_orders` trạng thái COMPLETED), Dòng tiền rút thưởng (`payout_requests` trạng thái COMPLETED hoặc APPROVED), và Số lượt phản hồi khảo sát được duyệt (`responses` trạng thái VALIDATED).
  - Tọa độ SVG động `viewBox="0 0 800 240"`: Tự động co giãn theo chiều ngang mọi thiết bị (Responsive), kết hợp lưới tọa độ ngang tinh tế, vùng diện tích chuyển sắc `linearGradient` từ độ mờ 0.35 về 0.02, và đường cong viền mảnh màu cam `#EA580C`.
  - Tương tác trực quan: Hover trên các mốc ngày hiển thị điểm neo co giãn và Tooltip nổi định dạng chuẩn tiếng Việt và tiền tệ VNĐ. Bộ chuyển đổi chu kỳ 7 ngày / 14 ngày tức thời.
- **Phân Hệ Nhật Ký Kiểm Toán Quản Trị (Admin Audit Logs SSOT)**:
  - Bổ sung tab thứ 5 trong SubNav Admin: `[Kiểm Toán]` (`admin-audit-logs`).
  - CSDL lưu trữ: Bảng `admin_audit_logs` gồm các cột `id`, `admin_id`, `admin_name`, `action`, `target_type`, `target_id`, `details`, `ip_address`, `created_at` kèm 4 chỉ mục tra cứu tối ưu.
  - Tuyến API Backend: `GET /api/v1/admin/audit-logs` hỗ trợ lọc theo hành động, loại đối tượng, ID quản trị viên, tìm kiếm tự do và phân trang chuẩn.
  - Tích hợp ghi log tự động toàn bộ hành động nhạy cảm: Duyệt/từ chối rút tiền, khóa/mở khóa người dùng và địa chỉ IP, nạp/điều chỉnh số dư, cập nhật trạng thái lỗi, và toàn bộ 16 lệnh trong Fast Command Console.
  - Giao diện tra cứu Bento Grid: Thẻ bảng sạch sẽ, nhãn trạng thái tối giản, hỗ trợ bộ lọc Custom Dropdown cho Hành động và Loại đối tượng, nút xem chi tiết payload JSON trong modal.
- **Chế Độ Màn Hình Toàn Cảnh Trình Chiếu (Executive TV / Fullscreen Presentation Mode)**:
  - Tích hợp chuẩn Web Fullscreen API, ẩn hoàn toàn thanh điều hướng Header, SubNav và các thành phần thừa, đưa Dashboard về trạng thái toàn màn hình chuyên nghiệp cho màn hình lớn hoặc phòng họp.
  - Cơ chế tự động làm mới thời gian thực (Auto-refresh Timer 20s): Đồng hồ đếm ngược trực quan góc trên bên phải, tự động truy vấn lại các thẻ KPI và biểu đồ SVG mỗi 20 giây mà không làm giật màn hình.
  - Phím tắt điều khiển thuận tiện: Bấm `F11` để bật/tắt chế độ toàn cảnh, bấm `Escape` để thoát nhanh.

### E. Bộ Phân Tích Cú Pháp Dán Văn Bản Thông Minh (Smart Text Parser Engine - v3.3.4)
- **Giải quyết triệt để lỗi biến toàn bộ câu hỏi thành tự luận (SHORT_TEXT)**:
  - Bóc tách tự động tiêu đề form ở dòng đầu tiên (`Biểu mẫu chưa đặt tiêu đề`, `Khảo sát...`) và tự điền vào ô tiêu đề khảo sát nếu chưa được đặt tên.
  - Nhận diện phân đoạn `SECTION_HEADER`: Tự động nhận diện các dòng `Mục 1`, `Phần 1: Thông tin chung`, `Section 1: ...` và phân tách thành khối phân đoạn chuyển trang chuẩn.
  - Bóc tách nhãn phân loại dính liền đặc thù của Microsoft Forms và Google Forms:
    + `Nhiều lựa chọn.` -> `MULTIPLE_CHOICE` (Hộp kiểm nhiều đáp án).
    + `Net Promoter Score.` -> `LINEAR_SCALE` (Thang điểm NPS chuẩn, gán nhãn `min_label: Hoàn toàn không có khả năng`, `max_label: Rất có khả năng`).
    + `Văn bản Nhiều Dòng.` -> `PARAGRAPH` (Đoạn văn tự luận dài), tự động lọc bỏ placeholder `Nhập câu trả lời của bạn`.
    + `Xếp loại.` -> `RATING_STARS` (Đánh giá sao 1-5).
    + `Ngày.` -> `DATE_INPUT` (Bộ chọn ngày), tự động lọc bỏ placeholder `Vui lòng nhập ngày (dd/MM/yyyy)`.
    + `Xếp thứ tự.` -> `SINGLE_CHOICE` (Giữ nguyên danh sách các tùy chọn thứ tự).
    + `Likert.` -> `CHOICE_GRID` (Lưới ma trận trắc nghiệm), tự động phân tách các cột thang đo (`Tùy chọn 1..5`) và các hàng nhận định (`Câu trình bày 1..2`).
  - Hỗ trợ toàn bộ các dòng tùy chọn không có bullet hay ký tự gạch đầu dòng (ví dụ `Tùy chọn 1`, `Tùy chọn 2`, `Nam`, `Nữ`...), không còn bị hiểu nhầm là nội dung câu hỏi nối dài.
  - Đồng bộ hoàn hảo giữa mã nguồn Web SPA (`public/app.js`) và Android Capacitor Native (`android/app/src/main/assets/public/app.js`).

### F. Giao Diện Di Động & Hệ Thống Nhận Diện Thương Hiệu (Mobile Nav & Brand Identity)
- **Biểu tượng Gestalt Ảo Ảnh Quang Học Kép (Kính Lúp <-> Chú Chó)**:
  - Tối giản hóa tối đa, tập trung vào hiện tượng tri giác đa ổn định (Bistable Illusion) giữa Kính Lúp và Chú Chó:
    + Góc nhìn A (Kính lúp): Vành tròn quang học dày 7px (bán kính ngoài 26, trong 19) kèm cán cầm capsule vát chéo 45 độ, khớp nối đai ren cam vuông góc, mặt kính gradient có vệt phản quang lưỡi liềm và điểm hội tụ ánh sáng.
    + Góc nhìn B (Chú chó): Vành tròn hóa thành đầu cún tròn trịa; cán kính vát chéo thành chiếc tai cúp rủ dài (đặc trưng Beagle/Labrador); đai kim loại thành nếp gấp sụn tai; ngàm viền thành chiếc mõm nhô ra với chiếc mũi cún bo tròn màu cam `#EA580C`/`#F97316`; điểm hội tụ thành mắt cún tinh anh to tròn có điểm bắt sáng (catchlight); khóe khúc xạ thành nụ cười cún thân thiện.
  - Ba tệp vector tối ưu hóa cực nhẹ (~2.5KB - 3.3KB):
    + `public/logo-light.svg`: Nền Squircle trắng `#FFFFFF` viền `#E4E4E7`, nét đen `#09090B`, điểm nhấn cam `#EA580C`.
    + `public/logo-dark.svg`: Nền Squircle than Obsidian `#18181B` viền `#2E2E36`, nét trắng bạc `#FFFFFF`, điểm nhấn cam `#F97316`.
    + `public/logo.svg`: Tệp fallback tự thích ứng theo biến CSS và `@media (prefers-color-scheme: dark)`.
  - Cơ chế hoán đổi 0ms theo theme trên Header, Footer (`index.html`) và Modal Đăng Nhập (`app.js`).
- **Thanh Điều Hướng Di Động Nổi (Mobile Floating Dock Nav)**:
  - Cấu trúc đối xứng hoàn hảo 2 - 1 - 2 với 5 tabs chia đều 20% mỗi tab: `[Quản Trị] [Khảo Sát] --- [ + Tạo Khảo Sát (FAB) ] --- [Khảo Sát Của Tôi] [Ví & Quỹ Sàn]`.
  - Nút Tạo Khảo Sát FAB tròn cam nằm chính giữa tuyệt đối (Tâm 50%, độ lệch trục đối xứng đo đạc bằng Chrome CDP đạt 0.0000px trên iPhone SE và 0.0156px trên Pixel 7).

### G. Dọn Dẹp Lưu Trữ, Tệp Rác & Kiểm Toán Hệ Thống
- **Dọn dẹp tệp rác & giải phóng dung lượng**: Đã xóa sạch 95 tệp cùng 4 thư mục rác (`backup_ui_pre_hallmark/`, `archive/`, `scratch/`, `.hallmark/`, 10 ảnh upload demo cũ trong `uploads/`, các tệp `.bak`, `.db-wal`, `.db-shm`), giải phóng tổng cộng **129.43 MB** đĩa trống.
- **Bảo toàn dữ liệu người dùng**: Tệp `"Danh Sách Email Sinh Viên.docx"` được bảo vệ nguyên vẹn 100%.
- **Dọn dẹp CSDL sạch sẽ 100%**: Đã xóa sạch toàn bộ khảo sát test, phản hồi test, giao dịch rác, chỉ giữ lại 3 tài khoản Admin cốt lõi (`trungdzid3@gmail.com`, `linharmykxbnvn@gmail.com`, `admin@vibesurvey.com`) với số dư 0đ/0 điểm, 150 voucher catalog mẫu khả dụng.
- **Kiểm định chất lượng**: 15/15 tầng kiểm thử tự hành (`npm run test:all`) đạt 100% PASS, kiểm định hiển thị qua Edge CDP đạt 100% PASS ở cả 2 theme.

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


### Cơ Chế Chuyển Đổi Thích Ứng Theo Dữ Liệu Thực Tế (Data-Driven Adaptive SLA Engine) (v3.1.7)
- **Yêu cầu & Đóng góp từ người dùng**:
  - Khi chưa đủ dữ liệu thực tế: Tuyệt đối không bịa số ngày/giờ cụ thể, giữ cơ chế hiển thị mức độ ưu tiên phân phối & lực hút thù lao minh bạch.
  - Khi đã tích lũy đủ dữ liệu thực tế từ cộng đồng: Tự động chuyển đổi sang hiển thị con số thời gian dự kiến được tính toán từ dữ liệu thống kê lịch sử thật.
- **Giải pháp triển khai**:
  1. **Backend Velocity Benchmark Endpoint (`GET /api/v1/surveys/velocity-benchmark`)**:
     - Kiểm tra trực tiếp trong CSDL số lượng bài khảo sát đã hoàn thành thu thập mẫu:
       * Ngưỡng tối thiểu (Threshold): 30 bài khảo sát hoàn thành thật.
       * Nếu `< 30` bài: `has_sufficient_data = false`, trả về số lượng hiện tại (`0/30`).
       * Nếu $\ge 30$ bài: `has_sufficient_data = true`, tự động tính toán thời gian hoàn thành thực tế trung vị (P50) và phân phối tốc độ theo từng nấc giá và độ dài câu hỏi từ bảng `responses` và `surveys`.
  2. **Frontend Adaptive UI Rendering (`public/app.js`)**:
     - `fetchVelocityBenchmark()` nạp trạng thái dữ liệu từ API.
     - **Chế độ 1 (Hiện tại - Thiếu data)**:
       * Nấc 1: `Phân phối: Hàng chờ tiêu chuẩn`
       * Nấc 2: `Phân phối: Ưu tiên hiển thị nổi bật (+25%)`
       * Nấc 3: `Phân phối: Gắn nhãn [Thưởng Cao] (+60%)`
       * Ghi chú minh bạch: `* Minh bạch vận hành: Hệ thống đang tích lũy dữ liệu thực tế (0/30 bài hoàn thành). Khi có đủ dữ liệu, thời gian dự báo thực tế sẽ tự động được kích hoạt.`
     - **Chế độ 2 (Tự động kích hoạt khi $\ge 30$ bài)**:
       * Tự động chuyển sang hiển thị: `Dự kiến thực tế: ~X – Y giờ/ngày (Dựa trên N bài thực tế)`.
  3. Cập nhật cache buster mới nhất trong `public/index.html`: `v=1793124053408`.


### Tích Hợp Tooltip Dấu ? Giải Thích Cơ Chế Tiền Thêm (v3.1.4)
- **Tính năng**: Bổ sung icon dấu hỏi tròn `?` cạnh tiêu đề "Tăng Thưởng Tự Do (Creator Boost)" trong sidebar Studio Tạo Khảo Sát.
- **Nội dung giải thích**:
  1. 80% ngân sách tăng thêm: Chuyển đổi trực tiếp thành Điểm thưởng thực nhận cho đáp viên, tạo lực hút thù lao vượt trội để người điền ưu tiên làm bài trước.
  2. 20% còn lại: Phí vận hành hạ tầng tăng tốc của sàn (kích hoạt luồng thông báo ưu tiên và kiểm duyệt dữ liệu hỏa tốc).
- **Trải nghiệm**: Tooltip hiển thị khi rê chuột (hover), giao diện tối giản, phong cách Linear/SaaS hiện đại, hoàn toàn không chiếm diện tích cố định của trang.


### Bộ Điều Khoản Dịch Vụ & Quy Tắc Nền Tảng Bắt Buộc Tích Chọn Khi Đăng Ký (v3.2.0)
- **Mục tiêu**: Soạn thảo bộ điều khoản dịch vụ và quy tắc hoạt động nền tảng VibeSurvey chính thức, đồng thời tích hợp ô checkbox bắt buộc người dùng phải đọc và tích chọn đồng ý mới được đăng ký tài khoản.
- **Giải pháp triển khai toàn diện**:
  1. **Văn bản pháp lý & Quy tắc chuẩn mực (`DIEU_KHOAN_VA_QUY_TAC_NEN_TANG.md`)**:
     - Chương I: Nguyên tắc 1 cá nhân - 1 tài khoản chính chủ, định giá 1:1 VNĐ (`1 Point = 1 VNĐ`, `1 Credit = 1 VNĐ`).
     - Chương II: Tiêu chuẩn người trả lời (Respondent) và 5 chốt chặn chống gian lận (Speed Trap, Attention Check, Straight-lining, lọc rác tự luận, Trust Score khởi tạo 85.0, cấm bot/multi-account).
     - Chương III: Tiêu chuẩn người tạo khảo sát (Creator), Ký quỹ Escrow an toàn, hoàn tiền 100% khi đóng sớm, cấm nội dung độc hại/lừa đảo/nhạy cảm, bảo hành mẫu Doanh nghiệp 1 đổi 1 trong 7 ngày.
     - Chương IV: Chính sách đổi thẻ cào từ 10.000đ (miễn phí), rút ngân hàng/MoMo từ 50.000đ, nạp Creator từ 20.000đ.
     - Chương V: Bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP, ẩn danh hóa 100% dữ liệu khảo sát.
     - Chương VI: Sổ cái Double-entry Ledger và Audit Log làm căn cứ tối cao xử lý tranh chấp.
  2. **Giao diện & Kiểm soát tương tác (`public/app.js` & `public/index.html`)**:
     - Checkbox `#auth-reg-terms` được tích hợp ngay trên nút "Tạo Tài Khoản & Bắt Đầu".
     - Modal chuyên biệt `#terms-modal` (layer z-[70]) cho phép người dùng click xem toàn văn bộ điều khoản mọi lúc mà không làm mất dữ liệu đã điền trong form đăng ký.
     - Nút "Tôi Đồng Ý Điều Khoản" trong modal tự động tích chọn checkbox và hiển thị toast xác nhận.
     - Client validation chặn đứng hành vi submit khi chưa tích checkbox: rung cảnh báo, đổi viền đỏ và hiển thị thông báo lỗi rõ ràng.
     - Kết nối toàn bộ các liên kết Điều khoản / Quyền riêng tư ở Footer trang chủ vào modal điều khoản.


### Căn Chỉnh Vị Trí Dấu ? Tiền Thêm & Gỡ Bỏ Thanh Cuộn Ngang Studio (v3.1.5)
- **Vấn đề đã xử lý**:
  1. Vị trí dấu `?` trước đó bị ngắt dòng và nằm lơ lửng bên phải cạnh số tiền thay vì nằm cạnh chữ `Boost)`.
  2. Màu sắc popover trước đó dùng `bg-stone-900` (đen kịt) gây lệch tông nghiêm trọng trong giao diện Light Mode, và bị căn lề lệch tràn ra mép ngoài màn hình.
  3. Xuất hiện thanh cuộn ngang (`horizontal scrollbar`) thừa thãi và vô dụng dưới đáy canvas soạn thảo câu hỏi.
- **Giải pháp dứt điểm**:
  1. Bọc cụm `(Creator Boost)` và nút `?` trong cùng một thẻ inline `whitespace-nowrap`, bảo đảm dấu `?` luôn gắn liền ngay sau dấu đóng ngoặc `Boost)`.
  2. Tái cấu trúc popover theo chuẩn DESIGN.md: nền trắng sáng ở Light Mode (`bg-white`), nền xám than ở Dark Mode (`dark:bg-[#18181B]`), viền `border-stone-200 dark:border-stone-800`, bóng đổ mờ `shadow-xl`, căn lề thông minh vào trong để không bao giờ bị tràn mép màn hình.
  3. Bổ sung `overflow-x-hidden !important;` cho container `#studio-canvas-scroll` và grid wrapper, loại bỏ vĩnh viễn thanh cuộn ngang thừa thãi.


### Khắc Phục Triệt Để Căn Lề Popover Giải Thích Tiền Thêm (v3.1.6)
- **Vấn đề đã xử lý**: Popover trước đó bị lệch sang bên trái, bị mép trái của card Studio cắt mất chữ.
- **Giải pháp dứt điểm**:
  1. Neo popover trực tiếp vào khung container cha của Creator Boost với `position: absolute; left: 0; right: 0; bottom: calc(100% + 8px);`.
  2. Popover nay tự động co giãn vừa khít 100% chiều ngang của card Studio, mép trái và mép phải căn đều tăm tắp, loại bỏ triệt để hiện tượng bị xén chữ hoặc tràn màn hình.
  3. Bổ sung hỗ trợ tương tác đa kênh: Rê chuột (hover) để xem nhanh, click để giữ mở/đóng, và nút đóng (X) tiện lợi.


### Khắc Phục Lỗi Dọn Dẹp Data Test: no such column: survey_id (v3.1.7)
- **Nguyên nhân cốt lõi**:
  - Bảng `voucher_campaigns` trong SQLite có cấu trúc cột: `id, issuer_id, voucher_type, brand_name, brand_logo, title, face_value_vnd, points_cost, total_quantity, remaining_quantity, expiry_date, instructions, created_at, website_domain`.
  - Bảng này KHÔNG có cột `survey_id` (mà liên kết tới khảo sát thông qua cột `surveys.sponsor_campaign_id`).
  - Trong `tests/test_cleanup_helper.js`, câu lệnh cũ thực thi `DELETE FROM voucher_campaigns WHERE survey_id IN (...)` dẫn tới lỗi SQLite: `no such column: survey_id`, khiến lệnh `/cleantest` trên Admin Console và nút dọn dẹp bị ném exception HTTP 500.
- **Giải pháp dứt điểm**:
  1. Điều chỉnh câu lệnh xóa `voucher_campaigns` của survey test thành: `DELETE FROM voucher_campaigns WHERE id IN (SELECT sponsor_campaign_id FROM surveys WHERE id IN (...) AND sponsor_campaign_id IS NOT NULL)`.
  2. Thêm câu lệnh dọn dẹp campaign do user test phát hành: `DELETE FROM voucher_campaigns WHERE issuer_id IN (...)`.
  3. Xây dựng hàm bọc `safeRun` bao bọc từng thao tác xóa bảng trong `try...catch` an toàn, ngăn chặn hoàn toàn việc một lỗi bảng đơn lẻ làm sập toàn bộ chu trình thanh lọc CSDL.
  4. Khởi động lại server backend Node.js để nạp bản vá; kiểm thử xác nhận dọn dẹp thành công 100% không còn bất kỳ lỗi nào.


### Cơ Chế Thông Báo Đẩy Thời Gian Thực & Android Hybrid (Push Notification Engine - v3.1.8)
- **Nhiệm vụ hoàn thành**:
  1. **Bảng CSDL `push_subscriptions` (`server/db/database.js`)**:
     - Cấu trúc: `id`, `user_id`, `endpoint` TEXT UNIQUE NOT NULL, `keys_p256dh`, `keys_auth`, `device_type` (WEB/ANDROID/IOS), `created_at`, `last_active_at`.
     - Chỉ mục `idx_push_subs_user` và `idx_push_subs_endpoint` tối ưu tra cứu siêu tốc.
  2. **Dịch vụ thông báo `pushNotificationService.js` (`server/services/pushNotificationService.js`)**:
     - `saveSubscription(userId, data)`: Hỗ trợ lưu trữ đăng ký Web Push và thiết bị di động, tự động xác thực khóa ngoại `user_id` và cập nhật khi thiết bị tái kích hoạt.
     - `removeSubscription(endpoint, userId)`: Hủy đăng ký nhanh gọn, an toàn.
     - `isHighRewardSurvey(survey)`: Nhận diện khảo sát gói Hỏa Tốc (`package_type`/`pricing_tier` là `RUSH` hoặc `FAST_TRACK`), có Creator Boost >= 25%, gắn nhãn `[HỎA TỐC]`, `[Thưởng Cao]`, hoặc điểm thưởng >= 250 điểm.
     - `sendHighRewardSurveyAlert(survey)`: Bắn thông báo đẩy thời gian thực, đồng thời ghi bản ghi đồng bộ vào bảng `notifications` và `email_notifications_log` trong một Transaction ACID duy nhất.
     - Lưu trữ buffer tin phát sóng `recentBroadcasts` phục vụ polling realtime trên SPA.
  3. **Tích hợp Controller & API (`server/controllers/surveyController.js` & `server/routes/api.js`)**:
     - Kết nối vào `publishSurvey`: Khi xuất bản khảo sát (Voucher hoặc Ký quỹ Escrow) có Boost hoặc Hỏa Tốc, tự động gọi `pushNotificationService.sendHighRewardSurveyAlert(activeSurvey)`.
     - Kết nối vào `boostFastTrack`: Kích hoạt phát sóng realtime cho thiết bị và ứng dụng.
     - Các endpoints API: `POST /api/v1/notifications/subscribe-push`, `POST /api/v1/notifications/unsubscribe-push`, `GET /api/v1/notifications/unread-count`, `PUT /api/v1/notifications/read-all`, `GET /api/v1/notifications/realtime-alerts`.
  4. **Giao diện SPA & Android Capacitor (`public/app.js`, `public/index.html`, `public/styles.css`)**:
     - Banner xin cấp quyền Web Notification thanh lịch, tinh tế: "Bật thông báo để nhận tin ngay khi có khảo sát thưởng cao hoặc hỏa tốc" kèm nút "Bật Thông Báo" và "Để Sau".
     - Nút chuông thông báo trên Header kèm badge đếm số lượng chưa đọc và animation rung chuông (`animate-bell-ring` và haptic vibration).
     - Dropdown xem danh sách thông báo chi tiết, bấm vào làm khảo sát ngay, nút "Đã đọc tất cả".
     - Popup nổi góc màn hình (Floating Banner) khi có khảo sát Hỏa Tốc / Thưởng Cao mới đến, tự động đóng sau 12 giây.
     - Tương thích Android Capacitor: Cấu hình plugin `LocalNotifications` trong `capacitor.config.json` và code hook `window.Capacitor.Plugins.LocalNotifications`.
     - Tuyệt đối tuân thủ quy chuẩn không dùng bất kỳ emoji nào trong mã nguồn và giao diện.
     - Bộ kiểm thử `tests/test_push_notifications.js` (Tầng 15) đạt 100% PASS (7/7 bài test).


### Tính Năng Đính Kèm Voucher Riêng & Mua Thêm Voucher Sàn Trong Studio Tạo Khảo Sát (v3.2.0)
- **Nhiệm vụ hoàn thành**:
  1. **Giao diện Sidebar Studio Tạo Khảo Sát (`public/app.js`)**:
     - Bổ sung **Card 3: Quà Tặng & Voucher Kèm Theo** ngay tại Tab Ngân Sách & Bảng Giá (giữa Card 2 Mức Thưởng và Card Ký Quỹ Escrow).
     - Switch Toggle: `Tặng E-Voucher cho người hoàn thành bài` kèm badge `GẤP 2X GOM MẪU`.
     - Phân định rõ ràng 2 chế độ:
       + **Chế độ A: Tự Thêm Voucher Riêng (Miễn phí sàn 0đ)**: Nhập tên thương hiệu tài trợ, tiêu đề ưu đãi, trị giá quy đổi VNĐ, hạn sử dụng, hướng dẫn sử dụng. Hỗ trợ 2 cơ chế: `1 Mã Dùng Chung` (cấp tự động cho tất cả người nộp bài) hoặc `Danh Sách Mã Riêng` (mỗi người 1 mã độc nhất).
       + **Chế độ B: Mua Voucher Từ Kho Sàn Bằng Credit**: Lựa chọn các thương hiệu uy tín từ kho sàn (Shopee 50K, Grab 30K, Highlands Coffee 50K, Phúc Long 30K, CGV Cinemas 100K, Starbucks 100K). Nhập số lượng mã cần mua (có nút tiện ích `Bằng số mẫu` 1 chạm). Tự động tính chi phí mua voucher real-time.
  2. **Tích hợp Escrow Ký Quỹ Real-Time**:
     - `calculateStudioEscrow()` tự động cộng chi phí mua voucher sàn vào `finalEscrowCredit`: `finalEscrowCredit = baseEscrow + targetingFee + pinFee + (quantity * faceValue)`.
     - Card Ký Quỹ Escrow hiển thị chi tiết dòng: `Quà tặng E-Voucher (Tên thương hiệu x Số lượng): +... Credit`.
  3. **Backend & Cơ chế Giữ Chỗ / Hoàn Trả Mã An Toàn (`server/services/voucherService.js` & `server/controllers/surveyController.js`)**:
     - Migration CSDL: Bổ sung cột `voucher_purchase_quantity INTEGER DEFAULT 0` vào bảng `surveys`.
     - `reserveCatalogVouchersForSurvey`: Khi Doanh Nghiệp xuất bản khảo sát có mua voucher sàn, hệ thống trích xuất đúng số lượng mã từ kho catalog, gán `survey_id` và chuyển trạng thái `RESERVED_FOR_SURVEY`, giảm `remaining_quantity` của catalog. Tự động sinh thêm mã nếu kho sàn thiếu.
     - `releaseReservedSurveyVouchers`: Khi khảo sát bị đóng hoặc xóa, tự động hoàn trả toàn bộ các mã đã giữ chỗ nhưng chưa ai claim về lại trạng thái `AVAILABLE, survey_id = NULL` và cộng lại kho sàn, chống thất thoát voucher.
     - `claimVoucherForResponse`: Tự động cấp phát mã nguyên tử khi đáp viên hoàn thành khảo sát, hiển thị ngay trên màn hình hoàn tất và lưu vào Ví Voucher của người làm.
     - Cập nhật `createSurvey`, `publishSurvey`, `deleteSurvey` đồng bộ trọn vẹn với payload voucher.
  4. **Kiểm tra & Xác minh**:
     - Đã chạy kiểm tra cú pháp `node -c public/app.js` và `node -c server/controllers/surveyController.js` đạt PASS 100%.
     - Đã chạy kiểm thử nghiệp vụ toàn diện (Tạo voucher riêng 0đ, Mua voucher Shopee bằng Credit, Reserve mã, Claim mã, Hoàn trả mã khi xóa) đạt 100% PASS.
     - Cập nhật cache buster `index.html` lên `v=1793185000000`.

### Hoàn Thiện 100% 4 Trụ Cột Cơ Chế Voucher Doanh Nghiệp Theo Kế Hoạch Gốc (v3.2.1)
- **Tài liệu tham chiếu chuẩn**: `KE_HOACH_TONG_THE.md` (Phần II - Mục 3 và Phần V - Mục 4).
- **Hiện thực hóa trọn vẹn 4 trụ cột cơ chế**:
  1. **Chốt chặn phân quyền Doanh Nghiệp Cấp độ 2 (Chống Voucher Giả/Rác)**:
     - Tại `server/controllers/surveyController.js`: Khi `voucher_data.mode === 'CUSTOM'` (tự nạp voucher riêng), hệ thống bắt buộc kiểm tra `user.role === 'ADMIN' || user.enterprise_verify_level >= 2 || user.tax_id`.
     - Nếu chưa xác thực: Server từ chối HTTP 403 kèm `code: 'ENTERPRISE_LEVEL_2_REQUIRED'` và hướng dẫn cụ thể.
     - Tại Studio UI (`public/app.js`): Khóa Tab "Tự Thêm Voucher Riêng", hiển thị banner cảnh báo giải thích rõ ràng và cung cấp 2 nút điều hướng: "Xác Thực Doanh Nghiệp Cấp 2" và "Mua Voucher Sàn (1 - 5 mã)".
  2. **Công thức Escrow giảm 20% CPI trên $V$ suất có Voucher riêng ($V \le N$)**:
     - Khi Doanh nghiệp nạp $V$ voucher riêng:
       - $V$ suất có voucher: Đơn giá CPI giảm 20% (`Math.round(cost_per_response * 0.8)`).
       - $(N - V)$ suất không có voucher: Tính theo đơn giá chuẩn 100%.
       - Tổng Escrow khảo sát = `(V * round(CPI * 0.8)) + ((N - V) * CPI)`.
     - Đồng bộ công thức trong `calculateStudioEscrow()` (UI hiển thị chiết khấu `-... Credit`) và `publishSurvey` (Backend trừ ký quỹ chính xác từng đồng).
  3. **Hai cơ chế phát khi $V < N$ (`FIRST_COME` và `LUCKY_DROP`)**:
     - Bổ sung 2 cột CSDL vào bảng `surveys`: `voucher_dist_mode TEXT DEFAULT 'FIRST_COME'` và `voucher_total_slots INTEGER DEFAULT 0`.
     - Cơ chế 1: `Làm Nhanh Nhận Trước (First-Come, First-Served)`: $V$ người đầu tiên nộp bài hợp lệ sẽ nhận được voucher.
     - Cơ chế 2: `Rút Thăm May Mắn (Lucky Drop)`: Tự động tính xác suất $P = \frac{\text{Số voucher còn lại}}{\text{Số mẫu còn thiếu}}$, bốc thăm ngẫu nhiên cho mọi người tham gia.
     - Cập nhật trong `voucherService.claimVoucherForResponse`: Xử lý phân bổ xác suất chính xác.
  4. **Mua số lượng nhỏ từ Kho Sàn (Tự do tùy ý 1 đến N mã)**:
     - Mọi đối tượng (Sinh viên, Cá nhân, Doanh nghiệp) đều có thể mua số lượng mã tùy ý từ kho sàn để tạo sức hút lớn mà không cần mua đủ $N$ mã.
     - Giao diện Studio tinh giản: Bỏ các nút chip gợi ý cứng, chuyển thành ô nhập số lượng tự do từ 1 đến $N$ mã ($V \le N$).
     - Nếu số lượng mã mua tự do nhỏ hơn $N$ ($V < N$), giao diện tự động kích hoạt bộ chọn cơ chế phát `Làm Nhanh Nhận Trước` vs `Rút Thăm May Mắn`.
  5. **Cơ chế trả thưởng & cộng bù tiền mặt cho Người làm bài**:
     - Người làm nhận được voucher: Nhận điểm cơ sở theo suất voucher + 01 Voucher quà tặng.
     - Người làm KHÔNG nhận được voucher (hết mã hoặc không trúng trong Lucky Drop): Được tự động cộng bù tiền mặt +200đ (+20 điểm: ví dụ 90 điểm thay vì 70 điểm) theo đúng quy định tại `KE_HOACH_TONG_THE.md`.
  6. **Kiểm tra & Xác minh**:
     - Kịch bản kiểm thử tự động `test_voucher_mechanisms.js` xác nhận 100% PASS trên môi trường chạy thực tế:
       + Chặn tài khoản chưa xác thực Cấp 2: PASS (HTTP 403).
       + Doanh nghiệp Cấp 2 tạo khảo sát voucher riêng: PASS (HTTP 201).
       + Ký quỹ Escrow giảm 20% CPI trên 5 suất: PASS (Kỳ vọng 68.600đ - Thực tế 68.600đ).
       + Mua voucher sàn số lượng nhỏ: PASS (Kỳ vọng 128.000đ - Thực tế 128.000đ).
       + Nộp bài & cộng bù +20 điểm: PASS (Nhận 90 điểm thưởng kèm thông báo cộng bù rõ ràng).
     - Cập nhật cache buster `index.html` lên `v=1793189000000`.


### Khắc Phục Lỗi Nhận Diện Microsoft Forms (SPA API Runtime & Xử Lý Lỗi 401 Quyền Truy Cập)
- **Vấn đề người dùng phản ánh**: Khi dán link Microsoft Forms mới (`forms.cloud.microsoft` / `forms.office.com`), hệ thống thông báo đã đồng bộ/nhận diện thành công nhưng Canvas trống trơn, thực tế không có câu hỏi nào được bóc tách.
- **Nguyên nhân kỹ thuật gốc rễ**:
  1. Microsoft Forms hiện đại (2024-2026) là Single Page Application (SPA), không nhúng câu hỏi trong HTML tĩnh mà lưu cấu hình API nội bộ trong đối tượng `window.OfficeFormServerInfo` với thuộc tính `prefetchFormUrl`.
  2. Phiên bản cũ chỉ đọc các biến nhúng cũ (`runtimeForms` trong script tĩnh) nên không bóc tách được câu hỏi từ `prefetchFormUrl`.
  3. Khi biểu mẫu Microsoft Forms bật chế độ bảo vệ / yêu cầu đăng nhập tài khoản Microsoft (mặc định với nhiều tài khoản cơ quan/trường học), API ngầm trả về HTTP 401 (`Required user login`). Hệ thống cũ không bắt lỗi này mà trả về 0 câu hỏi rồi tự động chuyển sang Canvas trống trơn, khiến người dùng thấy "báo thành công nhưng không có gì xảy ra".
- **Giải pháp đã triển khai**:
  1. **Backend (`server/services/formParserService.js`)**:
     - Bổ sung hàm async `parseMicrosoftForms`: Tự động trích xuất `OfficeFormServerInfo` và gọi API `prefetchFormUrl` với các header bảo mật (`antiForgeryToken`, ring, datacenter).
     - Bắt lỗi HTTP 401 (`Required user login`) và ném ra lỗi xác thực phân quyền rõ ràng với `isMicrosoft: true`.
     - Bóc tách toàn diện 100% câu hỏi (Choice, Multichoice, Text, Rating, Matrix/Likert, Ranking) khi biểu mẫu ở chế độ công khai.
  2. **Controller (`server/controllers/surveyController.js`)**:
     - Trả về mã HTTP 401 cùng cờ `isMicrosoft: true` và `isAuthRequired: true` khi bắt gặp lỗi xác thực biểu mẫu Microsoft Forms.
  3. **Frontend Studio (`public/app.js`)**:
     - Cập nhật thông báo tiến trình kết nối chuẩn theo từng dịch vụ (`Microsoft Forms` hoặc `Google Forms`).
     - Khi gặp lỗi 401 từ Microsoft Forms: Kích hoạt modal chuyên dụng `showMicrosoftFormsAuthErrorModal` hướng dẫn người dùng 3 phương án:
       + Phương án 1 (Khuyên dùng - 3 giây): Mở quyền "Bất kỳ ai cũng có thể phản hồi" (Anyone can respond) và bỏ chọn "Ghi lại tên" (Record name) trên Microsoft Forms, sau đó bấm "Đã Cập Nhật & Đồng Bộ Lại".
       + Phương án 2: Chuyển 1-click sang tab "Dán Văn Bản Thông Minh" (Smart Paste) để nạp câu hỏi từ Word/Notion chỉ trong 1 giây.
       + Phương án 3: Tiếp tục tạo khảo sát ở chế độ "Liên Kết Ngoài (External Form)".
     - Khi bóc tách trả về 0 câu hỏi: Không tự ý chuyển sang Canvas trống trơn, mà giữ nguyên tab `EXTERNAL_URL`, điền sẵn tiêu đề và thông báo rõ ràng cho người dùng.
  4. **Kiểm tra & Xác minh**:
     - Chạy kiểm tra cú pháp: `node -c public/app.js`, `node -c server/services/formParserService.js`, `node -c server/controllers/surveyController.js` đều đạt PASS 100%.
     - Kiểm thử trực tiếp với link thật của người dùng: Bắt chuẩn xác HTTP 401 và thông điệp hướng dẫn phân quyền.
     - Bộ kiểm thử `tests/test_vouchers_and_parser.js` đạt 12/12 PASS (100%).
     - Cập nhật cache buster `index.html` lên `v=1793190000000`.

- **Cập nhật khắc phục triệt để**:
  1. Đã giải mã thành công cấu trúc SPA JSON ngầm của Microsoft Forms:
     - Trích xuất nhãn tùy chọn từ thuộc tính `c.displayText` và `info.Choices[i].Description`.
     - Nhận diện đúng tự luận nhiều dòng `info.Multiline: true` -> `PARAGRAPH`.
     - Phân tích thang đo NPS (`Question.NPS`) -> `LINEAR_SCALE` kèm nhãn 2 đầu `LeftDescription` và `RightDescription`.
     - Quét gom nhóm trước (Pre-grouping pass) cho Ma trận Lưới Likert: Kết hợp chính xác giữa câu cha `Question.MatrixChoiceGroup` (chứa 5 cột) và các câu con `Question.MatrixChoice` (chứa 2 hàng), không bị phụ thuộc vào thứ tự xuất hiện trong payload.
  2. Đã khởi động lại tiến trình Node.js server (PID 33032) để nạp mã nguồn mới nhất.
  3. Đã chạy thử nghiệm API thực tế: Bóc tách thành công 100% 8 câu hỏi từ biểu mẫu Microsoft Forms của người dùng.

- **Sửa lỗi sai thứ tự và loại câu hỏi Microsoft Forms**:
  1. Nguyên nhân: Microsoft Forms API không trả về mảng theo thứ tự hiển thị mà gán trọng số thứ tự qua thuộc tính `q.order`. Code cũ duyệt tuần tự mảng gốc khiến câu 1 (Choice) và câu 2 (NPS) bị nhảy ra sau câu tự luận và ma trận. Đồng thời trong Microsoft Forms, `ChoiceType: 2` quy định Hộp kiểm nhiều đáp án (Multi-Choice / Checkbox) chứ không phải Single Choice.
  2. Khắc phục:
     - Sắp xếp mảng câu hỏi `rawQuestions` tăng dần theo `q.order`.
     - Nhận diện chuẩn xác `ChoiceType: 2` -> `MULTIPLE_CHOICE` (Hộp kiểm nhiều đáp án [ ]).
     - Gom nhóm Ma trận Lưới Likert hiển thị đúng tại vị trí `order` của câu cha.
  3. Kiểm tra: Bóc tách chính xác 100% khớp với ảnh chụp thực tế của người dùng: Câu 1 là Hộp kiểm (Tùy chọn 1, Tùy chọn 2), Câu 2 là Thang đo NPS (0 đến 10).

- **Tái thiết kế giao diện Câu hỏi Phạm vi tuyến tính (Linear Scale - Chuẩn Google Forms)**:
  1. Nguyên nhân: Giao diện cũ của câu hỏi `LINEAR_SCALE` gắn nhãn cam lòe loẹt "NET PROMOTER SCORE (NPS 0-10)", các nút "Thang 1-5 (GG Form)" / "Thang 0-10 (MS Forms NPS)" rườm rà, thiếu tính chuẩn mực của Google Forms Studio.
  2. Khắc phục:
     - Tái thiết kế 100% theo phong cách tối giản Google Forms chuẩn mực:
       + Hàng chọn thang đo: 2 dropdown tinh tế `[ 0 / 1 ]` đến `[ 2..10 ]` (mặc định 1 đến 5 hoặc 0 đến 10 tùy cấu hình).
       + 2 Hàng nhập nhãn đầu mút: Hiển thị số mốc trái/phải (`0`/`1` và `5`/`10`) kèm ô input gạch chân tối giản với placeholder `Nhãn (tùy chọn)`.
       + Hàng xem trước (Preview): Mô phỏng các nút radio tròn phẳng nằm ngang kèm nhãn hai đầu.
       + Loại bỏ hoàn toàn nhãn cam, từ khóa "Net Promoter Score / NPS 0-10" và các nút bấm thừa thãi.
     - Đồng bộ cả giao diện soạn thảo trong Studio Canvas lẫn giao diện làm bài (Take Survey).
     - Đồng bộ mã nguồn sang `android/app/src/main/assets/public/`.
  3. Kiểm tra & Xác minh:
     - Cú pháp `node -c public/app.js` đạt PASS 100%.
     - Cập nhật cache buster `v=1793193600000` trong `public/index.html`.


### Tái Thiết Kế Toàn Diện Dark Theme Chuẩn Force-Dark Cao Cấp (v3.6.5)
- **Vấn đề phản ánh**: Người dùng sử dụng tính năng "Force Dark Web" của Chrome và rất ưng ý với phong cách hiển thị đó, trong khi Dark Theme cũ của web bị chê "xấu quá" do nền đen tuyền hố đen (#09090B), card bết dính mờ căm, dính gradient xanh tím rườm rà và chữ bị tối xì.
- **Giải pháp triển khai**:
  1. **Tái cấu trúc bảng màu Dark Mode chuẩn Monochrome Charcoal & Orange Accent**:
     - Nền trang (Body & Background): `#121214` (đen than mềm ấm, mịn màng, chống lóa mắt).
     - Bề mặt Card & Bento Surface: `#1C1C20` (nổi khối sắc nét, tách bạch rõ ràng khỏi nền).
     - Sub-containers & Inner cards: `#222228` (phân tầng thị giác rõ ràng).
     - Ô nhập liệu (Input, Textarea, Select): Nền `#161619`, viền `#33333D`, chữ trắng `#FFFFFF`, placeholder `#71717A`.
     - Viền Card: `#2E2E36` (định hình khối sắc nét từng góc cạnh).
     - Text Hierarchy: Tiêu đề và Heading trắng tinh `#FFFFFF` 100% nét căng; Văn bản body xám sáng `#E4E4E7` dễ đọc; Phụ đề `#A1A1AA` (xóa bỏ hoàn toàn tình trạng chữ bị mờ xỉn).
     - Màu cam thương hiệu (`#EA580C` / `#F97316`): Giữ nguyên trọn vẹn độ rực rỡ và độ tương phản cao trên các nút hành động chính, tab đang chọn và viền highlight.
     - Header Navbar: Nền than `#121214` mờ 95%, viền dưới `#25252A`.
  2. **Dọn sạch mã CSS cũ**:
     - Loại bỏ triệt để các vết tích gradient xanh tím kiểu cũ (`#162035`, `rgba(99, 102, 241, ...)`).
  3. **Đồng bộ hóa Tailwind Config & Cache Buster**:
     - Cập nhật palette dark trong `tailwind.config` của `public/index.html`.
     - Tăng cache buster lên `styles.css?v=3.6.5`.
  4. **Kiểm tra & Xác minh**:
     - Kiểm tra cú pháp: `node -c public/app.js` và `node -c server/app.js` đạt 100% PASS.
     - Máy chủ backend cổng 3000 phản hồi HTTP 200 trơn tru.


### Tinh Gọn Dropdown Menu Chọn Loại Câu Hỏi Trong Studio (v3.6.6)
- **Vấn đề phản ánh**: Menu chọn loại câu hỏi (Question Type Dropdown) trong Studio Tạo Khảo Sát gồm 14 định dạng chia làm 5 nhóm, không có giới hạn chiều cao khiến menu bị kéo dài lê thê ("siêu dài"), tràn ra ngoài màn hình và che khuất các phần tử bên dưới.
- **Giải pháp triển khai**:
  1. Thêm giới hạn chiều cao tối đa `max-h-[360px] sm:max-h-[390px] overflow-y-auto overscroll-contain` cùng thanh cuộn mỏng tinh tế `.scrollbar-thin`.
  2. Tinh gọn kích thước từng dòng lựa chọn từ `p-2` sang `py-1.5 px-2.5 text-xs rounded-lg` và giảm khoảng cách dòng `space-y-0.5`.
  3. Tiêu đề phân nhóm danh mục được tinh chỉnh font chữ `text-[9.5px]` gọn gàng, sắc sảo.
  4. Menu nay hiển thị vừa vặn trong tầm mắt, cuộn mượt mà chuẩn mực như Google Forms và Notion.
- **Xác minh**:
  - `node -c public/app.js` và `node -c server/app.js` đạt 100% PASS.
  - Tăng cache buster lên `styles.css?v=3.6.6`.


### Hệ Thống Báo Cáo Sự Cố & Đăng Tải Lỗi Đa Kênh (Bug Reporting & Feedback Engine) (v3.7.0)
- **Yêu cầu người dùng**: Thêm tính năng Báo Lỗi để người dùng có thể gửi báo cáo lỗi và đăng tải ảnh chụp màn hình minh chứng sự cố khi sử dụng nền tảng.
- **Giải pháp triển khai toàn diện**:
  1. **Cơ sở dữ liệu SQLite (`server/db/database.js`)**:
     - Tạo bảng `bug_reports`:
       * `id`: Khóa chính định danh sự cố (`bug_...`).
       * `user_id`: Khóa ngoại liên kết bảng `users` (hỗ trợ cả người dùng đăng nhập và khách vãng lai).
       * `reporter_name`, `reporter_email`: Thông tin người phản ánh.
       * `category`: Phân loại danh mục (`UI_UX`, `SURVEY`, `CREATOR_STUDIO`, `PAYMENT`, `AUTH`, `OTHER`).
       * `severity`: Mức độ ảnh hưởng (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
       * `title`, `description`: Tiêu đề và nội dung chi tiết các bước tái hiện.
       * `image_url`: Đường dẫn ảnh minh chứng lưu trữ trong `public/uploads/`.
       * `device_info`: JSON chứa User Agent, độ phân giải màn hình, URL trang gặp lỗi, thời gian.
       * `status`: Trạng thái xử lý (`PENDING`, `INVESTIGATING`, `RESOLVED`, `REJECTED`).
       * `admin_notes`: Lời nhắn phản hồi từ Đội ngũ kỹ thuật / Quản trị viên.
       * `resolved_at`, `created_at`, `updated_at`.
     - Đánh chỉ mục (`INDEX`) trên `user_id`, `status`, `created_at` để truy vấn tức thì.
  2. **Backend Controller & API (`server/controllers/bugReportController.js` & `server/routes/api.js`)**:
     - `POST /api/v1/bug-reports`: Tiếp nhận báo cáo lỗi (kèm tự động bắn thông báo cho các tài khoản ADMIN).
     - `GET /api/v1/bug-reports/my`: Người dùng tra cứu lịch sử các báo lỗi của chính mình và xem phản hồi.
     - `GET /api/v1/admin/bug-reports`: Quản trị viên tra cứu toàn bộ danh sách, lọc theo trạng thái, danh mục, phân trang và thống kê số liệu thẻ KPI.
     - `PATCH /api/v1/admin/bug-reports/:id`: Quản trị viên cập nhật trạng thái sự cố và nhập lời nhắn; hệ thống tự động tạo Thông Báo (`notifications`) gửi trực tiếp đến tài khoản người dùng đã báo lỗi.
     - `DELETE /api/v1/admin/bug-reports/:id`: Xóa các bản ghi spam.
  3. **Giao diện Người Dùng Đa Kênh (Frontend Client)**:
     - **Điểm truy cập tiện lợi**:
       * Nút icon phao cứu sinh trên thanh Header Navbar (`#header-bug-report-btn`).
       * Nút nổi cố định (Floating Trigger) ở góc dưới màn hình.
       * Mục "Báo Lỗi & Góp Ý" trong Profile Dropdown Menu.
       * Liên kết trong chân trang Footer.
     - **Modal Báo Lỗi (`#bug-report-modal`)**:
       * Tab "Gửi Báo Lỗi Mới": Chọn danh mục (chip), mức độ ảnh hưởng, tiêu đề, mô tả.
       * **Khu vực Đăng Tải Ảnh Minh Chứng**: Hỗ trợ kéo thả, duyệt file ảnh và đặc biệt là **hỗ trợ dán trực tiếp (Ctrl + V)** ảnh chụp màn hình từ Clipboard! Tự động nén WebP và upload lên `/api/v1/upload/image`.
       * Tab "Lịch Sử Của Tôi": Theo dõi các báo lỗi đã gửi, xem badge trạng thái và lời nhắn phản hồi từ kỹ thuật viên.
  4. **Giao diện Quản Trị Admin (`renderAdminBugReportsView`)**:
     - Tab "Báo Lỗi" ngay trên thanh điều hướng Admin Desktop.
     - Thống kê 4 thẻ KPI: Tổng số, Chờ tiếp nhận, Đang xử lý, Đã giải quyết.
     - Bảng danh sách báo lỗi, xem ảnh minh chứng phóng to, cập nhật trạng thái và phản hồi lời nhắn gửi cho người dùng.
  5. **Kiểm tra & Xác minh**:
     - Kịch bản kiểm thử tự động `tests/test_bug_reports.js` đạt 7/7 PASS (100%).
     - Cập nhật cache buster `index.html`: `app.js?v=1793282000000` và `styles.css?v=3.6.7`.


### Tinh Chỉnh Giao Diện Nút Báo Lỗi & Chuẩn Hóa Biểu Tượng (v3.7.1)
- **Yêu cầu người dùng**:
  1. Gỡ bỏ nút báo lỗi trên thanh header (vì đã có nút nổi bên dưới).
  2. Đổi màu nút nổi bên dưới cho khớp với theme (chế độ sáng thì nền trắng tinh tế, chế độ tối thì nền than ấm, không bị một cục đen sì lệch tông ở Light Mode).
  3. Đổi logo icon báo lỗi sang biểu tượng chuẩn xác (từ icon chiếc phao `life-buoy` sang icon con bọ `bug`).
- **Thực hiện**:
  1. Gỡ bỏ hoàn toàn `#header-bug-report-btn` trên Header Navbar.
  2. Cập nhật nút nổi cố định ở góc dưới:
     - Light Mode: Nền trắng `bg-white/95`, viền mờ `border-stone-200/90`, chữ `text-stone-700`, đổ bóng nhẹ `shadow-lg`, hover viền cam.
     - Dark Mode: Nền than `dark:bg-[#1C1C20]/95`, viền `dark:border-[#2E2E36]`, chữ `dark:text-stone-200`.
     - Icon con bọ Lucide `bug` màu cam thương hiệu nổi bật.
  3. Đồng bộ biểu tượng `bug` trên toàn bộ hệ thống: Nút nổi, Header Modal Báo Lỗi, Menu Profile, Chân trang Footer và Tab Admin Nav.
  4. Cập nhật cache buster: `app.js?v=1793285000000` và `styles.css?v=3.6.8`.

### Tinh Gọn Quản Trị Admin, Chuẩn Hóa Custom Dropdown & In-App Image Lightbox (v3.7.2)
- **Các vấn đề người dùng yêu cầu khắc phục**:
  1. *Click vào thông báo báo lỗi không chuyển sang xem*: Trước đó bấm vào thông báo `BUG_REPORT` hoặc `BUG_UPDATE` không có hành động do thiếu xử lý loại thông báo.
  2. *Dropdown trạng thái chưa đúng tiêu chuẩn*: Modal chi tiết lỗi Admin dùng thẻ `<select>` nguyên thủy của HTML, hiển thị menu xám xịt của Windows OS. Bổ sung rule vào `DESIGN.md` bắt buộc 100% dropdown phải dùng Custom Dropdown Component.
  3. *Ảnh báo lỗi phải xem trực tiếp thay vì click tải về*: Trước đó dùng thẻ `<a>` trỏ link tải file ngoài; cần hiển thị thumbnail xem trực tiếp và khi click mở Modal Lightbox Viewer phóng to ngay trên trang.
  4. *Giao diện Admin quá nhiều phần trên Header*: Navbar Admin dàn trải 7 tabs ngang; cần gộp 4 công cụ quản trị vào 1 tab duy nhất là **`Quản Trị`**.
- **Giải pháp triển khai thực tế**:
  1. **Điều hướng thông minh từ Thông Báo (`clickNotificationItem`)**:
     - Phân tích `notifType` và từ khóa `sự cố` / `báo lỗi`.
     - Nếu là Quản trị viên: Tự động chuyển hướng đến tab `admin-bug-reports` để xử lý ngay.
     - Nếu là Người dùng thường: Tự động bật Modal Báo Lỗi (`openBugReportModal`) và chuyển thẳng sang tab "Lịch Sử Của Tôi" (`history`) để xem chi tiết lời nhắn phản hồi của kỹ thuật viên.
  2. **Quy chuẩn Custom Dropdown Popover (`DESIGN.md` SSOT & `openAdminBugDetailModal`)**:
     - Cập nhật `DESIGN.md` mục 5.3: Cấm 100% thẻ `<select>` nguyên thủy trong form/modal.
     - Triển khai Custom Dropdown Component trong Modal Báo Lỗi Admin: Nút bấm trigger bo tròn, hiển thị trạng thái hiện tại kèm icon chấm tròn màu trạng thái (`PENDING` - Cam, `INVESTIGATING` - Xanh dương, `RESOLVED` - Xanh lá, `REJECTED` - Xám) và icon mũi tên `chevron-down` xoay 180 độ.
     - Menu danh sách Popover nổi `shadow-2xl`, hover đổi màu mượt mà, mục đang chọn hiển thị icon tích `check` màu cam thương hiệu.
  3. **Trình Xem Ảnh Trực Tiếp Tại Chỗ (In-App Image Lightbox Viewer)**:
     - Thêm `#image-lightbox-modal` cố định toàn màn hình với nền tối mờ `bg-black/85 backdrop-blur-md`.
     - Phương thức `previewFullImage(url, title)` và `closeImageLightbox()`: Phóng to ảnh sắc nét, hiển thị tiêu đề, nút mở ảnh gốc và nút đóng `(X)`. Hỗ trợ đóng nhanh bằng phím `Escape` hoặc bấm vào vùng nền mờ bên ngoài.
     - Cột Minh Chứng trong bảng Admin và Lịch sử báo lỗi Người dùng: Hiển thị thumbnail ảnh xem trực tiếp kèm click phóng to, loại bỏ hoàn toàn link tải file về máy.
  4. **Tinh Gọn Header Admin & Thanh Sub-Navigation Đẳng Cấp**:
     - Navbar Header Desktop & Mobile gộp 4 tab thành 1 tab duy nhất: **`Quản Trị`** (`id: 'admin-overview'`, icon `layout-dashboard`).
     - Thanh điều hướng Header Admin chỉ còn 4 mục tối giản: `Quản Trị | Khảo Sát | Tạo Khảo Sát | Khảo Sát Của Tôi`.
     - Cả 4 phân hệ (`admin-overview`, `admin-payouts`, `admin-fraud`, `admin-bug-reports`) đều tích hợp thanh chuyển đổi tab con đồng bộ (`renderAdminSubNav`) dạng Segmented Tabs bo góc mượt mà ở đầu mỗi trang.
  5. **Xác minh cú pháp**:
     - `node -c public/app.js`: PASS 100%.
     - `node -c server/app.js`: PASS 100%.
     - Bump cache buster: `app.js?v=1793286000000`.

### Sao Lưu An Toàn & Chuẩn Hóa Hallmark Redesign 2 Theme (v3.7.3)
- **Sao lưu toàn diện**:
  - Đã sao chép 100% mã nguồn giao diện, cấu hình và assets vào thư mục độc lập: `backup_ui_pre_hallmark/` (chứa `app.js`, `index.html`, `styles.css`, `DESIGN.md.bak`, và toàn bộ `fonts/`, `images/`, `uploads/`).
- **Tách biệt 2 Theme chuẩn mực theo `DESIGN.md` SSOT**:
  - **Light Theme**: Nền base giấy ấm `#FAFAFA`, bề mặt bento trắng tinh `#FFFFFF`, viền mờ sắc nét `#E7E5E4` / `#E4E4E7`, chữ tương phản cao `#09090B` / `#18181B`, điểm nhấn cam Vibe `#EA580C`.
  - **Dark Theme (Obsidian Charcoal)**: Nền than mềm ấm `#121214` chống mỏi mắt (không đen kịt OLED), thẻ bento `#1C1C20`, hộp lồng `#222228`, viền `#2E2E36`, chữ sáng tinh khôi `#FFFFFF` / `#E4E4E7`, điểm nhấn cam `#EA580C` / `#F97316`.
- **Thực thi các tiêu chuẩn Hallmark Floor**:
  - Loại bỏ hoàn toàn `transition: all` trên toàn bộ hệ thống stylesheet và HTML, thay bằng chuyển động tường minh (`transition-colors`, `transition-transform`, `transition-opacity`).
  - Thêm `overflow-x: clip` trên cả `html` và `body`.
  - Cung cấp vòng nhận diện tiêu điểm `:focus-visible` tức thì (instant outline 3:1) với cam thương hiệu `--focus-ring-color: #EA580C`.
  - Bổ sung fallback `@media (prefers-reduced-motion: reduce)` triệt tiêu giật lag cho người dùng nhạy cảm chuyển động.
  - Sửa lỗi hình ảnh không nguồn (`FAIL 76`), nhãn in hoa giãn chữ (`FAIL 67`) và thiếu thuộc tính trợ năng SVG (`FAIL 33`).
- **Kiểm toán chất lượng (Audit Result)**:
  - `sloplint public/index.html`: **0 FAIL** (Đạt chuẩn The Floor 100%).
  - Cú pháp mã nguồn: `node -c public/app.js` và `node -c server/app.js` đều PASS 100%.
  - Máy chủ: Phản hồi HTTP 200 OK trên cổng 3000.

### Khôi Phục Hoàn Toàn Giao Diện Gốc (v3.7.4 - Rollback to v3.7.2 Pre-Hallmark)
- **Thực hiện khôi phục**:
  - Khôi phục nguyên vẹn 100% toàn bộ tệp trong thư mục `public/` từ bản sao lưu an toàn `backup_ui_pre_hallmark/`.
  - Khôi phục tệp quy chuẩn thiết kế gốc `DESIGN.md` từ `backup_ui_pre_hallmark/DESIGN.md.bak`.
  - Giữ nguyên vẹn toàn bộ các tính năng đã hoàn thiện trước đó:
    * Điều hướng thông báo sự cố thông minh (`BUG_REPORT` / `BUG_UPDATE`).
    * Custom Dropdown Popover chuẩn SSOT trong modal Báo lỗi Admin (loại bỏ thẻ `<select>` xám).
    * Modal In-App Image Lightbox Viewer xem ảnh minh chứng trực tiếp không cần tải về máy.
    * Gộp toàn bộ công cụ Admin trên Header vào tab duy nhất **`Quản Trị`** kèm thanh Sub-Navigation Segmented Tabs.
- **Cập nhật Cache Buster**: `styles.css?v=3.7.2_restored_1793288000` và `app.js?v=3.7.2_restored_1793288000` để đảm bảo trình duyệt người dùng nhận diện ngay bản gốc.
- **Xác minh cú pháp & máy chủ**:
  - `node -c public/app.js`: PASS.
  - `node -c server/app.js`: PASS.
  - Máy chủ: Hoạt động bình thường trên cổng 3000 (HTTP 200).

### Hoàn Thiện Cơ Chế Nạp Tiền & Điều Hướng Chi Tiết Sự Cố (v3.7.5)
- **Tối ưu luồng kiểm thử Nạp tiền (Fintech Demo)**:
  - Tích hợp nút `Mô Phỏng Thanh Toán (Dev/Test)` trực tiếp trên Popup VietQR Napas247, cho phép tạo đơn nạp và kích hoạt nạp quỹ tức thì mà không cần nạp tiền thật qua ngân hàng.
  - Chuẩn bị sẵn lộ trình tích hợp cổng thật (payOS / SePay) cho giai đoạn sản xuất.
- **Khắc phục triệt để luồng xem chi tiết báo lỗi từ thông báo**:
  - Backend `bugReportController.js`: Nhúng `survey_id = id` (ID bản ghi báo lỗi) vào thông báo gửi cho Admin.
  - Tuyến API mới: `GET /api/v1/admin/bug-reports/:id` cho phép truy xuất chi tiết từng bản ghi.
  - Frontend `app.js`: Hàm `openAdminBugDetailById(bugId)` tự động nạp dữ liệu và mở modal xử lý báo lỗi trực tiếp khi Admin click vào thông báo từ header dropdown.

### Module Hóa Frontend & Chuẩn Hóa Bảo Mật XSS (Giai Đoạn 3 - v3.8.0)
- **Thiết kế Kiến trúc Frontend Modular an toàn tuyệt đối**:
  - Giữ nguyên `window.VibeApp` làm Namespace SSOT toàn cục để bảo toàn 100% các trình xử lý sự kiện trong HTML (`onclick="VibeApp.func(...)"`).
  - Tách các khối tính năng độc lập mới ra thành các module chuyên biệt trong thư mục `public/js/modules/`:
    * `public/js/modules/customDropdown.js`: Quản lý đóng/mở, tự động đóng khi click bên ngoài (click outside) hoặc bấm `Escape`, định vị các Custom Dropdown Popover chuẩn `DESIGN.md`.
    * `public/js/modules/lightboxViewer.js`: Trình xem ảnh phóng to toàn màn hình (In-App Image Lightbox) trên nền mờ tối `bg-black/85 backdrop-blur-md`, giải phóng bộ nhớ khi đóng.
    * `public/js/modules/bugReportModule.js`: Toàn bộ logic tiếp nhận báo cáo sự cố, chuyển đổi tab gửi mới/lịch sử, tải và dán ảnh minh chứng từ clipboard (`Ctrl + V`), bảng điều hành quản trị Admin với Custom Dropdowns.
  - Cơ chế tự động mở rộng (Mix-in): Mỗi module tự động mở rộng vào Namespace `Object.assign(window.VibeApp, Module);`.
  - Giảm tải trực tiếp hơn 1.080 dòng mã trong `public/app.js`, giúp mã nguồn tinh gọn và bảo trì dễ dàng hơn.
  - Nhúng đầy đủ các module trong `public/index.html` trước `app.js` với cache buster đồng bộ: `v=3.8.0_1793290000`.
- **Rà soát & Chuẩn hóa an toàn chống XSS**:
  - Tối ưu hàm `escapeHtml()` xử lý an toàn 5 ký tự đặc biệt (`&`, `<`, `>`, `"`, `'`).
  - Bọc `this.escapeHtml()` tại toàn bộ các điểm hiển thị dữ liệu do người dùng nhập hoặc Creator tạo:
    * Tiêu đề và mô tả khảo sát trong Card lưới (`cleanTitle`, `s.description`).
    * Tiêu đề khảo sát trong Card dòng (gỡ bỏ triệt để đoạn lỗi HTML thẻ đóng dư thừa).
    * Màn hình mở đầu bài làm Welcome Screen (`s.title`, `s.description`).
    * Nội dung câu hỏi và các lựa chọn đáp án (`q.content`, `opt`).
    * Tiêu đề và nội dung thông báo hệ thống (`n.title`, `n.message`).
    * Danh sách khảo sát của Creator (`s.title`) và trang báo cáo kết quả (`survey.title`).
- **Tuân thủ triệt để DESIGN.md (Xóa sạch thẻ `<select>` xám nguyên thủy)**:
  - Rà soát toàn bộ ứng dụng và thay thế 2 thẻ `<select>` xám cuối cùng trong bảng quản trị Báo Lỗi Admin (`status` và `category`) thành Custom Dropdown Popover chuẩn Bento Modern, có bo góc `rounded-xl`, popover nổi bóng đổ `shadow-2xl` và dấu tích check màu cam `#EA580C`.
- **Đồng bộ hóa 100% tài nguyên sang nền tảng Android Native**:
  - Chạy `npm run sync:android` sao chép tự động toàn bộ thư mục `public/js/modules/`, `public/app.js` và `public/index.html` sang `android/app/src/main/assets/public/`.
- **Xác minh cú pháp & kiểm thử**:
  - `node -c public/js/modules/customDropdown.js`: PASS.
  - `node -c public/js/modules/lightboxViewer.js`: PASS.
  - `node -c public/js/modules/bugReportModule.js`: PASS.
  - `node -c public/app.js`: PASS.
  - Toàn bộ các file trong Android Assets: PASS 100%.
  - Bộ kiểm thử lõi: `test_pricing.js` (13/13 PASS), `test_api_endpoints.js` (6/6 PASS), `test_anti_fraud.js` (8/8 PASS), `test_bug_reports.js` (7/7 PASS), `test_vouchers_and_parser.js` (12/12 PASS), `test_cover_image_welcome.js` (4/4 PASS), `test_response_review_and_edit.js` (6/6 PASS).

### Tái Cấu Trúc Backend & Chuyên Nghiệp Hóa Kiến Trúc Hệ Thống (Giai Đoạn 2 - v3.9.0)
- **Tách Tầng Truy Cập Dữ Liệu (Data Access Layer - Repository Pattern)**:
  - Xây dựng `server/repositories/surveyRepository.js` gom toàn bộ các câu lệnh SQL truy vấn trực tiếp bảng `surveys`, `questions`, `responses`.
  - Cung cấp các hàm chuẩn hóa: `findById`, `findByIdAndCreator`, `findQuestionsBySurveyId`, `findRawQuestionsBySurveyId`, `findWithQuestions`, `createSurvey` (ACID transaction chèn khảo sát và câu hỏi), `updateSurvey`, `updateStatus`, `updateIsPinned`, `incrementCollectedResponses`, `updateEscrowLockedBalance`, `getSurveyStats`, `listSurveys`, `listPublicSurveys`, `listCreatorSurveys`, `listAdminSurveys`, `listRespondentSurveys`, `findResponse`, `findResponseById`, `listResponsesBySurveyId`, `listResponsesForExport`, `createResponse`, `updateResponse`, `updateEditedResponse`, `markScreenedOut`, `countValidResponses`, `deleteSurvey`, `getWarrantyStats`, `createWarrantyClaim`, `getVelocityBenchmarkRows`.
- **Tách Độc Lập Động Cơ Định Giá (Pricing Engine Service)**:
  - Xây dựng `server/services/surveyPricingService.js` tách rời 100% logic kinh tế học khỏi controller và cấu hình.
  - Đảm bảo các hàm độc lập: `getQuestionLengthCategory`, `getFloorPrice`, `getSlaPricingTiers`, `estimateDynamicVelocity`, `estimateLoi`, `getDynamicTakeRate`, `calculateTierEconomics`, `calculateSurveyEconomics`, `calculatePublishEscrow`, `calculateEscrowRefund`.
  - Giữ nguyên 100% công thức phân chia Creator Boost 80% người điền / 20% sàn và tương thích ngược với `server/services/pricingService.js`.
- **Tinh Gọn Survey Controller (`server/controllers/surveyController.js`)**:
  - Chuyển đổi các tác vụ đọc/ghi dữ liệu sang sử dụng `surveyRepository` và tính toán qua `surveyPricingService`.
  - Tinh chỉnh `_checkUserMatchesTarget` hỗ trợ so khớp mảng linh hoạt cho tỉnh thành (`provinces`), trường đại học (`universities`) và chuyên ngành (`majors`).
  - Bảo toàn 100% API contract và tính năng hiện hữu.
- **Tích Hợp Hệ Thống Ghi Nhật Ký Kiểm Toán Cho Quản Trị Viên (Admin Audit Logging)**:
  - Tích hợp `auditLogService` vào `server/controllers/adminController.js`: ghi nhận hành động phê duyệt/từ chối rút tiền (`APPROVE_PAYOUT`, `REJECT_PAYOUT`), mở khóa người dùng/IP (`UNBAN_USER`, `UNBAN_IP`), và toàn bộ 16 lệnh trong Fast Command Console (`/ban`, `/unban`, `/banip`, `/unbanip`, `/setrole`, `/settier`, `/settrust`, `switchAdminTier`).
  - Tích hợp vào `server/controllers/bugReportController.js`: ghi nhận cập nhật trạng thái sự cố (`UPDATE_BUG_REPORT_STATUS`) và xóa báo cáo (`DELETE_BUG_REPORT`).
  - Tích hợp vào `server/controllers/walletController.js`: ghi nhận các giao dịch nạp Credit do Admin thực hiện và các giao dịch mô phỏng thanh toán.
- **Xác Minh Kiểm Thử 100% PASS**:
  - Cú pháp `node -c`: Đạt 100% trên toàn bộ các file đã chỉnh sửa.
  - `tests/test_vouchers_and_parser.js`: 12/12 PASS (100%).
  - `tests/test_pricing.js`: 13/13 PASS (100%).
  - `tests/test_task5_adaptive_screener_warranty.js`: Đạt 100% PASS (Smart Bypass, Choice Grid, Checkbox Grid, Screen-out, Bảo hành 1 đổi 1, Xuất CSV/JSON).
  - `tests/test_ledger_acid.js`: 6/6 PASS (100%).
  - `tests/test_bug_reports.js`: 7/7 PASS (100%).
  - `tests/test_response_review_and_edit.js`: 6/6 PASS (100%).
  - `tests/test_anti_fraud.js`: 8/8 PASS (100%).
  - `tests/test_api_endpoints.js`: 6/6 PASS (100%).

### Đảm Bảo Chất Lượng Toàn Diện & Chốt Chặn Kiểm Chuẩn (Giai Đoạn 4 - QA Specialist Gate - v3.9.5)
- **Kiểm tra cú pháp toàn diện**:
  - Chạy `node -c` trên toàn bộ 137 tệp JavaScript của dự án (thư mục `server/`, `public/`, `tests/`, `scripts/`).
  - Phát hiện và khắc phục lỗi cú pháp đóng chuỗi template string không hợp lệ trong `scripts/update_task2.js`.
  - Kết quả cuối cùng: 137/137 tệp đạt chuẩn cú pháp hợp lệ 100%.
- **Phát hiện & Khắc phục lỗi hồi quy (Regression Bugs Fixed)**:
  1. *Lỗi xung đột khóa chính câu hỏi*: Trong `server/repositories/surveyRepository.js`, hàm `createSurvey` sử dụng `q.id || crypto.randomUUID()` dẫn đến lỗi `UNIQUE constraint failed: questions.id` khi tạo nhiều bài khảo sát có cùng mã câu hỏi mẫu. Đã chuyển sang luôn sinh mã UUID mới cho câu hỏi `const qId = crypto.randomUUID()`.
  2. *Lỗi hiển thị cờ bẫy cho chủ sở hữu*: Trong `server/repositories/surveyRepository.js`, hàm `parseQuestionFromDb` chuyển `is_attention_check` sang kiểu boolean (`true/false`) làm lệch phép so sánh chặt `=== 1` ở phía client/test. Đã chuẩn hóa trả về số nguyên `(q.is_attention_check === 1 || q.is_attention_check === true) ? 1 : 0` cho chủ sở hữu và Admin.
  3. *Lỗi thông điệp xác thực tên miền email sinh viên*: Trong `server/controllers/authController.js`, hàm `sendStudentEmailOtp` thiếu phần mô tả đuôi tên miền hợp lệ `.edu.vn / .ac.vn` trong thông báo từ chối. Đã bổ sung chuẩn mực.
  4. *Lỗi thông điệp hạn mức gói dùng thử*: Trong `server/services/ledgerService.js`, hàm `lockEscrowForSurvey` cập nhật thông báo lỗi chứa chuỗi `tối đa 25 lượt phản hồi` khi người dùng chưa nạp đủ quỹ cho số lượng mẫu vượt quá 25.
  5. *Đồng bộ tham số đổi điểm nội bộ (Swap Points)*: Thống nhất tham số `MIN_SWAP_POINTS = 1000` (1.000 điểm = 1.000đ) trong `server/config/index.js` và đồng bộ các bài kiểm thử liên quan (`test_pricing.js`, `test_deposit_bonus.js`, `test_v25_security_audit.js`).
- **Thực thi 10 bộ kiểm thử cốt lõi (10/10 PASS 100%)**:
  1. `tests/test_pricing.js`: 13/13 bài PASS (Công thức CPI, SLA gom mẫu, Take Rate 35-50%, Creator Boost 80/20, Hoàn tiền Escrow an toàn).
  2. `tests/test_vouchers_and_parser.js`: 12/12 bài PASS (Catalog voucher, Tài trợ Zero Cash, Bóc tách biểu mẫu 12 định dạng, Whitelist chống SSRF, Đổi điểm sang Credit).
  3. `tests/test_task5_adaptive_screener_warranty.js`: 12/12 bài PASS (Smart Bypass, Choice/Checkbox Grid, Auto-Screener, Bảo hành mẫu 1 đổi 1, Xuất CSV/JSON).
  4. `tests/test_ledger_acid.js`: 6/6 bài PASS (Tính nguyên tử nạp tiền, Khóa Escrow, Chống Double Spend, Đối soát Sổ cái kép).
  5. `tests/test_anti_fraud.js`: 8/8 bài PASS (Speed trap, Attention check, Straight-lining, Bộ lọc tự luận, Trust score).
  6. `tests/test_bug_reports.js`: 7/7 bài PASS (Tải ảnh minh chứng, Gửi báo lỗi, Lịch sử người dùng, Admin cập nhật trạng thái, Gửi thông báo sự cố).
  7. `tests/test_cover_image_welcome.js`: 4/4 bài PASS (Lưu trữ ảnh bìa, Welcome flow, Tối ưu giao diện đáp viên).
  8. `tests/test_response_review_and_edit.js`: 6/6 bài PASS (Xem lại bài làm, Chỉnh sửa câu trả lời, Bảo toàn quỹ Escrow).
  9. `tests/test_api_endpoints.js`: 6/6 bài PASS (Đăng ký, Đăng nhập, Bóc tách câu bẫy khỏi đáp viên, Nộp bài và trả thưởng qua REST API).
  10. `tests/test_deposit_bonus.js`: 5/5 bài PASS (Thưởng nạp bậc thang 20k - 5M+, Tặng vé VIP, Rút tiền 1:1 VNĐ, Đổi điểm sang Credit).
- **Đồng bộ hóa nền tảng Android Capacitor**:
  - Chạy đồng bộ tài nguyên qua `node scripts/sync_capacitor.js`.
  - Kiểm tra đối sánh 67/67 tệp giữa `public/` và `android/app/src/main/assets/public/` đạt độ khớp chính xác 100% về kích thước byte.
- **Kiểm tra trạng thái máy chủ dịch vụ**:
  - Dừng tiến trình cũ và khởi động lại daemon server chạy mã nguồn mới nhất (`node server/app.js`).
  - Gửi yêu cầu kiểm tra tới cổng 3000: Tuyến `/health` trả về mã trạng thái HTTP 200 OK (`status: healthy`), tuyến gốc `/` trả về mã trạng thái HTTP 200 OK.
- **Dọn dẹp dữ liệu kiểm thử**:
  - Sử dụng `cleanAllTestData` dọn dẹp sạch sẽ toàn bộ tài khoản và khảo sát giả lập kiểm thử khỏi cơ sở dữ liệu `server/db/vibesurvey.db`, giữ hệ thống sẵn sàng vận hành thực tế.

### Nâng Cấp Toàn Diện Dashboard Admin, Biểu Đồ Trực Quan & Nhật Ký Kiểm Toán (Giai Đoạn 5 - v4.0.0)
- **Kiến trúc Frontend Modular `adminAnalyticsModule.js`**:
  - Tách toàn bộ logic giao diện biểu đồ SVG, phân hệ nhật ký kiểm toán và chế độ trình chiếu TV ra thành tệp độc lập `public/js/modules/adminAnalyticsModule.js`.
  - Nhúng module trong `public/index.html` trước `public/app.js` và mở rộng vào Namespace toàn cục qua `Object.assign(window.VibeApp, AdminAnalyticsModule)`.
  - Giữ nguyên cơ chế tương tác `onclick="VibeApp.func()"` trong toàn bộ cây DOM, loại bỏ nguy cơ phình tệp `public/app.js`.
- **Gia Cố Bảo Mật Helmet & Chuẩn Hóa Lệnh Vận Hành**:
  - Tích hợp Helmet CSP chặt chẽ trong `server/app.js`, cấu hình tương thích 100% với Tailwind CSS CDN, Lucide Icons, Google GIS, YouTube embed và WebView Capacitor Android.
  - Bổ sung 4 lệnh vận hành chuẩn trong `package.json`: `sync:android`, `lint`, `test:all`, `db:backup`.
  - Tự động sao lưu CSDL có gắn mốc thời gian qua `scripts/backup_db.js`, bảo vệ cả tệp dữ liệu chính, tệp WAL và SHM.
- **Technical Gotchas & Giải Pháp Kỹ Thuật Đặc Thù**:
  1. *Xử lý tỉ lệ khung hình `viewBox="0 0 800 240"` và tọa độ Gradient SVG*: Khi vẽ biểu đồ đường trong khung responsive, việc dùng tọa độ cố định 800x240 với `preserveAspectRatio="none"` cho phép thẻ `<svg>` tự động co giãn vừa khít 100% container cha trên mọi màn hình từ điện thoại di động đến TV 4K. Cần gán ID duy nhất cho thẻ `<defs><linearGradient>` để tránh lỗi trùng lặp ID khi re-render nhiều lần.
  2. *Bảo vệ ACID WAL và Ghi Log Tự Động khi duyệt/từ chối giao dịch*: Trong SQLite WAL mode, các thao tác duyệt/từ chối rút tiền hoặc nạp tiền nằm trong giao dịch ACID cần gọi `auditLogService.logAction` an toàn sau khi commit thành công để đảm bảo không làm gián đoạn hay rollback giao dịch tài chính nếu việc ghi log phát sinh ngoại lệ.
  3. *Đồng bộ chu kỳ làm mới tự động (Auto-refresh Timer 20s) và quản lý tài nguyên trong Fullscreen TV Mode*: Cần dọn dẹp biến `setInterval` trong sự kiện `fullscreenchange` khi người dùng thoát chế độ TV bằng phím Esc hoặc nút trình duyệt, tránh rò rỉ bộ nhớ (memory leak) và các yêu cầu mạng ngầm không cần thiết.
  4. *Tuân thủ 100% tiếng Việt và cấm tuyệt đối Emoji*: Toàn bộ nhãn hiển thị trên biểu đồ, tooltip, bảng kiểm toán và modal chi tiết đều sử dụng tiếng Việt thuần túy, định dạng số chuẩn Việt Nam (`vi-VN`), không sử dụng emoji, icon sticker màu sắc trong mã nguồn cũng như trên UI.
- **Xác Minh Kiểm Thử & Kiểm Tra Cú Pháp**:
  - Cú pháp `node -c`: Đạt 100% trên toàn bộ các tệp mới và tệp đã chỉnh sửa (`public/js/modules/adminAnalyticsModule.js`, `server/services/auditLogService.js`, `scripts/backup_db.js`, `scripts/sync_capacitor.js`, `server/app.js`, `server/db/database.js`, `public/app.js`, `server/controllers/adminController.js`, `server/routes/api.js`).
  - Đồng bộ tài nguyên Android: Chạy `npm run sync:android` sao chép đầy đủ 67/67 tệp sang `android/app/src/main/assets/public/` khớp byte 100%.
  - Máy chủ backend: Khởi động bình thường trên cổng 3000, tuyến `/health` phản hồi mã trạng thái HTTP 200 OK (`status: healthy`).
  - Kiểm thử tự hành toàn diện 15 tầng: Chạy `npm run test:all` (`node tests/run_all_tests.js`) đạt 15/15 Suites PASS (100.0%) trong 27.08 giây.
  - Kiểm tra 2 Endpoint Quản trị HTTP: `GET /api/v1/admin/analytics/trends` và `GET /api/v1/admin/audit-logs` xác thực bảo mật 401 khi không có token và trả về dữ liệu chuẩn mực HTTP 200 khi có Bearer token Admin.

### Kiểm Chuẩn Tự Động Toàn Diện Qua Chrome DevTools Protocol & Phòng Vệ CSS (Quality Gate Verification)
- **Tập Lệnh Kiểm Thử CDP Thực Tế (`scripts/verify_interactive_clicks.js`)**:
  - Khởi chạy trình duyệt Microsoft Edge Headless (`--headless=new`, `--window-size=1280,900`).
  - Kết nối qua giao thức Chrome DevTools Protocol (CDP) WebSocket và các domain `Runtime`, `Page`, `DOM`, `Input`.
  - Kiểm tra Hit-test tại tọa độ thực:
    + Nút Đăng Nhập (`#guest-auth-actions button:first-child`): PASS (isHit: true).
    + Nút Đăng Ký (`#guest-auth-actions button:last-child`): PASS (isHit: true).
    + Các tab Header Khảo Sát, Tạo Khảo Sát, Chợ Voucher (`#desktop-nav`): PASS (100% isHit: true).
    + Thẻ khảo sát trên trang chủ (`.survey-clean-card, .bento-card`): PASS (isHit: true).
    + Nút Báo Lỗi nổi ở góc dưới (`button[onclick*="openBugReportModal"]`): PASS (isHit: true).
  - Kiểm tra Luồng Tương Tác Thực Tế:
    + Mở modal Đăng Nhập qua dispatch click -> Xác nhận `#modal-container` mở ra (`display: flex`, không có class `hidden`), nút Đăng Nhập bên trong form `#auth-submit-btn` nhận hit-test chính xác: PASS.
    + Đóng modal Đăng Nhập qua dispatch click `#modal-card button[onclick*="closeModal"]` -> Xác nhận `#modal-container` đã ẩn hoàn toàn (`display: none`, có class `hidden`) và không còn backdrop che phủ màn hình: PASS.
    + Mở modal Báo Lỗi qua dispatch click -> Xác nhận `#bug-report-modal` mở ra (`display: flex`): PASS.
    + Đóng modal Báo Lỗi qua dispatch click `#bug-report-modal button[onclick*="closeBugReportModal"]` -> Xác nhận modal đã ẩn hoàn toàn (`display: none`, có class `hidden`): PASS.
  - Kiểm tra Phòng Vệ CSS (Defensive CSS Display):
    + Toàn bộ 8 modal hệ thống có class `hidden` đều mang computed style `display: none` tuyệt đối (100% compliant).
- **Phát Hiện & Xử Lý Sự Cố Cốt Lõi (Technical Gotchas & Resolution)**:
  1. *Khắc phục xung đột CSS `.hidden` với Tailwind Responsive Display Utilities*: Quy tắc `.hidden { display: none !important; }` trong `public/styles.css` vô tình đè lên các lớp thích ứng như `hidden md:flex` trên `#desktop-nav`. Đã bổ sung các quy tắc `@media (min-width: 640px)`, `@media (min-width: 768px)`, `@media (min-width: 1024px)` với `!important` cho `.sm:flex`, `.md:flex`, `.lg:flex`, `.sm:inline`... để vừa đảm bảo modal có class `hidden` luôn `display: none !important;`, vừa bảo toàn thanh điều hướng desktop hiển thị mượt mà.
  2. *Khắc phục chặn Inline Event Handlers của Helmet 8*: Helmet CSP mặc định gửi chỉ thị `script-src-attr 'none'`, khiến trình duyệt từ chối biên dịch toàn bộ thuộc tính `onclick`, `onsubmit` trong HTML. Đã cấu hình bổ sung `scriptSrcAttr: ["'unsafe-inline'"]` vào `server/app.js`, giúp toàn bộ các nút bấm và form SPA kích hoạt sự kiện trơn tru.
- **Xác Minh Chất Lượng Toàn Diện (Quality Gate)**:
  - Cú pháp `node -c`: Đạt 100% PASS trên `public/app.js`, `public/js/modules/customDropdown.js`, `public/js/modules/lightboxViewer.js`, `public/js/modules/bugReportModule.js`, `public/js/modules/adminAnalyticsModule.js`, `server/app.js`.
  - Bộ kiểm thử 15 tầng: `npm run test:all` đạt 15/15 test suites PASS 100% trong 27.18 giây.
  - Đồng bộ Capacitor Android: `npm run sync:android` hoàn tất sao chép 67/67 tệp sang `android/app/src/main/assets/public/`.

### Dọn Dẹp Dữ Liệu Demo & Chuẩn Hóa Cơ Sở Dữ Liệu Production (Giai Đoạn Hoàn Thiện)
- **Sao Lưu Cơ Sở Dữ Liệu An Toàn**: Đã chạy `npm run db:backup` tạo bản sao lưu toàn vẹn trước khi dọn dẹp tại `backups/vibesurvey_backup_20261031_002011.db` (kèm theo file WAL và SHM).
- **Kịch Bản Dọn Dẹp `scripts/clean_demo_data.js`**:
  - Bảo tồn duy nhất 3 tài khoản Admin cốt lõi (`trungdzid3@gmail.com`, `linharmykxbnvn@gmail.com`, `admin@vibesurvey.com`), reset số dư điểm `point_balance = 0` và số dư tiền `credit_balance = 0`.
  - Xóa sạch 100% dữ liệu khảo sát, câu hỏi, câu trả lời demo (`surveys`, `questions`, `responses`).
  - Xóa sạch 100% giao dịch tài chính, rút tiền, nạp tiền demo (`payout_requests`, `warranty_claims`, `deposit_orders`, `point_transactions`, `vat_invoices`).
  - Xóa sạch nhật ký hệ thống, báo lỗi, thiết bị và thông báo (`bug_reports`, `admin_audit_logs`, `notifications`, `email_notifications_log`, `device_ip_logs`, `push_subscriptions`, `daily_streaks`, `fraud_logs`, `banned_ips`, `registration_otps`).
  - Xóa các voucher tài trợ demo (`CREATOR_SPONSORED`), bảo toàn 6 danh mục voucher mẫu hệ thống (`PLATFORM_CATALOG`) với 150 mã khả dụng ở trạng thái `AVAILABLE`.
  - Thực thi `PRAGMA optimize` và `VACUUM` giải phóng hoàn toàn dung lượng tệp CSDL `vibesurvey.db`.
- **Kiểm Định Sau Dọn Dẹp**:
  - CSDL sạch sẽ: 3 tài khoản Admin, 0 survey, 0 responses, 0 giao dịch, 6 campaign voucher mẫu, 150 voucher codes khả dụng.
  - Cả 3 tài khoản Admin đăng nhập bình thường qua API với JWT hợp lệ.
  - Tuyến `http://localhost:3000/health` hoạt động ổn định (`status: healthy`).
  - Bộ kiểm thử tự hành 15 tầng (`npm run test:all`) tiếp tục đạt 15/15 Suites PASS (100.0%).

### Chuẩn Hóa Mobile Bottom Floating Nav Đối Xứng Hoàn Hảo (v4.3.0)
- **Bối Cảnh & Vấn Đề**:
  - Trên Mobile Bottom Floating Nav (`#mobile-bottom-nav`), danh sách `mobileItems` của Quản Trị Viên (Admin) chỉ có 4 phần tử nhưng nút số 3 lại là nút tròn cam FAB (`create-survey`, `isCenterAction: true`).
  - Do cấu trúc 4 phần tử không cân xứng (2 nút trái, 1 nút FAB lệch phải, 1 nút góc phải) và nút FAB thiếu container `flex-1`, thanh menu mobile bị xô lệch tọa độ nghiêm trọng.
- **Giải Pháp Triển Khai Trong `public/app.js` (renderNavigation)**:
  1. *Chuẩn hóa hệ 5 tabs đối xứng 2 - 1 - 2 cho Admin*:
     - Danh sách: `[admin-overview, surveys, create-survey (isCenterAction: true), creator-surveys, wallet]`.
     - Phân bổ: 2 nút bên trái (Quản Trị, Khảo Sát), 1 nút FAB tròn cam Tạo Khảo Sát ở chính giữa tâm đối xứng, 2 nút bên phải (Khảo Sát Của Tôi, Ví & Quỹ Sàn).
  2. *Cấu trúc Container `flex-1 min-w-0 flex justify-center items-center` đồng nhất*:
     - Toàn bộ các tabs (cả tab thường lẫn tab FAB giữa) đều được bọc trong container `flex-1 min-w-0 flex justify-center items-center`.
     - Đảm bảo mỗi vị trí chiếm chính xác 20% chiều rộng thanh dock (với 5 tabs) hoặc 25% (với 4 tabs), giữ khoảng cách giữa mọi icon đều chằn chặn.
     - Nút FAB tròn cam ở giữa được căn giữa trục đối xứng tuyệt đối (độ lệch = 0.0000px trên iPhone SE, 0.0156px trên Pixel 7).
     - Trạng thái active: Icon và vòng tròn nền hiển thị sắc sảo, không phình to hay làm lệch khung.
  3. *Rà soát toàn diện các vai trò khác*:
     - RESPONDENT (Người Điền): 5 tabs đối xứng 2 - 1 - 2, FAB Tạo Khảo Sát ở tâm đối xứng.
     - CREATOR (Doanh Nghiệp): 4 tabs phẳng chia đều 25%, khoảng cách đều nhau 100%.
     - GUEST (Khách Vãng Lai): 4 tabs phẳng chia đều 25%, khoảng cách đều nhau 100%.
- **Đo Đạc Thực Tế Qua Chrome DevTools Protocol (CDP)**:
  - *iPhone SE (375x667)*:
    + Nav Width: 351.00px | Tâm Nav: 187.50px
    + Tọa độ X tâm nút giữa: 187.50px | Độ lệch trục đối xứng: 0.0000px (Chuẩn tuyệt đối).
    + Khoảng cách giữa 5 nút liền kề: 65.80px | 65.80px | 65.80px | 65.80px (Đều 100%).
  - *Pixel 7 (412x915)*:
    + Nav Width: 388.00px | Tâm Nav: 206.00px
    + Tọa độ X tâm nút giữa: 205.98px | Độ lệch trục đối xứng: 0.0156px (<= 2px chuẩn mực).
    + Khoảng cách giữa 5 nút liền kề: 73.20px | 73.20px | 73.21px | 73.20px (Đều 100%).
- **Kiểm Định Chất Lượng Toàn Diện**:
  - `node -c public/app.js`: 100% PASS không lỗi cú pháp.
  - `npm test` (Bộ kiểm thử tự hành 15 tầng): 15/15 test suites PASS (100.0%).

### Tái Thiết Kế Biểu Trưng Chú Chó & Kính Lúp Rõ Nét 100% (v4.5.0)
- **Bối Cảnh Khắc Phục**:
  - Logo trước đó bị gò ép gắn một mấu nhọn ở sườn trái hình tròn để làm "mõm nghiêng" và 1 mắt ở giữa lòng kính, khiến thị giác người dùng nhìn vào giống "kính lúp có khối u" hoặc "quái vật một mắt", hoàn toàn không nhận ra được chú chó.
- **Giải Pháp Hình Học Gestalt Đối Xứng Hoàn Hảo**:
  - **Chú Chó Cưng 100% Rõ Nét**:
    + Hai tai cụp mềm mại vắt hai bên sườn đầu (dáng tai đặc trưng của giống chó săn trung thành như Labrador/Golden/Beagle).
    + Đôi mắt to tròn đen lay láy cân đối với 2 điểm bắt sáng catchlight trắng tinh khôi, tạo thần thái thông minh, trung thực.
    + Vùng mõm sáng bầu bĩnh cùng chiếc mũi tam giác bo góc tròn màu cam thương hiệu `#EA580C` ở vị trí trung tâm.
    + Nụ cười chữ W nhẹ nhàng, tạo thiện cảm và sự an tâm cho người dùng khảo sát.
  - **Kính Lúp Dữ Liệu 100% Rõ Nét**:
    + Vành tròn đầu cún đồng thời là vành thấu kính quang học hoàn hảo với nét viền 5.5px đầm tay, sắc nét.
    + Cán kính lúp dạng thanh capsule vát chéo 45 độ ở góc dưới bên phải, trang bị đai kim loại nhấn cam `#EA580C`.
    + Vệt phản quang quang học góc 10h tạo cảm giác thấu kính trong suốt đang soi tìm từng insight giá trị.
- **Bộ 3 Tệp Vector Hoàn Hảo**:
  - `public/logo-light.svg`: Bản vector cho Theme Sáng (`#FFFFFF` / `#09090B` / `#EA580C`).
  - `public/logo-dark.svg`: Bản vector cho Theme Tối (`#18181B` / `#FFFFFF` / `#EA580C` / `#222228`).
  - `public/logo.svg`: Bản vector thích ứng thông minh (Adaptive CSS `prefers-color-scheme`).
  - `public/test_dog_logo.html`: Trang kiểm chuẩn thị giác đa kích thước.
- **Đồng Bộ & Kiểm Định**:
  - Đã chạy `npm run sync:android` sao chép sang tài nguyên Android Native.
  - Toàn bộ 15/15 test suites đạt 100% PASS (`npm test`).

### Bản Địa Hóa Tiếng Việt 100% Có Dấu & Tái Thiết Kế Bộ Biểu Trưng Thương Hiệu (v4.6.0)
- **Bối Cảnh & Vấn Đề**:
  1. *Lỗi Tiếng Việt Không Dấu*: Người dùng phản ánh ảnh chụp màn hình modal "Báo Cáo Sự Cố & Góp Ý" và các thành phần liên quan bị hiển thị hoàn toàn bằng tiếng Việt không dấu (ví dụ: "Phan loai danh muc su co", "Lam Khao Sat", "Thiet Ke Khao Sat", "Vi & Nap Rut Tien", "Dang Nhap / Ho So", "Tieu de su co ngan gon", "Mo ta chi tiet & cac buoc tai hien loi", "Bam de chon anh tu may hoac keo tha vao day",...).
  2. *Yêu Cầu Bộ Nhận Diện Logo Ban Đầu*: Người dùng yêu cầu từ bỏ ý tưởng ép hình tượng chú chó và quay về biểu tượng cốt lõi ban đầu của VibeSurvey, đồng thời làm lại hoàn toàn theo chuẩn nhận diện mới nhất với đầy đủ phiên bản cho cả Light Theme và Dark Theme.
- **Giải Pháp Triển Khai**:
  1. *Bản Địa Hóa Tiếng Việt 100% Có Dấu Chuẩn Mực*:
     - `public/js/modules/bugReportModule.js`: Bản địa hóa toàn diện Form gửi báo cáo sự cố (danh mục, mức độ ảnh hưởng, tiêu đề, mô tả tái hiện, tải ảnh, thông số môi trường, nút hành động), Tab Lịch Sử Của Tôi, và Giao diện Quản trị viên xử lý sự cố. Toàn bộ Toast và Confirm dialogs đều được chuẩn hóa tiếng Việt có dấu, nghiêm ngặt không dùng emoji.
     - `public/js/modules/customDropdown.js`: Toàn bộ các danh mục sự cố (`Giao diện (UI/UX)`, `Làm Khảo Sát`, `Thiết Kế Khảo Sát`, `Ví & Nạp Rút Tiền`, `Đăng Nhập / Hồ Sơ`, `Sự Cố Khác`) và trạng thái (`Chờ tiếp nhận`, `Đang kiểm tra`, `Đã khắc phục`, `Đã đóng / Từ chối`) đều trả về tiếng Việt có dấu chuẩn xác theo SSOT.
  2. *Bộ Biểu Trưng Thương Hiệu Ban Đầu Được Nâng Cấp Chuẩn DESIGN.md*:
     - *Dấu tích chữ V (Survey Validation & Vibe)*: Tượng trưng cho hoàn thành khảo sát, xác thực dữ liệu chuẩn xác, thiết kế dày dặn với nét gân phản quang thủy tinh 3D tinh tế.
     - *3 Cột sóng nhịp điệu dữ liệu (Pulse Survey Data Bars)*: Gradient chuyển bậc thang chuẩn xác, bo góc đầu mịn, biểu trưng cho số liệu khảo sát dâng trào.
     - *Ngôi sao phần thưởng 4 cánh (Reward Diamond Star)*: Đặt tại đỉnh cánh phải chữ V với tâm sáng trắng, biểu trưng cho phần thưởng, thu nhập và voucher quà tặng.
     - `public/logo-light.svg`: Bản Light Theme trên nền Squircle trắng `#FFFFFF` viền `#E4E4E7`, tông cam Sunset Orange ấm áp `#EA580C` / `#F97316`.
     - `public/logo-dark.svg`: Bản Dark Theme trên nền Squircle than Obsidian `#1E1E24` -> `#121214` viền `#2E2E36`, hào quang ambient cam huyền bí.
     - `public/logo.svg`: Bản Adaptive CSS tự động thích ứng với `@media (prefers-color-scheme: dark)`.
     - `public/test_brand_logo.html`: Trang kiểm chuẩn thị giác song song 2 theme trên mọi dải kích thước (16px, 24px, 32px, 64px, 128px, 512px).
- **Đồng Bộ & Kiểm Thử Toàn Diện**:
  - Đã chạy `npm run sync:android` đồng bộ toàn bộ tài nguyên Web sang ứng dụng Android Native.
  - Cú pháp `node -c`: Toàn bộ 5 tệp liên quan PASS 100%.
  - Bộ kiểm thử tự hành 15 tầng (`npm test`): Đạt 15/15 test suites PASS (100.0%).

### Tái Cấu Trúc Bảng Quản Trị Báo Cáo Sự Cố Admin: Xóa Bỏ Chữ Chèn Che Lấn & Tối Ưu Tỉ Lệ Bảng Biểu (v4.6.1)
- **Vấn Đề Phát Hiện**:
  - Người dùng phản ánh ảnh chụp màn hình bảng Báo Cáo Sự Cố Admin (`renderAdminBugReportsView` trong `public/js/modules/bugReportModule.js`): Chữ bị chèn che nhau nghiêm trọng, giao diện hiển thị tham lam khi nhồi nhét cả nút "Xem" lẫn thumbnail trong một ô hẹp.
  - Nút "Xem" (icon mắt + chữ Xem) bị đẩy tràn lấn sang cột "TRẠNG THÁI", đè trực tiếp lên badge "Đã khắc phục".
  - Bảng không cố định độ rộng cột, thiếu `min-w` và `align-middle`, dẫn đến xô lệch khi co giãn màn hình.
- **Giải Pháp Triển Khai Chuẩn UI/UX Cao Cấp**:
  1. *Cột Minh Chứng Tinh Gọn*:
     - Thu nhỏ thumbnail xuống `w-8 h-8` bo góc `rounded-lg`, viền mờ `border-stone-200 dark:border-stone-800`, đặt căn giữa cột (`text-center`).
     - BỎ HOÀN TOÀN chữ "Xem" và button thừa thãi bên cạnh, loại bỏ 100% tình trạng tràn lấn sang cột bên.
     - Tích hợp lớp phủ hover tinh tế trên thumbnail: khi di chuột hiển thị icon kính lúp nhỏ `zoom-in` trên nền mờ `bg-black/40` và tooltip `title="Bấm để phóng to ảnh"`.
     - Nhấp chuột trực tiếp vào thumbnail kích hoạt `VibeApp.previewFullImage(...)` mở qua In-App Lightbox Viewer.
     - Khi không có ảnh: hiển thị text `-` căn giữa màu `text-stone-400 font-mono text-xs`.
  2. *Quy Định Chiều Rộng Cố Định & Cân Đối Bảng Biểu*:
     - Bọc bảng trong `<div class="overflow-x-auto">` với `<table class="w-full text-left text-xs min-w-[760px]">`.
     - Cột "MÃ & THỜI GIAN": `w-28 whitespace-nowrap align-middle`.
     - Cột "DANH MỤC / MỨC ĐỘ": `w-36 whitespace-nowrap align-middle`.
     - Cột "TIÊU ĐỀ & NỘI DUNG": cho phép co giãn tự nhiên `min-w-[200px] max-w-xs align-middle`.
     - Cột "NGƯỜI BÁO": `w-40 whitespace-nowrap align-middle`.
     - Cột "MINH CHỨNG": căn giữa `w-24 text-center whitespace-nowrap align-middle`.
     - Cột "TRẠNG THÁI": căn giữa `w-32 text-center whitespace-nowrap align-middle`.
     - Cột "THAO TÁC": căn phải `w-24 text-right whitespace-nowrap align-middle`.
  3. *Tối Ưu Modal Chi Tiết Sự Cố Admin (`openAdminBugDetailModal`)*:
     - Chuẩn hóa nút "Phóng to toàn màn hình" với icon `maximize-2`, đồng bộ tiêu đề và hover effect.
- **Đồng Bộ & Kiểm Định**:
  - Kiểm tra cú pháp: `node -c public/js/modules/bugReportModule.js` và `node -c public/app.js` PASS 100%.
  - Đồng bộ Capacitor Android: `npm run sync:android` hoàn tất thành công.
  - Toàn bộ 15/15 test suites đạt 100% PASS (`npm test`).### Tái Thiết Kế Thẻ Quà Tặng & Voucher Kèm Theo & Phân Quyền Độc Quyền Cho Doanh Nghiệp (v4.6.2)
- **Bối Cảnh & Vấn Đề Người Dùng Phản Ánh**:
  1. *Thiết kế thô kệch (Card 3: Quà Tặng & Voucher)*: Tiêu đề viết hoa đậm quá cỡ `font-black uppercase`, checkbox vuông mặc định của trình duyệt thô kệch, badge "Gấp 2X Gom Mẫu" vuông vức cục mịch, khung gợi ý nét đứt nhợt nhạt như bản vẽ dở dang.
  2. *Quy chế phân quyền*: Tính năng đính kèm E-Voucher quà tặng (tự cấp mã riêng 0đ phí hoặc mua từ kho sàn) CHỈ DÀNH RIÊNG CHO DOANH NGHIỆP (Tài khoản ENTERPRISE hoặc Admin ở góc nhìn Doanh Nghiệp), tuyệt đối không mở cho tài khoản Cá nhân hay Sinh viên.
- **Giải Pháp Triển Khai Chuẩn SSOT**:
  1. *Phân Quyền Client-Side (public/app.js)*:
     - Sử dụng hàm kiểm tra chuẩn `this.isEnterpriseUser()`.
     - Thêm alias `switchAdminViewMode(mode)` gọi sang `switchAdminMode(mode)`.
     - Trong `toggleStudioVoucher(isChecked)`: Chặn ngay nếu `!this.isEnterpriseUser()`, đặt `studioHasVoucher = false` và hiển thị Toast thông báo quy chế.
     - Trong `calculateStudioEscrow()`: Chỉ tính chi phí voucher khi `this.isEnterpriseUser() && this.state.studioHasVoucher === true`.
     - Trong hàm nộp/xuất bản khảo sát: Tự động xóa `voucherPayload` nếu tài khoản không phải Doanh Nghiệp.
  2. *Tái Thiết Kế Giao Diện Card 3 Chuẩn DESIGN.md*:
     - Tiêu đề: Chuẩn hóa `text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-white flex items-center gap-2` kèm icon Lucide `gift` màu cam.
     - *Trường hợp không phải Doanh Nghiệp (`!isEnterpriseUser()`)*:
       + Hiển thị Thẻ Gate Độc Quyền sang trọng: Badge `Đặc Quyền Doanh Nghiệp` (icon `lock`), tiêu đề con "Đính kèm E-Voucher quà tặng tài trợ", badge "Gấp 2X Gom Mẫu" bo góc mềm mại.
       + Mô tả: "Tính năng đính kèm E-Voucher quà tặng (Shopee, Grab, Highlands hoặc voucher riêng) giúp tăng tốc độ thu thập mẫu gấp 2 lần, độc quyền dành cho Tài khoản Doanh Nghiệp (Enterprise Research)."
       + Nút CTA chuyển đổi:
         * Nếu là Admin: Nút "Chuyển sang Góc Nhìn Doanh Nghiệp" (`VibeApp.switchAdminViewMode('CREATOR')`).
         * Nếu là Sinh Viên / Cá Nhân: Nút "Nâng Cấp Gói Doanh Nghiệp" (`VibeApp.navigate('profile')`).
       + Tuyệt đối không có checkbox/toggle để người dùng thường tick bật.
     - *Trường hợp là Doanh Nghiệp (`isEnterpriseUser()`)*:
       + Bento Card cao cấp với Toggle Switch dạng iOS / Bento bo tròn tinh tế thay cho checkbox thô kệch.
       + Badge trạng thái "Đang Bật" hoặc "Tùy Chọn" bo góc mềm mại.
       + Badge "Gấp 2X Gom Mẫu" bo góc tròn màu cam thương hiệu.
       + Khi Bật: Segmented control chọn "Tự Thêm Voucher Riêng (0đ phí sàn)" hoặc "Mua Voucher Từ Sàn (Catalog)". Các input form bo góc `rounded-xl`, viền mảnh `border-stone-200 dark:border-stone-700`, typography rõ ràng, không dùng thẻ select nguyên thủy.
       + Khi Tắt: Hộp callout nhẹ nhàng với icon `info` màu cam.
  3. *Ràng Buộc Chặt Chẽ Backend API (server/controllers/surveyController.js)*:
     - Trong cả `createSurvey` và `updateSurvey`: Nếu nhận payload có `voucher_data` hoặc `reward_mode === 'HYBRID_POINTS_AND_VOUCHER'`, kiểm tra nghiêm ngặt `user.role === 'CREATOR' || user.role === 'ADMIN' || user.account_tier === 'ENTERPRISE'`. Nếu không thỏa mãn, trả về HTTP 403 Forbidden kèm thông điệp: "Tính năng đính kèm E-Voucher quà tặng chỉ hỗ trợ gói tài khoản Doanh Nghiệp (Enterprise)."
- **Đồng Bộ & Kiểm Tra Cú Pháp**:
  - `node -c public/app.js`: PASS.
  - `node -c server/controllers/surveyController.js`: PASS.
  - `npm run sync:android`: Hoàn tất đồng bộ Web sang Capacitor Android Native.




### Tối Ưu Typography Toàn Diện & Tái Thiết Kế Bento Grid Khảo Sát 2 Cột Ngang Hàng (v4.6.3)
- **Bối Cảnh & Vấn Đề Người Dùng Phản Ánh**:
  1. *Lỗi Typography in đậm ở khu vực nhỏ*: Font Montserrat kết hợp `font-weight: 900` (`font-black`) và letter-spacing âm ở các nhãn, badge, heading thẻ nhỏ (như `text-xs font-black uppercase`) làm nét chữ bị bết dính sát vào nhau, bít lỗ các chữ cái tiếng Việt có dấu.
  2. *Bố cục thẻ Khảo sát xấu và choán chỗ*: Thẻ Cột 1 (Số Dư & Đổi Thưởng) và Thẻ Cột 2 (Điểm Danh) xếp thành 2 hàng dọc liên tiếp, nhiều câu văn xuôi dông dài ("Làm khảo sát tích lũy điểm...", "Bạn đã duy trì chuỗi..."), nút "Đã Điểm Danh" to bè xám xịt chiếm trọn hàng đáy, thanh tiến độ mỏng như que tăm, thiếu tính thẩm mỹ.
- **Giải Pháp Triển Khai Chuẩn SSOT**:
  1. *Tối Ưu Typography Toàn Hệ Thống (`public/styles.css` & `public/app.js`)*:
     - Giới hạn `font-weight: 900` (`font-black`) và `letter-spacing: -0.025em;` CHỈ cho tiêu đề Display lớn (>= 24px).
     - Áp dụng quy tắc override toàn cục cho nhãn, badge, heading nhỏ (`.text-xs.font-black`, `.text-sm.font-black`,...): Chuyển về `font-weight: 700 !important; letter-spacing: 0.03em !important;`.
     - Với chữ in hoa nhỏ (`.uppercase.text-xs`, `.uppercase.text-sm`,...): Tăng khoảng cách chữ `letter-spacing: 0.04em !important;` giúp các ký tự tiếng Việt có dấu luôn thông thoáng, sắc cạnh, không bít lỗ chữ.
     - Cập nhật toàn bộ các tiêu đề thẻ card trong Studio sang `.studio-card-title text-xs font-bold uppercase tracking-wider`.
  2. *Tái Thiết Kế Bento Grid Giao Diện Khảo Sát (`public/app.js`)*:
     - Đặt 2 thẻ vào **Bento Grid 2 cột ngang hàng (`grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5`)**, chiều cao cân đối `h-full flex flex-col justify-between`.
     - *Cột 1 (Thẻ Số Dư & Tiến Độ Đổi Thưởng)*:
       + Header: Icon ví viền cam mềm, nhãn `SỐ DƯ TÍCH LŨY` và lời chào ngắn gọn `Chào [Tên]`, kèm nút liên kết `Ví & Rút ->`.
       + Hero KPI: Số dư hiển thị to rõ nét font mono font-black (`50đ (50 Point)`).
       + Thanh đo tiến độ: Thanh progress bar dày dặn 10px bo tròn, gradient cam hổ phách mềm mại (`from-orange-500 to-amber-500`), hiển thị chính xác tiến độ đổi thẻ cào 10K/50K và số tiền còn thiếu.
       + Loại bỏ hoàn toàn các câu văn xuôi giải thích dài dòng.
     - *Cột 2 (Thẻ Chuỗi Điểm Danh 7 Ngày Trực Quan)*:
       + Header: Icon ngọn lửa, nhãn `CHUỖI ĐIỂM DANH`, huy hiệu `Đã nhận hôm nay` hoặc nút bấm `Điểm Danh Ngay` tinh gọn.
       + Hero KPI: Số ngày chuỗi liên tục to rõ (`1 Ngày Liên Tục`) kèm liên kết mở modal Lộ trình.
       + Dải 7 ngày tương tác trực quan (7-Day Interactive Streak Track): Tích hợp 7 ô nhỏ gọn (T1 -> T7) trực tiếp trên mặt thẻ. Ô đã điểm danh có viền xanh checkmark, ô hôm nay có viền cam nổi bật, ô mốc tuần có icon hộp quà `gift`. Bấm vào bất kỳ ô nào cũng mở modal Lộ trình điểm danh chi tiết.
  3. *Đồng Bộ & Kiểm Định Chất Lượng (Quality Gate)*:
     - Kiểm tra cú pháp: `node -c public/app.js` và `node -c server/controllers/surveyController.js` PASS 100%.
     - Đồng bộ Capacitor Android: `npm run sync:android` hoàn tất sao chép sang `android/app/src/main/assets/public/`.
     - Kiểm thử tự hành: Toàn bộ 15/15 test suites đạt 100% PASS (`npm test`).

- **Khởi động Máy chủ**: Máy chủ VibeSurvey đã được khởi động chạy ngầm (Daemon) tại `http://localhost:3000`. Đã kiểm tra phản hồi HTTP 200 OK sẵn sàng phục vụ.

### Tinh Chỉnh Thu Nhỏ & Liền Mạch Bento Grid Giao Diện Khảo Sát (Seamless Bento Grid - v4.6.4)
- **Bối Cảnh & Vấn Đề Người Dùng Phản Ánh**:
  1. *Thẻ quá cao, padding dày*: Padding `p-4 sm:p-5` tạo quá nhiều khoảng trống rỗng dọc (dead space), khiến người dùng phải cuộn nhiều mới tới danh sách bài khảo sát.
  2. *Chia cắt vụn vặt thô kệch*: Các đường kẻ ngang `border-b` và `border-t` chia cắt thẻ thành 3 khúc hộp con như ngăn kéo tủ, mất đi tính liền mạch của phong cách Bento Modern.
  3. *Typography số liệu thô quá cỡ*: Số '50đ' và '1' dùng `text-3xl font-black` tạo cảm giác nặng nề, mất cân đối với biểu tượng 32px.
  4. *Dải 7 ngày chuỗi điểm danh*: Các ô vuông cao thô, thiếu sự tinh xảo.
- **Giải Pháp Triển Khai Chuẩn SSOT (public/app.js)**:
  1. *Mật Độ Hiển Thị & Tối Giản Chiều Cao*:
     - Thu gọn padding xuống `p-3.5 sm:p-4`, chiều cao tổng thể thẻ giảm ~30-35% (khoảng 125-135px), loại bỏ 100% dead space.
     - Xóa bỏ triệt để các đường viền chia cắt `border-b` và `border-t` bên trong thẻ, thay bằng phân cấp khoảng cách âm bản thanh lịch (`space-y-2.5` và `space-y-2`).
  2. *Cột 1 (Số Dư Tích Lũy & Tiến Độ Đổi Thưởng)*:
     - Header: Icon ví viền cam gọn gàng (`w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600 flex items-center justify-center`, icon `w-3.5 h-3.5 stroke-[2.2]`), nhãn `SỐ DƯ TÍCH LŨY` (`text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider`), nút liên kết `Ví & Rút` kèm icon `chevron-right` tinh tế.
     - Hero KPI: Số dư hiển thị vừa vặn, thanh lịch (`text-xl sm:text-2xl font-bold font-mono tracking-tight text-stone-900 dark:text-white`) kèm nhãn nhẹ `(${curPoints} Point)`.
     - Tiến độ đổi thưởng: Thiết kế liền mạch không viền cắt, 1 dòng tóm tắt thông số và phần trăm `Tiến độ: ${targetPayoutLabel} (${cond})` cùng `${goalPercent}%` font mono font-bold text-orange-600; thanh progress bar bo tròn mềm mại h-2 với fill gradient cam hổ phách.
  3. *Cột 2 (Chuỗi Điểm Danh & Dải 7 Ngày Tương Tác)*:
     - Header: Icon ngọn lửa gọn gàng (`w-7 h-7 rounded-lg bg-orange-500/10 text-orange-600`), nhãn `CHUỖI ĐIỂM DANH`, bên phải là badge `Đã nhận hôm nay` nhỏ gọn hoặc nút bấm `Điểm Danh Ngay` (`h-7 px-3 text-xs font-semibold bg-orange-600 hover:bg-orange-700 text-white rounded-lg`).
     - Hero KPI: Số ngày chuỗi liên tục vừa vặn (`text-xl sm:text-2xl font-bold font-mono tracking-tight`) kèm nhãn `Ngày Liên Tục`, nút liên kết `Lộ trình >` mở modal.
     - Dải 7 ngày tương tác trực quan (7-Day Micro Strip): 7 ô nhỏ gọn bo góc mềm `rounded-lg`, chiều cao thu gọn `h-8.5 sm:h-9`, padding vừa vặn; hiển thị icon checkmark cho ngày đã nhận, nền cam đậm nổi bật cho ngày hôm nay, icon quà tặng `gift` cho mốc ngày 7.
  4. *Đồng Bộ Hóa Thẻ Doanh Nghiệp & Khách Vãng Lai*:
     - Cả 2 thẻ Doanh Nghiệp (Quỹ Khảo Sát & Phân Phối Hỏa Tốc) và 2 thẻ Khách Vãng Lai (Cộng Đồng Khảo Sát & Quà Chào Mừng) đều được chuyển đổi cùng form factor, padding `p-3.5 sm:p-4`, bỏ toàn bộ viền cắt `border-b`/`border-t`, nút bấm h-7 tinh gọn.
  5. *Đồng Bộ & Kiểm Định Chất Lượng (Quality Gate)*:
     - Kiểm tra cú pháp: `node -c public/app.js` PASS 100%.
     - Đồng bộ Capacitor Android: `npm run sync:android` hoàn tất sao chép sang `android/app/src/main/assets/public/`.
     - Cập nhật cache buster: `v=4.6.4_1793420000` trong `public/index.html`.


### Hiện Thực Hóa 100% Bản Vẽ Đề Xuất & Tích Hợp Đồ Họa 3D Thực Tế (v4.7.1)
- **Bối Cảnh & Phản Hồi Từ Người Dùng**:
  + Người dùng cung cấp trực tiếp 2 ảnh bản vẽ đề xuất mẫu (`media_1793420038160_3cf361de.png` cho Trang Khảo Sát và `media_1793420284942_7dede78e.png` cho Trang Ví & Rút Tiền), kèm quy tắc lọc UX trong `media_1793419988103_3a63a6c0.png`.
  + Người dùng yêu cầu: "tạo y hệt, từ các hình nền phía sau chứ không chỉ tạm bợ" -> Đòi hỏi các asset 3D (ví da cam 3D, hộp quà 3D, coin vàng 3D, kính lúp 3D) phải chân thực, sắc nét 100% theo bản vẽ, không dùng hình vẽ SVG vector phẳng giả lập.
- **Giải Pháp Triển Khai Thực Tế Chuẩn SSOT**:
  1. *Trích xuất & Xử lý Asset 3D Chân Thực (`public/assets/3d/`)*:
     - Dùng Python Pillow phân tích và trích xuất trực tiếp các cụm đồ họa 3D từ chính bức ảnh thiết kế gốc của người dùng:
       + `gift_box_survey_clean.png`: Hộp quà 3D màu cam pastel thắt ruy băng nơ mềm cho Thẻ Số Dư (đã tách nền trong suốt chuẩn alpha feathering).
       + `gift_box_streak_clean.png`: Hộp quà 3D màu cam pastel cho Thẻ Điểm Danh.
       + `empty_state_3d_clean.png`: Cụm minh họa Bảng tài liệu 3D + Kính lúp cam 3D + Đám mây + Tia sáng cho Khối Trống Rỗng (tách nền trong suốt chuẩn mực).
       + `wallet_orange_3d_feathered.png`: Chiếc ví da 3D màu cam có cúc ngôi sao vàng dập nổi và ngôi sao phát sáng cho Thẻ POINT CỦA BẠN (feathering mép hòa quyện hoàn hảo với nền gradient cam Sunset).
       + `coins_coupon_3d_clean.png`: Chồng đồng xu vàng 3D và tấm vé Coupon % cam pastel cho Thẻ CREDIT (tách nền trong suốt chuẩn mực).
  2. *Tái Cấu Trúc Trang Khảo Sát (`renderSurveysView` trong `public/app.js`)*:
     - 2 Thẻ Bento Trên Cùng: Đặt ảnh 3D thật phía sau góc phải, hiển thị số dư, tiến độ và chuỗi 7 ngày T1-T7 bo góc mềm `rounded-xl` y hệt bản vẽ.
     - Thanh Lọc Hàng 1: Container trắng bo tròn viên thuốc bọc cả Ô tìm kiếm `Tìm kiếm khảo sát...` và Dải Category Pills `Tất cả (0)`, `Thưởng cao`, `Làm nhanh`, `Dưới 10 câu`, `Voucher` trên cùng 1 hàng.
     - Thanh Lọc Hàng 2: Dropdown `Sắp xếp: Mới nhất`, Toggle switch iOS `Hiện bài đã làm` và Segmented view switcher Lưới/Danh sách.
     - Khối Empty State: Minh họa 3D Clipboard & Magnifier chuẩn xác kèm nút viên thuốc viền cam `Xóa bộ lọc`.
  3. *Tái Cấu Trúc Trang Ví & Rút Tiền (`renderWalletView` trong `public/app.js`)*:
     - Header: Icon ví cam, tiêu đề `Ví & Rút Tiền` và Breadcrumbs `/ Ví & Rút Tiền`.
     - Thẻ 1 (Trái): POINT CỦA BẠN với nền cam Sunset gradient, chiếc ví da 3D màu cam, số dư `50 Point (≈ 50 VNĐ)`, thanh đo tiến độ rút 10K có cờ mục tiêu, nút `Đổi thưởng / Rút tiền`.
     - Thẻ 2 (Phải): CREDIT với nền trắng, chồng coin vàng 3D và vé coupon %, số dư `Credit`, nút `Nạp Credit`.
     - Khối Lịch sử giao dịch: Tabs phân loại, dropdown 30 ngày gần đây, danh thiếp giao dịch phẳng.
     - Khối Sổ cái giao dịch: Accordion thu gọn/mở rộng, badge Minh bạch, bảng đối soát giao dịch chi tiết.
  4. *Kiểm Định Chất Lượng & Đồng Bộ*:
     - Cú pháp: `node -c public/app.js` PASS 100%.
     - Đồng bộ Capacitor Android: `npm run sync:android` hoàn tất sao chép thư mục `public/assets/3d/` và mã nguồn sang `android/app/src/main/assets/public/`.
     - Bộ kiểm thử tự hành 15 tầng: 15/15 test suites đạt 100% PASS (`npm test`).


### Vá Lỗ Hổng Tự Động Gửi Email OTP Thật Khi Chạy Test & Chặn Bot Spam IP (v4.6.5)
- **Bối Cảnh & Vấn Đề Người Dùng Phản Ánh**:
  + Người dùng phát hiện Gmail liên tục nhận được email mã xác minh OTP và thông báo xác thực bảo mật 2 bước từ Google trong lúc ngủ.
  + Nguyên nhân xác định: Hệ thống có bộ kiểm thử tự động 15 tầng (`tests/run_all_tests.js`). Khi chạy các bài test như `test_otp_cooldown.js`, `test_hybrid_all_in_one_account.js`, các hàm gửi mã OTP (`sendRegistrationOtp`, `sendStudentEmailOtp`) không kiểm tra môi trường test, vẫn kích hoạt `sendSmartEmail` kết nối trực tiếp socket TLS tới `smtp.gmail.com:465` với tài khoản người dùng trong `.env`.
  + Hàng chục email test gửi đến các địa chỉ giả lập/không tồn tại (`@example.com`, `sis.hust.edu.vn`) làm máy chủ Gmail từ chối (bị dội thư Mail Delivery Subsystem) và khiến Google kích hoạt cảnh báo đăng nhập lạ / yêu cầu xác minh 2FA liên tục.
- **Giải Pháp Triển Khai Chuẩn SSOT**:
  1. *Lớp Chặn Mock Email Dispatcher (`server/services/notificationService.js`)*:
     - Thêm phương thức `isTestOrMockEmail(email)`: Tự động nhận diện các email thuộc bộ test (`@example.com`, `@vibetest.vn`, `@vibe-personal.com`, `test`, `dummy`, `mock`, `sinhvien_`,...) hoặc khi biến môi trường `NODE_ENV === 'test'` / `DISABLE_REAL_EMAIL === 'true'`.
     - Trong `sendSmartEmail`: Tự động chặn 100% việc kết nối ra ngoài Internet gửi thật đối với các email test, ghi log mock an toàn `[MOCK EMAIL DISPATCHER]` và trả về `{ success: true, mode: 'MOCK_TEST_SKIPPED' }`.
  2. *Chặn Spam Tần Suất Theo IP (`server/controllers/authController.js`)*:
     - Thêm bộ nhớ đệm `registrationIpRateLimiter`: Giới hạn tối đa 5 yêu cầu gửi OTP trong vòng 10 phút từ cùng 1 địa chỉ IP khách vãng lai, ngăn chặn triệt để bot tự động quét API trên môi trường mạng public.
     - Xử lý trả về `debugOtp` cho môi trường test và thông báo rõ `[Chế độ Thử Nghiệm]` khi chạy mock.
  3. *Thiết Lập Môi Trường Test Chuẩn (`tests/run_all_tests.js`)*:
     - Thiết lập cờ `NODE_ENV: 'test'` và `DISABLE_REAL_EMAIL: 'true'` cho mọi tiến trình con (forked child processes).
  4. *Kiểm Định Chất Lượng (Quality Gate)*:
     - Kiểm tra cú pháp: `node -c server/services/notificationService.js`, `node -c server/controllers/authController.js`, `node -c tests/run_all_tests.js` đều đạt PASS 100%.
     - Kiểm thử thực tế: `node tests/test_otp_cooldown.js` và `node tests/test_hybrid_all_in_one_account.js` chạy thành công 100% (17/17 PASS) mà không hề phát sinh bất kỳ kết nối socket nào ra `smtp.gmail.com`.
     - Khởi động lại dịch vụ backend Daemon tại `http://localhost:3000` với mã nguồn mới.


---

### Khắc Phục Triệt Để Chữ Bóng Ma Đồ Họa 3D & Nâng Cấp Toggle Switch Studio (v4.7.6)
- **Bối Cảnh & Phản Hồi Từ Người Dùng**:
  + Người dùng cung cấp trực tiếp 2 ảnh bản vẽ đề xuất mẫu gốc (`media_1793427478588_86adb98b.png` và `media_1793427472447_ac119c52.png`).
  + Phản ánh hiện tượng:
    1. Khi cắt từ ảnh mẫu trước đây bị dính chữ mờ ("Point", "Credit", "0,5%", "1%", "Nạp Credit"), thanh tiến độ bị đè lồng ghép, hoặc khi vẽ bằng vector/AI thì hình dáng ví và đồng xu bị sai lệch so với bản mẫu.
    2. Nút Toggle Switch "Bắt buộc" và "Yêu cầu trong mỗi hàng" ở Studio Tạo khảo sát khi bật bị kẹt ở lưng chừng giữa thanh gạt, không trượt sát sang mép phải như nút "Hiện bài đã làm".
- **Giải Pháp Triển Khai Chuẩn SSOT**:
  1. *Xử lý Đồ Họa 3D Chuyên Sâu (`public/assets/3d/`)*:
     - Trích xuất từ 2 ảnh mẫu gốc, kết hợp inpainting loại bỏ 100% chữ rác và thanh tiến độ thừa:
       + `wallet_3d_clean.png` (và `wallet_3d_master.png`): Chiếc ví da 3D màu cam, quai xách cong, cúc sao vàng dập nổi, đồng xu vàng mờ chìm phía sau, các ngôi sao lấp lánh; loại bỏ sạch số "0,5%" và thanh bar, feathering 4 mép hòa quyện nền cam mượt mà.
       + `coins_coupon_3d_clean.png` (và `coins_coupon_3d_master.png`): Chồng 3 đồng xu vàng 3D, vé coupon % màu cam nghiêng có 2 lỗ khuyết và thẻ trắng in dấu % ở giữa; tách nền trắng sang alpha trong suốt (transparent RGBA), loại bỏ 100% nút "Nạp Credit" và chữ "Credit".
       + `empty_state_3d_clean.png` (và `empty_state_3d_master.png`): Bảng tài liệu 3D viền trắng + kẹp kim loại + kính lúp 3D bóng + cụm mây kem + 3 tia sáng cam; tách nền trong suốt, loại bỏ 100% dòng chữ "Không tìm thấy khảo sát...".
       + `gift_box_pastel_clean.png` (và `gift_box_3d_master.png`): Hộp quà 3D cam pastel thắt nơ; tách nền trong suốt, loại bỏ 100% số "1%" và nút lọc.
  2. *Bảo Vệ Tương Tác Click Giao Diện (`public/app.js`)*:
     - Toàn bộ các thẻ `<img>` đồ họa 3D được gắn thuộc tính `pointer-events-none select-none z-0`, đảm bảo tuyệt đối không cản trở việc click vào các nút "Đổi thưởng / Rút tiền", "+ Nạp Credit", v.v.
  3. *Chuẩn Hóa Toggle Switch Studio Tạo Khảo Sát*:
     - Thay thế pseudo-element `peer-checked:after:translate-x-4` bằng cấu trúc button tiêu chuẩn đồng nhất với nút "Hiện bài đã làm":
       `<button type="button" class="w-9 h-5 rounded-full relative focus:outline-none p-0.5 ...">` kết hợp nút tròn `<span class="block w-4 h-4 rounded-full bg-white transition-transform duration-200 transform ${isReq ? 'translate-x-4' : 'translate-x-0'}"></span>`.
     - Khi bật, nút tròn trượt sát sang mép phải 100% (cách mép đúng 2px), chuyển động mượt mà.
  4. *Kiểm Định Chất Lượng (Quality Gate)*:
     - Cú pháp: `node -c public/app.js` PASS 100% (mã thoát 0).
     - Bộ kiểm thử 15 tầng: 15/15 test suites đạt 100% PASS (`npm test`, 21.40 giây).
     - Đồng bộ Capacitor Android: `npm run sync:android` thành công.
     - Cache-buster: Nâng lên `v=4.7.6_1793430341086` trong `public/index.html`.


---

### Tối Ưu Hóa Đồ Họa 3D Thích Ứng Đa Giao Diện Light/Dark Mode & Chuẩn Hóa Lịch Sử Giao Dịch (v4.7.7)
- **Bối Cảnh & Phản Hồi Từ Người Dùng**:
  + Người dùng kiểm tra ở chế độ Dark Mode và phát hiện:
    1. Thẻ Credit bị một mảng sáng trắng đục xấu xí bao quanh do ảnh cắt có white halo.
    2. Hộp quà ở thẻ Số dư tích lũy & Chuỗi điểm danh bị nguyên một khối trắng đục che phủ các ô ngày T6-T7.
    3. Chiếc ví ở thẻ Point hơi nhỏ và bị viền hộp.
    4. Phần Lịch sử giao dịch chưa phân loại icon rõ ràng theo từng loại giao dịch, các cột chưa thẳng hàng.
    5. Người dùng chỉ thị: "Cho phép bạn tạo mới tương đương, độ mờ na ná vậy thay vì giống hệt để hỗ trợ đổi theo theme", "Bạn trực tiếp xử lý đi".
- **Giải Pháp Triển Khai Chuẩn SSOT**:
  1. *Xử lý Đồ Họa 3D Chuẩn RGBA Trong Suốt Tuyệt Đối (`public/assets/3d/`)*:
     - Tạo mới và xử lý bằng thuật toán floodfill + unmixing + anti-aliasing + drop shadow đen trong suốt, loại bỏ 100% white halo (về 0 pixel quầng trắng):
       + `coins_coupon_3d_master.png`: Chồng coin vàng óng và vé coupon % cam nổi bật sắc nét trên cả Light Mode lẫn Dark Mode.
       + `wallet_3d_master.png`: Chiếc ví da 3D to hơn 1.25x (`w-52 sm:w-64`), quai vươn cao, cúc sao vàng nổi, nền trong suốt 100% không viền hộp.
       + `gift_box_3d_master.png`: Khử sạch 100% viền trắng đục, độ mờ thanh thoát (`opacity-80 dark:opacity-40`), nằm tại `z-0 pointer-events-none` không che dải T1-T7.
       + `empty_state_3d_master.png`: Minh họa bảng kẹp clipboard + kính lúp + mây kem đạt chuẩn retina 2x, siêu nét trên cả 2 theme.
  2. *Tái Thiết Kế & Chuẩn Hóa 4 Cột Thẳng Hàng Khối Lịch Sử Giao Dịch (`public/app.js`)*:
     - Thêm bộ chuẩn hóa không dấu tiếng Việt (`normalize('NFD')`) để nhận diện chính xác 5 nhóm giao dịch:
       + Nạp tiền VietQR / Nạp Credit: Icon `coins` màu vàng cam trên nền `bg-amber-50 dark:bg-amber-950/50`.
       + Điểm danh / Thưởng: Icon `gift` màu cam trên nền `bg-orange-50 dark:bg-orange-950/50`.
       + Đổi Point sang Credit / Swap: Icon `refresh-cw` màu xanh dương trên nền `bg-blue-50 dark:bg-blue-950/50`.
       + Thưởng khảo sát: Icon `clipboard-list` màu tím trên nền `bg-purple-50 dark:bg-purple-950/50`.
       + Rút tiền / Thẻ cào: Icon `credit-card` màu xanh lá trên nền `bg-emerald-50 dark:bg-emerald-950/50`.
     - Căn thẳng hàng dọc tuyệt đối giữa 4 cột: Icon (12x12) | Thông tin (tiêu đề + ngày) | Số tiền căn phải | Badge trạng thái căn phải.
  3. *Kiểm Định Chất Lượng (Quality Gate)*:
     - Cú pháp: `node -c public/app.js` PASS 100% (mã thoát 0).
     - Bộ kiểm thử 15 tầng: 15/15 test suites đạt 100% PASS (`npm test`, 27.21 giây).
     - Đồng bộ Capacitor Android: `npm run sync:android` hoàn tất.
     - Cache-buster: Nâng lên `v=4.7.6_1793434793141` trong `public/index.html`.

---

### Tinh Tuyển Đồ Họa Vector SVG Claymorphism 3D Chuẩn Nhận Diện Hệ Thống (v4.7.8)
- **Mục Tiêu & Yêu Cầu Chuyên Môn**:
  + Tự tay thiết kế và tạo mới 100% bằng mã nguồn Vector SVG thuần túy (Pure SVG Code), tuyệt đối không dùng thẻ `<image>` và không dùng bitmap crop.
  + Đảm bảo tính trong suốt 100%, không mang hộp viền trắng đục, hoạt động tương thích hoàn hảo trên cả Light Mode lẫn Dark Mode.
  + Tuân thủ chặt chẽ phong cách Claymorphism 3D hiện đại với các gradient đa điểm màu cam Sunset (`#FF6A00` -> `#FF8C00` -> `#E65100`), bóng đổ mờ đa tầng (`feDropShadow` kết hợp độ trong suốt đen `rgba(0,0,0,0.14)` và cam ấm), phản quang highlight đa góc.
- **Chi Tiết 4 Tác Phẩm Vector SVG Claymorphism 3D**:
  1. `wallet_3d_master.svg` (đồng bộ `wallet_3d_clean.svg`):
     - Chiếc ví da 3D màu cam Sunset bo góc mềm mại (`rx=28`), quai xách da cong vươn cao với 2 chốt khuyên kim loại vàng cố định ở hai bên.
     - Nắp ví cong uốn lượn có đường may viền chỉ đứt nét tinh xảo, cúc bấm kim loại tròn phối viền vàng/bạc tích hợp ngôi sao 5 cánh dập nổi 3D đa diện phát sáng.
     - 2 đồng xu vàng ánh kim 3D chìm mờ phía sau lưng ví và 3 ngôi sao 4 cánh vàng lấp lánh (sparkles) cùng các hạt quang học li ti.
     - `viewBox="0 0 300 240"`, bóng đổ tiếp xúc sàn màu đen trong suốt.
  2. `coins_coupon_3d_master.svg` (đồng bộ `coins_coupon_3d_clean.svg`):
     - Chồng 3 đồng xu vàng 3D xếp chồng nghiêng so le với bề mặt phản chiếu kim loại sáng loáng, hoa văn dập nổi đồng xu và ngôi sao đa diện.
     - Chiếc vé coupon màu cam Sunset nghiêng 3D đặc trưng với 2 lỗ khuyết bán nguyệt ở hai cạnh bên, thẻ trắng kem bo tròn bên trong dập nổi ký hiệu `%` màu cam rực rỡ có viền chỉ sang trọng.
     - 4 ngôi sao vàng 4 cánh lấp lánh lơ lửng, `viewBox="0 0 300 240"`, bóng đổ tiếp xúc sàn `rgba(0,0,0,0.14)`.
  3. `gift_box_3d_master.svg` (đồng bộ `gift_box_pastel_clean.svg` & `gift_box_3d_clean.svg`):
     - Hộp quà 3D màu cam pastel peach bo góc tròn mượt mà, nắp hộp mở hé nhẹ nhàng phát ra ánh hào quang vàng kim ấm áp từ bên trong.
     - Dải ruy băng trắng kem ôm quanh thân và nơ quà thắt 2 cánh tròn trịa mềm mại với nút thắt 3D nổi bật.
     - `viewBox="0 0 160 160"`, hoàn toàn trong suốt, không che dải tiến độ hay ô phụ trên giao diện.
  4. `empty_state_3d_master.svg` (đồng bộ `empty_state_3d_clean.svg`):
     - Bảng kẹp tài liệu 3D màu cam Sunset viền trắng kem clay cao cấp, kẹp kim loại màu vàng đồng sang trọng có lỗ treo tròn và ốc định vị.
     - Tờ giấy checklist trắng sữa có các ô vuông checkbox màu cam, các dòng kẻ nội dung và dấu tích cam rực rỡ.
     - Kính lúp 3D bóng loáng với vành kim loại vàng, cán cầm màu cam Sunset, bề mặt thấu kính khúc xạ quang học phóng to nổi bật ô checkbox và dấu tích cam bên dưới.
     - Cụm mây kem 3D bồng bềnh phía sau và 3 tia sáng cam tỏa lên góc trên.
     - `viewBox="0 0 360 220"`, bóng đổ tiếp xúc sàn mượt mà.
- **Đồng Bộ Hệ Thống Tài Nguyên**:
  + Lưu trữ và đồng bộ đầy đủ toàn bộ 18 tệp SVG tại:
    - `public/assets/3d/`
    - `android/app/src/main/assets/public/assets/3d/`
- **Kiểm Định Chất Lượng (Quality Gate)**:
  + Chạy kiểm thử tự động `node scripts/verify_svg_validity.js`: 18/18 tệp SVG đạt chuẩn cú pháp XML, 0 thẻ `<image>`, 0 bitmap crop, viewBox chuẩn 100%.
  + Kiểm thử giao diện: Toàn bộ bóng đổ hiển thị mềm mại và sạch sẽ trên cả theme sáng (Light) lẫn theme tối (Dark).


---

### Tinh Chỉnh Đồ Họa Vector SVG Tối Giản, Mờ Mờ Trong Suốt Thanh Thoát (v4.7.8)
- **Bối Cảnh & Phản Hồi Từ Người Dùng**:
  + Người dùng nhận xét: "SVG nhìn AI quá, ví dụ 2 hộp quà mờ mờ giống ảnh mẫu thôi, mờ mờ trong suốt, svg đơn giản, nhẹ nhàng, ít chi tiết, cơ bản thôi".
  + Yêu cầu gỡ bỏ các hiệu ứng filter phức tạp, đổ bóng dày nhân tạo, chuyển sang phong cách Minimalist Soft Pastel thanh lịch, mờ nhẹ nhàng đóng vai trò watermark nền.
- **Giải Pháp Triển Khai Chuẩn SSOT**:
  1. *Thiết Kế Lại Toàn Bộ SVG Theo Phong Cách Tối Giản*:
     - `gift_box_3d_master.svg` (và `gift_box_pastel_clean.svg`): Thân hộp cam đào pastel bo góc (`rx=12`), nắp hộp (`rx=8`), dải ruy băng trắng kem, nơ thắt 2 cánh tròn đơn giản và 2 ngôi sao 4 cánh mờ nhạt. Không dùng gradient phức tạp hay bóng đổ giả tạo.
     - Thiết lập độ mờ trong suốt watermark nhẹ nhàng (`opacity-35` ở Light Mode, `opacity-20` ở Dark Mode) tại thẻ "Số dư tích lũy" và "Chuỗi điểm danh", kích thước `w-20 sm:w-24`, nằm chìm tuyệt đối ở góc phải trên (`z-0 pointer-events-none`).
     - `wallet_3d_master.svg`: Chiếc ví da màu cam ấm mềm mại, quai xách cong, cúc sao vàng tinh tế, các ngôi sao lấp lánh nhẹ nhàng, phong cách Cupertino/Linear clean.
     - `coins_coupon_3d_master.svg`: Chồng 3 đồng xu vàng phẳng mềm, vé coupon cam có 2 khuyết bán nguyệt và ký hiệu "%", bóng đổ mờ tự nhiên, trong suốt 100%.
     - `empty_state_3d_master.svg`: Bảng kẹp tài liệu và kính lúp tối giản phong cách Notion, cụm mây kem dịu mắt, không chữ đè.
  2. *Kiểm Định Chất Lượng & Đồng Bộ*:
     - Cú pháp: `node -c public/app.js` PASS 100% (mã thoát 0).
     - Đồng bộ Capacitor Android: `npm run sync:android` hoàn tất.
     - Cache-buster: Nâng lên `v=4.7.6_1793436943527` trong `public/index.html`.


---

### Tinh Chỉnh Tỉ Lệ, Vị Trí Sát Viền & Đan Chéo Biểu Tượng SVG Theo Yêu Cầu (v4.7.9)
- **Bối Cảnh & Phản Hồi Từ Người Dùng**:
  + Người dùng góp ý chi tiết:
    1. 2 hộp quà ở trang Khảo sát bị lơ lửng, kích thước không đều, cần to hơn và đặt sát viền cắt chìm 1 phần.
    2. Chiếc ví ở thẻ Point cần nhỏ hơn tí, thiết kế đơn giản hơn.
    3. Voucher và đồng xu ở thẻ Credit cần nhỏ hơn xíu và đan chéo nhau nhiều hơn.
- **Giải Pháp Triển Khai Chuẩn SSOT**:
  1. *Đồng Bộ Hóa 2 Hộp Quà Khảo Sát Sát Viền*:
     - Tăng kích thước hộp quà lên `w-32 sm:w-38`, đặt tại `absolute -right-6 sm:-right-8 -top-1 sm:-top-2`. Hộp quà cắt chìm một phần (25-30%) ra ngoài mép thẻ nhờ `overflow-hidden`, tạo hiệu ứng hoa văn góc thanh lịch, đồng nhất 100% giữa 2 thẻ.
  2. *Tinh Giản & Thu Gọn Chiếc Ví Thẻ Point*:
     - Thu gọn kích thước xuống `w-40 sm:w-48`, tinh giản đường nét SVG gọn gàng, đặt tại `absolute right-2 sm:right-4 top-2 sm:top-3`.
  3. *Tăng Góc Chéo Cho Voucher & Thu Nhỏ Thẻ Credit*:
     - Tăng góc nghiêng vé coupon % lên -24 độ đan chéo rõ rệt trước chồng xu vàng, thu nhỏ kích thước xuống `w-38 sm:w-46`, đặt tại `absolute right-2 sm:right-4 top-2 sm:top-3`.
  4. *Kiểm Định Chất Lượng & Đồng Bộ*:
     - Cú pháp: `node -c public/app.js` PASS 100% (mã thoát 0).
     - Đồng bộ Capacitor Android: `npm run sync:android` hoàn tất.
     - Cache-buster: Nâng lên `v=4.7.6_1793437345399` trong `public/index.html`.

## Cập nhật Giao diện Thẻ Khảo sát & Trang Ví (31/10/2026)
1. **Trang Khảo sát (Số dư tích lũy & Chuỗi điểm danh)**:
   - Tăng kích cỡ cụm 2 hộp quà cam pastel (cái to cái bé) lên `w-40 sm:w-48` theo chỉ đạo của người dùng ("cho quà to ra chút").
   - Vị trí bám sát góc phải dưới (`-bottom-2 sm:-bottom-4 -right-3 sm:-right-5`), mờ mờ trong suốt (`opacity-40 dark:opacity-20`), cắt chìm tự nhiên ra ngoài viền nhờ `overflow-hidden`.
2. **Trang Ví (Point & Credit)**:
   - Đã xoá bỏ hoàn toàn 2 hình ảnh SVG (`wallet_3d_master.svg` và `coins_coupon_3d_master.svg`) theo yêu cầu dứt khoát của người dùng ("thôi tốt nhất bên này xoá 2 svg luôn đi, không cần nữa").
   - Giao diện 2 thẻ Point và Credit trở về phong cách Clean Minimalist tinh tế, phẳng gọn, số dư lớn không bị che hay rối mắt.
3. **Kiểm chuẩn & Đồng bộ**:
   - Cú pháp JavaScript `node -c` đạt mã 0 trên cả Web và Android.
   - Kiểm thử tự hành `npm test` đạt 15/15 PASS (100%).
   - Nâng cache-buster `4.7.6_1793438569859` và đồng bộ Capacitor Android thành công.

---

## Cập Nhật Tính Năng: Khảo Sát Trao Đổi Sinh Viên & Diễn Đàn Nội Bộ (31/10/2026)

### 1. Phân Hệ Khảo Sát Trao Đổi Sinh Viên (Edu Karma Exchange)
- **Mục tiêu**: Hỗ trợ sinh viên các trường đại học (.edu.vn) trao đổi khảo sát nghiên cứu khoa học, luận văn tốt nghiệp phi lợi nhuận (1 lượt trả lời hợp lệ = +1 Karma Sinh Viên).
- **Cơ chế kinh tế & Ký quỹ Karma**:
  + Thêm cột `student_karma` vào bảng `users` (khởi tạo mặc định 0).
  + Thêm cột `is_student_exchange` vào bảng `surveys` (mặc định 0).
  + Khi xuất bản bài khảo sát sinh viên (`publishSurvey`), ký quỹ bằng Karma (`target_responses`). Ưu tiên trừ `free_quota_remaining` rồi trừ `student_karma`. Tuyệt đối không trừ `credit_balance` VNĐ.
  + Khi đáp viên sinh viên hoàn thành bài hợp lệ (`submitSurvey`), hệ thống cộng +1 `student_karma` (không cộng point_balance).
- **Ràng buộc cách ly sinh viên tuyệt đối ("chỉ cho edu, edu mới hiển thị, còn lại không hiển thị")**:
  + Khách vãng lai và người dùng thông thường (`is_student_verified != 1`) không nhìn thấy các bài khảo sát trao đổi sinh viên trong danh sách `listSurveys`, `listPublicSurveys`, `listRespondentSurveys`.
  + Truy cập trực tiếp qua ID (`getSurvey`, `startSession`, `submitSurvey`): Từ chối 403 Forbidden nếu người truy cập không phải sinh viên đã xác thực email trường (.edu), không phải chủ khảo sát và không phải ADMIN.
- **Kiểm thử**: `tests/test_edu_karma_exchange.js` đạt chuẩn 14/14 PASS (100%).

### 2. Phân Hệ Diễn Đàn Thảo Luận & Chia Sẻ Khảo Sát (Survey Community Board)
- **Mục tiêu**: Tạo không gian cộng đồng nội bộ để tác giả giới thiệu khảo sát, thảo luận học thuật, trao đổi kinh nghiệm và kêu gọi điền form.
- **Cấu trúc CSDL**:
  + `forum_posts`: Lưu trữ bài thảo luận, liên kết chặt chẽ với `users(id)` và `surveys(id)`.
  + `forum_comments`: Lưu trữ bình luận theo từng bài viết.
  + `forum_post_likes`: Lưu trữ lượt thả tim của người dùng (chống spam like, toggle like).
- **Ràng buộc an ninh & Chống chèn link ngoài (Anti-URL Spoofing)**:
  + Chặn 100% việc chèn URL ngoài (`http://`, `https://`, `ftp://`, `forms.gle`, `forms.office`, `.com`, `.vn`, IP...) trong tiêu đề, nội dung và bình luận. Từ chối ngay lập tức với mã 400 và thông báo chuẩn.
- **Ràng buộc quyền sở hữu**:
  + Bài viết bắt buộc đính kèm bài khảo sát hợp lệ thuộc quyền sở hữu của chính tác giả (`survey.creator_id === req.user.id`).
  + Khảo sát đính kèm phải đang ở trạng thái hoạt động (`ACTIVE`).
- **Cách ly bài viết trao đổi sinh viên trên diễn đàn**:
  + Bài viết đính kèm khảo sát sinh viên trao đổi chỉ hiển thị cho sinh viên đã xác thực (.edu), chủ bài viết hoặc ADMIN.
  + Chặn 403 Forbidden khi khách hoặc người dùng thường cố truy cập chi tiết bài viết sinh viên trao đổi.
- **Kiểm thử**: `tests/test_forum_community.js` đạt chuẩn 14/14 PASS (100%).


## Khắc phục Lỗi Bắt Buộc Khi Trả Lời Câu Hỏi Tự Luận / Trả Lời Ngắn (31/10/2026)
1. **Hiện tượng lỗi**: Người dùng đã nhập "Nguyễn Thuỳ Linh" vào câu hỏi số 1 (dạng SHORT_TEXT, bắt buộc), nhưng khi bấm "Câu tiếp theo" thì hệ thống vẫn báo toast: "Vui lòng trả lời câu hỏi bắt buộc này trước khi tiếp tục!".
2. **Nguyên nhân kỹ thuật**:
   - Thẻ `input` và `textarea` trong `renderQuestionOptions` gọi `VibeApp.updateOpenText(...)`.
   - Đối tượng `VibeApp` bị thiếu định nghĩa hàm này (`updateOpenText is not a function`), dẫn đến khi gõ phím, câu trả lời không được gán vào `activeSession.answers[qId]`.
3. **Giải pháp đã áp dụng**:
   - Định nghĩa hàm `updateOpenText(qId, val)` trong `public/app.js`.
   - Bổ sung cả `onchange` và `oninput` trên các thẻ input/textarea.
   - Thêm cơ chế tự động đọc trực tiếp từ phần tử DOM input/textarea trong `async nextQuestion()` và `async submitSurvey()` để đảm bảo người dùng gõ, dán text (paste) hay dùng trình duyệt tự điền (autofill) thì hệ thống đều nhận được đáp án 100%.
4. **Kết quả kiểm chuẩn**:
   - Bài test `test_short_text_answers.js` PASS 100%.
   - Toàn bộ 15/15 tầng kiểm thử `npm test` PASS 100%.
   - Nâng cache-buster `4.7.6_1793441068568` và đồng bộ Capacitor Android.

---

## Cập Nhật Công Cụ Dự Toán Tài Chính & Hoàn Vốn (31/10/2026)

### 1. Xuất Bản Tệp Excel Mô Hình Tài Chính (MO_HINH_TAI_CHINH_HOI_VON_VIBESURVEY.xlsx)
- **Mục tiêu**: Cung cấp công cụ mô phỏng tài chính trực quan, chuyên nghiệp cho phép người dùng tự điều chỉnh các biến giả định kinh doanh để tính toán chính xác điểm hòa vốn, lợi nhuận ròng hàng tháng và thời gian thu hồi vốn đầu tư (Payback Period).
- **Cấu trúc 3 Sheet chuyên sâu**:
  1. \1. Gia Dinh & Dau Vao\ (Input Assumptions):
     - Ô nhập liệu màu vàng nhạt chuẩn tài chính (\#FEF9C3\).
     - Cho phép tự do nhập: Vốn đầu tư ban đầu CapEx (Google Play, tên miền, ĐKKD, vốn mồi trả thưởng); Số người nạp & Mức nạp bình quân 4 phân khúc (Sinh viên, Cá nhân, SME, Enterprise); Tỷ lệ Take-rate trung bình; Doanh thu phụ trợ (Ghim VIP 40k, Bán Voucher, Phí rút tiền); Chi phí duy trì OpEx (VPS, Email OTP, Cổng VietQR, Nhân sự, Mua Voucher trợ cấp, Phí chuyển khoản Payout, Dự phòng).
  2. \2. Dong Tien & Hoi Von\ (Break-even & Payback Analysis):
     - Tự động tính Doanh thu thuần của sàn (Net Platform Revenue).
     - Chi phí vận hành hàng tháng (Total Monthly OpEx) & Lợi nhuận hoạt động ròng (EBITDA).
     - Điểm hòa vốn: Doanh thu thuần tối thiểu và Tổng tiền Creator cần nạp (GMV) để sàn không bị lỗ.
     - Số lượng khách hàng nạp tiền tối thiểu mỗi tháng để hòa vốn.
     - Thời gian hoàn vốn đầu tư (Payback Period tính bằng Tháng) kèm cảnh báo Solver Status tự động.
  3. \3. Du Phong 12 Thang & Do Nhay\ (12M Projection & Scenarios):
     - Bảng dòng tiền tích lũy 12 tháng: Nhận diện chính xác tháng dòng tiền chuyển từ Âm sang Dương (thời điểm hoàn vốn thực tế).
     - Bảng ma trận độ nhạy so sánh 3 kịch bản: Thận trọng (Conservative - 50%), Cơ sở (Base - 100%), Lạc quan (Optimistic - 180%).
- **Kiểm định**: Tệp Excel được tạo bằng \xlsxwriter\, 100% công thức Excel sống (SUM, IF, nhân chia tham chiếu chéo giữa các sheet), định dạng chuẩn tiền tệ VNĐ và tỷ lệ %.


---

## Nâng Cấp Hệ Thống Biểu Mẫu: Ràng Buộc Định Dạng (Restrictions), Rẽ Nhánh Điều Hướng 2 Tầng (Branching Logic) & Phím Enter (31/10/2026)

### 1. Cơ Chế Ràng Buộc Định Dạng (Restrictions / Validation Rules) Chuẩn Microsoft Forms & Google Forms
- **Cơ sở dữ liệu**:
  + Bổ sung cột `logic_json TEXT` trong bảng `questions` lưu trữ an toàn cấu hình `validation` và `branching`.
  + Tự động migration an toàn khi khởi động máy chủ tại `server/db/database.js`.
- **Backend Parser & Repository**:
  + `server/services/formParserService.js`: Trích xuất 100% các luật giới hạn từ Microsoft Forms (`Restrictions`, `RestrictionType`, `RestrictionOperator`, `RestrictionValue1`, `RestrictionValue2`, `subtitle`, `placeholder`) và Google Forms (`pageBreakItem`, `goToAction`, `goToSectionId`).
  + Hỗ trợ đầy đủ các dạng định dạng: Email, Số là số, Số trong khoảng (Between min ~ max ví dụ: 20000000 ~ 20270000), Độ dài ký tự, Đường dẫn URL.
  + `server/repositories/surveyRepository.js` & `server/controllers/surveyController.js`: Trích xuất và bóc tách hai chiều trường `validation` và `logic` cho cả Creator Studio và Survey Runner.
- **Frontend Creator Studio (`public/app.js`)**:
  + Bổ sung khối giao diện cấu hình `Giới hạn` (Restrictions) cho các câu hỏi SHORT_TEXT và PARAGRAPH chuẩn giao diện Microsoft Forms: Dropdown Loại (Không giới hạn, Số, Email, Văn bản, Độ dài, URL), Dropdown điều kiện con (Là số, Trong khoảng, Lớn hơn, Nhỏ hơn,...), các ô nhập min/max, và tự động đồng bộ placeholder hướng dẫn.
- **Frontend Survey Runner (`public/app.js`)**:
  + Tự động hiển thị placeholder định dạng mẫu (`Vui lòng nhập email`, `Số phải nằm trong khoảng từ 20000000 ~ 20270000`, `Giá trị phải là một số`).
  + Kiểm toán chặt chẽ trước khi cho phép chuyển câu hỏi: Chặn đứng câu trả lời không đúng định dạng và báo lỗi trực quan ngay dưới ô nhập liệu.

### 2. Cơ Chế Điều Hướng Câu Hỏi 2 Tầng (2-Tier Branching / Skip Logic)
- **Tầng 1 (Option-Level Branching)**: Rẽ nhánh ngay theo đáp án được chọn (Áp dụng cho SINGLE_CHOICE và DROPDOWN). Hỗ trợ nhảy đến câu hỏi chỉ định, nhảy đến phân đoạn (Mục), nộp bài ngay (SUBMIT), hoặc tiếp tục câu kế tiếp (NEXT).
- **Tầng 2 (Section-End Routing)**: Khi người dùng đi đến câu hỏi cuối cùng của một Phân đoạn / Mục, hệ thống tự động kích hoạt luật chuyển trang của Phân đoạn đó (Ví dụ: `Sau phần này: Chuyển đến Mục 3` hoặc `Gửi biểu mẫu`), ngăn không cho người làm bài vô tình đi qua các phân đoạn của nhánh khác.
- **Ngăn xếp lịch sử (Back Stack)**: Lưu vết các bước nhảy câu hỏi vào `session.history` giúp người làm bài bấm nút `Quay lại` (Previous) lùi về chính xác câu hỏi thực tế đã đi qua.

### 3. Trải Nghiệm Thao Tác Phím Tắt Enter
- Nhấn phím `Enter` trên ô nhập liệu (Input ngắn, Email, Số) hoặc `Ctrl + Enter` trên văn bản dài (Textarea) tự động kích hoạt chuyển câu tiếp theo (`nextQuestion`) hoặc nộp bài (`submitSurvey`).

### 4. Kết Quả Kiểm Chuẩn
- Bộ kiểm thử chuyên biệt: `tests/test_navigation_and_enter_key.js` đạt chuẩn 4/4 PASS (100%).
- Bộ kiểm thử toàn diện: `npm test` đạt chuẩn 15/15 Suites PASS (100%).
- Đồng bộ toàn diện sang Android Capacitor qua `npm run sync:android`.


---

## Khắc Phục Lỗi Xóa Khảo Sát: FOREIGN KEY Constraint Failed (31/10/2026)
1. **Hiện tượng lỗi**:
   - Khi Creator hoặc Admin bấm "Xóa khảo sát", hệ thống ném ra lỗi: `FOREIGN KEY constraint failed`.
2. **Nguyên nhân kỹ thuật**:
   - Khảo sát đính kèm bài viết trên diễn đàn (`forum_posts` có khóa ngoại `survey_id REFERENCES surveys(id)`): Transaction xóa trước đây chưa dọn dẹp các bài đăng diễn đàn (`forum_posts`), dẫn đến khi xóa `surveys`, SQLite ném lỗi khóa ngoại.
   - Khi đáp viên làm khảo sát và nhận được mã voucher (từ kho voucher sàn hoặc tài trợ), bản ghi trong bảng `voucher_codes` có `claimed_response_id` tham chiếu đến `responses(id)` của bài khảo sát. Lệnh xóa trước đây chỉ xóa `voucher_codes WHERE survey_id = ?`, không gỡ liên kết `claimed_response_id` của các mã voucher khác, dẫn đến khi xóa `responses`, SQLite ném lỗi khóa ngoại.
3. **Giải pháp đã áp dụng**:
   - Cập nhật cả `server/controllers/surveyController.js` và `server/repositories/surveyRepository.js`:
     + Bước 1: Dọn dẹp diễn đàn đính kèm khảo sát: `DELETE FROM forum_comments WHERE post_id IN (SELECT id FROM forum_posts WHERE survey_id = ?)`, `DELETE FROM forum_post_likes ...`, `DELETE FROM forum_posts WHERE survey_id = ?`.
     + Bước 2: Gỡ liên kết khóa ngoại: `UPDATE voucher_codes SET claimed_response_id = NULL WHERE claimed_response_id IN (SELECT id FROM responses WHERE survey_id = ?)`.
     + Bước 3: Bảo toàn mã voucher đã nhận (`status = 'CLAIMED'`) cho người dùng trong ví bằng `UPDATE voucher_codes SET survey_id = NULL WHERE survey_id = ? AND status = 'CLAIMED'` và xóa các mã chưa phát `DELETE FROM voucher_codes WHERE survey_id = ?`.
     + Bước 4: Dọn dẹp logs, thông báo, khiếu nại bảo hành (`fraud_logs`, `notifications`, `email_notifications_log`, `warranty_claims`).
     + Bước 5: Xóa `responses` và `questions`.
     + Bước 6: Xóa bản ghi `surveys`.
4. **Kết quả kiểm chuẩn**:
   - Bộ kiểm thử mới `tests/test_delete_survey_fk.js` đạt chuẩn 6/6 PASS (100%).
   - Toàn bộ 15/15 tầng kiểm thử `npm test` đạt 100% PASS.

---

## Đồng Bộ & Xuất Màn Hình Giao Diện Từ Dự Án Stitch (31/10/2026)
1. **Dự án Stitch**: `SurvHub Community Portal` (ID: `16683499495864488318`).
2. **Các màn hình đã trích xuất mã HTML và ảnh chụp màn hình (PNG)**:
   - **Màn hình 1** (`fe33e17c90f24b3d8094e754850f5c31`): `SurvHub - Thông tin tài khoản & Quản lý khảo sát`
     + File HTML: `stitch_screens/fe33e17c90f24b3d8094e754850f5c31_thong_tin_tai_khoan_quan_ly_khao_sat.html` (55.7 KB)
     + File PNG: `stitch_screens/fe33e17c90f24b3d8094e754850f5c31_thong_tin_tai_khoan_quan_ly_khao_sat.png` (1.88 MB, 2560x7586)
   - **Màn hình 2** (`1b986c90f52b4f1a85a3c6767b002623`): `SurvHub - Diễn đàn & Góc Đề Tài`
     + File HTML: `stitch_screens/1b986c90f52b4f1a85a3c6767b002623_dien_dan_goc_de_tai.html` (46.7 KB)
     + File PNG: `stitch_screens/1b986c90f52b4f1a85a3c6767b002623_dien_dan_goc_de_tai.png` (2.34 MB, 2560x5602)
   - **Màn hình 3** (`a8f703e9f38c4f6db80c09f21abf1012`): `SurvHub - Trang chủ Mở đầu`
     + File HTML: `stitch_screens/a8f703e9f38c4f6db80c09f21abf1012_trang_chu_mo_dau.html` (28.9 KB)
     + File PNG: `stitch_screens/a8f703e9f38c4f6db80c09f21abf1012_trang_chu_mo_dau.png` (2.43 MB, 2560x5132)
3. **Thư mục lưu trữ**: `stitch_screens/` ngay tại gốc dự án.

---

## Chuẩn Hóa Creator Studio & Thanh Giới Hạn Chuẩn Microsoft Forms (31/10/2026)
1. **Phân tích đối sánh 3 ảnh thực tế**:
   - **Ảnh 1 (Email)**:
     + Ô input trả lời ngắn xem trước màu xám nhạt disabled, placeholder: 'Vui lòng nhập email'.
     + Thanh Action Bar chân câu hỏi: Nhãn 'Giới hạn' [ Email ⌵ ].
     + Popup dropdown menu phẳng nổi lên với các tùy chọn: 'Số', 'Văn bản', 'Độ dài', '✓ Email', 'URL' (tùy chọn đang chọn có dấu tích `✓` ở đầu).
     + Chân câu hỏi bên phải: Toggle 'Câu trả lời dài', Toggle 'Bắt buộc', Menu '...'.
   - **Ảnh 2 (Số thoại / Số)**:
     + Ô input xem trước có placeholder: 'Giá trị phải là một số'.
     + Action Bar: 'Giới hạn' [ Số ⌵ ] [ Là số ⌵ ].
   - **Ảnh 3 (Mã số sinh viên)**:
     + Ô input xem trước có placeholder: 'Số phải nằm trong khoảng từ 20000000 ~ 20270000'.
     + Action Bar: 'Giới hạn' [ Số ⌵ ] [ Trong khoảng ⌵ ] [ 20000000 ] đến [ 20270000 ].
2. **Triển khai kỹ thuật tại `public/app.js`**:
   - Hoàn thiện `renderStudioQuestionValidationConfig(q, qIdx)` với thiết kế dropdown popover phẳng nổi lên (`bottom-full mb-1.5`), có dấu tích `✓` cho lựa chọn hiện tại.
   - Hỗ trợ đầy đủ các loại giới hạn: Số, Văn bản, Độ dài, Email, URL và Không có.
   - Khi chọn Số: Dropdown phụ [ Là số, Trong khoảng, Lớn hơn, Nhỏ hơn ]. Khi chọn Trong khoảng: 2 ô input min đến max với chữ "đến" ở giữa. Khi chọn Lớn hơn/Nhỏ hơn: 1 ô input tương ứng.
   - Khi chọn Độ dài: Dropdown phụ [ Tối đa ký tự, Tối thiểu ký tự ] và ô nhập số ký tự.
   - Thêm Toggle `Câu trả lời dài` tại chân câu hỏi phía bên phải (`toggleStudioLongAnswer`) để hoán đổi giữa Trả lời ngắn (`SHORT_TEXT`) và Đoạn văn dài (`PARAGRAPH`).
   - Tự động cập nhật `q.validation` và `q.logic.validation`, đồng thời cập nhật tức thời placeholder mờ trên ô preview câu hỏi trong Creator Studio khi thay đổi loại hoặc quy tắc/giá trị giới hạn.
3. **Kết quả kiểm chuẩn**:
   - `node -c public/app.js` đạt 100% cú pháp hợp lệ.
   - Placeholder engine trả về chính xác 100% theo đặc tả.

---

## Tích Hợp Toàn Diện 3 Màn Hình Stitch Vào Nền Tảng VibeSurvey (31/10/2026)
1. **Mục tiêu & Tôn chỉ**:
   - Tôn trọng và giữ nguyên 100% nhận diện thương hiệu **VibeSurvey**, logo chính thức (`/logo-light.svg`, `/logo-dark.svg`, `/favicon.svg`), các logic nghiệp vụ kinh tế và tiền tệ (Point, Credit, Karma, VNĐ).
   - Áp dụng triệt để bộ quy chuẩn [DESIGN.md](file:///c:/Users/Lenovo/Downloads/Linh/DESIGN.md): Bộ 3 màu chủ đạo Cam `#EA580C`, Trắng `#FFFFFF`, Đen than `#121214` / `#1C1C20`, font Montserrat 100%, bộ biểu tượng Lucide Icons (`data-lucide="..."`), không emoji hay màu sắc dị biệt.
   - Triển khai theo mô hình Subagent-Driven Execution Model (Rule 14) với subagent chuyên biệt `ui_integrator`.

2. **Nội dung 3 màn hình đã tích hợp**:
   - **Màn hình 1: Trang Chủ Mở Đầu (`case 'home':` - `renderHomeView`)**:
     + Chuyển đổi mã từ `stitch_screens/a8f703e9f38c4f6db80c09f21abf1012_trang_chu_mo_dau.html`.
     + Hero Banner: Tiêu đề "VibeSurvey - Nền tảng Khảo Sát & Phân Tích Dữ Liệu Học Thuật & Thị Trường", thanh tìm kiếm khảo sát (`searchFromHome`), các pills danh mục tương tác nhanh (Công nghệ, Kinh doanh, Xã hội, Y tế, Tài chính, UX/UI).
     + Showcase Card: Mẫu câu hỏi tương tác trắc nghiệm, thanh tiến độ 90%, cam kết khử gian lận AI (Speed trap, Attention check, Cronbach Alpha).
     + Bento Feature Cards: 3 thẻ tính năng nổi bật (Dữ liệu xác thực 99.4% & khử bot AI; Đổi thưởng uy tín thẻ cào / MoMo / ngân hàng 1:1 VNĐ; Bảo trợ học thuật & Xuất file SPSS/Excel).
     + Khảo sát tiêu biểu đang mở (Trending Surveys): Nạp tự động từ danh sách khảo sát đang hoạt động (`this.state.surveys`).
     + Mạng lưới nghiên cứu đối tác (ĐHBK HN, NEU, FTU, ĐHQG TP.HCM, RMIT, ĐH Y Hà Nội) và Testimonials phản hồi sinh viên / giảng viên.
     + Điều hướng: Tab "Trang Chủ" (`home`) được ghim vị trí đầu tiên trên Desktop Nav và Mobile Bottom Nav; nhấp logo VibeSurvey gọi `VibeApp.navigate('home')`.

   - **Màn hình 2: Diễn Đàn & Góc Đề Tài (`case 'forum':` - `renderForumView`)**:
     + Chuyển đổi mã từ `stitch_screens/1b986c90f52b4f1a85a3c6767b002623_dien_dan_goc_de_tai.html`.
     + Cột Feed bài viết chính (8 cột): Header Banner Bento với nút "+ Đăng Bài Mới / Kêu Gọi Mẫu" (`openCreateForumPostModal`); thanh chỉ số nhanh bài viết; bộ lọc danh mục (Góc Đề Tài, Hỗ trợ điền chéo, Phương pháp NCKH & SPSS, Thảo luận chung); danh sách bài viết Bento với Author header (trường ĐH, vai trò), Mini Survey Card đính kèm với nút "Làm bài ngay", các nút Thích, Bình luận, Chia sẻ, Lượt xem và luồng bình luận tương tác thật.
     + Cột Sidebar (4 cột): Bảng Xếp Hạng Đáp Viên Uy Tín (Top 5 thành viên đóng góp, điểm 100/100); Chủ Đề Đang Thảo Luận (Trending tags: #KhaoSatKhoaLuan, #DuLieuSPSS, #GenZChiTieu, #HanhViTieuDung, #AIinEducation); Quy Chuẩn Đạo Đức Học Thuật.

   - **Màn hình 3: Thông Tin Tài Khoản & Quản Lý Khảo Sát (`case 'profile':` - `renderProfileView`)**:
     + Chuyển đổi mã từ `stitch_screens/fe33e17c90f24b3d8094e754850f5c31_thong_tin_tai_khoan_quan_ly_khao_sat.html`.
     + Top Profile Hero Banner: Avatar người dùng với viền gradient cam, tên thật, email, badge xác thực; thẻ gói tài khoản (Sinh Viên / Cá Nhân / Doanh Nghiệp); 3 Thẻ Bento chỉ số nhanh (Điểm Uy Tín 100/100, Mẫu Khảo Sát Miễn Phí, Ví Điểm Point & Quỹ Credit VNĐ).
     + 5 Tab chức năng chuyển đổi mượt mà (`switchAccountTab`):
       1. `demographics`: Hồ sơ nhân khẩu học (8 trường thông tin, dropdown 34 tỉnh thành mới, autocomplete 293 trường ĐH, lưu API `/auth/profile`), bảo toàn khối xác thực sinh viên edu và Enterprise KYC Cấp 1 & 2.
       2. `reputation`: Circular SVG Gauge 99.8% chính trực, đánh giá sao 4.9/5, thanh tiến độ Attention-check (100%) và thời gian chuẩn (98.5%), nhận xét thực tế từ chủ nhiệm đề tài.
       3. `created-forms`: Danh sách khảo sát do user tạo (`/api/surveys/creator`), thanh tiến độ số mẫu, nút Sửa, Báo cáo, Ghim VIP, Xuất dữ liệu Excel/SPSS, Nạp Quỹ Mẫu và "+ Tạo Khảo Sát Mới".
       4. `filled-forms`: Lịch sử các khảo sát đã tham gia (`/api/surveys/history`), thời gian nộp bài, điểm thưởng nhận được, trạng thái duyệt.
       5. `forum-posts`: Danh sách bài viết trên diễn đàn do chính user đăng tải, số lượt thích, bình luận và nút tạo bài mới.

3. **Backend API Endpoints Bổ Sung**:
   - `GET /api/surveys/creator`: Trả về danh sách khảo sát của chính tài khoản người tạo đang đăng nhập.
   - `GET /api/surveys/history`: Trả về lịch sử phản hồi khảo sát của tài khoản kèm thông tin khảo sát và trạng thái duyệt.

4. **Kết quả kiểm chuẩn & nghiệm thu**:
   - Kiểm tra cú pháp JavaScript: `node -c public/app.js` đạt 100% hợp lệ.
   - Kiểm thử tự động toàn diện: Toàn bộ 15/15 tầng kiểm thử `npm test` đạt 100.0% PASS.
   - Đồng bộ Capacitor Android: `npm run sync:android` hoàn tất sao chép sang `android/app/src/main/assets/public`.
   - Bảo toàn cấu hình workspace: Tệp `survey-platform.code-workspace` nguyên vẹn.

---

## Chuẩn Hóa Ràng Buộc Định Dạng & Trình Làm Bài Phân Đoạn Đa Câu Hỏi Chuẩn Google Forms & Microsoft Forms (31/10/2026)
1. **Bối cảnh & Yêu cầu Người dùng**:
   - Ràng buộc định dạng theo lựa chọn (Email, Số, Khoảng số min~max, Độ dài, URL) chuẩn Microsoft Forms chưa hoạt động đầy đủ trên giao diện và khi làm bài.
   - Thanh công cụ hành động (Action Bar) dưới chân câu hỏi trong Creator Studio cần chuẩn giao diện phẳng Microsoft Forms (dropdown popup có dấu tích `✓`, toggle `Câu trả lời dài`, toggle `Bắt buộc`).
   - Trình làm bài phải tuân thủ chuẩn Google Forms & Microsoft Forms: Toàn bộ câu hỏi trong cùng một Phân đoạn (Section) cùng hiển thị trên 1 trang màn hình cuộn; `SECTION_HEADER` là điểm ngắt phần (Page Break), không phải câu hỏi đơn lẻ.
   - Phải có điều hướng chuyển phần (`nextSection`, `prevSection`), rẽ nhánh 2 tầng (Option-level và Section-level), và ngăn xếp lịch sử phân đoạn.

2. **Chi tiết Kỹ thuật Triển khai**:
   - **Restriction Engine (`window.RestrictionEngine`)**:
     + `EMAIL`: Kiểm tra regex email hợp lệ, báo lỗi nội dòng "Vui lòng nhập địa chỉ email hợp lệ (vd: name@example.com)".
     + `NUMBER`: Hỗ trợ quy tắc `IS_NUMBER` ("Giá trị phải là một số"), `BETWEEN` ("Số phải nằm trong khoảng từ min đến max"), `GREATER_THAN` ("Số phải lớn hơn min"), `LESS_THAN` ("Số phải nhỏ hơn max").
     + `LENGTH`: `MAX_LENGTH` ("Số ký tự không được vượt quá X ký tự"), `MIN_LENGTH` ("Độ dài ký tự tối thiểu là X").
     + `URL`: Kiểm tra giao thức http:// hoặc https://.
     + Phương thức `validateQuestionInput(q, val)` và `handleSurveyInputRealtime(qId, inputEl)` gắn trực tiếp vào sự kiện nhập liệu (`oninput`, `onblur`), đổi viền ô nhập sang đỏ `border-red-500` và hiển thị thẻ lỗi nội dòng `#val-err-{id}` ngay dưới ô nhập.
   - **Thanh Action Bar Phẳng Chuẩn Microsoft Forms trong Creator Studio**:
     + Dropdown popup nổi lên trên (`bottom-full mb-1.5 z-50 shadow-xl border border-stone-200`) có dấu tích `✓` cho lựa chọn hiện tại: Số, Văn bản, Độ dài, Email, URL, Không có.
     + Menu phụ điều kiện số: Là số, Trong khoảng (2 ô input min - max với chữ 'đến' ở giữa), Lớn hơn, Nhỏ hơn.
     + Toggle `Câu trả lời dài` (chuyển đổi qua lại giữa SHORT_TEXT và PARAGRAPH), Toggle `Bắt buộc`, Nút `...`.
     + Xem trước placeholder mờ tự động đồng bộ trên thẻ câu hỏi.
   - **Trình Làm Bài Phân Đoạn Đa Câu Hỏi (Section Runner)**:
     + Hàm `buildSurveySections(questions, surveyMeta)` gom các câu hỏi thành các nhóm Section độc lập dựa trên các khối `SECTION_HEADER`.
     + `renderTakeSurveyView`: Render toàn bộ câu hỏi của Section hiện tại trên 1 trang màn hình cuộn; thẻ tiêu đề Phân đoạn hiển thị dải màu Cam Vibe, số mục "Mục X trên Y", tiêu đề và mô tả.
     + Đánh số câu hỏi liên tục toàn bài (1., 2., 3....), hiển thị placeholder mờ mẫu tương ứng.
     + Chân trang hiển thị nút `Quay lại` (nếu không phải mục đầu tiên) và nút `Tiếp tục` (hoặc `Gửi biểu mẫu & Nhận thưởng` nếu là mục cuối cùng).
     + Hàm `validateCurrentSection(curSection)`: Tự động đồng bộ DOM inputs vào answers, kiểm tra toàn bộ câu hỏi bắt buộc (CHOICE_GRID, CHECKBOX_GRID, MULTIPLE_CHOICE, text, v.v.) và kiểm tra ràng buộc định dạng của từng câu hỏi; tự động scroll smooth đến câu hỏi lỗi đầu tiên, focus ô nhập và báo toast.
     + Hàm `nextSection()` & `prevSection()`: Điều hướng rẽ nhánh 2 tầng (ưu tiên lựa chọn câu hỏi trước, sau đó đến mặc định của Section), ghi nhận lịch sử vào `session.sectionHistory`. Bảo toàn tương thích ngược qua alias `nextQuestion` và `prevQuestion`.
     + Phím tắt Enter hỗ trợ chuyển nhanh qua Section.

3. **Kết quả Kiểm chuẩn & Nghiệm thu**:
   - `node -c public/app.js`: 100% cú pháp JavaScript hợp lệ.
   - `node tests/test_short_text_answers.js`: 100% PASS (5/5 assertions).
   - `node tests/test_section_runner.js`: 100% PASS (11/11 assertions kiểm thử RestrictionEngine, Section Builder và Section Validation).
   - `npm test`: Toàn bộ 15/15 tầng kiểm thử đạt 100.0% PASS.
   - `npm run sync:android`: Hoàn tất đồng bộ mã nguồn sang Capacitor Android.
   - Đẩy toàn bộ thay đổi lên nhánh chính GitHub (`origin/main`).


---

## Tái Thiết Kế Bộ Tài Sản 3D Vector SVG Cho Thẻ Point và Thẻ Credit Chuẩn Theo Mẫu Ảnh (31/10/2026)
1. **Bối cảnh & Yêu cầu Người dùng**:
   - Về lại phần hình ảnh minh họa cho Ví và Cụm Xu & Voucher trên 2 thẻ Bento trên cùng của trang Ví & Rút Tiền.
   - Tạo các tệp SVG bám sát theo 2 ảnh mẫu người dùng cung cấp:
     + Ảnh 1: Chiếc ví da nằm ngang bo tròn 4 góc mềm mại, trên đỉnh có 2 chiếc thẻ ATM/tín dụng thò ra chéo góc, cạnh phải có quai cài nắp bấm có đường rãnh cách ly trắng và cúc tròn ở giữa. Chuyển toàn bộ sang tông màu cam Sunset ấm áp.
     + Ảnh 2: Minh họa phong cách 2.5D gồm tấm vé coupon có khuyết bán nguyệt và dấu % nổi bật, phía trước bên trái là chồng 4 đồng xu hình trụ, phía sau có 2 đồng xu nghiêng đứng lấp ló, phía trước bên phải có 1 đồng xu nằm bẹt. Chuyển toàn bộ sang tông màu cam và vàng kim.
   - Vị trí & Độ mờ: Bố trí ở vị trí sêm sêm với hộp quà ở thẻ Khảo sát (bám góc phải dưới `-bottom-2 sm:-bottom-4 -right-3 sm:-right-5`, kích thước `w-38 sm:w-44`, độ mờ thanh thoát `opacity-40 dark:opacity-20`, cắt chìm tự nhiên ra mép ngoài nhờ `overflow-hidden`, tuyệt đối không đè lên chữ số dư hay cản trở nút bấm).

2. **Chi tiết Kỹ thuật Triển khai**:
   - **Tài sản Pure Vector SVG (Không dùng thẻ image, nền trong suốt)**:
     + `wallet_3d_master.svg` & `wallet_3d_clean.svg`: Thân ví chữ nhật bo tròn lớn (`rx="22"`), gradient cam ấm `#FB923C -> #EA580C -> #C2410C`, vệt phản quang 3D và đường khâu viền tinh tế. Hai thẻ tín dụng thò ra chéo góc (-22 độ và -9 độ) tông kem vàng và cam đào sáng. Quai cài ví bên phải bo tròn có lớp viền rãnh trắng cách ly và cúc bấm tròn trắng. Đáy tiếp đất chạm sàn viewBox `220 160` (y=151).
     + `coins_coupon_3d_master.svg` & `coins_coupon_3d_clean.svg`: Tấm vé coupon cam đào/san hô có vết khuyết bán nguyệt trên đỉnh và dấu `%` nổi bật. Chồng 4 đồng xu hình trụ kim loại vàng kim (`#FEF08A -> #FACC15 -> #B45309`) phía trước bên trái, 2 đồng xu nghiêng đứng phía sau (-26 độ và +32 độ) và 1 đồng xu nằm bẹt phía trước bên phải.
   - **Tích hợp giao diện Frontend (`public/app.js`)**:
     + Thẻ Point: Nhúng `<img src="/assets/3d/wallet_3d_master.svg" class="absolute -right-3 sm:-right-5 -bottom-2 sm:-bottom-4 w-38 sm:w-44 h-auto object-contain pointer-events-none select-none z-0 opacity-40 dark:opacity-20 drop-shadow-sm" />`.
     + Thẻ Credit: Nhúng `<img src="/assets/3d/coins_coupon_3d_master.svg" class="absolute -right-2 sm:-right-4 -bottom-2 sm:-bottom-4 w-38 sm:w-44 h-auto object-contain pointer-events-none select-none z-0 opacity-40 dark:opacity-20" />`.
     + Cả hai thẻ đều có `pointer-events-none select-none z-0` và container `overflow-hidden`, đảm bảo giao diện sắc nét, phản hồi cảm ứng mượt mà.

3. **Kết quả Kiểm chuẩn & Nghiệm thu**:
   - Kiểm tra cú pháp JavaScript: `node -c public/app.js` đạt mã 0 (hợp lệ 100%).
   - Kiểm tra tính hợp lệ XML/SVG: Toàn bộ 18 tệp SVG đều hợp lệ, không chứa thẻ `<image>`.
   - Kiểm thử tự hành: Chạy `npm test` vượt qua toàn bộ 15/15 tầng kiểm thử (100.0% PASS).
   - Nâng cache-buster trong `public/index.html`.
   - Đồng bộ hoàn tất sang Capacitor Android: `npm run sync:android`.
   - Bảo toàn tệp cấu hình workspace `survey-platform.code-workspace`.


---

## CẬP NHẬT: TỐI ƯU HÓA BIỂU TƯỢNG LOGO WEB CHỮ S (GIỮ NGUYÊN HÌNH KHỐI GỐC & XÓA CHỮ SURVHUB)
- **Yêu cầu**: Xóa dòng chữ "SurvHub" bên dưới, giữ nguyên 100% hình tượng chữ S màu cam gốc từ ảnh người dùng tạo, không làm sai lệch chi tiết dải ruy-băng/màu sắc; tối ưu kích thước và căn giữa chuẩn tỉ lệ logo web.
- **Triển khai kỹ thuật**:
  1. Xóa hoàn toàn vùng chữ "SurvHub" bên dưới (từ hàng 590 trở xuống), giữ nguyên vẹn 100% pixel và dải gradient màu cam gốc của biểu tượng chữ S.
  2. Tách nền trong suốt với thuật toán khử viền trắng chuẩn xác (unblending alpha matting), bảo toàn độ sắc nét và chuyển màu chống răng cưa (anti-aliasing).
  3. Căn giữa quang học (optical center cx=132.2, cy=158.9) và tinh chỉnh kích thước biểu tượng chiếm ~82% chiều cao khung canvas hình vuông (target height 420px trên canvas 512x512) để khi thu nhỏ về kích thước navbar (32x32px, 28x28px) hay favicon (48x48px, 32x32px), biểu tượng luôn nổi bật, rõ nét và cân đối.
  4. Xuất bộ tài nguyên logo toàn diện:
     - `public/logo.png` & `public/logo-512.png`: 512x512 Master Transparent PNG.
     - `public/logo-white.png`: 512x512 trên nền trắng thuần khiết.
     - `public/logo-1024.png`: 1024x1024 High-res Transparent PNG.
     - `public/logo-original-clean.png`: 1024x1024 gốc đã xóa chữ SurvHub.
     - `public/icon-512.png`, `public/icon-192.png`: App Icons cho Web App/PWA.
     - `public/favicon.png` & `public/favicon.ico`: Favicon đa kích thước (16/32/48).
     - `public/logo-light.svg`, `public/logo-dark.svg`, `public/logo.svg`, `public/favicon.svg`: Định dạng SVG nhúng lossless.
  5. Đồng bộ toàn bộ tài nguyên logo và bộ icon mipmap (mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi) sang dự án Android (`android/app/src/main/res/` và `android/app/src/main/assets/public/`).
- **Kiểm thử**: Syntax check Node.js và Python đều PASS 100%.

---

## CHÍNH THỨC CHUYỂN ĐỔI THƯƠNG HIỆU SANG SURVHUB & TÍCH HỢP TRANG MỞ ĐẦU CHO KHÁCH (31/10/2026)
1. **Mục tiêu**:
   - Chính thức đổi tên thương hiệu toàn bộ hệ thống từ VibeSurvey thành **SurvHub**.
   - Tạo bộ logo SVG mới vector hóa từ ảnh người dùng (chữ S cách điệu gồm 4 dải ruy băng màu cam gradient rực rỡ, loại bỏ chữ bên dưới), xuất 2 bản cho theme sáng (`logo-light.svg`) và tối (`logo-dark.svg`), cùng các file favicon, icon, PNG; xóa sạch các logo cũ liên quan.
   - Lấy lại y hệt nội dung văn bản và bố cục của 3 trang từ dự án Stitch (`a8f703e9f38c4f6db80c09f21abf1012_trang_chu_mo_dau.html`, `1b986c90f52b4f1a85a3c6767b002623_dien_dan_goc_de_tai.html`, `fe33e17c90f24b3d8094e754850f5c31_thong_tin_tai_khoan_quan_ly_khao_sat.html`).
   - Cấu hình Trang Chủ Mở Đầu (`home`) hiển thị mặc định cho khách chưa đăng nhập (thay thế cho màn hình khảo sát khách cũ).

2. **Đội ngũ 5 Subagents chuyên biệt vận hành song song**:
   - `UI Integrator`: Cấu hình router `home`, cập nhật thanh điều hướng cho khách (`home`, `surveys`, `forum`, `create-survey`, `voucher-market`), xử lý chuyển hướng khi đăng xuất và sự kiện nhấp logo về trang chủ.
   - `Logo & Asset Specialist`: Vector hóa logo chữ S (2 bản theme sáng và tối), xuất các định dạng PNG/Favicon, dọn sạch logo cũ/chó robot trong web và android assets.
   - `Stitch Content Specialist`: Đồng bộ câu từ trên cả 3 trang lấy lại y hệt văn bản gốc từ Stitch (Slogan "Share form, share your insights", thẻ mẫu tương tác, 3 khối bento, bảng xếp hạng diễn đàn, 5 tab hồ sơ).
   - `Brand Sweep Specialist`: Rà soát toàn bộ dự án (web, backend, email, config, android), chuyển đổi triệt để các chuỗi "vibesurvey" sang "SurvHub", hỗ trợ đọc fallback localStorage key cũ/mới và JWT key.
   - `Autonomous QA Bot`: Kiểm tra cú pháp tất cả các tệp JavaScript, chạy toàn bộ bộ kiểm thử tự động `npm test` (15/15 tầng PASS) và đồng bộ Android Capacitor.

3. **Kết quả kiểm chuẩn & bàn giao**:
   - Cú pháp: `node -c public/app.js` đạt 100% hợp lệ.
   - Kiểm thử tự động: 15/15 tầng kiểm thử `npm test` đều PASS 100% (thời gian: 23.33s).
   - Android Capacitor: Đồng bộ hoàn tất qua `npm run sync:android`.
   - Cấu hình workspace: Bảo toàn nguyên vẹn `survey-platform.code-workspace`.
   - **Đồng bộ Git & GitHub (Rule 16)**:
     + `auto_github_sync: true`
     + Remote: `origin https://github.com/trungdzid3/VibeSurvey.git` (nhánh `main`).
     + Đã tự động commit và đẩy mã nguồn hoàn chỉnh lên GitHub.

4. **Tối ưu hóa Giao diện Diễn Đàn & Trang Mở Đầu Chuẩn DESIGN.MD (01/11/2026)**:
   - **Nền ứng dụng Light Mode**: Chuyển sang màu nền surface ấm nhẹ nhàng của Stitch (`#FFF8F5`) kèm các khối ambient atmospheric glow gradient mờ tinh tế cho toàn bộ hệ thống.
   - **Diễn Đàn**:
     + Chuẩn hóa tiêu đề tinh gọn thành "Diễn Đàn" (loại bỏ từ ngữ rườm rà).
     + Loại bỏ 100% icon sticker/emoji màu sắc lòe loẹt, chỉ sử dụng icon Lucide nét mảnh đơn sắc đồng bộ.
     + Xóa sạch toàn bộ các bài viết mock cứng và số liệu ảo.
     + Kết nối 100% dữ liệu bài viết thật từ backend SQLite (`/api/forum/posts`), số liệu thực tế theo số bài trong cơ sở dữ liệu.
     + Kích hoạt đầy đủ các nút tương tác: Đăng bài mới, Thích bài viết, Xem & Gửi bình luận, Sao chép liên kết chia sẻ, Tham gia khảo sát đính kèm.
   - **Thẻ Mẫu Tương Tác Trang Mở Đầu**:
     + Chuẩn hóa đơn vị tiền tệ sang Điểm thưởng SurvHub (loại bỏ "Xu").
     + Nút hành động chuyển hướng mở modal Đăng ký / Đăng nhập để tham gia làm bài khảo sát thật thay vì giả lập hoàn thành.
   - **Widget Điểm Danh (Streak Header)**:
     + Khi chưa điểm danh: Hiển thị màu xám trung tính, ngọn lửa nét mỏng màu xám, loại bỏ hoàn toàn chấm đỏ nhấp nháy.
     + Khi đã điểm danh: Bừng sáng ngọn lửa rực rỡ phong cách TikTok (tô màu cam-đỏ, viền phát sáng gradient).


---

## CẬP NHẬT: TẠO LẠI TOÀN BỘ LOGO THÀNH PURE VECTOR SVG (KHÔNG DÙNG THẺ IMAGE / CẮT ẢNH)
- **Yêu cầu người dùng**: "đừng cắt ảnh, tạo lại svg chứ" -> Không dùng ảnh nhúng `<image>`, chuyển toàn bộ biểu tượng chữ S thành mã vector toán học SVG nguyên bản (`<path>`, `<linearGradient>`), loại bỏ hoàn toàn chữ SurvHub bên dưới và căn chỉnh tỉ lệ chuẩn logo web.
- **Triển khai kỹ thuật**:
  1. Phân tích giải phẫu hình học 4 dải ruy-băng tạo thành biểu tượng chữ S (Top Ribbon, Upper Loop, Lower Loop, Bottom Ribbon) đối xứng xoay 180 độ.
  2. Bắt các góc nhọn hình học (slanted cut corners và tips) để giữ độ sắc nét tự nhiên, đồng thời áp dụng thuật toán làm mịn phân đoạn đường cong Gaussian kết hợp nội suy Bezier bậc 3 (Cubic Bezier Splines) để loại bỏ hoàn toàn hiện tượng bậc thang pixel (raster staircasing).
  3. Xây dựng dải màu vector sắc thái chính xác:
     - Dải ruy-băng trên: `#FD7839 -> #FE8B2B -> #FB9B29`.
     - Vòng cung trên-trái: `#FD7839 -> #FF6C43 -> #F54A38`.
     - Vòng cung dưới-phải: `#FF7530 -> #FF842F -> #FFA024`.
     - Dải ruy-băng dưới: `#FF5252 -> #FF624E -> #FE763A`.
  4. Xuất bộ tệp Pure Vector SVG siêu nhẹ (<6 KB):
     - `public/logo-light.svg` (5.7 KB) & `public/logo.svg`: Pure Vector SVG cho Light mode.
     - `public/logo-dark.svg` (6.0 KB): Pure Vector SVG có hiệu ứng phát quang ấm dịu (ambient glow) cho Dark mode.
     - `public/favicon.svg` (5.7 KB): Vector favicon cho trình duyệt hiện đại.
  5. Kết xuất đồng bộ các tệp raster đa kích thước trực tiếp từ bản vẽ vector chuẩn xác bằng Chrome Headless Engine (`logo.png`, `icon-512.png`, `icon-192.png`, `favicon.png`, `favicon.ico`, `android/mipmap`).
- **Kiểm tra**:
  - `logo-light.svg`, `logo-dark.svg`, `logo.svg`, `favicon.svg` hoàn toàn KHÔNG chứa thẻ `<image>`, 100% là vector `<path>` và `<linearGradient>`.
  - Syntax check Node.js & Python: PASS.


---

## Điều Chỉnh Vị Trí Bộ Tài Sản Vector SVG Ví và Xu Coupon Lên Góc Trên Bên Phải (01/11/2026)
1. **Bối cảnh & Yêu cầu Người dùng**:
   - Khi đặt ở góc phải dưới (`-bottom-2 sm:-bottom-4`), tài sản SVG bị đè một phần bởi thanh tiến độ và nút bấm CTA ("Đổi thưởng / Rút tiền" và "Nạp Credit").
   - Người dùng yêu cầu chuyển vị trí ví và xu & voucher lên **góc trên bên phải** (`top-right`) của cả 2 thẻ Bento (Thẻ Point và Thẻ Credit).

2. **Chi tiết Kỹ thuật Triển khai**:
   - **Tối ưu vị trí trong `public/app.js`**:
     + Thẻ Point: Đổi class từ `-bottom-2 sm:-bottom-4 -right-3 sm:-right-5 w-38 sm:w-44` sang `right-2 sm:right-4 top-2 sm:top-3.5 w-32 sm:w-38 h-auto object-contain pointer-events-none select-none z-0 opacity-40 dark:opacity-20 drop-shadow-sm`.
     + Thẻ Credit: Đổi class từ `-bottom-2 sm:-bottom-4 -right-2 sm:-right-4 w-38 sm:w-44` sang `right-2 sm:right-4 top-2 sm:top-3.5 w-32 sm:w-38 h-auto object-contain pointer-events-none select-none z-0 opacity-40 dark:opacity-20`.
   - **Hiệu ứng thị giác**:
     + Đặt gọn gàng tại khoảng trống góc trên bên phải, song song ngang hàng với Badge "POINT CỦA BẠN" và tiêu đề "CREDIT".
     + Không bị che khuất bởi các nút CTA ở chân thẻ, giữ nguyên bố cục cân xứng và độ mờ mượt mà.

3. **Kiểm chuẩn & Đồng bộ**:
   - `node -c public/app.js`: 100% cú pháp JavaScript hợp lệ.
   - Nâng cache-buster trong `public/index.html`.
   - Đồng bộ hoàn tất sang Capacitor Android: `npm run sync:android`.
   - Commit và push trực tiếp lên kho lưu trữ GitHub (`origin/main`).


---

## Tăng Kích Thước Bộ Tài Sản 3D Vector SVG Lên Cỡ Lớn Ở Góc Trên Bên Phải (01/11/2026)
1. **Bối cảnh & Yêu cầu Người dùng**:
   - Hình ảnh ví da và voucher & xu ở kích thước cũ (`w-32 sm:w-38`) hơi nhỏ khi đặt trong thẻ Bento lớn `min-h-[260px]`.
   - Người dùng yêu cầu tăng kích thước to hơn để hiển thị rõ ràng, nổi bật các chi tiết thiết kế.

2. **Chi tiết Kỹ thuật Triển khai**:
   - **Tăng kích thước và tinh chỉnh tọa độ trong `public/app.js`**:
     + Thẻ Point: Đổi class từ `right-2 sm:right-4 top-2 sm:top-3.5 w-32 sm:w-38` sang `right-1 sm:right-3 top-1 sm:top-2 w-44 sm:w-52 h-auto object-contain pointer-events-none select-none z-0 opacity-40 dark:opacity-20 drop-shadow-sm`.
     + Thẻ Credit: Đổi class từ `right-2 sm:right-4 top-2 sm:top-3.5 w-32 sm:w-38` sang `right-1 sm:right-3 top-1 sm:top-2 w-44 sm:w-52 h-auto object-contain pointer-events-none select-none z-0 opacity-40 dark:opacity-20`.
   - **Hiệu ứng thị giác**:
     + Chiều rộng tăng lên 176px trên di động và 208px trên máy tính/tablet, các chi tiết 2 thẻ thò ra, quai bấm và chồng đồng xu 3D hiện lên rõ nét và đầy đặn hơn.
     + Không gây xung đột hay đè chữ số dư, giữ nguyên độ mờ dịu mắt và khả năng tương tác mượt mà.

3. **Kiểm chuẩn & Đồng bộ**:
   - `node -c public/app.js`: 100% cú pháp JavaScript hợp lệ.
   - Nâng cache-buster trong `public/index.html`.
   - Đồng bộ hoàn tất sang Capacitor Android: `npm run sync:android`.
   - Commit và push trực tiếp lên kho lưu trữ GitHub (`origin/main`).


---

## Nâng Cấp Hiệu Ứng Chuyển Đổi Giao Diện Sáng / Tối Mượt Mà Chuẩn Cao Cấp (01/11/2026)
1. **Bối cảnh & Yêu cầu Người dùng**:
   - Nút đổi theme trước đây thay đổi icon đột ngột bằng `innerHTML`, tạo cảm giác giật cục và đơn điệu.
   - Người dùng yêu cầu tạo animation mượt mà khi bấm nút đổi theme thay vì đổi icon đơn điệu.

2. **Chi tiết Kỹ thuật Triển khai**:
   - **Cấu trúc Dual-Icon Morphing & Rotation trong nút Theme (`public/index.html` & `public/styles.css`)**:
     + Nút `#theme-toggle-btn` chuyển sang cấu trúc lồng 2 icon độc lập: Icon Mặt Trời (`.theme-icon-sun`, màu vàng kim hổ phách `#F59E0B`) và Icon Mặt Trăng (`.theme-icon-moon`).
     + Cơ chế xoay lật đa trục bằng GPU (`cubic-bezier(0.34, 1.56, 0.64, 1)`):
       * Chế độ Sáng (Light): Mặt trăng hiển thị nguyên bản (`scale(1) rotate(0deg)`), mặt trời thu nhỏ và xoay giấu đi (`scale(0) rotate(90deg)`).
       * Chế độ Tối (Dark): Mặt trời xoay vào trung tâm (`scale(1) rotate(0deg)`), mặt trăng xoay lùi và thu nhỏ (`scale(0) rotate(-90deg)`).
     + Nút bấm phản hồi vật lý lò xo khi hover (`scale(1.06)`) và click active (`scale(0.90) rotate(-6deg)`).
   - **Hiệu ứng Gợn Sóng Toàn Màn Hình (Circular Ripple Wave via View Transition API)**:
     + Trong `toggleTheme(event)` tại `public/app.js`: Tận dụng `document.startViewTransition` kết hợp tọa độ con trỏ chuột (`event.clientX`, `event.clientY`).
     + Khi người dùng nhấn nút, một vòng tròn ánh sáng/bóng tối lan tỏa từ vị trí nút ra toàn bộ màn hình theo dạng clip-path bán kính `Math.hypot`, thời lượng 450ms mượt mà chuẩn 60 FPS.
     + Fallback mượt mà: Với các trình duyệt chưa hỗ trợ View Transition API hoặc khi bật chế độ giảm chuyển động (`prefers-reduced-motion`), hệ thống tự động kích hoạt lớp `.theme-transitioning` làm mềm màu nền, màu chữ và đường viền trong 320ms.

3. **Kiểm chuẩn & Đồng bộ**:
   - `node -c public/app.js`: 100% cú pháp JavaScript hợp lệ.
   - Cập nhật số phiên bản cache-buster trong `public/index.html`.
   - Đồng bộ hoàn tất sang Capacitor Android: `npm run sync:android`.
   - Commit và push trực tiếp lên kho lưu trữ GitHub (`origin/main`).


---

## Nâng Cấp Bộ Lọc Diễn Đàn In-Place Mượt Mà, Khôi Phục Bảng Xếp Hạng & Hoàn Thiện Giao Diện Stitch (01/11/2026)
1. **Bối cảnh & Yêu cầu Người dùng**:
   - Diễn đàn khi ấn lọc bị giật cục, reload toàn trang; yêu cầu chuyển sang bộ lọc đa tầng toàn diện thay vì chỉ có vài chip đơn điệu.
   - Khôi phục Bảng Xếp Hạng Đóng Góp (Top Hỗ Trợ Điền Form) và Đề Tài Hot Tuần Này theo Stitch, liên kết API dữ liệu thật từ SQLite, không dùng dữ liệu demo rác hay emoji/sticker lòe loẹt.
   - Nút điểm danh (Streak widget): khi chưa điểm danh hiển thị màu xám trung tính (bỏ chấm đỏ nhấp nháy), khi đã điểm danh thì bừng sáng ngọn lửa rực rỡ phong cách TikTok.
   - Thẻ mẫu tương tác trang mở đầu: chuyển đổi đơn vị Xu sang Điểm chuẩn SurvHub, nút bấm dẫn sang Modal Đăng ký/Đăng nhập.
   - Áp dụng nền màu Stitch `#FFF8F5` cùng các dải ambient atmospheric glow nhẹ nhàng cho toàn bộ các trang ở Light mode.

2. **Chi tiết Kỹ thuật Triển khai**:
   - **Backend API (`server/controllers/forumController.js` & `server/routes/api.js`)**:
     + Bổ sung endpoint `GET /api/forum/leaderboard`: Truy vấn top 5 người dùng hoàn thành nhiều khảo sát nhất (`respondent_id = u.id AND r.status = 'COMPLETED'`) và thống kê các đề tài thảo luận sôi nổi nhất tuần.
   - **Frontend In-Place Filter & Leaderboard (`public/app.js`)**:
     + Chia tách layout tĩnh và feed động qua `_renderForumLayout` và `_updateForumFeedInPlace`: Khi chuyển đổi chuyên ngành hoặc phạm vi, DOM chỉ cập nhật danh sách bài viết trong feed container, hoàn toàn không chớp nháy (zero-jank).
     + Hệ thống bộ lọc đa tầng: 7 chuyên ngành nghiên cứu, 4 phạm vi bài viết (`Tất cả`, `Có đính kèm khảo sát`, `Trao đổi đáp viên`, `Bài viết của tôi`), 3 tiêu chí sắp xếp (`Mới nhất`, `Nhiều lượt thích`, `Nhiều thảo luận`), ô tìm kiếm realtime và nút đặt lại bộ lọc.
     + Cột Sidebar chuẩn `DESIGN.md`: Khôi phục Widget Bảng Xếp Hạng Top Hỗ Trợ Điền Form (Hạng 1 badge cam `#EA580C`, Hạng 2-3 badge xám bạc) và Đề Tài Hot Tuần Này.
     + Nút Streak Header: Hiển thị xám trung tính khi chưa điểm danh (`text-neutral-400 border-neutral-300`), bừng sáng ngọn lửa rực rỡ phong cách TikTok (`from-orange-500 via-rose-500 to-amber-500`) khi đã điểm danh.
     + Thẻ mẫu tương tác Trang mở đầu: Chuẩn hóa thành `+1.500 Điểm`, nút chuyển hướng gọi `openAuthModal('register')` kích hoạt đăng ký tài khoản.
   - **Nền Giao Diện Toàn Trang (`public/index.html`)**:
     + Cập nhật màu nền body thành `bg-[#FFF8F5] dark:bg-[#121214]`.
     + Bổ sung 3 khối Stitch ambient atmospheric glow gradient mờ mịn tạo chiều sâu tinh tế.

3. **Kiểm chuẩn & Đồng bộ**:
   - Cú pháp `node -c public/app.js`, `node -c server/controllers/forumController.js`, `node -c server/routes/api.js`: 100% PASS.
   - Bộ kiểm thử tự hành 15/15 tầng: 100% PASS.
   - Đồng bộ hoàn tất sang Capacitor Android: `npm run sync:android`.
   - Cam kết và đồng bộ lên GitHub: `git push origin main`.
