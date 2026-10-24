# KẾ HOẠCH TỔNG THỂ NỀN TẢNG KHẢO SÁT CỘNG ĐỒNG & DOANH NGHIỆP (PHIÊN BẢN CHUẨN HÓA)

> **Định vị mô hình**: Kết hợp mô hình **Cộng đồng trao đổi học thuật (tương tự Studocu / Scribd)** dành cho sinh viên và **Nền tảng thu thập dữ liệu mục tiêu (Targeted Research & Insight)** dành cho doanh nghiệp.

---

## 1. THÔNG TIN TÀI KHOẢN & KHỞI TẠO HỒ SƠ (ONBOARDING)

### 1.1. Thông tin đăng ký & định danh
- **Thông tin tài khoản cơ bản**:
  - Email cá nhân (Xác thực qua mã OTP 6 số hoặc Đăng nhập nhanh Google OAuth 2.0).
  - Tên tài khoản hiển thị (`name`).
  - Mật khẩu (`password_hash`).
- **Thông tin nhân khẩu học bắt buộc (Phục vụ bộ lọc Matching Bên A - Bên B)**:
  - **Độ tuổi** (Năm sinh / Nhóm tuổi).
  - **Giới tính** (Nam / Nữ / Khác).
  - **Phân loại đối tượng hiện tại**: `Học sinh` | `Sinh viên` | `Đi làm`.
    - **Đối với Sinh viên**: Trường đang theo học + Ngành học hiện tại.
    - **Đối với Người đi làm**: Nhóm ngành công việc hiện tại + Đơn vị công tác (Doanh nghiệp / Tổ chức).

### 1.2. Chính sách thưởng khởi tạo mặc định (Onboarding Reward)
- **Cơ chế Progressive Onboarding (2 bước chống rớt người dùng)**:
  - **Bước 1**: Đăng ký nhanh bằng Google hoặc Email OTP trong 10 giây.
  - **Bước 2**: Hoàn thiện 100% Hồ sơ Nhân khẩu học để nhận ngay **Quỹ khởi nghiệp mặc định: `15.000 Credit` (tương đương 15 lượt khảo sát miễn phí)** hoặc **Gói Dùng Thử 25 mẫu đầu tiên (trị giá 50.000đ)**.
- **Chốt chặn an toàn**: Khoản thưởng mặc định này được cộng thẳng vào **Ví Tạo Khảo Sát (`credit_balance`)**, chỉ dùng để đăng khảo sát thu thập mẫu, **tuyệt đối không thể rút ra tiền mặt**.

---

## 2. ĐƠN VỊ TIỀN TỆ & CHIẾN LƯỢC KINH DOANH (TOKENOMICS 1:1)

### 2.1. Chuẩn hóa mệnh giá `1 Đơn vị = 1 VNĐ`
Toàn bộ hệ thống sử dụng tỷ giá chuẩn **1:1 theo VNĐ** (số nguyên `INTEGER`), nhưng được quản lý trong **2 ngăn ví độc lập** trên Sổ cái kế toán kép (Double-Entry Ledger ACID):

| Tên Ví | Ký Hiệu Trong DB | Nguồn Tiền Chảy Vào | Mục Đích Sử Dụng | Quy Tắc Bảo Mật ("Van Một Chiều") |
| :--- | :--- | :--- | :--- | :--- |
| **1. Ví Tiền Thưởng**<br>*(Rút được tiền mặt)* | `point_balance`<br>*(1 Điểm = 1 VNĐ)* | Điền các bài khảo sát thuộc **Gói Upgrade (Trả phí)** đã được ký quỹ bằng tiền thật. | • Rút tiền mặt về Ngân hàng / MoMo.<br>• Đổi thẻ cào điện thoại / E-Voucher.<br>• Đổi sang Ví Tạo Khảo Sát (`Credit`) để hưởng trợ giá. | Không bao giờ cộng tiền tặng miễn phí hoặc điểm điền chéo vào ví này. |
| **2. Ví Tạo Khảo Sát**<br>*(Ngân sách đăng form)* | `credit_balance`<br>*(1 Credit = 1 VNĐ)* | • Nạp tiền thật từ ngân hàng/ví điện tử.<br>• Thưởng hoàn thiện hồ sơ mặc định.<br>• Điền khảo sát giúp cộng đồng trên **Diễn đàn Miễn phí**.<br>• Đổi từ Ví Tiền Thưởng sang. | **Duy nhất 1 mục đích**: Khóa quỹ ký quỹ (Escrow) để đăng bài khảo sát và nhận lượt phản hồi (Responses). | **Khóa Van 1 Chiều**: Đã nằm ở `credit_balance` thì vĩnh viễn không rút ra tiền mặt được. |

