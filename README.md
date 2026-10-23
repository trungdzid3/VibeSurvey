# VIBESURVEY - PLATFORM HƯỚNG DẪN KHỞI CHẠY (LOCAL TEST)

Nền tảng khảo sát trực tuyến & ví thưởng tích hợp sẵn Fullstack (Frontend SPA + Backend Express + Database SQLite WAL mode). Zero configuration - Không cần cài đặt CSDL bên ngoài.

---

## 🚀 Cách Chạy Dự Án Cực Nhanh (1 Phút)

### 1. Cài đặt thư viện:
```bash
npm install
```

### 2. Khởi chạy máy chủ:
```bash
npm start
```
*Máy chủ sẽ chạy tại: **`http://localhost:3000`***

### 3. Mở trên trình duyệt:
Truy cập: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Tài Khoản Demo Test Đầy Đủ Chức Năng (1-Click Switcher)
Giao diện đã tích hợp thanh Demo Role Switcher ở góc dưới màn hình, hoặc bạn có thể đăng nhập bằng các tài khoản sau:

1. **Respondent (Người làm khảo sát)**:
   - Email: `respondent@demo.com`
   - Mật khẩu: `demo123`
   - Số dư có sẵn: `6,500 Điểm` (tương đương 65.000 VNĐ)

2. **Creator (Người tạo khảo sát)**:
   - Email: `creator@demo.com`
   - Mật khẩu: `demo123`
   - Số dư ký quỹ: `20,000,000 VNĐ Credit`

3. **Admin (Quản trị viên hệ thống)**:
   - Email: `admin@demo.com`
   - Mật khẩu: `demo123`

---

## 🔍 Chạy Toàn Bộ Test Suite Tự Động (Unit & Integration Tests)
```bash
npm test
```
*(Bao gồm 10 suites kiểm tra Anti-Fraud, Double-entry Ledger, Tokenomics, API Endpoints, Chaos simulation 100 bots).*

---

## 📂 Cấu Trúc Mã Nguồn:
- `public/`: Frontend SPA (HTML5, Tailwind CSS, Javascript, Lucide Icons).
- `server/`: Backend RESTful API (Express.js, SQLite WAL mode ACID).
- `server/db/`: Database SQLite tích hợp sẵn dữ liệu mẫu (`vibesurvey.db`).
- `tests/`: 10 bộ kiểm thử tự động toàn diện.
