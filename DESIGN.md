# BỘ QUY CHUẨN THIẾT KẾ GIAO DIỆN VIBESURVEY (DESIGN.MD)
> **Single Source of Truth (SSOT) cho toàn bộ UI/UX của VibeSurvey (Web SPA & Android Native App)**  
> *Áp dụng bắt buộc cho tất cả các AI Agent và Developer tiếp quản hoặc phát triển tính năng mới.*

---

## 1. Triết Lý Thiết Kế & Không Gian Thị Giác (Atmosphere & Philosophy)

- **Phong cách cốt lõi**: **Minimalist Modern SaaS & Fintech Bento Grid** (cảm hứng từ *Linear, Stripe, Raycast*).
- **Nguyên tắc định hướng**:
  - Tối giản, sắc sảo, dứt khoát.
  - Tương phản cao, bố cục lưới phân cấp chặt chẽ, sạch sẽ.
  - Không trang trí rườm rà, không hiệu ứng hào nhoáng dư thừa.
  - Mọi thành phần hiển thị đều phải phục vụ một mục đích cụ thể về trải nghiệm người dùng (UX) và tính minh bạch tài chính (Fintech).

---

## 2. Bảng Màu Chuẩn (Color System - Quy Tắc 3 Màu Cốt Lõi)

> [!IMPORTANT]
> **Bộ 3 Màu Chủ Đạo Bắt Buộc**: **CAM (Accent) - TRẮNG (Light Base) - ĐEN (Dark Base)**.  
> Tuyệt đối không tự ý thêm các gam màu xanh ngọc (Teal), hổ phách (Amber), tím (Indigo/Violet), xanh neon chói lóa vào giao diện.

### 2.1. Màu Điểm Nhấn Thương Hiệu (Brand Accent: Cam Vibe)
- **Primary Orange**: `#EA580C` (`orange-600`) - Sử dụng cho CTA chính, điểm thưởng, viền active, thanh tiến độ chính.
- **Hover / Light Orange**: `#F97316` (`orange-500`) - Hiệu ứng hover nút bấm, highlight tương tác.
- **Deep / Pressed Orange**: `#C2410C` (`orange-700`) - Trạng thái nhấn (active state), viền đậm.
- **Subtle Orange Tint**: `rgba(234, 88, 12, 0.08)` hoặc `#FFF7ED` (`orange-50`) - Nền chip điểm thưởng, hover nhạt trên nền sáng.

### 2.2. Nền Tảng Trắng (Light Mode)
- **Base Background**: `#FFFFFF` (Nền chính) và `#FAFAFA` (`stone-50` / `zinc-50` cho nền trang tổng thể).
- **Surface / Card**: `#FFFFFF` với viền mảnh sắc nét `border border-stone-200` (`#E7E5E4`).
- **Text Chính**: `#09090B` (`zinc-950`) hoặc `#18181B` (`zinc-900`) - Độ tương phản tối đa.
- **Text Phụ (Muted)**: `#71717A` (`zinc-500`) hoặc `#52525B` (`zinc-600`).

### 2.3. Nền Tảng Đen (Dark Mode - Obsidian Charcoal)
- **Base Background**: `#09090B` (`zinc-950` - Đen than chì phẳng, không bị ám tím hay xanh).
- **Surface / Card**: `#18181B` (`zinc-900`) với viền mảnh `border border-stone-800` (`#27272A`).
- **Header Nav Dark Mode**: Nền phẳng trong suốt `background: transparent !important`, border không bóng đổ, tab active gạch chân cam thanh mảnh.
- **Text Sáng**: `#FAFAFA` (`zinc-50`) cho tiêu đề, `#A1A1AA` (`zinc-400`) cho mô tả.

### 2.4. Màu Báo Trạng Thái Chức Năng (Semantic Status Colors)
- **Thành công (Success / Validated)**: `#16A34A` (`green-600`) - Chỉ dùng cho badge đã duyệt / hoàn thành.
- **Cảnh báo / Tạm dừng (Warning / Paused)**: `#D97706` (`amber-600`) - Dùng hạn chế cho cảnh báo bảo mật.
- **Nguy hiểm / Hủy (Danger / Banned)**: `#DC2626` (`red-600`) - Dùng cho nút hủy, lỗi form, thông báo vi phạm.
- **Trung tính (Neutral / Closed)**: `#71717A` (`zinc-500`) - Dùng cho khảo sát đã đóng, nút disabled.

