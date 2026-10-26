# BÁO CÁO HIỆN TRẠNG HỆ THỐNG: TIỀN TỆ, KINH TẾ HỌC & THUẬT TOÁN ĐANG VẬN HÀNH

- **Phiên bản mã nguồn**: Nhánh `main` (Commit `fd954f0`)
- **Phạm vi tài liệu**: Phản ánh chính xác 100% các hằng số, công thức toán học, quy tắc kế toán và thuật toán đang chạy thực tế trong mã nguồn hiện tại (trước khi áp dụng các thay đổi trong bản kế hoạch tương lai).
- **Các tệp mã nguồn tham chiếu chính**:
  - Cấu hình hệ thống: `server/config/index.js`
  - Cơ sở dữ liệu & Schema: `server/db/database.js`
  - Định giá khảo sát (CPI & LOI): `server/services/pricingService.js`
  - Sổ cái kế toán kép & Ví: `server/services/ledgerService.js`, `server/controllers/walletController.js`
  - Hệ thống E-Voucher: `server/services/voucherService.js`
  - Thuật toán Chống Gian Lận: `server/services/antiFraudService.js`
  - Thuật toán Đối khớp & Xếp hạng: `server/services/matchingService.js`
  - Thuật toán Bóc tách Biểu mẫu: `server/services/formParserService.js`
  - Luồng Khảo sát & Hóa đơn: `server/controllers/surveyController.js`, `server/services/notificationService.js`

---

## PHẦN 1: HỆ THỐNG TIỀN TỆ & SỔ CÁI KẾ TOÁN KÉP (CURRENCY & DOUBLE-ENTRY LEDGER)

### 1.1. Mô hình Ví Kép (Dual-Currency Architecture)
Trong bảng `users` (`server/db/database.js`), mỗi tài khoản được quản lý đồng thời 2 số dư tiền tệ độc lập cùng các tài nguyên bổ trợ:

| Trường dữ liệu (`users`) | Kiểu dữ liệu | Giá trị khởi tạo | Bản chất & Công dụng hiện tại |
| :--- | :--- | :--- | :--- |
| `credit_balance` | `REAL` | `0.0` | **Ví Credit (VNĐ nội bộ)**: Dùng để khóa quỹ ký quỹ (`Escrow`) khi xuất bản khảo sát hoặc trả phí ghim khảo sát lên đầu trang (`50.000đ`). Tuyệt đối không thể rút ngược ra tiền mặt hoặc đổi sang Điểm thưởng. |
| `point_balance` | `INTEGER` | `0` | **Ví Điểm thưởng (Point)**: Nhận được khi hoàn thành khảo sát hợp lệ (`VALIDATED`) hoặc nhận điểm an ủi sàng lọc (`Screened Out`). Dùng để rút tiền mặt (Ngân hàng/MoMo), đổi thẻ cào điện thoại, đổi E-Voucher hoặc quy đổi sang `credit_balance`. |
| `promo_credit_balance` | `REAL` | `0.0` | Cột dự phòng ngân sách khuyến mãi trong DB (hiện tại tiền thưởng nạp đang cộng trực tiếp vào `credit_balance`). |
| `fast_track_tickets` | `INTEGER` | `0` | **Vé Gom Mẫu Hỏa Tốc / Vé Ghim VIP**: Dùng để kích hoạt thông báo đẩy + Email hàng loạt hoặc ghim bài khảo sát lên vị trí ưu tiên mà không tốn `50.000đ` Credit. |
| `free_trial_surveys_available` | `INTEGER` | `1` | **Suất Khảo Sát Dùng Thử Miễn Phí**: Mỗi tài khoản mới được cấp sẵn `1` suất tạo khảo sát miễn phí (tối đa `25 mẫu`). |
| `trust_score` | `REAL` | `100.0` | **Điểm Uy Tín**: Thang điểm từ `0.0` đến `100.0`, quyết định quyền rút tiền của người dùng. |

### 1.2. Tỷ giá Cơ sở & Cơ chế Van Một Chiều (One-Way Valve)
Được định nghĩa tại `server/config/index.js` và `server/services/ledgerService.js`:
1. **Tỷ giá Điểm thưởng (`POINT_TO_VND_RATE`)**:
   $$\text{1 Point} = 10\text{ VNĐ}$$
   *(Ví dụ: `1.000 Điểm = 10.000 VNĐ`; `5.000 Điểm = 50.000 VNĐ`).*
2. **Chiều Nạp tiền (`VNĐ -> Credit`)**:
   - Tiền nạp cộng 100% (kèm thưởng bậc thang nếu có) vào `credit_balance`.
   - `point_balance` giữ nguyên, không bị ảnh hưởng.
