# BÁO CÁO TƯƠNG LAI HỆ THỐNG (SAU KHI TRIỂN KHAI KẾ HOẠCH) & ĐỐI CHIẾU VỚI HIỆN TẠI

- **Mục đích tài liệu**: Mô tả trạng thái vận hành đích của toàn bộ hệ thống **sau khi triển khai bản kế hoạch mới**, được bố cục **song song 1:1 với tệp `HIEN_TRANG_HE_THONG.md`** kèm bảng so sánh trực tiếp (`Hiện tại đang chạy` vs `Tương lai sau triển khai`) để dễ dàng đối chiếu từng thông số, công thức và thuật toán.
- **Tài liệu đối chiếu cặp**:
  - Hiện trạng đang chạy trong code: `HIEN_TRANG_HE_THONG.md`
  - Kế hoạch tổng thể chi tiết: `KE_HOACH_TONG_THE.md`

---

## BẢNG TỔNG HỢP ĐỐI CHIẾU NHANH: HIỆN TẠI VS TƯƠNG LAI

| Hạng mục / Cơ chế | HIỆN TẠI (Đang chạy trong code) | TƯƠNG LAI (Sau khi triển khai kế hoạch) | Lý do & Lợi ích thay đổi |
| :--- | :--- | :--- | :--- |
| **1. Tỷ giá Điểm thưởng (`Point`)** | `1 Point = 10 VNĐ` (Lệch tỷ giá với `Credit`) | **`1 Point = 1 VNĐ`** và **`1 Credit = 1 VNĐ`** (Đồng nhất 1:1 VNĐ toàn hệ thống) | Trực quan 100%, người dùng nhìn số dư biết ngay số tiền thật bằng VNĐ, không phải nhân/chia nhẩm. |
| **2. Đổi nội bộ `Point -> Credit`** | Phạt chiết khấu **-30%** (`1.000 Point` = `10.000đ` đổi chỉ còn `7.000 Credit`) | **Thưởng khuyến khích +5%** (`1.000 Point` đổi nhận **`1.050 Credit`**; tối thiểu `5.000 Point/lần`) | Khuyến khích người điền khảo sát giữ tiền lại sàn để tạo khảo sát (Điền chéo), sàn không tốn tiền mặt rút ra mà vẫn lãi $\ge 10\%$. |
| **3. Cách tính giá tạo khảo sát (CPI) & Tăng thưởng (Boost)** | Tính lẻ từng giây theo loại câu hỏi (`700đ/phút`), chỉ có 1 bảng giá chung, chưa có cơ chế chọn nấc giá hay chia thưởng tăng thêm | **Mô hình 2 Tầng**: (1) **Giá Sàn Tối Thiểu ($P_{\text{sàn}}$)** theo 3 Phân khúc $\times$ 3 độ dài Form; (2) **3 Nấc Đề Xuất** (Tiết kiệm / Đề xuất +25% / Hỏa tốc +60%) + **Tự chỉnh Boost ($\Delta P$)** chia văn minh **85/15** (SV) và **80/20** (Cá nhân/DN) cho người điền | Ở mức sàn, sàn luôn có lãi cơ sở; khi người tạo trả thêm tiền để gom mẫu nhanh, 80%-85% tiền tăng thêm vào thẳng túi người điền, sàn lãi tăng hợp lý mà không mang tiếng tham lam. |
| **4. Lượt điền form miễn phí & Hoàn thiện Profile** | Mới tạo nick tặng sẵn `1 bài free 25 mẫu` (chỉ cần xác thực email, không cần điền Profile; sàn phải tự bỏ tiền túi bù 100%) | **Bắt buộc hoàn thiện 100% Profile** mới mở khóa **25 lượt miễn phí đầu tay** (Gói Cá Nhân, đơn từ 50 mẫu) hoặc **30 lượt miễn phí/tháng** (Gói Sinh Viên `.edu.vn`, trừ 10 lượt mỗi 50 mẫu) | Thu thập được 100% dữ liệu nhân khẩu học thật và **Sàn không bao giờ phải bù lỗ tiền túi** nhờ công thức chia thù lao theo số Credit thực thu. |
| **5. Mức nạp tiền tối thiểu** | Tối thiểu `10.000đ` trong hàm backend nhưng mốc thưởng bắt đầu từ `100.000đ` (+2%) | Chuẩn hóa các mốc nạp từ **`20.000đ`** (0%), **`50.000đ`** (+2%), **`100.000đ`** (+3%), **`200.000đ`** (+4% + 1 Vé VIP) đến **`5.000.000đ+`** (+10% + 20 Vé VIP) | Sinh viên làm gói 50 mẫu chỉ cần nạp đúng `20.000đ` hoặc 100 mẫu nạp `40.000đ - 50.000đ` là chạy được ngay. |
| **6. Phí Ghim VIP + Push APK + Email** | Tách rời: Ghim bài tốn `50.000đ Credit` hoặc `1 vé`; Push/Email tính riêng | **Hợp nhất 3 trong 1 vào Vé Ghim VIP** (Ghim đầu trang + Push App APK + Gửi Email khớp Profile): Mua lẻ **`15.000đ`** (Sinh viên) hoặc **`40.000đ`** (Cá nhân/DN) | Dễ hiểu, tăng mạnh tốc độ gom mẫu cho người mua lẻ và trở thành quà tặng giá trị cao khi nạp tiền hoặc dùng Gói Doanh Nghiệp. |
| **7. Điểm an ủi khi trượt câu lọc (`Screen-out`)** | Tặng **`20 Point (200 VNĐ tiền mặt)`** lấy từ quỹ sàn + `+0.1 trust_score` | **`0 Point` (Xóa bỏ thưởng tiền mặt)**, chỉ cộng **`+0.2 điểm uy tín (`trust_score`)`** | Triệt tiêu 100% lỗ hổng bot/clone cố tình bấm sai câu hỏi sàng lọc đầu bài để cày 200đ/lượt rút ruột sàn. |
| **8. Cơ chế Voucher Tài trợ & Chống Voucher giả** | Cho phép bất kỳ ai tạo khảo sát `VOUCHER_ONLY` với giá `0đ` và tự tải mã text tùy ý | - Hỗ trợ tặng kèm **$V \le N$ Voucher** (giảm 20% CPI cho $V$ suất có Voucher; $N-V$ suất còn lại tính giá chuẩn).<br>- **Chỉ Doanh nghiệp Đã Xác Minh Pháp Nhân (Cấp 2) + Uy tín lâu năm ($\ge 3$ chiến dịch / nạp $\ge 2$ triệu, `trust_score >= 90`)** mới được tự tải mã riêng.<br>- Tài khoản khác có thể **mua số lượng nhỏ (1-5 mã) từ Kho Sàn (`10k-50k`)** để phát cho người nhanh nhất hoặc bốc thăm may mắn. | Chặn đứng 100% việc tạo Voucher giả/rác để đăng khảo sát miễn phí; đồng thời giúp chủ khảo sát chỉ tốn vài chục nghìn mua 1-5 Voucher xịn từ Kho Sàn để kích cầu. |
| **9. Định dạng câu hỏi & Cờ Bắt buộc (`is_required`)** | Hỗ trợ 8 loại cơ bản; mọi câu đều bắt buộc trả lời; chưa bóc tách dạng Lưới (Grid) và cờ `required` từ Google/MS Forms | **Hỗ trợ đủ 12 định dạng chuẩn Google Forms** (Trả lời ngắn, Đoạn, Trắc nghiệm, Hộp kiểm, Menu thả xuống, Tải tệp, Phạm vi tuyến tính, Xếp hạng sao, **Lưới trắc nghiệm**, **Lưới hộp kiểm**, Ngày, Giờ) + Công tắc `is_required` đồng bộ 100% từ Google/MS Forms | Tương thích 1:1 với toàn bộ tính năng của Google Forms & Microsoft Forms, không bị mất cấu trúc khi đồng bộ sang. |
| **10. Câu hỏi Sàng lọc Tự động (`Auto-Screener`)** | Người điền nào cũng phải trả lời lại các câu hỏi sàng lọc ở đầu bài | **Ẩn thông minh & Tự điền ngầm (`Smart Bypass & Auto-Fill`)**: Người đã khớp 100% Profile được ẩn câu lọc, vào thẳng câu 1 và hệ thống tự điền ngầm thông tin nhân khẩu học vào file xuất CSV/SPSS | Không bắt người dùng trả lời lặp đi lặp lại tuổi/giới tính/trường học mà chủ khảo sát vẫn có đủ 100% cột dữ liệu khi xuất báo cáo. |
| **11. Bẫy tốc độ (`Speed Trap`) & Câu tự luận** | Cộng `8 giây/câu tự luận` vào $T_{\min}$; câu tự luận `< 5 ký tự` bị phạt nặng `varianceFactor * 0.5` | **Câu tự luận (`OPEN_TEXT`) = `0 giây`** và **cho phép ghi số `0` hoặc từ ngắn** (*"Không"*, *"Có"*, *"Ok"*); chỉ chặn chuỗi gõ loạn phím (`asdfgh`, `aaaaaa`) | Không phạt oan người dùng thật khi câu hỏi tự luận chỉ hỏi số lượng (điền `0`) hoặc hỏi ý kiến bổ sung (điền *"Không"*). |
| **12. Bẫy tập trung (`Attention Check`)** | Gắn cố định ở cuối bài; chọn sai 1 lần là đánh trượt `0 điểm` ngay | **Chèn vị trí ngẫu nhiên động (30%-80% bài)** theo từng người làm + **Cơ chế Thêm 01 Cơ Hội sửa sai** nếu lần 1 vô tình bấm nhầm | Chống chụp màn hình phím đáp án câu bẫy và bảo vệ người dùng thật vô tình bấm trượt trên màn hình điện thoại. |
| **13. Điểm Uy Tín (`trust_score`) & Khấu trừ thưởng** | Khởi tạo `100.0`; chỉ có nhận `100%` điểm hoặc bị treo/từ chối; dưới `60` cấm rút tiền | Khởi tạo **`85 điểm`**; nộp bài hợp lệ **`+2 điểm`**; vùng $80 \le S \le 100$ nhận **100% thưởng**; vùng $40 \le S < 80$ **khấu trừ lũy tiến 1% mỗi điểm thiếu dưới 80** (tiền phạt đưa vào Quỹ Bảo hành đổi mẫu); $S < 40$ khóa nick | Tạo cơ chế răn đe mềm dẻo và cho phép người dùng làm bài nghiêm túc để cày điểm uy tín tăng trở lại. |
| **14. Điều kiện Auto-Ban Đa tài khoản** | Tự động Ban IP và khóa toàn bộ nick khi có $\ge 5$ tài khoản trùng IP HOẶC trùng thiết bị trong 24h | **Chỉ Auto-Ban khi có $\ge 3$ tài khoản trùng mã phần cứng thiết bị (`device_fingerprint`) trong 24h**; không khóa oan các máy khác nhau dùng chung IP Wi-Fi trường học / ký túc xá | Bảo vệ sinh viên cùng ngồi làm khảo sát trên mạng Wi-Fi trường đại học, thư viện hoặc ký túc xá. |
| **15. Thời hạn treo khảo sát (`expires_at`)** | Không có giới hạn thời gian; bài khảo sát kén người làm có thể nằm treo mãi mãi trên bảng tin | **Mặc định 14 ngày (tùy chọn 7 / 14 / 30 ngày kèm nút Gia hạn 7 ngày)**. Hết hạn tự động đóng bài và **tự động hoàn tiền 100% mẫu chưa thu** về ví `credit_balance` | Giữ bảng tin luôn tươi mới, không đọng rác và giải phóng tiền ký quỹ tồn đọng cho chủ khảo sát. |
| **16. Thời hạn Ghim VIP (`pinned_until`)** | Ghim vô thời hạn cho tới khi đủ mẫu | **Tối đa 07 ngày / 01 lần kích hoạt Ghim VIP**; hết 7 ngày tự động hạ ghim về vị trí tự nhiên | Chống chiếm dụng vĩnh viễn vị trí đầu trang của các bài khó, tạo cơ hội cho bài mới nổi lên. |
| **17. Cơ chế Huỷ treo sớm & Chống lách chiết khấu** | Hoàn trả toàn bộ `escrow_locked_balance` còn dư; chưa có quy tắc xử lý lượt free và chưa chống lách chiết khấu quy mô | - **Khóa cứng hoàn tiền theo `escrow_locked_balance`**: Không bao giờ hoàn vượt số tiền thực nạp.<br>- **Lượt free**: Nếu bài đã có người làm (`collected > 0`) không hoàn lượt free; chỉ hoàn lượt free khi chưa có ai làm (`collected == 0`).<br>- **Chống lách giảm giá**: Doanh nghiệp huỷ sớm trước mốc quy mô sẽ bị tính lại đơn giá gốc các mẫu đã thu + truy thu `40.000 Credit` phí Ghim/Push đã kích hoạt trước khi hoàn tiền dư.<br>- **Voucher chưa phát**: Voucher kho sàn hoàn tiền `Credit` về ví; Voucher hãng mở khóa tái sử dụng. | Bảo vệ toàn vẹn tài chính cho Sàn, ngăn chặn triệt để hành vi đăng ảo số lượng lớn để lách giảm giá và hưởng dịch vụ VIP miễn phí. |
| **18. Bố cục Trình Tạo Khảo Sát (Form Builder Layout)** | 1 cột dọc duy nhất: Toàn bộ câu hỏi, bảng giá, cài đặt và nút xuất bản xếp nối đuôi nhau từ trên xuống dưới | **Bố cục 2 Cột chuẩn Google Forms Studio**: **Cột Trái (~65%)** là Canvas thiết kế thẻ câu hỏi y hệt Google Forms (viền nhấn dọc bên trái, 6 chấm kéo thả, thanh công cụ nổi bên cạnh); **Cột Phải (~35%, Sticky)** ghim cố định bảng Giá & Đề xuất, Số mẫu, Bộ lọc, Cài đặt thời hạn và Tạm tính ký quỹ Real-time | Người tạo soạn 20-30 câu hỏi vẫn luôn nhìn thấy bảng tính giá, thù lao đáp viên và nút Xuất bản ngay bên phải mà không phải cuộn lên xuống. |

