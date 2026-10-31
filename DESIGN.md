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

### 2.2. Nền Tông Trắng (Light Mode)
- **Base Background**: `#FFFFFF` (Nền chính) và `#FAFAFA` (`stone-50` / `zinc-50` cho nền trang tổng thể).
- **Surface / Card**: `#FFFFFF` với viền mảnh sắc nét `border border-stone-200` (`#E7E5E4`).
- **Text Chính**: `#09090B` (`zinc-950`) hoặc `#18181B` (`zinc-900`) - Độ tương phản tối đa.
- **Text Phụ (Muted)**: `#71717A` (`zinc-500`) hoặc `#52525B` (`zinc-600`).

### 2.3. Nền Tông Đen (Dark Mode - Obsidian Charcoal Force-Dark)
- **Base Background**: `#121214` (Đen than mềm ấm, mịn màng, chống lóa mắt, không bị đen kịt OLED).
- **Surface / Card**: `#1C1C20` với viền sắc sảo `border border-[#2E2E36]`. Nổi khối rõ ràng trên nền.
- **Sub-containers / Inner Boxes**: `#222228`, viền `#2E2E36`.
- **Inputs & Controls**: Nền than đậm `#161619`, viền `#33333D`, text `#FFFFFF`, focus viền `#EA580C`.
- **Text Sáng**: `#FFFFFF` tinh khôi 100% cho tiêu đề; `#E4E4E7` cho body text; `#A1A1AA` cho phụ đề (chống mờ xỉn).

### 2.4. Màu Báo Trạng Thái Chức Năng (Semantic Status Colors)
- **Thành công (Success / Validated)**: `#16A34A` (`green-600`) - Chỉ dùng cho badge đã duyệt / hoàn thành.
- **Cảnh báo / Tạm dừng (Warning / Paused)**: `#D97706` (`amber-600`) - Dùng hạn chế cho cảnh báo bảo mật.
- **Nguy hiểm / Hủy (Danger / Banned)**: `#DC2626` (`red-600`) - Dùng cho nút hủy, lỗi form, thông báo vi phạm.
- **Trung tính (Neutral / Closed)**: `#71717A` (`zinc-500`) - Dùng cho khảo sát đã đóng, nút disabled.

---

## 3. Kiến Trúc Kiểu Chữ (Typography Architecture)

- **Bộ font chuẩn duy nhất**: **`Montserrat`**, `-apple-system`, `BlinkMacSystemFont`, `"Segoe UI"`, `Roboto`, `sans-serif`.
- **Phân cấp trọng số (Weight Scale)**:
  - **Tiêu đề lớn / Banner / Brand**: `font-black` (Weight 900) - Tự tin, mạnh mẽ.
  - **Tiêu đề mục / Section Title / Card Title**: `font-extrabold` (Weight 800) hoặc `font-bold` (Weight 700).
  - **Nút bấm / Nhãn / Thẻ trạng thái**: `font-bold` (Weight 700) hoặc `font-semibold` (Weight 600).
  - **Nội dung / Body Text**: `font-normal` (Weight 400) hoặc `font-medium` (Weight 500).
  - **Số liệu / Điểm / Mã code**: `font-mono` với độ đậm cao (`font-bold` / `font-black`).

---

## 4. Hệ Thống Biểu Tượng & Icon (Iconography Standards)

- **Bộ icon duy nhất**: **Lucide Icons** (`data-lucide="..."`).
- **Nét vẽ chuẩn**: `stroke-width: 2` (hoặc `stroke-[2]`, `stroke-[2.2]` cho điểm nhấn).
- **Quy chuẩn biểu tượng chức năng đặc thù**:
  - **Báo Lỗi / Báo Cáo Sự Cố**: BẮT BUỘC dùng icon con bọ **`bug`** (`data-lucide="bug"`). Tuyệt đối không dùng `life-buoy` (chiếc phao) làm hiểu lầm sang hỗ trợ chung / cứu hộ biển.
  - **Thông báo**: `bell` / `zap` (thông báo nóng).
  - **Khảo sát**: `compass` (khám phá), `file-text` / `edit-3` (làm bài).
  - **Ví tiền / Tài chính**: `wallet` / `credit-card`.
  - **Điểm danh chuỗi**: `flame` (ngọn lửa cam).
- **TUYỆT ĐỐI KHÔNG CHÈN EMOJI / ICON STICKER MÀU SẮC** vào mã nguồn, giao diện hay thông báo.

---

## 5. Quy Chuẩn Khung Thành Phần & Tương Tác (Components & Patterns)

### 5.1. Thẻ Bento (Bento Cards)
- Bo góc chuẩn: `rounded-2xl` (16px) hoặc `rounded-xl` (12px).
- Viền mảnh phân định rõ ràng: `border border-stone-200 dark:border-[#2E2E36]`.
- Nền phẳng: `#FFFFFF` (Light) / `#1C1C20` (Dark).