3. **Chiều Quy đổi Nội bộ (`Point -> Credit` qua hàm `swapPointsToCredit`)**:
   - Cho phép đổi từ `point_balance` sang `credit_balance` với **Tỷ lệ chiết khấu giữ lại của sàn 30%** (`SWAP_DISCOUNT_RATE = 0.70`, tức người dùng nhận 70% giá trị danh nghĩa):
   $$\text{Credit nhận được (VNĐ)} = \lfloor (\text{Số Điểm đổi} \times 10) \times 0.70 \rfloor = \text{Số Điểm đổi} \times 7\text{ VNĐ}$$
   - **Hạn mức mỗi lần quy đổi**: Tối thiểu `1.000 Điểm` (nhận `7.000 VNĐ Credit`), tối đa `10.000.000 Điểm`.
   - **Bút toán Sổ cái kép**: Ghi đồng thời 02 dòng vào `point_transactions` trong cùng một Transaction (`BEGIN IMMEDIATE TRANSACTION`):
     1. Dòng 1 (`currency = 'POINT'`): Ghi giảm `-points` từ `point_balance`.
     2. Dòng 2 (`currency = 'VND'`): Ghi tăng `+creditValueVnd` vào `credit_balance` (tham chiếu `reference_id` tới ID giao dịch dòng 1).
4. **Chiều Cấm (`Credit -x-> Point / Tiền mặt`)**:
   - Không có bất kỳ hàm hay API nào cho phép chuyển `credit_balance` sang `point_balance` hoặc rút `credit_balance` ra tiền mặt nhằm chống rửa tiền và bảo vệ tiền thưởng khuyến mãi của sàn.

### 1.3. Hệ thống Sổ Cái Kế Toán Kép (`point_transactions`)
Mọi biến động số dư đều bắt buộc đi qua `BEGIN IMMEDIATE TRANSACTION` trong SQLite WAL mode (`server/services/ledgerService.js`) và ghi nhận vào bảng `point_transactions` với 8 mã nghiệp vụ (`tx_type`):
1. `DEPOSIT_CREDIT` (`currency: 'VND'`): Nạp tiền vào ví Credit (bao gồm cả gốc + thưởng nạp).
2. `ESCROW_LOCK` (`currency: 'VND'`): Khóa tiền từ `credit_balance` của Creator vào `surveys.escrow_locked_balance` khi xuất bản khảo sát.
3. `ESCROW_REFUND` (`currency: 'VND'`): Hoàn trả tiền ký quỹ còn dư từ `surveys.escrow_locked_balance` về lại `credit_balance` của Creator khi đóng khảo sát.
4. `SURVEY_REWARD` (`currency: 'POINT'`): Cộng điểm thưởng hoàn thành khảo sát hợp lệ hoặc điểm an ủi sàng lọc vào `point_balance` của Respondent.
5. `PAYOUT_DEDUCT` (`currency: 'POINT'`): Trừ điểm nguyên tử ngay lập tức từ `point_balance` khi người dùng tạo lệnh rút tiền/thẻ cào hoặc đổi E-Voucher.
6. `PAYOUT_REFUND` (`currency: 'POINT'`): Hoàn trả lại điểm vào `point_balance` khi Admin từ chối (`REJECTED`) lệnh rút tiền.
7. `POINT_TO_CREDIT_SWAP` (`currency: 'POINT'` và `'VND'`): Cặp bút toán kép khi đổi Điểm thưởng sang Credit tạo khảo sát.
8. `PIN_SURVEY_FEE` (`currency: 'VND'`): Trừ `50.000 VNĐ` từ `credit_balance` khi Creator ghim khảo sát lên đầu trang (nếu không dùng vé `fast_track_tickets`).

---

## PHẦN 2: KINH TẾ HỌC, ĐỊNH GIÁ KHẢO SÁT (CPI), NẠP/RÚT TIỀN & VOUCHER

### 2.1. Thuật toán Định giá Khảo sát & Tính CPI (`server/services/pricingService.js`)

#### A. Ước tính Thời lượng Làm bài (LOI - Length of Interview)
Hàm `estimateLoi(questions)` tính tổng thời gian dự kiến (giây) dựa trên loại câu hỏi (`SECONDS_PER_QUESTION_TYPE`):

| Loại câu hỏi (`type`) | Thời gian định mức hiện tại |
| :--- | :--- |
| `RATING_STARS` (Đánh giá sao) | `12 giây` / câu |
| `DROPDOWN` (Menu thả xuống) | `15 giây` / câu |
| `NUMBER_INPUT` (Nhập số) | `15 giây` / câu |
| `DATE_INPUT` (Chọn ngày tháng) | `15 giây` / câu |
| `SINGLE_CHOICE` (Trắc nghiệm 1 đáp án) | `17 giây` / câu |
| `MULTIPLE_CHOICE` (Trắc nghiệm nhiều đáp án) | `17 giây` / câu |
| `LIKERT_SCALE` (Thang đo mức độ đồng ý) | `20 giây` / câu |
| `OPEN_TEXT` (Câu hỏi tự luận mở) | `45 giây` / câu |
| Mặc định (nếu không khớp loại trên) | `18 giây` / câu |

- **Công thức quy đổi ra số phút (`loiMinutes`)** (tối thiểu `1.0 phút`, làm tròn 1 chữ số thập phân):
  $$\text{LOI}_{\text{minutes}} = \max\left(1.0, \frac{\text{round}\left(\frac{\text{totalSeconds}}{60} \times 10\right)}{10}\right)$$

