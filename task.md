# KẾ HOẠCH TRIỂN KHAI: HỆ THỐNG NẠP/RÚT TIỀN THẬT, DAILY STREAKS, PUSH NOTIFICATION & AUTO-PAYOUT

## Mục tiêu
1. Chuyển đổi toàn diện cơ chế Nạp tiền và Rút tiền từ mô hình Demo sang Cơ chế Tài chính Thực tế (VietQR động chuẩn Napas247, mã Memo đối soát ngân hàng, Webhook SePay/Casso tự động, Auto-Payout cho tài khoản uy tín cao).
2. Xây dựng Hệ thống Điểm danh Hàng ngày (Daily Streaks & Nhiệm vụ) kích thích đáp viên quay lại mỗi ngày.
3. Triển khai Module Thông báo đẩy (Web Push & Capacitor Push Notifications) kích hoạt rung điện thoại khi có khảo sát Thưởng Cao/Hỏa Tốc.
4. Tự động duyệt rút thẻ cào và rút tiền nhỏ cho tài khoản Trust Score >= 90.

## Phân công Subagents & Trách nhiệm
- **Subagent 1 (Fintech & Payment Gateway Architect)**:
  - Bảng cơ sở dữ liệu `deposit_orders` và `bank_accounts`.
  - Sinh mã VietQR động theo chuẩn Napas247 kèm mã chuyển khoản Memo độc nhất.
  - Endpoint Webhook nhận biến động số dư ngân hàng và đối soát tự động.
  - Cơ chế Auto-payout thẻ cào và tiền nhỏ cho tài khoản Trust Score >= 90.
- **Subagent 2 (Retention & Daily Streak Specialist)**:
  - Bảng cơ sở dữ liệu `daily_streaks`.
  - API điểm danh hàng ngày `POST /api/v1/users/checkin` và `GET /api/v1/users/streak-info`.
  - Giao diện Streak Widget trên Header/Dashboard với số ngày liên tục và hiệu ứng nhận thưởng.
- **Subagent 3 (Push Notification & Mobile Hybrid Specialist)**:
  - Tích hợp Web Push API (Notification API & Service Worker) và Capacitor Push Notification trên Android.
  - Kích hoạt thông báo đẩy thời gian thực khi có bài khảo sát Hỏa Tốc / Creator Boost.
  - Giao diện cấp quyền thông báo và trung tâm chuông thông báo trực quan.

## Danh sách công việc (Task List)
- [x] 1. Thiết lập cơ sở dữ liệu: `deposit_orders`, `daily_streaks`, `push_subscriptions`, cấu hình VietQR ngân hàng.
- [x] 2. Triển khai luồng Nạp tiền VietQR động & Webhook đối soát ngân hàng thật sự.
- [x] 3. Triển khai luồng Auto-Payout tự động duyệt thẻ cào/rút tiền nhỏ cho Trust Score >= 90.
- [x] 4. Triển khai Hệ thống Điểm danh hàng ngày (Daily Streaks) Frontend + Backend.
- [x] 5. Triển khai Module Thông báo đẩy (Push Notification) cho khảo sát Hỏa Tốc.
- [x] 6. Kiểm thử tự hành toàn diện và xác minh không phát sinh lỗi (100% PASS).
- [x] 7. Cập nhật `PROJECT_CONTEXT.md` và đồng bộ Git.
