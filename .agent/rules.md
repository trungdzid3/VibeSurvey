# QUY TẮC CỐT LÕI (CORE RULES) - VIBESURVEY VIBE CODING STUDIO

Dự Án: Nền tảng Khảo sát Trực tuyến Kiếm Lợi Nhuận VibeSurvey (Web SPA & Android Native Capacitor).
Tài liệu quy chiếu SSOT: `DESIGN.md` (Giao diện), `KE_HOACH_TONG_THE.md` & `TUONG_LAI_HE_THONG.md` (Kinh tế & Kỹ thuật), `PROJECT_CONTEXT.md` (Tiến trình).

---

## PHẦN I: NGUYÊN TẮC CỐT LÕI & GIỚI HẠN AN TOÀN

### 1. Chuẩn mực Giao tiếp & Ngôn ngữ
- **Bắt buộc**: Phản hồi, giải thích và viết tài liệu bằng **tiếng Việt** (bao gồm `implementation_plan.md`, `task.md`, `walkthrough.md`).
- Trả lời ngắn gọn, trực diện vào giải pháp kỹ thuật, không giải thích lý thuyết trừ khi được yêu cầu.
- **TUYỆT ĐỐI KHÔNG SỬ DỤNG EMOJI, ICON STICKER MÀU SẮC**: Không chèn bất kỳ icon/emoji màu sắc nào trong câu trả lời, tài liệu, giao diện và mã nguồn. Sử dụng văn bản thuần túy với định dạng markdown tối giản, chuyên nghiệp.

### 2. Giới hạn An toàn & Điều cấm (Negative Constraints)
- **KHÔNG** tự ý xóa bất kỳ file, dữ liệu hoặc thư mục nào khi chưa có sự xác nhận rõ ràng của người dùng.
- **KHÔNG** thay đổi code cũ không liên quan; **KHÔNG** xóa comments/docstrings sẵn có.
- **KHÔNG** tự ý cài thư viện/dependencies mới khi chưa được người dùng đồng ý.

### 3. Kỷ luật Viết Code & Cấu trúc Dữ liệu
- **Tách biệt dữ liệu**: Tách riêng biệt logic backend, giao diện frontend (HTML/CSS) và tài nguyên (ảnh, icon), tránh viết gộp vào một file.
- **Tên biến & Hàm**: Rõ ràng, tự giải thích (CamelCase cho JS, snake_case cho Python/DB).

---

## PHẦN II: KIẾN TRÚC CHIẾN LƯỢC & ĐIỀU PHỐI ĐA ĐẠI LÝ

### 4. Quy chế Vibe Coding Studio & Phân Cấp Tranh Luận (Argon Strategy Loop)
- **Tầng 1 - Định hướng Chiến lược (Gemini 4 Argon)**:
  - Khi lập kế hoạch, kiến trúc hệ thống, schema, API contracts và Product Spec cho sản phẩm Vibe Coding, BẮT BUỘC dùng skill `ask-argon` làm Tổng Công Trình Sư.
  - **Giới hạn**: **Tuyệt đối KHÔNG để Argon viết code** và không lãng phí token vào tiểu tiết. Argon chỉ vạch hướng chiến lược và kế hoạch tổng quát.
- **Tầng 2 - Chuyên viên Thực thi & Phản biện (Antigravity Specialists - argon-vibe-studio)**:
  - *Lead Architect*: Chuyển định hướng từ Argon thành giải thuật, cấu trúc file/dữ liệu vào `task.md`.
  - *Senior Coder*: Viết mã nguồn triển khai thực tế, module hóa sạch sẽ.
  - *Code Reviewer*: Kiểm soát 4 chốt chặn: 60 FPS / Core Web Vitals, memory leak, responsive đa thiết bị, phản hồi Coder sửa lỗi.
  - *Autonomous QA Bot*: Headless browser bắt 100% console.error, HTTP 404, screenshot, test cuộn ngang, chaos fuzzing và simulation logic.