#### B. Tỷ lệ Chiết khấu Nền tảng Động (Dynamic Take Rate)
Hàm `getDynamicTakeRate(loiMinutes)` xác định tỷ lệ phần trăm sàn giữ lại (`takeRate`) theo độ dài bài khảo sát:
- **Khảo sát Ngắn (`SHORT`)**: Khi $\text{LOI}_{\text{minutes}} \le 3.0\text{ phút}$ $\rightarrow$ $\text{takeRate} = 0.50$ (**50%**).
- **Khảo sát Tiêu chuẩn (`STANDARD`)**: Khi $3.0 < \text{LOI}_{\text{minutes}} \le 10.0\text{ phút}$ $\rightarrow$ $\text{takeRate} = 0.40$ (**40%**).
- **Khảo sát Chuyên sâu (`DEEP`)**: Khi $\text{LOI}_{\text{minutes}} > 10.0\text{ phút}$ $\rightarrow$ $\text{takeRate} = 0.35$ (**35%**).

#### C. Các Hằng số Định giá & Phụ phí (`pricingService.js`)
- **Đơn giá thù lao cơ sở trả cho đáp viên (`BASE_PAYOUT_PER_MINUTE_VND`)**: `700 VNĐ / phút` (tương đương `42.000 VNĐ / giờ`).
- **Hệ số độ hiếm tệp đáp viên (`IR_MULTIPLIERS` - Incidence Rate)**:
  - `GENERAL` (Đại trà, tỷ lệ khớp 70%–100%): `1.0`
  - `MEDIUM` (Trung bình, tỷ lệ khớp 30%–69%): `1.35`
  - `HARD` (Khó, tỷ lệ khớp 10%–29%): `1.8`
  - `NICHE` (Đặc thù/Chuyên gia, tỷ lệ khớp < 10%): `2.5`
- **Phụ phí lọc nhân khẩu học (`TARGETING_FEE_PER_FILTER_VND`)**: `1.000 VNĐ / tiêu chí lọc / 1 phiếu`.
- **Phụ phí Gom mẫu Hỏa tốc 6h (`URGENT_6H_SURCHARGE_RATE`)**: `+25%` (`x 1.25`) trên đơn giá CPI.
- **Phí Báo cáo Phân tích AI & Kiểm định (`AI_REPORT_PACKAGE_FEE_VND`)**: `500.000 VNĐ / chiến dịch`.

#### D. Công thức Toán học Tính Đơn giá CPI & Thù lao Đáp viên (`calculateSurveyEconomics`)
Với một bài khảo sát có thời lượng $\text{LOI}$, hệ số độ hiếm $\text{IR}$, số tiêu chí lọc $F$ (`filterCount`), cờ hỏa tốc $U \in \{0, 1\}$, và số lượng mẫu mục tiêu $N$ (`sampleCount`):

1. **Ngân sách thù lao gốc dành cho đáp viên (VNĐ/phiếu)**:
   $$\text{RespondentBudget}_{\text{VND}} = \text{round}(700 \times \text{LOI}_{\text{minutes}} \times \text{IR})$$
2. **Đơn giá CPI cơ sở trước phụ phí (VNĐ/phiếu)**:
   $$\text{BaseCPI} = \left(\frac{700 \times \text{LOI}_{\text{minutes}}}{1 - \text{takeRate}}\right) \times \text{IR}$$
3. **Đơn giá CPI sau khi cộng phí lọc nhân khẩu học và phụ phí hỏa tốc (`costPerResponseVnd`)**:
   $$\text{RawCPI} = \big(\text{BaseCPI} + (F \times 1000)\big) \times \begin{cases} 1.25 & \text{nếu } U = 1 \\ 1.0 & \text{nếu } U = 0 \end{cases}$$
   $$\text{CostPerResponse}_{\text{VND}} = \text{round}(\text{RawCPI})$$
4. **Điểm thưởng trả cho đáp viên mỗi phiếu hợp lệ (`rewardPointsPerResponse`)**:
   $$\text{RewardPoints} = \left\lfloor \frac{\text{RespondentBudget}_{\text{VND}}}{10} \right\rfloor$$
   $$\text{RewardValue}_{\text{VND}} = \text{RewardPoints} \times 10$$
5. **Lợi nhuận gộp của nền tảng trên mỗi phiếu (`platformProfitPerResponseVnd`)**:
   $$\text{PlatformProfitPerResponse}_{\text{VND}} = \text{CostPerResponse}_{\text{VND}} - \text{RewardValue}_{\text{VND}}$$
6. **Tổng ngân sách ký quỹ Creator phải khóa (`totalEscrowVnd`)**:
   $$\text{TotalEscrow}_{\text{VND}} = (\text{CostPerResponse}_{\text{VND}} \times N) + \begin{cases} 500.000 & \text{nếu bật AI Insights} \\ 0 & \text{mặc định} \end{cases}$$

