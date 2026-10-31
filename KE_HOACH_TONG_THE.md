# KẾ HOẠCH TỔNG THỂ THỐNG NHẤT: KINH TẾ HỌC 1:1 VNĐ, BA PHÂN KHÚC TÀI KHOẢN, HỒ SƠ & CHỐNG GIAN LẬN

Tài liệu này là nguồn quy chiếu duy nhất (Single Source of Truth) hợp nhất toàn bộ các quyết định về mô hình tiền tệ 1:1 VNĐ, bảng giá 3 phân khúc (Sinh viên - Cá nhân - Doanh nghiệp), mốc nạp/rút, ưu đãi thương mại, hồ sơ người dùng, câu hỏi sàng lọc thích ứng và hệ thống chống gian lận trên **01 nền tảng thống nhất**.

---

## PHẦN I: HỆ THỐNG TIỀN TỆ & BẢNG GIÁ 3 PHÂN KHÚC

### 1. Quy chuẩn Đơn vị Tiền tệ (Đồng nhất 1:1 VNĐ & Khóa Van Một Chiều)

Toàn bộ hệ thống áp dụng tỷ giá chuẩn **1:1 theo VNĐ** (lưu trữ số nguyên `INTEGER`), tách biệt thành 2 ngăn ví độc lập trên sổ cái kế toán kép (Double-Entry Ledger ACID):

| Loại Ví | Trường dữ liệu DB | Tỷ giá chuẩn | Nguồn thu vào | Mục đích sử dụng & Ràng buộc bảo mật |
| :--- | :--- | :--- | :--- | :--- |
| **Ví Tiền Thưởng** | `point_balance` | **`1 Point = 1 VNĐ`** | Nhận được khi hoàn thành bài khảo sát hợp lệ (`VALIDATED`). | - Rút tiền mặt (Ngân hàng VietQR / MoMo).<br>- Đổi Thẻ cào điện thoại / E-Voucher.<br>- Đổi sang `Credit` để đăng khảo sát (nhận thưởng +5%). |
| **Ví Tạo Khảo Sát** | `credit_balance` | **`1 Credit = 1 VNĐ`** | - Nạp tiền mặt (VietQR / Chuyển khoản).<br>- Thưởng nạp theo mốc (2% - 10%).<br>- Đổi từ `Point` sang `Credit`. | - Khóa quỹ ký quỹ (`Escrow`) để tạo khảo sát.<br>- Thanh toán phí Ghim VIP, mua Voucher từ Kho Sàn và phụ phí lọc đối tượng.<br>- **Khóa van 1 chiều**: Tuyệt đối không rút ra tiền mặt và không đổi ngược sang `Point`. |

---

### 2. Mô Hình Định Giá 2 Tầng: Giá Sàn Tối Thiểu + Đề Xuất Thông Minh + Tự Do Tăng Thêm (Floor Price + Creator Boost)

Xóa bỏ công thức tính lẻ từng giây cũ và tránh cả 2 thái cực (cố định cứng nhắc hoặc thả nổi phá giá). Hệ thống áp dụng **Mô hình Định giá 2 Tầng**: Quy định **Mức Giá Sàn Tối Thiểu ($P_{\text{sàn}}$)** theo 3 phân khúc & 3 độ dài bảng hỏi để bảo vệ công sức người điền và đảm bảo sàn luôn có lãi cơ sở; đồng thời cho phép người tạo **chọn Mức Đề Xuất hoặc Tự Do Tăng Thêm ($\Delta P$)** để gom mẫu nhanh với tỷ lệ chia sẻ minh bạch, không tham lam.

#### A. Bảng Giá Sàn Tối Thiểu ($P_{\text{sàn}}$) Cho 3 Phân Khúc

| Phân khúc Tài khoản | Độ dài Bảng hỏi | Giá Sàn Tối Thiểu ($P_{\text{sàn}}$) / 1 mẫu | Người điền nhận ở Mức Sàn ($R_{\text{sàn}}$) | Phí Sàn cơ sở ở Mức Sàn ($F_{\text{sàn}}$) | Phụ phí Bộ lọc Đối tượng & Auto-Screener | Đặc quyền & Giới hạn của Phân khúc |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. GÓI SINH VIÊN**<br>*(Đã điền đủ 100% Profile + Xác thực Email `.edu.vn` / `.ac.vn`)* | - Ngắn ($\le 10$ câu)<br>- Vừa ($11 - 25$ câu)<br>- Dài ($> 25$ câu) | - **400 Credit** (400đ)<br>- **500 Credit** (500đ)<br>- **600 Credit** (600đ) | - Có dùng lượt free: **280 / 360 / 430 Point**<br>- Không dùng lượt free: **350 / 450 / 540 Point** | **Luôn cố định 10% - 12%**<br>*(40đ - 60đ / mẫu — Đảm bảo sàn không bao giờ lỗ)* | - Phát đại trà: **0đ**<br>- Có bật Bộ lọc + Auto-Screener: **`+100đ / mẫu`** *(+50đ cho người điền, +50đ về sàn)* | - **Tặng 30 lượt miễn phí / tháng** khi hoàn thiện 100% Profile + xác thực `.edu.vn` (Làm mới ngày 01 đầu tháng, không cộng dồn; cứ đăng 50 mẫu được trừ tối đa 10 lượt).<br>- Giới hạn tối đa **300 mẫu / bài** (Đáp ứng chuẩn cỡ mẫu SPSS/SmartPLS 250-300 phiếu; tối đa 3 bài/học kỳ). |
| **2. GÓI CÁ NHÂN (NGƯỜI THƯỜNG)**<br>*(Tài khoản phổ thông)* | - Ngắn ($\le 10$ câu)<br>- Vừa ($11 - 25$ câu)<br>- Dài ($> 25$ câu) | - **800 Credit** (800đ)<br>- **1.000 Credit** (1.000đ)<br>- **1.200 Credit** (1.200đ) | - Có dùng 25 lượt free bài đầu: Chia theo số Credit thực nạp<br>- Chuẩn không dùng free: **600 / 750 / 900 Point** | **25%**<br>*(200đ - 300đ / mẫu)* | - Phát đại trà: **0đ**<br>- Có bật Bộ lọc + Auto-Screener: **`+200đ / mẫu`** *(+150đ cho người điền, +50đ về sàn)* | - **Tặng 25 lượt điền form miễn phí đầu tay** ngay khi hoàn thiện 100% thông tin cá nhân trong Profile (Áp dụng 1 lần duy nhất cho bài đầu tiên từ 50 mẫu trở lên).<br>- Giới hạn tối đa **500 mẫu / bài**. |
| **3. GÓI DOANH NGHIỆP**<br>*(Công ty, Startup, Agency, Shop)* | - Ngắn ($\le 10$ câu)<br>- Vừa ($11 - 25$ câu)<br>- Dài ($> 25$ câu) | - **1.500 Credit** (1.500đ)<br>- **2.000 Credit** (2.000đ)<br>- **2.500 Credit** (2.500đ) | - **1.000 Point** (1.000đ)<br>- **1.300 Point** (1.300đ)<br>- **1.600 Point** (1.600đ) | **33% - 36% giá gốc**<br>*(500đ - 900đ / mẫu; hoặc 23,5% - 27,8% sau chiết khấu quy mô lớn)* | **Miễn phí 100%**<br>*(Đã bao gồm toàn bộ bộ lọc thương mại chuyên sâu & Auto-Screener)* | - **Không giới hạn số lượng mẫu** (tới 5.000+ mẫu).<br>- Hưởng trọn bộ **5 ưu đãi độc quyền Doanh nghiệp**.<br>- Hỗ trợ xuất Hóa đơn đỏ VAT 100%. |

#### B. Ba Nấc Giá Đề Xuất Theo Tốc Độ Gom Mẫu (Smart Pricing Tiers) & Tự Do Tăng Thưởng (Creator Boost)

Trên cột cài đặt giá bên phải của trình tạo form, hệ thống cung cấp **3 nấc lựa chọn trực quan gắn liền với Thời gian gom mẫu ước tính (SLA)** kèm ô nhập / thanh trượt để người tạo tự do điều chỉnh mức giá $P_{\text{thực trả}} \ge P_{\text{sàn}}$:

| Nấc Lựa Chọn | Công thức Mức Giá Đề Xuất | Thời Gian Gom Mẫu Ước Tính (SLA) | Nhãn Hiển Thị Trên Thẻ Khảo Sát | Đối Tượng Khuyên Dùng |
| :--- | :--- | :--- | :--- | :--- |
| **1. Mức Sàn Tiết Kiệm (Minimum Floor)** | $$P = P_{\text{sàn}}$$ | **3 – 5 ngày** | Hiển thị mức thưởng chuẩn | Sinh viên làm đề tài dài hạn, người không gấp về tiến độ, tối ưu ngân sách tối đa. |
| **2. Mức Đề Xuất Tiêu Chuẩn (Recommended)** | $$P = P_{\text{sàn}} + 25\%$$<br>*(VD Form Vừa: SV `625đ`, Cá nhân `1.250đ`, DN `2.500đ`)* | **24 – 48 giờ** | Huy hiệu **`[Đề Xuất]`** | Mặc định khuyên dùng (70% người tạo lựa chọn) để cân bằng hoàn hảo giữa chi phí và tốc độ thu mẫu. |
| **3. Mức Gom Hỏa Tốc (Rush / Custom Boost)** | $$P \ge P_{\text{sàn}} + 60\% \text{ đến } 100\%+$$<br>*(Hoặc tự nhập số tiền bất kỳ $> P_{\text{sàn}}$)* | **2 – 6 giờ** | Huy hiệu **`[Thưởng Cao]`** + Ưu tiên đẩy lên nhóm trên | Cần số liệu gấp trong ngày, bảng hỏi dài hoặc lọc đối tượng ngách khó tiếp cận. |

#### C. Công Thức Phân Chia Phần Tiền Tăng Thêm ($\Delta P = P_{\text{thực trả}} - P_{\text{sàn}}$) Văn Minh, Không Tham Lam

Khi người tạo trả mức giá cao hơn giá sàn ($\Delta P = P_{\text{thực trả}} - P_{\text{sàn}} > 0$), chi phí vận hành máy chủ của sàn cho 1 mẫu không đổi. Do đó, sàn **tuyệt đối không áp tỷ lệ cắt phí cao (25% - 36%) lên phần tiền tăng thêm**, mà nhường phần lớn số tiền tăng thêm này cho người điền để kích hoạt tốc độ làm bài:

1. **Tỷ lệ phân chia phần tiền tăng thêm ($\Delta P$)**:
   - **Với Gói Sinh Viên**: **Người điền nhận `85%`** của $\Delta P$ — **Sàn chỉ thu thêm `15%`** của $\Delta P$ ($\alpha = 0.85$).
   - **Với Gói Cá Nhân & Doanh Nghiệp**: **Người điền nhận `80%`** của $\Delta P$ — **Sàn chỉ thu thêm `20%`** của $\Delta P$ ($\alpha = 0.80$, tròn số dễ nhẩm và bù đắp chi phí cổng thanh toán, rút tiền miễn phí, thuế VAT).
2. **Công thức tổng quát trên mỗi mẫu khảo sát**:
   $$\text{Thù lao Người điền nhận} = R_{\text{sàn}} + \lfloor \alpha \times \Delta P \rfloor$$
   $$\text{Lợi nhuận Sàn thu} = F_{\text{sàn}} + \big(\Delta P - \lfloor \alpha \times \Delta P \rfloor\big)$$
3. **Ví dụ minh họa trực quan (Form Vừa 11 - 25 câu, Gói Cá Nhân, $P_{\text{sàn}} = 1.000\text{đ}$)**:
   - **Chọn Mức Sàn (`1.000đ`)**: Người điền nhận **`750đ`** — Sàn thu **`250đ`** *(Tỷ lệ sàn thu: 25%, đảm bảo sàn luôn lãi tối thiểu 250đ/mẫu)*.
   - **Chọn Mức Đề Xuất (`1.250đ`, tăng thêm $\Delta P = 250\text{đ}$)**: Người điền nhận $750\text{đ} + (80\% \times 250\text{đ}) = \mathbf{950\text{đ}}$ — Sàn thu $250\text{đ} + 50\text{đ} = \mathbf{300\text{đ}}$ *(Tỷ lệ sàn thu thực tế giảm xuống 24%, nhưng tiền lãi của sàn tăng từ 250đ lên 300đ)*.
   - **Tự chỉnh Mức Hỏa Tốc (`2.000đ`, tăng thêm $\Delta P = 1.000\text{đ}$)**: Người điền nhận $750\text{đ} + (80\% \times 1.000\text{đ}) = \mathbf{1.550\text{đ}}$ — Sàn thu $250\text{đ} + 200\text{đ} = \mathbf{450\text{đ}}$ *(Người điền nhận mức thưởng vọt lên hơn gấp đôi nên vào làm ngay lập tức; tiền lãi của sàn tăng từ 250đ lên 450đ mà tỷ lệ thu tổng chỉ còn 22,5%, rất hợp lý và thuyết phục người tạo)*.