- **Tầng 3 - Thực thi Khép kín (Zero Interruption Policy)**:
  - Không dừng giữa chừng để bắt người dùng test thủ công. Tự sửa lỗi (Coder -> Reviewer -> QA Bot -> đọc traceback từ `test_results.json` sửa đến khi PASS -> làm task kế tiếp). Bàn giao khi toàn bộ task đã hoàn thành.

### 5. Mô hình Điều phối Đa Đại lý Bắt buộc (Subagent-Driven Execution Model)
- **Subagent First**: Khi nhiệm vụ có từ 2 đầu việc trở lên (`>= 2`) và làm độc lập được, BẮT BUỘC tạo Subagents chuyên biệt để thực hiện song song hoặc tuần tự.
- **Mở rộng Đa Subagent Cùng Chuyên Môn (Parallel Domain Scaling)**:
  - Cho phép tạo **nhiều hơn 1 Subagent trong cùng một lĩnh vực** (ví dụ: 2-3 Subagent Frontend, 2-3 Subagent Backend chạy song song) nhằm tăng tốc tối đa tiến độ.
  - **Ràng buộc Độc lập Tuyệt đối (Decoupled Scope)**: Các phần việc phải hoàn toàn tách rời, không can thiệp, không phụ thuộc chéo và không xen vào tiến trình của nhau.
  - **Cấm Xung đột Ghi đè (Zero Race Condition)**: Tuyệt đối **KHÔNG để 2 Subagent cùng chỉnh sửa chung một file tại cùng một thời điểm**. Mỗi Subagent chỉ được toàn quyền thao tác trên các file, module hoặc endpoint độc lập được Lead Orchestrator phân định rõ ràng trong `task.md`.
- **Phân công & Giám sát**: Agent chính (Lead Orchestrator) lên kế hoạch trong `task.md`, phân quyền danh sách file sở hữu cho từng Subagent (`.agent/*.md`), điều phối, tích hợp kết quả và tổng hợp báo cáo nghiệm thu; không tự làm hết trong luồng đơn lẻ.

### 6. Chu trình Thực thi Từ Kế hoạch Đến Bàn giao (Plan-to-Execution Workflow)
- Khi nhận các lệnh thực thi (*"triển khai đi"*, *"tiến hành"*, *"làm đi"*), Agent tuân thủ 4 bước:
  1. **Nạp danh sách**: Đọc `task.md` lấy các việc chưa xong (`[ ]`).
  2. **Khớp Skills**: Tự động khớp Skill chuyên biệt cho từng việc theo Mục 11 & 12 mà không cần hỏi lại.
  3. **Triển khai & Kiểm tra**: Làm dứt điểm từng task, kiểm tra cú pháp ngay (Mục 14), đánh dấu `[x]`.
  4. **Bảo toàn tiến độ**: Tự động cập nhật `PROJECT_CONTEXT.md` ngay sau khi hoàn thành.

---

## PHẦN III: NGUỒN CHÂN LÝ & BẢO TOÀN NGỮ CẢNH

### 7. Hợp đồng Thiết kế Giao diện Chuẩn mực (DESIGN.md SSOT)
- Bắt buộc tuân thủ 100% tệp `DESIGN.md` tại gốc dự án làm nguồn chân lý duy nhất (SSOT) cho UI/UX.
- **Bảng màu 3 màu cốt lõi**: Cam (`#EA580C` / `#F97316`), Trắng (`#FFFFFF` / `#FAFAFA`), Đen Obsidian (`#09090B` / `#18181B`). Cấm tuyệt đối pha màu lạ (xanh ngọc, hổ phách, tím indigo, xanh neon).
- **Typography Montserrat 4 phân cấp**: h1 Black (900), h2-h4 ExtraBold (800), body Regular (400), caption ExtraLightItalic (200), số liệu Monospace (800).
- **Iconography**: Bộ icon vector Lucide SVG mảnh, cấm triệt để chèn emoji/sticker rác vào giao diện.
- **Ràng buộc phân quyền UI**: Doanh nghiệp (Creator) tuyệt đối không được điền khảo sát (chỉ Xem trước).
- **Quy chuẩn bố cục**: Phân trang 8 bài/trang, ẩn điểm và vé vào dropdown tài khoản, toàn bộ Dropdown bắt buộc dùng Custom Dropdown Popover (cấm dùng thẻ `<select>` xám nguyên thủy).

