# BẢN HIỆN TRẠNG TỔNG HỢP TOÀN DIỆN HỆ THỐNG VIBESURVEY

Thời điểm lập báo cáo: 28/10/2026
Phiên bản hệ thống: v3.2.1
Trạng thái: Hoạt động ổn định trên môi trường Web Responsive và Android Hybrid (Capacitor)

---

## PHẦN I. MÔ HÌNH KINH TẾ & TOÁN HỌC DÒNG TIỀN (PLATFORM ECONOMICS)

### 1. Đơn vị Tiền tệ & Quy đổi Giá trị
- **Credit (Đơn vị chi trả của Creator)**: $1 \text{ Credit} = 1 \text{ VNĐ}$. Dùng để nạp tiền vào ví, thanh toán chi phí khảo sát và ký quỹ cọc dự án.
- **Point (Đơn vị thù lao của Respondent)**: $1 \text{ Point} = 1 \text{ VNĐ}$. Dùng để tích lũy khi hoàn thành khảo sát, quy đổi thành thẻ cào hoặc rút về ngân hàng / ví điện tử.
- **Tỷ giá định danh trên toàn hệ thống**: Cố định $1:1$ với Đồng Việt Nam (VNĐ), không sử dụng tỷ lệ quy đổi phức tạp gây nhầm lẫn cho người dùng.

---

### 2. Ma trận Đơn giá Sàn & Phân khúc Tài khoản (Pricing Tier Matrix)

Hệ thống phân định rõ 3 phân khúc tài khoản Creator với chính sách giá sàn và quyền lợi khác nhau:

| Tiêu chí | Phân khúc Sinh Viên (`STUDENT`) | Phân khúc Cá Nhân (`PERSONAL`) | Phân khúc Doanh Nghiệp (`ENTERPRISE`) |
| :--- | :--- | :--- | :--- |
| **Điều kiện xác thực** | Email đuôi `.edu.vn` hợp lệ | Xác thực số điện thoại / Email | Giấy phép kinh doanh, MST, tên công ty |
| **Giá sàn khảo sát ngắn** ($\le 5$ câu) | 400 VNĐ / mẫu | 800 VNĐ / mẫu | 1.500 VNĐ / mẫu |
| **Giá sàn khảo sát tiêu chuẩn** ($6 - 15$ câu)| 500 VNĐ / mẫu | 1.000 VNĐ / mẫu | 2.000 VNĐ / mẫu |
| **Giá sàn khảo sát dài** ($> 15$ câu) | 600 VNĐ / mẫu | 1.200 VNĐ / mẫu | 2.500 VNĐ / mẫu |
| **Chính sách tài trợ ban đầu** | Miễn phí 30 lượt/tháng trọn đời | Dùng thử 25 lượt bài đầu tiên | Hạn mức trả sau & Hợp đồng B2B |
| **Bảo hành chất lượng mẫu** | Không áp dụng | Xem xét theo tỷ lệ gian lận | Bảo hành 1 đổi 1 trong vòng 7 ngày |
| **Hóa đơn tài chính** | Không hỗ trợ | Không hỗ trợ | Xuất hóa đơn VAT điện tử 8% / 10% |

---

### 3. Phân bổ Doanh thu, Thù lao & Cơ chế Creator Boost (Quy tắc 80/20)

Mỗi mẫu khảo sát được chi trả bởi Creator sẽ chia thành 2 phần: **Đơn giá sàn ($P_{\text{sàn}}$)** và **Ngân sách tăng thưởng thêm ($\Delta P$)**.

#### A. Cấu trúc Đơn giá sàn tiêu chuẩn ($P_{\text{sàn}}$)
- **Thù lao trả cho Đáp viên**: Chiếm từ $60\%$ đến $70\%$ đơn giá sàn tùy theo gói.
  - Sinh viên: Creator trả 500đ $\rightarrow$ Đáp viên nhận 300 Point (Sàn giữ 200đ = $40\%$).
  - Cá nhân: Creator trả 1.000đ $\rightarrow$ Đáp viên nhận 650 Point (Sàn giữ 350đ = $35\%$).
  - Doanh nghiệp: Creator trả 2.000đ $\rightarrow$ Đáp viên nhận 1.400 Point (Sàn giữ 600đ = $30\%$).