#### Quy chuẩn Màu Nhận diện 3 Gói trên Giao diện (Tràn Viền `border: none` — Thích Ứng Light / Dark Mode)

Mỗi phân khúc tài khoản đại diện cho đúng 01 màu cốt lõi trong bộ 3 màu `Trắng Kem — Cam — Đen` của `DESIGN.md`, thiết kế **màu đặc tràn viền (`border: none`, bỏ hoàn toàn viền bao quanh)** và tự động thích ứng nền ở Light Mode (`#FFFFFF`) và Dark Mode (`#09090B`) để không bao giờ bị chìm nền:

| Phân khúc Gói | Màu Cốt Lõi Đại Diện | Nền Tràn Viền ở Light Mode (`border: none`) | Nền Tràn Viền ở Dark Mode (`border: none`) | Màu Chữ & Nhãn Ghi Rõ Trên UI |
| :--- | :--- | :--- | :--- | :--- |
| **1. GÓI SINH VIÊN**<br>*(Student `.edu.vn`)* | **Tông TRẮNG KEM SỨ**<br>*(Academic Cream)* | **Nền Kem Cam Sứ `#FFF7ED`** (`orange-50`) tràn viền + `shadow-sm` nhẹ (nổi rõ trên nền trang trắng `#FFFFFF` mà không cần viền). | **Nền Trắng Sứ `#FAFAFA` / `#FFF7ED`** tràn viền (tương phản rõ trên nền trang đen `#09090B`). | - **Chữ chính**: Đen đậm `#09090B`.<br>- **Điểm nhấn số liệu**: Cam đậm `#C2410C`.<br>- **Nhãn hiển thị**: **`GÓI SINH VIÊN (.EDU.VN)`** |
| **2. GÓI CÁ NHÂN**<br>*(Người dùng thường)* | **Tông CAM VIBE**<br>*(Signature Orange)* | **Nền Cam `#EA580C`** (`#F97316 -> #EA580C`) tràn viền 100%. | **Nền Cam `#EA580C`** (`#F97316 -> #EA580C`) tràn viền 100%. | - **Chữ & Số liệu**: Trắng tinh khiết `#FFFFFF`.<br>- **Nhãn hiển thị**: **`GÓI CÁ NHÂN (NGƯỜI THƯỜNG)`** (Ghi rõ trực tiếp trên phần màu cam hiện tại). |
| **3. GÓI DOANH NGHIỆP**<br>*(Enterprise / VIP)* | **Tông ĐEN OBSIDIAN**<br>*(Black / Graphite Card)* | **Nền Đen Obsidian `#09090B`** tràn viền 100% (tương phản tuyệt đối trên nền trang trắng `#FFFFFF`). | **Nền Than Chì Graphite `#27272A`** (`zinc-800`) tràn viền 100% (sáng hơn nền trang `#09090B` nên tách khối rõ nét mà không cần viền). | - **Chữ chính**: Trắng sáng `#FAFAFA`.<br>- **Điểm nhấn số liệu**: Cam sáng `#F97316`.<br>- **Nhãn hiển thị**: **`GÓI DOANH NGHIỆP`** |

---

### 3. Bảng Thành Tiền Thực Trả Theo Quy Mô Mẫu (Ví dụ Form Tiêu Chuẩn 11 - 25 câu)

| Quy mô mẫu | 1. Sinh Viên thực trả<br>*(Đơn giá 500đ - Đã trừ lượt free tháng)* | 2. Cá Nhân thực trả<br>*(Đơn giá 1.000đ - Bài đầu / Bài sau)* | 3. Doanh Nghiệp thực trả<br>*(Đơn giá 2.000đ - Đã gồm lọc sâu & chiết khấu)* |
| :--- | :--- | :--- | :--- |
| **50 mẫu** | - Đại trà: **20.000đ** *(Trừ 10 lượt free, trả 40 mẫu - Đáp viên nhận 18k, Sàn thu 2k)*<br>- Có lọc (+100đ/mẫu): **25.000đ** | - Bài đầu (trừ 25 lượt): **25.000đ**<br>- Bài sau: **50.000đ** *(Đáp viên nhận 37,5k, Sàn thu 12,5k)* | **100.000 VNĐ**<br>*(Đáp viên nhận 65k - Sàn thu 35k)* |
| **100 mẫu** | - Đại trà: **40.000đ** *(Trừ 20 lượt free, trả 80 mẫu - Đáp viên nhận 36k, Sàn thu 4k)*<br>- Có lọc (+100đ/mẫu): **50.000đ** | - Bài đầu (trừ 25 lượt): **75.000đ**<br>- Bài sau: **100.000đ** *(Đáp viên nhận 75k, Sàn thu 25k)* | **200.000 VNĐ**<br>*(Tặng kèm Đẩy Email & Push APK trị giá 40k)* |
| **150 mẫu** | - Đại trà: **60.000đ** *(Trừ 30 lượt free, trả 120 mẫu - Đáp viên nhận 54k, Sàn thu 6k)*<br>- Có lọc (+100đ/mẫu): **75.000đ** | **150.000 VNĐ**<br>*(Đáp viên nhận 112,5k - Sàn thu 37,5k)* | **300.000 VNĐ**<br>*(Tặng kèm Đẩy Email & Push APK)* |
| **200 mẫu** | - Đại trà: **85.000đ** *(Trừ 30 lượt free, trả 170 mẫu - Đáp viên nhận 76k, Sàn thu 9k)*<br>- Có lọc (+100đ/mẫu): **105.000đ** | **200.000 VNĐ**<br>*(Đáp viên nhận 150k - Sàn thu 50k)* | **400.000 VNĐ**<br>*(Tặng kèm Đẩy Email & Push APK)* |
| **300 mẫu**<br>*(Chuẩn khóa luận SPSS)* | - Đại trà: **135.000đ** *(Trừ 30 lượt free, trả 270 mẫu - Đáp viên nhận 121,5k, Sàn thu 13,5k)*<br>- Có lọc (+100đ/mẫu): **165.000đ** | **300.000 VNĐ**<br>*(Đáp viên nhận 225k - Sàn thu 75k)* | **540.000 VNĐ** *(Đã giảm 10% từ 600k + Tặng Đẩy thông báo)* |
| **500 mẫu** | *(Chỉ mở ở Gói Cá Nhân & Doanh Nghiệp)* | **500.000 VNĐ**<br>*(Đáp viên nhận 375k - Sàn thu 125k)* | **850.000 VNĐ** *(Đã giảm 15% từ 1.000k + Tặng Ghim VIP + Đẩy thông báo)* |

*Ba chốt chặn Toán học chống lỗ tuyệt đối cho Sàn (Bảo toàn tối thiểu 10% phí duy trì)*:
1. **Công thức tự động điều chỉnh Thù lao Đáp viên theo số tiền thực thu (`Escrow Thực Nạp`)**:
   - Hệ thống luôn tính thù lao trả cho mỗi đáp viên dựa trên **Tổng số Credit thực thu của đơn hàng sau khi đã trừ lượt miễn phí**, theo công thức bất biến:
     $$\text{Thù lao 1 Đáp viên} = \left\lfloor \frac{\text{Tổng Credit Thực Thu} \times (1 - \text{Take Rate})}{\text{Tổng Số Mẫu Đăng Ký}} \right\rfloor$$
   - *Ví dụ kiểm chứng (Form vừa 500đ/mẫu, quy mô 50 mẫu)*:
     - Sinh viên được trừ 10 lượt free -> Thực trả 40 mẫu = **`20.000 Credit`** (trung bình `400đ/mẫu`).
     - Sàn trích trước **10% phí duy trì (`2.000đ`)**, quỹ trả thưởng còn lại **`18.000đ`** chia đều cho 50 đáp viên -> Mỗi đáp viên nhận chính xác **`360 Point (360đ)`** (chứ không trả 450đ). Nhờ đó **Sàn luôn chắc chắn lãi `+2.000đ` (10%)**, tuyệt đối không bao giờ xảy ra hiện tượng lấy tiền túi của sàn bù cho 10 lượt free.
2. **Gộp thưởng hoàn thiện 100% Profile trực tiếp vào Định mức Lượt điền form miễn phí (Xóa bỏ `+5.000 Credit` lẻ tẻ)**:
   - Người dùng bắt buộc phải **hoàn thiện 100% thông tin cá nhân trong Profile** mới mở khóa được **25 lượt điền form miễn phí đầu tay** (Gói Cá Nhân, áp dụng cho đơn từ 50 mẫu trở lên) hoặc **30 lượt miễn phí / tháng** (Gói Sinh Viên sau khi xác thực thêm email `.edu.vn`).
   - Nhờ gộp thẳng vào lượt điền form miễn phí và bỏ khoản `+5.000 Credit` phụ, hệ thống hoàn toàn không bao giờ xảy ra hiện tượng cộng dồn 2 khuyến mãi gây lỗ trên cùng một đơn hàng. Số tiền thực thu của gói 50 mẫu Sinh viên luôn đạt tối thiểu **`20.000đ / 50 mẫu`** (lớn hơn `18.000đ` trả cho người điền).
3. **Cơ chế "Điền Chéo An Toàn" (Nhận `Credit` tạo form thay vì `Point` tiền mặt — Không hoàn tiền ngược)**:
   - Khi một sinh viên làm xong bài khảo sát, nếu chọn nhận thưởng dưới dạng **Ngân sách tạo khảo sát (`Credit` - Điền chéo)** thay vì tiền mặt (`Point`), hệ thống cộng thêm **+5% giá trị vào `credit_balance`** (ví dụ thay vì nhận `360 Point` tiền mặt thì nhận `378 Credit` tạo khảo sát).
   - Tuyệt đối **không hoàn trả lại tiền cho chủ form cũ** (vì chủ form đã nhận được mẫu thật) và **không cấp lượt miễn phí vượt quá số tiền thực thu**. Cách này giúp tổng chi phí của Sàn (`378 Credit` không rút được tiền mặt) vẫn luôn thấp hơn số tiền thu vào (`400đ`), đảm bảo **Sàn luôn giữ vững biên lợi nhuận duy trì từ 10% trở lên ở cả 2 chiều**.
4. **Chống nhóm sinh viên gom lượt free cho cùng 1 đề tài**:
   - Hệ thống kiểm tra chống trùng lặp `form_url` / cấu trúc câu hỏi: **Mỗi đề tài khảo sát chỉ được áp dụng định mức trợ giá tối đa 30 lượt miễn phí 1 lần duy nhất** (cứ đăng 50 mẫu được trừ 10 lượt, tối đa trừ 30 lượt cho đơn từ 150 mẫu trở lên).

---

### 4. Bảng Mốc Nạp Tiền Mới (Mở rộng từ 20.000đ đến 5.000.000đ+)

Hạ mức nạp tối thiểu từ `50.000đ` xuống **`20.000 VNĐ`** để sinh viên có thể nạp đúng số tiền mua gói 50 mẫu (`20.000đ`) hoặc 100 mẫu (`40.000đ`) mà không bị ép nạp dư:

| Mốc Nạp (VNĐ) | Phân khúc phù hợp | Thưởng thêm Credit (%) | Số Credit cộng thêm | Tổng Credit nhận vào ví | Vé Ghim VIP tặng kèm | Hỗ trợ Hóa đơn VAT |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **20.000đ** | Sinh viên (Gói 50 mẫu) | **0%** | 0 Credit | **20.000 Credit** | 0 vé | Không |
| **50.000đ** | Sinh viên (Gói 100 mẫu) / Cá nhân | **+2%** | +1.000 Credit | **51.000 Credit** | 0 vé | Không |
| **100.000đ** | Cá nhân (Gói 100 mẫu) | **+3%** | +3.000 Credit | **103.000 Credit** | 0 vé | Không |
| **200.000đ** | Cá nhân / Nhóm NCKH | **+4%** | +8.000 Credit | **208.000 Credit** | **Tặng 01 Vé VIP** | Có (từ 200k) |
| **500.000đ** | Startup / SME nhỏ | **+5%** | +25.000 Credit | **525.000 Credit** | **Tặng 02 Vé VIP** | Có (Full VAT) |
| **1.000.000đ** | Doanh nghiệp Vàng | **+6%** | +60.000 Credit | **1.060.000 Credit** | **Tặng 04 Vé VIP** | Có (Full VAT) |
| **2.000.000đ** | Doanh nghiệp Bạch Kim | **+8%** | +160.000 Credit | **2.160.000 Credit** | **Tặng 08 Vé VIP** | Có (Full VAT) |
| **5.000.000đ+** | Doanh nghiệp Kim Cương | **+10%** | +500.000 Credit | **5.500.000 Credit** | **Tặng 20 Vé VIP** | Có (Full VAT) |