---

## PHẦN 1: HỆ THỐNG TIỀN TỆ & SỔ CÁI KẾ TOÁN KÉP TRONG TƯƠNG LAI

### 1.1. Mô hình Ví Kép Chuẩn Hóa 1:1 VNĐ (`server/db/database.js`)
Sau khi triển khai kế hoạch, bảng `users` quản lý tiền tệ và phân khúc tài khoản theo chuẩn số nguyên `INTEGER` (**`1 Đơn vị = 1 VNĐ`**):

| Trường dữ liệu (`users`) | Kiểu dữ liệu đích | Giá trị khởi tạo | Bản chất & Công dụng sau khi triển khai |
| :--- | :--- | :--- | :--- |
| `credit_balance` | `INTEGER` | `0` | **Ví Tạo Khảo Sát (`1 Credit = 1 VNĐ`)**: Dùng để khóa quỹ ký quỹ (`Escrow`), mua lẻ gói Ghim VIP (`15.000đ` / `40.000đ`), mua Voucher từ Kho Sàn (`10.000đ - 50.000đ`) và trả phụ phí bộ lọc. Khóa van 1 chiều (không rút ra tiền mặt). |
| `point_balance` | `INTEGER` | `0` | **Ví Tiền Thưởng (`1 Point = 1 VNĐ`)**: Nhận được khi hoàn thành khảo sát hợp lệ (`VALIDATED`). Dùng để rút tiền mặt (VietQR/MoMo), đổi thẻ cào, đổi E-Voucher hoặc đổi sang `Credit` (được thưởng thêm `+5%`). |
| `account_tier` | `TEXT` | `'PERSONAL'` | Phân khúc tài khoản hiện hành: `'STUDENT'` (Sinh viên `.edu.vn`), `'PERSONAL'` (Cá nhân), `'ENTERPRISE'` (Doanh nghiệp Cấp 1 hoặc Cấp 2). |
| `enterprise_Verify_level` | `INTEGER` | `0` | Cấp độ xác thực Doanh nghiệp: `0` (Chưa kích hoạt), `1` (Hồ sơ Thương hiệu Cơ bản - kích hoạt tức thì), `2` (Đã xác minh Pháp nhân MST/GPKD - xuất VAT & mở điều kiện tự tải Voucher). |
| `profile_completed` | `INTEGER` | `0` | Cờ đánh dấu đã điền đủ 100% thông tin cá nhân (`1` = Đã hoàn thiện, mở khóa 25 lượt điền form miễn phí đầu tay hoặc 30 lượt/tháng cho Sinh viên). |
| `demographic_locked_until` | `DATETIME` | `NULL` | Thời điểm hết hạn khóa 90 ngày đối với các trường nhân khẩu học cốt lõi sau khi lưu Profile. |
| `free_quota_remaining` | `INTEGER` | `0` | Số lượt điền form miễn phí còn lại (Cấp `25 lượt` 1 lần khi Cá nhân hoàn thiện Profile; hoặc làm mới `30 lượt` vào ngày 01 hàng tháng cho Sinh viên `.edu.vn`). |
| `fast_track_tickets` | `INTEGER` | `0` | **Vé Ghim VIP 3 trong 1**: Ghim khảo sát lên đầu trang + Bắn thông báo đẩy App Android APK + Gửi Email mời làm bài cho người khớp Profile. |
| `trust_score` | `REAL` | `85.0` | **Điểm Uy Tín khởi tạo ở mức `85.0`** (thang `0.0 - 100.0`), quyết định tỷ lệ % tiền thưởng thực nhận và quyền rút tiền. |

