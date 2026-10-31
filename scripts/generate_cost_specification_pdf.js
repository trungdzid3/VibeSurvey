/**
 * Script tao Tai Lieu Dac Ta Ky Thuat & Danh Muc Tai Nguyen Van Hanh
 * Nen Tang VibeSurvey de gui Gemini lap Du Toan Chi Phi
 * Xuat ra tep PDF: TAI_LIEU_DU_TOAN_CHI_PHI_VAN_HANH_VIBESURVEY.pdf
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const htmlContent = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Tài Liệu Đặc Tả Kỹ Thuật & Danh Mục Tài Nguyên Vận Hành VibeSurvey</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-right {
        content: counter(page);
        font-size: 9pt;
        color: #71717a;
      }
    }
    
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #18181b;
      background-color: #ffffff;
      line-height: 1.5;
      font-size: 10pt;
      margin: 0;
      padding: 0;
    }

    /* Cover Page */
    .cover-page {
      page-break-after: always;
      height: 100%;
      min-height: 250mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border: 1px solid #e4e4e7;
      padding: 40px;
      border-radius: 4px;
      background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
    }

    .badge-top {
      display: inline-block;
      padding: 4px 12px;
      background-color: #ea580c;
      color: #ffffff;
      font-size: 9pt;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      border-radius: 3px;
      margin-bottom: 24px;
    }

    .cover-title {
      font-size: 24pt;
      font-weight: 800;
      color: #09090b;
      line-height: 1.25;
      margin: 0 0 12px 0;
    }

    .cover-subtitle {
      font-size: 13pt;
      color: #52525b;
      margin: 0 0 24px 0;
      font-weight: 500;
      line-height: 1.4;
    }

    .cover-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid #e4e4e7;
    }

    .meta-item {
      font-size: 9.5pt;
    }
    .meta-label {
      color: #71717a;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 8pt;
      letter-spacing: 0.5px;
    }
    .meta-value {
      color: #18181b;
      font-weight: 600;
      margin-top: 2px;
    }

    .cover-target-box {
      background-color: #fff7ed;
      border: 1px solid #fdba74;
      border-left: 4px solid #ea580c;
      padding: 16px;
      border-radius: 4px;
      margin-top: 30px;
      font-size: 9.5pt;
      color: #9a3412;
      line-height: 1.5;
    }

    /* Content Styling */
    h1 {
      font-size: 15pt;
      font-weight: 800;
      color: #09090b;
      border-bottom: 1.5px solid #ea580c;
      padding-bottom: 6px;
      margin-top: 28px;
      margin-bottom: 14px;
      page-break-after: avoid;
    }

    h2 {
      font-size: 12pt;
      font-weight: 700;
      color: #18181b;
      margin-top: 18px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }

    h3 {
      font-size: 10.5pt;
      font-weight: 600;
      color: #27272a;
      margin-top: 12px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }

    p {
      margin: 0 0 10px 0;
      text-align: justify;
    }

    ul, ol {
      margin: 0 0 12px 0;
      padding-left: 20px;
    }

    li {
      margin-bottom: 4px;
    }

    /* Tables */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px 0;
      font-size: 9pt;
      page-break-inside: avoid;
    }

    th {
      background-color: #f4f4f5;
      color: #09090b;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #d4d4d8;
    }

    td {
      padding: 7px 10px;
      border: 1px solid #e4e4e7;
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background-color: #fafafa;
    }

    /* Callout & Note */
    .callout {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #3b82f6;
      padding: 12px 14px;
      border-radius: 3px;
      margin: 12px 0;
      font-size: 9pt;
    }

    .callout-title {
      font-weight: 700;
      color: #1e3a8a;
      margin-bottom: 4px;
    }

    .warning-box {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-left: 4px solid #ef4444;
      padding: 12px 14px;
      border-radius: 3px;
      margin: 12px 0;
      font-size: 9pt;
      color: #991b1b;
    }

    .code-inline {
      font-family: Consolas, Monaco, monospace;
      font-size: 8.5pt;
      background-color: #f4f4f5;
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid #e4e4e7;
    }

    .page-break {
      page-break-after: always;
    }

    .section-summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin: 14px 0;
    }

    .summary-card {
      border: 1px solid #e4e4e7;
      background-color: #fafafa;
      padding: 10px;
      border-radius: 4px;
      text-align: center;
    }

    .summary-card-num {
      font-size: 14pt;
      font-weight: 800;
      color: #ea580c;
    }

    .summary-card-label {
      font-size: 8pt;
      color: #71717a;
      text-transform: uppercase;
      font-weight: 600;
      margin-top: 2px;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div>
      <div class="badge-top">Hồ Sơ Kỹ Thuật & Vận Hành Hệ Thống</div>
      <div class="cover-title">ĐẶC TẢ HẠ TẦNG KỸ THUẬT & DANH MỤC TÀI NGUYÊN VẬN HÀNH</div>
      <div class="cover-subtitle">Nền Tảng Khảo Sát Trực Tuyến & Kiếm Thưởng VibeSurvey (Web & Android App)</div>
      <p style="color: #52525b; max-width: 90%;">
        Tài liệu cung cấp thông số kỹ thuật đầy đủ, kiến trúc backend/frontend, cơ chế dòng tiền, danh mục tích hợp dịch vụ bên thứ ba và các định mức tải thực tế làm cơ sở để trí tuệ nhân tạo (Gemini) lập bảng dự toán chi phí chi tiết cho từng giai đoạn: Chạy thử nghiệm (Pilot), Khởi động (Launch) và Mở rộng thương mại (Scale-up).
      </p>

      <div class="cover-target-box">
        <strong>Mục đích tài liệu:</strong> Cung cấp hồ sơ đầu vào chính xác 100% để chuyển tiếp cho Google Gemini phân tích và xuất bảng dự toán ngân sách chi tiết: các khoản phí cố định, phí duy trì định kỳ hàng tháng, biến phí giao dịch và lượng vốn lưu động cần thiết để vận hành hệ sinh thái VibeSurvey.
      </div>
    </div>

    <div>
      <div class="cover-meta-grid">
        <div class="meta-item">
          <div class="meta-label">Tên sản phẩm</div>
          <div class="meta-value">VibeSurvey Platform (v4.8.0)</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Nền tảng hỗ trợ</div>
          <div class="meta-value">Web Responsive (SPA) + Android APK (Capacitor)</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Mô hình kinh doanh</div>
          <div class="meta-value">Marketplace 2 Chiều + Take-Rate Spread (10% - 40%)</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Thời điểm lập hồ sơ</div>
          <div class="meta-value">Tháng 10/2026 - Bản Chuẩn Khép Kín</div>
        </div>
      </div>
    </div>
  </div>

  <!-- NỘI DUNG CHÍNH -->

  <h1>1. Tổng Quan Về Sản Phẩm & Mô Hình Kinh Tế</h1>
  
  <h2>1.1. Bản chất giải pháp</h2>
  <p>
    <strong>VibeSurvey</strong> là nền tảng trung gian kết nối hai chiều trong lĩnh vực nghiên cứu thị trường và thu thập dữ liệu học thuật:
  </p>
  <ul>
    <li><strong>Người trả lời (Respondent):</strong> Tham gia trả lời các bảng khảo sát để nhận thù lao bằng Điểm thưởng (<code>1 Point = 1 VNĐ</code>). Điểm thưởng có thể rút về tài khoản ngân hàng, ví MoMo, đổi thẻ cào điện thoại hoặc đổi nội bộ sang <code>Credit</code> (+5% thưởng) để tự tạo khảo sát gom mẫu (cơ chế Điền chéo).</li>
    <li><strong>Người tạo khảo sát (Creator):</strong> Doanh nghiệp, SME, Nhà nghiên cứu cá nhân hoặc Sinh viên nạp tiền quy đổi thành <code>Credit</code> (<code>1 Credit = 1 VNĐ</code>) để tạo form khảo sát (12 định dạng câu hỏi hoặc đồng bộ trực tiếp từ Google Forms / Microsoft Forms), thiết lập bộ lọc nhân khẩu học và ký quỹ tiền thưởng (Escrow).</li>
    <li><strong>Phân khúc Sinh viên (Edu Karma Exchange):</strong> Hỗ trợ tài khoản sinh viên đã xác thực email trường (<code>.edu.vn</code> / <code>.ac.vn</code>) trao đổi khảo sát hoàn toàn 0đ tiền mặt thông qua Điểm Karma nội bộ (1 bài điền giúp bạn khác = +1 Karma để tạo bài cho mình). Khảo sát trao đổi sinh viên được cách ly hoàn toàn, chỉ hiển thị cho sinh viên.</li>
    <li><strong>Diễn đàn khảo sát nội bộ (Survey Community Board):</strong> Mạng xã hội học thuật tích hợp trong sàn cho phép chủ khảo sát đăng bài chia sẻ bối cảnh đề tài, đính kèm thẻ khảo sát sống của chính mình (chặn 100% link ngoài) để kêu gọi đáp viên điền bài với dòng tiền ký quỹ vận hành bình thường.</li>
  </ul>

  <h2>1.2. Cơ chế dòng tiền & Doanh thu của Nền tảng (Monetization Engine)</h2>
  <p>
    Nền tảng tạo ra dòng tiền dương thông qua các nguồn doanh thu cốt lõi:
  </p>
  <table>
    <thead>
      <tr>
        <th style="width: 28%;">Nguồn Doanh Thu</th>
        <th style="width: 42%;">Cơ Chế Thu Phí</th>
        <th style="width: 30%;">Tỷ Suất Lợi Nhuận</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Phí sàn gom mẫu (Take-rate Spread)</strong></td>
        <td>Thu chênh lệch giữa số tiền Creator trả cho mỗi mẫu và số tiền thù lao trả cho Respondent. Ví dụ: Creator trả 1.000đ/mẫu, Respondent nhận 600đ - 750đ/mẫu.</td>
        <td>Biên lợi nhuận gộp từ <strong>20% đến 40%</strong> (Gói Sinh viên trợ giá sàn giữ 10% - 20%).</td>
      </tr>
      <tr>
        <td><strong>Gói dịch vụ Ghim VIP & Push APK</strong></td>
        <td>Creator trả phí để ghim bài khảo sát lên đầu danh sách và gửi thông báo đẩy (Push Notification) đến toàn bộ máy Android cài app.</td>
        <td><strong>40.000 VNĐ / lần kích hoạt</strong> (Biên lợi nhuận &gt; 90%).</td>
      </tr>
      <tr>
        <td><strong>Phụ phí bộ lọc mục tiêu (Targeting Fee)</strong></td>
        <td>Thu thêm khi Creator lọc khảo sát theo độ tuổi, giới tính, khu vực địa lý, ngành nghề hoặc trường học.</td>
        <td><strong>+100đ/mẫu</strong> (Sinh viên) hoặc <strong>+200đ/mẫu</strong> (Cá nhân).</td>
      </tr>
      <tr>
        <td><strong>Phí xử lý lệnh rút tiền (Payout Fee)</strong></td>
        <td>Thu phí cố định đối với các lệnh rút tiền ngân hàng giá trị nhỏ dưới 100.000đ.</td>
        <td><strong>2.000 VNĐ / lệnh rút</strong> (Miễn phí từ 100.000đ trở lên).</td>
      </tr>
      <tr>
        <td><strong>Chiết khấu Voucher Quà Tặng</strong></td>
        <td>Doanh nghiệp mua mã E-Voucher từ kho sàn để tài trợ quà tặng kích thích người điền.</td>
        <td>Chiết khấu hoa hồng <strong>5% - 15%</strong> từ nhà phát hành voucher.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <h1>2. Kiến Trúc Kỹ Thuật & Cấu Trúc Hệ Thống</h1>

  <h2>2.1. Ngăn xếp Công nghệ (Technology Stack)</h2>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Thành Phần</th>
        <th style="width: 35%;">Công Nghệ Sử Dụng</th>
        <th style="width: 40%;">Đặc Điểm & Ràng Buộc Kỹ Thuật</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Backend Runtime</strong></td>
        <td>Node.js (v20+ LTS / v22)</td>
        <td>Chạy đơn tiến trình non-blocking I/O, quản lý tiến trình bằng PM2 hoặc Docker Container.</td>
      </tr>
      <tr>
        <td><strong>Backend Framework</strong></td>
        <td>Express.js (v4.21+)</td>
        <td>REST API, các middleware bảo mật: Helmet, CORS, Rate Limit, Anti-SSRF, JWT Authentication (HS256).</td>
      </tr>
      <tr>
        <td><strong>Cơ Sở Dữ Liệu</strong></td>
        <td>SQLite thông qua module chuẩn <code>node:sqlite</code> (DatabaseSync)</td>
        <td>Chế độ WAL (Write-Ahead Logging), Foreign Keys bật, Busy Timeout 5000ms. Sổ cái kép (Double-Entry Ledger) chuẩn ACID nguyên tử. Sẵn sàng di trú PostgreSQL khi tải lớn.</td>
      </tr>
      <tr>
        <td><strong>Frontend Web</strong></td>
        <td>Vanilla JavaScript (ES6+), HTML5, Tailwind CSS</td>
        <td>Single Page Application (SPA) siêu nhẹ, tải nhanh, không phụ thuộc nặng vào framework cồng kềnh, tối ưu hóa hiển thị di động.</td>
      </tr>
      <tr>
        <td><strong>Ứng Dụng Di Động</strong></td>
        <td>Capacitor Android SDK (v6.2+)</td>
        <td>Đóng gói mã nguồn web thành ứng dụng Android native APK, chạy Webview tăng tốc phần cứng, tích hợp plugin Native Storage và Push Notifications.</td>
      </tr>
      <tr>
        <td><strong>Chống Gian Lận (Anti-Fraud)</strong></td>
        <td>Thuật toán chấm điểm độc quyền chạy ngầm tại Backend</td>
        <td>Bẫy tốc độ (Speed Trap), Bẫy chú ý (Attention Check), Phương sai đường thẳng (Straight-lining), Định danh thiết bị (Device Fingerprint) và Quản lý IP.</td>
      </tr>
    </tbody>
  </table>

  <h2>2.2. Mô hình Luồng Dữ Liệu & Giao Dịch</h2>
  <div class="callout">
    <div class="callout-title">Nguyên tắc Bất biến về Tài chính: Hệ thống Sổ Cái Kép (Double-Entry Ledger)</div>
    Mọi biến động tiền tệ (Nạp tiền, Ký quỹ khảo sát Escrow, Trả thưởng đáp viên, Hoàn tiền khi đóng bài, Đổi điểm, Rút tiền) đều được thực thi trong một Transaction duy nhất với 2 bút toán Nợ (Debit) và Có (Credit). Số dư ví người dùng luôn bằng tổng biến động sổ cái. Hệ thống được bảo vệ tuyệt đối chống rút tiền kép (Race Condition / Double Spending).
  </div>

  <h2>2.3. Cấu trúc Lưu trữ & Tệp Tin (File Storage)</h2>
  <ul>
    <li><strong>Cơ sở dữ liệu:</strong> 1 tệp SQLite chính (<code>vibesurvey.db</code>) kèm tệp nhật ký WAL (<code>vibesurvey.db-wal</code>) và tệp SHM (<code>vibesurvey.db-shm</code>). Dung lượng ban đầu: ~5MB, tăng trưởng ước tính ~50MB - 200MB cho mỗi 100.000 phản hồi khảo sát.</li>
    <li><strong>Ảnh tải lên (Media Uploads):</strong> Ảnh đại diện khảo sát, ảnh câu hỏi, ảnh đính kèm lỗi báo cáo. Hiện lưu trữ tại thư mục cục bộ <code>public/uploads/</code> (giới hạn dung lượng tối đa 2MB/ảnh).</li>
    <li><strong>Tệp cài đặt APK:</strong> Tệp <code>app-release.apk</code> hoặc <code>app-debug.apk</code> phát hành cho người dùng Android tải trực tiếp hoặc phân phối qua Google Play Store (dung lượng ~5MB - 8MB).</li>
  </ul>

  <div class="page-break"></div>

  <h1>3. Danh Mục Các Dịch Vụ Bên Ngoài Cần Tích Hợp & Chi Phí</h1>
  <p>
    Để vận hành hoàn chỉnh sản phẩm trên môi trường internet công cộng, hệ thống yêu cầu các dịch vụ hạ tầng và API bên thứ ba sau:
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Hạng Mục Dịch Vụ</th>
        <th style="width: 25%;">Nhà Cung Cấp Đề Xuất</th>
        <th style="width: 25%;">Mục Đích Sử Dụng</th>
        <th style="width: 25%;">Hình Thức Tính Phí</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1. Máy chủ Web & API (Hosting / VPS)</strong></td>
        <td>Render.com / Oracle Cloud Always Free / Hetzner / Vietnix / Kave Cloud</td>
        <td>Chạy Node.js Server, lưu trữ SQLite database, xử lý API và phục vụ tài nguyên tĩnh Web.</td>
        <td>Thuê theo tháng (Gói Free hoặc 5$ - 20$/tháng tùy cấu hình CPU/RAM).</td>
      </tr>
      <tr>
        <td><strong>2. Tên miền Quốc tế hoặc VN (Domain Name)</strong></td>
        <td>Namecheap / Cloudflare Registrar / PA Việt Nam / Mat Bao</td>
        <td>Địa chỉ truy cập chính thức của nền tảng (ví dụ: <code>vibesurvey.vn</code> hoặc <code>.com</code>).</td>
        <td>Phí duy trì thường niên (Khoảng 250.000đ - 750.000đ / năm tùy đuôi tên miền).</td>
      </tr>
      <tr>
        <td><strong>3. Mạng Phân Phối & Bảo Mật (DNS / WAF / CDN)</strong></td>
        <td>Cloudflare (Plan Free / Pro) + Cloudflare Tunnel (<code>cloudflared</code>)</td>
        <td>Bảo vệ chống tấn công DDoS, chứng chỉ SSL/TLS miễn phí, ẩn địa chỉ IP máy chủ thật, tăng tốc tải trang.</td>
        <td><strong>Miễn phí (Gói Free)</strong>, nâng cấp Pro khi có doanh thu lớn ($20/tháng).</td>
      </tr>
      <tr>
        <td><strong>4. Dịch vụ Gửi Email Hệ Thống (Transactional Email)</strong></td>
        <td>Brevo (Sendinblue) / Resend / Amazon SES / SendGrid</td>
        <td>Gửi mã OTP đăng ký tài khoản, OTP xác thực sinh viên (.edu), thông báo duyệt rút tiền, thông báo khảo sát hỏa tốc.</td>
        <td>Miễn phí 300 email/ngày (Brevo). Khi vượt ngưỡng: ~25$ cho 20.000 - 40.000 email/tháng.</td>
      </tr>
      <tr>
        <td><strong>5. Cổng Thanh Toán Nạp Tiền Tự Động (Inbound Payment)</strong></td>
        <td>VietQR / SeAPay / Casso / PayOS / MoMo Business</td>
        <td>Tạo mã QR chuyển khoản ngân hàng động, tự động nhận Webhook đối soát tiền nạp để cộng Credit cho Creator 24/7.</td>
        <td>Miễn phí khởi tạo hoặc trả phí dịch vụ webhook: 50.000đ - 200.000đ/tháng hoặc 0.5% - 1% giá trị giao dịch.</td>
      </tr>
      <tr>
        <td><strong>6. Cổng Chi Trả Thưởng (Outbound Payout / Bank API)</strong></td>
        <td>Ngân hàng mở (Open Banking) / MoMo Payout / Baokim / ZaloPay</td>
        <td>Tự động hoặc bán tự động chuyển tiền thưởng từ ví sàn về tài khoản ngân hàng của người dùng khi duyệt lệnh rút.</td>
        <td>Phí giao dịch chuyển khoản liên ngân hàng: Khoảng 1.100đ - 2.500đ / lệnh chuyển tiền thành công.</td>
      </tr>
      <tr>
        <td><strong>7. Kho Thẻ Cào Điện Thoại (Phone Cards API)</strong></td>
        <td>Các đại lý thẻ cào / Doithe247 / Thesieure / API Telco</td>
        <td>Tự động xuất mã thẻ Viettel, Vina, Mobi gửi trả người dùng khi đổi thưởng bằng thẻ điện thoại.</td>
        <td>Mua mã thẻ theo giá chiết khấu đại lý (Giảm 2% - 5% mệnh giá).</td>
      </tr>
      <tr>
        <td><strong>8. Đăng Ký Tài Khoản Google Play Developer</strong></td>
        <td>Google Play Console</td>
        <td>Phát hành ứng dụng Android chính thức lên Google Play Store để người dùng cài đặt an toàn.</td>
        <td><strong>25 USD một lần duy nhất</strong> (Đóng trực tiếp cho Google qua thẻ Visa/Mastercard).</td>
      </tr>
      <tr>
        <td><strong>9. Lưu Trữ Tệp Đám Mây (Cloud Object Storage)</strong></td>
        <td>Cloudflare R2 / AWS S3 / Wasabi</td>
        <td>Lưu trữ ảnh khảo sát dung lượng lớn khi hệ thống mở rộng, giảm tải ổ cứng máy chủ chính.</td>
        <td>Cloudflare R2 miễn phí 10GB đầu tiên và miễn phí băng thông tải ra (Zero Egress Fee).</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <h1>4. Các Kịch Bản Vận Hành Cần Lập Dự Toán Chi Phí</h1>
  <p>
    Để đảm bảo tính khả thi về mặt tài chính, yêu cầu Gemini lập dự toán chi tiết theo 3 kịch bản tương ứng với từng giai đoạn vòng đời của sản phẩm:
  </p>

  <div class="section-summary-grid">
    <div class="summary-card">
      <div class="summary-card-num">GIAI ĐOẠN 1</div>
      <div class="summary-card-label">Pilot / Chạy Thử Nghiệm</div>
      <p style="font-size: 8pt; margin-top: 6px; color: #52525b;">Quy mô: 100 - 1.000 người dùng<br>Thời gian: 1 - 3 tháng đầu</p>
    </div>
    <div class="summary-card">
      <div class="summary-card-num">GIAI ĐOẠN 2</div>
      <div class="summary-card-label">Khởi Động Thương Mại</div>
      <p style="font-size: 8pt; margin-top: 6px; color: #52525b;">Quy mô: 1.000 - 10.000 người dùng<br>Thời gian: 3 - 6 tháng tiếp theo</p>
    </div>
    <div class="summary-card">
      <div class="summary-card-num">GIAI ĐOẠN 3</div>
      <div class="summary-card-label">Mở Rộng Quy Mô (Scale-up)</div>
      <p style="font-size: 8pt; margin-top: 6px; color: #52525b;">Quy mô: 10.000 - 100.000+ người dùng<br>Thời gian: Từ tháng thứ 6 trở đi</p>
    </div>
  </div>

  <h2>4.1. Chi tiết Kịch bản 1: Giai đoạn Chạy thử nghiệm (Pilot / Staging)</h2>
  <ul>
    <li><strong>Mục tiêu:</strong> Kiểm thử toàn diện các luồng nghiệp vụ trên người dùng thật (sinh viên, bạn bè, nhóm NCKH), tinh chỉnh bộ bẫy chống gian lận, đo lường tỷ lệ hoàn thành form và kiểm tra độ bền hệ thống.</li>
    <li><strong>Quy mô tải dự kiến:</strong>
      <ul>
        <li>Tổng người dùng đăng ký: 300 - 1.000 tài khoản.</li>
        <li>Số bài khảo sát chạy đồng thời: 5 - 15 khảo sát.</li>
        <li>Số lượng mẫu thu thập: 500 - 2.000 phản hồi/tháng.</li>
        <li>Lưu lượng email gửi đi: ~50 - 150 email OTP/ngày.</li>
      </ul>
    </li>
    <li><strong>Yêu cầu hạ tầng:</strong> Tối ưu hóa chi phí về mức tối thiểu, tận dụng tối đa các gói Free Tier uy tín.</li>
  </ul>

  <h2>4.2. Chi tiết Kịch bản 2: Giai đoạn Khởi động Thương mại (Production Launch)</h2>
  <ul>
    <li><strong>Mục tiêu:</strong> Bắt đầu thu hút các khách hàng doanh nghiệp nhỏ (SME), nhà nghiên cứu thị trường trả phí, chạy chiến dịch marketing sinh viên tại các trường đại học lớn.</li>
    <li><strong>Quy mô tải dự kiến:</strong>
      <ul>
        <li>Tổng người dùng hoạt động (MAU): 3.000 - 10.000 người dùng.</li>
        <li>Khảo sát chạy đồng thời: 30 - 80 khảo sát.</li>
        <li>Số lượng mẫu thu thập: 10.000 - 30.000 phản hồi/tháng.</li>
        <li>Lưu lượng giao dịch nạp tiền: 50 - 200 đơn nạp VietQR/tháng.</li>
        <li>Lưu lượng yêu cầu rút tiền/đổi thẻ: 100 - 500 lệnh rút/tháng.</li>
        <li>Lưu lượng email gửi đi: ~500 - 1.500 email/ngày (vượt ngưỡng gói miễn phí).</li>
      </ul>
    </li>
    <li><strong>Yêu cầu hạ tầng:</strong> Máy chủ VPS riêng biệt có IP tĩnh, tên miền thương hiệu chính thức, dịch vụ email trả phí đảm bảo tỷ lệ vào Inbox 99%, cổng thanh toán tự động hóa.</li>
  </ul>

  <h2>4.3. Chi tiết Kịch bản 3: Giai đoạn Tăng trưởng & Mở rộng (Scale-up)</h2>
  <ul>
    <li><strong>Mục tiêu:</strong> Nền tảng tự sinh lời ổn định, mở rộng phục vụ các doanh nghiệp lớn, xử lý hàng trăm nghìn mẫu khảo sát mỗi tháng.</li>
    <li><strong>Quy mô tải dự kiến:</strong> 50.000 - 100.000+ tài khoản; 100.000 - 300.000 mẫu khảo sát/tháng; hàng nghìn giao dịch tài chính mỗi tuần.</li>
    <li><strong>Yêu cầu hạ tầng:</strong> Chuyển đổi sang hệ thống cơ sở dữ liệu phân tán (PostgreSQL), tách riêng máy chủ Database và máy chủ Web/API, cụm Redis Cache để lưu phiên làm việc, lưu trữ ảnh trên Cloud Object Storage (S3/R2).</li>
  </ul>

  <div class="page-break"></div>

  <h1>5. Danh Mục Các Khoản Tiền Phải Bỏ Ra (Chi Tiết Để Định Giá)</h1>
  <p>
    Bảng kiểm tra dưới đây phân loại toàn bộ các hạng mục chi phí cần đưa vào bài toán tính toán kinh tế:
  </p>

  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Nhóm Chi Phí</th>
        <th style="width: 35%;">Các Hạng Mục Chi Tiết Cụ Thể</th>
        <th style="width: 40%;">Tính Chất & Ghi Chú Tài Chính</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Nhóm A: Chi Phí Khởi Tạo Cố Định (One-off Setup Costs)</strong></td>
        <td>
          1. Tài khoản Google Play Console (25$)<br>
          2. Mua tên miền năm đầu tiên (<code>.vn</code> hoặc <code>.com</code>)<br>
          3. Chi phí đăng ký kinh doanh / Thông báo website TMĐT với Bộ Công Thương (nếu có)<br>
          4. Phí đăng ký dịch vụ cổng thanh toán tự động (nếu có phí ban đầu)
        </td>
        <td>Chỉ chi trả một lần duy nhất tại thời điểm bắt đầu triển khai sản phẩm ra thị trường.</td>
      </tr>
      <tr>
        <td><strong>Nhóm B: Chi Phí Hạ Tầng Cố Định Hàng Tháng (Monthly Recurring Costs)</strong></td>
        <td>
          1. Thuê máy chủ Cloud VPS (CPU, RAM, Ổ cứng SSD NVMe)<br>
          2. Gói dịch vụ Email Transactional (Brevo / Amazon SES)<br>
          3. Dịch vụ lưu trữ tệp đám mây (Cloudflare R2 / AWS S3)<br>
          4. Thuê bao phần mềm quản lý đối soát ngân hàng tự động (Casso/PayOS)<br>
          5. Bản quyền tên miền phân bổ theo tháng
        </td>
        <td>Khoản chi bắt buộc phải trả đều đặn mỗi tháng bất kể lượng người dùng truy cập nhiều hay ít để giữ hệ thống luôn online.</td>
      </tr>
      <tr>
        <td><strong>Nhóm C: Biến Phí Theo Khối Lượng Giao Dịch (Variable Transaction Costs)</strong></td>
        <td>
          1. Phí ngân hàng khi duyệt lệnh chuyển tiền Payout cho người dùng (1.100đ - 2.500đ/giao dịch)<br>
          2. Phí cổng thanh toán VietQR khi nhận tiền nạp (nếu nhà cung cấp tính %)<br>
          3. Chi phí chiết khấu khi mua kho mã thẻ cào điện thoại (Viettel, Vina, Mobi)<br>
          4. Chi phí SMS OTP dự phòng (khi người dùng không nhận được email)
        </td>
        <td>Tăng giảm tỷ lệ thuận với số lượng người dùng làm khảo sát và khối lượng giao dịch tài chính trên sàn.</td>
      </tr>
      <tr>
        <td><strong>Nhóm D: Vốn Lưu Động & Quỹ Bảo Trợ Ban Đầu (Working Capital & Reserve)</strong></td>
        <td>
          1. <strong>Quỹ Thanh Khoản Trả Thưởng Mồi (Initial Payout Pool):</strong> Khoản tiền dự trữ trong tài khoản ngân hàng để đảm bảo người làm khảo sát bấm rút tiền là nhận được ngay trong những tuần đầu tiên.<br>
          2. <strong>Quỹ Dự Phòng Rủi Ro Gian Lận (Anti-Fraud Buffer):</strong> Khoản dự phòng bù đắp cho các trường hợp gian lận ngoài ý muốn trước khi hệ thống bẫy tự động hoàn thiện 100%.<br>
          3. <strong>Ngân sách Marketing / Thu hút người dùng ban đầu:</strong> Chi phí quà tặng mini-game, chạy chiến dịch tuyển sinh viên điền mẫu thử nghiệm.
        </td>
        <td>Vốn lưu động ban đầu đóng vai trò đòn bẩy tạo niềm tin cho người dùng trong giai đoạn đầu khởi nghiệp.</td>
      </tr>
    </tbody>
  </table>

  <h2>5.1. Các Lưu ý Đặc thù Về Dòng Tiền (Cashflow Gotchas)</h2>
  <ul>
    <li><strong>Quy tắc Ký Quỹ Đảo Chiều (Escrow Pre-funding):</strong> Creator bắt buộc phải nạp tiền thật (VNĐ) vào hệ thống trước khi xuất bản khảo sát. Do đó, nền tảng <em>luôn thu tiền trước của Creator và trả thưởng sau cho Respondent</em>. Về mặt lý thuyết, sàn luôn giữ thặng dư tiền mặt dương (Working Capital Float).</li>
    <li><strong>Rủi ro rút tiền dồn cục (Liquidity Run):</strong> Nếu nhiều Respondent đồng loạt tích đủ ngưỡng và bấm rút tiền cùng một thời điểm, sàn cần có sẵn một lượng tiền mặt khả dụng trong tài khoản thanh toán để đối soát tức thì, tránh bị khiếu nại làm mất uy tín thương hiệu.</li>
    <li><strong>Chính sách Sinh viên 0đ:</strong> Hệ thống sử dụng Điểm Karma để sinh viên trao đổi mẫu với nhau. Luồng này hoàn toàn tự cân bằng nội bộ (1 lượt điền = 1 lượt nhận), sàn không phải chi trả tiền túi cho các khảo sát trao đổi sinh viên.</li>
  </ul>

  <div class="page-break"></div>

  <h1>6. Hướng Dẫn & Đề Bài Mẫu Gửi Cho Gemini Tính Chi Phí</h1>
  <p>
    Sau khi tải tệp PDF này, bạn có thể gửi thẳng tệp này kèm theo câu lệnh (prompt) chuẩn sau đây để Gemini lập bảng dự toán chi tiết nhất:
  </p>

  <div class="callout" style="background-color: #f0fdf4; border-color: #bbf7d0; border-left-color: #16a34a;">
    <div class="callout-title" style="color: #15803d;">CÂU LỆNH MẪU ĐỂ COPY & GỬI CHO GEMINI:</div>
    <p style="font-family: Consolas, monospace; font-size: 8.5pt; color: #166534; margin: 0; line-height: 1.6;">
      "Chào Gemini, tôi đính kèm tệp PDF hồ sơ đặc tả kỹ thuật và mô hình vận hành của nền tảng khảo sát trực tuyến VibeSurvey (Web và Android App).<br><br>
      Dựa trên toàn bộ thông số hạ tầng, cơ chế dòng tiền, danh mục dịch vụ bên thứ ba và các kịch bản tải đã được mô tả chi tiết trong tệp này, hãy đóng vai trò là Chuyên Gia Tư Vấn Tài Chính & CTO Khởi Nghiệp Công Nghệ, lập giúp tôi một BẢNG DỰ TOÁN CHI PHÍ TOÀN DIỆN VÀ CHI TIẾT NHẤT gồm:<br>
      1. Bảng tính chi phí ban đầu phải bỏ ra (One-off setup costs).<br>
      2. Bảng dự toán chi phí vận hành hàng tháng cho từng giai đoạn: Chạy thử (Pilot 300 - 1.000 user), Khởi động (Launch 3.000 - 10.000 user), và Mở rộng (Scale-up 50.000+ user).<br>
      3. Chi tiết từng khoản: Thuê server (VPS), Tên miền, Email Transactional (Brevo), Phí API ngân hàng nạp/rút tiền, Phí mua mã thẻ cào, Tài khoản Google Play, Vốn lưu động trả thưởng mồi.<br>
      4. Phân tích điểm hòa vốn (Break-even Analysis): Cần bao nhiêu bài khảo sát hoặc bao nhiêu lượt hoàn thành mỗi tháng với mức take-rate 20% - 30% để nền tảng tự nuôi sống được hạ tầng?<br>
      5. Các phương án tối ưu chi phí tiết kiệm nhất dành cho lập trình viên khởi nghiệp ít vốn.<br><br>
      Hãy trình bày rõ ràng dưới dạng các bảng số liệu cụ thể bằng đơn vị VNĐ và USD."
    </p>
  </div>

  <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e4e4e7; font-size: 8.5pt; color: #71717a; text-align: center;">
    Hồ Sơ Đặc Tả Kỹ Thuật VibeSurvey Platform • Phát Hành: 31/10/2026 • Bảo Mật & Lưu Hành Nội Bộ
  </div>

</body>
</html>
`;

// Đường dẫn tệp
const htmlPath = path.join(__dirname, '..', 'TAI_LIEU_DU_TOAN_CHI_PHI_VAN_HANH_VIBESURVEY.html');
const pdfPath = path.join(__dirname, '..', 'TAI_LIEU_DU_TOAN_CHI_PHI_VAN_HANH_VIBESURVEY.pdf');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

console.log('[1/3] Dang ghi tep HTML dac ta...');
fs.writeFileSync(htmlPath, htmlContent, 'utf8');
console.log('[OK] Da tao tep HTML:', htmlPath);

console.log('[2/3] Dang goi Google Chrome Headless de xuat PDF...');
const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

// Chay Chrome headless xuat PDF
const cmd = `"${chromePath}" --headless=new --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${fileUrl}"`;
try {
  execSync(cmd, { stdio: 'inherit' });
  console.log('[3/3] Xuat PDF thanh cong!');
  
  if (fs.existsSync(pdfPath)) {
    const stats = fs.statSync(pdfPath);
    console.log(`[HOAN TAT] Tep PDF da duoc tao tai: ${pdfPath}`);
    console.log(`Dung luong tep: ${(stats.size / 1024).toFixed(2)} KB`);
  } else {
    console.error('[LOI] Khong tim thay tep PDF sau khi render!');
  }
} catch (err) {
  console.error('[LOI XUAT PDF]:', err.message);
}