---

### 2.2. Hai phân khúc vận hành cốt lõi

#### Phân khúc A: Khảo sát Miễn Phí (Diễn đàn Cộng đồng Sinh viên)
- **Nguyên lý**: Điền giúp khảo sát của người khác để tích lũy `Credit` (Points cộng đồng), sau đó dùng chính số `Credit` đó để đăng bài nhận lại số lượng phản hồi tương ứng.
- **Định mức quy đổi chuẩn**:
  - **Cơ sở**: `1 lượt phản hồi (Response) = 1.000 Credit` (tương đương 1 Point cũ).
  - Cần **100 Responses** $\rightarrow$ Cần khóa quỹ **100.000 Credit** (Người tham gia điền nhận 1.000 Credit/bài).
  - **Điều chỉnh công bằng theo độ dài form (Chống nhồi nhét câu hỏi)**:
    - Form ngắn ($\le 10$ câu): **1.000 Credit / lượt**.
    - Form vừa ($11 - 25$ câu): **2.000 Credit / lượt**.
    - Form dài ($> 25$ câu): **3.000 Credit / lượt**.
  - **Cơ chế chống lạm phát (Point Sink)**: Nền tảng thu hồi **10% phí duy trì diễn đàn** trên tổng quỹ bài đăng miễn phí để triệt tiêu lạm phát điểm.

#### Phân khúc B: Gói Upgrade (Khảo sát Trả Phí cho Doanh nghiệp & Người cần gấp)
- **Cơ chế đơn giá (Unit Economics)**:
  - **Bên A (Người tạo khảo sát) nạp**: **`1.500đ – 2.000đ / 1 Response`** (tùy độ dài & bộ lọc).
    - *Ví dụ*: Cần **200 Responses** $\times$ `1.500đ ~ 2.000đ` = Khóa quỹ **`300.000đ ~ 400.000đ`**.
  - **Bên B (Người tham gia khảo sát) nhận**: **`1.000đ` tiền thật** cộng thẳng vào **Ví Tiền Thưởng (`point_balance`)** + **Mã E-Voucher thương hiệu** (nếu doanh nghiệp đính kèm).
  - **Nền tảng thu lợi nhuận (Take Rate Spread)**: **`500đ – 1.000đ / 1 phiếu khảo sát`** (Biên lợi nhuận 33% – 50%).
- **Quyền lợi đặc quyền của tài khoản nạp tiền (Gói Upgrade)**:
  1. **Điều hướng thông minh (Targeted Routing)**: Phân phối biểu mẫu chính xác tới tệp người dùng khớp Độ tuổi, Giới tính, Ngành học / Nghề nghiệp.
  2. **Thông báo đa kênh tức thì**: Hệ thống tự động bắn **Thông báo đẩy (Push Notification)** tới điện thoại (App Android) và gửi **Email trực tiếp** kèm đường dẫn làm bài nhanh (Deep-link) cho những người dùng phù hợp.
  3. **Ghim vị trí VIP**: Ưu tiên hiển thị trên đầu trang Khám phá để thu thập đủ mẫu trong thời gian ngắn nhất.
  4. **Thưởng nạp theo bậc (Tiered Deposit Bonus)**: Nạp càng lớn được tặng thêm `2% – 12% Credit` tạo form và hỗ trợ xuất **Hóa đơn VAT** cho doanh nghiệp.

