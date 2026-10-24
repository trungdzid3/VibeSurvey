# CHÍNH SÁCH KINH TẾ VIBESURVEY — PHIÊN BẢN ĐANG CHẠY (THEO CODE)

> Tài liệu tổng hợp toàn bộ quy tắc kinh tế, nạp tiền, thưởng, rút tiền, quy đổi và voucher **đang được triển khai thực tế trong backend**, đối chiếu theo các file nguồn. Đây là bản mô tả hiện trạng, không phải đề xuất.
>
> Nguồn chính: `server/config/index.js`, `server/services/ledgerService.js`, `server/services/pricingService.js`, `server/services/voucherService.js`, `server/controllers/walletController.js`, `server/controllers/surveyController.js`, `server/controllers/adminController.js`.

---

## 1. MÔ HÌNH TIỀN TỆ: 2 LOẠI TIỀN ĐỘC LẬP

| Loại tiền | Trường DB | Nguồn sinh ra | Được dùng để | Được rút tiền mặt? |
| :--- | :--- | :--- | :--- | :--- |
| **Credit tạo form** | `credit_balance` (đơn vị VNĐ nội bộ) | Nạp tiền thật + bonus nạp + đổi từ Điểm | Ký quỹ xuất bản khảo sát, tài trợ voucher, phí ghim | ❌ Không bao giờ |
| **Điểm rút tiền** | `point_balance` (1 Điểm = 10 VNĐ) | Thưởng làm bài hợp lệ, điểm an ủi screen-out | Rút tiền/thẻ cào, đổi voucher, đổi sang Credit | ✅ Đúng loại này mới được rút |

**Quy tắc chuyển đổi ("van một chiều"):**

| Chiều đổi | Tỷ giá | Trạng thái |
| :--- | :--- | :--- |
| Credit → Điểm | — | ❌ CẤM tuyệt đối, không tồn tại endpoint |
| Credit → Tiền mặt | — | ❌ CẤM tuyệt đối |
| Điểm → Credit | 1 Điểm = 7 VNĐ Credit (nhận 70% giá trị, sàn thu 30%) | ✅ Cho phép (tối thiểu 1.000 điểm, tối đa 10.000.000 điểm/lần) |
| Điểm → Tiền mặt / Voucher | 1 Điểm = 10 VNĐ | ✅ Cho phép (theo ngưỡng và phí tại Mục 5) |

Nguồn: `ledgerService.js:570` (swapPointsToCredit), `config/index.js:20-27`.

---

## 2. NẠP TIỀN (CREATOR)

### 2.1. Hạn mức giao dịch
- Tối thiểu: **10.000 VNĐ** · Tối đa: **1.000.000.000 VNĐ** / lần (`walletController.js:54`).

### 2.2. Bậc thưởng nạp (Tiered Deposit Bonus) — 100% cộng vào Credit
Bậc đang chạy trong `ledgerService.js:31-65` (hàm `calculateDepositBonus`):

| Số tiền nạp | Bậc | Bonus Credit | Ví dụ |
| :--- | :--- | :---: | :--- |
| Dưới 100.000đ | Cơ bản | **0%** | Nạp 50K → nhận 50.000đ Credit |
| 100.000đ – 499.000đ | Đồng (Bronze) | **+2%** | Nạp 100K → nhận 102.000đ Credit |
| 500.000đ – 999.000đ | Bạc (Silver) | **+4%** | Nạp 500K → nhận 520.000đ Credit |
| 1.000.000đ – 1.999.000đ | Doanh Nghiệp Vàng | **+6%** | Nạp 1M → nhận 1.060.000đ Credit |
| 2.000.000đ – 4.999.000đ | Doanh Nghiệp Bạch Kim | **+8%** | Nạp 2M → nhận 2.160.000đ Credit |
| 5.000.000đ – 9.990.000đ | Doanh Nghiệp Kim Cương | **+10%** | Nạp 5M → nhận 5.500.000đ Credit |
| Từ 10.000.000đ trở lên | Doanh Nghiệp Đối Tác | **+12%** | Nạp 10M → nhận 11.200.000đ Credit |

- Bonus làm tròn sàn (`floor`), ghi nhận thành dòng sổ cái riêng (`DEPOSIT_CREDIT`) kèm mô tả bậc.
- `point_balance` luôn giữ nguyên 0 khi nạp.

### 2.3. Đặc quyền đi kèm theo số nạp (Enterprise Perks — `ledgerService.js:72-106`)

