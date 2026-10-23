# BẢN KẾ HOẠCH TỔNG THỂ VIBESURVEY (MASTER SPECIFICATION & WORK BREAKDOWN)
> **Tài liệu duy nhất quy định:** Kinh tế học, Tokenomics, Rút tiền, Phân quyền Tài khoản Toàn năng & Đồng bộ Google Sheets.  
> **Định dạng tối ưu:** Đã phân vùng độc lập 5 Gói (Zones) để bàn giao cho nhiều Conversation xử lý song song không xung đột.

---

## 📌 PHẦN CHUNG: 3 NGUYÊN TẮC BẤT KHẢ XÂM PHẠM (DÙNG CHUNG)

```
[Tiền Thật Nạp Vào (VNĐ)] ──► [Credit Tạo Form (VNĐ)] ──► [Ký Quỹ Escrow Khảo Sát]
                                         │                                │
                 ❌ CẤM ĐỔI SANG POINT   │                                ▼ (Người thật làm bài Anti-Fraud)
                 ❌ CẤM RÚT TIỀN MẶT      │                  [Điểm Thưởng (Point)] ──► [Rút Tiền Thật]
                                         │                                │
                                         └─────── Đổi Point -> Credit ◄───┘ (Chiết khấu 30%)
```

1. **Nguyên tắc "Van Một Chiều" (The One-Way Valve)**:
   - `Credit tạo form (credit_balance)`: Tiền tiêu dùng nội bộ để tạo form/tài trợ voucher. **Vĩnh viễn không thể rút ra tiền mặt**.
   - `Điểm rút tiền (point_balance)`: Thù lao làm bài của đáp viên. **Chỉ loại này mới được rút ra tiền mặt**.
   - **Cấm 100% việc đổi từ Credit tạo form sang Điểm rút tiền**.
2. **Nguyên tắc "Tài Khoản Toàn Năng" (Hybrid All-in-One)**:
   - Xóa bỏ việc ép buộc tài khoản Doanh nghiệp. **Mọi tài khoản đều có nút `+ Tạo Khảo Sát` và tab `Khảo Sát Của Tôi`**.
   - Điều kiện xuất bản khảo sát dựa trên **Số dư Ký quỹ Escrow** (Credit nạp, Điểm đổi sang Credit, hoặc Voucher tài trợ).
3. **Quy chuẩn Tiền tệ cốt lõi**:
   - `1 Điểm (Point) = 10 VNĐ`.
   - Ngưỡng rút: Mốc phá băng lần đầu **10.000đ** (1.000 điểm) qua Thẻ cào; Các mốc chuẩn tiếp theo: **50.000đ, 100.000đ, 200.000đ, 500.000đ**.
   - Thưởng nạp lũy tiến (3% đến 15%) **100% là Credit Tạo Form**, điểm rút tiền luôn bằng **0**.

---

# 🚀 PHÂN VÙNG 5 GÓI THỰC THI ĐỘC LẬP (ĐỂ GIAO CHO TỪNG AI)

---

### MỤC 1: CONVERSATION XỬ LÝ KINH TẾ HỌC & ĐỊNH GIÁ (PRICING & UNIT ECONOMICS ENGINE)

* **Vai trò**: Chuyên viên Kinh tế học Sản phẩm & Thuật toán Định giá (Pricing Architect).
* **Mục tiêu**: Hiện thực hóa toàn bộ ma trận định giá khảo sát CPI theo thời lượng (LOI), độ hiếm tệp khách (IR), Take Rate linh hoạt (35% - 50%) và phí dịch vụ cộng thêm vào code.
* **Phạm vi file phụ trách (Scope)**:
  - `server/services/pricingService.js`
  - `server/config/index.js`
  - `tests/test_pricing.js` (Tạo mới)
* **Nhiệm vụ cụ thể**:
  1. Trong `server/config/index.js`:
     - Bổ sung các tham số kinh tế:
       - `BASE_PAYOUT_PER_MINUTE_VND: 700`: Thù lao cơ sở 700đ/phút (42.000đ/giờ).
       - `DYNAMIC_TAKE_RATE`: `SHORT: 0.50` (1-3 phút), `STANDARD: 0.40` (5-10 phút), `DEEP: 0.35` (12-25 phút).
       - `IR_MULTIPLIERS`: `GENERAL: 1.0` (IR 70-100%), `MEDIUM: 1.35` (IR 30-69%), `HARD: 1.8` (IR 10-29%), `NICHE: 2.5` (IR < 10%).
       - `TARGETING_FEE_PER_FILTER_VND: 1000`: Phí lọc sâu nhân khẩu học 1.000đ/phiếu/tiêu chí.
       - `FAST_DELIVERY_SURCHARGE_RATE: 0.25`: Gói hỏa tốc 6h (+25%).
       - `AI_INSIGHTS_REPORT_FEE_VND: 500000`: Gói báo cáo AI 500.000đ.
  2. Trong `server/services/pricingService.js`:
     - Nâng cấp `calculateSurveyEconomics()` áp dụng công thức chuẩn:
       $$\text{CPI} = \left[ \frac{\text{Base Rate} \times \text{LOI}}{1 - \text{Take Rate}} \right] \times M_{\text{IR}} + \sum \text{Phí Targeting}$$
     - Tính tự động thời lượng LOI theo câu hỏi (Trắc nghiệm đơn/nhiều = 17s; Likert Scale = 20s; Tự luận mở = 45s).
     - Trả về chi tiết: `costPerResponseVnd`, `rewardPointsPerResponse`, `platformProfitPerResponseVnd`, `actualTakeRate`, `totalEscrowVnd`.
  3. Tạo bài test `tests/test_pricing.js` kiểm tra độ chuẩn xác của công thức và tích hợp vào `tests/run_all_tests.js`. Chạy `npm test` PASS 100%.