- **Biên lợi nhuận sàn (Spread Margin)**: $30\% - 40\%$ dùng để duy trì hạ tầng máy chủ, hệ thống chống gian lận và chi phí đường truyền viễn thông.

#### B. Cơ chế Tăng Thưởng Tự Do (Creator Boost - Toán học 80/20)
Khi Creator cần gom mẫu gấp hoặc muốn bài của mình hấp dẫn hơn đối thủ, Creator chủ động kéo thanh trượt Boost để tăng đơn giá lên $P_{\text{thực tế}}$ (với $\Delta P = P_{\text{thực tế}} - P_{\text{sàn}} > 0$).
Toàn bộ phần chênh lệch $\Delta P$ được phân bổ theo công thức toán học bất biến:
$$\text{Point}_{\text{thực nhận cho Đáp viên}} = \text{Point}_{\text{cơ bản}} + (0.80 \times \Delta P)$$
$$\text{Lợi nhuận Sàn thu thêm}} = \text{Margin}_{\text{cơ bản}} + (0.20 \times \Delta P)$$

- **Ý nghĩa thực tế**:
  - $80\%$ chuyển trực tiếp vào túi người làm khảo sát, tạo lực hút thù lao vượt trội để bài viết nhảy lên nhóm ưu tiên hàng đầu, kích thích người dùng click làm ngay.
  - $20\%$ dành cho sàn làm phí vận hành dịch vụ tăng tốc (chi phí đẩy thông báo ưu tiên, kiểm soát chống bot và xử lý kết quả hỏa tốc).
  - Không phân biệt đối xử: Sinh viên, Cá nhân hay Doanh nghiệp khi kích hoạt Boost đều tuân thủ chính xác tỷ lệ 80/20.

---

### 4. Cơ chế Ký quỹ Bảo đảm (Escrow) & Hoàn tiền An toàn (Safe Refund)

- **Nguyên tắc Ký quỹ**: Khi bấm Xuất bản khảo sát, hệ thống tính toán tổng kinh phí cần thiết:
  $$\text{Tổng Ký Quỹ} = \text{Số lượng mẫu cần thu } (N) \times \text{Đơn giá mỗi mẫu } (P)$$
  Số tiền này bị đóng băng ngay lập tức trong ví Creator (`escrow_locked_balance`).
- **Nguyên tắc Khấu trừ**: Tiền chỉ thực sự chuyển đổi khi có một phản hồi đạt chuẩn chất lượng vượt qua 5 tầng kiểm tra chống gian lận.
- **Thuật toán Hoàn tiền An toàn khi Dừng sớm hoặc Hết hạn**:
  Nếu Creator chủ động đóng khảo sát khi mới thu được $M$ mẫu ($M < N$), hoặc hết thời hạn treo tự do (1 - 90 ngày) mà chưa đủ mẫu, số tiền hoàn trả được tính toán theo công thức chống thâm hụt:
  $$\text{Số tiền hoàn trả} = \min\Big(\text{escrow\_locked\_balance}, \max\big(0, \text{Tổng Ký Quỹ} - (M \times P)\big)\Big)$$
- **Cam kết không thu phí giữ chỗ**: Nền tảng hoàn trả đủ $100\%$ giá trị của các mẫu chưa thu được về ví khả dụng của Creator ngay lập tức mà không thu bất kỳ khoản phí phạt nào.

---

### 5. Chính sách Rút Tiền & Đổi Thưởng (Payout Policy)

Hệ thống cung cấp 3 kênh quy đổi điểm thưởng với cơ chế kiểm soát chi phí chặt chẽ:
1. **Đổi Thẻ Cào Viễn Thông (Viettel, VinaPhone, MobiFone)**:
   - Hạn mức tối thiểu: 10.000 Point (tương đương thẻ 10.000 VNĐ).
   - Phí giao dịch: **0 VNĐ (Miễn phí 100%)**.
   - Trả mã thẻ và số seri trực tiếp trên giao diện và qua email trong vòng 60 giây.