---

### 2.3. Cơ chế quy đổi từ Tiền thưởng (`Point`) sang Ngân sách tạo form (`Credit`)
- **Mục tiêu**: Khuyến khích người điền khảo sát không rút tiền mặt ra khỏi nền tảng mà tái đầu tư để đăng khảo sát của chính họ.
- **Tỷ lệ trợ giá ưu đãi**:
  - Đổi **`1.000đ Tiền Thưởng` (`point_balance`) $\rightarrow$ Nhận `1.400đ ~ 1.500đ Credit` (`credit_balance`)** (tương đương hệ số **1,4 – 1,5 lần**, đủ để mua ngay 1 lượt phản hồi mới mà không cần nạp thêm tiền).
- **An toàn toán học (Anti-Arbitrage)**:
  - Vì `1.500đ Credit` khi tạo khảo sát sẽ bị sàn khấu trừ `500đ` phí nền tảng và chỉ trả ra tối đa `1.000đ Tiền Thưởng` cho người điền tiếp theo, tổng số tiền thưởng rút được sau mỗi vòng luôn $\le 1.000\text{đ}$ ban đầu $\rightarrow$ **Chặn đứng 100% lỗ hổng tự lập 2 nick quay vòng đẻ tiền mặt**.

---

## 3. CƠ CHẾ XÁC THỰC "CHÉO FORM" (LÀM SAO BIẾT ĐÃ ĐIỀN ĐỂ CHÉO?)

Giải quyết triệt để tình trạng "điền xong bị quỵt" hoặc "chụp ảnh màn hình giả" trên mạng xã hội thông qua **2 cơ chế tự động**:

### 3.1. Xác thực tự động 100% đã điền form thật
1. **Cách 1 — Làm trực tiếp trên Trình làm bài của Nền tảng (Khuyên dùng)**:
   - Người tạo chỉ cần dán link **Google Forms / Microsoft Forms**, hệ thống (`formParserService`) tự động bóc tách toàn bộ câu hỏi đưa vào trình làm bài Stepper nội bộ.
   - Người điền trả lời và bấm **Nộp bài** ngay trên web/app $\rightarrow$ Hệ thống kiểm tra chống gian lận $\rightarrow$ Tự động ghi nhận hoàn thành và đẩy dữ liệu về Google Sheets của chủ form.
2. **Cách 2 — Mã xác nhận cuối biểu mẫu (`Secret Completion Code`)**:
   - Dành cho các Google Form đặc thù cần mở trực tiếp: Hệ thống sinh mã bí mật (VD: `SURV-8921`) để chủ form đặt ở lời cảm ơn sau khi gửi của Google Form.
   - Người điền hoàn tất Google Form, lấy mã ở trang cuối nhập lại vào nền tảng $\rightarrow$ Khớp mã hệ thống mới cộng thưởng.

### 3.2. Hai hình thức nhận lượt điền lại (Chéo Vòng Tròn & Chéo Trả Lễ 1-1)
- **Hình thức 1 — Chéo Vòng Tròn Tự Động (Qua bể Credit chung)**:
  - A điền bài của B $\rightarrow$ A nhận ngay `1.000 Credit` vào ví $\rightarrow$ Bài của A tự động được mở khóa trên diễn đàn để C, D, E vào điền mà không cần chờ B online.
- **Hình thức 2 — Chéo Trả Lễ Trực Tiếp 1-1 (`[⚡ Điền Trả Lễ]`)**:
  - Khi B điền xong bài của A, hệ thống gửi thông báo cho A: *"Bạn B vừa giúp bạn 1 phiếu! Bấm vào đây để **Điền Trả Lễ** cho khảo sát của B"*.
  - Trên Diễn đàn có khu vực riêng **"Đang chờ bạn Điền Trả Lễ"** và gắn huy hiệu **`[Uy tín trả lễ 100%]`** cho những thành viên tích cực trả lễ, giúp bài của họ được ưu tiên đẩy lên cao.

---