### 1.2. Tỷ giá Cơ sở 1:1 & Quy đổi Nội bộ (`Point -> Credit` thưởng +5%)
1. **Tỷ giá chuẩn toàn sàn**:
   $$\text{1 Point} = 1\text{ VNĐ}, \quad \text{1 Credit} = 1\text{ VNĐ}$$
2. **Chiều Quy đổi Nội bộ (`Point -> Credit` — Tái đầu tư / Điền chéo)**:
   - Thay vì trừ 30% như cũ, hệ thống **tặng thêm +5% giá trị** (`SWAP_BONUS_RATE = 1.05`) để khuyến khích người điền khảo sát dùng tiền thưởng tạo khảo sát của chính họ:
   $$\text{Credit nhận được} = \lfloor \text{Số Point đem đổi} \times 1.05 \rfloor$$
   - **Hạn mức quy đổi**: Tối thiểu `5.000 Point / lần` (đổi `5.000 Point` nhận ngay `5.250 Credit`).
   - Ngoài ra, ngay tại thời điểm hoàn thành khảo sát, nếu người điền chọn nhận thưởng trực tiếp vào ví `Credit` (chế độ Điền chéo), hệ thống tự động cộng thêm `+5%` vào `credit_balance` thay vì cộng vào `point_balance`.