2. **Rút về Tài khoản Ngân hàng (Vietcombank, MBBank, Techcombank, BIDV,...) & Ví MoMo**:
   - Hạn mức tối thiểu: 50.000 Point (tương đương 50.000 VNĐ).
   - Mức rút từ 50.000đ đến dưới 100.000đ: Phí xử lý cố định **2.000 VNĐ / giao dịch** (khấu trừ trực tiếp vào số dư ví).
   - Mức rút từ 100.000đ trở lên: **Miễn phí 100%**.
3. **Đổi Voucher Giảm Giá Doanh Nghiệp (Voucher Catalog)**:
   - Cho phép các thương hiệu đối tác đưa voucher lên sàn. Đáp viên có thể dùng Point để mua voucher ăn uống, mua sắm với giá ưu đãi.

---

## PHẦN II. KIẾN TRÚC & CƠ CHẾ VẬN HÀNH CỐT LÕI (CORE ENGINES)

### 1. Động cơ Chống Gian lận 5 Chốt chặn (Anti-Fraud Engine)

Mỗi lượt gửi bài (`submit_response`) phải vượt qua liên tiếp 5 chốt chặn phân tích thời gian thực trước khi được ghi nhận:

```
[Phản hồi từ Đáp viên]
        |
        v
+-----------------------+     Thất bại
| 1. Speed Trap Engine  | ----------------> [Cảnh báo làm ẩu / Khấu trừ điểm]
+-----------------------+
        | Đạt
        v
+-----------------------+     Thất bại
| 2. Dynamic Attention  | ----------------> [Second-Chance Grace -> Thất bại: Chặn]
+-----------------------+
        | Đạt
        v
+-----------------------+     Thất bại
| 3. Straight-lining    | ----------------> [Phát hiện chọn thẳng một đường -> Chặn]
+-----------------------+
        | Đạt
        v
+-----------------------+     Thất bại
| 4. Text Quality Filter| ----------------> [Phát hiện spam ký tự rác -> Yêu cầu sửa]
+-----------------------+
        | Đạt
        v
+-----------------------+     Phát hiện >=3 TK
| 5. Device Fingerprint | ----------------> [Phát hiện gian lận đa tài khoản -> Khóa]
+-----------------------+
        | Hoàn tất 100%
        v
[Cộng Điểm Thưởng + Tăng Trust Score + Trừ Ký Quỹ Escrow]
```

- **Chốt 1 - Speed Trap (Bẫy Tốc Độ Tối Thiểu)**:
  - Công thức tính thời gian tối thiểu hợp lệ:
    $$T_{\text{min}} = \sum (N_{\text{radio}} \times 2.5\text{s}) + \sum (N_{\text{checkbox}} \times 3.0\text{s}) + \sum (N_{\text{grid}} \times 4.0\text{s}) + \sum (N_{\text{scale}} \times 2.0\text{s})$$
  - Các câu hỏi tự luận ngắn/dài được tính thời gian đọc cơ bản bằng 0 giây để không gây bẫy oan cho người gõ nhanh.
  - Nếu làm bài nhanh hơn $T_{\text{min}}$, hệ thống chặn nộp bài và yêu cầu đọc kỹ lại câu hỏi.
- **Chốt 2 - Attention Check Động (Bẫy Chú Ý Ngầm)**:
  - Hệ thống tự động chèn các câu hỏi kiểm tra độ tập trung (ví dụ: *"Để chứng minh bạn đang đọc câu hỏi, vui lòng chọn phương án thứ ba"*).
  - **Bảo mật tuyệt đối**: Khi API trả dữ liệu câu hỏi về trình duyệt, các cờ `is_attention_check` và `expected_answer` bị bóc tách 100% khỏi payload JSON để ngăn chặn hành vi bật F12 soi mã nguồn.
  - **Cơ chế Second-Chance Grace**: Nếu chọn sai lần đầu, hệ thống hiển thị thông báo nhắc nhở nhẹ nhàng và cho phép đáp viên sửa lại 1 lần duy nhất, tránh phạt oan người dùng vô tình bấm nhầm.