### 8. Lưu trữ Tiến trình & Ngữ cảnh Liên tục (PROJECT_CONTEXT.md)
- Duy trì `PROJECT_CONTEXT.md` tại thư mục gốc ghi lại: mục đích dự án, kiến trúc hệ thống/file, bảng tiến độ tính năng, lưu ý kỹ thuật (Gotchas), hướng dẫn chuyển giao khi context limit.
- BẮT BUỘC đọc file khi bắt đầu phiên và CẬP NHẬT LẠI sau khi hoàn thành mỗi yêu cầu.

### 9. Bảo toàn Cấu hình Workspace (.code-workspace)
- Tự động lưu/bảo toàn file `*.code-workspace` phản ánh đúng cấu trúc thư mục và thiết lập mở rộng của dự án.

---

## PHẦN IV: ĐỊNH TUYẾN KỸ NĂNG & CÔNG NGHỆ CHUYÊN SÂU

### 10. Tự động Nhận diện & Định tuyến Kỹ năng (Skill Routing)
- **Inference First**: Phân tích câu lệnh và tự động khớp kỹ năng tối ưu trong Antigravity Platform:
  - *Giao diện Tối giản & SaaS*: `minimalist-ui` (`minimalist-skill`) + `shadcn-ui`.
  - *Typography & High-End Polish*: `design-taste-frontend` (`taste-skill`) + `emil-design-eng`.
  - *Fintech, Ví tiền & Biểu đồ*: `digits-fintech-swiss-template` + `d3-visualization`.
  - *Xuất Văn bản & Báo cáo PDF*: `minimax-pdf` (hoặc script ReportLab `.pdf-build/` có sẵn trong repo) / `minimax-docx`.
  - *Di động Android & Native*: Capacitor CLI + `android-cli`.
  - *Kiểm toán Bảo mật & Phòng thủ*: `security-audit`.
  - *Kiểm thử & Tối ưu Trình duyệt*: `chrome-devtools`, `a11y-debugging`, `memory-leak-debugging`.
  - *Hạ tầng Đám mây & Triển khai*: Oracle Always Free + Cloudflare Tunnel + `cloud-build-basics`.

### 11. Phối hợp Kỹ năng Đa tầng (Skill Orchestration Chains)
- *SaaS/Fintech Dashboard*: `minimalist-ui` -> `shadcn-ui` -> `digits-fintech-swiss-template` -> `emil-design-eng`.
- *Báo cáo & Xuất bản*: `data-report` -> `minimax-docx` -> `minimax-pdf`.
- *Kiểm thử Bảo mật & Chất lượng*: `security-audit` -> `chrome-devtools` -> `memory-leak-debugging`.

---

## PHẦN V: KIỂM SOÁT CHẤT LƯỢNG, BÀN GIAO & TỰ ĐỘNG HÓA GIT

### 12. Kiểm tra Cú pháp & Xác minh Kết quả Bắt buộc (Syntax Verification)
- Luôn chạy lệnh kiểm tra cú pháp sau mỗi lần chỉnh sửa mã nguồn:
  `node -c <file>` cho toàn bộ tệp JavaScript (`server/` và `public/app.js`).
- Chạy toàn bộ bộ kiểm thử tự hành (`npm test`) trước khi bàn giao task.

### 13. Kiểm thử Đa tầng
- Unit test logic kinh tế, Anti-fraud validation, Concurrency & Ledger integrity test.
- Đảm bảo responsive hoàn hảo từ Mobile (375-393px), Tablet (768-820px) đến Desktop (1024-1920px).

### 14. Quy chế Tự động hóa Đồng bộ Git & GitHub (Git Auto-Sync Protocol)
auto_github_sync: true # Dự án đã kết nối GitHub (trungdzid3/VibeSurvey). Tự động commit và push sau mỗi task hoàn tất.