3. **Chiều Cấm (`Credit -x-> Point / Tiền mặt`)**:
   - Giữ nguyên khóa van 1 chiều tuyệt đối.

---

## PHẦN 2: KINH TẾ HỌC 3 PHÂN KHÚC, NẠP/RÚT TIỀN & VOUCHER TRONG TƯƠNG LAI

### 2.1. Mô Hình Định Giá 2 Tầng: Giá Sàn Tối Thiểu + Đề Xuất Thông Minh + Tự Do Tăng Thưởng (`pricingService.js`)

Hệ thống kết hợp hài hòa giữa **Giá Sàn Tối Thiểu ($P_{\text{sàn}}$)** để bảo vệ công sức đáp viên và đảm bảo sàn luôn có lãi cơ sở, với **3 Nấc Giá Đề Xuất** và **Thanh trượt Tự chỉnh Tăng thưởng ($\Delta P$)** chia sẻ văn minh:

#### A. Bảng Giá Sàn Tối Thiểu ($P_{\text{sàn}}$) và Thù lao Cơ sở trên 1 Mẫu

| Phân khúc Tài khoản | Độ dài Bảng hỏi | Giá Sàn Tối Thiểu ($P_{\text{sàn}}$) | Thù lao Người điền ở Mức Sàn ($R_{\text{sàn}}$) | Phí Sàn cơ sở ở Mức Sàn ($F_{\text{sàn}}$) | Phụ phí Bộ lọc & Auto-Screener | Giới hạn Quy mô Mẫu |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1. GÓI SINH VIÊN**<br>*(Profile 100% + Email `.edu.vn`)* | - Ngắn ($\le 10$ câu)<br>- Vừa ($11 - 25$ câu)<br>- Dài ($> 25$ câu) | - **`400 Credit`**<br>- **`500 Credit`**<br>- **`600 Credit`** | - Có dùng lượt free: **`280 / 360 / 430 Point`**<br>- Không dùng lượt free: **`350 / 450 / 540 Point`** | **10% - 12%**<br>*(40đ - 60đ/mẫu — Sàn luôn lãi cơ sở)* | - Đại trà: **`0đ`**<br>- Có lọc: **`+100đ/mẫu`** *(+50đ cho đáp viên, +50đ về sàn)* | Tối đa **`300 mẫu / bài`**<br>*(Tối đa 3 bài/học kỳ)* |
| **2. GÓI CÁ NHÂN**<br>*(Người dùng thường)* | - Ngắn ($\le 10$ câu)<br>- Vừa ($11 - 25$ câu)<br>- Dài ($> 25$ câu) | - **`800 Credit`**<br>- **`1.000 Credit`**<br>- **`1.200 Credit`** | - Có dùng 25 lượt free bài đầu: Chia theo Credit thực nạp<br>- Chuẩn không dùng free: **`600 / 750 / 900 Point`** | **25%**<br>*(200đ - 300đ/mẫu)* | - Đại trà: **`0đ`**<br>- Có lọc: **`+200đ/mẫu`** *(+150đ cho đáp viên, +50đ về sàn)* | Tối đa **`500 mẫu / bài`** |
| **3. GÓI DOANH NGHIỆP**<br>*(Công ty, Startup, Shop)* | - Ngắn ($\le 10$ câu)<br>- Vừa ($11 - 25$ câu)<br>- Dài ($> 25$ câu) | - **`1.500 Credit`**<br>- **`2.000 Credit`**<br>- **`2.500 Credit`** | - **`1.000 Point`**<br>- **`1.300 Point`**<br>- **`1.600 Point`** | **33% - 36% giá gốc**<br>*(hoặc 23,5% - 27,8% sau chiết khấu lớn)* | **Miễn phí 100%**<br>*(Bao gồm lọc thương mại sâu & Auto-Screener)* | **Không giới hạn**<br>*(5.000+ mẫu)* |

#### B. Ba Nấc Giá Đề Xuất Theo Thời Gian Gom Mẫu (SLA) & Tự Do Tăng Thưởng (Creator Boost)

1. **Ba Nấc Lựa Chọn Nhanh Trên Giao Diện**:
   - **Nấc 1 - Mức Sàn Tiết Kiệm ($P = P_{\text{sàn}}$)**: Thời gian gom mẫu ước tính **3 – 5 ngày**. Phù hợp bài không gấp, sinh viên tối ưu chi phí.
   - **Nấc 2 - Mức Đề Xuất Tiêu Chuẩn ($P = P_{\text{sàn}} + 25\%$)**: Thời gian gom mẫu ước tính **24 – 48 giờ**. Mặc định khuyên dùng (70% người tạo lựa chọn).
   - **Nấc 3 - Mức Gom Hỏa Tốc ($P \ge P_{\text{sàn}} + 60\% \text{ đến } 100\%+$ hoặc tự nhập)**: Thời gian gom mẫu ước tính **2 – 6 giờ**. Gắn huy hiệu `[Thưởng Cao]` ưu tiên nổi bật.
2. **Cơ Chế Phân Chia Phần Tiền Tăng Thêm ($\Delta P = P_{\text{thực trả}} - P_{\text{sàn}}$) Không Tham Lam**:
   - **Gói Sinh Viên**: **Người điền nhận `85%`** của $\Delta P$ — **Sàn thu thêm `15%`** của $\Delta P$ ($\alpha = 0.85$).
   - **Gói Cá Nhân & Doanh Nghiệp**: **Người điền nhận `80%`** của $\Delta P$ — **Sàn thu thêm `20%`** của $\Delta P$ ($\alpha = 0.80$, tròn số, bù đắp chi phí cổng thanh toán, miễn phí rút tiền và hóa đơn VAT).
   - **Công thức tính toán**:
     $$\text{Thù lao Người điền} = R_{\text{sàn}} + \lfloor \alpha \times \Delta P \rfloor$$
     $$\text{Lợi nhuận Sàn} = F_{\text{sàn}} + \big(\Delta P - \lfloor \alpha \times \Delta P \rfloor\big)$$