📋 **PROMPT COPY CHO CONVERSATION 1 (XỬ LÝ KINH TẾ):**
```text
Bạn là Kỹ Sư Kinh Tế Học & Định Giá phụ trách MỤC 1 trong file KE_HOACH_TONG_THE.md:
Phạm vi file: server/services/pricingService.js, server/config/index.js, tests/test_pricing.js (mới).

Hãy triển khai:
1. Trong server/config/index.js, bổ sung cấu hình kinh tế học chuẩn:
   - BASE_PAYOUT_PER_MINUTE_VND = 700 (tương đương 42.000đ/giờ thù lao cho đáp viên).
   - DYNAMIC_TAKE_RATE: Khảo sát ngắn 50%, tiêu chuẩn 40%, chuyên sâu 35%.
   - IR_MULTIPLIERS: Đại chúng 1.0x, Trung bình 1.35x, Khó 1.8x, Cực hiếm 2.5x.
   - TARGETING_FEE_PER_FILTER_VND = 1000 (phí lọc sâu 1.000đ/tiêu chí/phiếu).
2. Trong server/services/pricingService.js: Nâng cấp calculateSurveyEconomics() theo công thức toán học CPI:
   CPI = [(Base Rate * LOI) / (1 - TakeRate)] * M_IR + Phí Targeting.
   Tính tự động thời lượng LOI theo loại câu hỏi.
3. Tạo file tests/test_pricing.js kiểm toán công thức định giá và tích hợp vào tests/run_all_tests.js, chạy npm test đảm bảo 100% PASS.
```

---

### MỤC 2: CONVERSATION BACKEND TIỀN TỆ & KHÓA VAN MỘT CHIỀU (LEDGER & WALLET)

* **Vai trò**: Kỹ Sư Sổ Cái Kế Toán & Bảo Mật Giao Dịch (Ledger Engineer).
* **Mục tiêu**: Khóa cứng van 1 chiều chống rút tiền từ Credit, chuẩn hóa thưởng nạp 100% bằng Credit tạo form, cập nhật mốc rút tiền và phí rút.
* **Phạm vi file phụ trách (Scope)**:
  - `server/services/ledgerService.js`
  - `server/controllers/walletController.js`
  - `tests/test_deposit_bonus.js`
  - `tests/test_ledger_acid.js`
* **Nhiệm vụ cụ thể**:
  1. Trong `server/services/ledgerService.js`:
     - Sửa `calculateDepositBonus()`: Trả về `bonusCreditVnd` (thưởng Credit tạo form VNĐ: 100k +3%, 500k +5%, 1M +8%, 2M +12%, 5M +15%), **tuyệt đối không tính `bonusPoints`**.
     - Sửa `depositCredit()`: Chỉ cộng `credit_balance = credit_balance + amount + bonusCreditVnd`, **giữ nguyên `point_balance = 0`**.
  2. Trong `server/controllers/walletController.js` & `server/config/index.js`:
     - Cập nhật ngưỡng rút: Phá băng lần đầu `1.000 điểm = 10.000 VNĐ` (thẻ cào), chuẩn `5.000 điểm = 50.000 VNĐ`.
     - Phí rút thẻ cào: 0đ; Phí rút ngân hàng VietQR: Dưới 100k thu 2.000đ, từ 100k trở lên miễn phí.
  3. Cập nhật `tests/test_deposit_bonus.js` và `tests/test_ledger_acid.js`. Chạy `npm test` PASS 100%.

📋 **PROMPT COPY CHO CONVERSATION 2 (SỔ CÁI & TIỀN TỆ):**
```text
Bạn là Kỹ Sư Sổ Cái Tài Chính phụ trách MỤC 2 trong file KE_HOACH_TONG_THE.md:
Phạm vi file: server/services/ledgerService.js, server/controllers/walletController.js, tests/test_deposit_bonus.js.

Hãy triển khai:
1. Trong server/services/ledgerService.js:
   - Sửa calculateDepositBonus() và depositCredit(): Khóa van 1 chiều, thưởng nạp (+3% đến +15%) 100% bằng Credit tạo form VNĐ cộng vào credit_balance, point_balance giữ nguyên = 0. Cấm tuyệt đối đổi từ Credit sang Point.
2. Cập nhật mốc rút tiền: Ngưỡng phá băng lần đầu 10.000đ (1.000 điểm) chỉ cho thẻ cào; mốc chuẩn 50.000đ (5.000 điểm); miễn phí rút thẻ cào; phí ngân hàng 2.000đ khi rút < 100k (miễn phí từ 100k).
3. Cập nhật tests/test_deposit_bonus.js và chạy lệnh npm test đảm bảo toàn bộ test suites PASS 100%.
```