### 2.5. Quy Định Màu Nhận Diện 3 Gói Tài Khoản (Tràn Viền `border: none` - Thích Ứng Light / Dark Mode)

Ba phân khúc tài khoản sử dụng trực tiếp **3 màu cốt lõi (Trắng Kem — Cam — Đen)** với thiết kế **màu đặc tràn viền (`border: none`, không bo viền bao quanh)** và tự động điều chỉnh sắc độ nền để không bao giờ bị chìm vào nền trang ở cả Light Mode (`#FFFFFF`) lẫn Dark Mode (`#09090B`):

| Phân khúc Gói | Đại diện Màu Cốt Lõi | Nền Tràn Viền ở Light Mode (`border: none`) | Nền Tràn Viền ở Dark Mode (`border: none`) | Màu Chữ & Nhãn Ghi Rõ Gói |
| :--- | :--- | :--- | :--- | :--- |
| **1. Gói Sinh Viên**<br>*(Student `.edu.vn`)* | **Tông TRẮNG KEM SỨ**<br>*(Academic Cream)* | **Nền Kem Cam Sứ `#FFF7ED`** (`orange-50`) tràn viền + `shadow-sm` nhẹ (tách khối rõ trên nền trang trắng `#FFFFFF` mà không cần viền). | **Nền Trắng Sứ `#FAFAFA` / `#FFF7ED`** tràn viền (nổi bật hoàn toàn trên nền trang đen `#09090B`). | - **Chữ chính**: Đen đậm `#09090B`.<br>- **Số liệu**: Cam đậm `#C2410C`.<br>- **Nhãn ghi rõ**: **`GÓI SINH VIÊN (.EDU.VN)`** |
| **2. Gói Cá Nhân**<br>*(Người dùng thường)* | **Tông CAM VIBE**<br>*(Signature Orange)* | **Nền Cam `#EA580C`** (`linear-gradient(135deg, #F97316, #EA580C)`) tràn viền 100%. | **Nền Cam `#EA580C`** (`linear-gradient(135deg, #F97316, #EA580C)`) tràn viền 100%. | - **Chữ & Số liệu**: Trắng tinh khiết `#FFFFFF`.<br>- **Nhãn ghi rõ**: **`GÓI CÁ NHÂN (NGƯỜI THƯỜNG)`** |
| **3. Gói Doanh Nghiệp**<br>*(Enterprise / VIP)* | **Tông ĐEN OBSIDIAN**<br>*(Black / Graphite Card)* | **Nền Đen Obsidian `#09090B`** tràn viền 100% (tương phản tuyệt đối trên nền trang trắng `#FFFFFF`). | **Nền Than Chì Graphite `#27272A`** (`zinc-800`) tràn viền 100% (sáng hơn nền trang `#09090B` nên tách khối rõ nét mà không cần viền). | - **Chữ chính**: Trắng sáng `#FAFAFA`.<br>- **Số liệu**: Cam sáng `#F97316`.<br>- **Nhãn ghi rõ**: **`GÓI DOANH NGHIỆP`** |

---

## 3. Hệ Thống Kiểu Chữ (Typography Architecture)

> [!IMPORTANT]
> Toàn bộ ứng dụng sử dụng duy nhất một font chữ: **Montserrat** (tích hợp chuẩn Google Fonts CDN + Local TTF tiếng Việt đầy đủ dấu Unicode).

### Phân Cấp Trọng Lượng (Weight Hierarchy):
1. **Tiêu Đề Lớn (Hero / Page Title / h1)**:
   - `font-weight: 900 !important;` (**Black**).
   - Tracking chặt chẽ (`tracking-tight`), dứt khoát, uy quyền thị giác.
2. **Tiêu Đề Mục & Thẻ (Section Headers / Card Titles / h2, h3, h4)**:
   - `font-weight: 800 !important;` (**ExtraBold**).
   - Rõ nét, không mờ nhạt, nổi bật ngay cả trên màn hình nhỏ.