#### B. Công thức Toán học Bảo toàn Lợi nhuận Sàn khi Áp dụng Lượt Miễn phí (`Escrow Thực Thu`)
Khi người tạo sử dụng $F_{\text{free}}$ lượt điền form miễn phí cho đơn hàng có tổng số mẫu $N$ ($N \ge 50$):
1. **Số mẫu phải trả tiền thực tế**:
   $$N_{\text{paid}} = N - F_{\text{free}}$$
   - Với **Gói Cá Nhân (Bài đầu tiên sau khi hoàn thiện 100% Profile)**: $F_{\text{free}} = 25$ (cho đơn $N \ge 50$).
   - Với **Gói Sinh Viên (`.edu.vn` + hoàn thiện 100% Profile)**: Cứ mỗi mốc $50$ mẫu được sử dụng tối đa $10$ lượt miễn phí trong quỹ `30 lượt/tháng`:
     $$F_{\text{free}} = \min\left(\text{free\_quota\_remaining}, \left\lfloor \frac{N}{50} \right\rfloor \times 10, 30\right)$$
2. **Tổng số Credit thực thu khóa vào Escrow (`TotalEscrow`)**:
   $$\text{TotalEscrow} = (N_{\text{paid}} \times \text{CPI}_{\text{gốc}}) + (N \times \text{Phụ phí lọc})$$
3. **Thù lao trả cho mỗi đáp viên (`RewardPointsPerResponse`)**:
   Hệ thống tự động chia quỹ trả thưởng từ đúng số tiền thực thu sau khi đã giữ lại phần trăm phí sàn (`Take Rate`), đảm bảo **Sàn không bao giờ phải xuất tiền túi bù cho lượt miễn phí**:
   $$\text{RewardPointsPerResponse} = \left\lfloor \frac{\text{TotalEscrow} \times (1 - \text{TakeRate})}{N} \right\rfloor$$

#### C. Công thức Chiết khấu Quy mô (`Volume Discount`) & Tặng kèm Voucher ở Gói Doanh Nghiệp
1. **Khi Doanh nghiệp KHÔNG tự tải Voucher riêng (Áp dụng Chiết khấu Quy mô Mẫu)**:
   - Quy mô $100 \le N < 300$: Giữ nguyên đơn giá gốc + **Tặng miễn phí gói Đẩy Email & Push APK** (trị giá `40.000đ`).
   - Quy mô $300 \le N < 500$: **Giảm trực tiếp 10% tổng đơn giá CPI** + Tặng Đẩy Email & Push APK.
   - Quy mô $N \ge 500$: **Giảm trực tiếp 15% tổng đơn giá CPI** + Tặng Ghim VIP đầu trang + Đẩy Email & Push APK.
2. **Khi Doanh nghiệp Đã Xác Minh & Uy Tín tự tải $V$ mã Voucher của hãng ($V \le N$)**:
   - $V$ suất có kèm Voucher được **giảm 20% đơn giá CPI** ($\text{CPI}_{\text{voucher}} = 0.80 \times \text{CPI}_{\text{chuẩn}}$, lưu ý không cộng dồn với giảm 10%-15% quy mô mà áp dụng mức giảm cao nhất là 20% trên $V$ suất đó).
   - $(N - V)$ suất không có Voucher còn lại áp dụng đơn giá chuẩn (hoặc chiết khấu quy mô nếu có).
   - Tổng ký quỹ:
     $$\text{TotalEscrow} = (V \times \text{CPI}_{\text{voucher}}) + \big((N - V) \times \text{CPI}_{\text{không voucher}}\big)$$
   - Giải ngân: Người nhận được Voucher nhận `800 / 1.100 / 1.350 Point + 1 Voucher`; người hoàn thành khi đã hết Voucher (hoặc không trúng Lucky Drop) nhận đủ `1.000 / 1.300 / 1.600 Point` tiền mặt.
3. **Khi Mua Số Lượng Nhỏ Voucher (1 – 5 mã) từ Kho Sàn (`Platform Catalog`) để Kích cầu**:
   - Bất kỳ phân khúc nào (Sinh viên, Cá nhân, Doanh nghiệp mới) đều có thể chọn mua thêm $k$ mã Voucher chính hãng có sẵn trong Kho Sàn (mệnh giá `10.000đ`, `20.000đ`, `30.000đ`, `50.000đ`) gắn vào bài khảo sát:
     $$\text{TotalEscrow}_{\text{tổng}} = \text{TotalEscrow}_{\text{mẫu}} + \sum_{i=1}^{k} \text{Giá trị Voucher}_{i}$$
   - Tùy chọn phát theo **Ai nhanh nhận trước (`First-Come, First-Served`)** hoặc **Bốc thăm ngẫu nhiên (`Lucky Drop`)**.

---

### 2.2. Chính sách Nạp tiền, Thưởng Bậc thang & Vé Ghim VIP Mới (`ledgerService.js`)

Hạ ngưỡng nạp tối thiểu xuống **`20.000 VNĐ`** và cập nhật bảng thưởng bậc thang:

| Mốc Nạp (`amountVnd`) | Thưởng Credit (`bonusPercent`) | Credit Cộng Thêm | Tổng Credit Nhận | Vé Ghim VIP Tặng Kèm (`fast_track_tickets`) | Xuất Hóa Đơn Đỏ VAT |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`20.000 – 49.999 VNĐ`** | `0%` | `0` | `20.000` | `0 vé` | Không |
| **`50.000 – 99.999 VNĐ`** | **`+2%`** | `+1.000` | `51.000` | `0 vé` | Không |
| **`100.000 – 199.999 VNĐ`** | **`+3%`** | `+3.000` | `103.000` | `0 vé` | Không |
| **`200.000 – 499.999 VNĐ`** | **`+4%`** | `+8.000` | `208.000` | **`+1 Vé VIP`** | Có (Từ `200.000đ`) |
| **`500.000 – 999.999 VNĐ`** | **`+5%`** | `+25.000` | `525.000` | **`+2 Vé VIP`** | Có (Full VAT) |
| **`1.000.000 – 1.999.999 VNĐ`** | **`+6%`** | `+60.000` | `1.060.000` | **`+4 Vé VIP`** | Có (Full VAT) |
| **`2.000.000 – 4.999.999 VNĐ`** | **`+8%`** | `+160.000` | `2.160.000` | **`+8 Vé VIP`** | Có (Full VAT) |
| **`>= 5.000.000 VNĐ`** | **`+10%`** | `+500.000` | `5.500.000` | **`+20 Vé VIP`** | Có (Full VAT) |