---

### MỤC 3: CONVERSATION PHÂN QUYỀN TÀI KHOẢN TOÀN NĂNG (HYBRID ACCOUNT)

* **Vai trò**: Kỹ Sư Phân Quyền & API Gateway.
* **Mục tiêu**: Mở quyền cho mọi tài khoản đã đăng ký (sinh viên, người thường) đều có quyền tạo khảo sát, xuất bản và nạp quỹ, không ép buộc chức danh doanh nghiệp.
* **Phạm vi file phụ trách (Scope)**:
  - `server/routes/api.js`
  - `server/controllers/surveyController.js`
* **Nhiệm vụ cụ thể**:
  1. Trong `server/routes/api.js`:
     - Mở quyền cho role `RESPONDENT` (cho phép `requireRole(['RESPONDENT', 'CREATOR', 'ADMIN'])`) tại:
       - `POST /api/v1/surveys`
       - `POST /api/v1/surveys/:id/publish`
       - `POST /api/v1/surveys/parse-external`
       - `POST /api/v1/wallet/deposit`
       - `GET /api/v1/surveys/:id/export`
  2. Trong `server/controllers/surveyController.js`:
     - Đảm bảo người dùng chỉ cần có trạng thái tài khoản `ACTIVE` và đủ số dư ký quỹ Escrow (Credit) là xuất bản được khảo sát.
  3. Chạy `npm test` kiểm tra không phát sinh lỗi bảo mật.

📋 **PROMPT COPY CHO CONVERSATION 3 (TÀI KHOẢN TOÀN NĂNG):**
```text
Bạn là Kỹ Sư Phân Quyền API phụ trách MỤC 3 trong file KE_HOACH_TONG_THE.md:
Phạm vi file: server/routes/api.js, server/controllers/surveyController.js.

Hãy triển khai:
1. Trong server/routes/api.js, mở quyền cho role 'RESPONDENT' (cho phép requireRole(['RESPONDENT', 'CREATOR', 'ADMIN'])) tại các endpoints:
   - POST /api/v1/surveys (Tạo khảo sát)
   - POST /api/v1/surveys/:id/publish (Xuất bản khảo sát)
   - POST /api/v1/surveys/parse-external (Bóc tách link form Google/Microsoft)
   - POST /api/v1/wallet/deposit (Nạp quỹ ký quỹ)
   - GET /api/v1/surveys/:id/export (Xuất dữ liệu CSV)
2. Kiểm tra server/controllers/surveyController.js để bảo đảm mọi tài khoản ACTIVE đều tạo và xuất bản được khảo sát nếu có đủ số dư ký quỹ Escrow.
3. Chạy npm test bảo đảm không có regression nào xảy ra.
```

---

### MỤC 4: CONVERSATION GOOGLE SHEETS WEBHOOK SYNC ENGINE (REAL-TIME SYNC)

* **Vai trò**: Kỹ Sư Tích Hợp Webhook & Dữ Liệu Thời Gian Thực.
* **Mục tiêu**: Cho phép Creator gắn link Webhook của Google Sheets để tự động nhận câu trả lời của đáp viên theo thời gian thực mà không bị Google chặn.
* **Phạm vi file phụ trách (Scope)**:
  - `server/db/database.js`
  - `server/services/webhookService.js` (Tạo mới)
  - `server/controllers/surveyController.js`
  - `tests/test_webhook_sync.js` (Tạo mới)
* **Nhiệm vụ cụ thể**:
  1. Trong `server/db/database.js`: Thêm cột `google_sheets_webhook_url TEXT` vào bảng `surveys` (kèm migration an toàn).
  2. Tạo mới `server/services/webhookService.js`: Hàm `dispatchGoogleSheetsSync(webhookUrl, responseData)` gửi HTTP POST JSON payload bất đồng bộ không gây chậm luồng nộp bài (Non-blocking).
  3. Trong `server/controllers/surveyController.js`:
     - Lưu nhận `google_sheets_webhook_url` khi tạo/sửa khảo sát.
     - Trong `submitSurvey`: Sau khi bài làm vượt qua Anti-Fraud (`evalResult.status === 'VALIDATED'`), tự động kích hoạt Webhook bắn câu trả lời sang Google Sheets.
  4. Tạo bài test `tests/test_webhook_sync.js` và tích hợp vào `tests/run_all_tests.js`. Chạy `npm test` PASS 100%.