*(Lưu ý: Trong `surveyController.createSurvey` hiện tại, hàm `pricingService.calculateSurveyEconomics(questions, target_responses)` đang được gọi với tham số mặc định `options = {}`, tức `irLevel = 'GENERAL'` ($\text{IR} = 1.0$), `filterCount = 0`, `isUrgent6h = false`, `hasAiInsights = false`).*

---

### 2.2. Chính sách Nạp tiền, Thưởng Bậc thang & Đặc quyền Doanh nghiệp (`server/services/ledgerService.js`)
Khi người dùng nạp tiền qua `depositCredit(userId, amountVnd)` (tối thiểu `10.000 VNĐ`, tối đa `1.000.000.000 VNĐ`), hệ thống tính thưởng thông qua 2 hàm `calculateDepositBonus(amount)` và `calculateEnterprisePerks(amount)`:

| Mức tiền nạp (`amountVnd`) | Hạng Gói (`tier`) | Phần trăm Thưởng Credit (`bonusPercent`) | Vé Hỏa Tốc tặng kèm (`fast_track_tickets`) | Cờ VIP Doanh Nghiệp (`has_vip_enterprise`) |
| :--- | :--- | :--- | :--- | :--- |
| `< 100.000 VNĐ` | `Cơ bản` | `0%` | `0 vé` | `0` |
| `100.000 – 499.999 VNĐ` | `Đồng` | `+2%` | `0 vé` | `0` |
| `500.000 – 999.999 VNĐ` | `Bạc` | `+4%` | `0 vé` | `0` |
| `1.000.000 – 1.999.999 VNĐ` | `Doanh Nghiệp Vàng` | `+6%` | `+2 vé` | `0` |
| `2.000.000 – 4.999.999 VNĐ` | `Doanh Nghiệp Bạch Kim` | `+8%` | `+4 vé` | `0` |
| `5.000.000 – 9.999.999 VNĐ` | `Doanh Nghiệp Kim Cương` | `+10%` | `+10 vé` | `1` |
| `>= 10.000.000 VNĐ` | `Doanh Nghiệp Đối Tác` | `+12%` | `+20 vé` | `1` |

- **Công thức cộng số dư khi nạp**:
  $$\text{BonusCredit}_{\text{VND}} = \lfloor \text{amountVnd} \times \text{rate} \rfloor$$
  $$\text{TotalCreditAdded}_{\text{VND}} = \text{amountVnd} + \text{BonusCredit}_{\text{VND}}$$
- **Hóa đơn điện tử VAT (`notificationService.requestVatInvoice`)**:
  - Hỗ trợ mọi giao dịch nạp tiền yêu cầu xuất hóa đơn đỏ với mức thuế VAT cố định trong code là **10%**:
    $$\text{vatAmount} = \lfloor \text{amountVnd} \times 0.10 \rfloor, \quad \text{totalVnd} = \text{amountVnd} + \text{vatAmount}$$

---

### 2.3. Cơ chế Ký quỹ (Escrow), Gói Dùng Thử 25 Mẫu & Hoàn tiền Đóng bài

#### A. Khóa Quỹ Ký Quỹ (`lockEscrowForSurvey`)
Khi xuất bản khảo sát (`publishSurvey`), hệ thống kiểm tra 3 chế độ:
1. **Chế độ Thuần Voucher (`reward_mode === 'VOUCHER_ONLY'` - Zero Cash Model)**:
   - Không thu tiền ký quỹ (`totalEscrowVnd = 0`, `cost_per_response = 0`, `reward_points_per_response = 0`).
   - Bắt buộc chiến dịch `sponsor_campaign_id` phải có `remaining_quantity > 0`.
2. **Chế độ Gói Dùng Thử Miễn Phí (`useFreeTrial === true`)**:
   - **Điều kiện kích hoạt**:
     - Tài khoản còn suất dùng thử (`free_trial_surveys_available > 0`).
     - Tài khoản đã xác thực Email (`is_email_verified === 1`) HOẶC đã liên kết Google (`is_google_linked === 1`).
     - Số lượng mẫu mục tiêu của khảo sát **tối đa 25 phản hồi** (`target_responses <= 25`).
   - **Cơ chế hạch toán**:
     - Trừ `1` lượt `free_trial_surveys_available` của Creator.
     - Không trừ `credit_balance` của Creator (`0 VNĐ`), nhưng **Nền tảng tự động bơm `escrowAmount` vào `surveys.escrow_locked_balance`** và gắn cờ `is_free_trial = 1` để trả điểm thưởng thật 100% cho các Respondent làm bài.
3. **Chế độ Ký quỹ Tiêu chuẩn**:
   - Kiểm tra nguyên tử `credit_balance >= totalEscrow`, trừ `credit_balance` của Creator và cộng vào `surveys.escrow_locked_balance`, chuyển trạng thái khảo sát từ `DRAFT` sang `ACTIVE`.