---

### 5. Bảng Phí Dịch Vụ Gia Tăng, Thưởng Hoàn Thiện Profile & Quy Đổi Nội Bộ

| Hạng mục | Mức áp dụng mới (Chuẩn 1:1 VNĐ) | Cơ chế bảo vệ & Chống thất thoát |
| :--- | :--- | :--- |
| **1. Thưởng hoàn thiện 100% Profile** | - **Gói Cá Nhân**: Mở khóa **25 lượt điền form miễn phí đầu tay** (Áp dụng 1 lần duy nhất cho bài đầu từ 50 mẫu trở lên).<br>- **Gói Sinh Viên (`.edu.vn`)**: Mở khóa **30 lượt miễn phí / tháng** (Trừ 10 lượt cho mỗi mốc 50 mẫu). | Bắt buộc điền đủ 100% thông tin cá nhân mới mở khóa lượt miễn phí; khóa chỉnh sửa các trường nhân khẩu học trong 90 ngày. |
| **2. Đổi từ `Point` sang `Credit`** | Đổi **1.000 Point** -> Nhận **1.050 Credit** (+5% thưởng tái đầu tư; tối thiểu 5.000 Point/lần) | Bỏ mức phạt -30% cũ khiến user không dám đổi; mức +5% thấp hơn biên phí sàn nên **không bao giờ gây lỗ**. |
| **3. Phí Ghim VIP + Push APK + Email** | - Có Vé Ghim VIP: **Trừ 01 vé (0đ)**<br>- Mua lẻ (Sinh viên): **15.000 Credit / bài**<br>- Mua lẻ (Cá nhân/DN): **40.000 Credit / bài** | Hợp nhất 3 quyền lợi vào `fast_track_tickets`: Ghim lên đầu trang (`is_pinned = 1`) + Bắn thông báo đẩy chỉ cho App Android APK + Gửi Email (Gmail/Brevo) cho người khớp Profile. |
| **4. Điểm khi bị loại ở câu hỏi lọc (`Screen-out`)** | **0 Point** (Chỉ cộng **+0.2 điểm uy tín `trust_score`**) | **Xóa bỏ việc tặng 200đ tiền mặt miễn phí** khi trả lời sai câu lọc để chặn đứng 100% bot cố tình trả lời sai nhằm cày tiền rút ruột sàn. |

---

### 6. Bảng Mốc Rút Tiền Mặt & Đổi E-Voucher (Từ Ví `point_balance`)

| Hình thức rút / đổi | Mệnh giá yêu cầu (`Point`) | Giá trị nhận (`VNĐ`) | Phí giao dịch | Điều kiện áp dụng |
| :--- | :--- | :--- | :--- | :--- |
| **Thẻ cào Phá băng (Lần đầu)** | **10.000 Point** | Thẻ cào **10.000 VNĐ** | **0đ (Miễn phí)** | Dành cho lần rút đầu tiên của tài khoản (`trust_score >= 60`). |
| **Thẻ cào Tiêu chuẩn** | **20.000 / 50.000 / 100.000 Point** | Thẻ cào **20k / 50k / 100k** | **0đ (Miễn phí)** | Không giới hạn số lần. |
| **E-Voucher Thương hiệu**<br>*(Grab, Shopee, Phúc Long, Highlands, CGV)* | - **30.000 Point**<br>- **50.000 Point**<br>- **100.000 Point** | - Voucher **30.000đ**<br>- Voucher **50.000đ**<br>- Voucher **100.000đ** | **0đ (Miễn phí)** | Cấp mã tự động tức thì trên màn hình. |
| **Chuyển khoản Ngân hàng / MoMo (Mốc nhỏ)** | **50.000 Point** | Nhận thực **48.000 VNĐ** | **2.000đ** *(Phí cổng)* | Chuyển khoản VietQR 24/7. |
| **Chuyển khoản Ngân hàng / MoMo (Mốc chuẩn)** | **100.000 / 200.000 / 500.000 Point** | Nhận đủ **100k / 200k / 500k** | **0đ (Miễn phí)** | Miễn phí chuyển khoản từ mốc 100.000đ trở lên. |

---

## PHẦN II: CHÍNH SÁCH TÀI KHOẢN DOANH NGHIỆP, VOUCHER TÀI TRỢ & 5 ƯU ĐÃI ĐỘC QUYỀN

### 1. Quy trình 2 Cấp độ Kích hoạt Tài khoản Doanh nghiệp (Trên cùng 1 Tài khoản)

Không bắt người dùng phải đăng xuất tạo tài khoản riêng. Mọi tài khoản đều có thể mở khóa phân khúc Doanh nghiệp trong mục **Hồ sơ Doanh nghiệp** theo 2 cấp độ linh hoạt:

| Cấp độ | Đối tượng phù hợp | Thông tin cần khai báo | Quy trình duyệt & Quyền lợi mở khóa |
| :--- | :--- | :--- | :--- |
| **Cấp độ 1: Hồ sơ Thương hiệu Cơ bản**<br>*(Dùng ngay lập tức)* | Startup, Chủ shop, Đội dự án, Agency, Nhóm nghiên cứu chưa có pháp nhân hoặc không cần lấy hóa đơn đỏ. | 1. Tên Thương hiệu / Tổ chức hiển thị.<br>2. Lĩnh vực hoạt động.<br>3. Link Website / Fanpage / Gian hàng (Tùy chọn).<br>4. Số điện thoại & Email liên hệ công việc. | - **Kích hoạt tự động tức thì (30 giây)**, không cần chờ duyệt.<br>- Mở khóa toàn bộ tính năng Gói Doanh Nghiệp (đăng không giới hạn mẫu, bộ lọc thương mại chuyên sâu, gắn Banner/Link, bảo hành 1 đổi 1, mua Voucher từ Kho của Sàn gắn vào khảo sát). |
| **Cấp độ 2: Định danh Pháp nhân & Thuế**<br>*(Dành cho Công ty cần VAT & Tự phát hành Voucher)* | Công ty TNHH, Công ty Cổ phần, Tổ chức/Viện nghiên cứu cần chứng từ kế toán hợp lệ. | 1. Tên pháp nhân đầy đủ theo GPKD.<br>2. Mã số thuế Doanh nghiệp (10 hoặc 13 số).<br>3. Địa chỉ trụ sở pháp lý.<br>4. Email nhận hóa đơn điện tử / Email tên miền công ty (hoặc ảnh chụp GPKD). | - Kiểm duyệt tự động định dạng MST + xác nhận Admin.<br>- Cấp huy hiệu **`[Doanh Nghiệp Đã Xác Thực]`** trên thẻ khảo sát.<br>- Tự động xuất **Hóa đơn đỏ VAT điện tử** cho các giao dịch nạp từ 200.000đ trở lên.<br>- Mở khóa quyền **Tự tải mã Voucher riêng của thương hiệu** (khi đạt thêm điều kiện uy tín lâu năm). |

---

### 2. Năm Ưu đãi Độc quyền Cân đối Giá trị cho Gói Doanh nghiệp

Để mức giá `1.500đ - 2.500đ/mẫu` hoàn toàn xứng đáng (rẻ hơn 10 - 15 lần so với thuê Agency truyền thống), Gói Doanh Nghiệp được tích hợp sẵn 5 đặc quyền:

1. **Bảo hành chất lượng dữ liệu "1 Đổi 1" (Free Replacement Guarantee)**:
   - Trong vòng **07 ngày** kể từ khi thu mẫu xong, nếu doanh nghiệp phát hiện bất kỳ phiếu trả lời nào kém chất lượng lọt qua hệ thống tự động, doanh nghiệp có quyền bấm **`[Yêu cầu đổi mẫu]`** (tối đa **15% tổng số mẫu** của đơn hàng). Hệ thống sẽ thu bù lại mẫu mới hoàn toàn miễn phí.
2. **Tặng sẵn Đẩy Thông báo Đa kênh (Email Gmail/Brevo & Push App APK)**:
   - Với mọi đơn hàng Doanh nghiệp từ **100 mẫu trở lên**, hệ thống **tặng miễn phí 100%** gói bắn Email trực tiếp và Push Notification trên App Android APK tới tệp người dùng khớp tiêu chí (tiết kiệm 40.000đ/bài).
3. **Miễn phí 100% Bộ lọc Thương mại Chuyên sâu (Commercial Deep-Targeting)**:
   - Mở khóa miễn phí các trường lọc nâng cao phục vụ nghiên cứu thị trường: **Nghề nghiệp, Mức thu nhập hàng tháng, Tình trạng hôn nhân, Khu vực sinh sống, Sở thích tiêu dùng** cùng tính năng Tự động sinh câu hỏi sàng lọc (Auto-Screener).
4. **Gắn Thương hiệu & Nút Kêu gọi Hành động (Brand Banner & CTA Link)**:
   - Cho phép đính kèm **Logo, Banner sản phẩm** và **Nút dẫn link trực tiếp về Website / Landing Page / Gian hàng Shopee** hoặc phát mã giảm giá ở màn hình cảm ơn sau khi người dùng nộp bài (vừa thu thập dữ liệu, vừa quảng bá thương hiệu miễn phí tới đúng khách hàng mục tiêu).
5. **Chiết khấu theo Quy mô mẫu lớn (Volume Discount)**:
   - Đơn hàng từ **100 - 299 mẫu**: Tặng miễn phí gói Đẩy thông báo Email & Push App APK.
   - Đơn hàng từ **300 - 499 mẫu**: **Giảm trực tiếp 10% tổng đơn giá** + Tặng Đẩy thông báo.
   - Đơn hàng từ **500 mẫu trở lên**: **Giảm trực tiếp 15% tổng đơn giá** + Tặng Ghim VIP đầu trang + Xuất báo cáo CSV/SPSS chuẩn hóa.

---

### 3. Cơ chế Doanh Nghiệp Tặng Kèm Voucher Khi Điền Khảo Sát & Chống Tạo Voucher Giả

Xóa bỏ hoàn toàn cơ chế đăng khảo sát `VOUCHER_ONLY` với chi phí `0đ` trong code cũ để chặn đứng việc tạo Voucher rác/ảo làm lỗ sàn. Hệ thống vận hành theo quy chuẩn **Thưởng Kép (`HYBRID`: Tiền mặt + Voucher)** và hỗ trợ cả trường hợp **Số lượng Voucher ít hơn Số lượng mẫu ($V \le N$)**:

#### A. Cách tính Đơn giá CPI & Giải ngân Thưởng khi Tặng kèm $V$ Voucher trên $N$ Mẫu ($V \le N$)
Doanh nghiệp có bao nhiêu mã Voucher thì được **Giảm trực tiếp 20% đơn giá CPI** trên đúng bấy nhiêu suất có kèm Voucher; các suất không có Voucher còn lại ($N - V$) tính theo đơn giá chuẩn và trả đủ `100%` tiền mặt cho người điền:

| Phân bổ suất trong khảo sát (Ví dụ Form Vừa 11 - 25 câu, cần $N = 100$ mẫu, nạp $V = 50$ Voucher) | Số lượng suất | Đơn giá Doanh nghiệp trả | Người điền nhận được | Phí Sàn thu (`Take Rate`) |
| :--- | :--- | :--- | :--- | :--- |
| **1. Suất CÓ kèm Voucher ($V$ suất)**<br>*(Được giảm 20% đơn giá CPI)* | **$V$ mẫu**<br>*(VD: 50 mẫu)* | **1.600 Credit / mẫu**<br>*(Ngắn: 1.200đ / Vừa: 1.600đ / Dài: 2.000đ)* | **`1.100 Point (1.100đ)` + `01 Mã Voucher`**<br>*(Ngắn: 800đ / Vừa: 1.100đ / Dài: 1.350đ)* | **500 Credit / mẫu** *(31,25%)*<br>*(Ngắn: 400đ / Vừa: 500đ / Dài: 650đ)* |
| **2. Suất KHÔNG có Voucher ($N - V$ suất)**<br>*(Tính theo đơn giá chuẩn 100%)* | **$N - V$ mẫu**<br>*(VD: 50 mẫu)* | **2.000 Credit / mẫu**<br>*(Ngắn: 1.500đ / Vừa: 2.000đ / Dài: 2.500đ)* | **`1.300 Point (1.300đ tiền mặt)`**<br>*(Cộng bù +200đ tiền mặt vì không có Voucher)* | **700 Credit / mẫu** *(35%)*<br>*(Ngắn: 500đ / Vừa: 700đ / Dài: 900đ)* |
| **Tổng ký quỹ đơn hàng ($\text{Total Escrow}$)** | **$N$ mẫu** | $$\text{Escrow} = (V \times \text{CPI}_{\text{voucher}}) + ((N - V) \times \text{CPI}_{\text{chuẩn}})$$ | Người có Voucher nhận tiền + quà; người hết Voucher nhận nhiều tiền mặt hơn (+200đ). | **Sàn luôn lãi từ 31,25% đến 35% trên mọi mẫu**. |