3. **Nội Dung Văn Bản (Body Text, Paragraphs, Buttons, Inputs)**:
   - `font-weight: 400;` (**Regular**) hoặc `font-medium` (500).
   - Giãn dòng thoáng (`leading-relaxed`), tuyệt đối không ép mỏng làm đau mắt người dùng.
4. **Chú Thích Phụ & Metadata (Captions, Small, Timestamp)**:
   - `font-weight: 200 !important; font-style: italic !important;` (**ExtraLightItalic**).
   - Dùng cho ngày tháng, số câu hỏi phụ, điều khoản bảo mật nhỏ cuối dòng.
5. **Con Số Tài Chính, Điểm Thưởng & Mã Thẻ**:
   - Sử dụng font monospace hiển thị số sạch sẽ (`font-mono font-bold` hoặc `font-black`).
   - Ví dụ: `+500 Điểm`, `10,000 VNĐ`, `0987-xxxx-xxxx`.

---

## 4. Quy Chuẩn Biểu Tượng & Hình Ảnh (Iconography & Media)

### 4.1. Quy Định Icon:
- **Chuẩn duy nhất**: Bộ **Lucide Icons** SVG vector tinh gọn (`stroke-width="1.75"` hoặc `2`).
- Kích thước chuẩn:
  - Icon phụ trợ trong nút/badge: `w-3.5 h-3.5` hoặc `w-4 h-4`.
  - Icon tiêu đề mục/thẻ: `w-5 h-5`.
- **TUYỆT ĐỐI CẤM (STRICTLY BANNED)**:
  - **Không chèn emoji hoặc sticker màu sắc** vào tiêu đề, nút bấm, tab điều hướng hoặc tài liệu.
  - Không dùng các icon 3D cồng kềnh, không dùng icon màu mè lạc quẻ.

### 4.2. Logo Thương Hiệu (Vouchers / Đối tác):
- Phải là SVG vector sắc nét hoặc ảnh PNG trong suốt được căn giữa hoàn hảo trong khung nền trắng bo góc nhẹ.
- Luôn có cơ chế Fallback (chữ cái viết tắt hoặc placeholder trung tính), tuyệt đối không để vỡ ảnh (broken image).

---

## 5. Quy Chuẩn Các Thành Phần Giao Diện (Components)