📋 **PROMPT COPY CHO CONVERSATION 4 (GOOGLE SHEETS WEBHOOK):**
```text
Bạn là Kỹ Sư Tích Hợp Webhook phụ trách MỤC 4 trong file KE_HOACH_TONG_THE.md:
Phạm vi file: server/db/database.js, server/services/webhookService.js (mới), server/controllers/surveyController.js, tests/test_webhook_sync.js (mới).

Hãy triển khai:
1. Trong server/db/database.js: Thêm cột google_sheets_webhook_url TEXT vào bảng surveys (có migration an toàn nếu bảng đã tồn tại).
2. Tạo mới file server/services/webhookService.js: Gửi HTTP POST JSON payload bất đồng bộ (Non-blocking) sang URL webhook của Google Apps Script.
3. Trong server/controllers/surveyController.js:
   - Lưu nhận google_sheets_webhook_url trong createSurvey và updateSurvey.
   - Trong submitSurvey: Khi bài làm đạt trạng thái 'VALIDATED', tự động kích hoạt dispatchGoogleSheetsSync.
4. Tạo bộ kiểm thử tests/test_webhook_sync.js và tích hợp vào tests/run_all_tests.js, chạy npm test PASS 100%.
```

---

### MỤC 5: CONVERSATION GIAO DIỆN WEB & MOBILE (MODALS & WALLET VIBE)

* **Vai trò**: Kỹ Sư Frontend UI/UX.
* **Mục tiêu**: Cập nhật Header luôn có nút Tạo Form, thêm tab Khảo sát của tôi, cập nhật modal Nạp quỹ, modal Rút tiền và modal Tạo form.
* **Phạm vi file phụ trách (Scope)**:
  - `public/app.js`
* **Nhiệm vụ cụ thể**:
  1. Header Navigation: Luôn hiển thị nút **`+ Tạo Khảo Sát`** cho tất cả người dùng (bỏ điều kiện `user.role === 'CREATOR'`).
  2. Thêm tab **"Khảo Sát Của Tôi"** cho người dùng thường xem các bài mình đăng.
  3. Modal Nạp Quỹ (`openDepositModal`): Hiển thị nhãn `[Credit Tạo Khảo Sát - Không Rút Tiền Mặt]` và tính đúng phần thưởng Credit VNĐ (+3% đến +15%).
  4. Modal Rút Tiền (`openPayoutModal`): Thêm mốc 10k (lần đầu cho thẻ cào), mốc 50k-500k chuẩn, ghi rõ phí ngân hàng 2k (miễn phí từ 100k).
  5. Modal Tạo Khảo Sát: Thêm ô nhập `Google Sheets Webhook URL` kèm popup hướng dẫn copy Apps Script 30 giây.
  6. Chạy `node -c public/app.js` kiểm tra cú pháp sạch sẽ.

📋 **PROMPT COPY CHO CONVERSATION 5 (FRONTEND GIAO DIỆN):**
```text
Bạn là Kỹ Sư Frontend UI/UX phụ trách MỤC 5 trong file KE_HOACH_TONG_THE.md:
Phạm vi file: public/app.js.

Hãy triển khai:
1. Luôn hiển thị nút '+ Tạo Khảo Sát' trên Header cho mọi tài khoản đã đăng nhập (bỏ điều kiện role === 'CREATOR').
2. Bổ sung tab/mục 'Khảo Sát Của Tôi' cho người dùng thường xem các form mình tạo.
3. Modal Nạp Quỹ (openDepositModal): Cập nhật hiển thị rõ nhận 'Credit Tạo Khảo Sát' kèm thưởng bonus Credit (+3% đến +15%) nội bộ, không rút tiền mặt.
4. Modal Rút Tiền (openPayoutModal): Thêm mốc 10k (lần đầu cho thẻ cào), mốc 50k-500k chuẩn, ghi rõ phí ngân hàng 2k (miễn phí từ 100k).
5. Modal Tạo Khảo Sát (openCreateSurveyModal): Thêm ô nhập Google Sheets Webhook URL kèm popup mẫu Google Apps Script 1-click.
6. Chạy node -c public/app.js đảm bảo không có lỗi cú pháp.
```

---

# PHẦN B: TOÀN BỘ ĐẶC TẢ KINH TẾ HỌC CHI TIẾT (GIỮ NGUYÊN 100%)

---

### MỤC 6: NGUYÊN TẮC "VAN MỘT CHIỀU" & BẢO VỆ CHỐNG RỬA TIỀN / TRỤC LỢI KHUYẾN MÃI

Để triệt tiêu hoàn toàn rủi ro **Trục lợi khuyến mãi (Promotion Arbitrage)** và **Rửa tiền (Money Laundering)** khi người dùng nạp tiền nhiều để nhận thưởng bonus:

```
[Tiền Thật Nạp Vào (VNĐ)]
         │
         ▼
[Credit Tạo Form (VNĐ)]  <── BONUS NẠP (+3% đến +15%) BẮT BUỘC 100% LÀ CREDIT TẠO FORM!
         │
         │  ❌ TUYỆT ĐỐI CẤM (ZERO CONVERSION): Không có cơ chế đổi từ Credit sang Điểm rút tiền!
         │  ❌ KHÔNG CÓ TÍNH NĂNG RÚT TIỀN TỪ VÍ CREDIT.
         ▼
[Ký Quỹ Escrow Khảo Sát / Tài Trợ Voucher]
         │
         ▼ (Chỉ giải ngân khi người thật bỏ thời gian làm bài & vượt qua Anti-Fraud)
[Điểm Thưởng Respondent (Point)] ──► [Rút Tiền Thật / Đổi Thẻ Cào (Payout)]
         │
         ▼ (Cho phép đổi ngược: Điểm làm bài ──► Credit tạo form với chiết khấu 30%)
[Credit Tạo Form (VNĐ)]
```

#### 3 Chốt Chặn Tài Chính Sống Còn:
1. **Tách biệt 2 loại tiền tệ độc lập**:
   * **`Credit tạo form (credit_balance)`**: Đồng tiền tiêu dùng nội bộ (in-app currency) dùng để xuất bản khảo sát và tài trợ voucher. **Vĩnh viễn không thể rút ra tiền mặt**.
   * **`Điểm rút tiền (point_balance)`**: Đơn vị thù lao chỉ sinh ra khi đáp viên bỏ thời gian, công sức làm bài và vượt qua bộ lọc Anti-Fraud. **Loại điểm này mới được phép rút ra tiền mặt/thẻ cào**.
2. **Quy tắc chuyển hóa duy nhất**: Credit tạo form **CHỈ CÓ THỂ** chuyển hóa thành Điểm rút tiền thông qua **Giá trị lao động thực tế** của người làm khảo sát. Không ai có thể tự nạp tiền rồi tự rút ra để ăn tiền thưởng.
3. **Cơ chế Swap Một Chiều**:
   * `Điểm làm bài` $\rightarrow$ `Credit tạo form`: **ĐƯỢC PHÉP** (Chiết khấu sàn 30%, 1 Điểm = 7 VNĐ Credit để hỗ trợ sinh viên dùng điểm kiếm được tạo khảo sát luận văn).
   * `Credit tạo form` $\rightarrow$ `Điểm làm bài`: **CẤM TUYỆT ĐỐI (100% Blocked)**.

---

### MỤC 7: BẢNG BẬC THANG BONUS NẠP TIỀN & MÔ PHỎNG UNIT ECONOMICS CHI TIẾT

Khi Creator/Doanh nghiệp nạp tiền vào quỹ ký quỹ, phần thưởng bonus nạp nhiều **100% ĐƯỢC CỘNG VÀO VÍ CREDIT TẠO FORM**, số dư `point_balance` (Điểm rút tiền) giữ nguyên là **0**.

| Bậc Nạp Tiền | Hạng Thành Viên | Tỷ Lệ Bonus | Nhận Thực Tế (Credit Tạo Form) | Điểm Rút Tiền (`point_balance`) | Quyền Lợi Đi Kèm (Gamification B2B) | Lợi Nhuận Gộp Sàn (Net Take Rate) |
| :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| **Dưới 100.000đ** | Cơ bản | **0%** | Nhận đúng số nạp | **0 Điểm** | Tiêu chuẩn | **40.0%** (Đủ 40%) |
| **100.000đ – 499.000đ** | Đồng (Bronze) | **+3%** | Nạp 100K $\rightarrow$ **Nhận 103.000đ Credit** | **0 Điểm** | Thêm ~3-5 câu hỏi miễn phí | **37.0%** (+37.000đ) |
| **500.000đ – 999.000đ** | Bạc (Silver) | **+5%** | Nạp 500K $\rightarrow$ **Nhận 525.000đ Credit** | **0 Điểm** | Thêm ~35 phiếu khảo sát ngắn | **35.0%** (+175.000đ) |
| **1.000.000đ – 1.999.000đ** | Vàng (Gold) | **+8%** | Nạp 1M $\rightarrow$ **Nhận 1.080.000đ Credit** | **0 Điểm** | Huy hiệu "Nhà nghiên cứu Vàng" | **32.0%** (+320.000đ) |
| **2.000.000đ – 4.999.000đ** | Bạch Kim (Platinum) | **+12%** | Nạp 2M $\rightarrow$ **Nhận 2.240.000đ Credit** | **0 Điểm** | Ghim Top Khảo sát 24 giờ | **28.0%** (+560.000đ) |
| **Từ 5.000.000đ trở lên** | Kim Cương (VIP) | **+15%** | Nạp 5M $\rightarrow$ **Nhận 5.750.000đ Credit** | **0 Điểm** | Tặng Gói Báo Cáo AI Insights Miễn Phí | **25.0%** (+1.250.000đ) |