- **Hai chế độ phát Voucher khi $V < N$ (Doanh nghiệp tùy chọn khi tạo form)**:
  1. **Ai làm nhanh nhận trước (First-Come, First-Served - Mặc định)**: $V$ người hoàn thành hợp lệ đầu tiên nhận `1.100 Point + 01 Voucher` (thẻ khảo sát hiển thị bộ đếm `[Tặng kèm Voucher — Còn X/V mã]`). Khi phát hết $V$ mã, từ người thứ $V+1$ đến $N$ tự động nhận mức thưởng chuẩn `1.300 Point` tiền mặt.
  2. **Rút thăm ngẫu nhiên (Lucky Drop)**: Mỗi người hoàn thành có xác suất trúng Voucher bằng $\frac{\text{Số Voucher còn lại}}{\text{Số mẫu còn thiếu}}$. Nếu trúng nhận `1.100 Point + 01 Voucher`; nếu không trúng nhận ngay `1.300 Point` tiền mặt.
- **Trường hợp Khảo sát Thuần Voucher (`VOUCHER_ONLY` — Chỉ áp dụng cho Voucher mệnh giá $\ge 20.000\text{đ}$)**:
  - Bắt buộc số lượng Voucher $V = N$ và Doanh nghiệp phải trả **Phí Hạ Tầng & Phân Phối cố định cho Sàn**: **`400 Credit/mẫu`** (Form Ngắn), **`500 Credit/mẫu`** (Form Vừa), **`600 Credit/mẫu`** (Form Dài), đồng thời hiển thị công khai điều kiện áp dụng Voucher ngay ngoài thẻ khảo sát.

#### B. Chốt chặn Chống Tạo Voucher Giả: Chỉ Mở Cho Doanh Nghiệp Đã Xác Minh & Uy Tín Lâu Năm
1. **Quyền "Tự tải danh sách mã Voucher riêng của thương hiệu"**:
   - **Bắt buộc đạt đồng thời 3 điều kiện xác thực & thâm niên uy tín**:
     - Đã hoàn tất **Xác Minh Pháp Nhân (Doanh nghiệp Cấp độ 2)** có Mã số thuế, GPKD và Website/Gian hàng chính thức hoạt động thật (`[Doanh Nghiệp Đã Xác Thực]`).
     - Có lịch sử hoạt động uy tín lâu năm trên Sàn: Đã chạy hoàn tất tối thiểu **03 chiến dịch khảo sát trả phí hợp lệ** (hoặc có tổng mức nạp tích lũy từ **`2.000.000 VNĐ` trở lên**).
     - Điểm uy tín tài khoản đạt từ **`90 / 100` trở lên** (chưa từng vi phạm).
   - **Chế tài bảo vệ**: Nếu một Doanh nghiệp đã xác minh mà vẫn bị từ $\ge 3$ người điền độc lập (`trust_score >= 80`, khác IP/thiết bị) báo cáo mã lỗi/không sử dụng được, hệ thống tự động thu hồi vĩnh viễn quyền tự tải Voucher và khấu trừ thẳng tiền đền bù (`+200 Point/người`) từ số dư `Credit` của doanh nghiệp để trả bù cho người điền.
2. **Với Tài khoản Mới / Doanh nghiệp Chưa Đủ Thâm Niên / Cá Nhân / Sinh Viên Muốn Gắn Voucher (Mua Số Lượng Nhỏ Từ Kho Sàn)**:
   - Không mở nút tự tải mã text bên ngoài lên để triệt tiêu 100% nguy cơ mã giả.
   - **Mua số lượng nhỏ (chỉ từ 01 – 05 mã) từ Kho Của Sàn (`Platform Catalog`)**:
     - Do mỗi Voucher trong Kho Sàn có mệnh giá thật từ **`10.000đ – 30.000đ – 50.000đ`** (Thẻ cào 10K/20K, Grab/Shopee/Phúc Long/Highlands 20K–50K), người tạo khảo sát **không cần mua đủ 100 mã cho 100 mẫu**, mà chỉ cần mua **01 đến 03 mã** (chỉ tốn thêm `10.000đ – 30.000đ`) gắn vào khảo sát để tạo sức hút lớn.
     - **Tùy chọn 2 cách phát số lượng nhỏ**:
       1. **Tặng cho người làm nhanh nhất (`First-Come, First-Served`)**: Ví dụ mua 02 Voucher 20K tặng cho **02 người hoàn thành hợp lệ đầu tiên** (giúp bài khảo sát vừa đăng lên đã có hàng chục người tranh nhau vào làm ngay).
       2. **Phát ngẫu nhiên may mắn (`Lucky Drop / Bốc thăm`)**: Ví dụ mua 01 Voucher Highlands/Shopee 30K cho bài khảo sát 100 mẫu; bất kỳ ai hoàn thành bài ngoài việc nhận đủ `Point` tiền mặt còn có **cơ hội trúng giải thưởng Voucher 30K** (giữ sức hút cho bài khảo sát đến tận mẫu cuối cùng).

---

### 4. [GHI CHÚ LỘ TRÌNH MỞ RỘNG — CHƯA TRIỂN KHAI NGAY] Hệ thống Gói Thuê Bao Định Kỳ: Tháng / Học Kỳ / Năm

> [!NOTE]
> **Trạng thái thực thi**: Chỉ **ghi chú lưu lại trong kế hoạch để tham khảo cho giai đoạn mở rộng về sau, CHƯA triển khai vào code ở giai đoạn hiện tại**. Ở giai đoạn hiện tại, hệ thống chỉ vận hành định mức **30 lượt miễn phí / tháng cho Sinh viên xác thực `.edu.vn`** kết hợp nạp tiền trả theo từng bài khảo sát (Pay-as-you-go).

Bảng thông số lưu trữ phục vụ giai đoạn mở rộng sau này:

| Tên Gói Thuê Bao | Đối tượng phù hợp | Mức giá Thuê bao | Định mức Lượt mẫu cấp sẵn | Vé Ghim VIP + Push APK + Email tặng kèm | Đơn giá quy đổi / mẫu | Biên lợi nhuận Sàn *(Khi dùng 100% lượt)* |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Gói Sinh Viên Cơ Bản**<br>*(Mặc định khi xác thực `.edu.vn`)* | Sinh viên đại học / cao đẳng | **0đ / tháng** | **30 lượt miễn phí / tháng**<br>*(Làm mới ngày 01 hàng tháng, không cộng dồn; cứ đăng 50 mẫu được trừ 10 lượt)* | Mua lẻ 15.000đ/vé | Trả lẻ 400đ - 500đ/mẫu cho phần vượt | **Lãi ~10%** trên mỗi đơn đăng |
| **2. Gói Học Thuật Pass (Gói Học Kỳ 3 Tháng)** | Nhóm Khóa luận, Thạc sĩ, Nghiên cứu sinh, Cá nhân làm đề tài | **199.000đ / 3 tháng**<br>*(~66.000đ / tháng)* | Cấp tổng **450 lượt mẫu** trong 3 tháng *(150 lượt/tháng)* + **Miễn phí 100% Bộ lọc đối tượng** | **Tặng 03 Vé Ghim VIP** *(1 vé/tháng)* | **~440đ / mẫu**<br>*(Tiết kiệm 26% so với mua lẻ có lọc 600đ/mẫu)* | Đáp viên nhận 360đ/mẫu (162k) -> **Sàn lãi 37.000đ (~19%)** |
| **3. Gói Doanh Nghiệp PRO (Tháng / Năm)** | Startup, Chủ shop, SME khảo sát định kỳ hàng tháng | - **Tháng**: **490.000đ / tháng**<br>- **Năm**: **4.900.000đ / năm** *(Tặng 2 tháng = Giảm 17%)* | Cấp **300 lượt mẫu Doanh nghiệp / tháng** *(3.600 lượt/năm)* + **Full 5 Ưu đãi DN & Bộ lọc sâu** | **Tặng 02 Vé Ghim VIP / tháng** *(24 vé/năm)* | - Tháng: **1.630đ/mẫu**<br>- Năm: **1.360đ/mẫu**<br>*(Rẻ hơn 18% - 32% so với giá lẻ 2.000đ)* | Đáp viên nhận 1.000đ - 1.100đ/mẫu (300k - 330k/tháng) -> **Sàn lãi 160k - 190k/tháng (~35%)** |
| **4. Gói Doanh Nghiệp AGENCY (Tháng / Năm)** | Công ty lớn, Agency Marketing, Viện nghiên cứu | - **Tháng**: **1.490.000đ / tháng**<br>- **Năm**: **14.900.000đ / năm** *(Tặng 2 tháng = Giảm 17%)* | Cấp **1.000 lượt mẫu Doanh nghiệp / tháng** *(12.000 lượt/năm)* + **Full 5 Ưu đãi DN & Bảo hành 1 đổi 1** | **Tặng 06 Vé Ghim VIP / tháng** *(72 vé/năm)* | - Tháng: **1.490đ/mẫu**<br>- Năm: **1.240đ/mẫu**<br>*(Rẻ hơn tới 38% so với giá lẻ 2.000đ)* | Đáp viên nhận 1.000đ/mẫu (1.000k/tháng) -> **Sàn lãi 490k/tháng (~33%)** |

#### Quy tắc Bảo vệ Quỹ Trả Thưởng cho Gói Tháng / Năm:
1. **Mở khóa lượt theo từng tháng (Monthly Release)**: Với Gói Năm, số lượt mẫu được cấp đều đặn vào ngày 01 mỗi tháng (`300 lượt/tháng` hoặc `1.000 lượt/tháng`). Số lượt chưa dùng hết trong tháng được phép **bảo lưu cộng dồn tối đa sang 01 tháng kế tiếp** (Rollover 1 tháng) để bảo vệ dòng tiền thanh khoản của sàn.
2. **Hệ số quy đổi theo độ dài bảng hỏi**: `1 lượt định mức` tương ứng với 1 mẫu khảo sát Ngắn hoặc Vừa ($\le 25$ câu). Nếu tạo khảo sát Dài ($> 25$ câu), hệ thống quy đổi `1 mẫu dài = 1,25 lượt định mức` để đảm bảo người điền luôn nhận đủ thù lao xứng đáng.

---

## PHẦN III: HỒ SƠ CÁ NHÂN (PROFILE), XÁC THỰC SINH VIÊN & AUTO-SCREENER

### 1. Xác thực Email Trường (`.edu.vn` / `.ac.vn`) qua Gmail SMTP & Brevo
- Danh mục trường đại học (`matchingService.js`) ánh xạ từng trường với tên miền chuẩn (VD: HUST -> `sis.hust.edu.vn`, NEU -> `st.neu.edu.vn`, UEH -> `st.ueh.edu.vn`, FPT -> `fpt.edu.vn`, các trường khác -> đuôi `.edu.vn` hoặc `.ac.vn`).
- Gửi mã OTP 6 chữ số (hiệu lực 5 phút) qua hàm `sendSmartEmail` (kết hợp Gmail SMTP & Brevo API trong `notificationService.js`).
- Chỉ những trường chưa cấp email sinh viên mới mở nhánh dự phòng tải ảnh thẻ sinh viên để Admin duyệt thủ công.

### 2. Mục Hồ sơ Cá nhân (Profile) & Điều kiện Mở Khóa 25 Lượt Điền Form Miễn Phí
- **Các trường thông tin cần khai báo**: Giới tính, Ngày tháng năm sinh, Tỉnh/Thành phố, Nghề nghiệp / Đối tượng, Trường học, Ngành học, Năm học, Thu nhập ước tính.
- **Quyền lợi khi hoàn thiện 100% thông tin cá nhân lần đầu (`profile_completed = 1`)**:
  1. **Mở khóa ngay `25 lượt điền form miễn phí đầu tay`** cho tài khoản Gói Cá Nhân (áp dụng 1 lần duy nhất cho bài khảo sát đầu tiên từ 50 mẫu trở lên).
  2. **Mở khóa `30 lượt điền form miễn phí / tháng`** nếu kết hợp xác thực thành công email sinh viên `.edu.vn` / `.ac.vn` (Gói Sinh Viên).
  3. **Đạt điểm khớp `100%` (`matchScore = 100%`)** để nhận thông báo mời làm các bài khảo sát có bộ lọc trả thưởng cao qua Email & Push App APK, đồng thời được **ẩn tự động các câu hỏi sàng lọc đầu bài (Smart Bypass & Auto-Fill)**.