- **Chốt 3 - Straight-lining Detection (Phát hiện Chọn Thẳng Một Cột)**:
  - Áp dụng trên các khối câu hỏi Thang đo (Likert Scale) hoặc Lưới trắc nghiệm có từ 5 câu trở lên.
  - Tính toán phương sai câu trả lời: $\sigma^2 = \frac{1}{k}\sum_{i=1}^k (x_i - \bar{x})^2$. Nếu $\sigma^2 = 0$ (người dùng chọn thẳng toàn bộ phương án 3, hoặc toàn bộ phương án 5), bài nộp bị đánh dấu gian lận và từ chối trả thưởng.
- **Chốt 4 - Bộ lọc Tự luận Rác (Spam Content Filter)**:
  - Kiểm tra độ đa dạng ký tự (Entropy) và số lượng từ ngữ.
  - Chặn các chuỗi ký tự vô nghĩa như `asdfghjk`, `aaaaaa`, `.....`.
  - Hỗ trợ từ vựng tiếng Việt hợp lệ: Cho phép nhập câu ngắn hoặc số `0` khi trả lời các câu về số lượng/thu nhập.
- **Chốt 5 - Định danh Vân tay Thiết bị & Bảo vệ Mạng Ký túc xá (Device Fingerprint)**:
  - Thu thập kết hợp `User-Agent`, độ phân giải màn hình, Canvas fingerprint và WebGL fingerprint.
  - **Bảo vệ Wi-Fi công cộng**: Không tự động khóa tài khoản chỉ vì trùng địa chỉ IP (để bảo vệ sinh viên dùng chung mạng Wi-Fi trường học, thư viện). Chỉ tiến hành khóa tài khoản khi phát hiện từ **3 tài khoản khác nhau trở lên có cùng một mã vân tay thiết bị vật lý**.

---

### 2. Hệ thống Thang Điểm Uy Tín (Trust Score Engine)

- **Mức khởi tạo mặc định**: `85.0 / 100` cho tài khoản mới đăng ký.
- **Cơ chế Điều chỉnh**:
  - Hoàn thành bài khảo sát chất lượng cao, thời gian hợp lý: $+0.5$ đến $+1.0$ điểm (tối đa 100 điểm).
  - Bị cảnh báo Speed Trap: $-2.0$ điểm.
  - Trả lời sai câu hỏi Attention Check: $-5.0$ điểm.
  - Bị phát hiện gian lận đa tài khoản: Trừ trực tiếp về dưới $30.0$ điểm.
- **Ràng buộc Quyền lợi theo Thang điểm**:
  - **Từ 80.0 đến 100.0 (Uy tín Cao)**: Nhận 100% điểm thưởng, ưu tiên hiển thị bài khảo sát giá cao, hỗ trợ rút tiền nhanh.
  - **Từ 60.0 đến 79.9 (Trung bình - Cảnh báo)**: Bị khấu trừ lũy tiến $15\% - 30\%$ điểm thưởng mỗi bài; yêu cầu xác thực kỹ hơn.
  - **Từ 40.0 đến 59.9 (Yếu)**: Tạm khóa tính năng rút tiền và đổi thẻ cào; buộc phải làm bài nghiêm túc để nâng điểm uy tín.
  - **Dưới 40.0 (Gian lận)**: Tự động khóa tài khoản vĩnh viễn và đóng băng số dư do vi phạm điều khoản.

---

### 3. Cơ chế Phân Phối Thích Ứng Theo Dữ Liệu Lịch Sử (Adaptive SLA Engine)

Để đảm bảo tính trung thực tuyệt đối và không tạo kỳ vọng ảo cho khách hàng:
- **Giai đoạn Thu thập Dữ liệu (Hiện tại - Dưới 30 bài hoàn thành)**:
  - Hệ thống hoàn toàn không hiển thị các con số giờ/ngày ước tính lý thuyết.
  - Thể hiện chính xác bản chất: **Thước đo Mức độ Ưu tiên Phân phối**:
    * Mức Sàn Tiết Kiệm: Phân phối theo hàng chờ tự nhiên.
    * Mức Đề Xuất (+25%): Ưu tiên hiển thị trên danh mục bài nổi bật.
    * Mức Hỏa Tốc (+60%): Gắn nhãn [Thưởng Cao] toàn sàn để kích thích đáp viên vào làm ngay.
  - Kèm ghi chú công khai: *"Hệ thống đang tích lũy dữ liệu thực tế (0/30 bài hoàn thành). Khi đủ dữ liệu, thời gian hoàn thành thực tế sẽ được tự động kích hoạt."*