---

### 2.3. Chính sách Rút tiền, Đổi Thẻ cào & Đổi E-Voucher theo Tỷ giá 1:1 (`1 Point = 1 VNĐ`)

| Kênh Rút / Quy đổi | Số Point Yêu Cầu (`1 Point = 1 VNĐ`) | Giá Trị Thực Nhận (`VNĐ`) | Phí Giao Dịch | Điều kiện Điểm Uy Tín (`trust_score`) |
| :--- | :--- | :--- | :--- | :--- |
| **Thẻ cào Phá băng (Lần đầu)** | **`10.000 Point`** | Thẻ cào **`10.000 VNĐ`** | **`0đ`** | Lần rút đầu tiên của tài khoản, `trust_score >= 60.0` |
| **Thẻ cào Tiêu chuẩn** | **`20.000 / 50.000 / 100.000 Point`** | Thẻ cào **`20k / 50k / 100k`** | **`0đ`** | Không giới hạn số lần, `trust_score >= 60.0` |
| **Kho E-Voucher Thương hiệu** | **`10.000 / 20.000 / 30.000 / 50.000 / 100.000 Point`** | Voucher tương ứng **`10k – 100k`** | **`0đ`** | Cấp mã tức thì, `trust_score >= 60.0` |
| **Ngân hàng VietQR / MoMo (< 100k)** | **`50.000 Point`** | Nhận thực **`48.000 VNĐ`** | **`2.000đ`** | `trust_score >= 60.0` |
| **Ngân hàng VietQR / MoMo (>= 100k)** | **`100.000 / 200.000 / 500.000 Point`** | Nhận đủ **`100k / 200k / 500k`** | **`0đ`** | Miễn phí rút từ `100.000đ`, `trust_score >= 60.0` |

---

## PHẦN 3: CÁC THUẬT TOÁN KỸ THUẬT TRONG TƯƠNG LAI (SAU KHI NÂNG CẤP)

### 3.1. Thuật toán Chống Gian Lận 5 Chốt Chặn Thế Hệ Mới (`server/services/antiFraudService.js`)

#### Chốt chặn 1: Bẫy tốc độ làm bài (`Speed Trap` — Loại bỏ hoàn toàn thời gian câu tự luận)
- **Thay đổi cốt lõi so với hiện tại**:
  - Câu hỏi Tự luận (`OPEN_TEXT`) được gán thời gian tối thiểu bằng **`0 giây`** (thay vì `8 giây` như cũ) vì người điền có thể chỉ nhập một con số (như `0`) hoặc từ ngắn (*"Không"*).
  - Chỉ tính thời gian chuẩn $T_{\text{standard}}$ trên các câu hỏi trắc nghiệm và thang đo (Trắc nghiệm `10 - 12 giây/câu`, Thang đo Likert `12 - 15 giây/câu`).
- **Quy tắc phân loại theo tỷ lệ thời gian thực tế $D$ so với $T_{\text{standard}}$**:
  - Nếu $D < 0.35 \times T_{\text{standard}}$ (Dưới 35% thời gian chuẩn): **Từ chối ngay lập tức (`REJECTED_FRAUD`)**, không trả thưởng, trừ **`-12.0 điểm uy tín`**.
  - Nếu $0.35 \times T_{\text{standard}} \le D < 0.60 \times T_{\text{standard}}$ (Từ 35% đến dưới 60%): Đánh dấu **Nghi vấn (`SUSPICIOUS`)**, trừ **`-5.0 điểm uy tín`**.
  - Nếu $D \ge 0.60 \times T_{\text{standard}}$: Đạt chuẩn tốc độ.

#### Chốt chặn 2: Bẫy Tập trung Động + Cơ chế Thêm 01 Cơ Hội (`Dynamic Attention Check & Second-Chance Grace`)
- **Thay đổi cốt lõi so với hiện tại**:
  1. **Vị trí động ngẫu nhiên (30% – 80% tiến độ bài)**: Không lưu cứng câu hỏi bẫy ở cuối bài trong DB. Khi mỗi đáp viên mở phiên làm bài, hệ thống chèn câu hỏi bẫy vào vị trí ngẫu nhiên giữa bài kèm đáp án kỳ vọng ngẫu nhiên.
  2. **Cơ chế "Thêm 01 Cơ Hội" (Second-Chance Grace)**:
     - **Lần 1**: Nếu chọn đúng $\rightarrow$ Đi tiếp bình thường. Nếu chọn sai lần 1 $\rightarrow$ Chưa đánh trượt, hiển thị cảnh báo nhắc đọc kỹ và sinh thêm **01 câu hỏi xác nhận thứ hai (Cơ hội sửa sai)** ở ngay bước tiếp theo với đáp án yêu cầu mới.
     - **Lần 2**: Nếu chọn đúng ở lần 2 $\rightarrow$ Vẫn công nhận **Hợp lệ 100% (`VALIDATED`)** và không trừ điểm uy tín. Chỉ khi **chọn sai cả 2 lần liên tiếp** mới đánh trượt **`REJECTED_FRAUD`** và trừ **`-12.0 điểm uy tín`**.

#### Chốt chặn 3: Phát hiện Chọn 1 Cột Thẳng Hàng (`Straight-lining Variance`)
- Với bài khảo sát có từ **5 câu hỏi thang đo (`LIKERT_SCALE` / `RATING_STARS`)** trở lên:
  - Tính phương sai toán học $\sigma^2$ của dãy giá trị đã chọn.
  - Nếu $\sigma^2 = 0$ (chọn 1 cột duy nhất từ đầu đến cuối) $\rightarrow$ Đánh dấu **Nghi vấn (`SUSPICIOUS`)**, trừ **`-5.0 điểm uy tín`**.

#### Chốt chặn 4: Bộ lọc Câu trả lời Tự luận Rác (`Open-Text Filter` — Hợp lệ hóa số `0` và từ ngắn)
- **Thay đổi cốt lõi so với hiện tại**:
  - Xóa bỏ quy tắc phạt câu trả lời `< 5 ký tự`.
  - **Chấp nhận hợp lệ 100%** các câu trả lời là chữ số (ví dụ: `"0"`, `"1"`, `"2"`) hoặc từ ngắn có nghĩa trong tiếng Việt (`"Không"`, `"Có"`, `"Chưa"`, `"Bình thường"`, `"Ok"`, `"Không có"`...).
  - Chỉ gắn cờ khi phát hiện chuỗi gõ loạn bàn phím vô nghĩa (`asdfgh`, `qwerty`) hoặc lặp 1 ký tự liên tiếp $\ge 5$ lần (`aaaaaa`, `111111`).