- **Cam kết bảo mật quyền riêng tư rõ ràng trên giao diện**: Thông tin chỉ dùng để hệ thống đối khớp tự động và gửi thông báo khảo sát phù hợp, tuyệt đối không bán hoặc chia sẻ cho bên thứ ba vì mục đích thương mại.
- **Khóa chỉnh sửa các trường nhân khẩu học cốt lõi trong vòng 90 ngày** sau khi lưu để chống gian lận đổi thông tin liên tục nhằm lách bộ lọc.

### 3. Cơ chế Tự động Sinh Câu hỏi Sàng lọc Thích ứng (Adaptive Auto-Screener) & Tự động Điền dữ liệu Xuất CSV/Sheets
- Khi người tạo khảo sát **có chọn bộ lọc đối tượng**, **chưa tự tạo câu hỏi lọc trùng lặp**, và **tích chọn ô tự động tạo câu hỏi lọc**:
  - **Ẩn thông minh kèm Tự động điền ngầm (Smart Bypass & Auto-Fill)**: Người điền đã có Profile khớp 100% với bộ lọc (như người nhận thông báo đẩy APK hoặc Email mời làm bài) sẽ được **ẩn hoàn toàn** các câu hỏi lọc tự động này và vào thẳng câu hỏi số 1 của bài khảo sát. **Quan trọng**: Hệ thống sẽ **tự động ghi nhận ngầm (Auto-fill)** thông tin nhân khẩu học tương ứng từ Profile của người điền (Độ tuổi, Giới tính, Khu vực, Ngành học...) vào bản ghi kết quả để khi chủ khảo sát **Xuất file CSV/SPSS hoặc đồng bộ Google Sheets**, các cột nhân khẩu học vẫn đầy đủ 100% dữ liệu mà người điền không phải trả lời lại.
  - **Hiển thị chặn lọc (Front-Gate Screener)**: Người điền chưa khai báo đủ Profile hoặc khách vãng lai tự bấm vào bài từ trang chủ sẽ thấy các câu hỏi lọc tự động ở đầu bài để kiểm tra điều kiện. Nếu trả lời khớp mới được vào làm bài chính; nếu không khớp sẽ dừng bài ngay và không làm bẩn dữ liệu của chủ khảo sát.

### 4. Thiết Kế Lại Trình Tạo Khảo Sát Chuẩn Google Forms: Bố Cục 2 Cột (Two-Column Studio) & 12 Định Dạng Câu Hỏi

Thay vì dồn toàn bộ câu hỏi, bảng giá, cài đặt và nút xuất bản nối đuôi nhau từ trên xuống dưới gây khuất tầm nhìn khi bảng hỏi dài, giao diện Tạo Khảo Sát (`create-survey`) được tái cấu trúc theo **Bố cục 2 Cột chuẩn Google Forms kết hợp Bảng Điều Khiển Ghim Cố Định**:

#### A. Bố Cục 2 Cột (Two-Column Form Studio Layout)

| Phân Vùng Giao Diện | Tỷ Lệ Rộng (Desktop) | Thành Phần & Chức Năng Chi Tiết |
| :--- | :--- | :--- |
| **1. CỘT TRÁI: Khung Soạn Thảo Biểu Mẫu Chuẩn Google Forms**<br>*(Main Form Canvas)* | **~65%**<br>*(760px - 820px)* | - **Thẻ Tiêu Đề Biểu Mẫu (Form Header Card)**: Có dải thanh màu nhấn trên đỉnh thẻ (`Top Accent Strip` màu Cam Vibe `#EA580C`), ô nhập `Tiêu đề biểu mẫu` chữ lớn và `Mô tả biểu mẫu` bên dưới; kèm thanh chuyển nhanh 3 chế độ nhập (`Soạn Trực Tiếp` / `Đồng Bộ Link Google & MS Forms` / `Dán Văn Bản Thông Minh`).<br>- **Thẻ Câu Hỏi Đang Chọn (Active Question Card - Y hệt Google Forms)**:<br>  + Dải viền màu nhấn dọc bên trái thẻ (`Left Vertical Highlight Bar` 4px) đánh dấu thẻ đang chỉnh sửa.<br>  + Cụm 6 chấm kéo thả sắp xếp thứ tự (`Drag Handle`) ở chính giữa đỉnh thẻ.<br>  + Hàng trên: Ô nhập tiêu đề câu hỏi (nền xám nhạt, gạch chân động khi focus) + Nút đính kèm hình ảnh minh họa + **Menu thả xuống chọn 1 trong 12 định dạng câu hỏi** bên phải.<br>  + Khu vực thân thẻ: Hiển thị danh sách tùy chọn (`Thêm tùy chọn` hoặc `Thêm "Khác"`), hoặc cấu trúc **2 cột Hàng (Rows) & Cột (Columns)** đối với câu hỏi dạng Lưới.<br>  + Thanh chân thẻ (`Card Footer`): Nút **`Nhân bản câu hỏi (Duplicate)`**, Nút **`Xóa câu hỏi (Trash)`**, vạch ngăn dọc, công tắc gạt **`Bắt buộc` (`is_required`)** (hoặc **`Yêu cầu một phản hồi trong mỗi hàng`** với dạng Lưới), và nút Menu 3 chấm mở rộng (`Thêm mô tả phụ`, `Xáo trộn thứ tự đáp án`, `Chuyển đến phần theo câu trả lời`).<br>- **Thanh Công Cụ Nổi Dọc Bên Cạnh (`Floating Action Toolbar`)**: Đi theo thẻ câu hỏi đang chọn gồm 6 nút: `(+) Thêm câu hỏi`, `Nhập câu hỏi nhanh`, `(Tt) Thêm tiêu đề và mô tả`, `Thêm hình ảnh`, `Thêm video`, `Thêm phần (Section Break)`. |
| **2. CỘT PHẢI: Bảng Cài Đặt, Định Giá & Ký Quỹ Ghim Cố Định**<br>*(Sticky Settings & Pricing Sidebar)* | **~35%**<br>*(380px - 420px, `position: sticky; top: 80px`)* | Gom toàn bộ các chức năng giá, ngân sách, đối tượng và cài đặt form vào cột riêng bên phải để người tạo vừa soạn câu hỏi vừa quan sát trực tiếp chi phí mà không phải cuộn trang:<br>1. **Khối Phân Khúc & Số Mẫu Mục Tiêu**: Chọn Gói (`Sinh Viên` / `Cá Nhân` / `Doanh Nghiệp`) và nhập Số lượng mẫu cần thu ($N$), tự động đếm số câu hỏi hiện tại để xác định độ dài (`Ngắn` / `Vừa` / `Dài`).<br>2. **Khối Định Giá & Mức Đề Xuất (3 Nấc + Tự Chỉnh Boost)**:<br>   - 3 thẻ chọn nhanh: **`Mức Sàn Tiết Kiệm (3-5 ngày)`**, **`Mức Đề Xuất +25% (24-48h)`**, **`Mức Hỏa Tốc +60% (2-6h)`**.<br>   - Ô nhập giá / Thanh trượt tự chỉnh mức trả trên mỗi mẫu ($P \ge P_{\text{sàn}}$), hiển thị ngay: *"Người điền nhận: X Point — Sàn thu: Y Credit"* theo công thức chia 85/15 hoặc 80/20.<br>3. **Khối Bộ Lọc Đối Tượng & Auto-Screener**: Chọn tiêu chí lọc (Giới tính, Độ tuổi, Trường học, Khu vực, Nghề nghiệp, Thu nhập) + Công tắc tự động sinh câu hỏi sàng lọc thích ứng.<br>4. **Khối Cài Đặt Vận Hành Form**: Thời hạn treo (`7 / 14 / 30 ngày`), bật/tắt `Ghim VIP 7 ngày`, gắn kèm `Voucher kích cầu` (Kho Sàn 1-5 mã hoặc Tự tải), và ô `Google Sheets Webhook URL`.<br>5. **Khối Tổng Kết Ngân Sách Ký Quỹ & Nút Xuất Bản**: Hiển thị số lượt miễn phí được khấu trừ, tổng `Credit` thực thu khóa vào Escrow, số dư ví hiện tại và 2 nút cố định: **`[LƯU BẢN NHÁP]`** & **`[XUẤT BẢN KHẢO SÁT]`**. |

#### B. Danh Mục Đầy Đủ 12 Định Dạng Câu Hỏi Chuẩn Google Forms

Hệ thống hỗ trợ trọn vẹn 12 định dạng câu hỏi chia thành 5 nhóm đúng như menu chuẩn của Google Forms:

| Nhóm | Tên Hiển Thị Trên Menu | Mã Định Dạng (`questions.type`) | Đặc tả Giao diện Thiết kế & Giao diện Người điền |
| :--- | :--- | :--- | :--- |
| **Nhóm 1: Văn bản** | **1. Trả lời ngắn** | `SHORT_TEXT` | Ô nhập văn bản ngắn 1 dòng (hỗ trợ kiểm tra định dạng Số, Email, URL hoặc câu trả lời ngắn). |
| | **2. Đoạn** | `PARAGRAPH` | Ô nhập văn bản tự luận nhiều dòng (`textarea` tự giãn chiều cao). |
| **Nhóm 2: Lựa chọn** | **3. Trắc nghiệm** | `SINGLE_CHOICE` | Các nút chọn tròn (`Radio`), chỉ chọn duy nhất 1 đáp án; hỗ trợ tùy chọn `"Khác..."` có ô tự nhập. |
| | **4. Hộp kiểm** | `MULTIPLE_CHOICE` | Các ô vuông (`Checkbox`), cho phép chọn nhiều đáp án cùng lúc; hỗ trợ giới hạn chọn tối thiểu/tối đa. |
| | **5. Menu thả xuống** | `DROPDOWN` | Danh sách thả xuống gọn gàng (phù hợp khi có nhiều lựa chọn như 63 Tỉnh/Thành phố, danh sách trường). |
| **Nhóm 3: Tệp** | **6. Tải tệp lên** | `FILE_UPLOAD` | Cho phép đính kèm hình ảnh minh chứng / tài liệu (giới hạn định dạng PNG/JPG/PDF, dung lượng an toàn $\le 5\text{MB}$). |
| **Nhóm 4: Thang đo & Ma trận Lưới** | **7. Phạm vi tuyến tính** | `LINEAR_SCALE` | Thang đo tuyến tính từ `1` (hoặc `0`) đến `5` (hoặc `10`) kèm nhãn chữ ở 2 đầu mút (VD: *Hoàn toàn không đồng ý* $\rightarrow$ *Hoàn toàn đồng ý*). |
| | **8. Xếp hạng** | `RATING_STARS` | Thang đánh giá biểu tượng Ngôi sao (`1 - 5 Sao` hoặc `1 - 10 Sao`) trực quan. |
| | **9. Lưới trắc nghiệm** | `CHOICE_GRID` | Bảng ma trận gồm danh sách **Hàng (Rows - Các tiêu chí con)** và **Cột (Columns - Các mức đánh giá)**; mỗi hàng chọn 1 ô tròn (`Radio`). Có công tắc **`Yêu cầu một phản hồi trong mỗi hàng`**. |
| | **10. Lưới hộp kiểm** | `CHECKBOX_GRID` | Bảng ma trận gồm danh sách **Hàng (Rows)** và **Cột (Columns)**; mỗi hàng cho phép tích chọn nhiều ô vuông (`Checkbox`). |
| **Nhóm 5: Thời gian** | **11. Ngày** | `DATE_INPUT` | Bộ chọn Ngày / Tháng / Năm chuẩn. |
| | **12. Giờ** | `TIME_INPUT` | Bộ chọn Giờ : Phút (hoặc khoảng thời gian). |

---

### 5. Cơ chế Tự động Nhận diện Chuẩn 100% Dạng Câu hỏi & Cờ Bắt buộc (`is_required`) từ Google Forms, Microsoft Forms & Smart Paste

Khi người tạo dán đường dẫn Google Forms hoặc Microsoft Forms vào ô đồng bộ, bộ phân tích `server/services/formParserService.js` tự động bóc tách chính xác từng loại câu hỏi, danh sách đáp án / hàng-cột và trạng thái bắt buộc trả lời:

1. **Bảng Ánh Xạ Tự Động từ Google Forms (`FB_PUBLIC_LOAD_DATA_`)**:
   - Trong cấu trúc mảng `item` của Google Forms (`item[1]` là tiêu đề câu hỏi, `item[3]` là mã định dạng số `qTypeNum`, `item[4]` là mảng dữ liệu con):
     - `item[3] === 0` $\rightarrow$ **`SHORT_TEXT`** (Trả lời ngắn) — `is_required = item[4][0][2] === 1`.
     - `item[3] === 1` $\rightarrow$ **`PARAGRAPH`** (Đoạn văn dài) — `is_required = item[4][0][2] === 1`.
     - `item[3] === 2` $\rightarrow$ **`SINGLE_CHOICE`** (Trắc nghiệm 1 đáp án; đọc danh sách `options` từ `item[4][0][1]`).
     - `item[3] === 3` $\rightarrow$ **`DROPDOWN`** (Menu thả xuống; đọc danh sách `options` từ `item[4][0][1]`).
     - `item[3] === 4` $\rightarrow$ **`MULTIPLE_CHOICE`** (Hộp kiểm nhiều đáp án; đọc danh sách `options` từ `item[4][0][1]`).
     - `item[3] === 5` $\rightarrow$ **`LINEAR_SCALE`** (Phạm vi tuyến tính; đọc thang số từ `item[4][0][1]` và cặp nhãn 2 đầu mút từ `item[4][0][3]`).
     - `item[3] === 7` $\rightarrow$ **Lưới Ma Trận (`CHOICE_GRID` hoặc `CHECKBOX_GRID`)**:
       + Trong Google Forms, câu hỏi lưới lưu mỗi hàng là một phần tử trong mảng `item[4]`: danh sách **Hàng (`rows`)** lấy từ `item[4].map(r => r[3][0])`, danh sách **Cột (`columns`)** lấy từ `item[4][0][1].map(c => c[0])`.
       + Nếu cờ loại ô chọn của hàng là checkbox (`item[4][0][11] === 1` hoặc đa lựa chọn) $\rightarrow$ **`CHECKBOX_GRID`**, ngược lại $\rightarrow$ **`CHOICE_GRID`**.
       + Cờ **`Yêu cầu một phản hồi trong mỗi hàng`** được trích xuất trực tiếp từ `item[4][0][2] === 1`.
     - `item[3] === 9` $\rightarrow$ **`DATE_INPUT`** (Ngày tháng).
     - `item[3] === 10` $\rightarrow$ **`TIME_INPUT`** (Giờ phút).
     - `item[3] === 13` $\rightarrow$ **`FILE_UPLOAD`** (Tải tệp lên).
     - `item[3] === 18` $\rightarrow$ **`RATING_STARS`** (Xếp hạng sao).
2. **Bảng Ánh Xạ Tự Động từ Microsoft Forms (`forms.office.com` / `forms.cloud.microsoft`)**:
   - Trích xuất dữ liệu câu hỏi từ `OfficeFormServerInfo` / endpoint `runtimeForms`:
     - `Question.Choice`: Nếu `allowMultipleValues === true` $\rightarrow$ **`MULTIPLE_CHOICE`**; nếu `subtitle` / hiển thị dạng dropdown $\rightarrow$ **`DROPDOWN`**; mặc định $\rightarrow$ **`SINGLE_CHOICE`**.
     - `Question.TextField`: Nếu `multiline === true` $\rightarrow$ **`PARAGRAPH`**, ngược lại $\rightarrow$ **`SHORT_TEXT`**.
     - `Question.Rating`: Nếu hình ngôi sao $\rightarrow$ **`RATING_STARS`**, nếu thang số / NPS $\rightarrow$ **`LINEAR_SCALE`**.
     - `Question.MatrixChoiceGroup` / `Question.Likert`: Tự động gom các câu hỏi con có chung `groupId` thành **`CHOICE_GRID`** (hoặc **`CHECKBOX_GRID`**) với đầy đủ danh sách `rows` và `columns`.
     - `Question.DateTime` $\rightarrow$ **`DATE_INPUT`**; `Question.FileUpload` $\rightarrow$ **`FILE_UPLOAD`**.
     - Cờ bắt buộc đọc từ `question.required === true` $\rightarrow$ `is_required = 1`.
3. **Với Dán Văn Bản Thông Minh (Smart Text Paste)**:
   - Tự động nhận diện cú pháp câu hỏi trắc nghiệm (`A.`, `B.`, `C.` hoặc `-`, `*`), hộp kiểm (`[ ]`), lưới ma trận (`Hàng: ... | Cột: ...`), câu hỏi tự luận ngắn/dài và dấu `*` hoặc `(Không bắt buộc)` ở cuối dòng tiêu đề để gán chuẩn định dạng và cờ `is_required`.

---

## PHẦN IV: HỆ THỐNG CHỐNG GIAN LẬN ĐA TẦNG (ANTI-FRAUD ENGINE)

Hệ thống kiểm duyệt tự động trong `server/services/antiFraudService.js` vận hành theo thời gian thực ngay tại thời điểm người điền bấm nộp bài, chỉ trả thưởng khi bài làm vượt qua **5 chốt chặn kỹ thuật**:

### 1. Năm Chốt chặn Kiểm duyệt Tự động
1. **Chốt chặn 1 - Bẫy tốc độ làm bài (Speed Trap - Không tính thời gian câu tự luận)**:
   - Hệ thống chỉ tính thời gian đọc tối thiểu dựa trên các câu hỏi trắc nghiệm, thang đo và ma trận lưới (Trắc nghiệm 10-12 giây/câu, Likert/Rating 12-15 giây/câu, Lưới trắc nghiệm 5 giây/hàng).
   - **Câu hỏi Tự luận (`SHORT_TEXT` / `PARAGRAPH` / `OPEN_TEXT`) không tính thời gian (`0 giây`)**: Loại bỏ hoàn toàn câu tự luận khỏi phép tính thời gian tối thiểu vì người điền có thể chỉ nhập một con số (như số `0`) hoặc từ ngắn (*"Không"*).
   - Nếu tổng thời gian làm thực tế **nhỏ hơn 35%** thời gian chuẩn của các câu trắc nghiệm -> **Từ chối ngay lập tức (`REJECTED`)**, không trả tiền, trừ **`-12 điểm uy tín`**.
   - Nếu thời gian làm từ **35% đến dưới 60%** -> Đánh dấu **Nghi vấn (`SUSPICIOUS`)**, trừ **`-5 điểm uy tín`**.
2. **Chốt chặn 2 - Bẫy câu hỏi kiểm tra sự tập trung Động + Cơ chế Thêm 1 Cơ Hội (Dynamic Attention Check & Second-Chance Grace)**:
   - **Chèn vị trí ngẫu nhiên theo từng người làm (Dynamic Position)**: Tuyệt đối không gắn cứng câu hỏi bẫy ở một số thứ tự cố định trong DB (tránh việc người điền chụp màn hình hoặc phím nhau *"câu số X là câu bẫy"*). Mỗi khi một người bắt đầu làm bài, hệ thống tự động sinh và chèn câu hỏi bẫy vào **một vị trí ngẫu nhiên bất kỳ ở khoảng giữa bài (từ 30% đến 80% tiến độ)** kèm đáp án yêu cầu ngẫu nhiên (mỗi người làm sẽ gặp ở một vị trí khác nhau).
   - **Cơ chế "Thêm 01 Cơ Hội" phòng người thật đọc nhưng vô tình click nhầm**:
     - **Lần 1**: Nếu người điền chọn **ĐÚNG** đáp án yêu cầu -> Chuyển thẳng sang câu tiếp theo bình thường. Nếu chọn **SAI ở lần 1** -> Hệ thống **chưa đánh trượt ngay**, mà hiển thị lời nhắc lịch sự và **cấp thêm 01 câu hỏi xác nhận thứ hai (Cơ hội sửa sai)** ở vị trí kế tiếp với đáp án yêu cầu mới.
     - **Lần 2 (Cơ hội cuối)**: Nếu người điền chọn **ĐÚNG ở lần 2** -> Vẫn được công nhận **Hợp lệ 100% (`VALIDATED`)**, nhận đủ tiền thưởng và không bị trừ điểm uy tín. Chỉ khi **chọn SAI cả 2 lần liên tiếp** (chứng tỏ dùng tool auto-click hoặc nhắm mắt bấm bừa không đọc cảnh báo) mới chính thức **Từ chối (`REJECTED`)** và trừ **`-12 điểm uy tín`**.
3. **Chốt chặn 3 - Phát hiện chọn bừa một đường thẳng (Straight-lining Variance Detection)**:
   - Với khảo sát có từ **5 câu hỏi thang đo (Likert/Rating) hoặc 5 hàng trong câu hỏi Lưới (`CHOICE_GRID`)** trở lên, hệ thống tính phương sai toán học ($\sigma^2$) của chuỗi đáp án.
   - Nếu người điền tích toàn bộ cùng 1 cột từ đầu đến cuối ($\sigma^2 = 0$) -> Đánh dấu **Nghi vấn (`SUSPICIOUS`)**, trừ **`-5 điểm uy tín`**.
4. **Chốt chặn 4 - Bộ lọc câu trả lời tự luận rác (Cho phép ghi số `0` hoặc câu trả lời ngắn)**:
   - Cho phép hợp lệ 100% việc người điền chỉ ghi số `0`, ký tự ngắn hoặc từ ngắn thực tế (*"0"*, *"Không"*, *"Có"*, *"Chưa"*, *"Bình thường"*, *"Ok"*...).
   - Chỉ chặn khi phát hiện chuỗi gõ bàn phím loạn xạ vô nghĩa rõ ràng (`asdfgh`, `aaaaaa`, `qqqqqq`) hoặc lặp 1 ký tự vô nghĩa từ 5 lần liên tiếp trở lên.
5. **Chốt chặn 5 - Định danh Thiết bị (`device_fingerprint`) & Địa chỉ IP**:
   - Ghi nhận mã định danh phần cứng trình duyệt/thiết bị (`device_fingerprint`) và IP của từng phiếu để chặn 1 người dùng nhiều tài khoản làm lại cùng 1 bài khảo sát.

### 2. Cơ chế Điểm Uy Tín (`trust_score`) & Công thức Khấu trừ Thưởng khi Uy tín thấp

Thay vì chỉ có 2 trạng thái cứng nhắc (nhận 100% hoặc khóa nick), hệ thống áp dụng **cơ chế Khấu trừ Thưởng theo Điểm Uy Tín và Chuộc lỗi (Reputation-Weighted Payout)**:

- **Điểm khởi tạo tài khoản mới**: **`85 điểm`** (Thang điểm từ `0` đến `100`).
- **Biến động điểm uy tín theo hành vi**:
  - Nộp 1 bài hợp lệ (`VALIDATED`): Cộng **`+2 điểm uy tín`** (giúp người lỡ vi phạm có thể làm bài nghiêm túc để kéo điểm lên lại).
  - Đạt điều kiện dừng ở câu hỏi lọc (`SCREENED_OUT`): Cộng **`+0.2 điểm uy tín`**.
  - Bài làm bị đánh dấu Nghi vấn (`SUSPICIOUS` - chọn 1 cột thẳng hàng hoặc tốc độ 35% - 60%): Trừ **`-5 điểm uy tín`**.
  - Bài làm bị Từ chối (`REJECTED` - sai câu bẫy tập trung cả 2 cơ hội hoặc tốc độ `< 35%`): Không trả tiền bài đó + Trừ **`-12 điểm uy tín`**.

#### Công thức Toán học tính Tiền thưởng thực nhận theo Điểm Uy Tín ($S = \text{trust\_score}$):

| Phân vùng Uy tín | Điểm Uy Tín ($S$) | Công thức tính Tiền thưởng thực nhận (`Point`) | Quyền Rút tiền & Trạng thái Tài khoản |
| :--- | :--- | :--- | :--- |
| **1. Vùng Uy Tín Chuẩn / Tốt**<br>*(Ngưỡng miễn trừ phạt)* | **$80 \le S \le 100$** | **Nhận đủ `100%` mức thưởng gốc**<br>*(Không bị trừ bất kỳ khoản nào)* | Hoạt động bình thường, rút tiền/đổi thẻ cào tự do. |
| **2. Vùng Uy Tín Thấp (Cảnh báo)**<br>*(Khấu trừ lũy tiến 1% cho mỗi điểm thiếu dưới mốc 80)* | **$40 \le S < 80$** | $$\text{Thực nhận} = \text{Thưởng gốc} \times \left[ 1 - \frac{80 - S}{100} \right]$$<br>*(Cứ tụt 1 điểm dưới mốc 80 thì bị trừ 1% tiền thưởng; phần tiền phạt đưa vào Quỹ Bảo hành đổi mẫu)* | - Từ **$60 \le S < 80$**: Vẫn được rút tiền bình thường.<br>- Từ **$40 \le S < 60$**: Vẫn được làm bài để cày điểm uy tín lên lại, nhưng tạm khóa rút tiền cho tới khi $S \ge 60$. |
| **3. Vùng Uy Tín Siêu Thấp**<br>*(Vi phạm nghiêm trọng nhiều lần)* | **$S < 40$** | **`0 Point` (Khóa tài khoản)** | **Tự động khóa tài khoản (`is_banned = 1`)**, chặn làm bài và chặn rút tiền. |