#### Bảng Mô Phỏng Kinh Tế Đơn Vị Dự Án 500 Mẫu (Unit Economics Simulation):
Giả định một dự án khảo sát tiêu chuẩn cần thu thập **N = 500 phiếu hợp lệ**, thời lượng **LOI = 8 phút (25 câu)**, tệp đối tượng **Độ khó Trung bình (IR = 40% $\rightarrow$ Hệ số 1.35x)**:

| Hạng mục Dòng tiền (Trên 1 Dự án 500 mẫu) | Đơn giá / Phiếu | Tổng giá trị (500 Phiếu) | Tỷ trọng (%) | Ghi chú vận hành |
| :--- | :--- | :--- | :--- | :--- |
| **1. Doanh thu thu từ Creator (GMV)** | **12.800 đ** | **6.400.000 đ** | **100%** | Nạp trước 100% vào ví Escrow trước khi bài khảo sát được xuất bản. |
| **2. Chi phí trả điểm cho 500 Respondent hoàn thành** | 7.500 đ (750 Điểm) | -3.750.000 đ | 58.6% | Cộng vào ví Pending, chuyển sang Available sau 24h kiểm duyệt. |
| **3. Chi phí an ủi Screen-out & Bonus hạng VIP** | ~500 đ | -250.000 đ | 3.9% | Trả 15 điểm cho ~500 người bị loại ở vòng lọc + Thưởng thêm hạng VIP. |
| **4. Khấu trừ Điểm gãy kỳ vọng (Breakage 15%)** | +1.200 đ | +600.000 đ | +9.4% | Khoảng 15% số điểm phát ra sẽ bị bỏ quên hoặc hết hạn sau 12 tháng. |
| **5. Chi phí Cổng thanh toán (Nạp vào & Rút ra)** | ~150 đ | -75.000 đ | 1.2% | Phí nhận tiền VietQR B2B và chi trả thẻ cào (đã bù trừ chiết khấu thẻ cào). |
| **6. Lợi nhuận gộp của Nền tảng (Net Platform Take Rate)** | **5.850 đ** | **2.925.000 đ** | **45.7%** | Biên lợi nhuận gộp thực tế đạt **~45.7%** sau khi tính cả Breakage. |

---

### MỤC 8: TỔNG HỢP & ĐỐI SÁNH THỰC TẾ THỊ TRƯỜNG (VINARESEARCH, INFOQ, MILIEU, PROLIFIC, POLLFISH)

| Tiêu chí | Vinaresearch (GMO) | InfoQ (GMO-Z.com) | Milieu Surveys | Prolific (UK/US) | Pollfish (US) | **Đề xuất VibeSurvey** |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Tỷ lệ quy đổi điểm** | 1 điểm = 100đ | 1 điểm = 100đ | Điểm ảo không cố định | Trả tiền mặt trực tiếp (£/$) | Điểm app đối tác | **1 Điểm = 10 VNĐ** *(Dễ chia nhỏ, kích thích tâm lý)* |
| **Ngưỡng rút tối thiểu** | 50.000đ (500 điểm) | 50.000đ (500 điểm) | ~50.000đ - 100.000đ | £6.00 (~180.000đ) | $5.00 (~125.000đ) | **10.000đ (Lần đầu)**<br>**50.000đ (Chuẩn)** |
| **Kênh rút tiền** | Thẻ cào, Got It, MoMo | Thẻ cào, Ngân hàng, Bảo Kim | Thẻ cào, Grab/Shopee voucher | PayPal, Ngân hàng | PayPal, Gift cards | **Thẻ cào / Topup**, **VietQR**, **Voucher Brand** |
| **Thời gian duyệt (SLA)** | 1 đợt/tháng (Chờ 10-30 ngày) | 1-3 ngày làm việc | 10 ngày làm việc | 1-3 ngày (Auto sau 4 lần) | 24-48 giờ | **24-48h (Chuẩn)**<br>**< 5 phút (User VIP)** |
| **Take Rate (Sàn giữ)** | ~50% - 60% | ~50% - 60% | ~45% - 55% | **25% - 30%** (Commercial fee 42.8%) | **50% - 65%** | **40% (Chuẩn)**<br>*(Dao động 35% - 50%)* |
| **Quyền tạo khảo sát** | Chỉ Doanh nghiệp B2B | Chỉ Doanh nghiệp B2B | Chỉ Agency | Nghiên cứu sinh / Cá nhân | Chỉ Doanh nghiệp | **Mọi tài khoản (Hybrid Member)** |
| **Đồng bộ dữ liệu** | Xuất file thủ công | Xuất file thủ công | Xuất file thủ công | API / Export | Webhook / API | **Google Sheets Webhook + CSV 1-Click** |
| **Xử lý Screen-out** | Ức chế (0đ hoặc 1 điểm) | Ức chế (0đ) | Thấp (Lọc trước) | Không bị loại giữa chừng | Bù tượng trưng | **Pre-matching 90%** + **Bồi hoàn 15 điểm** |

---

### MỤC 9: CƠ CHẾ TOKENOMICS, DUAL-BALANCE & QUY ĐỔI RÚT TIỀN CHO RESPONDENT

