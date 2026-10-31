# CÁC QUY TẮC CỐT LÕI (CORE RULES) - SURVHUB VIBE CODING STUDIO

Dự Án: Nền tảng Khảo sát Trực tuyến & Nghiên cứu Học thuật SurvHub (Web & Android App).

## 1. Ngôn ngữ & Giao tiếp
- Luôn phản hồi, giải thích và viết tài liệu bằng **tiếng Việt**.
- Giữ câu trả lời ngắn gọn, trực diện, không dài dòng lý thuyết.
- **TUYỆT ĐỐI KHÔNG SỬ DỤNG EMOJI, ICON STICKER MÀU SẮC**: Không chèn bất kỳ icon/emoji màu sắc nào trong câu trả lời, tài liệu, giao diện và mã nguồn. Sử dụng văn bản thuần túy, định dạng markdown chuẩn mực, gạch đầu dòng tối giản.

## 2. Ràng buộc bất biến
- Không tự ý xóa file, thư mục, dữ liệu khi chưa có sự xác nhận rõ ràng.
- Không thay đổi code cũ không liên quan.
- Không xóa comments và docstrings sẵn có.
- Tách biệt logic, giao diện, và tài nguyên.

## 3. Kiểm tra & Chất lượng
- Chạy kiểm tra cú pháp sau mỗi lần chỉnh sửa (`node -c <file>`).
- Kiểm thử đa tầng: Unit logic test, Anti-fraud validation, Concurrency & Ledger integrity test.
- Đảm bảo responsive hoàn hảo từ Mobile (375-393px), Tablet (768-820px) đến Desktop (1024-1920px).

## 4. Bảo toàn tiến trình
- Cập nhật liên tục `PROJECT_CONTEXT.md` sau mỗi tác vụ.
- Bảo toàn tệp cấu hình workspace `*.code-workspace`.

## 5. Quy chuẩn Thiết kế Giao diện (DESIGN.md SSOT)
- Bắt buộc tuân thủ 100% tệp `DESIGN.md` tại gốc dự án làm nguồn chân lý duy nhất (SSOT) cho UI/UX.
- Bảng màu cố định 3 màu cốt lõi: Cam (`#EA580C` / `#F97316`), Trắng (`#FFFFFF` / `#FAFAFA`), Đen Obsidian (`#09090B` / `#18181B`). Cấm tuyệt đối pha màu lạ (xanh ngọc, hổ phách, tím indigo, xanh neon).
- Font chữ Montserrat 4 phân cấp bắt buộc: h1 Black (900), h2-h4 ExtraBold (800), body Regular (400), caption ExtraLightItalic (200), số liệu Monospace.
- Icon vector Lucide mảnh, cấm triệt để chèn emoji/sticker rác vào giao diện.
- Ràng buộc phân quyền: Doanh nghiệp (Creator) tuyệt đối không được điền khảo sát (chỉ Xem trước).
- Phân trang 8 bài/trang, ẩn điểm và vé vào dropdown tài khoản.
- Toàn bộ Dropdown bắt buộc dùng Custom Dropdown Popover, cấm dùng thẻ `<select>` xám nguyên thủy.

## 6. Quy Chế Bắt Buộc Sử Dụng Subagents (Subagent-Driven Execution Model)
- **Nguyên tắc cốt lõi**: Đối với mọi tác vụ phát triển, triển khai tính năng, tối ưu hóa giao diện hoặc tái cấu trúc mã nguồn, Agent chính (Parent Agent) **BẮT BUỘC PHẢI KHỞI TẠO VÀ ỦY QUYỀN CHO CÁC SUBAGENTS CHUYÊN BIỆT THỰC HIỆN**.
- **Phân công vai trò**:
  + *Parent Agent (Lead Orchestrator)*: Lập kế hoạch, phân rã công việc thành danh sách task trong `task.md`, định nghĩa và khởi tạo các Subagents chuyên trách tương ứng, giám sát tiến trình và tổng hợp báo cáo nghiệm thu.
  + *Subagents (Specialists)*: Trực tiếp chỉnh sửa mã nguồn, thiết kế giao diện, cấu hình mạng, hoặc chạy kiểm thử tự động trong phạm vi chuyên môn được giao.
- **Quy trình thực thi**:
  1. Phân rã nhiệm vụ và tạo Subagent chuyên trách (Frontend Specialist, Backend Architect, QA Specialist, DevOps Specialist,...).
  2. Subagent thực thi khép kín và tự kiểm tra cú pháp (`node -c`).
  3. Subagent báo cáo kết quả lại cho Parent Agent để cập nhật `task.md` và `PROJECT_CONTEXT.md`.

## 7. Quy chế Tự động hóa Đồng bộ Git & GitHub (Git Auto-Sync Protocol)
auto_github_sync: true # Dự án đã kết nối GitHub. Tự động commit và push sau mỗi task hoàn tất.