*Ví dụ minh họa với bài khảo sát có mức thưởng gốc **1.000 Point (1.000đ)***:
- Người có `trust_score = 85` (hoặc từ `80 - 100`): Nhận đủ **1.000đ** (Trừ 0đ).
- Người có `trust_score = 75` (thiếu 5 điểm so với mốc 80 -> trừ 5%): Nhận **950đ** (Phạt 50đ). Chỉ cần làm chuẩn 3 bài tiếp theo (`+6 điểm` -> lên `81 điểm`) là về lại mức nhận đủ 100%.
- Người có `trust_score = 65` (thiếu 15 điểm -> trừ 15%): Nhận **850đ** (Phạt 150đ).
- Người có `trust_score = 50` (thiếu 30 điểm -> trừ 30%): Nhận **700đ** (Phạt 300đ).
- Người có `trust_score < 40`: **Khóa tài khoản (`BAN`)**.

### 3. Bốn Nâng cấp Bắt buộc đối với Anti-Fraud Engine (Chống thất thoát & Tránh phạt oan người thật)
1. **Khóa lỗ hổng cày tiền ở Câu hỏi Sàng lọc (`Screen-out`)**:
   - Thay thế quy tắc cũ (vốn tặng 20 điểm = 200đ tiền mặt khi bị loại ở câu hỏi lọc) bằng quy tắc mới: Khi bị loại ở câu hỏi lọc (`screenOut = true`), người điền nhận **`0 Point`** (không phát tiền mặt miễn phí) và chỉ được cộng **`+0.2 điểm uy tín (trust_score)`**. Điều này triệt tiêu hoàn toàn động cơ dùng tool bot cố tình trả lời sai câu lọc để rút tiền của sàn.
2. **Sửa điều kiện Auto-Ban theo `device_fingerprint` để bảo vệ mạng Wi-Fi Trường đại học / Ký túc xá**:
   - Quy tắc cũ khóa tự động mọi tài khoản khi có $\ge 5$ tài khoản cùng 1 địa chỉ IP trong 24 giờ, dễ gây khóa nhầm hàng loạt sinh viên dùng chung mạng Wi-Fi trường đại học, thư viện hoặc ký túc xá.
   - Quy tắc nâng cấp: **Chỉ tự động khóa tài khoản (Auto-Ban) khi phát hiện $\ge 3$ tài khoản trùng mã phần cứng thiết bị (`device_fingerprint`) trên cùng 1 máy trong 24 giờ**. Trường hợp nhiều tài khoản trùng địa chỉ IP Wi-Fi công cộng nhưng có `device_fingerprint` khác nhau thì hoàn toàn hợp lệ và không bị khóa.
3. **Chèn động câu hỏi bẫy tập trung theo từng phiên làm bài kèm 01 cơ hội sửa sai**:
   - Câu hỏi bẫy được chèn ngẫu nhiên giữa các câu hỏi cho từng người làm khác nhau; nếu chọn đúng lần 1 thì đi tiếp luôn, nếu vô tình bấm nhầm lần 1 sẽ được trao thêm 01 cơ hội thứ hai trước khi kết luận gian lận.
4. **Không tính thời gian (`0 giây`) cho câu tự luận (`SHORT_TEXT` / `PARAGRAPH`) và chấp nhận câu trả lời ngắn (kể cả chỉ ghi số `0`)**:
   - Loại bỏ câu tự luận khỏi bộ đếm thời gian tối thiểu của Speed Trap để không phạt oan người chỉ điền số `0` hoặc trả lời ngắn gọn.

---

## PHẦN V: THỜI HẠN TREO KHẢO SÁT, THỜI HẠN GHIM VIP & CƠ CHẾ HOÀN TIỀN KHI HẾT HẠN / HUỶ TREO SỚM

### 1. Thời Hạn Treo Khảo Sát Tối Đa (`expires_at`) & Tự Động Hoàn Tiền Khi Hết Hạn
- **Thời hạn treo mặc định**: **14 ngày** kể từ thời điểm xuất bản (`publishSurvey`).
- **Tùy chọn linh hoạt khi tạo bài**: Người tạo có thể chọn thời hạn treo là **7 ngày**, **14 ngày** (mặc định) hoặc **30 ngày**.
- **Cơ chế gia hạn linh hoạt**: Khi khảo sát còn dưới 48 giờ hoặc đã hết hạn mà chưa gom đủ mẫu, chủ khảo sát có nút **`[Gia hạn thêm 7 ngày]`** (miễn phí) để tiếp tục thu thập nếu muốn.
- **Tự động đóng bài và hoàn tiền khi hết hạn**:
  - Khi đến thời điểm `expires_at` mà khảo sát chưa đủ số mẫu mục tiêu (`collected_responses < target_responses`) và không được gia hạn:
  - Hệ thống tự động chuyển trạng thái khảo sát từ `ACTIVE` sang `CLOSED`.
  - **Tự động giải ngân hoàn tiền 100% số dư thực tế đang khóa**: Hoàn trả nguyên vẹn số dư ký quỹ thực tế còn lại (`escrow_locked_balance`) về ví `credit_balance` của chủ khảo sát với bút toán `ESCROW_REFUND`.

### 2. Thời Hạn Ghim VIP Đầu Trang (`pinned_until`)
- **Thời hạn ghim tối đa**: **07 ngày / 01 lần kích hoạt Ghim VIP** (bằng vé `fast_track_tickets` hoặc mua lẻ `15.000đ - 40.000đ`).
- **Cơ chế tự động hạ ghim**:
  - Sau 07 ngày, hệ thống tự động gỡ cờ `is_pinned = 0` để khảo sát trở về vị trí sắp xếp tự nhiên theo điểm đối khớp (`matchScore`), tránh chiếm giữ vị trí đầu trang vô thời hạn.
  - Nếu khảo sát thu thập đủ 100% mẫu trước thời hạn 07 ngày, hệ thống cũng tự động hoàn tất và hạ ghim ngay lập tức.
  - Nếu muốn tiếp tục ghim sau 07 ngày, chủ khảo sát có thể sử dụng thêm 01 vé VIP hoặc trả phí để gia hạn ghim thêm 07 ngày.

### 3. Quy Tắc Hoàn Tiền An Toàn Tuyệt Đối & Bảo Vệ Chống Trục Lợi Khi Chủ Động Huỷ Treo Sớm (`closeSurvey`)
Khi chủ khảo sát chủ động bấm **`[Đóng / Huỷ khảo sát]`** trước thời hạn:

1. **Công thức hoàn tiền mẫu chưa thu (Khóa cứng theo `escrow_locked_balance`, chống hoàn vượt số tiền thực nạp khi dùng lượt miễn phí)**:
   - Gọi $\text{effective\_cost} = \frac{\text{TotalEscrow}_{\text{thực nạp}}}{N}$ là chi phí thực thu bình quân trên mỗi mẫu của đơn hàng đó.
   - Số tiền hoàn lại khi đóng bài sớm không bao giờ vượt quá số dư thực tế đang khóa trong `escrow_locked_balance`:
     $$\text{EscrowRefund} = \min\Big(\text{escrow\_locked\_balance},\; \max\big(0,\; \text{TotalEscrow}_{\text{thực nạp}} - (\text{collected\_responses} \times \text{effective\_cost})\big)\Big)$$
   - Số Credit này được hoàn trả ngay lập tức vào ví `credit_balance` của chủ khảo sát.
2. **Quy tắc xử lý Lượt điền form miễn phí (25 lượt Cá nhân / 30 lượt Sinh viên)**:
   - **Trường hợp 1 (Khảo sát ĐÃ có người làm, `collected_responses > 0`)**: Hệ thống chỉ hoàn lại phần `Credit` thực nạp còn dư theo công thức trên; **không hoàn trả lại các lượt miễn phí đã dùng** (để chống hành vi tạo bài, thu vài mẫu rồi huỷ để tái tạo form nhằm lách lượt free).
   - **Trường hợp 2 (Khảo sát CHƯA có bất kỳ ai làm, `collected_responses == 0`)**: Hoàn trả 100% `escrow_locked_balance` đồng thời **khôi phục lại nguyên vẹn số lượt miễn phí** vào `free_quota_remaining` cho người dùng.
3. **Chốt chặn chống lách Chiết khấu quy mô (Volume Discount) của Doanh nghiệp**:
   - Nếu Doanh nghiệp đăng ký gói quy mô lớn (ví dụ mốc **500 mẫu** được giảm giá **-15%** và **tặng miễn phí gói Ghim VIP + Push APK trị giá 40.000đ**), nhưng mới thu được dưới 300 mẫu đã bấm Huỷ khảo sát:
   - Hệ thống sẽ **tính lại chi phí của số mẫu đã thu theo đúng đơn giá chuẩn chưa giảm** (`actual_cost = collected_responses * cost_per_response_standard`) và **khấu trừ phí gói dịch vụ Ghim VIP / Push đã kích hoạt (`40.000 Credit`)** từ số dư ký quỹ thực nạp, với hàm chặn dưới `0` an toàn:
     $$\text{FinalRefund} = \max\Big(0,\; \min\big(\text{escrow\_locked\_balance},\; \text{TotalEscrow}_{\text{thực nạp}} - \text{actual\_cost} - 40.000\big)\Big)$$
   - Quy tắc này triệt tiêu hoàn toàn kẽ hở đăng số lượng ảo để lấy giá rẻ và dịch vụ miễn phí.

### 4. Quy Tắc Hoàn Trả Voucher Khi Hết Hạn Hoặc Huỷ Treo Sớm
Với các khảo sát có gắn kèm Voucher (V mã) nhưng khi đóng bài mới chỉ phát được V_used < V mã:
- **Voucher mua từ Kho Sàn (`PLATFORM_CATALOG` - 10k, 20k, 30k, 50k)**:
  - Hệ thống thu hồi (V - V_used) mã chưa phát về lại Kho Sàn.
  - Tự động **hoàn trả 100% giá trị `Credit`** của (V - V_used) mã chưa sử dụng này về ví `credit_balance` của chủ khảo sát.
- **Voucher tự tải của Doanh nghiệp (`CREATOR_SPONSORED`)**:
  - Hệ thống tự động gỡ liên kết và chuyển trạng thái của (V - V_used) mã chưa phát từ `RESERVED_FOR_SURVEY` về lại `AVAILABLE`.
  - Doanh nghiệp có thể tái sử dụng các mã này cho các chiến dịch khảo sát kế tiếp mà không bị mất mã.

---

## PHẦN VI: HẠ TẦNG TRIỂN KHAI MIỄN PHÍ — ORACLE CLOUD ALWAYS FREE & TÊN MIỀN RIÊNG (THAY THẾ RENDER FREE)

### 1. Lý do chuyển khỏi Render Free (Điểm đau hiện trạng → Giải pháp trên Oracle)

| Điểm đau khi chạy trên Render Free | Giải pháp trên Oracle Cloud Always Free |
| :--- | :--- |
| Ổ đĩa tạm thời — `vibesurvey.db` (SQLite WAL) bị xóa mỗi lần deploy/restart, buộc phải commit file DB lên git và chạy `ensureEssentialAccounts()` tự phục hồi tài khoản test | Block Volume bền vững — SQLite chạy đúng thiết kế, chấm dứt workflow "commit DB lên git" |
| Service tự ngủ sau 15 phút không truy cập, cold start vài chục giây (lỗi `Unexpected token '<'` khi client parse trang HTML wake-up; deep-link email Brevo mở vào app đang ngủ là mất người dùng) | VM luôn chạy 24/7, không cold start |
| Không có cronjob ở bản Free — không thực thi được Phần V (auto-close hết hạn + hoàn tiền, hạ ghim 7 ngày, làm mới 30 lượt free ngày 01) | `crontab` / `systemd timer` tự do |
| Chỉ **5GB băng thông/tháng** — phân phối APK Android và logo voucher là chạm trần | **10TB băng thông ra/tháng** |

### 2. Phân bổ Tài nguyên Always Free (Tham số 2026)

| Tài nguyên | Định mức Always Free | Quyết định cho dự án |
| :--- | :--- | :--- |
| Compute ARM Ampere A1 | **2 OCPU / 12 GB RAM** (chia linh hoạt tối đa 4 VM) | Năm 2026 Oracle đã cắt đôi định mức từ 4 OCPU/24GB — bỏ mọi tài liệu ghi số cũ. Cấp **1 VM 2 OCPU / 6 GB** (Ubuntu LTS) là đủ, phần dư để dự phòng và giảm rủi ro thu hồi |
| Compute x86 AMD E2.1.Micro | 2 VM (1 GB RAM) | Dự phòng / máy runner kiểm thử |
| Block Volume | ~200 GB | Đủ cho SQLite + assets + APK |
| Băng thông ra | 10 TB/tháng | Không bao giờ chạm trần ở quy mô hiện tại |
| Điều kiện đăng ký | Thẻ tín dụng (khấu ~1 USD rồi hoàn); **Home region khóa vĩnh viễn** → chọn Singapore | Vùng đông người dùng lấy A1 hay báo "Out of capacity" — phải bấm thử hoặc canh giờ |