## 4. HÌNH THỨC PHÂN CHIA TỆP KHÁCH HÀNG & GIAO DIỆN (APP / WEB)

### 4.1. Cấu trúc các không gian giao diện
1. **Giao diện Home (Trang chủ Tổng quan)**:
   - Banner tổng quan tài khoản (Số dư Tiền Thưởng rút được & Số dư Credit tạo khảo sát, Thanh tiến độ đổi thưởng).
   - Lối tắt truy cập nhanh sang 2 khu vực khảo sát và tạo biểu mẫu.
2. **Giao diện 1 — Diễn Đàn Chia Sẻ Form Miễn Phí (Dành cho Sinh viên / Cộng đồng)**:
   - Hiển thị các bài khảo sát trao đổi bằng `Credit`.
   - Khối ưu tiên: **"Danh sách chờ Điền Trả Lễ 1-1"**.
   - Quy định rõ số lượng Responses nhận được tương ứng với số Credit đang có trong tài khoản.
3. **Giao diện 2 — Khảo Sát Nhận Tiền & Voucher (Dành cho Gói Upgrade)**:
   - Hiển thị các bài khảo sát trả tiền thật (`+1.000đ/bài` + Huy hiệu Voucher thương hiệu).
   - Sắp xếp tự động theo **Độ khớp (Matching Score %)** giữa yêu cầu của Bên A và Hồ sơ nhân khẩu học của Bên B.
4. **Giao diện Tạo & Quản Lý Khảo Sát (Creator Studio)**:
   - **3 Chế độ nhập liệu**: (1) Tự tạo form bằng bộ công cụ nền tảng (8 loại câu hỏi), (2) Dán văn bản nhanh (Smart Paste từ Word/Docs), (3) Nhúng / Bóc tách trực tiếp từ link Google Forms & Microsoft Forms.
   - **Đồng bộ & Xuất dữ liệu**: Tự động đẩy kết quả thời gian thực sang **Google Sheets (Webhook)**, tải xuống file **Excel / CSV chuẩn UTF-8** và xem biểu đồ thống kê trực quan (Analytics) sau khi đã lọc sạch form ảo.
5. **Hệ thống Bộ lọc thông minh (Smart Filters)**:
   - Bộ lọc cho người điền: Lọc theo Ngành nghề, Trường học, Độ tuổi, Thời lượng làm bài, Mức thưởng.
   - Bộ lọc Matching cho người tạo (Bên A $\leftrightarrow$ Bên B): Chọn tiêu chí Độ tuổi, Giới tính, Sinh viên (Trường/Ngành) hoặc Người đi làm (Nhóm ngành/Đơn vị).

---

## 5. GIẢI PHÁP CHO 4 VẤN ĐỀ VẬN HÀNH CỐT LÕI

### 5.1. Vấn đề 1: Loãng form khảo sát
- **Giải pháp**:
  1. **Tách biệt 2 không gian**: Đưa form sinh viên trao đổi miễn phí sang *Diễn đàn Cộng đồng*, không làm loãng khu vực *Khảo sát Trả phí (Upgrade)*.
  2. **Thuật toán Auto-Matching**: Chỉ hiển thị những khảo sát khớp với Độ tuổi, Giới tính, Ngành học / Nghề nghiệp mà người dùng đã khai báo.
  3. **Cơ chế dọn dẹp & FOMO tự động**: Tự động ẩn 100% các bài đã thu thập đủ mẫu hoặc người dùng đã làm; ưu tiên đẩy các bài sắp hoàn thành ($\ge 60\%$ tiến độ - gắn nhãn `🔥 Còn X suất`) lên đầu để dứt điểm nhanh từng bài; phân trang gọn gàng (8 bài/trang).
  4. **Chặn spam trùng link**: Chuẩn hóa URL (`normalizeFormUrl`) chặn tuyệt đối việc đăng đi đăng lại một đường link Google/MS Form.