### 5.2. Thanh Điều Hướng Header & Tinh Gọn Quản Trị Admin
- **Thanh Header**: Cố định `sticky top-0 z-40 backdrop-blur-md`.
- **Quy chuẩn gộp mục Quản Trị Admin (Consolidated Admin Hub)**:
  - Trên thanh điều hướng Header của Admin, **CẤM dàn trải hàng loạt tab nghiệp vụ** (Tổng quan, Duyệt tiền, Gian lận, Báo lỗi...) làm tràn và chật chội navbar.
  - **BẮT BUỘC gộp toàn bộ công cụ quản trị vào 1 mục duy nhất: `Quản Trị`** (`admin-overview`).
  - Bên trong trang Quản Trị, sử dụng **Thanh Tab Con (Segmented Navigation Tabs)** gồm:
    * `Tổng Quan Kinh Tế`
    * `Duyệt Rút Tiền`
    * `Chống Gian Lận`
    * `Báo Cáo Sự Cố`
  - Nhờ đó Navbar Admin luôn tinh gọn tối đa: `Quản Trị | Khảo Sát | Tạo Khảo Sát | Khảo Sát Của Tôi`.

### 5.3. Quy Chuẩn Dropdown & Custom Selection System (Bắt Buộc Toàn Bộ Dự Án)
- **CẤM TRIỆT ĐỂ**: Tuyệt đối **KHÔNG sử dụng thẻ `<select>` nguyên thủy của HTML** trong các modal, dialog, form cập nhật hoặc bảng quản trị. Thẻ `<select>` của trình duyệt hiển thị menu xám xịt của hệ điều hành (Windows/macOS), không tùy biến được CSS và phá vỡ thẩm mỹ Bento Modern của ứng dụng.
- **QUY CHUẨN BẮT BUỘC**:
  - 100% dropdown lựa chọn (Status, Phân loại, Danh mục, Lựa chọn) phải được xây dựng bằng **Custom Dropdown Component**:
    * Nút trigger: Có bo góc `rounded-xl`, viền mảnh `border border-stone-200 dark:border-[#33333D]`, hiển thị giá trị hiện tại kèm icon `chevron-down` xoay 180 độ khi mở.
    * Menu danh sách (Popover): Thả nổi `z-50 absolute`, bo góc `rounded-xl`, nền `#FFFFFF` (Light) / `#1C1C20` (Dark), viền `border-stone-200 dark:border-[#2E2E36]`, đổ bóng sâu `shadow-2xl`.
    * Các mục lựa chọn: Khi hover có nền `hover:bg-stone-100 dark:hover:bg-[#24242A]`. Mục đang chọn có icon tích `check` màu cam `#EA580C` và chữ đậm nổi bật.
    * Giới hạn chiều cao: Tối đa `max-h-[260px] overflow-y-auto overscroll-contain` kết hợp thanh cuộn mỏng `.scrollbar-thin`.

### 5.4. Quy Chuẩn Xem Ảnh Minh Chứng & Hình Ảnh Báo Lỗi (In-App Image Lightbox)
- **CẤM**: Không sử dụng thẻ link `<a>` thông thường trỏ ra ngoài khiến trình duyệt tự tải file về hoặc mở tab trắng rời rạc.
- **QUY CHUẨN BẮT BUỘC**:
  - Mọi ảnh minh chứng sự cố, ảnh câu hỏi, ảnh chứng từ phải được **hiển thị thumbnail xem trực tiếp** trên giao diện.
  - Khi click vào thumbnail: Kích hoạt **Modal Phóng To Trực Tiếp (In-App Lightbox Viewer)** ngay trên trang (`VibeApp.previewFullImage(url, title)`):
    * Phóng to ảnh sắc nét trên nền mờ tối `bg-black/85 backdrop-blur-md`.
    * Có nút đóng `(X)` góc trên, hiển thị kích thước ảnh và tiêu đề rõ ràng, không bao giờ bắt người dùng phải tải file về máy.

---

## 6. Danh Sách Những Điều Tuyệt Đối Cấm (Anti-Patterns / Banned List)

- **CẤM** sử dụng thẻ `<select>` nguyên thủy của trình duyệt trong form/modal.
- **CẤM** để link ảnh tải về thay vì hiển thị xem trực tiếp qua Lightbox Viewer.
- **CẤM** dàn trải quá nhiều tab trên Header Admin gây quá tải thanh điều hướng.
- **CẤM** dùng icon chiếc phao `life-buoy` cho tính năng Báo Lỗi (Bắt buộc dùng `bug`).
- **CẤM** sử dụng màu lạ không nằm trong bảng màu chuẩn (không tím, không xanh ngọc, không hổ phách).
- **CẤM** chèn emoji hoặc icon sticker màu sắc vào giao diện và tài liệu.
- **CẤM** để Creator làm bài khảo sát hoặc nhận thưởng khảo sát.
- **CẤM** sử dụng hiệu ứng bóng đổ neon chói mắt (glow) kiểu web cờ bạc/tiền ảo rác.

---

## 7. Hướng Dẫn Dành Cho AI Khi Triển Khai Tính Năng Mới

1. Đọc kỹ các quy tắc và bảng màu chuẩn mực trong tệp này trước khi sửa hoặc viết code UI.
2. Kiểm tra tính đồng bộ 100% giữa Light Mode và Dark Mode (Obsidian Charcoal).
3. Đảm bảo toàn bộ Dropdown tuân thủ Custom Dropdown Popover, không được dùng thẻ `<select>`.
4. Rà soát tương thích trên cả Web Responsive và Mobile App (Capacitor Android).