#### 9.1. Tỷ Giá Quy Đổi
* **Công thức**: **`1 Điểm (VibePoint) = 10 VNĐ`**.
* **Hiển thị Ví**: Song song số dư điểm `[ 💎 6,500 Điểm ]` và giá trị tiền quy đổi `(~65,000đ)`.
* **Cơ chế 2 trạng thái số dư**:
  - `Pending Points` (Chờ duyệt 24h): Giữ lại chạy Anti-Fraud kiểm tra Speeder, Straight-lining, Bẫy tập trung ngầm.
  - `Available Points` (Khả dụng): Điểm sạch đã kiểm duyệt, sẵn sàng rút tiền hoặc đổi voucher.

#### 9.2. Ngưỡng Rút Bậc Thang Bất Đối Xứng
* **Mốc "Phá Băng" (First-time Cashout): 1.000 Điểm (10.000 VNĐ)**: Duy nhất 1 lần đầu tiên qua Thẻ cào/Topup để user chạm tới "Aha Moment" xóa bỏ nghi ngờ app lừa đảo.
* **Mốc Tiêu Chuẩn**: 5.000 Điểm (50.000đ), 10.000 Điểm (100.000đ), 20.000 Điểm (200.000đ), 50.000 Điểm (500.000đ).

#### 9.3. Cấu Trúc Phí Rút Tiền
* **Thẻ cào / Nạp điện thoại**: Miễn phí 100% (Sàn nhận chiết khấu sỉ 2.5% – 4.5% $\rightarrow$ sàn lãi thêm 4%).
* **Chuyển khoản Ngân hàng (VietQR / NAPAS 247)**: Rút < 100.000đ thu phí 2.000đ (200 điểm) bù phí cổng; Rút $\ge$ 100.000đ miễn phí 100%.
* **Đổi Voucher Brand (Shopee, Grab, Highlands)**: Miễn phí 100%.

---

### MỤC 10: TAKE RATE NỀN TẢNG, LOI, IR & CÔNG THỨC ĐỊNH GIÁ KHẢO SÁT (CPI MATRIX)

#### 10.1. Tỷ Lệ Giữ Lại Của Nền Tảng (Take Rate = 40% Chuẩn)
* Phân khúc Khảo sát ngắn (1–3 phút): Sàn giữ **48% – 50%**.
* Phân khúc Tiêu chuẩn (5–10 phút): Sàn giữ **40%** (Chủ lực).
* Phân khúc Chuyên sâu (12–25 phút): Sàn giữ **35%** (+100% phí lọc mục tiêu).

#### 10.2. Công Thức Định Giá Phiếu Khảo Sát Tự Động (CPI Algorithm)
$$\text{CPI} = \left[ \frac{\text{Base Rate} \times \text{LOI}}{1 - \text{Take Rate}} \right] \times M_{\text{IR}} + \sum \text{Phí Targeting}$$

* **$\text{Base Rate}$**: **700 VNĐ / phút** (tương đương **42.000 VNĐ / giờ**).
* **$\text{LOI}$ (Length of Interview)**: Thời lượng làm bài (3.5 câu trắc nghiệm = 1 phút; 1 câu tự luận = 45 giây).
* **$M_{\text{IR}}$ (Hệ số độ hiếm tệp khách)**:
  - Đại chúng (IR 70-100%): 1.0x
  - Trung bình (IR 30-69%): 1.35x
  - Khó / Ngách (IR 10-29%): 1.8x
  - Cực hiếm (IR < 10%): 2.5x
* **Phí Dịch vụ Cộng thêm (Margin 90%)**:
  - Lọc sâu (Thu nhập, ô tô, mẹ bỉm...): **+1.000đ / tiêu chí / phiếu**.
  - Gói Hỏa tốc Hoàn thành trong 6h: **+25% tổng dự án**.
  - Gói Báo cáo AI Insights & Xuất file thô SPSS: **+500.000đ / dự án**.

#### Bảng Tham Chiếu Định Giá Thực Tế:
| Độ khó tệp đối tượng (IR) | Hệ số nhân ($M_{\text{IR}}$) | Khảo sát Ngắn (LOI: 3 phút ~ 10 câu)<br>*Thưởng User / Thu Creator* | Khảo sát Tiêu chuẩn (LOI: 8 phút ~ 25 câu)<br>*Thưởng User / Thu Creator* | Khảo sát Chuyên sâu (LOI: 15 phút ~ 50 câu)<br>*Thưởng User / Thu Creator* |
| :--- | :---: | :---: | :---: | :---: |
| **Đại chúng (IR: 70% - 100%)** | **1.0x** | **2.100đ** (210 Điểm)<br>Thu: **3.500đ / phiếu** | **5.600đ** (560 Điểm)<br>Thu: **9.500đ / phiếu** | **10.500đ** (1.050 Điểm)<br>Thu: **17.500đ / phiếu** |
| **Trung bình (IR: 30% - 69%)** | **1.35x** | **2.800đ** (280 Điểm)<br>Thu: **4.700đ / phiếu** | **7.500đ** (750 Điểm)<br>Thu: **12.800đ / phiếu** | **14.200đ** (1.420 Điểm)<br>Thu: **23.600đ / phiếu** |
| **Khó / Ngách (IR: 10% - 29%)** | **1.8x** | **3.800đ** (380 Điểm)<br>Thu: **6.300đ / phiếu** | **10.000đ** (1.000 Điểm)<br>Thu: **17.000đ / phiếu** | **19.000đ** (1.900 Điểm)<br>Thu: **31.500đ / phiếu** |
| **Cực hiếm (IR < 10%)** | **2.5x** | **5.200đ** (520 Điểm)<br>Thu: **8.800đ / phiếu** | **14.000đ** (1.400 Điểm)<br>Thu: **23.800đ / phiếu** | **26.000đ** (2.600 Điểm)<br>Thu: **43.800đ / phiếu** |