| Số tiền nạp | Vé Gom Mẫu Hỏa Tốc | Hạng | Quyền lợi |
| :--- | :---: | :--- | :--- |
| ≥ 1.000.000đ | +2 vé | Doanh Nghiệp Vàng | Ghim Top + Push App + Email + Hóa đơn VAT |
| ≥ 2.000.000đ | +4 vé | Doanh Nghiệp Bạch Kim | Như trên |
| ≥ 5.000.000đ | +10 vé | Doanh Nghiệp Kim Cương | Như trên + `has_vip_enterprise = 1` |
| ≥ 10.000.000đ | +20 vé | Doanh Nghiệp Đối Tác | Như trên |

- Xuất hóa đơn điện tử VAT: eligible cho **mọi** khoản nạp (`vatInvoiceEligible = true`).

---

## 3. ĐỊNH GIÁ KHẢO SÁT (CPI ENGINE)

### 3.1. Công thức chuẩn (`pricingService.js:75-189`)
```
CPI (Creator trả / phiếu) = [(700đ × LOI) / (1 − Take Rate)] × M_IR + Phí lọc sâu
Thưởng đáp viên / phiếu   = floor(700đ × LOI × M_IR / 10) Điểm
Escrow toàn chiến dịch    = CPI × Số mẫu mục tiêu (+ Phí gói AI nếu chọn)
```
- Bảo toàn dòng tiền: `CPI = Giá trị điểm thưởng quy VNĐ + Lợi nhuận sàn/phiếu` (không sai 1 đồng).

### 3.2. Tham số kinh tế (`config/index.js:38-58`)

| Tham số | Giá trị | Ghi chú |
| :--- | :--- | :--- |
| `BASE_PAYOUT_PER_MINUTE_VND` | **700đ/phút** | Thù lao cơ sở đáp viên (~42.000đ/giờ) |
| Take Rate ngắn (LOI ≤ 3 phút) | **50%** | |
| Take Rate tiêu chuẩn (LOI ≤ 10 phút) | **40%** | Chủ lực |
| Take Rate chuyên sâu (LOI > 10 phút) | **35%** | |
| Hệ số độ hiếm tệp M_IR | Đại chúng 1.0x · Trung bình 1.35x · Khó 1.8x · Cực hiếm 2.5x | IR 70-100% / 30-69% / 10-29% / <10% |
| Phí lọc sâu nhân khẩu học | **1.000đ / tiêu chí / phiếu** | |
| Phụ phí gói hỏa tốc 6h | **+25%** tổng dự án | |
| Gói Báo cáo AI Insights & SPSS | **+500.000đ / dự án** | |

### 3.3. Thời lượng LOI ước tính theo loại câu hỏi

| Loại câu hỏi | Giây/câu |
| :--- | :---: |
| Trắc nghiệm đơn / Hộp kiểm | 17 |
| Dropdown / Nhập số / Chọn ngày | 15 |
| Thang đo Likert | 20 |
| Đánh giá sao (Rating) | 12 |
| Tự luận mở | 45 |

- Thời lượng tối thiểu 1 phút, làm tròn 1 chữ số thập phân (`pricingService.js:9-40`).
- Cột trọng số câu hỏi cũ (`QUESTION_WEIGHTS`, cơ sở 500đ/trọng số) vẫn còn trong config nhưng **không còn dùng để tính tiền** — chi phí thực tế tính theo LOI.

---

## 4. KÝ QUỸ ESCROW & GÓI DÙNG THỬ

### 4.1. Ký quỹ xuất bản (`ledgerService.js:192-280`)
- Khi xuất bản khảo sát: trừ **100% ngân sách** (`CPI × số mẫu`) khỏi `credit_balance` creator (nguyên tử, điều kiện `credit_balance >= escrow`), chuyển khảo sát `DRAFT → ACTIVE`, tiền nằm trong `escrow_locked_balance`.
- Đóng khảo sát sớm/hoàn tất: quỹ dư **hoàn về ví Credit của creator** (`refundRemainingEscrow`, `ledgerService.js:361-425`).

### 4.2. Gói dùng thử miễn phí (First Survey Free Trial)
- Mỗi tài khoản **1 lượt** (`free_trial_surveys_available` mặc định 1), tối đa **25 mẫu/bài**.
- Sàn tài trợ toàn bộ quỹ escrow (trị giá ~50.000đ), creator xuất bản với chi phí 0đ.
- Điều kiện kích hoạt: tài khoản đã xác thực (Google liên kết hoặc email OTP).
- Khi đóng bài dùng thử: quỹ tài trợ dư **thu hồi về sàn**, KHÔNG hoàn vào ví creator (chống trục lợi).
- Nguồn: `ledgerService.js:206-239`, `surveyController.js:562-583`.