- **Giai đoạn Tự Động Kích Hoạt (Từ 30 bài hoàn thành trở lên)**:
  - Điểm cuối `GET /api/v1/surveys/velocity-benchmark` tự động quét cơ sở dữ liệu `responses`.
  - Tính toán phân vị trung vị (P50) thời gian hoàn thành theo độ dài câu hỏi và mức giá để hiển thị thời gian dự kiến thực tế (ví dụ: *"Dự kiến: ~18 - 24 giờ dựa trên 35 bài khảo sát tương tự"*).

---

### 4. Sổ Cái Kép Giao Dịch Toàn Vẹn (Double-entry Ledger Stream)

- Bảng dữ liệu `point_transactions` lưu trữ bất biến mọi biến động tài chính của người dùng.
- Mọi thao tác: Nạp ví Credit, Trừ ký quỹ Escrow, Hoàn trả Escrow, Nhận thưởng Point, Đổi thẻ cào, Rút tiền ngân hàng đều bắt buộc nằm trong khối Transaction ACID của SQLite.
- Ghi nhận đầy đủ: `user_id`, `reference_id` (mã khảo sát hoặc mã giao dịch), `tx_type`, `currency` (Point hoặc Credit), `amount`, `balance_after` (số dư sau giao dịch), `description` và `metadata_json`.
- Ngăn chặn hoàn toàn lỗi Race Condition hoặc thâm hụt tiền ảo.

---

## PHẦN III. HIỆN TRẠNG CHI TIẾT CÁC PHÂN HỆ TÍNH NĂNG (FEATURE BREAKDOWN)

### 1. Phân hệ Creator Studio (Thiết kế Khảo sát Chuẩn Google Forms)
- **Kiến trúc giao diện 2 cột độc lập**:
  - Cột soạn câu hỏi (Trái): Cuộn dọc riêng biệt, tự do thêm, sửa, xóa, nhân bản và kéo thả sắp xếp thứ tự câu hỏi. Khung canvas được khóa `overflow-x-hidden` triệt tiêu hoàn toàn thanh cuộn ngang thừa.
  - Cột cấu hình (Phải): Cuộn dọc riêng biệt, cho phép thiết lập thời hạn, đối tượng và ngân sách mà không ảnh hưởng tới vị trí soạn câu hỏi ở cột trái.
- **Hỗ trợ trọn vẹn 12 loại câu hỏi**:
  1. Trắc nghiệm 1 lựa chọn (`SINGLE_CHOICE`).
  2. Hộp kiểm nhiều lựa chọn (`MULTIPLE_CHOICE`).
  3. Trả lời ngắn (`SHORT_TEXT`).
  4. Đoạn văn tự luận (`PARAGRAPH`).
  5. Menu thả xuống (`DROPDOWN`).
  6. Thang đo tuyến tính Likert (`LINEAR_SCALE`, tùy chọn 1-5 hoặc 1-10 kèm nhãn 2 đầu).
  7. Lưới trắc nghiệm (`CHOICE_GRID` - ma trận radio hàng x cột).
  8. Lưới hộp kiểm (`CHECKBOX_GRID` - ma trận checkbox hàng x cột).
  9. Chọn ngày (`DATE`).
  10. Chọn giờ (`TIME`).
  11. Đánh giá xếp hạng sao (`RATING_STARS`).
  12. Tải tệp đính kèm (`FILE_UPLOAD`).