---

### MỤC 11: QUẢN TRỊ DÒNG TIỀN, ĐIỂM GÃY, GAMIFICATION & RETENTION

1. **Tỷ lệ Dự trữ Thanh khoản (Liquidity Reserve Ratio)**:
   - Sàn duy trì **75%** tiền mặt tương ứng với tổng điểm của các tài khoản có đăng nhập trong 30 ngày.
   - **25% còn lại** là dòng tiền nhàn rỗi (Float money) tối ưu chi phí vận hành.
2. **Điểm gãy (Breakage Rate kỳ vọng 15% - 20%)**:
   - Khoảng 15-20% số điểm phát hành sẽ không bao giờ được rút do người dùng bỏ rơi tài khoản khi chưa đạt mốc 50k $\rightarrow$ Hoàn nhập vào lợi nhuận sàn.
   - *Hạn sử dụng điểm (FIFO)*: Điểm có hạn 12 tháng. Tài khoản ngủ đông 90 ngày sẽ được cảnh báo trước 7 ngày, sau đó thu hồi điểm về Quỹ Vận Hành.
3. **Daily Pulse (Câu hỏi 1 câu mỗi ngày)**:
   - Mỗi ngày hiển thị 1 câu hỏi thăm dò thú vị (thời gian làm 10 giây).
   - Thưởng `+5 Điểm (50đ)/ngày`. Chuỗi Streak 7 ngày liên tiếp tặng **Thẻ Boost +10% điểm thưởng** cho bài khảo sát tiếp theo.
4. **Bảo hiểm Screen-out**:
   - Khảo sát phân bổ trước (Pre-matching 90%).
   - Nếu đáp viên vẫn bị loại ở câu hỏi sàng lọc đầu bài, hệ thống tự động bồi hoàn **15 Điểm (150đ)** an ủi.
5. **Hạng thành viên & Điểm Uy Tín**:
   - *Đồng (Bronze)*: Mới đăng ký, SLA rút 24h - 48h.
   - *Bạc (Silver)*: Làm $\ge 10$ bài + Trust Score $\ge 85\% \rightarrow$ Cộng thêm **+5% điểm**, giảm phí rút tiền.
   - *Vàng (Gold VIP)*: Làm $\ge 30$ bài + Trust Score $\ge 95\% \rightarrow$ Cộng thêm **+12% điểm**, nhận thông báo sớm 15 phút, **Rút tiền tự động siêu tốc (< 5 phút)**.

---

### MỤC 12: ĐẶC TẢ KỸ THUẬT GOOGLE SHEETS WEBHOOK SCRIPT 1-CLICK

#### Mẫu Google Apps Script (Creator copy & paste vào Extensions > Apps Script trên Google Sheets):
```javascript
function doPost(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = JSON.parse(e.postData.contents);
    
    // Nếu trang tính chưa có tiêu đề cột thì tạo dòng header
    if (sheet.getLastRow() === 0) {
      var headerRow = ["Thời Gian Nộp", "ID Phản Hồi", "Thời Lượng (giây)", "Điểm Chất Lượng"];
      for (var qKey in data.answers) {
        headerRow.push(qKey);
      }
      sheet.appendRow(headerRow);
    }
    
    // Ghi dữ liệu câu trả lời của đáp viên
    var row = [data.submitted_at, data.response_id, data.duration_sec, data.quality_score];
    for (var key in data.answers) {
      row.push(data.answers[key]);
    }
    sheet.appendRow(row);
    
    return ContentService.createTextOutput(JSON.stringify({ status: "success", message: "Đã ghi nhận phản hồi" }))
                         .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.message }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}
```
* **Payload VibeSurvey gửi sang Webhook**:
  ```json
  {
    "survey_id": "survey_uuid_12345",
    "response_id": "resp_uuid_67890",
    "submitted_at": "2026-10-23T17:50:00Z",
    "duration_sec": 145,
    "quality_score": 0.95,
    "answers": {
      "q1": "Nam",
      "q2": "Đại học Bách Khoa Hà Nội",
      "q3": "Rất hài lòng"
    }
  }
  ```