#### B. Giải ngân Thưởng Hoàn thành Khảo sát (`rewardSurveyCompletion`)
Khi bài làm của Respondent đạt chuẩn (`VALIDATED`):
- **Chốt chặn chống cộng điểm kép (Anti-Double-Reward)**: Câu lệnh `UPDATE responses` chỉ thành công nếu `status != 'VALIDATED' OR points_rewarded = 0`.
- **Chốt chặn chống vượt mẫu mục tiêu**: Câu lệnh `UPDATE surveys` chỉ thành công nếu `collected_responses < target_responses`.
- Trừ `cost_per_response` khỏi `surveys.escrow_locked_balance`, tăng `collected_responses + 1` (nếu `collected_responses == target_responses` thì tự động chuyển `surveys.status = 'COMPLETED'`).
- Cộng `reward_points_per_response` vào `users.point_balance` và cộng `+0.5` điểm uy tín (`trust_score = MIN(100.0, trust_score + 0.5)`).

#### C. Điểm An ủi khi bị loại ở Câu hỏi Sàng lọc (`screenOut` -> `awardConsolationReward`)
- Khi đáp viên trả lời không khớp đáp án điều kiện (`qualifying_answer`) của câu hỏi sàng lọc (`is_screener === 1`):
  - Phiên làm bài dừng lại ngay lập tức và cập nhật `status = 'FLAGGED_MANUAL'`.
  - Đáp viên được tặng **20 Điểm an ủi** (`consolationPoints = 20`, tương đương `200 VNĐ`) vào `point_balance` và cộng `+0.1` vào `trust_score`.
  - **Lưu ý quan trọng**: Điểm an ủi 20 điểm này hiện được trích từ quỹ nền tảng (không trừ vào `escrow_locked_balance` của Creator).

#### D. Hoàn tiền Ký quỹ dư khi Đóng khảo sát (`refundRemainingEscrow`)
- Khi Creator đóng khảo sát sớm (`closeSurvey`):
  - Nếu `is_free_trial === 1`: Thu hồi toàn bộ `escrow_locked_balance` còn dư về lại nền tảng, **không cộng vào `credit_balance` của Creator** (`refundedAmount = 0`).
  - Nếu là khảo sát trả phí thông thường (`is_free_trial === 0`): Hoàn trả 100% `escrow_locked_balance` còn dư về lại `users.credit_balance` của Creator và đặt `surveys.status = 'CLOSED'`.

---

### 2.4. Chính sách Rút tiền, Đổi Thẻ cào & Kho E-Voucher

#### A. Rút tiền mặt & Đổi thẻ cào (`ledgerService.requestPayout`)
1. **Điều kiện Điểm Uy Tín tối thiểu**:
   - Bắt buộc `user.trust_score >= 60.0` và `user.status === 'ACTIVE'`. Nếu dưới `60.0`, hệ thống từ chối cho rút tiền.
2. **Ngưỡng rút tối thiểu**:
   - **Rút phá băng lần đầu tiên (`previousPayoutCount === 0`) qua Thẻ cào (`PHONE_CARD`)**: Tối thiểu **`1.000 Điểm`** (`10.000 VNĐ`).
   - **Tất cả các trường hợp khác (Rút từ lần thứ 2 trở đi, hoặc rút qua `BANK_TRANSFER` / `MOMO`)**: Tối thiểu **`5.000 Điểm`** (`50.000 VNĐ`), tối đa `10.000.000 Điểm`.
3. **Biểu phí rút tiền (`fee_vnd`)**:
   - Đổi thẻ cào điện thoại (`PHONE_CARD`): **`0 VNĐ`** (Miễn phí 100%).
   - Rút về Ngân hàng (`BANK_TRANSFER`) hoặc Ví MoMo (`MOMO`):
     - Dưới `100.000 VNĐ` (`< 10.000 Điểm`): Phí cố định **`2.000 VNĐ / giao dịch`** (`BANK_TRANSFER_FEE_UNDER_100K_VND = 2000`).
     - Từ `100.000 VNĐ` trở lên (`>= 10.000 Điểm`): **`0 VNĐ`** (Miễn phí 100%).
   - Số tiền thực nhận: $\text{netAmountVnd} = \max(0, (\text{points} \times 10) - \text{fee})$.
4. **Cơ chế khóa điểm chống chi tiêu kép (Anti-Double-Spend)**:
   - Ngay khi tạo lệnh `PENDING`, điểm bị trừ nguyên tử khỏi `point_balance` (`WHERE point_balance >= points`). Nếu Admin duyệt (`COMPLETED`), giao dịch hoàn tất; nếu Admin từ chối (`REJECTED`), hệ thống hoàn trả nguyên vẹn điểm qua bút toán `PAYOUT_REFUND`.