### 5.1. Thẻ Khảo Sát (Survey Cards - Bento Compact)
- **Cấu trúc Lưới**: Bento Grid 4 cột trên Desktop (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`), 1 cột trên Mobile.
- **Viền & Nền**:
  - Light Mode: `bg-white border border-stone-200 hover:border-orange-500/50 hover:shadow-md transition-all duration-200 rounded-xl`.
  - Dark Mode: `bg-stone-900 border border-stone-800 hover:border-orange-500/40 rounded-xl`.
- **Khối Điểm Thưởng**: Hiển thị rõ số điểm nổi bật màu cam (`text-orange-600 font-mono font-black`), kèm quy đổi VNĐ tinh tế.
- **Thanh Tiến Độ Mẫu (Progress Bar)**: Thanh trượt mảnh `h-1.5 rounded-full bg-stone-100 dark:bg-stone-800`, phần lấp đầy dùng màu cam `bg-orange-600`.

### 5.2. Nút Bấm (Buttons & CTA)
- **Primary CTA (Nút chính)**:
  - `bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg px-4 py-2 shadow-sm transition-colors`.
  - Sử dụng cho: *Làm bài, Nạp tiền, Rút tiền, Tạo khảo sát*.
- **Secondary / Ghost Button (Nút phụ / Xem trước)**:
  - `border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 font-semibold rounded-lg px-3 py-1.5`.
- **Nút Disabled (Hết mã / Khóa)**:
  - `bg-stone-200 dark:bg-stone-800 text-stone-400 cursor-not-allowed border-none`.

### 5.3. Thẻ Ví Tài Chính (Fintech Wallet Cards)
- **Thẻ Điểm Thưởng (Rewards Balance)**: Nền Cam Sunset ấm áp (`linear-gradient(135deg, #F97316 0%, #EA580C 50%, #C2410C 100%)`) hoặc Obsidian Charcoal than đá với chữ trắng sáng, số dư to rõ. Nút đổi thưởng màu trắng chữ cam đậm tương phản cao.
- **Thẻ Ký Quỹ Doanh Nghiệp (Escrow Credit)**: Nền Bento tối giản viền mảnh, thể hiện chi tiết tiền nạp, số dư khả dụng và số dư đang khóa cho chiến dịch.

### 5.4. Thanh Điều Hướng (Header Navigation) & Dropdown Hồ Sơ
- **Thanh Header**:
  - Tối giản, cố định (`sticky top-0 z-40 backdrop-blur-md`).
  - Tab điều hướng active hiển thị viền gạch chân cam (`after:bg-orange-600`), không dùng khung viền tím hay hiệu ứng bóng mờ rực rỡ.
- **Dropdown Tài Khoản (Profile Dropdown)**:
  - **Điểm thưởng và vé gom mẫu bắt buộc đặt gọn gàng bên trong menu dropdown** khi bấm vào avatar/tên tài khoản ở góc phải.
  - Không để tràn lan số điểm và vé trên header làm mất thẩm mỹ tối giản.
  - Cung cấp nút chuyển đổi nhanh vai trò (Người điền / Doanh nghiệp) trực tiếp cho tài khoản Quản trị viên (Admin).

### 5.5. Phân Trang Khảo Sát (Pagination)
- **Cơ chế**: Sử dụng phân trang rõ ràng (8 bài / trang) thay vì cuộn vô tận (Infinite Scroll).
- **Bộ điều khiển**: Nút `Trước`, danh sách số trang `1, 2, 3...`, nút `Sau` được căn giữa gọn gàng, trang active có nền cam chữ trắng.

### 5.6. Chân Trang Doanh Nghiệp (Footer)
- Hiển thị đầy đủ thông tin pháp lý và hỗ trợ: Tên nền tảng/công ty, địa chỉ trụ sở, số điện thoại hotline, email hỗ trợ, link Fanpage/Cộng đồng và dòng thông báo bản quyền.
- Tông màu xám trung tính, viền trên mảnh ngăn cách rõ ràng với nội dung chính.

### 5.7. Trình Tạo Khảo Sát Chuẩn Google Forms Studio (Two-Column Form Studio)
- **Bố Cục 2 Cột (Desktop & Tablet ngang)**:
  - **Cột Trái (~65% Canvas Soạn Thảo)**:
    - Thẻ Tiêu Đề Biểu Mẫu (`Form Header Card`) với dải màu Cam Vibe `#EA580C` trên đỉnh (`h-2.5 rounded-t-xl`).
    - Thẻ Câu Hỏi Đang Chọn (`Active Question Card`): Dải viền màu cam nhấn dọc bên trái (`border-l-4 border-orange-600`), cụm 6 chấm kéo thả (`Drag Handle`) ở đỉnh giữa, ô nhập tiêu đề câu hỏi, menu chọn 1 trong 12 định dạng chuẩn Google Forms.
    - Thanh Công Cụ Nổi Dọc Bên Cạnh (`Floating Toolbar`): `(+) Thêm câu hỏi`, `Nhập nhanh`, `(Tt) Thêm tiêu đề`, `Thêm ảnh`, `Thêm phần`.
    - Chân thẻ: Nút `Nhân bản (Duplicate)`, nút `Xóa (Trash)`, vạch ngăn dọc, công tắc bật/tắt `Bắt buộc` (`is_required`), và Menu 3 chấm mở rộng.
  - **Cột Phải (~35% Sticky Sidebar - Ghim Cố Định `position: sticky; top: 80px`)**:
    - Gom toàn bộ tính năng Định giá, Ngân sách và Cài đặt: Phân khúc (`Sinh Viên` / `Cá Nhân` / `Doanh Nghiệp`), Số mẫu mục tiêu ($N$), 3 nấc lựa chọn giá SLA (Tiết kiệm, Đề xuất +25%, Hỏa tốc +60%) kèm thanh trượt Creator Boost chia 85/15 hoặc 80/20, Bộ lọc đối tượng, Cài đặt thời hạn treo và Khối tạm tính ký quỹ Escrow Real-time kèm 2 nút cố định `[Lưu Bản Nháp]` và `[Xuất Bản Khảo Sát]`.
- **Tương Thích Màn Hình Nhỏ (Mobile / Tablet Dọc)**: Tự động chuyển về bố cục 1 cột dọc mượt mà, đưa bảng Tạm tính ký quỹ và nút Xuất bản xuống thanh ghim cố định ở đáy màn hình (`Bottom Sticky Bar`).

---

## 6. Phân Quyền & Hành Vi Nghiệp Vụ Trên Giao Diện (Role-Based UI Behaviors)

> [!CAUTION]
> **Quy Tắc Bất Khả Xâm Phạm Về Phân Quyền UI**:

1. **Tài Khoản Doanh Nghiệp (CREATOR / Doanh Nghiệp)**:
   - **TUYỆT ĐỐI KHÔNG ĐƯỢC PHÉP ĐIỀN KHẢO SÁT**: Khảo sát chỉ dành cho Người điền (Respondent) kiếm tiền và điểm thưởng.
   - Thẻ khảo sát trên trang chủ đối với Creator:
     - **Không hiển thị nút "Làm bài"**.
     - Thay thế bằng nút **`[Xem trước]`** (`openSurveyPreviewModal`) kèm badge chú thích nhỏ `"Dành cho đáp viên"`.
     - Nếu Creator cố tình bấm vào khảo sát, hệ thống phải chặn lại kèm thông báo Toast: *"Tài khoản Doanh Nghiệp không thể điền khảo sát. Khảo sát chỉ dành cho Người điền (Đáp viên)."* và mở modal xem trước bài làm.
2. **Tài Khoản Người Điền (RESPONDENT / Đáp Viên)**:
   - Hiển thị đầy đủ nút `"Làm bài"`, giá trị điểm thưởng nhận được, thời gian ước tính và thanh tiến độ hoàn thành.
3. **Tài Khoản Quản Trị Viên (ADMIN)**:
   - Có menu chuyển đổi góc nhìn (View As: Admin / Respondent / Creator) để duyệt và kiểm thử giao diện của từng đối tượng người dùng.

---

## 7. Danh Sách Những Điều Tuyệt Đối Cấm (Anti-Patterns / Banned List)

- **CẤM** sử dụng màu lạ không nằm trong hệ thống: Không tím, không xanh ngọc, không hổ phách, không hồng, không gradient đa sắc.
- **CẤM** chèn emoji hoặc icon sticker màu sắc vào giao diện và tài liệu.
- **CẤM** ép font chữ `p` hoặc `span` thành mảnh mờ `font-weight: 200` làm giảm khả năng đọc của người dùng.
- **CẤM** tạo các khối thanh phân khúc (tier-tab-bar) gây rối rắm và phân mảnh giao diện nếu không có chỉ định rõ ràng.
- **CẤM** để Creator làm bài khảo sát hoặc nhận thưởng khảo sát.
- **CẤM** đưa nút tạo khảo sát màu cam dư thừa lên header khi đã có khu vực quản lý chiến dịch chuyên biệt.
- **CẤM** sử dụng hiệu ứng bóng đổ neon rực rỡ (glow), viền phát sáng chói mắt kiểu web cờ bạc/tiền ảo rác.

---

## 8. Hướng Dẫn Dành Cho AI Khi Triển Khai Tính Năng Mới

1. **Trước khi viết mã giao diện**: Đọc lại bảng màu tại **Mục 2** và hệ thống font tại **Mục 3** trong tệp này.
2. **Kiểm tra lớp CSS**: Sử dụng Tailwind CSS với các class ngữ nghĩa chuẩn:
   - Cam: `bg-orange-600`, `text-orange-600`, `hover:bg-orange-500`, `border-orange-600`.
   - Nền sáng: `bg-white`, `border-stone-200`, `text-stone-900`.
   - Nền tối: `dark:bg-stone-900`, `dark:border-stone-800`, `dark:text-stone-100`.
3. **Kiểm tra phân quyền**: Bất kỳ nút tương tác khảo sát nào cũng phải kiểm tra vai trò người dùng (Creator vs Respondent).
4. **Kiểm tra giao diện thực tế**: Luôn đảm bảo responsive trên cả Desktop (Web) và Mobile (Capacitor Android).