#### Chốt chặn 5: Khấu trừ Thưởng Lũy tiến theo Điểm Uy Tín (`Reputation-Weighted Payout`) & Quỹ Bảo hành Đổi mẫu
- **Điểm uy tín khởi tạo**: **`85.0 điểm`**.
- **Biến động điểm uy tín (`trust_score`)**:
  - Hoàn thành bài hợp lệ (`VALIDATED`): **`+2.0 điểm`** (tối đa `100.0`).
  - Dừng ở câu hỏi sàng lọc (`SCREENED_OUT`): **`+0.2 điểm`** (nhận `0 Point` tiền mặt).
  - Bài làm bị gắn cờ Nghi vấn (`SUSPICIOUS`): **`-5.0 điểm`**.
  - Bài làm bị Từ chối (`REJECTED_FRAUD`): **`-12.0 điểm`** (nhận `0 Point`).
- **Công thức tính Điểm thưởng thực nhận theo `trust_score` ($S$)**:
  1. **Vùng Chuẩn / Tốt ($80 \le S \le 100$)**:
     $$\text{Point}_{\text{thực nhận}} = \text{RewardPoints}_{\text{gốc}} \quad (100\%)$$
  2. **Vùng Cảnh báo ($40 \le S < 80$ — Khấu trừ 1% cho mỗi điểm thiếu dưới mốc 80)**:
     $$\text{Point}_{\text{thực nhận}} = \left\lfloor \text{RewardPoints}_{\text{gốc}} \times \left(1 - \frac{80 - S}{100}\right) \right\rfloor$$
     *(Phần Point bị khấu trừ được giữ lại trong Quỹ Bảo Hành của khảo sát để tài trợ cho tính năng **Bảo hành 1 đổi 1** của Gói Doanh Nghiệp; từ $40 \le S < 60$ vẫn được làm bài để cày điểm uy tín lên lại nhưng tạm khóa rút tiền cho đến khi $S \ge 60$).*
  3. **Vùng Vi phạm Nghiêm trọng ($S < 40$)**:
     - Tự động khóa tài khoản (`status = 'BANNED'`), chặn làm bài và chặn rút tiền.

#### Chốt chặn Bổ trợ: Bảo vệ Mạng Wi-Fi Trường Đại học / Ký túc xá (`trackAndVerifyDeviceIp`)
- **Thay đổi cốt lõi so với hiện tại**:
  - Tách biệt kiểm tra địa chỉ IP (`ip_address`) và mã định danh phần cứng thiết bị (`device_fingerprint`).
  - **Chỉ tự động khóa tài khoản (`Auto-Ban`) khi phát hiện $\ge 3$ tài khoản cùng chia sẻ chung 1 mã phần cứng thiết bị (`device_fingerprint`) trong vòng 24 giờ**.
  - Trường hợp nhiều sinh viên dùng các điện thoại/laptop khác nhau (`device_fingerprint` khác nhau) nhưng kết nối cùng 1 địa chỉ IP Wi-Fi của trường học, thư viện hoặc ký túc xá thì **hoàn toàn hợp lệ và không bị khóa**.

---

### 3.2. Thuật toán Sàng lọc Thích ứng (`Adaptive Auto-Screener`) & Tự động Điền ngầm (`Auto-Fill CSV/SPSS`)

1. **Khi Người điền đã Hoàn thiện 100% Profile và Khớp 100% Tiêu chí lọc (`Smart Bypass & Auto-Fill`)**:
   - Hệ thống **ẩn hoàn toàn** các câu hỏi sàng lọc đầu bài (`is_screener = 1`) để người điền vào thẳng câu hỏi chính số 1.
   - Đồng thời, Backend **tự động chèn ngầm (`Auto-Fill`)** các giá trị nhân khẩu học từ Profile của người điền (Giới tính, Độ tuổi, Tỉnh/Thành phố, Trường học, Ngành học, Nghề nghiệp, Thu nhập) vào bản ghi kết quả (`answersPayload`) để khi chủ khảo sát xuất file **CSV / SPSS** hoặc đồng bộ **Google Sheets**, toàn bộ các cột nhân khẩu học đều có đủ 100% dữ liệu.
2. **Khi Người điền Chưa hoàn thiện Profile (`Front-Gate Screener`)**:
   - Hiển thị các câu hỏi sàng lọc ở ngay đầu bài. Nếu trả lời khớp mới được vào làm bài chính; nếu không khớp thì dừng bài ngay (`0 Point`, cộng `+0.2 điểm uy tín`) để không làm bẩn dữ liệu khảo sát.

---

### 3.3. Thiết Kế Lại Giao Diện Tạo Form Chuẩn Google Forms: Bố Cục 2 Cột Studio & 12 Định Dạng Câu Hỏi

1. **Bố Cục 2 Cột Studio (Two-Column Layout)**:
   - **Cột Trái (~65% Canvas)**:
     - Thẻ Tiêu đề Form có dải màu nhấn Cam Vibe trên đỉnh (`Top Accent Bar`).
     - Thẻ Câu hỏi Active chuẩn Google Forms: Có viền màu nhấn dọc bên trái (4px), cụm 6 chấm kéo thả sắp xếp (`Drag Handle`), ô nhập câu hỏi có nút thêm ảnh, menu chọn 12 định dạng câu hỏi bên phải, ô nhập các phương án lựa chọn hoặc bảng Hàng $\times$ Cột.
     - Thanh công cụ nổi dọc bên cạnh: `(+) Thêm câu hỏi`, `Nhập câu hỏi nhanh`, `(Tt) Thêm tiêu đề`, `Thêm hình ảnh`, `Thêm phần`.
     - Chân thẻ: Nút `Nhân bản (Duplicate)`, nút `Xóa (Trash)`, vạch ngăn dọc, công tắc bật/tắt `Bắt buộc` (`is_required`) và Menu 3 chấm mở rộng.
   - **Cột Phải (~35% Sticky Sidebar - Ghim cố định khi cuộn)**:
     - Gom toàn bộ chức năng Giá, Ngân sách, Phân khúc và Cài đặt vào cột riêng để quan sát trực quan theo thời gian thực:
       1. Khối Phân khúc (`Sinh Viên` / `Cá Nhân` / `Doanh Nghiệp`) và Số mẫu mục tiêu.
       2. Khối Định giá: 3 Nấc lựa chọn (`Mức Sàn Tiết Kiệm 3-5 ngày` / `Mức Đề Xuất 24-48h` / `Mức Hỏa Tốc 2-6h`) + Thanh trượt Boost chia tiền 85/15 hoặc 80/20.
       3. Khối Bộ lọc Đối tượng & Auto-Screener.
       4. Khối Cài đặt Form: Thời hạn treo (`7 / 14 / 30 ngày`), Ghim VIP 7 ngày, Voucher, Google Sheets Webhook.
       5. Khối Bảng tạm tính ký quỹ Escrow real-time & Nút `[Lưu Bản Nháp]` / `[Xuất Bản Khảo Sát]`.