#### B. Hệ thống E-Voucher (`server/services/voucherService.js`)
Có 2 nhóm chiến dịch Voucher trong bảng `voucher_campaigns`:
1. **Kho Voucher Thương hiệu của Nền tảng (`PLATFORM_CATALOG`)**:
   - Gồm 6 thương hiệu khởi tạo sẵn với tỷ lệ quy đổi ngang giá **`1 Điểm = 10 VNĐ`**:
     - Shopee 50K (`5.000 Điểm`), Grab 30K (`3.000 Điểm`), Highlands Coffee 50K (`5.000 Điểm`), Phúc Long 30K (`3.000 Điểm`), CGV 100K (`10.000 Điểm`), Starbucks 100K (`10.000 Điểm`).
   - Cơ chế tự động nạp lại kho (`Auto-Replenish`): Khi `remaining_quantity <= 0`, hàm `redeemCatalogVoucher` tự động sinh thêm `25 mã mới` để không làm gián đoạn trải nghiệm đổi quà.
2. **Kho Voucher Do Creator Tài trợ (`CREATOR_SPONSORED`)**:
   - Creator tải danh sách mã ưu đãi lên gắn với khảo sát (`VOUCHER_ONLY` hoặc `HYBRID_POINTS_AND_VOUCHER`).
   - Cơ chế cấp phát nguyên tử chống trùng lặp (`claimVoucherForResponse`): Bảo vệ bằng 3 lớp (kiểm tra `claimed_response_id`, kiểm tra cặp `(survey_id, claimed_by_user_id)`, và `UNIQUE INDEX` dưới SQLite).

---

## PHẦN 3: CÁC THUẬT TOÁN KỸ THUẬT ĐANG VẬN HÀNH TRONG MÃ NGUỒN

### 3.1. Thuật toán Chống Gian Lận 5 Tầng (`server/services/antiFraudService.js`)

#### Tầng 1: Thuật toán Tính Thời gian Hoàn thành Tối thiểu $T_{\min}$ (`calculateMinCompletionTime`)
- **Bước 1 (Đếm tổng số từ `totalWords`)**: Đếm toàn bộ số từ của nội dung câu hỏi (`q.content`) và tất cả các phương án lựa chọn (`q.options`).
- **Bước 2 (Tính thời gian đọc hiểu)**: Với tốc độ đọc tối đa `WORDS_PER_SECOND = 5.0` từ/giây:
  $$\text{readingTime} = \frac{\text{totalWords}}{5.0}$$
- **Bước 3 (Tính thời gian thao tác `totalActionTime`)**:
  - Câu hỏi tự luận (`OPEN_TEXT`): Cộng **`8.0 giây` / câu** (`OPEN_TEXT_MIN_SECONDS = 8.0`).
  - Các loại câu hỏi trắc nghiệm/khác: Cộng **`0.5 giây` / câu** (`ACTION_TIME_PER_QUESTION = 0.5`).
- **Bước 4 (Chốt $T_{\min}$)**:
  $$T_{\min} = \max\left(\lceil \text{readingTime} + \text{totalActionTime} \rceil, 5\text{ giây}\right)$$

#### Tầng 2: Chấm điểm Tốc độ làm bài (`speedRatio` - Speed Trap)
So sánh thời gian làm bài thực tế $D$ (`durationSec`) với $T_{\min}$:
1. Nếu $D \ge T_{\min}$:
   $$\text{speedRatio} = 1.0$$
2. Nếu $D \le 3\text{ giây}$ HOẶC $D < 0.3 \times T_{\min}$ (Nghi vấn Bot/Script click siêu tốc):
   $$\text{speedRatio} = \max\left(0.05, \frac{D}{1.2 \times T_{\min}}\right)$$
3. Nếu $0.3 \times T_{\min} \le D < 0.7 \times T_{\min}$ (Làm bài quá nhanh):
   $$\text{speedRatio} = \max\left(0.50, \frac{D}{T_{\min}} \times 0.85\right)$$
4. Nếu $0.7 \times T_{\min} \le D < T_{\min}$ (Hơi nhanh nhưng có đọc lướt):
   $$\text{speedRatio} = \min\left(1.0, 0.80 + 0.20 \times \frac{D}{T_{\min}}\right)$$

#### Tầng 3: Kiểm tra Bẫy Tập trung (`attentionScore` - Attention Check)
- Duyệt tất cả các câu hỏi có cờ `is_attention_check === 1`.
- So sánh câu trả lời của người dùng `answersPayload[q.id]` với đáp án kỳ vọng `q.expected_answer`.
- Nếu trả lời **sai bất kỳ câu hỏi bẫy nào**:
  $$\text{attentionScore} = 0.0$$
- Nếu trả lời đúng tất cả câu hỏi bẫy (hoặc khảo sát không có câu bẫy):
  $$\text{attentionScore} = 1.0$$
*(Hiện tại trên Frontend Form Builder, nút "Thêm câu bẫy" đang chèn câu hỏi bẫy vào cuối danh sách câu hỏi và nếu đáp viên chọn sai sẽ bị tính `attentionScore = 0.0` ngay lập tức, chưa có cơ hội chọn lại lần 2).*