- **5 Bộ lọc đối tượng nhân khẩu học chuẩn hóa**:
  1. **Giới tính**: Tất cả / Nam / Nữ.
  2. **Độ tuổi**: Mọi lứa tuổi / 18-22 / 23-29 / 30 trở lên.
  3. **Khu vực địa lý**: Chuẩn hóa danh mục **34 Tỉnh Thành Mới** và 3 Miền Bắc - Trung - Nam (`VIBE_PROVINCES_34`), tích hợp bộ lọc tìm kiếm nhanh.
  4. **Lĩnh vực / Nghề nghiệp**: Danh mục 10 ngành nghề chính (`VIBE_OCCUPATIONS` bao gồm Sinh viên, CNTT, Kinh doanh, Y tế, Giáo dục,...).
  5. **Trường Đại học / Học viện**: Autocomplete thông minh với 293 trường Đại học và Cao đẳng trên toàn quốc (`VIBE_UNIVERSITIES_DATA`).
- **Cấu hình Thời Hạn Treo Tự Do (1 - 90 Ngày)**:
  - Cho phép Creator nhập trực tiếp số ngày mong muốn.
  - Không tính phí giữ chỗ theo ngày, tiền cọc các mẫu chưa hoàn thành được hoàn trả 100% khi hết hạn.
- **Đồng bộ Biểu Mẫu Ngoài**:
  - Tự động nhận diện và trích xuất cấu trúc câu hỏi từ link Google Forms (hỗ trợ cả link rút gọn `forms.gle`) và Microsoft Forms.
  - Chuẩn hóa URL, loại bỏ tham số theo dõi rác (`?usp=sf_link`, `?fbclid=...`) để kiểm soát trùng lặp.
- **Quản lý & Giám sát Tiến độ**:
  - Xem danh sách người điền, tỷ lệ hoàn thành, thời gian trung bình.
  - Tải dữ liệu kết quả xuất file Excel / CSV thô phục vụ nghiên cứu và phân tích định lượng (SPSS, R, Python).

---

### 2. Phân hệ Respondent (Người Trả Lời & Kiếm Điểm)
- **Khám phá Khảo sát**: Danh sách bài tập trung hiển thị rõ ràng: Tiêu đề, thù lao Point, số phút ước tính, phân loại đề xuất và nhãn [Thưởng Cao] khi có Creator Boost.
- **Trải nghiệm Làm bài Tối ưu**:
  - Giao diện thân thiện trên di động, hỗ trợ đầy đủ bàn phím số, chạm vuốt mượt mà.
  - Tự động lưu tiến trình tạm thời, chống mất bài khi kết nối mạng chập chờn.
- **Tính năng Xem Lại & Chỉnh Sửa Phản Hồi (Review & Edit)**:
  - Cho phép người dùng xem lại bài đã nộp nếu Creator cấp quyền.
  - Hỗ trợ chỉnh sửa câu trả lời trong khung thời gian quy định với ghi nhận nhật ký chỉnh sửa (`edited_at`) minh bạch.
- **Ví Điểm Thưởng & Đổi Quà**:
  - Theo dõi biến động số dư Point theo thời gian thực.
  - Gửi yêu cầu đổi thẻ cào hoặc rút tiền về ngân hàng chỉ với 3 thao tác đơn giản.

---

### 3. Phân hệ Admin Console & Quản Trị Vận Hành
- **Dashboard Tổng quan 2 Cột Cân Xứng (Split Grid 12 Cột)**:
  - Cột trái: Luồng Sổ Cái Giao Dịch Sàn (Ledger Stream) ghi nhận biến động nạp, rút, thưởng thời gian thực.
  - Cột phải: Khung Dòng Lệnh Quản Trị Nhanh (Fast Command Console).
- **Phân tích Thời Gian Thực (Real-time Analytics)**:
  - `activeUsersNow`: Số lượng người dùng hoạt động trong 15 phút gần nhất (dựa trên cột `last_active_at`).
  - `fillingFormsNow`: Số lượng người đang trong tiến trình điền bài (responses status `IN_PROGRESS`).
  - `firstTimeRetentionRate` & `repeatRetentionRate`: Tỷ lệ giữ chân người dùng mới và người dùng quay lại tính từ nhật ký thiết bị `device_ip_logs`.