### 5.2. Vấn đề 2: Minh bạch trong giao dịch nạp & rút tiền (Ngân hàng, Ví điện tử)
- **Giải pháp**:
  1. **Sổ cái kế toán kép (Double-Entry Ledger ACID)**: Mọi giao dịch nạp quỹ, khóa ký quỹ, nhận thưởng, đổi điểm, rút tiền đều được ghi nhận nguyên tử tại bảng `point_transactions` kèm số dư trước/sau (`balance_after`) và mã tham chiếu rõ ràng.
  2. **Mốc rút tiền "Phá băng niềm tin"**: Cho phép rút thử nghiệm chỉ từ **`10.000đ` ở lần đầu tiên** (qua Thẻ cào điện thoại, miễn phí 100% phí giao dịch) để chứng minh độ uy tín của nền tảng; từ các lần sau rút về Ngân hàng / MoMo ở các mốc `50.000đ – 500.000đ`.
  3. **Đối soát & Hóa đơn**: Cung cấp bảng lịch sử trạng thái lệnh rút (`PENDING`, `APPROVED`, `COMPLETED`, `REJECTED`) theo thời gian thực và hỗ trợ xuất **Hóa đơn điện tử VAT 100%** cho doanh nghiệp nạp tiền.

### 5.3. Vấn đề 3: Định mức Points/Credit mặc định khi đăng ký và khai báo đầy đủ
- **Giải pháp**:
  - Áp dụng mức thưởng khởi tạo **`15.000 Credit` (tương đương 15 lượt phản hồi miễn phí)** hoặc **1 Gói Dùng Thử 25 mẫu đầu tiên** ngay khi tài khoản hoàn tất: *(1) Xác thực Email OTP / Google* và *(2) Khai báo đủ 100% Hồ sơ nhân khẩu học*.
  - Con số 15 – 25 mẫu là "điểm ngọt" (Sweet Spot): Đủ lớn để người dùng trải nghiệm ngay giá trị thật của nền tảng, nhưng nếu muốn thu thập đủ 100 – 200 mẫu cho đề tài nghiên cứu thì họ bắt buộc phải tham gia điền chéo cho cộng đồng hoặc nâng cấp gói trả phí.

### 5.4. Vấn đề 4: Không gian khấu trừ doanh thu của nền tảng
- **Giải pháp — Khấu trừ tự động qua Không gian Ký Quỹ Trung Gian (`Escrow Smart Lock`)**:
  1. **Bước 1 (Khóa quỹ khi đăng bài)**: Khi Bên A xuất bản khảo sát Gói Upgrade (VD: 200 mẫu $\times$ 2.000đ = `400.000đ`), hệ thống trừ `400.000đ` từ ví của Bên A và **khóa tạm thời vào Không gian Ký Quỹ (`escrow_locked_balance`)**.
  2. **Bước 2 (Kiểm định chất lượng Anti-Fraud 4 lớp)**: Mỗi khi Bên B nộp 1 phiếu trả lời, hệ thống tự động chấm điểm qua 4 chốt chặn: *Bẫy tốc độ đọc tối thiểu (`T_min`)*, *Câu hỏi bẫy sự tập trung (`Attention Check`)*, *Đo phương sai chống khoanh bừa 1 cột (`Straight-lining`)*, và *Kiểm tra trùng IP/Thiết bị*.
  3. **Bước 3 (Giải ngân & Khấu trừ tự động trên từng phiếu sạch)**:
     - Nếu phiếu **Không hợp lệ (Form ảo/Điền bừa)**: Từ chối trả thưởng, **không trừ tiền của Bên A**.
     - Nếu phiếu **Hợp lệ (`VALIDATED`)**: Không gian Ký quỹ tự động giải ngân **`1.000đ` vào Ví Tiền Thưởng của Bên B**, đồng thời **khấu trừ trực tiếp `500đ – 1.000đ` phí dịch vụ về tài khoản doanh thu của Nền tảng**.
  4. **Bước 4 (Hoàn quỹ dư)**: Nếu Bên A đóng khảo sát sớm khi chưa thu đủ 200 mẫu, phần tiền còn dư trong Không gian Ký quỹ được hoàn trả tự động 100% về ví cho Bên A.