### 4.3. Chi phí mẫu theo reward mode
- `POINTS_ONLY` / mặc định: tính CPI đầy đủ như Mục 3.
- `VOUCHER_ONLY` (Zero Cash): `cost_per_response = 0`, điểm thưởng = 0, escrow = 0 — creator chỉ bỏ mã voucher (`surveyController.js:317-319`).

---

## 5. THƯỞNG ĐÁP VIÊN & RÚT TIỀN

### 5.1. Cộng điểm
| Kết quả làm bài | Điều nhận | Ghi chú |
| :--- | :--- | :--- |
| Hoàn thành VALIDATED | `reward_points_per_response` (tính từ CPI engine) | +0.5 Trust Score |
| Bị loại ở câu sàng lọc (screen-out) | **+20 điểm an ủi** | +0.1 Trust Score (`surveyController.js:1268`) |
| REJECTED_FRAUD (gian lận) | 0 điểm | Không được làm lại bài đã phạm |
| FLAGGED_MANUAL | Chờ duyệt thủ công | Điểm được trả khi duyệt qua luồng thưởng |

- Chống cộng điểm kép: UPDATE có điều kiện `status != 'VALIDATED' OR points_rewarded = 0`; chống vượt mẫu: điều kiện `collected_responses < target_responses` (`ledgerService.js:287-356`).

### 5.2. Ngưỡng rút tiền
| Ngưỡng | Giá trị | Điều kiện áp dụng |
| :--- | :--- | :--- |
| Phá băng lần đầu | **1.000 điểm = 10.000đ** | Chỉ khi chưa từng rút thành công (không tính lệnh bị từ chối) và chọn **thẻ cào** |
| Tiêu chuẩn | **5.000 điểm = 50.000đ** | Mọi trường hợp khác |
| Tối đa | 10.000.000 điểm / lần | |

### 5.3. Phí rút tiền
| Kênh | Phí |
| :--- | :--- |
| Thẻ cào / Topup điện thoại | **0đ** (miễn phí 100%) |
| Chuyển khoản ngân hàng / MoMo, khoản < 100.000đ | **2.000đ** |
| Chuyển khoản ngân hàng / MoMo, khoản ≥ 100.000đ | **0đ** (miễn phí) |
| Đổi voucher thương hiệu | **0đ** (1 điểm = 10đ đúng mệnh giá) |

### 5.4. Điều kiện & quy trình
- Điều kiện: tài khoản `ACTIVE` + **Trust Score ≥ 60/100** (`ledgerService.js:476`).
- Quy trình: trừ điểm nguyên tử ngay khi tạo yêu cầu (chống double-spend) → trạng thái `PENDING` → Admin duyệt:
  - Duyệt → `COMPLETED`, giải ngân `net = điểm × 10đ − phí`.
  - Từ chối → hoàn **100% điểm** về ví + ghi sổ cái `PAYOUT_REFUND`.

---

## 6. VOUCHER

### 6.1. Catalog nền tảng (đổi bằng điểm, 1 điểm = 10đ)
| Thương hiệu | Mệnh giá | Giá điểm | Tồn kho khởi tạo |
| :--- | :---: | :---: | :---: |
| Shopee | 50.000đ | 5.000 điểm | 30 mã |
| Grab (GrabFood/GrabBike) | 30.000đ | 3.000 điểm | 30 mã |
| Highlands Coffee | 50.000đ | 5.000 điểm | 30 mã |
| Phúc Long | 30.000đ | 3.000 điểm | 30 mã |
| CGV Cinemas | 100.000đ | 10.000 điểm | 20 mã |
| Starbucks | 100.000đ | 10.000 điểm | 20 mã |

- Cơ chế nguồn cung: khi catalog hết mã, hệ thống **tự động in bổ sung 25 mã** mới cho chiến dịch đó (`voucherService.js:500-522`); nếu vẫn thiếu còn chèn thêm lẻ 1 mã tức thì (`voucherService.js:541-552`). Chi phí mệnh giá này do **sàn chịu khi đáp viên đổi**.

### 6.2. Voucher tài trợ của Creator (Zero Cash Model)
- Creator tự nạp danh sách mã thật của mình, `points_cost = 0`, không tốn Credit.
- Cấp phát nguyên tử: mỗi mã chỉ 1 chủ; mỗi bài làm chỉ 1 mã; mỗi user 1 mã/khảo sát (kiểm tra kép + unique index + fallback khi trùng race).
- Gắn voucher vào khảo sát tự nâng `reward_mode` → `HYBRID_POINTS_AND_VOUCHER`.
- Respondent chỉ thấy mã của chính mình sau khi nộp bài hợp lệ (zero leakage).