- **Hệ thống 16 Lệnh Quản trị Nhanh (Fast Commands - Phím tắt F2)**:
  - `/naptien <email> <số tiền>`: Nạp Credit trực tiếp cho Creator.
  - `/congdiem <email> <số điểm>`: Thưởng Point cho người dùng.
  - `/resetpoint <email>`: Đặt lại điểm ví.
  - `/settier <email> <STUDENT|PERSONAL|ENTERPRISE>`: Cập nhật phân khúc tài khoản.
  - `/ban <email> <lý do>` & `/unban <email>`: Khóa hoặc mở khóa tài khoản vi phạm.
  - `/fraudlogs <email>`: Tra cứu lịch sử vi phạm gian lận.
  - `/cleantest`: Tự động thanh lọc sạch sẽ toàn bộ tài khoản test và khảo sát rác phát sinh.
- **Cơ chế Dọn dẹp Test Toàn Vẹn (Clean Test Engine)**:
  - Bảo vệ tuyệt đối danh sách tài khoản quản trị và người dùng thực tế (`PRESERVED_USER_EMAILS`).
  - Tự động xóa sạch dữ liệu rác trên tất cả các bảng liên kết (surveys, responses, questions, point_transactions, voucher_codes, voucher_campaigns, warranty_claims, fraud_logs, notifications, device_ip_logs).
  - Tích hợp khối `safeRun` độc lập, triệt tiêu hoàn toàn lỗi cột CSDL.

---

### 4. Hệ thống Pháp lý & Điều khoản Dịch vụ Nền tảng (Legal Compliance)
- **Tài liệu Pháp lý Chính thức**: `DIEU_KHOAN_VA_QUY_TAC_NEN_TANG.md` quy định 6 chương chặt chẽ:
  1. Nguyên tắc 1 cá nhân - 1 tài khoản chính chủ; quy chuẩn định giá 1:1 VNĐ.
  2. Tiêu chuẩn người trả lời và các chế tài xử lý gian lận.
  3. Tiêu chuẩn người tạo bài, nguyên tắc hoàn tiền Escrow và chính sách bảo hành mẫu 1 đổi 1 trong 7 ngày cho Doanh nghiệp.
  4. Quy chế nạp tiền ví, đổi thẻ cào và rút tiền ngân hàng.
  5. Bảo vệ quyền riêng tư và dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP (ẩn danh hóa 100% dữ liệu khảo sát xuất ra).
  6. Giá trị pháp lý tối cao của Sổ cái Double-entry Ledger và Audit Log khi giải quyết khiếu nại.
- **Ràng buộc Đăng ký (Enforced Sign-up Consent)**:
  - Checkbox bắt buộc: *"Tôi đã đọc, hiểu rõ và đồng ý tuân thủ toàn bộ Điều khoản Dịch vụ và Quy tắc Nền tảng VibeSurvey"*.
  - Modal xem toàn văn bộ quy tắc được tích hợp ngay tại chỗ, hỗ trợ người dùng đọc và bấm *"Tôi Đồng Ý Điều Khoản"* mà không bị tải lại trang hay mất dữ liệu đang nhập.

---

## PHẦN IV. TỔNG HỢP CẤU TRÚC THƯ MỤC & FILE HỆ THỐNG

