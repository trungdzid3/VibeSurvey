# ⚡ VibeSurvey - Survey & Reward Platform (Web & Android)

> **VibeSurvey** là nền tảng khảo sát trực tuyến hai chiều: hỗ trợ Doanh nghiệp/Nhà nghiên cứu thu thập dữ liệu chất lượng cao, đồng thời cho phép Người dùng/Sinh viên tích lũy điểm thưởng quy đổi thẻ cào, ví điện tử hoặc tài khoản ngân hàng.

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Web%20%7C%20Android%20Capacitor-blue.svg)](android/)
[![Tests](https://img.shields.io/badge/tests-13%2F13%20passed%20(100%25)-success.svg)](tests/)

---

## 🌟 Điểm nổi bật & Tính năng cốt lõi

- **Trình làm bài Stepper Zen Focus (Typeform-style)**: Hiển thị duy nhất một câu hỏi trên mỗi màn hình, hỗ trợ phím số `1..9`, thanh khóa nhịp độ (Pacing Lock 1.5s) ngăn chặn bot click nhanh.
- **Engine Chống Gian Lận (Anti-Fraud Engine)**:
  - Bẫy tốc độ ($T_{min}$) ngăn chặn hành vi làm bài siêu tốc.
  - Bẫy tập trung ngầm (Attention Check) tự động bóc tách khỏi client payload.
  - Phương sai đường thẳng (Straight-lining) và thuật toán Shannon Entropy phát hiện văn bản spam.
  - Giám sát IP/Fingerprint và tự động khóa nếu phát hiện multi-account bất thường.
- **Sổ cái kép & Giao dịch ACID (Double-Entry Ledger)**:
  - Khóa quỹ ký quỹ Escrow minh bạch, chống chi tiêu kép (Anti-Double Spend).
  - Tỷ giá quy đổi chuẩn: 1 Điểm = 10 VNĐ.
- **Tài khoản Toàn năng (Hybrid All-in-One)**:
  - Một tài khoản vừa có thể làm bài khảo sát tích điểm, vừa có thể đăng tải khảo sát riêng.
  - Tặng ngay 25 lượt khảo sát dùng thử miễn phí khi xác thực email hoặc liên kết Google.
- **Gom Mẫu Hỏa Tốc & Thông báo Brevo (Sendinblue)**:
  - Tự động ghim TOP 1 trang chủ khi kích hoạt gom mẫu hỏa tốc.
  - Bắn thông báo đẩy trên ứng dụng Android APK.
  - Gửi email hệ thống kèm deep-link mở trực tiếp bài khảo sát tới hộp thư người dùng qua Brevo REST API v3.
- **Hỗ trợ Hóa đơn VAT 100%**: Doanh nghiệp nạp quỹ ký quỹ đều được hỗ trợ xuất hóa đơn điện tử VAT đầy đủ.
- **Tích hợp Webhook Google Sheets**: Tự động chuyển tiếp câu trả lời bài làm về Google Apps Script Webhook thời gian thực.
- **Đóng gói Android Native**: Sẵn sàng biên dịch sang file Android APK thông qua Capacitor.

---

## 🛠️ Công nghệ sử dụng

- **Backend**: Node.js, Express.js, native SQLite (WAL mode, zero-dependency external database).
- **Frontend**: Single Page Application (SPA), HTML5, Tailwind CSS, Lucide Icons.
- **Mobile**: Capacitor Native Android Framework.
- **Email Service**: Brevo (Sendinblue) Transactional REST API v3.
- **Testing**: Bộ kiểm thử tự hành 13 tầng (`tests/run_all_tests.js`).

---

## 🚀 Hướng dẫn cài đặt & Khởi chạy

### 1. Yêu cầu môi trường
- Node.js version 20 trở lên.
- Git.

### 2. Cài đặt các gói phụ thuộc
```bash
git clone <URL_REPO_CUA_BAN>
cd Linh
npm install
```

### 3. Cấu hình biến môi trường
Tạo file `.env` từ file mẫu `.env.example`:
```bash
cp .env.example .env
```
Cấu hình các giá trị cần thiết:
```env
PORT=3000
APP_URL=http://localhost:3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_2026

# Brevo Email Configuration
BREVO_API_KEY=xkeysib-your-api-key
BREVO_SENDER_EMAIL=your-verified-email@gmail.com
BREVO_SENDER_NAME=VibeSurvey Platform
```

### 4. Khởi chạy ứng dụng
```bash
# Khởi chạy server API và Frontend (Port 3000)
npm start

# Hoặc chạy chế độ dev tự động reload
npm run dev
```
Truy cập trình duyệt tại: `http://localhost:3000`

### 5. Chạy bộ kiểm thử tự hành (13 Suites)
```bash
npm test
```

### 6. Mở Cloudflare Tunnel để test trực tuyến qua HTTPS
```bash
npm run tunnel
```

---

## 📁 Cấu trúc thư mục dự án

```
├── android/                   # Dự án Capacitor Android Native
├── public/                    # Giao diện SPA (HTML, CSS, JS, SVG assets)
├── server/
│   ├── config/                # Cấu hình hằng số & kinh tế học
│   ├── controllers/           # Auth, Survey, Wallet, Voucher, Admin
│   ├── db/                    # Cơ sở dữ liệu SQLite & migrations
│   ├── middlewares/           # JWT Auth, RateLimit, IP Ban
│   ├── routes/                # API router
│   └── services/              # AntiFraud, Ledger, Brevo Notification, Webhook, Pricing
├── tests/                     # 13 tầng kiểm thử tự hành
├── package.json
└── README.md
```

---

## 📄 Bản quyền (License)

Dự án được phân phối dưới giấy phép [MIT License](LICENSE).