---

## 7. PHÍ DỊCH VỤ KHÁC CỦA CREATOR

| Dịch vụ | Giá | Nguồn |
| :--- | :--- | :--- |
| Ghim khảo sát VIP đầu trang | **1 vé Hỏa Tốc** hoặc **50.000đ Credit** (Admin miễn phí) | `surveyController.js:1344-1410` |
| Gom Mẫu Hỏa Tốc (ghim + push APK + email) | Trừ 1 vé `fast_track_tickets` | `surveyController.js:604-641` |
| Vé Hỏa Tốc chỉ có được qua | Tặng theo mốc nạp ≥ 1M (Mục 2.3) hoặc lượt ghim tặng khi nạp | |

---

## 8. CHỐT CHẶN CHỐNG GIAN LẬN LIÊN QUAN TIỀN (`config/index.js:62-72`)

| Ngưỡng | Giá trị | Hệ quả |
| :--- | :--- | :--- |
| Tốc độ đọc tối đa | 5 từ/giây | Phát hiện speeder |
| Thời gian tối thiểu / lựa chọn | 0.5s (trắc nghiệm), 8s (tự luận) | |
| Quality Score tự chấp nhận | ≥ 0.8 | Nhận điểm ngay |
| Quality Score kiểm duyệt tay | 0.5 – 0.8 | FLAGGED_MANUAL |
| Trust Score tối thiểu để rút tiền | **60/100** | Chặn requestPayout |
| Trust Score bị khóa tài khoản | < 40 | BAN |

- Kèm theo: bẫy attention check (che đáp án khỏi client), anti multi-account theo IP/fingerprint (≥3 tài khoản → cảnh báo admin; ≥5 → ban IP + tài khoản, loại trừ localhost và ADMIN), lọc trùng URL form đã chuẩn hóa.

---

## 9. BÁO CÁO KINH TẾ ADMIN (`adminController.js:7-95`)

Chỉ số nền tảng tính trực tiếp từ DB:

| Chỉ số | Công thức |
| :--- | :--- |
| Doanh thu Creator (GMV) | Σ (`collected_responses` × `cost_per_response`) |
| Điểm đã phát ra (VNĐ hóa) | Σ (`points_rewarded` × 10) của bài VALIDATED |
| Lợi nhuận gộp chênh lệch | GMV − Điểm đã phát |
| Phí rút thu được | Σ `fee_vnd` của payout COMPLETED |
| Tổng lợi nhuận nền tảng | Chênh lệch + Phí rút |
| Take rate thực tế | Lợi nhuận gộp / GMV (đối chiếu mục tiêu 40%) |
| Nợ tiềm tàng chưa hiện thực | Σ `point_balance` toàn hệ thống × 10đ |

---

## 10. GHI CHÚ ĐỐI CHIẾU: KẾ HOẠCH vs CODE (HIỆN TRẠNG, KHÔNG ĐÁNH GIÁ)

| Hạng mục | Kế hoạch (`KE_HOACH_TONG_THE.md`) | Code đang chạy |
| :--- | :--- | :--- |
| Bậc thưởng nạp | +3% / +5% / +8% / +12% / +15% (5 bậc, MỤC 7) | **+2% / +4% / +6% / +8% / +10% / +12%** (6 bậc, v2.7) |
| Giao diện modal nạp | — | `public/app.js:3744` vẫn hiển thị bảng cũ 3%–15% (preset 100K +3%, 1Tr +8%, 5Tr +15% VIP) |
| Điểm an ủi screen-out | 15 điểm (MỤC 11) | **20 điểm** |
| Điểm chờ duyệt 24h (Pending) | Có (MỤC 9.1) | Chưa triển khai — điểm VALIDATED vào `point_balance` ngay |
| Hạn dùng điểm 12 tháng / thu hồi ngủ đông 90 ngày | Có (MỤC 11) | Chưa triển khai |
| Daily Pulse +5 điểm/ngày, streak 7 ngày +10% | Có (MỤC 11) | Chưa triển khai |
| Hạng thành viên đáp viên (Bạc +5%, Vàng +12% điểm, rút <5 phút) | Có (MỤC 11) | Chưa triển khai (chỉ có Trust Score) |
| Tỷ lệ dự trữ thanh khoản 75% | Có (MỤC 11) | Chưa triển khai (chỉ báo cáo nợ tiềm tàng) |

---
*Tài liệu xuất ngày 2026-10-24, phản ánh trạng thái git `main` commit `6fcb025` (v3.5.16).*