```
c:\Users\Lenovo\Downloads\Linh\
├── .agent/                                 # Ngữ cảnh và quy tắc vận hành của Agent (rules.md, GEMINI.md)
├── android/                                # Dự án ứng dụng di động Hybrid Capacitor Native
│   ├── app/src/main/                       # AndroidManifest, tài nguyên Java và layout native
│   └── capacitor.config.json               # Cấu hình đóng gói ứng dụng Android
├── public/                                 # Mã nguồn Single Page Application (Client-side)
│   ├── app.js                              # Logic SPA toàn diện (Auth, Studio, Respondent, Wallet, Admin)
│   ├── index.html                          # Giao diện chính Bento Grid tích hợp Tailwind CSS
│   ├── styles.css                          # Định kiểu tùy biến, thanh cuộn độc lập và hiệu ứng
│   └── assets/                             # Hình ảnh, biểu tượng và tài nguyên đồ họa
├── server/                                 # Máy chủ ứng dụng Node.js & Express
│   ├── config/                             # Cấu hình danh mục (index.js, 34 tỉnh thành mới, 293 trường ĐH)
│   ├── controllers/                        # Tầng điều khiển nghiệp vụ
│   │   ├── adminController.js              # Quản trị hệ thống, xử lý lệnh Console, thống kê thời gian thực
│   │   ├── authController.js               # Đăng ký, đăng nhập JWT, kiểm tra email giáo dục
│   │   ├── responseController.js           # Ghi nhận phản hồi, kiểm tra bẫy gian lận, sửa bài làm
│   │   ├── surveyController.js             # Quản lý khảo sát, tính toán ký quỹ Escrow, xuất file Excel
│   │   └── walletController.js             # Nạp tiền, đổi thẻ cào, rút tiền ngân hàng, xuất hóa đơn VAT
│   ├── db/                                 # Cơ sở dữ liệu SQLite
│   │   ├── database.js                     # Khởi tạo bảng, chỉ mục và migration tự động
│   │   └── vibesurvey.db                   # Tệp lưu trữ CSDL hoạt động chế độ WAL
│   ├── middlewares/                        # Tầng trung gian kiểm soát
│   │   ├── authMiddleware.js               # Xác thực Token JWT và phân quyền vai trò
│   │   └── deviceFingerprint.js            # Trích xuất định danh thiết bị và ghi log IP
│   ├── services/                           # Các động cơ nghiệp vụ lõi
│   │   ├── antiFraudService.js             # Xử lý 5 tầng chống gian lận và tính điểm Trust Score
│   │   ├── formParserService.js            # Bóc tách cấu trúc form Google Forms & Microsoft Forms
│   │   ├── ledgerService.js                # Quản lý giao dịch kép Double-entry Ledger an toàn
│   │   ├── pricingService.js               # Tính toán bảng giá sàn, Creator Boost 80/20 và Adaptive SLA
│   │   └── voucherService.js               # Quản lý kho thẻ cào và chiến dịch voucher đổi thưởng
│   └── app.js                              # Điểm khởi động máy chủ Express (Port 3000)
├── tests/                                  # Bộ kiểm thử tự hành đa tầng
│   ├── run_all_tests.js                    # Trình chạy tổng hợp toàn bộ bài test
│   ├── test_anti_fraud.js                  # Kiểm thử 5 chốt chặn gian lận
│   ├── test_api_endpoints.js               # Kiểm thử toàn diện các điểm cuối REST API
│   ├── test_cleanup_helper.js              # Module thanh lọc 100% dữ liệu test an toàn
│   ├── test_pricing.js                     # Kiểm thử công thức định giá, Boost 80/20 và Escrow
│   └── test_review_edit.js                 # Kiểm thử tính năng xem lại và chỉnh sửa bài làm
├── DESIGN.md                               # Quy chuẩn thiết kế giao diện (Design System SSOT)
├── DIEU_KHOAN_VA_QUY_TAC_NEN_TANG.md       # Văn bản pháp lý và quy tắc nền tảng chính thức
├── HIEN_TRANG_TONG_HOP_HE_THONG.md         # Bản hiện trạng tổng hợp toàn diện hệ thống (Kinh tế, Cơ chế, Tính năng)
├── PROJECT_CONTEXT.md                      # Nhật ký tiến độ và ngữ cảnh kỹ thuật liên tục của dự án
└── survey-platform.code-workspace          # Tệp cấu hình workspace cho Antigravity IDE
```

---

## PHẦN V. TỔNG KẾT & KẾ HOẠCH BÀN GIAO TIẾP THEO

Toàn bộ hệ thống hiện đang đạt trạng thái **100% PASS** trên tất cả các kịch bản kiểm thử:
- Đã kiểm tra cú pháp và logic toàn diện không còn bất kỳ lỗi nào.
- Đã giải quyết dứt điểm các lỗi lệch giao diện, lỗi thanh cuộn ngang và lỗi câu lệnh SQL khi xóa dữ liệu test.
- Server backend đang lắng nghe ổn định tại cổng 3000 (`http://localhost:3000`).
- Toàn bộ mã nguồn đã được đồng bộ an toàn lên nhánh `main` trên GitHub.