#### Tầng 4: Kiểm tra Phương sai Đường thẳng & Entropy Tự luận (`varianceFactor`)
Khởi tạo $\text{varianceFactor} = 1.0$. Hệ thống kiểm tra 2 lỗi:
1. **Kiểm tra câu hỏi Tự luận (`OPEN_TEXT`) bằng Độ dài & Shannon Entropy**:
   - Nếu văn bản trả lời có độ dài `< 5 ký tự`:
     $$\text{varianceFactor} = \text{varianceFactor} \times 0.5$$
   - Nếu văn bản có độ dài `>= 10 ký tự`, tính **Shannon Entropy** theo tần suất xuất hiện ký tự $p_i$:
     $$H(X) = -\sum_{i} p_i \log_2(p_i)$$
     Nếu $H(X) < 1.8$ (Ví dụ gõ lặp ký tự rác `"aaaaaaaaaa"`, `"asdfasdfasdf"`):
     $$\text{varianceFactor} = \text{varianceFactor} \times 0.3$$
2. **Kiểm tra Chọn 1 cột thẳng hàng (`Straight-lining`)**:
   - Gom tất cả các câu trả lời thuộc nhóm `LIKERT_SCALE`, `SINGLE_CHOICE`, `DROPDOWN`, `RATING_STARS`.
   - Nếu số lượng câu trả lời thuộc nhóm này **từ 4 câu trở lên** (`choiceAnswers.length >= 4`) và **100% các câu đều chọn cùng một giá trị giống hệt nhau**:
     $$\text{varianceFactor} = \text{varianceFactor} \times 0.2$$

#### Tầng 5: Tổng hợp Điểm Chất lượng $Q_{\text{final}}$ & Biến động Điểm Uy Tín (`trust_score`)
- **Công thức Điểm chất lượng bài làm (`qualityScore`)**:
  $$Q_{\text{final}} = \text{round}\big(\text{attentionScore} \times \text{varianceFactor} \times \text{speedRatio}, 2\big)$$
- **Phân loại trạng thái bài nộp (`status`) và Xử lý Hệ quả**:

| Ngưỡng điểm $Q_{\text{final}}$ | Trạng thái (`status`) | Hệ quả Tiền tệ & Điểm Uy Tín (`trust_score`) hiện tại |
| :--- | :--- | :--- |
| $Q_{\text{final}} \ge 0.80$ | `VALIDATED` (Hợp lệ) | Giải ngân 100% điểm thưởng (`reward_points_per_response`) và Voucher (nếu có). Cộng **`+0.5 điểm`** vào `trust_score` (tối đa `100.0`). |
| $0.50 \le Q_{\text{final}} < 0.80$ | `FLAGGED_MANUAL` (Gắn cờ) | Tạm treo chưa giải ngân điểm, ghi vào `fraud_logs` chờ kiểm duyệt. Không trừ `trust_score`. |
| $Q_{\text{final}} < 0.50$ | `REJECTED_FRAUD` (Từ chối) | Không trả thưởng, ghi vào `fraud_logs`. Trừ ngay **`-15.0 điểm`** khỏi `trust_score` (`Math.max(0, trust_score - 15.0)`). |

#### Tầng Bổ trợ: Phát hiện Đa tài khoản (Multi-Account) & Tự động Ban IP (`trackAndVerifyDeviceIp`)
- Mỗi khi đăng ký, đăng nhập hoặc nộp bài, hệ thống ghi nhận `ip_address` và `device_fingerprint` vào bảng `device_ip_logs`.
- Quét cửa sổ **24 giờ gần nhất** (`datetime('now', '-24 hours')`) để đếm số lượng `user_id` khác nhau cùng sử dụng chung 1 địa chỉ IP (`distinctIpUsers`) hoặc chung 1 vân tay thiết bị (`distinctDeviceUsers`):
  - **Từ 3 đến 4 tài khoản** (`maxLinkedUsers >= 3`): Ghi cảnh báo `CANH_BAO_KHA_NGHI_MULTI_ACCOUNT` vào bảng `fraud_logs`.
  - **Từ 5 tài khoản trở lên** (`maxLinkedUsers >= 5`):
    - Tự động thêm địa chỉ IP vào bảng đen `banned_ips` (nếu không phải IP localhost `127.0.0.1` / `::1`).
    - Tự động khóa toàn bộ các tài khoản liên quan (`UPDATE users SET status = 'BANNED' WHERE role != 'ADMIN'`).

---

### 3.2. Thuật toán Đối khớp Nhân khẩu học & Xếp hạng Bảng tin (`server/services/matchingService.js`)

#### A. Tính Điểm Tương đồng Nhân khẩu học (`calculateMatchScore`)
So sánh hồ sơ của đáp viên (`userDemo`) với tiêu chí mục tiêu của khảo sát (`targetDemo`) dựa trên 5 nhóm trọng số (`WEIGHTS`):
- Trường Đại học (`university`): Trọng số $w_1 = 0.35$ (35%)
- Ngành học / Nghề nghiệp (`major`): Trọng số $w_2 = 0.25$ (25%)
- Độ tuổi / Năm sinh (`age`): Trọng số $w_3 = 0.20$ (20%)
- Tỉnh / Thành phố (`province`): Trọng số $w_4 = 0.10$ (10%)
- Giới tính (`gender`): Trọng số $w_5 = 0.10$ (10%)