2. **Danh Mục Đầy Đủ 12 Định Dạng Câu Hỏi Chuẩn Google Forms**:
   - `SHORT_TEXT` (Trả lời ngắn 1 dòng)
   - `PARAGRAPH` (Đoạn văn tự luận dài)
   - `SINGLE_CHOICE` (Trắc nghiệm tròn Radio - 1 đáp án, có tùy chọn "Khác...")
   - `MULTIPLE_CHOICE` (Hộp kiểm vuông Checkbox - Nhiều đáp án)
   - `DROPDOWN` (Menu thả xuống)
   - `FILE_UPLOAD` (Tải tệp đính kèm $\le 5\text{MB}$)
   - `LINEAR_SCALE` (Phạm vi tuyến tính 1-5 hoặc 1-10 có nhãn 2 đầu mút)
   - `RATING_STARS` (Đánh giá xếp hạng 1-5 Sao)
   - `CHOICE_GRID` (Lưới trắc nghiệm Ma trận Hàng $\times$ Cột chọn 1; có công tắc *"Yêu cầu một phản hồi trong mỗi hàng"*)
   - `CHECKBOX_GRID` (Lưới hộp kiểm Ma trận Hàng $\times$ Cột chọn nhiều)
   - `DATE_INPUT` (Bộ chọn Ngày / Tháng / Năm)
   - `TIME_INPUT` (Bộ chọn Giờ : Phút)

---

### 3.4. Thuật toán Đồng bộ & Nhận diện Tự động 100% Dạng Câu hỏi từ Google Forms, Microsoft Forms & Smart Paste

1. **Bóc tách Tự động từ Google Forms (`FB_PUBLIC_LOAD_DATA_`)**:
   - Ánh xạ mã `item[3]`: `0 -> SHORT_TEXT`, `1 -> PARAGRAPH`, `2 -> SINGLE_CHOICE`, `3 -> DROPDOWN`, `4 -> MULTIPLE_CHOICE`, `5 -> LINEAR_SCALE`, `7 -> CHOICE_GRID / CHECKBOX_GRID` (tự động phân giải mảng `item[4]` thành danh sách `rows` và `columns`), `9 -> DATE_INPUT`, `10 -> TIME_INPUT`, `13 -> FILE_UPLOAD`, `18 -> RATING_STARS`.
   - Trích xuất cờ bắt buộc `qData[2] === 1 -> is_required = 1`.
2. **Bóc tách Tự động từ Microsoft Forms (`OfficeFormServerInfo` / `runtimeForms`)**:
   - Ánh xạ `Question.Choice` (Single/Multi/Dropdown), `Question.TextField` (Short/Long), `Question.Rating`, `Question.MatrixChoiceGroup` / `Likert` (`CHOICE_GRID` / `CHECKBOX_GRID`), `Question.DateTime`, `question.required`.
3. **Smart Text Paste**:
   - Tự động nhận diện cú pháp các dạng câu hỏi, danh sách đáp án, bảng lưới và dấu `*` ở tiêu đề để gán đúng loại và cờ `is_required`.

---

## PHẦN 4: THỜI HẠN TREO KHẢO SÁT, GHIM VIP & QUY TẮC HOÀN TIỀN KHI HẾT HẠN / HUỶ SỚM TRONG TƯƠNG LAI

### 4.1. Thời Hạn Treo Khảo Sát Tự Động (`expires_at`)
- **Thiết lập trong Schema DB**: Thêm cột `expires_at DATETIME` và `pinned_until DATETIME` vào bảng `surveys`.
- **Tùy chọn thời hạn**: Khi tạo khảo sát, người tạo chọn thời hạn hiển thị: **7 ngày**, **14 ngày** (mặc định), hoặc **30 ngày**.
- **Cơ chế kiểm tra hết hạn tự động**:
  - Cronjob / Background Worker (hoặc trigger kiểm tra khi truy vấn bảng tin) quét các khảo sát có `status = 'ACTIVE' AND expires_at < CURRENT_TIMESTAMP`.
  - Tự động chuyển `status = 'CLOSED'`.
  - Tự động hoàn trả số dư `escrow_locked_balance` còn dư về `users.credit_balance` của chủ khảo sát với bút toán `ESCROW_REFUND`.
  - Thu hồi các mã Voucher chưa phát từ Kho Sàn và hoàn lại `Credit` cho chủ khảo sát; mở khóa mã Voucher của Doanh nghiệp.

### 4.2. Giới Hạn Thời Gian Ghim VIP (`pinned_until = CURRENT_TIMESTAMP + 7 days`)
- Mỗi lần dùng vé `fast_track_tickets` hoặc trả phí ghim: Đặt `is_pinned = 1` và `pinned_until = datetime('now', '+7 days')`.
- Sau 7 ngày, hệ thống tự động reset `is_pinned = 0`. Nếu bài hoàn thành đủ 100% mẫu trước 7 ngày, hệ thống cũng tự động hoàn tất và hạ ghim.

### 4.3. Quy Tắc Hoàn Tiền An Toàn Tuyệt Đối Khi Chủ Động Huỷ Treo Sớm (`closeSurvey`)
Khi chủ khảo sát chủ động bấm **`[Đóng / Huỷ khảo sát]`** trước thời hạn:

1. **Công thức hoàn tiền mẫu chưa thu (Khóa cứng theo `escrow_locked_balance`, triệt tiêu lỗi hoàn tiền vượt số tiền nạp khi dùng lượt free)**:
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