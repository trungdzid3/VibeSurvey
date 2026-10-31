const http = require('http');

async function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const postData = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : null;

    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    if (postData) {
      reqOptions.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function runTests() {
  console.log('=== BẮT ĐẦU KIỂM THỬ HỆ THỐNG BÁO LỖI & ĐĂNG TẢI MINH CHỨNG ===');

  // 1. Đăng nhập tài khoản Admin
  console.log('1. Đăng nhập tài khoản Admin...');
  const loginRes = await request('http://localhost:3000/api/v1/auth/login', {
    method: 'POST',
    body: { email: 'admin@vibesurvey.com', password: 'admin123' }
  });

  if (loginRes.status !== 200 || !loginRes.body.token) {
    throw new Error('Đăng nhập Admin thất bại: ' + JSON.stringify(loginRes.body));
  }
  const adminToken = loginRes.body.token;
  console.log('  PASS: Admin đăng nhập thành công!');

  // 2. Gửi báo cáo lỗi kèm ảnh giả lập base64
  console.log('2. Tải ảnh chụp màn hình minh chứng lên /api/v1/upload/image...');
  // Tạo ảnh 1x1 PNG giả lập
  const dummy1x1Png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const uploadRes = await request('http://localhost:3000/api/v1/upload/image', {
    method: 'POST',
    body: {
      image_data: dummy1x1Png,
      type: 'bug'
    }
  });

  if (uploadRes.status !== 201 || !uploadRes.body.url) {
    throw new Error('Upload ảnh thất bại: ' + JSON.stringify(uploadRes.body));
  }
  const imageUrl = uploadRes.body.url;
  console.log('  PASS: Tải ảnh thành công ->', imageUrl);

  // 3. Gửi báo cáo sự cố (Bug Report)
  console.log('3. Gửi báo cáo lỗi có đính kèm ảnh...');
  const createReportRes = await request('http://localhost:3000/api/v1/bug-reports', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${adminToken}` },
    body: {
      title: 'Lỗi vỡ layout khi co màn hình trên Galaxy Fold',
      description: 'Khi gập màn hình điện thoại vào chế độ hẹp 320px, thanh tab studio bị tràn sang phải.',
      category: 'UI_UX',
      severity: 'HIGH',
      image_url: imageUrl,
      device_info: {
        userAgent: 'Mozilla/5.0 (Linux; Android 14) Mobile Safari/537.36',
        screen: '320x800 (DPR: 3)',
        url: 'http://localhost:3000/#create-survey'
      }
    }
  });

  if (createReportRes.status !== 201 || !createReportRes.body.reportId) {
    throw new Error('Gửi báo lỗi thất bại: ' + JSON.stringify(createReportRes.body));
  }
  const reportId = createReportRes.body.reportId;
  console.log('  PASS: Gửi báo lỗi thành công! Report ID ->', reportId);

  // 4. Kiểm tra API lịch sử của người dùng
  console.log('4. Kiểm tra GET /api/v1/bug-reports/my...');
  const myReportsRes = await request('http://localhost:3000/api/v1/bug-reports/my', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  if (myReportsRes.status !== 200 || !myReportsRes.body.reports) {
    throw new Error('Lấy lịch sử báo lỗi thất bại: ' + JSON.stringify(myReportsRes.body));
  }
  const myReport = myReportsRes.body.reports.find(r => r.id === reportId);
  if (!myReport) {
    throw new Error('Không tìm thấy báo cáo vừa gửi trong danh sách của tôi!');
  }
  console.log('  PASS: Báo cáo hiển thị trong lịch sử của người dùng ở trạng thái ->', myReport.status);

  // 5. Kiểm tra API Quản trị viên Admin
  console.log('5. Kiểm tra GET /api/v1/admin/bug-reports...');
  const adminReportsRes = await request('http://localhost:3000/api/v1/admin/bug-reports', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  if (adminReportsRes.status !== 200 || !adminReportsRes.body.reports) {
    throw new Error('Admin lấy danh sách báo lỗi thất bại: ' + JSON.stringify(adminReportsRes.body));
  }
  console.log('  PASS: Admin lấy danh sách thành công, tổng số báo cáo:', adminReportsRes.body.stats.total);

  // 6. Admin cập nhật trạng thái & gửi lời nhắn cho người dùng
  console.log('6. Admin cập nhật trạng thái PATCH /api/v1/admin/bug-reports/:id...');
  const patchRes = await request(`http://localhost:3000/api/v1/admin/bug-reports/${reportId}`, {
    method: 'PATCH',
    headers: { 'Authorization': `Bearer ${adminToken}` },
    body: {
      status: 'RESOLVED',
      admin_notes: 'Đội ngũ kỹ thuật đã tối ưu lại CSS overflow cho màn hình gập 320px, bạn tải lại trang kiểm tra nhé!'
    }
  });

  if (patchRes.status !== 200) {
    throw new Error('Cập nhật trạng thái thất bại: ' + JSON.stringify(patchRes.body));
  }
  console.log('  PASS: Admin cập nhật trạng thái -> RESOLVED thành công!');

  // 7. Kiểm tra thông báo gửi đến người dùng
  console.log('7. Kiểm tra thông báo gửi đến tài khoản người dùng...');
  const notifRes = await request('http://localhost:3000/api/v1/notifications', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });

  if (notifRes.status !== 200 || !notifRes.body.notifications) {
    throw new Error('Lấy thông báo thất bại: ' + JSON.stringify(notifRes.body));
  }
  const bugNotif = notifRes.body.notifications.find(n => n.type === 'BUG_UPDATE');
  if (!bugNotif) {
    throw new Error('Không tìm thấy thông báo BUG_UPDATE gửi cho người dùng!');
  }
  console.log('  PASS: Người dùng đã nhận được thông báo cập nhật sự cố ->', bugNotif.title);

  console.log('\n=== TẤT CẢ 7/7 KIỂM THỬ TÍNH NĂNG BÁO LỖI ĐỀU ĐẠT PASS 100%! ===');
}

runTests().catch(err => {
  console.error('\nFAIL:', err);
  process.exit(1);
});