**Chế tài cần phòng**: VM Always Free bị Oracle thu hồi nếu "nghỉ" ~7 ngày liên tiếp (CPU, mạng, RAM đều dưới ngưỡng ~20%). Biện pháp: VM nhỏ vừa sức, cron chạy đều việc, và UptimeRobot (free) ping health endpoint mỗi 5 phút — vừa giám sát vừa giữ máy ở trạng thái hoạt động.

### 3. Tên miền miễn phí & Cloudflare Tunnel

| Hạng mục | Quyết định |
| :--- | :--- |
| Nhà cung cấp tên miền free | **DigitalPlat FreeDomain** — đăng ký `vibesurvey.dpdns.org` (hoặc `.us.kg` / `.qzz.io`); cần KYC đơn giản + tài khoản GitHub, tối đa ~2 domain/người. Dự phòng: `eu.org` (duyệt thủ công tới 1 tháng) hoặc `.me` miễn phí 1 năm nếu xác thực được GitHub Student Pack |
| Tên miền bị cấm | Freenom (.tk/.ml/.ga/.cf) đã sụp đổ từ 2023–2024, toàn bộ domain bị xóa — tuyệt đối không dùng |
| DNS | Trỏ NS về **Cloudflare (plan Free)** |
| HTTPS & Kết nối | **Cloudflare Tunnel (`cloudflared`)** thay vì mở cổng 80/443: không phải sửa Security List (VCN) lẫn iptables, ẩn IP thật của VM, TLS tự động |
| Thời điểm đăng ký | **Ngay cả khi vẫn còn chạy Render** — `vibesurvey.onrender.com` không thuộc sở hữu dự án; có domain riêng trỏ qua Cloudflare thì sau này chuyển host chỉ đổi đích trỏ trong 1 phút, APK Android đã cài trên máy người dùng và email deep-link không bị phá |

### 4. Quy trình Cutover (Render → Oracle)

1. Đăng ký tên miền DigitalPlat → trỏ NS về Cloudflare.
2. Tạo VM A1 (Ubuntu LTS, chỉ đăng nhập SSH bằng key): cài Node.js 24 ARM64, `git clone` dự án, chạy `npm ci` **trên máy VM** (không copy `node_modules` từ Windows — `bcrypt` và các module native bắt buộc phải rebuild cho ARM64).
3. Chạy server bằng `pm2` (hoặc systemd service); chạy `cloudflared` trỏ `vibesurvey.dpdns.org` → `localhost:3000`.
4. Cập nhật 3 cấu hình: Google OAuth redirect URIs trong Google Cloud Console (thêm domain mới, giữ URI Render làm dự phòng), biến môi trường `APP_URL` (deep-link email Brevo), cấu hình Capacitor Android.
5. **Reset dữ liệu test tại cutover**: dự án chưa công khai nên không cần bảo toàn hay quy đổi số dư — dọn DB chạy theo chuẩn 1:10 cũ; `ensureEssentialAccounts()` tự tái tạo bộ tài khoản test với đơn vị 1:1 mới. Sau khi đĩa bền, **ngừng commit `vibesurvey.db` lên git** (đưa vào `.gitignore`).
6. Đưa 3 cronjob của Phần V vào `crontab`: (a) quét `expires_at` → auto-close + hoàn tiền escrow; (b) hạ ghim `pinned_until` quá 7 ngày; (c) ngày 01 làm mới 30 lượt miễn phí Sinh viên.
7. Backup hằng ngày: `sqlite3 .backup` + `rclone` lên Oracle Object Storage (10GB Always Free).
8. Gia cố bảo mật: `unattended-upgrades`, `fail2ban`, SSH key-only. Giữ Render chạy song song 1–2 tuần làm fallback URL rồi mới tắt.

---

## PHẦN VII: KINH TẾ CHI PHÍ THẬT & 7 QUY TẮC BẤT BIẾN CHỐNG LỖ SÀN (NẠP, VOUCHER, BANKING, THẺ CÀO, HẠ TẦNG)

Để loại trừ 100% rủi ro sàn bị âm tiền thật khi vận hành, toàn bộ mô hình kinh tế được tính toán theo nguyên tắc bảo thủ nhất (giả định mọi chiết khấu sỉ bằng 0%, mọi phí rút đều lấy trần):

### 1. Phân Tích Dòng Chi Phí Tiền Mặt Thực Tế Theo Từng Kênh

| Hạng mục chi phí | Chi phí thực tế thị trường Việt Nam (2025 – 2026) | Cơ chế sàn bù đắp & Bảo vệ an toàn |
| :--- | :--- | :--- |
| **1. Cổng nạp tiền (`VietQR / Chuyển khoản`)** | - **VietQR / PayOS**: ~`0%` (miễn phí hoặc ngân hàng tài trợ).<br>- **VNPay-QR**: `0,6% – 0,88%` / giao dịch.<br>- **Ví MoMo**: `~1%` / giao dịch. | Phí cổng nạp tối đa chỉ `~1%`, trừ trực tiếp vào dòng tiền thu vào. Với Take Rate thấp nhất là `10%` (Gói Sinh Viên), sàn vẫn còn dư tối thiểu `+9%` lợi nhuận gộp. |
| **2. Kênh rút tiền ngân hàng (`VietQR / MoMo`)** | - **Tài khoản doanh nghiệp (TPBank, Techcombank)**: Miễn phí chuyển khoản 24/7 trọn đời.<br>- **Ngân hàng khác (NAPAS 24/7)**: `1.100đ – 3.300đ` / giao dịch; mốc lớn `5.000đ` (như Indovina). | - **Mốc nhỏ 50k**: Người rút chịu phí `2.000đ` (nhận `48.000đ`), sàn chỉ chi trả thực `48.000đ` + phí ngân hàng $\rightarrow$ hòa vốn cổng.<br>- **Mốc chuẩn $\ge 100k$**: Sàn miễn phí rút, chi phí ngân hàng tối đa `3.300đ` (chỉ chiếm $\le 3,3\%$ mệnh giá rút), nằm trọn vẹn trong khoản Take Rate $\ge 10\%$ đã trích trước. |
| **3. Đổi thẻ cào điện thoại (`Viettel, Vina, Mobi`)** | - Chiết khấu đại lý chính thức chỉ `2% – 5%` (MobiFone) hoặc mua lẻ bằng đúng `100%` mệnh giá. | Giả định kế toán bảo thủ: **Giá vốn thẻ cào = `100%` mệnh giá** (mua 10k chi đúng 10k). Vì 10k Point đã được hậu thuẫn từ Escrow sau khi trích Take Rate $\ge 10\%$, sàn không bao giờ lỗ. Đặt trần rút thẻ cào `200.000đ / ngày` cho tài khoản mới dưới 30 ngày để chống rút sạch khi bị hack. |
| **4. Đổi E-Voucher Thương hiệu (`Shopee, Grab, Phúc Long, Highlands`)** | - Không có kênh đại lý sỉ chính thức chiết khấu sâu (nguồn giá rẻ trên mạng là hàng thanh lý, không hóa đơn VAT). | - **Bản chất kinh tế 1:1**: `100.000.000đ` Point đổi đúng `2.000` voucher 50k là **hòa vốn từng mã, đúng thiết kế** (sàn không bù 1 đồng nào).<br>- **Lợi nhuận sàn nằm ở Escrow trích trước**: Để có `100 triệu` Point trong hệ thống, Creator phải nạp `111,1 triệu` (SV) hoặc `133,3 triệu` (Cá nhân) $\rightarrow$ Sàn đã giữ lại từ `11,1 triệu` đến `33,3 triệu` tiền lời ròng trước khi người dùng đổi voucher.<br>- **Bỏ vĩnh viễn cơ chế `auto-replenish 25 mã`**: Hết voucher kho sàn thì hiển thị *"Hết mã"*, chỉ bổ sung khi mua thêm bằng tiền thật. |
| **5. Chi phí duy trì hạ tầng hàng tháng** | - **Oracle Always Free**: `0đ` (2 OCPU / 6GB ARM, 10TB băng thông).<br>- **Cloudflare & Tên miền DigitalPlat**: `0đ`.<br>- **Email Brevo**: `0đ` (300 mail/ngày free). Khi vượt dùng Brevo Lite `~250k - 380k VNĐ / tháng`.<br>- **Tuyệt đối không dùng SMS OTP**: Chặn chi phí Brandname `500đ - 800đ / tin`. | Chi phí cố định hàng tháng gần như bằng `0đ`. Khi hệ thống tăng trưởng có chi phí email (~300k/tháng), chỉ cần doanh thu của 1-2 đơn hàng khảo sát là bù đắp toàn bộ chi phí hạ tầng của cả tháng. |

### 2. Bảng Tính Chứng Minh Kịch Bản Xấu Nhất (Stress-Test: 100% Gói Sinh Viên, 100% Rút Ngân Hàng)

Xét trường hợp cực đoan và bất lợi nhất cho sàn: Toàn bộ đơn hàng đều là **Gói Sinh Viên (Take Rate thấp nhất = 10%)**, 100% người dùng **rút tiền qua Ngân hàng mốc 100k (Sàn chịu phí chuyển khoản)**, cổng nạp mất phí `1%`, và email chạm trần gói trả phí:

| Khoản mục thu / chi | Tỷ lệ % trên doanh thu | Số tiền trên mỗi 1.000.000 VNĐ xử lý |
| :--- | :--- | :--- |
| **Doanh thu phí sàn đã trích trước (`Take Rate 10%`)** | **`+10,0%`** | **`+100.000 VNĐ`** |
| Phí cổng thanh toán nhận tiền nạp (trần 1%) | `-1,0%` | `-10.000 VNĐ` |
| Phí chuyển khoản ngân hàng NAPAS 24/7 (10 lệnh x 3.300đ) | `-3,3%` | `-33.000 VNĐ` |
| Chi phí hạ tầng phân bổ (Email Brevo Lite) | `-1,0%` | `-10.000 VNĐ` |
| **Lợi nhuận ròng tối thiểu của Sàn (Biên an toàn cuối cùng)** | **`+4,7%`** | **`+47.000 VNĐ` (LÃI DƯƠNG)** |

*Kết luận: Ngay cả ở kịch bản khắc nghiệt nhất, sàn vẫn đạt biên lợi nhuận ròng dương **`+4,7%`**. Với Gói Cá Nhân (25%) và Doanh Nghiệp (33%-36%), biên lợi nhuận ròng đạt từ **`+19,7%` đến `+30,7%`**.*

### 3. Bảy Quy Tắc Bất Biến Chống Lỗ Sàn Tuyệt Đối (Enforced In Code)

1. **Bất biến Hậu thuẫn 1:1**: Tổng số `Point` giải ngân không bao giờ vượt quá `Credit thực thu x (1 - TakeRate)`. Mọi Point phát hành đều có 100% tiền mặt hậu thuẫn.
2. **Bất biến Giá vốn Voucher**: Giá bán `Credit` của mọi Voucher / thẻ cào trong Kho Sàn bắt buộc phải $\ge$ Giá vốn tiền mặt thực tế mua vào. Tuyệt đối không bán giảm giá Voucher dưới giá vốn.
3. **Triệt tiêu Nguồn cung Ảo**: Xóa bỏ hoàn toàn cơ chế tự động sinh 25 mã (`auto-replenish`) trong `voucherService.js`. Kho hết mã chuyển sang trạng thái disabled `[Hết mã]`.
4. **Phí Hạ tầng `VOUCHER_ONLY`**: Khảo sát thuần Voucher bắt buộc thu phí hạ tầng `400đ - 600đ / mẫu`, đảm bảo doanh thu sàn luôn $\ge$ chi phí gửi email và push thông báo.
5. **Hạch toán Chi phí Rút tiền**: Mọi khoản phí chuyển khoản ngân hàng do sàn chịu phải được ghi nhận vào tài khoản chi phí `PLATFORM_PAYOUT_COST` trên sổ cái kép, tự động đối soát: $\text{Tổng Take Rate} - \text{Tổng Payout Cost} - \text{Infra} > 0$.
6. **Khóa Van Tiền Mặt Khuyến Mãi**: Tiền thưởng nạp (2% - 10%) và thưởng đổi chéo (+5%) chỉ được phát hành dưới dạng `Credit` (Ví tạo khảo sát), tuyệt đối không cấp bằng `Point` tiền mặt.
7. **Chặn Thất Thoát Vi Phạm**: Điểm an ủi Screen-out cố định `0đ` (chỉ cộng điểm uy tín); áp dụng trần rút thẻ cào `200.000đ / ngày` đối với tài khoản mới tạo dưới 30 ngày.