**Quy tắc chấm điểm từng tiêu chí có bật lọc**:
- Cộng $w_i$ vào `totalWeight`.
- Nếu thông tin của đáp viên **khớp** với tiêu chí: `earnedWeight += w_i * 1.0` (đạt 100% trọng số).
- Nếu đáp viên **chưa khai báo** trường thông tin đó trong hồ sơ: `earnedWeight += w_i * 0.3` (đạt 30% trọng số khuyến khích).
- Nếu đáp viên đã khai báo nhưng **không khớp**: `earnedWeight += 0`.
- **Công thức Điểm khớp (`matchScore`)**:
  $$\text{matchScore} = \begin{cases} 100 & \text{nếu } \text{totalWeight} = 0 \\ \text{round}\left(\frac{\text{earnedWeight}}{\text{totalWeight}} \times 100\right) & \text{nếu } \text{totalWeight} > 0 \end{cases}$$

#### B. Sắp xếp Bảng tin Khảo sát (`listSurveys` & `calculateFeedRankingScore`)
1. Trong `surveyController.listSurveys`: Danh sách khảo sát `ACTIVE` trả về cho Respondent được sắp xếp ưu tiên theo:
   - Tiêu chí 1: `matchScore` giảm dần (Khảo sát hợp hồ sơ nhất nổi lên đầu).
   - Tiêu chí 2: `reward_points_per_response` giảm dần (Thù lao cao hơn xếp trên).
2. Ngoài ra, hàm `calculateFeedRankingScore(matchScore, rewardPoints, collected, target)` định nghĩa công thức điểm xếp hạng tổng hợp:
   $$\text{RankingScore} = \left(\frac{\text{matchScore}}{100}\right)^2 \times \ln(1 + \text{rewardPoints}) \times \text{Urgency}$$
   Trong đó hệ số khan hiếm $\text{Urgency} = 1.4$ nếu khảo sát đã thu thập $\ge 80\%$ số mẫu mục tiêu ($\frac{\text{collected}}{\text{target}} \ge 0.8$), ngược lại $\text{Urgency} = 1.0$.

---

### 3.3. Thuật toán Bóc tách Biểu mẫu Ngoài, Chống Trùng lặp & Chống SSRF (`formParserService.js` & `antiFraudService.js`)

1. **Chống Tấn công SSRF (`formParserService._validateSafeUrl`)**:
   - Chỉ cho phép giao thức `http:` và `https:`.
   - Chặn toàn bộ hostname nội bộ (`localhost`, `.local`, `.internal`) và các dải IP Private/Loopback (`127.x.x.x`, `10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`, `169.254.x.x`, `0.0.0.0`, `::1`, `fc00:`, `fe80:`).
2. **Chuẩn hóa URL & Chặn Đăng ký Trùng lặp (`normalizeFormUrl` & `checkDuplicateFormUrl`)**:
   - Mọi đường link Google Forms (`/forms/d/e/<ID>/...`), rút gọn `forms.gle/<ID>`, hoặc Microsoft Forms (`forms.office.com` có tham số `id=`) đều được chuẩn hóa về một chuỗi định danh gốc duy nhất (`normalized_form_url`, ví dụ: `google_form:<ID>` hoặc `ms_form:<ID>`).
   - Hệ thống kiểm tra trong bảng `surveys` (`WHERE normalized_form_url = ? AND status != 'CLOSED'`). Nếu đã tồn tại, hệ thống chặn ngay lập tức để ngăn hành vi tạo nhiều tài khoản clone cùng đăng 1 link Google Form nhằm bào mòn gói 25 mẫu dùng thử miễn phí.
3. **Bóc tách Cấu trúc Câu hỏi Tự động**:
   - **Google Forms (`_parseGoogleFormsHtml`)**: Trích xuất biến mảng `FB_PUBLIC_LOAD_DATA_` từ mã nguồn HTML, duyệt mảng `loadData[1][1]` để lấy danh sách câu hỏi và ánh xạ mã `typeId` của Google sang loại câu hỏi của hệ thống (`0, 1 -> OPEN_TEXT`; `2 -> SINGLE_CHOICE`; `3 -> DROPDOWN`; `4 -> MULTIPLE_CHOICE`; `5 -> LIKERT_SCALE`; `9, 10 -> DATE_INPUT`). *(Hiện tại chưa đọc trường bắt buộc `qData[2] === 1`)*.
   - **Microsoft Forms (`_parseMicrosoftFormsHtml`)**: Trích xuất biến `__initialState` / `window.OfficeFormServerInfo` để bóc tách câu hỏi.
   - **Smart Text Paste (`parseSmartText`)**: Dùng biểu thức chính quy (Regex) nhận diện câu hỏi theo dòng, tự động phân loại phương án lựa chọn (`A.`, `B.`, `-`, `*`, `[ ]`, `1)`) và từ khóa thang đo Likert (`1-5`, `mức độ`, `đánh giá`, `hài lòng`).
